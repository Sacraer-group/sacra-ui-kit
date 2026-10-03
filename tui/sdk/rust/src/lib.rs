//! Native, composable SACRA terminal blocks. No subprocess, browser or Go runtime.
//! The caller owns input, time, IO, focus and terminal modes. Rendering is pure.
//!
//! ```
//! use sacra_tui::{Block, Options, render};
//! let view = Block::panel("AGENT", Block::text("provider / my-model"));
//! let frame = render(&view, &Options::new(60, 8))?;
//! assert_eq!(frame.lines.len(), 8);
//! # Ok::<(), sacra_tui::Error>(())
//! ```
#![forbid(unsafe_code)]
mod canvas;
mod hydrate;
mod model;
mod render;
mod theme;
mod topology;
pub mod protocol;
#[cfg(feature = "ratatui")]
pub mod ratatui_widget;

pub use canvas::{clip_text, display_width, safe_text, Canvas, Cell, Frame, Region, Run};
pub use hydrate::hydrate;
pub use model::*;
pub use render::render;
pub use theme::{theme, theme_ids, Theme};
pub use topology::{layout_topology, Placement, Point, Route, Scene};
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const MAX_CELLS: usize = 200_000;
pub const MAX_INPUT_BYTES: usize = 1_048_576;
pub const BLOCK_TYPES: [&str; 12] = ["text", "status", "panel", "row", "column", "kv", "table", "meter", "sparkline", "events", "node", "topology"];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Error(pub String);
impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { f.write_str(&self.0) }
}
impl std::error::Error for Error {}
impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self { Self(e.to_string()) }
}
pub type Result<T> = std::result::Result<T, Error>;
pub(crate) fn invalid(s: impl Into<String>) -> Error { Error(s.into()) }
