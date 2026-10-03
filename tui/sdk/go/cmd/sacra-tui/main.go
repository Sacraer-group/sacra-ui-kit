// sacra-tui is a native terminal demo and a persistent JSONL render worker.
package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	tui "github.com/Sacraer-group/sacra-ui-kit/tui/sdk/go"
)

func main() {
	if e := run(); e != nil {
		fmt.Fprintln(os.Stderr, "sacra-tui:", e)
		os.Exit(1)
	}
}
func run() error {
	stdio := flag.Bool("stdio", false, "persistent JSONL worker (no terminal control)")
	demo := flag.Bool("demo", false, "synthetic terminal animation; Ctrl-C exits")
	snapshot := flag.Bool("snapshot", false, "one demo frame to stdout, safe for pipes")
	ver := flag.Bool("version", false, "print SDK and protocol versions")
	w := flag.Int("width", 0, "columns; 0 detects terminal or uses 80")
	h := flag.Int("height", 0, "rows; 0 detects terminal or uses 32")
	frames := flag.Int("frames", 0, "demo frame limit; 0 runs until Ctrl-C")
	fps := flag.Int("fps", 4, "demo updates per second (1..30)")
	theme := flag.String("theme", "sacra", "semantic palette ID")
	ascii := flag.Bool("ascii", false, "ASCII frame glyphs; labels remain Unicode")
	color := flag.String("color", "none", "none, ansi16 or truecolor")
	flag.Parse()
	if *ver {
		fmt.Printf("SACRA TUI SDK %s / protocol %d\n", tui.Version, tui.ProtocolVersion)
		return nil
	}
	if *stdio {
		if *demo || *snapshot {
			return errors.New("--stdio cannot combine with --demo/--snapshot")
		}
		return serve(os.Stdin, os.Stdout)
	}
	if !*demo && !*snapshot {
		return errors.New("use --stdio, --demo or --snapshot")
	}
	if *fps < 1 || *fps > 30 || *frames < 0 {
		return errors.New("fps must be 1..30; frames must be nonnegative")
	}
	getOptions := func() tui.Options {
		cols, rows := dimensions()
		if cols < 1 {
			cols = 80
		}
		if rows < 1 {
			rows = 32
		}
		if *w != 0 {
			cols = *w
		}
		if *h != 0 {
			rows = *h
		}
		mode := *color
		if os.Getenv("NO_COLOR") != "" || os.Getenv("TERM") == "dumb" {
			mode = "none"
		}
		return tui.Options{Width: cols, Height: rows, Theme: *theme, Color: mode, ASCII: *ascii}
	}
	draw := func(phase int) (string, error) {
		o := getOptions()
		o.ActiveEdges = tui.DemoEdges(phase)
		body := tui.TopologyBlock(tui.DemoData(phase))
		body.Weight = 1
		header := tui.Block{Type: "status", Text: "SACRA / TUI SDK · SYNTHETIC DEMO", Height: 1, Role: "accent"}
		footer := tui.Block{Type: "status", Text: fmt.Sprintf("phase %d/8 · Ctrl-C exit · no provider connected", phase%8+1), Height: 1}
		f, e := tui.Render(tui.VStack(header, body, footer), o)
		if e != nil {
			return "", e
		}
		if f.ANSI != "" {
			return f.ANSI, nil
		}
		return strings.Join(f.Lines, "\n"), nil
	}
	if *snapshot {
		s, e := draw(0)
		if e != nil {
			return e
		}
		_, e = fmt.Fprintln(os.Stdout, s)
		return e
	}
	stat, e := os.Stdout.Stat()
	if e != nil {
		return e
	}
	if stat.Mode()&os.ModeCharDevice == 0 {
		return errors.New("--demo needs a terminal; use --snapshot for redirected output")
	}
	// Validate before entering alternate screen, and always restore on signal/error.
	if _, e = draw(0); e != nil {
		return e
	}
	_, e = fmt.Fprint(os.Stdout, "\x1b[?1049h\x1b[?25l")
	if e != nil {
		return e
	}
	defer fmt.Fprint(os.Stdout, "\x1b[0m\x1b[?25h\x1b[?1049l")
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(stop)
	tick := time.NewTicker(time.Second / time.Duration(*fps))
	defer tick.Stop()
	for phase := 0; *frames == 0 || phase < *frames; phase++ {
		s, e := draw(phase)
		if e != nil {
			return e
		}
		if _, e = fmt.Fprint(os.Stdout, "\x1b[H", s); e != nil {
			return e
		}
		select {
		case <-stop:
			return nil
		case <-tick.C:
		}
	}
	return nil
}
func serve(in io.Reader, out io.Writer) error {
	scanner := bufio.NewScanner(in)
	scanner.Buffer(make([]byte, 4096), tui.MaxInputBytes+1)
	enc := json.NewEncoder(out)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		var req tui.Request
		var res tui.Response
		if len(line) > tui.MaxInputBytes {
			return errors.New("request exceeds 1 MiB")
		}
		if e := json.Unmarshal(line, &req); e != nil {
			res = tui.Response{Version: 1, ID: req.ID, OK: false, Error: "invalid request JSON"}
		} else {
			res = tui.Handle(req)
		}
		if e := enc.Encode(res); e != nil {
			return e
		}
	}
	return scanner.Err()
}
