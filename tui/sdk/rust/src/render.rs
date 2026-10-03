use crate::{model::{bounded_json,check_block,details,display},theme,invalid,Block,Canvas,Frame,Node,Options,Rect,Result,MAX_CELLS};
use serde_json::Value;
fn natural(b:&Block,w:usize)->usize{
    if b.height>0{return b.height;}
    match b.kind.as_str(){
        "text"=>b.text.split('\n').count().max(1),"status"=>1,"events"=>b.events.len().max(1),"kv"=>b.fields.len().max(1),"table"=>b.rows.len()+2,"meter"=>2,"sparkline"=>3,"node"=>8,
        "topology"=>b.data.as_ref().map(|d|crate::topology::layout(d,w).height).unwrap_or(1),
        "panel"=>b.children.first().map(|c|natural(c,w.saturating_sub(2).max(1))+2).unwrap_or(2),
        "column"=>b.children.iter().map(|c|natural(c,w)).sum::<usize>().saturating_add(b.children.len().saturating_sub(1)*b.gap).max(1),
        "row"=>b.children.iter().map(|c|natural(c,(w/b.children.len().max(1)).max(1))).max().unwrap_or(1),_=>1,
    }.min(4000)
}
/// Render all twelve SDK block kinds natively. No state or IO is modified.
pub fn render(b:&Block,o:&Options)->Result<Frame>{
    if o.width==0||o.width>500||o.height==0||o.height>4000||o.width.saturating_mul(o.height)>MAX_CELLS||o.scroll_y>1_000_000{return Err(invalid("invalid frame size or scroll"));}
    if !["","none","ansi16","truecolor"].contains(&o.color.as_str()){return Err(invalid("unknown color mode"));}
    theme(&o.theme)?;check_block(b,0,&mut 0)?;bounded_json(b)?;
    let flexible=b.kind=="column"&&b.children.iter().any(|c|c.weight>0);
    let h=if flexible{o.height}else{natural(b,o.width).max(o.height).min(4000).min(MAX_CELLS/o.width)};
    let mut c=Canvas::new(o.width,h,o.ascii)?;paint(&mut c,b,Rect::new(0,0,o.width,h),o)?;
    let mut f=c.frame(o.scroll_y,o.height)?;
    if !o.color.is_empty()&&o.color!="none"{f.ansi=f.to_ansi(&o.theme,&o.color)?;}
    Ok(f)
}
fn paint(c:&mut Canvas,b:&Block,r:Rect,o:&Options)->Result<()>{
    if r.width==0||r.height==0{return Ok(());}
    let previous=c.clip;c.clip=previous.intersection(r);
    let result=paint_inner(c,b,r,o);c.clip=previous;result
}
fn paint_inner(c:&mut Canvas,b:&Block,r:Rect,o:&Options)->Result<()>{
    c.region(&b.id,&b.kind,r);let fg=if b.role.is_empty(){"text"}else{&b.role};
    match b.kind.as_str(){
        "text"|"status"=>{
            let bg=if b.kind=="status"{"raised"}else{"canvas"};if b.kind=="status"{c.fill(r,bg);}
            let lines:Vec<_>=b.text.split('\n').collect();let offset=b.scroll.min(lines.len().saturating_sub(r.height));
            for (y,line) in lines.iter().skip(offset).take(r.height).enumerate(){c.text(r.x,r.y+y,r.width,line,fg,bg);}
        },
        "panel"=>{c.border(r,&b.title,"border-strong");if r.width>2&&r.height>2{paint(c,&b.children[0],Rect::new(r.x+1,r.y+1,r.width-2,r.height-2),o)?;}},
        "row"|"column"=>{
            let row=b.kind=="row";let total=if row{r.width}else{r.height};let gap=b.gap;let n=b.children.len();
            if n==0{return Ok(());}
            let available=total.saturating_sub(gap*n.saturating_sub(1));let mut weights=0;let mut fixed=0;
            let mut sizes=vec![0;n];
            for (i,ch) in b.children.iter().enumerate(){
                if row{weights+=ch.weight.max(1);}else if ch.weight>0{weights+=ch.weight;}else{sizes[i]=natural(ch,r.width);fixed+=sizes[i];}
            }
            let mut remaining=available.saturating_sub(fixed);let mut pos=0;
            for (i,ch) in b.children.iter().enumerate(){
                let wt=if row{ch.weight.max(1)}else{ch.weight};
                if wt>0{sizes[i]=remaining*wt/weights.max(1);remaining-=sizes[i];weights-=wt;}
                let size=sizes[i].min(total.saturating_sub(pos));
                let rr=if row{Rect::new(r.x+pos,r.y,size,r.height)}else{Rect::new(r.x,r.y+pos,r.width,size)};
                paint(c,ch,rr,o)?;pos=pos.saturating_add(size+gap);
            }
        },
        "kv"=>{
            let label_w=20.min((r.width/3).max(1));let off=b.scroll.min(b.fields.len().saturating_sub(r.height));
            for (y,f) in b.fields.iter().skip(off).take(r.height).enumerate(){c.text(r.x,r.y+y,label_w,&f.label,"muted","");c.text(r.x+label_w+1,r.y+y,r.width.saturating_sub(label_w+1),&display(&f.value),fg,"");}
        },
        "events"=>{let off=b.scroll.min(b.events.len().saturating_sub(r.height));for (y,e) in b.events.iter().skip(off).take(r.height).enumerate(){c.text(r.x,r.y+y,r.width,&details(e),fg,"");}},
        "table"=>{
            let cw=(r.width/b.columns.len()).max(1);
            for (i,h) in b.columns.iter().enumerate(){if i*cw>=r.width{break;}c.text(r.x+i*cw,r.y,cw.saturating_sub(1).min(r.width-i*cw),h,"muted","");}
            if r.height>1{c.text(r.x,r.y+1,r.width,&"-".repeat(r.width),"border-strong","");}
            let off=b.scroll.min(b.rows.len().saturating_sub(r.height.saturating_sub(2)));
            for (dy,row) in b.rows.iter().skip(off).take(r.height.saturating_sub(2)).enumerate(){
                let id=format!("{}/{}",b.id,off+dy);let bg=if id==o.selected_id{"raised"}else{"canvas"};let role=if id==o.focus_id{"accent"}else{fg};let y=r.y+dy+2;
                c.fill(Rect::new(r.x,y,r.width,1),bg);
                for (i,v) in row.iter().take(b.columns.len()).enumerate(){if i*cw>=r.width{break;}c.text(r.x+i*cw,y,cw.saturating_sub(1).min(r.width-i*cw),&display(v),role,bg);}
                if id==o.selected_id{c.text(r.x,y,1,">","accent",bg);}
            }
        },
        "meter"=>{
            let hi=if b.max==b.min{b.min+100.0}else{b.max};let value=b.value.map(|v|format!("{v}{}",b.unit)).unwrap_or_else(||"N/A".into());
            c.text(r.x,r.y,r.width,&format!("{}  {value}",b.title),fg,"");
            if r.height>1&&r.width>=2{let n=r.width-2;let k=(b.value.map(|v|fraction(v,b.min,hi)).unwrap_or(0.0)*n as f64) as usize;
                c.text(r.x,r.y+1,r.width,&format!("[{}{}]","=".repeat(k)," ".repeat(n-k)),"accent","");}
        },
        "sparkline"=>{
            c.text(r.x,r.y,r.width,&format!("{} / {}",b.title,b.unit),"muted","");
            let (mut lo,mut hi)=(b.min,b.max);if hi<=lo{lo=0.0;hi=1.0;for s in b.samples.iter().flatten(){lo=lo.min(*s);hi=hi.max(*s);}}
            let chars:Vec<_>=if c.ascii{"._:-=+*#"}else{"▁▂▃▄▅▆▇█"}.chars().collect();
            if r.height>1{for (i,s) in b.samples.iter().skip(b.samples.len().saturating_sub(r.width)).enumerate(){if let Some(v)=s{let index=(fraction(*v,lo,hi)*7.0).round() as usize;c.text(r.x+i,r.y+1,1,&chars[index].to_string(),"accent","");}}}
            if r.height>2{c.text(r.x,r.y+2,r.width,&format!("{lo} .. {hi}  · null = gap"),"subtle","");}
        },
        "node"=>draw_node(c,b.node.as_ref().unwrap(),r,o),
        "topology"=>crate::topology::draw(c,b.data.as_ref().unwrap(),r,b.scroll,o)?,
        _=>return Err(invalid("unsupported block")),
    }
    Ok(())
}
fn fraction(v:f64,lo:f64,hi:f64)->f64{
    if v<=lo{return 0.0;}
    if v>=hi{return 1.0;}
    let span=hi-lo;let ratio=if span.is_finite(){(v-lo)/span}else{(v/2.0-lo/2.0)/(hi/2.0-lo/2.0)};
    if ratio.is_finite(){ratio.clamp(0.0,1.0)}else{0.0}
}
pub(crate) fn draw_node(c:&mut Canvas,n:&Node,r:Rect,o:&Options){
    let bg=if n.id==o.selected_id{"raised"}else{"canvas"};c.fill(r,bg);
    let border=if n.id==o.focus_id{"accent"}else{"border-strong"};c.border(r,if n.id==o.focus_id{"FOCUS"}else{""},border);c.region(&n.id,"node",r);
    let (state,color)=match n.state.as_str(){"running"=>("[RUN]","accent"),"done"=>("[OK]","success"),"error"=>("[ERR]","danger"),"blocked"=>("[BLOCK]","muted"),"disabled"=>("[OFF]","muted"),"stale"=>("[STALE]","muted"),"queued"=>("[WAIT]","muted"),_=>("[IDLE]","muted")};
    let model=["provider","name","effort"].map(|k|display(n.model.get(k).unwrap_or(&Value::Null))).join(" / ");
    let texts=[n.role.clone(),n.task.clone(),model,details(&n.metrics),details(&n.params)];
    for (i,t) in texts.iter().enumerate(){
        if i+1>=r.height.saturating_sub(1){break;}
        let w=r.width.saturating_sub(4+if i==0{state.len()+1}else{0});
        c.text(r.x+2,r.y+i+1,w,t,if i==1||i>=3{"muted"}else{"text"},bg);
    }
    if r.height>=3 && r.width>=state.len()+5{c.text(r.right()-2-state.len(),r.y+1,state.len(),state,color,bg);}
    if n.id==o.selected_id&&r.height>2{c.text(r.x+1,r.y+1,1,">","accent",bg);}
}
