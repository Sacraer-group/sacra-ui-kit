use crate::{model::check_topology, invalid, Canvas, Node, Options, Rect, Result, Topology};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
#[derive(Debug,Copy,Clone,PartialEq,Eq,PartialOrd,Ord,Serialize)]
pub struct Point{pub x:usize,pub y:usize}
impl Point{fn new(x:usize,y:usize)->Self{Self{x,y}}}
#[derive(Debug,Clone,PartialEq,Serialize)]
pub struct Placement{pub node:Node,#[serde(flatten)]pub rect:Rect}
#[derive(Debug,Clone,PartialEq,Serialize)]
pub struct Route{pub id:String,pub points:Vec<Point>,pub arrow:bool}
#[derive(Debug,Clone,PartialEq,Serialize)]
pub struct Scene{pub width:usize,pub height:usize,pub mode:String,pub nodes:Vec<Placement>,pub routes:Vec<Route>}
impl Scene{
    fn add(&mut self,n:&Node,r:Rect){self.nodes.push(Placement{node:n.clone(),rect:r});}
    fn route(&mut self,id:impl Into<String>,arrow:bool,points:Vec<Point>){
        let mut clean=points;clean.dedup();
        if clean.len()>1{self.routes.push(Route{id:id.into(),points:clean,arrow});}
    }
    fn slot(&self,slot:&str)->Option<Rect>{self.nodes.iter().find(|p|p.node.slot==slot).map(|p|p.rect)}
}
/// Theme-independent cell geometry. <96 columns or >3 workers uses a list,
/// never an invented sequential chain. Wires terminate outside card borders.
pub fn layout_topology(data:&Topology,width:usize)->Result<Scene>{
    if width==0 || width>500{return Err(invalid("topology width must be 1..500"));}
    check_topology(data)?;
    Ok(layout(data,width))
}
pub(crate) fn layout(data:&Topology,width:usize)->Scene{
    let mut s=Scene{width,height:1,mode:"graph".into(),nodes:vec![],routes:vec![]};
    let mut workers:Vec<_>=data.nodes.iter().filter(|n|!["main","router","architect","review"].contains(&n.slot.as_str())).collect();
    workers.sort_by_key(|n|&n.slot);
    if width<96||workers.len()>3{
        s.mode="list".into();
        for (i,n) in data.nodes.iter().enumerate(){s.add(n,Rect::new(0,i*9,width,8));}
        s.height=(data.nodes.len()*9).saturating_sub(1).max(1);return s;
    }
    let get=|slot:&str|data.nodes.iter().find(|n|n.slot==slot);
    let rail=get("architect").is_some()&&width>=140;
    let left=if rail{28}else{0};let gw=width-left;let cw=48.min(gw-4);let cx=left+gw/2;let mut y=0;
    for slot in ["main","router"]{if let Some(n)=get(slot){s.add(n,Rect::new(cx-cw/2,y,cw,8));y+=11;}}
    let worker_top=y;
    if !workers.is_empty(){
        let gap=4;let w=(gw-gap*(workers.len()-1))/workers.len();
        let base=if workers.len()==3{cx-(w+gap)-w/2}else{left+(gw-(workers.len()*w+(workers.len()-1)*gap)).div_ceil(2)};
        for (i,n) in workers.iter().enumerate(){s.add(n,Rect::new(base+i*(w+gap),y,w,8));}
        y+=11;
    }
    if let Some(n)=get("review"){s.add(n,Rect::new(cx-cw/2,y,cw,8));y+=8;}
    if let Some(n)=get("architect"){
        if rail{s.add(n,Rect::new(0,0,24,8));}
        else{y+=3;s.add(n,Rect::new(cx-cw/2,y,cw,8));y+=8;}
    }
    if let (Some(m),Some(r))=(s.slot("main"),s.slot("router")){
        s.route("main-router",true,vec![Point::new(m.center_x(),m.bottom()),Point::new(r.center_x(),r.y-1)]);
    }
    if let Some(r)=s.slot("router").filter(|_|!workers.is_empty()){
        let bus=worker_top-2;let stem=Point::new(r.center_x(),bus);
        s.route("router-fanout",false,vec![Point::new(r.center_x(),r.bottom()),stem]);
        for n in &workers{
            let w=s.nodes.iter().find(|p|p.node.id==n.id).unwrap().rect;
            s.route(format!("router-{}",n.id),true,vec![stem,Point::new(w.center_x(),bus),Point::new(w.center_x(),w.y-1)]);
        }
    }
    if let Some(v)=s.slot("review").filter(|_|!workers.is_empty()){
        let bus=v.y-2;let stem=Point::new(v.center_x(),bus);
        for n in &workers{
            let w=s.nodes.iter().find(|p|p.node.id==n.id).unwrap().rect;
            s.route(format!("{}-review",n.id),false,vec![Point::new(w.center_x(),w.bottom()),Point::new(w.center_x(),bus),stem]);
        }
        s.route("merge-review",true,vec![stem,Point::new(v.center_x(),v.y-1)]);
    }
    if rail{
        if let (Some(a),Some(v))=(s.slot("architect"),s.slot("review")){
            s.route("architect-review",true,vec![Point::new(a.right(),a.center_y()),Point::new(left-2,a.center_y()),Point::new(left-2,v.center_y()),Point::new(v.x-1,v.center_y())]);
        }
    }
    s.height=y.max(1);s
}
pub(crate) fn draw(dst:&mut Canvas,data:&Topology,r:Rect,scroll:usize,o:&Options)->Result<()>{
    let scene=layout(data,r.width);
    let mut c=Canvas::new(r.width,scene.height,o.ascii)?;
    let mut masks:BTreeMap<Point,u8>=BTreeMap::new();let mut active=BTreeSet::new();let mut arrows=BTreeMap::new();
    for route in &scene.routes{
        let on=o.active_edges.contains(&route.id);
        for pair in route.points.windows(2){
            let (a,b)=(pair[0],pair[1]);let (dx,dy)=((b.x as i32-a.x as i32).signum(),(b.y as i32-a.y as i32).signum());
            if dx!=0&&dy!=0{return Err(invalid("nonorthogonal route"));}
            let (out,input)=match (dx,dy){(1,0)=>(2,8),(-1,0)=>(8,2),(0,1)=>(4,1),(0,-1)=>(1,4),_=>continue};
            let mut p=a;
            while p!=b{
                let q=Point::new((p.x as i32+dx) as usize,(p.y as i32+dy) as usize);
                *masks.entry(p).or_default()|=out;*masks.entry(q).or_default()|=input;
                if on{active.insert(p);active.insert(q);}p=q;
            }
        }
        if route.arrow&&route.points.len()>1{
            let a=route.points[route.points.len()-2];let b=*route.points.last().unwrap();
            let ch=if b.x>a.x{if o.ascii{">"}else{"▶"}}else if b.x<a.x{if o.ascii{"<"}else{"◀"}}else if b.y<a.y{if o.ascii{"^"}else{"▲"}}else if o.ascii{"v"}else{"▼"};
            arrows.insert(b,ch);
        }
    }
    for (p,m) in masks{
        let ch=if o.ascii{match m{1|4|5=>"|",2|8|10=>"-",_=>"+"}}else{match m{1|4|5=>"│",2|8|10=>"─",3=>"└",6=>"┌",12=>"┐",9=>"┘",7=>"├",11=>"┴",13=>"┤",14=>"┬",_=>"┼"}};
        c.text(p.x,p.y,1,arrows.get(&p).copied().unwrap_or(ch),if active.contains(&p){"accent"}else{"border-strong"},"");
    }
    for p in &scene.nodes{crate::render::draw_node(&mut c,&p.node,p.rect,o);}
    dst.blit(&c,r,scroll);Ok(())
}
