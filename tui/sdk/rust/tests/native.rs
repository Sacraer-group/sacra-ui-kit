use sacra_tui::*;
use serde_json::{json,Value};
fn demo()->Topology{serde_json::from_str(include_str!("../demo.json")).unwrap()}
#[test]
fn twelve_blocks_all_themes_and_sizes(){
    let fixture=demo();let blocks=vec![
        Block::text("Привет\n世界e\u{301}"),Block::status("HEADER"),Block::panel("TEST",Block::text("hello")),
        Block::row(vec![Block::text("left"),Block::text("right")]),Block::column(vec![Block::text("top"),Block::text("bottom")]),
        Block{fields:vec![Field{label:"zero".into(),value:json!(0)},Field{label:"missing".into(),value:Value::Null}],..Block::new("kv")},
        Block{columns:vec!["key".into(),"value".into()],rows:vec![vec![json!("cpu"),json!(0)],vec![json!("missing"),Value::Null]],..Block::new("table")},
        Block{title:"context".into(),value:Some(0.0),max:100.0,..Block::new("meter")},
        Block{samples:vec![Some(0.0),None,Some(100.0)],max:100.0,..Block::new("sparkline")},
        Block{events:vec![[ ("actor".into(),json!("worker")) ].into()],..Block::new("events")},
        Block::node(fixture.nodes[0].clone()),Block::topology(fixture),
    ];
    for b in blocks{for w in [1,8,40,80,96,120,140,160,240,500]{for h in [1,12,24,44]{
        let mut base=None;
        for id in theme_ids(){
            let mut opt=Options::new(w,h);opt.theme=id.into();let frame=render(&b,&opt).unwrap();
            assert_eq!(frame.lines.len(),h);assert_eq!(frame.cells.len(),w*h);
            for (y,line) in frame.lines.iter().enumerate(){assert_eq!(display_width(line),w,"{} {w}x{h} row{y}: {line}",b.kind);}
            if let Some(lines)=base{assert_eq!(frame.lines,lines,"theme changes layout");}base=Some(frame.lines);
        }
    }}}
}
#[test]
fn arrow_geometry_has_shared_ports_and_no_collisions(){
    for width in 96..=240{
        let scene=layout_topology(&demo(),width).unwrap();let node=|id:&str|scene.nodes.iter().find(|p|p.node.id==id).unwrap().rect;
        assert_eq!(node("router").center_x(),node("explorer").center_x());
        let routes=&scene.routes;
        assert_eq!(routes.iter().filter(|r|r.id=="router-fanout").count(),1);
        assert_eq!(routes.iter().filter(|r|r.id=="merge-review").count(),1);
        for p in &scene.nodes{assert!(p.rect.right()<=width);}
        for r in routes{for pair in r.points.windows(2){let(a,b)=(pair[0],pair[1]);assert!(a.x==b.x||a.y==b.y);
            for x in a.x.min(b.x)..=a.x.max(b.x){for y in a.y.min(b.y)..=a.y.max(b.y){
                for p in &scene.nodes{assert!(!p.rect.contains(x,y),"{} crosses {} at {x},{y} width={width}",r.id,p.node.id);}
            }}
        }}
        let fanout=routes.iter().find(|r|r.id=="router-fanout").unwrap().points.last().unwrap();
        let merge=&routes.iter().find(|r|r.id=="merge-review").unwrap().points[0];
        for id in ["worker","explorer","researcher"]{
            let r=routes.iter().find(|r|r.id==format!("router-{id}")).unwrap();assert_eq!(&r.points[0],fanout);let end=r.points.last().unwrap();assert_eq!(end.x,node(id).center_x());assert_eq!(end.y+1,node(id).y);
            let r=routes.iter().find(|r|r.id==format!("{id}-review")).unwrap();assert_eq!(r.points.last().unwrap(),merge);assert_eq!(r.points[0].y,node(id).bottom());
        }
    }
}
#[test]
fn unicode_clipping_overwrite_and_control_safety(){
    for (s,n) in [("Привет",6),("界",2),("e\u{301}",1),("👩‍💻",2),("🇷🇺",2),("👍🏽",2),("a界b",4)]{assert_eq!(display_width(s),n,"{s}");}
    assert_eq!(clip_text("界",1),"");assert_eq!(clip_text("e\u{301}x",1),"e\u{301}");
    let mut c=Canvas::new(4,1,false).unwrap();c.text(0,0,4,"界ab","text","");c.text(1,0,1,"x","text","");assert_eq!(c.frame(0,1).unwrap().lines[0]," xab");
    assert!(Canvas::new(501,1,false).is_err());assert!(c.frame(0,0).is_err());
    let f=render(&Block::text("\x1b]52;c;evil\x07 Привет\u{202e}"),&Options::new(40,1)).unwrap();
    assert!(!f.plain().contains('\x1b'));let ansi=f.to_ansi("sacra","truecolor").unwrap();assert!(!ansi.contains("\x1b]"));assert!(!ansi.contains("\u{202e}"));assert!(ansi.ends_with("\x1b[0m"));
}
#[test]
fn native_placeholders_preserve_types_without_side_effects(){
    let bindings=json!({"x":{"zero":0,"flag":false,"name":"Влад","items":[1,2],"nil":null}});let original=bindings.clone();
    let mut out=hydrate(&json!({"a":"{{x.zero}}","b":"{{x.flag}}","c":"hi {{x.name}}","d":"{{x.items}}","e":"{{x.nil}}"}),&bindings).unwrap();
    assert_eq!(out,json!({"a":0,"b":false,"c":"hi Влад","d":[1,2],"e":null}));out["d"][0]=json!(9);assert_eq!(bindings,original);
    assert!(hydrate(&json!("{{missing}}"),&bindings).is_err());assert!(hydrate(&json!("{{__proto__.x}}"),&bindings).is_err());
    assert!(hydrate(&json!({"constructor":"x"}),&json!({})).is_err());
    assert!(hydrate(&json!("{{v}}".repeat(1000)),&json!({"v":"x".repeat(2000)})).is_err());
}
#[test]
fn local_scroll_keeps_header_footer_and_focus_separate(){
    let view=Block::column(vec![Block::status("HEADER"),Block::topology(demo()).with_weight(1).with_scroll(20),Block::status("FOOTER")]);
    let mut o=Options::new(80,24);o.focus_id="researcher".into();o.selected_id="worker".into();
    let f=render(&view,&o).unwrap();assert!(f.lines[0].starts_with("HEADER"));assert!(f.lines[23].starts_with("FOOTER"));assert_eq!(f.content_height,24);
    o.width=160;o.height=44;let f=render(&Block::topology(demo()),&o).unwrap();
    for p in layout_topology(&demo(),160).unwrap().nodes{
        if p.node.id=="worker"{assert_eq!(f.cells[(p.rect.y+1)*160+p.rect.x+1].text,">");assert_ne!(f.cells[p.rect.y*160+p.rect.x].fg,"accent");}
        if p.node.id=="researcher"{assert_eq!(f.cells[p.rect.y*160+p.rect.x].fg,"accent");}
    }
}
#[test]
fn gaps_zero_invalid_limits_and_extreme_values(){
    let z=Block{value:Some(0.0),max:100.0,..Block::new("meter")};let missing=Block{value:None,..z.clone()};
    assert!(render(&z,&Options::new(20,2)).unwrap().lines[0].contains('0'));
    assert!(render(&missing,&Options::new(20,2)).unwrap().lines[0].contains("N/A"));
    let spark=Block{samples:vec![Some(0.0),None,Some(100.0)],max:100.0,..Block::new("sparkline")};
    assert!(render(&spark,&Options::new(20,3)).unwrap().lines[1].starts_with("▁ █"));
    assert!(render(&Block{value:Some(f64::NAN),..z.clone()},&Options::new(20,2)).is_err());
    assert!(render(&Block{min:100.0,max:0.0,..z.clone()},&Options::new(20,2)).is_err());
    render(&Block{min:-1e308,max:1e308,value:Some(0.0),..z.clone()},&Options::new(20,2)).unwrap();
    for (w,h) in [(0,1),(501,10),(500,4000)]{assert!(render(&z,&Options::new(w,h)).is_err());}
    let mut d=demo();d.nodes[1].id="main".into();assert!(layout_topology(&d,160).is_err());
    let mut b=Block::text("x");for _ in 0..18{b=Block::panel("",b);}assert!(render(&b,&Options::default()).is_err());
}
#[test]
fn compact_large_and_empty_topology(){
    assert_eq!(layout_topology(&demo(),80).unwrap().mode,"list");
    let mut d=demo();d.nodes.push(Node{id:"extra".into(),slot:"worker4".into(),..Node::default()});
    let scene=layout_topology(&d,160).unwrap();assert_eq!(scene.mode,"list");assert!(scene.routes.is_empty());assert_eq!(scene.nodes.len(),8);
    assert!(layout_topology(&Topology::default(),160).unwrap().routes.is_empty());
    let mut d=demo();d.nodes.retain(|n|n.slot=="main"||n.slot=="review");assert!(layout_topology(&d,160).unwrap().routes.is_empty());
    let d=Topology{nodes:vec![Node{id:"a".into(),..Node::default()},Node{id:"b".into(),..Node::default()}],..Topology::default()};assert_eq!(layout_topology(&d,160).unwrap().nodes.len(),2);
}
#[test]
fn protocol_errors_recover_and_no_implicit_simulator(){
    let mut d=demo();d.session.insert("source".into(),json!("adapter"));d.nodes[0].state="blocked".into();
    let req=json!({"version":1,"id":"a","op":"render","block":{"type":"topology","data":d},"options":{"width":160,"height":44}});
    let response=protocol::process_line(req.to_string().as_bytes());assert!(response.ok);assert!(response.frame.unwrap().plain().contains("[BLOCK]"));
    assert!(!protocol::process_line(br#"{"version":1,"op":"render","options":{}}"#).ok);
    let input=b"{bad\n{\"version\":1,\"id\":\"ok\",\"op\":\"info\"}\n";let mut out=vec![];protocol::serve(&input[..],&mut out).unwrap();let lines:Vec<Value>=String::from_utf8(out).unwrap().lines().map(|l|serde_json::from_str(l).unwrap()).collect();assert_eq!(lines.len(),2);assert_eq!(lines[0]["ok"],false);assert_eq!(lines[1]["ok"],true);assert_eq!(lines[1]["id"],"ok");
    assert!(protocol::serve(&vec![b'x';MAX_INPUT_BYTES+1][..],&mut vec![]).is_err());
}
#[test]
fn parallel_render_is_deterministic(){
    let handles:Vec<_>=(0..12).map(|_|std::thread::spawn(||render(&Block::topology(demo()),&Options::new(160,44)).unwrap().plain())).collect();let mut first=None;
    for h in handles{let frame=h.join().unwrap();if let Some(ref prev)=first{assert_eq!(&frame,prev);}first=Some(frame);}
}
#[cfg(feature="ratatui")]
#[test]
fn ratatui_widget_crops_into_existing_buffer(){
    use ratatui::{buffer::Buffer,layout::Rect as RRect,widgets::Widget};
    let frame=render(&Block::text("界e\u{301}"),&Options::new(10,2)).unwrap();let widget=ratatui_widget::FrameWidget::new(&frame,theme("nord").unwrap());
    let mut buf=Buffer::empty(RRect::new(0,0,20,8));(&widget).render(RRect::new(3,2,10,2),&mut buf);assert_eq!(buf[(3,2)].symbol(),"界");assert_eq!(buf[(5,2)].symbol(),"e\u{301}");assert_eq!(buf[(2,2)].symbol()," ");
    let mut buf=Buffer::empty(RRect::new(0,0,10,2));(&widget).render(RRect::new(0,0,1,1),&mut buf);assert_eq!(buf[(0,0)].symbol()," ");
}
