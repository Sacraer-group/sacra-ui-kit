---
name: sacra-ui-controls
description: Implement, fix, or review SACRA UI forms and interaction feedback. Use for custom selects, checkboxes, switches, buttons, focus states, clipboard/copy feedback, toasts, dialogs, validation, and keyboard accessibility.
metadata:
  author: Sacraer-group
  version: "1.2.0"
  argument-hint: <control-or-form>
---

# SACRA UI Controls

Prefer existing controls over new widget code.

Resolve the full reference root in this order: current `sacra-ui-kit` checkout, then `$HOME/.codex/sacra-ui-kit`, then bundled `references/controls.md`.

When a full reference root is available, inspect:
- `site/examples/controls.html`
- `site/examples/feedback.html`
- `site/src/sacra-controls.js`
- `site/src/sacra-utils.js`
- `site/src/controls.css`
- `site/src/checkbox.css`
- `site/src/feedback.css`

## Custom select

Use the shipped select enhancer. Do not stop at `appearance:none`: the expanded menu must be a DOM listbox styled by SACRA.

- Keep native `select` as the value/event/FormData/reset source.
- Let `SacraControls` enhance `select.s-select`.
- After a silent programmatic value change call `SacraControls.refresh(select)`.
- Preserve arrows, Enter/Space, Home/End, Escape, Tab, click-outside and touch.
- Do not expose the macOS/Windows native popup as the visible menu.

## Checkbox and switch

Keep native input semantics underneath the custom SACRA visual. Do not replace behavior with decorative divs.

## Focus vs success

Yellow `focus-visible` is current keyboard position. It is not success.

Copy success is green and only appears after the copy operation really succeeds:

```js
button.addEventListener('click', async (event) => {
  await SacraUtils.copy(text, {
    trigger: event.currentTarget,
    message: 'Текст в буфере обмена.'
  });
});
```

The clicked button gets a temporary green check and a toast says `Скопировано`. Failure must show an error/manual fallback and must never show false success. Pass the trigger explicitly; Safari mouse clicks may not focus the source button.

## Forms

Use real labels and native inputs behind visual wrappers. Set `aria-invalid` plus textual validation errors. Do not use color as the only state channel. Test mouse, keyboard, touch and form reset/submission.
