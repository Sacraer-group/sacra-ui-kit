package sacratui

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

func natural(b Block, w int) int {
	if b.Height > 0 {
		return b.Height
	}
	switch b.Type {
	case "text":
		return max(1, len(strings.Split(b.Text, "\n")))
	case "status":
		return 1
	case "events":
		return max(1, len(b.Events))
	case "kv":
		return max(1, len(b.Fields))
	case "table":
		return len(b.Rows) + 2
	case "meter":
		return 2
	case "sparkline":
		return 3
	case "node":
		return 8
	case "topology":
		if b.Data != nil {
			return LayoutTopology(*b.Data, w).Height
		}
		return 1
	case "panel":
		if len(b.Children) > 0 {
			return natural(b.Children[0], max(1, w-2)) + 2
		}
	case "column":
		n := max(0, len(b.Children)-1) * b.Gap
		for _, ch := range b.Children {
			n += natural(ch, w)
		}
		return max(1, n)
	case "row":
		n := 1
		for _, ch := range b.Children {
			n = max(n, natural(ch, max(1, w/max(1, len(b.Children)))))
		}
		return n
	}
	return 1
}

// Render is pure: caller-owned selection/focus/scroll survive across renders.
func Render(b Block, o Options) (Frame, error) {
	if o.Width < 1 || o.Width > 500 || o.Height < 1 || o.Height > 4000 || o.Width*o.Height > MaxCells {
		return Frame{}, errors.New("frame must be 1..500 columns, 1..4000 rows, at most 200000 cells")
	}
	if o.ScrollY < 0 || o.ScrollY > 1000000 {
		return Frame{}, errors.New("invalid scrollY")
	}
	switch o.Color {
	case "", "none", "truecolor", "ansi16":
	default:
		return Frame{}, errors.New("color must be none, ansi16 or truecolor")
	}
	if o.Theme == "" {
		o.Theme = "sacra"
	}
	if _, ok := palettes[o.Theme]; !ok {
		return Frame{}, errors.New("unknown theme")
	}
	count := 0
	if e := validate(b, 0, &count); e != nil {
		return Frame{}, e
	}
	h := natural(b, o.Width)
	// Flexible root stacks are viewports: header/footer stay fixed while the
	// topology/table's own Scroll moves only the corresponding content block.
	if b.Type == "column" {
		for _, ch := range b.Children {
			if ch.Weight > 0 {
				h = o.Height
				break
			}
		}
	}
	h = max(o.Height, min(h, 4000, MaxCells/o.Width))
	c := NewCanvas(o.Width, h, o.ASCII)
	paint(c, b, Rect{0, 0, o.Width, h}, o)
	f := c.frame(o.ScrollY, o.Height)
	if o.Color != "" && o.Color != "none" {
		f.ANSI = f.ToANSI(o.Theme, o.Color)
	}
	return f, nil
}
func paint(c *Canvas, b Block, r Rect, o Options) {
	if r.W <= 0 || r.H <= 0 {
		return
	}
	c.region(b.ID, b.Type, r)
	fg := b.Role
	if fg == "" {
		fg = "text"
	}
	switch b.Type {
	case "text", "status":
		if b.Type == "status" {
			c.Fill(r, "raised")
		}
		lines := strings.Split(b.Text, "\n")
		offset := clamp(b.Scroll, 0, max(0, len(lines)-r.H))
		for y := 0; y < r.H && offset+y < len(lines); y++ {
			bg := "canvas"
			if b.Type == "status" {
				bg = "raised"
			}
			c.Text(r.X, r.Y+y, r.W, lines[offset+y], fg, bg)
		}
	case "panel":
		c.Box(r, b.Title, "border-strong")
		if len(b.Children) > 0 {
			paint(c, b.Children[0], Rect{r.X + 1, r.Y + 1, r.W - 2, r.H - 2}, o)
		}
	case "row", "column":
		n := len(b.Children)
		if n == 0 {
			return
		}
		gap := b.Gap
		total := r.H
		if b.Type == "row" {
			total = r.W
		}
		total = max(0, total-gap*(n-1))
		fixed, weights := 0, 0
		sizes := make([]int, n)
		for i, ch := range b.Children {
			if b.Type == "row" {
				weights += max(1, ch.Weight)
			} else if ch.Weight > 0 {
				weights += ch.Weight
			} else {
				sizes[i] = natural(ch, r.W)
				fixed += sizes[i]
			}
		}
		remaining := max(0, total-fixed)
		pos := 0
		remainingWeight := weights
		for i, ch := range b.Children {
			wt := ch.Weight
			if b.Type == "row" {
				wt = max(1, wt)
			}
			if wt > 0 {
				sizes[i] = remaining * wt / max(1, remainingWeight)
				remaining -= sizes[i]
				remainingWeight -= wt
			}
			size := max(0, min(sizes[i], total+gap*(n-1)-pos))
			rr := r
			if b.Type == "row" {
				rr.X += pos
				rr.W = size
			} else {
				rr.Y += pos
				rr.H = size
			}
			paint(c, ch, rr, o)
			pos += size + gap
		}
	case "events":
		offset := clamp(b.Scroll, 0, max(0, len(b.Events)-r.H))
		for y := 0; y < r.H && offset+y < len(b.Events); y++ {
			ev := b.Events[offset+y]
			c.Text(r.X, r.Y+y, r.W, nodeDetails(ev), fg, "")
		}
	case "kv":
		offset := clamp(b.Scroll, 0, max(0, len(b.Fields)-r.H))
		labelW := min(20, max(1, r.W/3))
		for y := 0; y < r.H && offset+y < len(b.Fields); y++ {
			f := b.Fields[offset+y]
			c.Text(r.X, r.Y+y, labelW, f.Label, "muted", "")
			c.Text(r.X+labelW+1, r.Y+y, r.W-labelW-1, display(f.Value), fg, "")
		}
	case "table":
		colW := max(1, r.W/max(1, len(b.Columns)))
		for i, h := range b.Columns {
			if i*colW >= r.W {
				break
			}
			c.Text(r.X+i*colW, r.Y, min(colW-1, r.W-i*colW), h, "muted", "")
		}
		if r.H > 1 {
			c.Text(r.X, r.Y+1, r.W, strings.Repeat("-", r.W), "border-strong", "")
		}
		offset := clamp(b.Scroll, 0, max(0, len(b.Rows)-max(0, r.H-2)))
		for y := 2; y < r.H && offset+y-2 < len(b.Rows); y++ {
			index := offset + y - 2
			bg := "canvas"
			role := fg
			id := b.ID + "/" + strconv.Itoa(index)
			if id == o.SelectedID {
				bg = "raised"
			}
			if id == o.FocusID {
				role = "accent"
			}
			c.Fill(Rect{r.X, r.Y + y, r.W, 1}, bg)
			for i, v := range b.Rows[index] {
				if i >= len(b.Columns) {
					break
				}
				c.Text(r.X+i*colW, r.Y+y, min(colW-1, r.W-i*colW), display(v), role, bg)
			}
			if id == o.SelectedID {
				c.Text(r.X, r.Y+y, 1, ">", "accent", bg)
			}
		}
	case "meter":
		upper := b.Max
		if upper == b.Min {
			upper = b.Min + 100
		}
		value := "N/A"
		frac := 0.0
		if b.Value != nil {
			value = strconv.FormatFloat(*b.Value, 'f', -1, 64) + b.Unit
			frac = math.Max(0, math.Min(1, (*b.Value-b.Min)/(upper-b.Min)))
		}
		c.Text(r.X, r.Y, r.W, b.Title+"  "+value, fg, "")
		if r.H > 1 && r.W >= 2 {
			n := r.W - 2
			k := int(frac * float64(n))
			c.Text(r.X, r.Y+1, r.W, "["+strings.Repeat("=", k)+strings.Repeat(" ", n-k)+"]", "accent", "")
		}
	case "sparkline":
		c.Text(r.X, r.Y, r.W, b.Title+" / "+b.Unit, "muted", "")
		if r.H < 2 {
			return
		}
		lo, hi := b.Min, b.Max
		if hi <= lo {
			lo = 0
			hi = 1
			for _, s := range b.Samples {
				if s != nil {
					lo = math.Min(lo, *s)
					hi = math.Max(hi, *s)
				}
			}
		}
		chars := []rune("▁▂▃▄▅▆▇█")
		if c.ASCII {
			chars = []rune("._:-=+*#")
		}
		samples := b.Samples
		if len(samples) > r.W {
			samples = samples[len(samples)-r.W:]
		}
		for i, s := range samples {
			if s == nil {
				continue
			}
			v := int(math.Round((*s - lo) / (hi - lo) * 7))
			c.Text(r.X+i, r.Y+1, 1, string(chars[clamp(v, 0, 7)]), "accent", "")
		}
		if r.H > 2 {
			c.Text(r.X, r.Y+2, r.W, fmt.Sprintf("%g .. %g  · null = gap", lo, hi), "subtle", "")
		}
	case "node":
		if b.Node != nil {
			drawNode(c, *b.Node, r, o)
		}
	case "topology":
		if b.Data != nil {
			drawTopology(c, *b.Data, r, b.Scroll, o)
		}
	}
}
func nodeDetails(m map[string]any) string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	parts := []string{}
	for _, k := range keys {
		parts = append(parts, k+"="+display(m[k]))
	}
	return strings.Join(parts, " · ")
}
func drawNode(c *Canvas, n Node, r Rect, o Options) {
	bg := "canvas"
	if n.ID == o.SelectedID {
		bg = "raised"
	}
	c.Fill(r, bg)
	border := "border-strong"
	if n.ID == o.FocusID {
		border = "accent"
	}
	title := ""
	if n.ID == o.FocusID {
		title = "FOCUS"
	}
	c.Box(r, title, border)
	c.region(n.ID, "node", r)
	state := map[string]string{"running": "[RUN]", "done": "[OK]", "error": "[ERR]", "blocked": "[BLOCK]", "disabled": "[OFF]", "stale": "[STALE]", "queued": "[WAIT]", "idle": "[IDLE]", "": "[IDLE]"}[n.State]
	color := "muted"
	if n.State == "running" {
		color = "accent"
	}
	if n.State == "done" {
		color = "success"
	}
	if n.State == "error" {
		color = "danger"
	}
	lines := []string{n.Role, n.Task, strings.Join([]string{display(n.Model["provider"]), display(n.Model["name"]), display(n.Model["effort"])}, " / "), nodeDetails(n.Metrics), nodeDetails(n.Params)}
	for i, text := range lines {
		if i+1 >= r.H-1 {
			break
		}
		role := "text"
		if i == 1 || i >= 3 {
			role = "muted"
		}
		w := r.W - 4
		if i == 0 {
			w -= len(state) + 1
		}
		c.Text(r.X+2, r.Y+i+1, max(0, w), text, role, bg)
	}
	if r.H >= 3 && r.W >= len(state)+5 {
		c.Text(r.X+r.W-2-len(state), r.Y+1, len(state), state, color, bg)
	}
	if n.ID == o.SelectedID && r.H > 2 {
		c.Text(r.X+1, r.Y+1, 1, ">", "accent", bg)
	}
}

// Blit imports a cell surface into a host rectangle without spilling or emitting
// half a double-width glyph at either crop boundary.
func (c *Canvas) Blit(src *Canvas, r Rect, scroll int) {
	scroll = clamp(scroll, 0, max(0, src.Height-r.H))
	for y := 0; y < r.H && y+scroll < src.Height; y++ {
		for x := 0; x < min(r.W, src.Width); x++ {
			s := src.Cells[(y+scroll)*src.Width+x]
			if s.Width == 0 {
				continue
			}
			if x+s.Width > r.W {
				continue
			}
			c.put(r.X+x, r.Y+y, glyph{s.Text, s.Width}, s.FG, s.BG)
		}
	}
	for _, reg := range src.Regions {
		reg.X += r.X
		reg.Y += r.Y - scroll
		if reg.Y+reg.H > r.Y && reg.Y < r.Y+r.H {
			c.Regions = append(c.Regions, reg)
		}
	}
}
