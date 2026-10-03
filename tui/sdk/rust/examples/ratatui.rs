use sacra_tui::{Block,Options,render,theme,ratatui_widget::FrameWidget};
use ratatui::{backend::TestBackend,Terminal};
fn main()->Result<(),Box<dyn std::error::Error>>{
    let view=Block::panel("RATATUI / SACRA",Block::text("In-process widget. No Go-worker."));
    let surface=render(&view,&Options::new(60,8))?;
    let widget=FrameWidget::new(&surface,theme("sacra")?);
    let mut terminal=Terminal::new(TestBackend::new(60,8))?;
    terminal.draw(|frame|frame.render_widget(&widget,frame.area()))?;
    // Replace TestBackend with your existing application's backend; the widget
    // itself does not enter alternate screen, install handlers or poll input.
    println!("{}",surface.plain());Ok(())
}
