use sacra_tui::{Block,Options,render};
fn main()->Result<(),Box<dyn std::error::Error>>{
    let meter=Block{title:"context".into(),value:Some(25.0),max:100.0,unit:"%".into(),..Block::new("meter")};
    let view=Block::row(vec![Block::panel("MODEL",Block::text("provider / my-model")),Block::panel("CONTEXT",meter)]);
    let frame=render(&view,&Options::new(100,10))?;
    println!("{}",frame.plain());Ok(())
}
