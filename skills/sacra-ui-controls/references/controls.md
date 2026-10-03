# SACRA controls reference

Load `sacra-ui.css` first. Load `src/sacra-utils.js` for copy/toast feedback and `src/sacra-controls.js` for custom select enhancement.

Custom select requirements: hidden native select remains authoritative; visible trigger + DOM listbox mirror it; keyboard supports arrows, Enter/Space, Home/End, Escape and Tab; disabled options remain disabled; form reset and programmatic refresh stay in sync.

Checkbox requirements: native checkbox input remains in DOM, custom visual uses SACRA graphite/yellow tokens, focus remains visible.

Copy requirements: only successful clipboard completion may produce green check + “Скопировано” toast; failure uses explicit error/manual fallback. Focus yellow is independent from success green.

## Postavki refresh

Use `SacraUpload.mount(root,{maxFiles,maxBytes,onSubmit})` for camera/file pickers and removable previews. Preserve whole-batch validation, file order, pending controls, error retention and Object URL cleanup. Source defaults are not global product rules; transport belongs to the host app.
The full source map is `site/docs/UPSTREAM-POSTAVKI.md` in the global or local kit.


## Themes

Controls consume semantic color roles. Palette changes must not alter geometry, native semantics, focus order or keyboard behavior. Focus uses accent; success/error use their own roles.
