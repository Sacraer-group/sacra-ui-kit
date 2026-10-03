// Package sacratui renders composable SACRA blocks to terminal cells, never DOM.
// It does not read input, start timers, contact providers or change terminal modes.
package sacratui

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
)

const Version = "0.1.0"
const ProtocolVersion = 1
const MaxCells = 200000
const MaxInputBytes = 1048576

// Node is compatible with the browser topology 0.3.2 payload. Metadata stays typed.
type Node struct {
	ID      string         `json:"id"`
	Slot    string         `json:"slot"`
	Role    string         `json:"role"`
	Model   map[string]any `json:"model,omitempty"`
	State   string         `json:"state"`
	Task    string         `json:"task,omitempty"`
	Params  map[string]any `json:"params,omitempty"`
	Metrics map[string]any `json:"metrics,omitempty"`
	Extra   map[string]any `json:"extra,omitempty"`
}
type Topology struct {
	Session map[string]any   `json:"session"`
	Runtime map[string]any   `json:"runtime,omitempty"`
	Nodes   []Node           `json:"nodes"`
	Events  []map[string]any `json:"events,omitempty"`
	Extra   map[string]any   `json:"extra,omitempty"`
}
type Field struct {
	Label string `json:"label"`
	Value any    `json:"value"`
}

// Block is the language-neutral component tree. A leaf may be rendered alone.
// Sizes are integer terminal cells. Positive Weight in a column takes remaining space.
type Block struct {
	Events   []map[string]any `json:"events,omitempty"`
	Type     string           `json:"type"`
	ID       string           `json:"id,omitempty"`
	Title    string           `json:"title,omitempty"`
	Text     string           `json:"text,omitempty"`
	Role     string           `json:"role,omitempty"`
	Children []Block          `json:"children,omitempty"`
	Height   int              `json:"height,omitempty"`
	Weight   int              `json:"weight,omitempty"`
	Gap      int              `json:"gap,omitempty"`
	Scroll   int              `json:"scroll,omitempty"`
	Fields   []Field          `json:"fields,omitempty"`
	Columns  []string         `json:"columns,omitempty"`
	Rows     [][]any          `json:"rows,omitempty"`
	Value    *float64         `json:"value,omitempty"`
	Min      float64          `json:"min,omitempty"`
	Max      float64          `json:"max,omitempty"`
	Unit     string           `json:"unit,omitempty"`
	Samples  []*float64       `json:"samples,omitempty"`
	Node     *Node            `json:"node,omitempty"`
	Data     *Topology        `json:"data,omitempty"`
}
type Options struct {
	Width       int      `json:"width"`
	Height      int      `json:"height"`
	Theme       string   `json:"theme,omitempty"`
	Color       string   `json:"color,omitempty"` // none (default), ansi16, truecolor
	ASCII       bool     `json:"ascii,omitempty"` // frame glyphs; content remains Unicode
	ScrollY     int      `json:"scrollY,omitempty"`
	SelectedID  string   `json:"selectedId,omitempty"`
	FocusID     string   `json:"focusId,omitempty"`
	ActiveEdges []string `json:"activeEdges,omitempty"`
}
type Rect struct {
	X int `json:"x"`
	Y int `json:"y"`
	W int `json:"width"`
	H int `json:"height"`
}
type Region struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Rect
}
type Cell struct {
	Text  string `json:"text"`
	Width int    `json:"width"`
	FG    string `json:"fg"`
	BG    string `json:"bg"`
}
type Run struct {
	Text string `json:"text"`
	FG   string `json:"fg"`
	BG   string `json:"bg"`
}
type Frame struct {
	Width         int      `json:"width"`
	Height        int      `json:"height"`
	ContentHeight int      `json:"contentHeight"`
	ScrollY       int      `json:"scrollY"`
	Lines         []string `json:"lines"`
	Runs          [][]Run  `json:"runs"`
	Regions       []Region `json:"regions"`
	ANSI          string   `json:"ansi,omitempty"`
	Cells         []Cell   `json:"-"`
}
type Request struct {
	Version  int            `json:"version"`
	ID       string         `json:"id,omitempty"`
	Op       string         `json:"op"`
	Block    *Block         `json:"block,omitempty"`
	Options  Options        `json:"options,omitempty"`
	Template any            `json:"template,omitempty"`
	Bindings map[string]any `json:"bindings,omitempty"`
}
type Response struct {
	Version int    `json:"version"`
	ID      string `json:"id,omitempty"`
	OK      bool   `json:"ok"`
	Frame   *Frame `json:"frame,omitempty"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
}

func Value(v float64) *float64 { return &v }
func Text(text string) Block   { return Block{Type: "text", Text: text} }
func Panel(title string, child Block) Block {
	return Block{Type: "panel", Title: title, Children: []Block{child}}
}
func VStack(children ...Block) Block    { return Block{Type: "column", Children: children} }
func HStack(children ...Block) Block    { return Block{Type: "row", Children: children, Gap: 2} }
func NodeBlock(n Node) Block            { return Block{Type: "node", Node: &n, ID: n.ID} }
func TopologyBlock(data Topology) Block { return Block{Type: "topology", Data: &data} }
func clamp(v, lo, hi int) int           { return max(lo, min(hi, v)) }
func finite(v float64) bool             { return !math.IsNaN(v) && !math.IsInf(v, 0) }
func display(v any) string {
	if v == nil {
		return "—"
	}
	if s, ok := v.(string); ok {
		return s
	}
	b, err := json.Marshal(v)
	if err != nil {
		return "N/A"
	}
	return string(b)
}
func validNode(n Node) error {
	if n.ID == "" || len(n.ID) > 128 {
		return errors.New("node.id must be 1..128 bytes")
	}
	if len(n.Slot) > 128 {
		return errors.New("node.slot exceeds 128 bytes")
	}
	switch n.State {
	case "", "idle", "queued", "running", "done", "error", "blocked", "disabled", "stale":
	default:
		return fmt.Errorf("unknown node state %q", n.State)
	}
	return nil
}
func validate(b Block, depth int, count *int) error {
	*count++
	if depth > 16 || *count > 512 {
		return errors.New("block tree exceeds depth 16 or 512 blocks")
	}
	if len(b.Text) > 65536 || len(b.Title) > 4096 || len(b.ID) > 128 {
		return errors.New("block text/id is too large")
	}
	if b.Scroll < 0 || b.Scroll > 1000000 || b.Gap < 0 || b.Gap > 8 || b.Height < 0 || b.Height > 4000 || b.Weight < 0 || b.Weight > 1000 {
		return errors.New("invalid block size, weight, gap or scroll")
	}
	if !finite(b.Min) || !finite(b.Max) || (b.Value != nil && !finite(*b.Value)) {
		return errors.New("non-finite numeric value")
	}
	if (b.Type == "meter" || b.Type == "sparkline") && b.Max < b.Min {
		return errors.New("max must not be smaller than min")
	}
	switch b.Type {
	case "text", "status", "kv", "table", "meter", "sparkline", "events", "node", "topology", "panel", "row", "column":
	default:
		return fmt.Errorf("unsupported block type %q", b.Type)
	}
	if b.Type == "node" {
		if b.Node == nil {
			return errors.New("node block requires node")
		}
		if e := validNode(*b.Node); e != nil {
			return e
		}
	}
	if b.Type == "panel" && len(b.Children) != 1 {
		return errors.New("panel requires exactly one child")
	}
	if b.Type == "table" && (len(b.Columns) < 1 || len(b.Columns) > 32 || len(b.Rows) > 10000) {
		return errors.New("table requires 1..32 columns, at most 10000 rows")
	}
	if len(b.Fields) > 10000 || len(b.Samples) > 10000 || len(b.Events) > 10000 {
		return errors.New("too many fields or samples")
	}
	for _, s := range b.Samples {
		if s != nil && !finite(*s) {
			return errors.New("non-finite sample; use null for missing")
		}
	}
	if b.Type == "topology" {
		if b.Data == nil {
			return errors.New("topology block requires data")
		}
		if len(b.Data.Nodes) > 128 {
			return errors.New("at most 128 topology nodes")
		}
		ids, slots := map[string]bool{}, map[string]bool{}
		for _, n := range b.Data.Nodes {
			if err := validNode(n); err != nil {
				return err
			}
			if ids[n.ID] {
				return fmt.Errorf("duplicate node id %q", n.ID)
			}
			ids[n.ID] = true
			if n.Slot != "" && slots[n.Slot] {
				return fmt.Errorf("duplicate node slot %q", n.Slot)
			}
			slots[n.Slot] = true
		}
	}
	for _, c := range b.Children {
		if err := validate(c, depth+1, count); err != nil {
			return err
		}
	}
	return nil
}
func Handle(r Request) (out Response) {
	out.Version = ProtocolVersion
	out.ID = r.ID
	// Recovery is the protocol boundary only; library functions return errors normally.
	defer func() {
		if e := recover(); e != nil {
			out.OK = false
			out.Frame = nil
			out.Data = nil
			out.Error = "render failed"
		}
	}()
	if r.Version != ProtocolVersion {
		out.Error = "unsupported protocol version (expected 1)"
		return
	}
	switch r.Op {
	case "render":
		if r.Block == nil {
			out.Error = "render requires block"
			return
		}
		f, err := Render(*r.Block, r.Options)
		if err != nil {
			out.Error = err.Error()
			return
		}
		out.Frame = &f
	case "hydrate":
		v, err := Hydrate(r.Template, r.Bindings)
		if err != nil {
			out.Error = err.Error()
			return
		}
		out.Data = v
	case "info":
		out.Data = map[string]any{"sdkVersion": Version, "protocolVersion": ProtocolVersion, "themes": ThemeIDs(), "blocks": strings.Fields("text status kv table meter sparkline events node topology panel row column")}
	default:
		out.Error = "unsupported op (render, hydrate, info)"
		return
	}
	out.OK = true
	return
}
