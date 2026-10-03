package sacratui

// DemoData is explicitly synthetic; production Render never fabricates activity.
func DemoData(phase int) Topology {
	t := Topology{Session: map[string]any{"id": "sdk-demo", "source": "synthetic"}, Runtime: map[string]any{"maxThreads": 3}, Events: []map[string]any{}}
	slots := []string{"main", "router", "worker1", "worker2", "worker3", "architect", "review"}
	roles := []string{"COORDINATOR", "ROUTER / POLICY", "WORKER", "EXPLORER", "RESEARCHER", "ARCHITECT", "REVIEW / VERIFY"}
	tasks := []string{"plans and writes", "routes work", "edits and tests", "reads repository", "reads documentation", "reviews only at gates", "checks result and approvals"}
	ids := []string{"main", "router", "worker", "explorer", "researcher", "architect", "review"}
	for i, slot := range slots {
		st := "idle"
		if phase%8 == i%8 {
			st = "running"
		}
		if phase%8 > i && i != 5 {
			st = "done"
		}
		if phase%8 == 7 {
			st = "done"
		}
		t.Nodes = append(t.Nodes, Node{ID: ids[i], Slot: slot, Role: roles[i], Task: tasks[i], State: st, Model: map[string]any{"provider": "demo", "name": "model-" + ids[i], "effort": "medium"}, Params: map[string]any{"write": i == 0 || i == 2}, Metrics: map[string]any{"calls": i + 1, "tokens": (phase + 1) * (i + 1) * 123}})
	}
	return t
}

// DemoEdges is opt-in synthetic activity, never inferred from production data.
func DemoEdges(phase int) []string {
	return [][]string{{}, {"main-router"}, {"router-fanout", "router-worker"}, {"router-fanout", "router-explorer"}, {"router-fanout", "router-researcher"}, {"architect-review"}, {"worker-review", "explorer-review", "researcher-review", "merge-review"}, {}}[phase%8]
}
