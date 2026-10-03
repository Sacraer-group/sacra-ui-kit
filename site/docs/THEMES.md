# SACRA UI web themes

SACRA Graphite remains the default web palette. The web layer also supports the same semantic palette families as the TUI: SACRA Graphite, Nord, Gruvbox Dark, Dracula, Tokyo Night, Solarized Dark, Solarized Light and Mono Graphite.

Themes remap **only** `--s-color-*` semantic roles. They must not change spacing, radii, typography, layout, component DOM, navigation or keyboard behavior.

## Runtime

```html
<link rel="stylesheet" href="sacra-ui.css">
<script src="src/sacra-themes.js"></script>
<script> SacraThemes.restore({persist:false}); </script>
```

Apply and persist: `SacraThemes.apply('nord', {persist:true})`.

The registry is mirrored in `site/themes.json`. The helper exposes `all`, `get(id)`, `apply(id)`, `restore()`, `reset()` and `exportTheme(id)`. It emits `sacra-themechange` after an applied palette so Canvas/SVG renderers may refresh cached colors without changing geometry.

The main showcase loads the helper automatically from `site/src/showcase.js` and adds a theme selector to the top bar.
