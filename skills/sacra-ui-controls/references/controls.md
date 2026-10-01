# SACRA controls reference

Load `sacra-ui.css` first. Load `src/sacra-utils.js` for copy/toast feedback and `src/sacra-controls.js` for custom select enhancement.

Custom select requirements: hidden native select remains authoritative; visible trigger + DOM listbox mirror it; keyboard supports arrows, Enter/Space, Home/End, Escape and Tab; disabled options remain disabled; form reset and programmatic refresh stay in sync.

Checkbox requirements: native checkbox input remains in DOM, custom visual uses SACRA graphite/yellow tokens, focus remains visible.

Copy requirements: only successful clipboard completion may produce green check + “Скопировано” toast; failure uses explicit error/manual fallback. Focus yellow is independent from success green.
