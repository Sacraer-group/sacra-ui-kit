use crate::{invalid, safe_text, Frame, Result};
use serde::Deserialize;
use std::{collections::BTreeMap,sync::OnceLock};
#[derive(Debug,Clone,Deserialize)]
pub struct Theme {pub id:String,pub name:String,pub colors:BTreeMap<String,String>}
fn registry()->&'static Vec<Theme> {
    static THEMES:OnceLock<Vec<Theme>>=OnceLock::new();
    THEMES.get_or_init(||serde_json::from_str(include_str!("../themes.json")).expect("embedded themes validated by tests"))
}
pub fn theme(id:&str)->Result<&'static Theme>{registry().iter().find(|t|t.id==if id.is_empty(){"sacra"}else{id}).ok_or_else(||invalid("unknown theme"))}
pub fn theme_ids()->Vec<&'static str>{registry().iter().map(|t|t.id.as_str()).collect()}
impl Theme {
    pub fn rgb(&self,role:&str,background:bool)->(u8,u8,u8){
        let fallback=if background{"canvas"}else{"text"};
        let hex=self.colors.get(role).filter(|s|s.starts_with('#')&&s.len()==7).or_else(||self.colors.get(fallback)).map(String::as_str).unwrap_or("#15191F");
        let v=u32::from_str_radix(hex.trim_start_matches('#'),16).unwrap_or(0);
        ((v>>16) as u8,(v>>8) as u8,v as u8)
    }
}
const ANSI16:[(u8,u8,u8);16]=[(0,0,0),(128,0,0),(0,128,0),(128,128,0),(0,0,128),(128,0,128),(0,128,128),(192,192,192),(128,128,128),(255,0,0),(0,255,0),(255,255,0),(0,0,255),(255,0,255),(0,255,255),(255,255,255)];
fn sgr(rgb:(u8,u8,u8),bg:bool,mode:&str)->String{
    let (r,g,b)=rgb;
    if mode=="truecolor" {return format!("\x1b[{};2;{r};{g};{b}m",if bg{48}else{38});}
    let i=ANSI16.iter().enumerate().min_by_key(|(_,c)|{let d=|a:u8,b:u8|(a as i32-b as i32).pow(2);d(r,c.0)+d(g,c.1)+d(b,c.2)}).map(|(i,_)|i).unwrap_or(0);
    format!("\x1b[{}m",if i<8{30+i}else{90+i-8}+if bg{10}else{0})
}
impl Frame {
    /// SGR colors only. No cursor movement, OSC, clear screen or terminal modes.
    pub fn to_ansi(&self,id:&str,mode:&str)->Result<String>{
        if mode.is_empty()||mode=="none"{return Ok(self.plain());}
        if !["ansi16","truecolor"].contains(&mode){return Err(invalid("color must be none, ansi16 or truecolor"));}
        let palette=theme(id)?;let mut out=String::new();
        for (y,runs) in self.runs.iter().enumerate(){
            if y>0{out.push('\n');}
            for r in runs{out.push_str(&sgr(palette.rgb(&r.fg,false),false,mode));out.push_str(&sgr(palette.rgb(&r.bg,true),true,mode));out.push_str(&safe_text(&r.text));}
            out.push_str("\x1b[0m");
        }
        Ok(out)
    }
}
