use sacra_tui::{Block,Options,Topology,render};
use std::io::{self,Write};
type AnyResult<T> = Result<T,Box<dyn std::error::Error>>;
struct Args{mode:String,options:Options,frames:usize}
fn arguments()->AnyResult<Args>{
    let mut args=Args{mode:String::new(),options:Options::new(80,32),frames:0};
    let mut words=std::env::args().skip(1);
    while let Some(word)=words.next(){match word.as_str(){
        "--snapshot"|"--demo"|"--stdio"=>{if !args.mode.is_empty(){return Err("choose one mode".into());}args.mode=word;},
        "--version"=>{println!("SACRA Rust {} / protocol 1",sacra_tui::VERSION);std::process::exit(0);},
        "--help"|"-h"=>{println!("sacra-tui-rs --snapshot | --stdio | --demo\n--width N --height N --theme ID --color none|ansi16|truecolor --ascii --frames N\n--demo requires Cargo feature terminal. q/Ctrl-C exit, p pause, arrows scroll, Tab focus, Enter select, t theme.");std::process::exit(0);},
        "--width"=>args.options.width=words.next().ok_or("missing width")?.parse()?,
        "--height"=>args.options.height=words.next().ok_or("missing height")?.parse()?,
        "--frames"=>args.frames=words.next().ok_or("missing frames")?.parse()?,
        "--theme"=>args.options.theme=words.next().ok_or("missing theme")?,
        "--color"=>args.options.color=words.next().ok_or("missing color")?,
        "--ascii"=>args.options.ascii=true,_=>return Err(format!("unknown argument {word}").into()),
    }}
    if args.mode.is_empty(){return Err("use --snapshot, --demo or --stdio".into());}
    if std::env::var_os("NO_COLOR").is_some()||std::env::var("TERM").as_deref()==Ok("dumb"){args.options.color="none".into();}
    Ok(args)
}
fn demo_data(phase:usize)->Topology{
    let mut data:Topology=serde_json::from_str(include_str!("../../demo.json")).expect("embedded demo tested");
    data.session.insert("source".into(),serde_json::json!("synthetic"));
    let count=data.nodes.len().max(1);
    for (i,node) in data.nodes.iter_mut().enumerate(){node.state=if i==phase%count{"running"}else{"idle"}.into();}
    data
}
fn view(data:Topology,scroll:usize)->Block{
    Block::column(vec![Block::status("SACRA / RUST NATIVE · SYNTHETIC DEMO"),Block::topology(data).with_weight(1).with_scroll(scroll),Block::status("Tab focus · Enter select · ↑↓ scroll · p pause · → step · t theme · q exit")])
}
fn run()->AnyResult<()>{
    let args=arguments()?;
    match args.mode.as_str(){
        "--stdio"=>{sacra_tui::protocol::serve(io::stdin().lock(),io::stdout().lock())?;},
        "--snapshot"=>{let f=render(&view(demo_data(0),0),&args.options)?;let output=if f.ansi.is_empty(){f.plain()}else{f.ansi};writeln!(io::stdout(),"{output}")?;},
        "--demo"=>{
            #[cfg(feature="terminal")]{terminal::demo(args)?;}
            #[cfg(not(feature="terminal"))]{return Err("rebuild with --features terminal for --demo".into());}
        },_=>unreachable!(),
    }
    Ok(())
}
fn main(){if let Err(e)=run(){eprintln!("sacra-tui-rs: {e}");std::process::exit(1);}}

#[cfg(feature="terminal")]
mod terminal{
    use super::*;
    use crossterm::{cursor::{Hide,Show,MoveTo},event::{self,Event,KeyCode,KeyEventKind,KeyModifiers},execute,queue,style::ResetColor,terminal::{self,EnterAlternateScreen,LeaveAlternateScreen}};
    use std::{io::IsTerminal,sync::{Arc,atomic::{AtomicBool,Ordering}},time::{Duration,Instant}};
    struct Restore{owns_raw:bool}
    impl Drop for Restore{fn drop(&mut self){let _=execute!(io::stdout(),ResetColor,Show,LeaveAlternateScreen);if self.owns_raw{let _=terminal::disable_raw_mode();}}}
    pub(super) fn demo(mut args:Args)->AnyResult<()>{
        if !io::stdin().is_terminal()||!io::stdout().is_terminal(){return Err("--demo requires a TTY; use --snapshot for pipes".into());}
        let stop=Arc::new(AtomicBool::new(false));let stopping=stop.clone();
        ctrlc::set_handler(move||{stopping.store(true,Ordering::SeqCst);})?;
        let raw_before=terminal::is_raw_mode_enabled()?;
        if !raw_before{terminal::enable_raw_mode()?;}
        let _restore=Restore{owns_raw:!raw_before};execute!(io::stdout(),EnterAlternateScreen,Hide)?;
        let mut phase=0;let mut focus=0;let mut scroll=0usize;let mut playing=true;let mut last=Instant::now();let mut frames=0;
        while !stop.load(Ordering::SeqCst){
            let (w,h)=terminal::size()?;args.options.width=usize::from(w).clamp(1,500);args.options.height=usize::from(h).clamp(1,100);
            if playing&&last.elapsed()>=Duration::from_millis(1200){phase+=1;last=Instant::now();}
            let data=demo_data(phase);args.options.focus_id=data.nodes[focus%data.nodes.len()].id.clone();
            args.options.active_edges=match phase%7{1=>vec!["main-router"],2=>vec!["router-fanout","router-worker","router-explorer","router-researcher"],5=>vec!["architect-review"],6=>vec!["worker-review","explorer-review","researcher-review","merge-review"],_=>vec![]}.into_iter().map(String::from).collect();
            let frame=render(&view(data,scroll),&args.options)?;
            let content=if frame.ansi.is_empty(){frame.plain()}else{frame.ansi};let mut stdout=io::stdout();
            // Raw-mode LF does not imply CR. Start every row explicitly; do not
            // disable line-wrap and then guess how the host configured it before.
            for (y,line) in content.split('\n').enumerate(){queue!(stdout,MoveTo(0,y as u16))?;write!(stdout,"{line}")?;}stdout.flush()?;
            frames+=1;if args.frames>0&&frames>=args.frames{break;}
            if event::poll(Duration::from_millis(100))?{
                if let Event::Key(key)=event::read()?{if key.kind==KeyEventKind::Release{continue;}
                    match key.code{
                        KeyCode::Char('q')|KeyCode::Esc=>break,
                        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL)=>break,
                        KeyCode::Char('p')|KeyCode::Char(' ')=>playing = !playing,
                        KeyCode::Right=>{phase+=1;last=Instant::now();},
                        KeyCode::Down=>scroll=(scroll+1).min(1000),KeyCode::Up=>scroll=scroll.saturating_sub(1),
                        KeyCode::Tab=>focus=(focus+1)%7,
                        KeyCode::Enter=>args.options.selected_id=args.options.focus_id.clone(),
                        KeyCode::Char('t')=>{let themes=sacra_tui::theme_ids();let i=themes.iter().position(|id|*id==args.options.theme).unwrap_or(0);args.options.theme=themes[(i+1)%themes.len()].into();},_=>{},
                    }
                }
            }
        }
        Ok(())
    }
}
