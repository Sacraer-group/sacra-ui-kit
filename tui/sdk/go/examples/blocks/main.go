package main

import (
	"fmt"
	tui "github.com/Sacraer-group/sacra-ui-kit/tui/sdk/go"
	"strings"
)

func main() {
	mainNode := tui.DemoData(0).Nodes[0]
	tree := tui.HStack(
		tui.Panel("AGENT", tui.NodeBlock(mainNode)),
		tui.Panel("METRICS", tui.VStack(
			tui.Block{Type: "meter", Title: "context", Value: tui.Value(25), Max: 100, Unit: "%"},
			tui.Block{Type: "kv", Fields: []tui.Field{{Label: "model", Value: mainNode.Model["name"]}, {Label: "requests", Value: 0}, {Label: "latency", Value: nil}}},
		)),
	)
	frame, err := tui.Render(tree, tui.Options{Width: 100, Height: 12, SelectedID: mainNode.ID})
	if err != nil {
		panic(err)
	}
	// In a host TUI return this string from its view, or consume frame.Runs.
	fmt.Println(strings.Join(frame.Lines, "\n"))
}
