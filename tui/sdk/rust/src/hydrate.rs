use crate::{invalid,model::bounded_json,Result,MAX_INPUT_BYTES};
use serde_json::Value;

/// Resolve JSON-object paths without eval. Exact placeholders retain JSON types.
/// Unknown or reserved paths fail; returned values do not alias caller bindings.
pub fn hydrate(template:&Value,bindings:&Value)->Result<Value>{
    if !bindings.is_object(){return Err(invalid("bindings must be an object"));}
    bounded_json(template)?; bounded_json(bindings)?;
    let mut budget=MAX_INPUT_BYTES;
    let out=walk(template,bindings,0,&mut budget)?;bounded_json(&out)?;Ok(out)
}
fn reserved(s:&str)->bool{["__proto__","prototype","constructor"].contains(&s)}
fn lookup(path:&str,bindings:&Value,budget:&mut usize)->Result<Value>{
    let mut v=bindings;
    for k in path.split('.'){
        if k.is_empty()||reserved(k){return Err(invalid("invalid or reserved binding path"));}
        v=v.as_object().and_then(|o|o.get(k)).ok_or_else(||invalid(format!("missing binding {path}")))?;
    }
    let size=bounded_json(v)?.len();spend(budget,size)?;Ok(v.clone())
}
fn spend(budget:&mut usize,bytes:usize)->Result<()>{*budget=budget.checked_sub(bytes).ok_or_else(||invalid("hydrated payload exceeds 1 MiB budget"))?;Ok(())}
fn substitutions(s:&str)->Vec<(usize,usize,&str)>{
    let mut out=vec![];let mut cursor=0;
    while let Some(a)=s[cursor..].find("{{"){
        let start=cursor+a;
        let Some(b)=s[start+2..].find("}}") else{break};
        let end=start+2+b+2;let key=s[start+2..end-2].trim();
        if !key.is_empty() && key.bytes().all(|c|c.is_ascii_alphanumeric()||b"_.-".contains(&c)){out.push((start,end,key));}
        cursor=end;
    }
    out
}
fn walk(v:&Value,bindings:&Value,depth:usize,budget:&mut usize)->Result<Value>{
    if depth>32{return Err(invalid("template exceeds depth 32"));}
    match v{
        Value::String(s)=>{
            let matches=substitutions(s);
            if matches.len()==1 && matches[0].0==0 && matches[0].1==s.len(){return lookup(matches[0].2,bindings,budget);}
            let mut text=String::new();let mut cursor=0;
            for (start,end,path) in matches{
                spend(budget,start-cursor)?;text.push_str(&s[cursor..start]);
                let value=lookup(path,bindings,budget)?;text.push_str(&crate::model::display(&value));cursor=end;
            }
            spend(budget,s.len()-cursor)?;text.push_str(&s[cursor..]);Ok(Value::String(text))
        },
        Value::Array(items)=>{spend(budget,items.len()+2)?;items.iter().map(|v|walk(v,bindings,depth+1,budget)).collect::<Result<Vec<_>>>().map(Value::Array)},
        Value::Object(obj)=>{
            let mut out=serde_json::Map::new();spend(budget,2)?;
            for (k,v) in obj{if reserved(k){return Err(invalid("reserved template key"));}spend(budget,k.len()+4)?;out.insert(k.clone(),walk(v,bindings,depth+1,budget)?);}
            Ok(Value::Object(out))
        },
        _=>{spend(budget,v.to_string().len())?;Ok(v.clone())}
    }
}
