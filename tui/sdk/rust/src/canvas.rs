use crate::{invalid, Rect, Result, MAX_CELLS};
use serde::Serialize;
use unicode_segmentation::UnicodeSegmentation;
use unicode_width::UnicodeWidthStr;

/// Strip terminal controls and bidi overrides; text can never inject OSC/SGR.
pub fn safe_text(text: &str) -> String {
    text.chars().filter_map(|c| match c {
        '\t' => Some(' '),
        '\u{0}'..='\u{1f}' | '\u{7f}'..='\u{9f}' | '\u{202a}'..='\u{202e}' | '\u{2066}'..='\u{2069}' => None,
        _ => Some(c),
    }).collect()
}
fn glyphs(text: &str) -> Vec<(String, usize)> {
    let clean = safe_text(text);
    clean.graphemes(true).filter_map(|g| {
        let w = UnicodeWidthStr::width(g);
        if w == 0 {
            // Isolated joiners/format controls are not printable graphemes.
            if g.chars().all(|c|matches!(c, '\u{200b}'..='\u{200f}' | '\u{2060}' | '\u{feff}')) { return None; }
            return Some((format!("◌{g}"), 1));
        }
        Some((g.into(), w))
    }).collect()
}
pub fn display_width(text: &str) -> usize { glyphs(text).iter().map(|(_,w)|w).sum() }
pub fn clip_text(text: &str, width: usize) -> String {
    let mut out=String::new(); let mut n=0;
    for (g,w) in glyphs(text) { if n+w > width { break; } out.push_str(&g); n+=w; }
    out
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Cell { pub text: String, pub width: usize, pub fg: String, pub bg: String }
impl Default for Cell {
    fn default() -> Self { Self { text: " ".into(), width: 1, fg: "text".into(), bg: "canvas".into() } }
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Run { pub text: String, pub fg: String, pub bg: String }
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Region { pub id: String, #[serde(rename="type")] pub kind: String, pub x: usize, pub y: i32, pub width: usize, pub height: usize }
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all="camelCase")]
pub struct Frame {
    pub width: usize, pub height: usize, pub content_height: usize, pub scroll_y: usize,
    pub lines: Vec<String>, pub runs: Vec<Vec<Run>>, pub regions: Vec<Region>,
    #[serde(skip_serializing_if="String::is_empty")]
    pub ansi: String,
    #[serde(skip)]
    pub cells: Vec<Cell>,
}
impl Frame { pub fn plain(&self) -> String { self.lines.join("\n") } }
/// Bounded cell canvas. Subcomponent clipping cannot spill into sibling panels.
#[derive(Debug)]
pub struct Canvas {
    pub width: usize, pub height: usize, pub ascii: bool,
    pub(crate) cells: Vec<Cell>, pub(crate) regions: Vec<Region>, pub(crate) clip: Rect,
}
impl Canvas {
    pub fn new(width: usize, height: usize, ascii: bool) -> Result<Self> {
        if width==0 || height==0 || width>500 || height>4000 || width.saturating_mul(height)>MAX_CELLS { return Err(invalid("canvas must be 1..500 x 1..4000, at most 200000 cells")); }
        Ok(Self { width, height, ascii, cells: vec![Cell::default();width*height], regions: vec![], clip:Rect::new(0,0,width,height) })
    }
    pub fn cells(&self) -> &[Cell] { &self.cells }
    fn clear(&mut self,x:usize,y:usize) {
        if x>=self.width || y>=self.height {return;}
        let i=y*self.width+x;
        // Clear the complete previous grapheme, including all continuation cells.
        let mut start=x;
        while start>0 && self.cells[y*self.width+start].width==0 {start-=1;}
        let w=self.cells[y*self.width+start].width.max(1);
        for xx in start..(start+w).min(self.width) { self.cells[y*self.width+xx]=Cell::default(); }
        self.cells[i]=Cell::default();
    }
    pub(crate) fn put(&mut self,x:usize,y:usize,g:&str,w:usize,fg:&str,bg:&str) {
        if w==0 || !self.clip.contains(x,y) || x.saturating_add(w)>self.clip.right() || x+w>self.width || y>=self.height {return;}
        for xx in x..x+w {self.clear(xx,y);}
        let fg=if fg.is_empty(){"text"}else{fg};let bg=if bg.is_empty(){"canvas"}else{bg};
        self.cells[y*self.width+x]=Cell{text:g.into(),width:w,fg:fg.into(),bg:bg.into()};
        for xx in x+1..x+w {self.cells[y*self.width+xx]=Cell{text:String::new(),width:0,fg:fg.into(),bg:bg.into()};}
    }
    pub fn text(&mut self,x:usize,y:usize,width:usize,text:&str,fg:&str,bg:&str) {
        let end=x.saturating_add(width).min(self.width);let mut xx=x;
        for (g,w) in glyphs(text) {if xx.saturating_add(w)>end{break;}self.put(xx,y,&g,w,fg,bg);xx+=w;}
    }
    pub fn fill(&mut self,r:Rect,bg:&str) {
        let r=r.intersection(self.clip);
        for y in r.y..r.bottom() {for x in r.x..r.right(){self.put(x,y," ",1,"text",bg);}}
    }
    pub fn border(&mut self,r:Rect,title:&str,fg:&str) {
        if r.width<2||r.height<2 {return;}
        let (tl,tr,bl,br,h,v)=if self.ascii{("+","+","+","+","-","|")}else{("┌","┐","└","┘","─","│")};
        // Bound repetition even for public callers with oversized Rect values.
        let edge=h.repeat(r.width.saturating_sub(2).min(self.width));
        self.text(r.x,r.y,r.width,&format!("{tl}{edge}{tr}"),fg,"");
        self.text(r.x,r.bottom()-1,r.width,&format!("{bl}{edge}{br}"),fg,"");
        for y in (r.y+1).min(self.height)..r.bottom().saturating_sub(1).min(self.height) {
            self.text(r.x,y,1,v,fg,"");self.text(r.right()-1,y,1,v,fg,"");
        }
        if !title.is_empty() && r.width>5 {self.text(r.x+2,r.y,r.width-4,&format!(" {title} "),fg,"canvas");}
    }
    pub(crate) fn region(&mut self,id:&str,kind:&str,r:Rect) {
        if !id.is_empty() {self.regions.push(Region{id:id.into(),kind:kind.into(),x:r.x,y:r.y as i32,width:r.width,height:r.height});}
    }
    pub fn blit(&mut self,src:&Canvas,r:Rect,scroll:usize) {
        let offset=scroll.min(src.height.saturating_sub(r.height));
        for y in 0..r.height.min(src.height-offset) {for x in 0..r.width.min(src.width) {
            let c=&src.cells[(y+offset)*src.width+x];
            if c.width>0 && x+c.width<=r.width {self.put(r.x+x,r.y+y,&c.text,c.width,&c.fg,&c.bg);}
        }}
        for region in &src.regions {
            let mut reg=region.clone(); reg.x+=r.x;reg.y+=r.y as i32-offset as i32;
            if reg.y+(reg.height as i32)>r.y as i32 && reg.y<(r.bottom() as i32) {self.regions.push(reg);}
        }
    }
    pub fn frame(&self,offset:usize,height:usize) -> Result<Frame> {
        if height==0 || height>4000 || height.saturating_mul(self.width)>MAX_CELLS {return Err(invalid("invalid frame height"));}
        let offset=offset.min(self.height.saturating_sub(height));
        let mut f=Frame{width:self.width,height,content_height:self.height,scroll_y:offset,lines:vec![],runs:vec![],regions:vec![],ansi:String::new(),cells:vec![]};
        for y in 0..height {
            let mut line=String::new();let mut runs:Vec<Run>=vec![];
            for x in 0..self.width {
                let cell=if y+offset<self.height{self.cells[(y+offset)*self.width+x].clone()}else{Cell::default()};
                if cell.width>0 {
                    line.push_str(&cell.text);
                    if let Some(last)=runs.last_mut().filter(|r|r.fg==cell.fg && r.bg==cell.bg) {last.text.push_str(&cell.text);}
                    else {runs.push(Run{text:cell.text.clone(),fg:cell.fg.clone(),bg:cell.bg.clone()});}
                }
                f.cells.push(cell);
            }
            f.lines.push(line);f.runs.push(runs);
        }
        for reg in &self.regions {
            let mut r=reg.clone();r.y-=offset as i32;
            if r.y+(r.height as i32)>0 && r.y<(height as i32) {f.regions.push(r);}
        }
        Ok(f)
    }
}
