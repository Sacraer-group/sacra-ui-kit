//! Optional Ratatui integration. The host owns Terminal/backend/event loop.
use crate::{Frame,Theme};
use ratatui::{buffer::Buffer,layout::Rect,style::{Color,Style},widgets::Widget};

/// A previously rendered SACRA frame as a native Ratatui Widget.
/// Prepare the frame at the target area size with render() before passing it here.
pub struct FrameWidget<'a>{pub frame:&'a Frame,pub theme:&'a Theme}
impl<'a> FrameWidget<'a>{pub fn new(frame:&'a Frame,theme:&'a Theme)->Self{Self{frame,theme}}}
impl Widget for &FrameWidget<'_>{
    fn render(self,area:Rect,buf:&mut Buffer){
        let clip=area.intersection(buf.area);
        for y in 0..self.frame.height.min(area.height as usize){
            for x in 0..self.frame.width.min(area.width as usize){
                let cell=&self.frame.cells[y*self.frame.width+x];
                let px=area.x.saturating_add(x as u16);let py=area.y.saturating_add(y as u16);
                if px<clip.x||py<clip.y||px>=clip.right()||py>=clip.bottom(){continue;}
                let (r,g,b)=self.theme.rgb(&cell.fg,false);let (br,bg,bb)=self.theme.rgb(&cell.bg,true);
                let style=Style::default().fg(Color::Rgb(r,g,b)).bg(Color::Rgb(br,bg,bb));
                if let Some(dest)=buf.cell_mut((px,py)){
                    dest.set_style(style);
                    // Blank clipped wide graphemes and continuation cells.
                    let complete=cell.width>0&&x+cell.width<=area.width as usize&&(px as usize+cell.width)<=clip.right() as usize;
                    dest.set_symbol(if complete{&cell.text}else{" "});
                }
            }
        }
    }
}
