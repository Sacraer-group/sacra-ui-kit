# TUI libraries and image/chat references / 2026-10-18

These are **implementation references**, not additional required runtimes. The source of truth for the SACRA project remains its private native SDK and theme contracts.

| Language | Verified reference | Borrow these ideas | SACRA integration recommendation |
|---|---|---|---|
| **Rust** | [SACRA native Rust](https://github.com/Sacraer-group/sacra-ui-kit/tree/main/tui/sdk/rust); [Ratatui](https://github.com/ratatui/ratatui); [ratatui-image](https://github.com/ratatui/ratatui-image) | Ratatui frame composition; runtime protocol picker Kitty/iTerm2/Sixel/halfblock | Reuse `sacra_tui` in-process and its optional `FrameWidget`. Add image-placement adapter around Ratatui, not a second SACRA theme system. |
| **Go** | [SACRA Go SDK](https://github.com/Sacraer-group/sacra-ui-kit/tree/main/tui/sdk/go); [Bubble Tea](https://github.com/charmbracelet/bubbletea); [Lip Gloss](https://github.com/charmbracelet/lipgloss); [Glamour](https://github.com/charmbracelet/glamour) | Keyboard/viewport state, composable layout, Markdown/ANSI renderer | Keep Go SACRA cell renderer; host app owns input. Use Glamour-like Markdown parser as an adapter (do not feed raw control sequences to core). |
| **Python** | [Textual](https://github.com/Textualize/textual); [Rich](https://github.com/Textualize/rich); [textual-image](https://github.com/lnqs/textual-image) | Chat messages, status views, image widgets with protocol/fallback options | Existing SACRA Python Client launches persistent Go JSONL worker. For a Textual host, map domain state to SDK blocks; use image protocol only if host terminal truly supports it. |
| **JavaScript/TypeScript** | [Ink](https://github.com/vadimdemedes/ink); [ink-image](https://github.com/kevva/ink-image); [SACRA bindings](https://github.com/Sacraer-group/sacra-ui-kit/tree/main/tui/sdk/javascript) | React-style component layouts, message streaming/composer, Markdown | Keep SACRA JS/TS bindings, avoid a parallel palette; Ink useful for UX research or existing Ink apps. Test image backend independently. |
| **C++** | [FTXUI](https://github.com/ArthurSonzogni/FTXUI) | Cell/DOM/component separation, keyboard navigation, native unicode handling | Use SACRA's versioned JSONL contract (`tui/sdk/schema/request.schema.json`) or deliberate native bridge; no native SACRA C++ package is claimed. |
| **Any language** | [Chafa](https://github.com/hpjansson/chafa) | High-quality terminal image approximations; Kitty/iTerm2/Sixel/character backends, broad tooling | A fallback/service boundary when native graphics unavailable; review licensing and process overhead before vendoring. |

## Terminal image capability ladder

1. Probe actual terminal (not only `$TERM`): Kitty Graphics where negotiated, otherwise supported inline protocols (iTerm2, Sixel).
2. On failure or after capability timeout use halfblocks/Unicode colored mosaic; finally show a **text alt card** and metadata.
3. Track image ID, message ID, placement rectangle, scale, original size and renderer backend. Repaint/delete on scroll, resize and changed messages.
4. Special cases: SSH and tmux may filter or wrap escape sequences, so include explicit compatibility tests and user override. Do not assume a protocol works because its parent terminal supports it.
5. Sanitize displayed chat text; untrusted Markdown, filenames and tool output must not inject OSC/CSI control sequences. Bound decompressed file bytes, pixels, frame count and render time.

## Chat UX specifics

- Keep `role`, `message_id`, `blocks[]` (`text`, `markdown`, `code`, `image`, `attachment`, `tool_status`), `stream_state`, `created_at`, `alt`, `error` separate from layout.
- Streaming should append to one message rather than hundreds of viewport rows; provide cancel/retry and visible pending state.
- Links: web opens external URLs only with visible destination; TUI shows selectable/copyable link with target.
- Big images stay in image viewport, not inside a log row; keyboard can open gallery/list and request textual description. Accessibility alternative must remain usable even with native image protocol.

### Compatibility reality check

`ratatui-image` documents feature support and known rendering glitches by terminal; do not claim every terminal does all protocols: https://github.com/ratatui/ratatui-image. `textual-image` supports `tgp`, `sixel`, `halfcell` and `unicode`, with runtime method selection: https://github.com/lnqs/textual-image. An existing browser mock (`preview.html`) showing a terminal screenshot is **not** a native graphics demonstration.
