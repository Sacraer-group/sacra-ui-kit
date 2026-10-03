package sacratui

import (
	"strings"
	"unicode"
	"unicode/utf8"
)

// The conservative cell profile groups combining marks, variation selectors,
// emoji modifiers, ZWJ sequences and flag pairs. Ambiguous characters are one
// cell. It is not a full Unicode UAX #29 implementation: see docs/UNICODE.md.
// Width can differ for emoji / complex scripts in a particular terminal font.
type glyph struct {
	text  string
	width int
}

func SafeText(s string) string {
	return strings.Map(func(r rune) rune {
		if r == '\t' {
			return ' '
		}
		if r < 32 || (r >= 127 && r <= 159) || (r >= 0x202A && r <= 0x202E) || (r >= 0x2066 && r <= 0x2069) {
			return -1
		}
		if r == utf8.RuneError {
			return '?'
		}
		return r
	}, s)
}
func combining(r rune) bool {
	return unicode.Is(unicode.Mn, r) || unicode.Is(unicode.Me, r) || unicode.Is(unicode.Mc, r) || (r >= 0xFE00 && r <= 0xFE0F) || (r >= 0x1F3FB && r <= 0x1F3FF) || (r >= 0xE0020 && r <= 0xE007F)
}
func wide(r rune) bool {
	return r >= 0x1100 && (r <= 0x115F || r == 0x2329 || r == 0x232A || (r >= 0x2E80 && r <= 0xA4CF && r != 0x303F) || (r >= 0xAC00 && r <= 0xD7A3) || (r >= 0xF900 && r <= 0xFAFF) || (r >= 0xFE10 && r <= 0xFE19) || (r >= 0xFE30 && r <= 0xFE6F) || (r >= 0xFF00 && r <= 0xFF60) || (r >= 0xFFE0 && r <= 0xFFE6) || (r >= 0x1F1E6 && r <= 0x1FAFF) || (r >= 0x20000 && r <= 0x3FFFD))
}
func glyphs(text string) []glyph {
	rs := []rune(SafeText(text))
	out := make([]glyph, 0, len(rs))
	for i := 0; i < len(rs); {
		start := i
		r := rs[i]
		i++
		w := 1
		if wide(r) {
			w = 2
		}
		if r == 0x200D || unicode.Is(unicode.Cf, r) {
			continue
		}
		prefix := ""
		if combining(r) {
			prefix = "◌"
		}
		if r >= 0x1F1E6 && r <= 0x1F1FF && i < len(rs) && rs[i] >= 0x1F1E6 && rs[i] <= 0x1F1FF {
			i++
			w = 2
		}
		for i < len(rs) {
			if combining(rs[i]) {
				if rs[i] == 0xFE0F || rs[i] == 0x20E3 {
					w = 2
				}
				i++
				continue
			}
			if rs[i] == 0x200D && i+1 < len(rs) {
				w = max(w, 2)
				i += 2
				continue
			}
			break
		}
		out = append(out, glyph{prefix + string(rs[start:i]), w})
	}
	return out
}
func DisplayWidth(text string) int {
	n := 0
	for _, g := range glyphs(text) {
		n += g.width
	}
	return n
}

// Clip never writes half of a supported wide/combining cluster.
func Clip(text string, width int) string {
	var b strings.Builder
	n := 0
	for _, g := range glyphs(text) {
		if n+g.width > width {
			break
		}
		b.WriteString(g.text)
		n += g.width
	}
	return b.String()
}

type Canvas struct {
	Width, Height int
	Cells         []Cell
	Regions       []Region
	ASCII         bool
}

func NewCanvas(w, h int, ascii bool) *Canvas {
	if w < 1 || w > 500 || h < 1 || h > 4000 || w*h > MaxCells {
		panic("invalid canvas bounds")
	}
	c := &Canvas{Width: w, Height: h, ASCII: ascii, Cells: make([]Cell, w*h), Regions: []Region{}}
	for i := range c.Cells {
		c.Cells[i] = Cell{" ", 1, "text", "canvas"}
	}
	return c
}
func (c *Canvas) clearCell(x, y int) {
	if x < 0 || y < 0 || x >= c.Width || y >= c.Height {
		return
	}
	i := y*c.Width + x
	if c.Cells[i].Width == 0 && x > 0 {
		c.Cells[i-1] = Cell{" ", 1, "text", "canvas"}
	}
	if c.Cells[i].Width == 2 && x+1 < c.Width {
		c.Cells[i+1] = Cell{" ", 1, "text", "canvas"}
	}
	c.Cells[i] = Cell{" ", 1, "text", "canvas"}
}
func (c *Canvas) put(x, y int, g glyph, fg, bg string) {
	if y < 0 || y >= c.Height || x < 0 || x+g.width > c.Width {
		return
	}
	if fg == "" {
		fg = "text"
	}
	if bg == "" {
		bg = "canvas"
	}
	c.clearCell(x, y)
	if g.width == 2 {
		c.clearCell(x+1, y)
	}
	c.Cells[y*c.Width+x] = Cell{g.text, g.width, fg, bg}
	if g.width == 2 {
		c.Cells[y*c.Width+x+1] = Cell{"", 0, fg, bg}
	}
}

// Text writes a bounded line. fg/bg are semantic palette roles, never escape codes.
func (c *Canvas) Text(x, y, width int, text, fg, bg string) {
	end := min(x+width, c.Width)
	if end <= 0 {
		return
	}
	for _, g := range glyphs(text) {
		if x+g.width > end {
			break
		}
		c.put(x, y, g, fg, bg)
		x += g.width
	}
}
func (c *Canvas) Fill(r Rect, bg string) {
	for y := max(0, r.Y); y < min(c.Height, r.Y+r.H); y++ {
		for x := max(0, r.X); x < min(c.Width, r.X+r.W); x++ {
			c.put(x, y, glyph{" ", 1}, "text", bg)
		}
	}
}
func (c *Canvas) Box(r Rect, title, fg string) {
	if r.W < 2 || r.H < 2 {
		return
	}
	tl, tr, bl, br, h, v := "┌", "┐", "└", "┘", "─", "│"
	if c.ASCII {
		tl = "+"
		tr = "+"
		bl = "+"
		br = "+"
		h = "-"
		v = "|"
	}
	c.Text(r.X, r.Y, r.W, tl+strings.Repeat(h, r.W-2)+tr, fg, "")
	c.Text(r.X, r.Y+r.H-1, r.W, bl+strings.Repeat(h, r.W-2)+br, fg, "")
	for y := r.Y + 1; y < r.Y+r.H-1; y++ {
		c.Text(r.X, y, 1, v, fg, "")
		c.Text(r.X+r.W-1, y, 1, v, fg, "")
	}
	if title != "" && r.W > 5 {
		c.Text(r.X+2, r.Y, r.W-4, " "+title+" ", fg, "canvas")
	}
}
func (c *Canvas) region(id, kind string, r Rect) {
	if id != "" {
		c.Regions = append(c.Regions, Region{id, kind, r})
	}
}
func (c *Canvas) frame(offset, height int) Frame {
	offset = clamp(offset, 0, max(0, c.Height-height))
	f := Frame{Width: c.Width, Height: height, ContentHeight: c.Height, ScrollY: offset, Lines: make([]string, height), Runs: make([][]Run, height), Cells: make([]Cell, c.Width*height), Regions: []Region{}}
	for y := 0; y < height; y++ {
		var line strings.Builder
		runs := []Run{}
		for x := 0; x < c.Width; x++ {
			cell := Cell{" ", 1, "text", "canvas"}
			if y+offset < c.Height {
				cell = c.Cells[(y+offset)*c.Width+x]
			}
			f.Cells[y*c.Width+x] = cell
			if cell.Width == 0 {
				continue
			}
			line.WriteString(cell.Text)
			if len(runs) > 0 && runs[len(runs)-1].FG == cell.FG && runs[len(runs)-1].BG == cell.BG {
				runs[len(runs)-1].Text += cell.Text
			} else {
				runs = append(runs, Run{cell.Text, cell.FG, cell.BG})
			}
		}
		f.Lines[y] = line.String()
		f.Runs[y] = runs
	}
	for _, r := range c.Regions {
		r.Y -= offset
		if r.Y+r.H > 0 && r.Y < height {
			f.Regions = append(f.Regions, r)
		}
	}
	return f
}
