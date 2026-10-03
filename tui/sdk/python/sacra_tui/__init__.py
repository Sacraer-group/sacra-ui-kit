"""Transport-free block builders + a persistent, shell-free JSONL render client.

Install/build the sacra-tui binary separately and set SACRA_TUI_BIN or pass its path.
A Client owns only its worker, never the user's terminal or input loop.
"""
from __future__ import annotations

import json
import os
import queue
import shutil
import subprocess
import threading
from dataclasses import dataclass
from typing import Any

__version__ = "0.1.0"
MAX_INPUT_BYTES = 1048576
MAX_RESPONSE_BYTES = 32 * 1024 * 1024


class SDKError(RuntimeError):
    """The worker rejected a request or its transport failed."""


@dataclass(frozen=True)
class Frame:
    width: int
    height: int
    content_height: int
    scroll_y: int
    lines: list[str]
    runs: list[list[dict[str, str]]]
    regions: list[dict[str, Any]]
    ansi: str = ""

    @property
    def plain(self) -> str:
        return "\n".join(self.lines)


class Client:
    """One long-lived renderer process. Requests are serialized; no per-frame fork.

    Timeouts and malformed responses close the worker so a late frame can never
    be mistaken for the next request. Render validation errors keep it alive.
    """

    def __init__(self, executable: str | os.PathLike[str] | None = None, *, timeout: float = 5.0):
        if timeout <= 0:
            raise ValueError("timeout must be positive")
        binary = str(executable or os.environ.get("SACRA_TUI_BIN") or shutil.which("sacra-tui") or "")
        if not binary:
            raise SDKError("Build sacra-tui and set SACRA_TUI_BIN, or pass executable=...")
        self.timeout = timeout
        self._lock = threading.Lock()
        self._next_id = 0
        self._closed = False
        self._queue: queue.Queue[Any] = queue.Queue()
        self._writes: queue.Queue[str | None] = queue.Queue()
        self._proc = subprocess.Popen(
            [binary, "--stdio"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, text=True, encoding="utf-8", bufsize=1,
        )
        self._thread = threading.Thread(target=self._read, daemon=True)
        self._thread.start()
        self._writer = threading.Thread(target=self._write, daemon=True)
        self._writer.start()

    def _write(self) -> None:
        try:
            assert self._proc.stdin is not None
            while True:
                encoded = self._writes.get()
                if encoded is None:
                    return
                self._proc.stdin.write(encoded)
                self._proc.stdin.flush()
        except Exception as exc:
            self._queue.put(exc)

    def _read(self) -> None:
        try:
            assert self._proc.stdout is not None
            while True:
                line = self._proc.stdout.readline(MAX_RESPONSE_BYTES + 1)
                if not line:
                    raise SDKError("Renderer closed stdout")
                if len(line.encode("utf-8")) > MAX_RESPONSE_BYTES or not line.endswith("\n"):
                    raise SDKError("Renderer response exceeds limit")
                self._queue.put(json.loads(line))
        except Exception as exc:
            self._queue.put(exc)

    def request(self, op: str, **payload: Any) -> dict[str, Any]:
        with self._lock:
            if self._closed:
                raise SDKError("Client is closed")
            self._next_id += 1
            ident = str(self._next_id)
            encoded = json.dumps({**payload, "version": 1, "id": ident, "op": op}, ensure_ascii=False, allow_nan=False) + "\n"
            if len(encoded.encode("utf-8")) > MAX_INPUT_BYTES:
                raise ValueError("Request exceeds 1 MiB")
            try:
                # The deadline also covers a worker that stops reading stdin.
                self._writes.put(encoded)
                response = self._queue.get(timeout=self.timeout)
                if isinstance(response, Exception):
                    raise response
                if not isinstance(response, dict) or response.get("version") != 1 or response.get("id") != ident:
                    raise SDKError("Invalid renderer response / request ID")
            except Exception as exc:
                self.close()
                if isinstance(exc, queue.Empty):
                    raise SDKError("Renderer timed out; client closed") from exc
                raise SDKError(str(exc)) from exc
            if not response.get("ok"):
                raise SDKError(response.get("error", "Renderer rejected request"))
            return response

    def render(self, block: dict[str, Any], *, width: int = 80, height: int = 24,
               theme: str = "sacra", color: str = "none", ascii: bool = False,
               scroll_y: int = 0, selected_id: str = "", focus_id: str = "",
               active_edges: list[str] | None = None) -> Frame:
        response = self.request("render", block=block, options={
            "width": width, "height": height, "theme": theme, "color": color,
            "ascii": ascii, "scrollY": scroll_y, "selectedId": selected_id,
            "focusId": focus_id, "activeEdges": active_edges or [],
        })
        f = response["frame"]
        return Frame(f["width"], f["height"], f["contentHeight"], f["scrollY"],
                     f["lines"], f["runs"], f["regions"], f.get("ansi", ""))

    def hydrate(self, template: Any, bindings: dict[str, Any]) -> Any:
        return self.request("hydrate", template=template, bindings=bindings).get("data")

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._writes.put(None)
        try:
            self._proc.terminate()
            self._proc.wait(timeout=1)
        except subprocess.TimeoutExpired:
            self._proc.kill()
            self._proc.wait(timeout=1)
        except ProcessLookupError:
            pass
        if threading.current_thread() is not self._thread:
            self._thread.join(timeout=1)
        if threading.current_thread() is not self._writer:
            self._writer.join(timeout=1)
        for stream in (self._proc.stdin, self._proc.stdout):
            if stream is not None:
                stream.close()

    def __enter__(self) -> Client:
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()


def block(kind: str, **props: Any) -> dict[str, Any]:
    return {**props, "type": kind}


def text(value: str, **props: Any) -> dict[str, Any]:
    return block("text", text=value, **props)


def panel(title: str, child: dict[str, Any], **props: Any) -> dict[str, Any]:
    return block("panel", title=title, children=[child], **props)


def row(*children: dict[str, Any], gap: int = 2, **props: Any) -> dict[str, Any]:
    return block("row", children=list(children), gap=gap, **props)


def column(*children: dict[str, Any], gap: int = 0, **props: Any) -> dict[str, Any]:
    return block("column", children=list(children), gap=gap, **props)


def topology(data: dict[str, Any], **props: Any) -> dict[str, Any]:
    return block("topology", data=data, **props)


def node(data: dict[str, Any], **props: Any) -> dict[str, Any]:
    return block("node", node=data, **props)
