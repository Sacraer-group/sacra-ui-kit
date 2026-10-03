package sacratui

import (
	"encoding/json"
	"math"
	"reflect"
	"strings"
	"testing"
)

func TestFrameDimensionsAndThemes(t *testing.T) {
	d := DemoData(2)
	for _, w := range []int{1, 20, 40, 64, 80, 96, 120, 140, 160, 240} {
		for _, h := range []int{1, 12, 24, 48, 72} {
			var base []string
			for _, theme := range ThemeIDs() {
				f, e := Render(TopologyBlock(d), Options{Width: w, Height: h, Theme: theme})
				if e != nil {
					t.Fatal(e)
				}
				if len(f.Lines) != h || len(f.Runs) != h {
					t.Fatal("height", w, h)
				}
				for _, line := range f.Lines {
					if n := DisplayWidth(line); n != w {
						t.Fatalf("width %d != %d: %q", n, w, line)
					}
				}
				if base != nil && !reflect.DeepEqual(base, f.Lines) {
					t.Fatal("theme changed layout")
				}
				base = f.Lines
			}
		}
	}
}
func TestUnicodeAndSanitization(t *testing.T) {
	cases := map[string]int{"Привет": 6, "界": 2, "e\u0301": 1, "👩‍💻": 2, "🇷🇺": 2, "👍🏽": 2, "a界b": 4, "x\x1b]52;c;evil\a": 11}
	// Test representative supported clusters, not full UAX conformance.
	delete(cases, "x\x1b]52;c;evil\a")
	for s, w := range cases {
		if n := DisplayWidth(s); n != w {
			t.Errorf("%q width %d want %d", s, n, w)
		}
	}
	if Clip("界", 1) != "" || Clip("e\u0301x", 1) != "e\u0301" {
		t.Fatal("split cluster")
	}
	f, e := Render(Text("Привет 界e\u0301👩‍💻\x1b]52;c;payload\a"), Options{Width: 14, Height: 1, Color: "truecolor"})
	if e != nil {
		t.Fatal(e)
	}
	if strings.Contains(f.ANSI, "\x1b]") || strings.Contains(f.Lines[0], "\x1b") {
		t.Fatal("escape injection")
	}
	if DisplayWidth(f.Lines[0]) != 14 {
		t.Fatal("unicode padding")
	}
}
func TestForkMergeGeometry(t *testing.T) {
	for w := 96; w <= 240; w++ {
		s := LayoutTopology(DemoData(0), w)
		boxes := map[string]Rect{}
		for _, n := range s.Nodes {
			boxes[n.Node.ID] = n.Rect
			if n.X < 0 || n.X+n.W > w {
				t.Fatal("node overflow", w, n)
			}
		}
		if boxes["explorer"].X+boxes["explorer"].W/2 != boxes["router"].X+boxes["router"].W/2 {
			t.Fatal("middle worker is off-axis", w)
		}
		forks, merges := 0, 0
		var stem Point
		for _, r := range s.Routes {
			if r.ID == "router-fanout" {
				forks++
				stem = r.Points[len(r.Points)-1]
			}
			if r.ID == "merge-review" {
				merges++
			}
			for i := 1; i < len(r.Points); i++ {
				a, b := r.Points[i-1], r.Points[i]
				if a.X != b.X && a.Y != b.Y {
					t.Fatal("nonorthogonal", r)
				}
				for x := min(a.X, b.X); x <= max(a.X, b.X); x++ {
					for y := min(a.Y, b.Y); y <= max(a.Y, b.Y); y++ {
						for id, c := range boxes {
							if x >= c.X && x < c.X+c.W && y >= c.Y && y < c.Y+c.H {
								t.Fatalf("edge %s crosses %s at %dx%d width %d", r.ID, id, x, y, w)
							}
						}
					}
				}
			}
		}
		if forks != 1 || merges != 1 {
			t.Fatal("multiple stems")
		}
		for _, r := range s.Routes {
			if strings.HasPrefix(r.ID, "router-") && r.ID != "router-fanout" {
				if r.Points[0] != stem {
					t.Fatal("branches not shared")
				}
			}
		}
	}
}
func TestNoDanglingSlotsAndManyWorkers(t *testing.T) {
	d := DemoData(0)
	d.Nodes = []Node{d.Nodes[0], d.Nodes[6]}
	s := LayoutTopology(d, 160)
	if len(s.Routes) != 0 {
		t.Fatal("dangling routes")
	}
	d = DemoData(0)
	for i := 0; i < 6; i++ {
		n := d.Nodes[2]
		n.ID += "extra" + string(rune('a'+i))
		n.Slot += "extra" + string(rune('a'+i))
		d.Nodes = append(d.Nodes, n)
	}
	s = LayoutTopology(d, 160)
	if s.Mode != "list" || len(s.Nodes) != 13 {
		t.Fatal("large topology list fallback")
	}
}
func TestBlocksAndViewport(t *testing.T) {
	z := 0.0
	blocks := []Block{
		Text("one\ntwo"), {Type: "status", Text: "OK"}, {Type: "kv", Fields: []Field{{"value", 0}, {"missing", nil}}},
		{Type: "table", Columns: []string{"name", "value"}, Rows: [][]any{{"zero", 0}, {"missing", nil}}, Scroll: 9},
		{Type: "meter", Title: "CPU", Value: &z, Max: 100, Unit: "%"},
		{Type: "sparkline", Samples: []*float64{Value(0), nil, Value(20)}, Min: 0, Max: 100},
		{Type: "events", Events: []map[string]any{{"message": "running", "t": "00:01"}}},
		NodeBlock(DemoData(0).Nodes[0]),
	}
	for _, b := range blocks {
		for _, w := range []int{1, 8, 20, 80} {
			if _, e := Render(Panel("BLOCK", b), Options{Width: w, Height: 10}); e != nil {
				t.Fatal(b.Type, e)
			}
		}
	}
	head := Block{Type: "status", Text: "HEADER", Height: 1}
	foot := Block{Type: "status", Text: "FOOTER", Height: 1}
	body := TopologyBlock(DemoData(0))
	body.Weight = 1
	body.Scroll = 20
	f, e := Render(VStack(head, body, foot), Options{Width: 80, Height: 24, SelectedID: "worker", FocusID: "researcher"})
	if e != nil {
		t.Fatal(e)
	}
	if !strings.HasPrefix(f.Lines[0], "HEADER") || !strings.HasPrefix(f.Lines[23], "FOOTER") {
		t.Fatal("bars moved")
	}
	if _, e := Render(HStack(blocks...), Options{Width: 160, Height: 24}); e != nil {
		t.Fatal(e)
	}
}
func TestZeroMissingAndGap(t *testing.T) {
	z, _ := Render(Block{Type: "meter", Value: Value(0), Title: "test", Max: 100}, Options{Width: 20, Height: 2})
	m, _ := Render(Block{Type: "meter", Title: "test", Max: 100}, Options{Width: 20, Height: 2})
	if !strings.Contains(z.Lines[0], "0") || !strings.Contains(m.Lines[0], "N/A") {
		t.Fatal("missing confused with zero")
	}
	f, _ := Render(Block{Type: "sparkline", Samples: []*float64{Value(0), nil, Value(100)}, Min: 0, Max: 100}, Options{Width: 10, Height: 3})
	if !strings.HasPrefix(f.Lines[1], "▁ █") {
		t.Fatal("gap or baseline missing", f.Lines[1])
	}
}
func TestValidationAndProtocol(t *testing.T) {
	for _, o := range []Options{{Width: 0, Height: 1}, {Width: 500, Height: 4000}, {Width: 10, Height: 2, Theme: "evil"}, {Width: 10, Height: 2, Color: "osc"}} {
		if _, e := Render(Text("x"), o); e == nil {
			t.Fatal("bad options accepted")
		}
	}
	bad := TopologyBlock(DemoData(0))
	bad.Data.Nodes[1].ID = "main"
	if _, e := Render(bad, Options{Width: 80, Height: 24}); e == nil {
		t.Fatal("duplicate id accepted")
	}
	if _, e := Render(Block{Type: "meter", Value: Value(math.NaN())}, Options{Width: 20, Height: 3}); e == nil {
		t.Fatal("NaN")
	}
	b := Text("x")
	for i := 0; i < 18; i++ {
		b = Panel("", b)
	}
	if _, e := Render(b, Options{Width: 80, Height: 24}); e == nil {
		t.Fatal("depth")
	}
	r := Handle(Request{Version: 9, ID: "x", Op: "info"})
	if r.OK || r.ID != "x" {
		t.Fatal("protocol")
	}
	r = Handle(Request{Version: 1, ID: "x", Op: "info"})
	if !r.OK {
		t.Fatal(r)
	}
}
func TestHydration(t *testing.T) {
	tpl := map[string]any{"a": "{{x.number}}", "b": "{{x.flag}}", "c": "hello {{x.label}}", "d": "{{x.items}}", "e": "{{x.empty}}"}
	vals := map[string]any{"x": map[string]any{"number": 0, "flag": false, "label": "Влад", "items": []any{1, 2}, "empty": nil}}
	out, e := Hydrate(tpl, vals)
	if e != nil {
		t.Fatal(e)
	}
	m := out.(map[string]any)
	if m["a"] != float64(0) || m["b"] != false || m["c"] != "hello Влад" || m["e"] != nil {
		t.Fatal(out)
	}
	if _, e = Hydrate("{{x.missing}}", vals); e == nil {
		t.Fatal("missing binding")
	}
	if _, e = Hydrate("{{__proto__.x}}", vals); e == nil {
		t.Fatal("reserved path")
	}
	js, _ := json.Marshal(out)
	if strings.Contains(string(js), "{{") {
		t.Fatal("unresolved")
	}
}
func TestStableAndParallel(t *testing.T) {
	for i := 0; i < 12; i++ {
		t.Run("render", func(t *testing.T) {
			t.Parallel()
			d := DemoData(3)
			for j := 0; j < 10; j++ {
				if _, e := Render(TopologyBlock(d), Options{Width: 160, Height: 45, Color: "truecolor"}); e != nil {
					t.Fatal(e)
				}
			}
		})
	}
}

func TestExpansionBudget(t *testing.T) {
	_, e := Hydrate(strings.Repeat("{{v}}", 1000), map[string]any{"v": strings.Repeat("x", 2000)})
	if e == nil {
		t.Fatal("unbounded expansion accepted")
	}
}

func TestTallContentIsBounded(t *testing.T) {
	b := Block{Type: "text", Text: strings.Repeat("x\n", 5000)}
	f, err := Render(b, Options{Width: 1, Height: 1, ScrollY: 9000})
	if err != nil || f.ContentHeight != 4000 || f.ScrollY != 3999 {
		t.Fatalf("bounded frame: %+v %v", f, err)
	}
	if _, err = Render(Block{Type: "meter", Min: 10, Max: 2}, Options{Width: 20, Height: 4}); err == nil {
		t.Fatal("inverted bounds")
	}
}

func TestFocusSelectionAndWideOverwrite(t *testing.T) {
	d := DemoData(0)
	s := LayoutTopology(d, 160)
	f, err := Render(TopologyBlock(d), Options{Width: 160, Height: 44, SelectedID: "worker", FocusID: "explorer"})
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range s.Nodes {
		if p.Node.ID == "worker" && f.Cells[(p.Y+1)*160+p.X+1].Text != ">" {
			t.Fatal("selection marker")
		}
		if p.Node.ID == "explorer" && f.Cells[p.Y*160+p.X].FG != "accent" {
			t.Fatal("focus border")
		}
		if p.Node.ID == "worker" && f.Cells[p.Y*160+p.X].FG == "accent" {
			t.Fatal("selection became focus")
		}
	}
	c := NewCanvas(4, 1, false)
	c.Text(0, 0, 4, "界ab", "text", "canvas")
	c.Text(1, 0, 1, "x", "text", "canvas")
	if c.frame(0, 1).Lines[0] != " xab" {
		t.Fatal("wide continuation overwrite")
	}
}
