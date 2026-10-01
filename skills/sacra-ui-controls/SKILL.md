---
name: sacra-ui-controls
description: Implement, fix, or review SACRA UI forms and interaction feedback. Use for custom selects, checkboxes, switches, buttons, focus states, clipboard/copy feedback, toasts, dialogs, validation, and keyboard accessibility.
metadata:
  author: Sacraer-group
  version: "1.0.0"
  argument-hint: <control-or-form>
---

# SACRA UI Controls

Prefer existing controls over new widget code. If this repository is available, inspect `examples/controls.html`, `examples/feedback.html`, `src/sacra-controls.js`, `src/sacra-utils.js`, `src/controls.css`, `src/checkbox.css`, and `src/feedback.css` before editing.

## Custom select

Use the existing SACRA select enhancer. Do not stop at `appearance:none`: the expanded menu must be a DOM listbox styled by the kit.

- Keep the native `<select>` as the semantic/value source for labels, `FormData`, disabled state, reset and `input`/`change` events.
- Let `SacraControls` enhance `select.s-select`.
- After a silent programmatic `select.value = ...`, call `SacraControls.refresh(select)`.
- Preserve keyboard operation: arrows, Enter/Space, Home/End, Escape, Tab, click outside and touch.
- Keep custom listbox visuals graphite with yellow selected/focus accents; do not expose macOS/Windows native popup styling.

## Checkbox and switch

Use the existing checkbox/switch classes and native input semantics. Styling can replace the browser chrome, not the input behavior.

## Focus vs success

Yellow `focus-visible` means current keyboard position. It is not success, warning, or validation state. Never remove it for visual cleanliness.

Copy success is green and happens only after the copy operation really succeeds:

```js
button.addEventListener('click', async (event) => {
  const ok = await SacraUtils.copy(text, {
    trigger: event.currentTarget,
    message: 'Текст в буфере обмена.'
  });
});
```

The clicked button gets a temporary green SVG check and a toast says “Скопировано”. On failure show “Не скопировано” and a manual copy fallback; never confirm success on click alone. Pass the trigger explicitly rather than relying on `document.activeElement` because Safari mouse clicks may not focus the button.

## Forms

- Use real `<label>` elements and native inputs underneath visual wrappers.
- Set `aria-invalid` and a textual error for validation failures.
- Do not use color as the only state channel.
- Do not break native form reset/submission behavior.
- Test mouse, keyboard and touch paths.

Use `references/controls.md` when source files are not available.
