#!/usr/bin/env python3
"""curses host example: native cells, persistent Go worker, no browser or network.
Run with --once for a pipe-safe snapshot. q exits; arrows scroll the content only.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))
from sacra_tui import Client, block, column, topology

parser = argparse.ArgumentParser()
parser.add_argument("--once", action="store_true")
parser.add_argument("--bin", default=os.environ.get("SACRA_TUI_BIN"))
args = parser.parse_args()
data = json.loads((ROOT / "examples/topology.json").read_text(encoding="utf-8"))
# This example opts in to synthetic animation; SDK.render never advances data.
data["session"]["source"] = "synthetic"


def view(scroll=0):
    return column(
        block("status", text="SACRA / PYTHON · SYNTHETIC DEMO", height=1, role="accent"),
        topology(data, weight=1, scroll=scroll),
        block("status", text="Tab focus · Enter select · ↑↓ scroll · p pause · q exit", height=1),
    )


with Client(args.bin) as client:
    if args.once:
        print(client.render(view(), width=160, height=44).plain)
    else:
        import curses

        def main(screen):
            screen.timeout(150)
            try:
                curses.curs_set(0)
            except curses.error:
                pass
            selected, focus, scroll, phase = "", 0, 0, 0
            playing, last = True, time.monotonic()
            while True:
                height, width = screen.getmaxyx()
                if playing and time.monotonic() - last > 1.2:
                    phase = (phase + 1) % len(data["nodes"])
                    last = time.monotonic()
                    for i, n in enumerate(data["nodes"]):
                        n["state"] = "running" if i == phase else "idle"
                frame = client.render(view(scroll), width=max(1, min(width, 500)), height=max(1, min(height, 100)),
                                      selected_id=selected, focus_id=data["nodes"][focus]["id"])
                screen.erase()
                for y, line in enumerate(frame.lines):
                    try:
                        screen.addstr(y, 0, line)
                    except curses.error:  # curses may report ERR in the last cell after writing it.
                        pass
                screen.refresh()
                key = screen.getch()
                if key in (ord("q"), 27):
                    return
                if key == 9:
                    focus = (focus + 1) % len(data["nodes"])
                if key in (10, 13):
                    selected = data["nodes"][focus]["id"]
                if key == curses.KEY_DOWN:
                    scroll = min(scroll + 1, len(data["nodes"]) * 9)
                if key == curses.KEY_UP:
                    scroll = max(0, scroll - 1)
                if key == ord("p"):
                    playing = not playing
        # wrapper restores raw/cbreak/echo and cursor modes even on exceptions.
        curses.wrapper(main)
