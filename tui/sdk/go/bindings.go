package sacratui

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var placeholder = regexp.MustCompile(`\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}`)

// Hydrate recursively resolves placeholders without evaluation or shell/template
// execution. An exact placeholder retains number/bool/object/null types.
// Unknown paths are errors, never silently coerced to zero or empty strings.
func Hydrate(template any, values map[string]any) (any, error) {
	raw, e := json.Marshal(template)
	if e != nil {
		return nil, e
	}
	if len(raw) > MaxInputBytes {
		return nil, errors.New("template too large")
	}
	budget := MaxInputBytes - len(raw)
	lookup := func(path string) (any, error) {
		var v any = values
		for _, k := range strings.Split(path, ".") {
			if k == "__proto__" || k == "constructor" || k == "prototype" {
				return nil, errors.New("reserved binding path")
			}
			m, ok := v.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("missing binding %s", path)
			}
			v, ok = m[k]
			if !ok {
				return nil, fmt.Errorf("missing binding %s", path)
			}
		}
		encoded, err := json.Marshal(v)
		if err != nil {
			return nil, err
		}
		budget -= 2 * len(encoded)
		if budget < 0 {
			return nil, errors.New("hydrated payload exceeds budget")
		}
		return v, nil
	}
	var walk func(any, int) (any, error)
	walk = func(v any, depth int) (any, error) {
		if depth > 32 {
			return nil, errors.New("template exceeds depth 32")
		}
		switch x := v.(type) {
		case string:
			matches := placeholder.FindAllStringSubmatchIndex(x, -1)
			if len(matches) == 0 {
				return x, nil
			}
			if len(matches) == 1 && matches[0][0] == 0 && matches[0][1] == len(x) {
				return lookup(x[matches[0][2]:matches[0][3]])
			}
			var b strings.Builder
			pos := 0
			for _, m := range matches {
				v, e := lookup(x[m[2]:m[3]])
				if e != nil {
					return nil, e
				}
				b.WriteString(x[pos:m[0]])
				b.WriteString(display(v))
				pos = m[1]
			}
			b.WriteString(x[pos:])
			return b.String(), nil
		case []any:
			out := make([]any, len(x))
			for i, v := range x {
				vv, e := walk(v, depth+1)
				if e != nil {
					return nil, e
				}
				out[i] = vv
			}
			return out, nil
		case map[string]any:
			out := map[string]any{}
			for k, v := range x {
				if k == "__proto__" || k == "constructor" || k == "prototype" {
					return nil, errors.New("reserved template key")
				}
				vv, e := walk(v, depth+1)
				if e != nil {
					return nil, e
				}
				out[k] = vv
			}
			return out, nil
		default:
			return v, nil
		}
	}
	// Work on a JSON clone and clone the output, preventing mutation of bindings.
	var normalized any
	if e = json.Unmarshal(raw, &normalized); e != nil {
		return nil, e
	}
	out, e := walk(normalized, 0)
	if e != nil {
		return nil, e
	}
	raw, e = json.Marshal(out)
	if e != nil {
		return nil, e
	}
	if len(raw) > MaxInputBytes {
		return nil, errors.New("hydrated payload too large")
	}
	e = json.Unmarshal(raw, &out)
	return out, e
}
