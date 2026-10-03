package sacratui

import "sort"

type Point struct {
	X int `json:"x"`
	Y int `json:"y"`
}
type Placement struct {
	Node Node `json:"node"`
	Rect
}
type Route struct {
	ID     string  `json:"id"`
	Points []Point `json:"points"`
	Arrow  bool    `json:"arrow"`
}
type Scene struct {
	Width  int         `json:"width"`
	Height int         `json:"height"`
	Mode   string      `json:"mode"`
	Nodes  []Placement `json:"nodes"`
	Routes []Route     `json:"routes"`
}

// LayoutTopology has no theme or animation dependency. Routes terminate outside
// node boxes; fan-out and fan-in share exactly one stem each.
func LayoutTopology(t Topology, width int) Scene {
	s := Scene{Width: width, Mode: "graph", Nodes: []Placement{}, Routes: []Route{}}
	by := map[string]Node{}
	workers := []Node{}
	for _, n := range t.Nodes {
		switch n.Slot {
		case "main", "router", "architect", "review":
			by[n.Slot] = n
		default:
			workers = append(workers, n)
		}
	}
	sort.SliceStable(workers, func(i, j int) bool { return workers[i].Slot < workers[j].Slot })
	if width < 96 || len(workers) > 3 {
		s.Mode = "list"
		y := 0
		for _, n := range t.Nodes {
			s.Nodes = append(s.Nodes, Placement{n, Rect{0, y, max(2, width), 8}})
			y += 9
		}
		s.Height = max(1, y-1)
		return s
	}
	left := 0
	_, hasArch := by["architect"]
	rail := hasArch && width >= 140
	if rail {
		left = 28
	}
	gw := width - left
	cw := min(48, gw-4)
	cx := left + gw/2
	boxes := map[string]Rect{}
	y := 0
	add := func(n Node, r Rect) { s.Nodes = append(s.Nodes, Placement{n, r}); boxes[n.ID] = r }
	route := func(id string, arrow bool, p ...Point) { s.Routes = append(s.Routes, Route{id, p, arrow}) }
	for _, slot := range []string{"main", "router"} {
		if n, ok := by[slot]; ok {
			add(n, Rect{cx - cw/2, y, cw, 8})
			y += 11
		}
	}
	workerTop := y
	if len(workers) > 0 {
		gap := 4
		w := (gw - gap*(len(workers)-1)) / len(workers)
		base := left + (gw-(len(workers)*w+(len(workers)-1)*gap)+1)/2
		if len(workers) == 3 {
			base = cx - (w + gap) - w/2
		}
		for i, n := range workers {
			add(n, Rect{base + i*(w+gap), y, w, 8})
		}
		y += 11
	}
	if n, ok := by["review"]; ok {
		add(n, Rect{cx - cw/2, y, cw, 8})
		y += 8
	}
	if n, ok := by["architect"]; ok {
		if rail {
			add(n, Rect{0, 0, 24, 8})
		} else {
			y += 3
			add(n, Rect{cx - cw/2, y, cw, 8})
			y += 8
		}
	}
	get := func(slot string) (Rect, bool) { n, ok := by[slot]; return boxes[n.ID], ok }
	center := func(r Rect) int { return r.X + r.W/2 }
	m, hm := get("main")
	r, hr := get("router")
	v, hv := get("review")
	if hm && hr {
		route("main-router", true, Point{center(m), m.Y + m.H}, Point{center(r), r.Y - 1})
	}
	if hr && len(workers) > 0 {
		bus := workerTop - 2
		stem := Point{center(r), bus}
		route("router-fanout", false, Point{center(r), r.Y + r.H}, stem)
		for _, n := range workers {
			w := boxes[n.ID]
			route("router-"+n.ID, true, stem, Point{center(w), bus}, Point{center(w), w.Y - 1})
		}
	}
	if hv && len(workers) > 0 {
		bus := v.Y - 2
		stem := Point{center(v), bus}
		for _, n := range workers {
			w := boxes[n.ID]
			route(n.ID+"-review", false, Point{center(w), w.Y + w.H}, Point{center(w), bus}, stem)
		}
		route("merge-review", true, stem, Point{center(v), v.Y - 1})
	}
	if rail && hv {
		a := boxes[by["architect"].ID]
		gutter := left - 2
		route("architect-review", true, Point{a.X + a.W, a.Y + a.H/2}, Point{gutter, a.Y + a.H/2}, Point{gutter, v.Y + v.H/2}, Point{v.X - 1, v.Y + v.H/2})
	}
	s.Height = max(1, y)
	return s
}
func drawTopology(dst *Canvas, t Topology, r Rect, scroll int, o Options) {
	s := LayoutTopology(t, r.W)
	s.Height = min(s.Height, MaxCells/max(1, r.W))
	c := NewCanvas(r.W, max(1, s.Height), o.ASCII)
	// Accumulate directional connections before drawing to preserve T/+ junctions.
	masks := map[Point]int{}
	active := map[Point]bool{}
	arrows := map[Point]string{}
	act := map[string]bool{}
	for _, id := range o.ActiveEdges {
		act[id] = true
	}
	for _, edge := range s.Routes {
		for i := 1; i < len(edge.Points); i++ {
			a, b := edge.Points[i-1], edge.Points[i]
			dx, dy := 0, 0
			if a.X != b.X {
				if a.X < b.X {
					dx = 1
				} else {
					dx = -1
				}
			} else if a.Y != b.Y {
				if a.Y < b.Y {
					dy = 1
				} else {
					dy = -1
				}
			} else {
				continue
			}
			// Layout only emits orthogonal lines.
			for p := a; p != b; {
				q := Point{p.X + dx, p.Y + dy}
				out, in := 2, 8
				if dx < 0 {
					out, in = 8, 2
				}
				if dy > 0 {
					out, in = 4, 1
				}
				if dy < 0 {
					out, in = 1, 4
				}
				masks[p] |= out
				masks[q] |= in
				if act[edge.ID] {
					active[p] = true
					active[q] = true
				}
				p = q
			}
		}
		if edge.Arrow && len(edge.Points) > 1 {
			a, b := edge.Points[len(edge.Points)-2], edge.Points[len(edge.Points)-1]
			ch := "▼"
			if b.X > a.X {
				ch = "▶"
			}
			if b.X < a.X {
				ch = "◀"
			}
			if b.Y < a.Y {
				ch = "▲"
			}
			if c.ASCII {
				ch = map[string]string{"▼": "v", "▶": ">", "◀": "<", "▲": "^"}[ch]
			}
			arrows[b] = ch
		}
	}
	symbols := map[int]string{1: "│", 2: "─", 4: "│", 8: "─", 5: "│", 10: "─", 3: "└", 6: "┌", 12: "┐", 9: "┘", 7: "├", 11: "┴", 13: "┤", 14: "┬", 15: "┼"}
	for p, mask := range masks {
		ch := symbols[mask]
		if ch == "" {
			ch = "+"
		}
		if c.ASCII {
			ch = "+"
			if mask == 5 || mask == 1 || mask == 4 {
				ch = "|"
			}
			if mask == 10 || mask == 2 || mask == 8 {
				ch = "-"
			}
		}
		if arrow, ok := arrows[p]; ok {
			ch = arrow
		}
		color := "border-strong"
		if active[p] {
			color = "accent"
		}
		c.Text(p.X, p.Y, 1, ch, color, "")
	}
	for _, n := range s.Nodes {
		drawNode(c, n.Node, n.Rect, o)
	}
	dst.Blit(c, r, scroll)
}
