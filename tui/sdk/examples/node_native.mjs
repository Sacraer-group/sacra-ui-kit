// Run with --once for a snapshot; otherwise q exits, arrows scroll, p pauses.
import {readFile} from 'node:fs/promises';
import {Client, block, column, topology} from '../javascript/index.mjs';
const data = JSON.parse(await readFile(new URL('./topology.json', import.meta.url), 'utf8'));
const once = process.argv.includes('--once');
const client = new Client();
let scroll = 0, phase = 0, playing = true, quit = false, timer;
const view = () => column([
  block('status', {text: 'SACRA / NODE · SYNTHETIC DEMO', height: 1, role: 'accent'}),
  topology(data, {weight: 1, scroll}),
  block('status', {text: '↑↓ scroll · p pause · q exit', height: 1}),
]);
let entered = false, rawBefore = false;
const cleanup = () => {
  quit = true; clearTimeout(timer); client.close();
  if (entered) {
    process.stdin.off('data', input);
    if (process.stdin.isTTY) process.stdin.setRawMode(rawBefore);
    process.stdin.pause();
    process.stdout.write('\x1b[0m\x1b[?25h\x1b[?1049l');
    entered = false;
  }
};
const input = chunk => {
  const key = chunk.toString();
  if (key.includes('q') || key.includes('\x03')) quit = true;
  if (key === 'p') playing = !playing;
  if (key === '\x1b[B') scroll = Math.min(scroll + 1, data.nodes.length * 9);
  if (key === '\x1b[A') scroll = Math.max(0, scroll - 1);
};
const stop = () => {quit = true;};
process.on('SIGINT', stop); process.on('SIGTERM', stop);
try {
  if (once) {
    const frame = await client.render(view(), {width: 160, height: 44});
    console.log(frame.lines.join('\n'));
  } else {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Use --once for pipes');
    rawBefore = !!process.stdin.isRaw;
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.on('data', input);
    entered = true; process.stdout.write('\x1b[?1049h\x1b[?25l');
    let tick = 0;
    while (!quit) {
      if (playing && ++tick % 8 === 0) {
        phase = (phase + 1) % data.nodes.length;
        data.nodes.forEach((node, i) => {node.state = i === phase ? 'running' : 'idle';});
      }
      const frame = await client.render(view(), {
        width: Math.max(1, Math.min(500, process.stdout.columns || 80)),
        height: Math.max(1, Math.min(100, process.stdout.rows || 24)),
        color: process.env.NO_COLOR || process.env.TERM === 'dumb' ? 'none' : 'truecolor',
      });
      process.stdout.write('\x1b[H' + (frame.ansi || frame.lines.join('\n')));
      await new Promise(resolve => {timer = setTimeout(resolve, 150);});
    }
  }
} finally {
  cleanup(); process.off('SIGINT', stop); process.off('SIGTERM', stop);
}
