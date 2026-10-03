import test from 'node:test';
import assert from 'node:assert/strict';
import {Client, SDKError, panel, text, row, block} from './index.mjs';

test('native blocks, typed placeholders, errors, concurrent frames', async () => {
  const client = new Client();
  try {
    const view = row([panel('A', text('Привет 世界')), panel('B', block('meter', {title:'zero', value:0, max:100}))]);
    const f = await client.render(view, {width:80, height:12, theme:'solarized-light', color:'truecolor'});
    assert.equal(f.lines.length,12); assert.match(f.lines.join('\n'),/Привет/); assert.ok(f.ansi.includes('\x1b['));
    const value = await client.hydrate({x:'{{settings.limit}}', y:'{{settings.enabled}}'}, {settings:{limit:0,enabled:false}});
    assert.deepEqual(value,{x:0,y:false});
    await assert.rejects(client.render(view,{width:0}),SDKError);
    await assert.rejects(client.hydrate('{{missing}}',{}),SDKError);
    await assert.rejects(client.render(block('meter',{value:NaN})),/Non-finite/);
    const frames = await Promise.all(Array.from({length:12},()=>client.render(text('ok'),{width:20,height:1})));
    assert.equal(frames.length,12); assert.ok(frames.every(f=>f.lines[0].startsWith('ok')));
  } finally {client.close();}
  await assert.rejects(client.render(text('closed')),/closed/);
});

test('process launch failure is explicit', async () => {
  const client = new Client({executable:'/this/file/does/not/exist',timeout:500});
  try {await assert.rejects(client.render(text('x')),SDKError);} finally {client.close();}
});


test('timeout closes the worker', async () => {
  const client = new Client({executable:new URL('../tests/timeout_worker.py',import.meta.url).pathname,timeout:80});
  try {await assert.rejects(client.render(text('wait')),/timed out/);assert.equal(client.closed,true);}
  finally {client.close();}
});
