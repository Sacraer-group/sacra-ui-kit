//! JSONL v1: optional transport for other languages, not used by native render().
use crate::{hydrate, invalid, render, Block, Frame, Options, Result, MAX_INPUT_BYTES, VERSION};
use serde::{Deserialize,Serialize};
use serde_json::{json,Value};
use std::io::{BufRead,Read,Write};
#[derive(Debug,Clone,Default,Deserialize)]
#[serde(default)]
pub struct Request {
    pub version:u32,pub id:String,pub op:String,pub block:Option<Block>,pub options:Option<Options>,
    pub template:Value,pub bindings:Value,
}
#[derive(Debug,Serialize)]
pub struct Response {
    pub version:u32,pub id:String,pub ok:bool,
    #[serde(skip_serializing_if="Option::is_none")]pub frame:Option<Frame>,
    #[serde(skip_serializing_if="Option::is_none")]pub data:Option<Value>,
    #[serde(skip_serializing_if="Option::is_none")]pub error:Option<String>,
}
impl Response {
    fn empty(id:String)->Self{Self{version:1,id,ok:false,frame:None,data:None,error:None}}
    fn failed(id:String,error:impl ToString)->Self{Self{error:Some(error.to_string()),..Self::empty(id)}}
}
pub fn handle(req:Request)->Response {
    let mut response=Response::empty(req.id);
    let operation=||->Result<(Option<Frame>,Option<Value>)>{
        if req.version!=1{return Err(invalid("unsupported protocol version (expected 1)"));}
        match req.op.as_str(){
            "info"=>Ok((None,Some(json!({"sdkVersion":VERSION,"implementation":"rust-native","protocolVersion":1,"themes":crate::theme_ids(),"blocks":crate::BLOCK_TYPES})))),
            "render"=>Ok((Some(render(req.block.as_ref().ok_or_else(||invalid("render requires block"))?,req.options.as_ref().ok_or_else(||invalid("render requires options"))?)?),None)),
            "hydrate"=>Ok((None,Some(hydrate(&req.template,&req.bindings)?))),
            _=>Err(invalid("unsupported op (render, hydrate, info)")),
        }
    };
    match operation(){Ok((f,d))=>{response.ok=true;response.frame=f;response.data=d;},Err(e)=>response.error=Some(e.to_string())};response
}
/// Parse one bounded request. Ordinary validation errors do not kill the worker.
pub fn process_line(bytes:&[u8])->Response{
    if bytes.len()>MAX_INPUT_BYTES{return Response::failed(String::new(),"request exceeds 1 MiB");}
    let value:Value=match serde_json::from_slice(bytes){Ok(v)=>v,Err(e)=>return Response::failed(String::new(),e)};
    let id=value.get("id").and_then(Value::as_str).unwrap_or("").to_owned();
    if value.get("op").and_then(Value::as_str)==Some("render"){
        let options=value.get("options");
        if options.and_then(|v|v.get("width")).is_none()||options.and_then(|v|v.get("height")).is_none(){return Response::failed(id,"render options require width and height");}
    }
    match serde_json::from_value(value){Ok(req)=>handle(req),Err(e)=>Response::failed(id,e)}
}
/// stdout contains JSON only; malformed lines recover, oversized lines abort.
pub fn serve(mut reader:impl BufRead,mut writer:impl Write)->std::io::Result<()> {
    loop {
        let mut line=vec![];
        let n=(&mut reader).take((MAX_INPUT_BYTES+2) as u64).read_until(b'\n',&mut line)?;
        if n==0{return Ok(());}
        if line.last()==Some(&b'\n'){line.pop();if line.last()==Some(&b'\r'){line.pop();}}
        if line.len()>MAX_INPUT_BYTES{return Err(std::io::Error::other("request exceeds 1 MiB"));}
        if line.is_empty(){continue;}
        let res=process_line(&line);serde_json::to_writer(&mut writer,&res)?;writer.write_all(b"\n")?;writer.flush()?;
    }
}
