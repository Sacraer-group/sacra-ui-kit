use crate::{invalid, Result, MAX_INPUT_BYTES};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};
pub type Metadata = BTreeMap<String, Value>;

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Node {
    pub id: String, pub slot: String, pub role: String, pub state: String, pub task: String,
    pub model: Metadata, pub params: Metadata, pub metrics: Metadata, pub extra: Metadata,
}
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Topology {
    pub session: Metadata, pub runtime: Metadata, pub nodes: Vec<Node>,
    pub events: Vec<Metadata>, pub extra: Metadata,
}
#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Field { pub label: String, pub value: Value }

/// Matches the language-neutral block object of JSONL protocol v1.
/// Unknown block types are errors; app-specific metadata belongs in node.extra.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct Block {
    #[serde(rename = "type")]
    pub kind: String,
    pub id: String, pub title: String, pub text: String, pub role: String,
    pub children: Vec<Block>, pub height: usize, pub weight: usize, pub gap: usize, pub scroll: usize,
    pub fields: Vec<Field>, pub columns: Vec<String>, pub rows: Vec<Vec<Value>>,
    pub value: Option<f64>, pub min: f64, pub max: f64, pub unit: String,
    pub samples: Vec<Option<f64>>, pub events: Vec<Metadata>,
    pub node: Option<Node>, pub data: Option<Topology>,
}
impl Default for Block {
    fn default() -> Self { Self { kind: String::new(), id: String::new(), title: String::new(), text: String::new(), role: String::new(), children: vec![], height: 0, weight: 0, gap: 0, scroll: 0, fields: vec![], columns: vec![], rows: vec![], value: None, min: 0.0, max: 0.0, unit: String::new(), samples: vec![], events: vec![], node: None, data: None } }
}
impl Block {
    pub fn new(kind: impl Into<String>) -> Self { Self { kind: kind.into(), ..Self::default() } }
    pub fn text(text: impl Into<String>) -> Self { Self { text: text.into(), ..Self::new("text") } }
    pub fn status(text: impl Into<String>) -> Self { Self { text: text.into(), height: 1, ..Self::new("status") } }
    pub fn panel(title: impl Into<String>, child: Block) -> Self { Self { title: title.into(), children: vec![child], ..Self::new("panel") } }
    pub fn row(children: Vec<Block>) -> Self { Self { children, gap: 2, ..Self::new("row") } }
    pub fn column(children: Vec<Block>) -> Self { Self { children, ..Self::new("column") } }
    pub fn node(node: Node) -> Self { Self { node: Some(node), ..Self::new("node") } }
    pub fn topology(data: Topology) -> Self { Self { data: Some(data), ..Self::new("topology") } }
    pub fn with_weight(mut self, weight: usize) -> Self { self.weight = weight; self }
    pub fn with_scroll(mut self, scroll: usize) -> Self { self.scroll = scroll; self }
    pub fn with_id(mut self, id: impl Into<String>) -> Self { self.id = id.into(); self }
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, rename_all = "camelCase")]
pub struct Options {
    pub width: usize, pub height: usize, pub theme: String, pub color: String,
    pub ascii: bool, pub scroll_y: usize, pub selected_id: String, pub focus_id: String,
    pub active_edges: Vec<String>,
}
impl Default for Options {
    fn default() -> Self { Self { width: 80, height: 24, theme: "sacra".into(), color: "none".into(), ascii: false, scroll_y: 0, selected_id: String::new(), focus_id: String::new(), active_edges: vec![] } }
}
impl Options {
    pub fn new(width: usize, height: usize) -> Self { Self { width, height, ..Self::default() } }
}
#[derive(Debug, Copy, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Rect { pub x: usize, pub y: usize, pub width: usize, pub height: usize }
impl Rect {
    pub fn new(x: usize, y: usize, width: usize, height: usize) -> Self { Self { x, y, width, height } }
    pub fn right(self) -> usize { self.x.saturating_add(self.width) }
    pub fn bottom(self) -> usize { self.y.saturating_add(self.height) }
    pub fn center_x(self) -> usize { self.x + self.width / 2 }
    pub fn center_y(self) -> usize { self.y + self.height / 2 }
    pub fn contains(self, x: usize, y: usize) -> bool { x >= self.x && x < self.right() && y >= self.y && y < self.bottom() }
    pub fn intersection(self, other: Self) -> Self {
        let x = self.x.max(other.x); let y = self.y.max(other.y);
        Self::new(x, y, self.right().min(other.right()).saturating_sub(x), self.bottom().min(other.bottom()).saturating_sub(y))
    }
}

pub(crate) fn display(v: &Value) -> String {
    match v { Value::Null => "—".into(), Value::String(s) => s.clone(), _ => v.to_string() }
}
pub(crate) fn details(m: &Metadata) -> String { m.iter().map(|(k,v)|format!("{k}={}",display(v))).collect::<Vec<_>>().join(" · ") }
pub(crate) fn check_node(n: &Node) -> Result<()> {
    if n.id.is_empty() || n.id.len() > 128 || n.slot.len() > 128 { return Err(invalid("node id must be 1..128 bytes; slot at most 128 bytes")); }
    if !["", "idle", "queued", "running", "done", "error", "blocked", "disabled", "stale"].contains(&n.state.as_str()) { return Err(invalid("unknown node state")); }
    Ok(())
}
pub(crate) fn check_topology(data: &Topology) -> Result<()> {
    if data.nodes.len() > 128 { return Err(invalid("at most 128 topology nodes")); }
    let mut ids = HashSet::new(); let mut slots = HashSet::new();
    for n in &data.nodes {
        check_node(n)?;
        if !ids.insert(&n.id) || (!n.slot.is_empty() && !slots.insert(&n.slot)) { return Err(invalid("duplicate node id or slot")); }
    }
    Ok(())
}
pub(crate) fn check_block(b: &Block, depth: usize, count: &mut usize) -> Result<()> {
    *count += 1;
    if depth > 16 || *count > 512 { return Err(invalid("block tree exceeds depth 16 or 512 blocks")); }
    if !crate::BLOCK_TYPES.contains(&b.kind.as_str()) { return Err(invalid(format!("unsupported block {}", b.kind))); }
    if b.id.len() > 128 || b.title.len() > 4096 || b.text.len() > 65536 || b.height > 4000 || b.weight > 1000 || b.gap > 8 || b.scroll > 1_000_000 { return Err(invalid("block sizes exceed limits")); }
    if !b.min.is_finite() || !b.max.is_finite() || b.value.is_some_and(|x|!x.is_finite()) || b.samples.iter().flatten().any(|x|!x.is_finite()) { return Err(invalid("non-finite value; use null for missing")); }
    if ["meter", "sparkline"].contains(&b.kind.as_str()) && b.max < b.min { return Err(invalid("max must not be less than min")); }
    if b.fields.len() > 10000 || b.samples.len() > 10000 || b.events.len() > 10000 || b.rows.len() > 10000 { return Err(invalid("too many rows or samples")); }
    match b.kind.as_str() {
        "panel" if b.children.len() != 1 => return Err(invalid("panel requires exactly one child")),
        "table" if b.columns.is_empty() || b.columns.len() > 32 => return Err(invalid("table requires 1..32 columns")),
        "node" => check_node(b.node.as_ref().ok_or_else(|| invalid("node block requires node"))?)?,
        "topology" => check_topology(b.data.as_ref().ok_or_else(|| invalid("topology block requires data"))?)?,
        _ => {},
    }
    for c in &b.children { check_block(c, depth + 1, count)?; }
    Ok(())
}
/// Bounded serializer used both for direct Rust inputs and placeholder output.
pub(crate) fn bounded_json<T: Serialize + ?Sized>(v: &T) -> Result<Vec<u8>> {
    struct Limited(Vec<u8>);
    impl std::io::Write for Limited {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            if self.0.len().saturating_add(buf.len()) > MAX_INPUT_BYTES { return Err(std::io::Error::other("payload exceeds 1 MiB")); }
            self.0.extend_from_slice(buf); Ok(buf.len())
        }
        fn flush(&mut self) -> std::io::Result<()> { Ok(()) }
    }
    let mut out = Limited(vec![]); serde_json::to_writer(&mut out, v)?; Ok(out.0)
}
