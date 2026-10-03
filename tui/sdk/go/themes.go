package sacratui

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

//go:embed themes.json
var themeData []byte

type Theme struct {
	ID     string            `json:"id"`
	Name   string            `json:"name"`
	Colors map[string]string `json:"colors"`
}

var palettes = func() map[string]Theme {
	var ts []Theme
	if e := json.Unmarshal(themeData, &ts); e != nil {
		panic(e)
	}
	m := map[string]Theme{}
	for _, t := range ts {
		m[t.ID] = t
	}
	return m
}()

func ThemeIDs() []string {
	ids := []string{}
	for id := range palettes {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	return ids
}
func colorHex(t Theme, role, fallback string) string {
	v := t.Colors[role]
	if len(v) != 7 || v[0] != '#' {
		v = t.Colors[fallback]
	}
	return v
}
func rgb(s string) (int, int, int) {
	v, _ := strconv.ParseUint(strings.TrimPrefix(s, "#"), 16, 32)
	return int(v >> 16), int(v >> 8 & 255), int(v & 255)
}

var ansi16 = [16][3]int{{0, 0, 0}, {128, 0, 0}, {0, 128, 0}, {128, 128, 0}, {0, 0, 128}, {128, 0, 128}, {0, 128, 128}, {192, 192, 192}, {128, 128, 128}, {255, 0, 0}, {0, 255, 0}, {255, 255, 0}, {0, 0, 255}, {255, 0, 255}, {0, 255, 255}, {255, 255, 255}}

func sgr(color string, bg bool, mode string) string {
	r, g, b := rgb(color)
	if mode == "truecolor" {
		n := 38
		if bg {
			n = 48
		}
		return fmt.Sprintf("\x1b[%d;2;%d;%d;%dm", n, r, g, b)
	}
	best, score := 0, int(^uint(0)>>1)
	for i, c := range ansi16 {
		d := (r-c[0])*(r-c[0]) + (g-c[1])*(g-c[1]) + (b-c[2])*(b-c[2])
		if d < score {
			best, score = i, d
		}
	}
	n := 30 + best
	if best >= 8 {
		n = 90 + best - 8
	}
	if bg {
		n += 10
	}
	return fmt.Sprintf("\x1b[%dm", n)
}

// ToANSI emits SGR colors only, with reset at every line. No cursor movement,
// clear-screen, OSC, hyperlinks or terminal mode changes are emitted here.
func (f Frame) ToANSI(theme, mode string) string {
	if mode == "none" || mode == "" {
		return strings.Join(f.Lines, "\n")
	}
	if mode != "truecolor" && mode != "ansi16" {
		return strings.Join(f.Lines, "\n")
	}
	t, ok := palettes[theme]
	if !ok {
		t = palettes["sacra"]
	}
	var b strings.Builder
	for y, runs := range f.Runs {
		if y > 0 {
			b.WriteByte('\n')
		}
		for _, r := range runs {
			b.WriteString(sgr(colorHex(t, r.FG, "text"), false, mode))
			b.WriteString(sgr(colorHex(t, r.BG, "canvas"), true, mode))
			b.WriteString(SafeText(r.Text))
		}
		b.WriteString("\x1b[0m")
	}
	return b.String()
}
