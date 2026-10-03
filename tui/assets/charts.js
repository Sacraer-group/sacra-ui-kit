/* SACRA TUI chart engine — adaptation of ultra-mog ui.rs / pixels.rs.
 * Source commit 7975feefe2e3530cd026ec99dfe6d862a6e9e02f; MIT notice in docs/.
 * Geometry/segmentation only. Colors are injected from SACRA tokens.
 * Browser raster, not a Kitty Graphics encoder or native terminal backend.
 */
(function (root) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function segments(history, key, windowMs, end) {
    windowMs = Math.max(1, windowMs);
    end = end ?? history.at(-1)?.t ?? 0;
    const start = Math.max(0, end - windowMs), out = [];
    let current = [], previous = null;
    for (const s of history) {
      if (s.t < start || s.t > end) continue;
      if (previous !== null && s.t - previous > 20000 && current.length) {
        out.push(current); current = [];
      }
      previous = s.t;
      const v = typeof key === 'function' ? key(s) : s[key];
      if (typeof v === 'number' && Number.isFinite(v)) current.push([s.t - start, v]);
      else if (current.length) { out.push(current); current = []; }
    }
    if (current.length) out.push(current);
    return out;
  }
  // Integer Bresenham, matching pixels.rs; clipped writes, optional 2px stroke.
  function line(x0, y0, x1, y1, put, thick = false) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      put(x0, y0); if (thick) put(x0, y0 + 1);
      if (x0 === x1 && y0 === y1) break;
      const twice = 2 * err;
      if (twice >= dy) { err += dy; x0 += sx; }
      if (twice <= dx) { err += dx; y0 += sy; }
    }
  }
  function raster({ width, height, series, xMax, bounds, background, grid, thick = true }) {
    width = Math.max(1, Math.floor(width)); height = Math.max(1, Math.floor(height));
    if (width * height > 2640000) throw new RangeError('Chart exceeds the ultra-mog raster budget');
    const pixels = new Uint8ClampedArray(width * height * 4);
    const mask = new Uint8Array(width * height);
    const put = (x, y, color, label = 0) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const i = y * width + x, o = i * 4;
      pixels[o] = color[0]; pixels[o+1] = color[1]; pixels[o+2] = color[2]; pixels[o+3] = 255;
      if (label) mask[i] = label;
    };
    if (background) for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) put(x, y, background);
    if (grid) for (const f of [.25, .5, .75]) {
      const y = Math.round((height - 1) * f);
      for (let x = 0; x < width; x += 2) put(x, y, grid);
    }
    const span = Math.max(Number.EPSILON, bounds[1] - bounds[0]);
    const project = ([x, y]) => [
      Math.round(clamp(x / Math.max(1, xMax), 0, 1) * (width - 1)),
      Math.round(clamp((bounds[1] - y) / span, 0, 1) * (height - 1))
    ];
    series.forEach((s, idx) => {
      for (const segment of s.segments) {
        const points = segment.filter(p => p.every(Number.isFinite)).map(project);
        for (let i = 1; i < points.length; i++) line(...points[i-1], ...points[i],
          (x,y) => put(x,y,s.color,idx+1), thick);
        if (points.length) put(...points[0],s.color,idx+1);
      }
    });
    return {width, height, pixels, mask};
  }
  function ascii(frame, grid = true) {
    const chars = [' ', '*', '+', 'o'];
    return Array.from({length: frame.height}, (_, y) => Array.from({length: frame.width}, (_, x) => {
      const value = frame.mask[y * frame.width + x];
      return value ? (chars[value] || '*') : (grid && y === Math.round((frame.height-1)/2) && x % 2 === 0 ? '.' : ' ');
    }).join('')).join('\n');
  }
  function spark(values, width = 18, asciiOnly = false, peak = null) {
    const v = values.slice(-width), valid = v.filter(n => typeof n === 'number' && Number.isFinite(n) && n >= 0);
    if (!valid.length) return asciiOnly ? '--' : '—';
    peak = peak ?? Math.max(...valid);
    const steps = asciiOnly ? '.:-=+*#@' : '▁▂▃▄▅▆▇█';
    return v.map(n => typeof n !== 'number' || !Number.isFinite(n) || n < 0 ? ' ' : steps[peak === 0 ? 0 : clamp(Math.round(n / peak * 7), 0, 7)]).join('');
  }
  function bar(value, width = 16, asciiOnly = false) {
    width = clamp(Math.floor(width), 0, 40);
    const filled = typeof value === 'number' && Number.isFinite(value) ? Math.round(clamp(value, 0, 100) / 100 * width) : 0;
    return (asciiOnly ? '#' : '█').repeat(filled) + (asciiOnly ? '.' : '░').repeat(width-filled);
  }
  function sample(t) {
    // Seeded deterministic signals, not device telemetry.
    const v=t/1000;
    return {t,cpu:clamp(44+20*Math.sin(v*.049)+9*Math.sin(v*.23)+5*Math.cos(v*.61),0,100),
      gpu:clamp(24+15*Math.sin(v*.073+2)+7*Math.cos(v*.3),0,100),
      ram:9.1+1.6*Math.sin(v*.013)+.2*Math.sin(v*.13),
      down:clamp(12+7*Math.sin(v*.08)+3*Math.sin(v*.6),0,32),
      up:clamp(3.5+2*Math.sin(v*.11+1),0,16)};
  }
  const api={segments,line,raster,ascii,spark,bar,sample,clamp};
  if (typeof module !== 'undefined' && module.exports) module.exports=api;
  else root.TuiCharts=api;
})(typeof window === 'undefined' ? globalThis : window);
