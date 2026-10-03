import {spawn} from 'node:child_process';

export const version = '0.1.0';
const MAX_INPUT = 1048576, MAX_OUTPUT = 32 * 1024 * 1024;
export class SDKError extends Error {}

/** Persistent JSONL client. No shell, browser, terminal modes or global timers. */
export class Client {
  constructor({executable = process.env.SACRA_TUI_BIN || 'sacra-tui', timeout = 5000} = {}) {
    if (!Number.isFinite(timeout) || timeout <= 0) throw new TypeError('timeout must be positive');
    this.timeout = timeout; this.pending = new Map(); this.counter = 0; this.buffer = ''; this.closed = false;
    this.proc = spawn(executable, ['--stdio'], {stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true});
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', chunk => this.read(chunk));
    this.proc.on('error', error => this.fail(new SDKError(error.message)));
    this.proc.on('exit', (code, signal) => this.fail(new SDKError(`Renderer exited (${code ?? signal})`)));
    this.proc.stdin.on('error', error => this.fail(new SDKError(error.message)));
  }
  fail(error) {
    for (const entry of this.pending.values()) {clearTimeout(entry.timer); entry.reject(error);}
    this.pending.clear(); this.closed = true;
    if (this.proc && this.proc.exitCode === null) this.proc.kill();
  }
  read(chunk) {
    this.buffer += chunk;
    if (Buffer.byteLength(this.buffer, 'utf8') > MAX_OUTPUT) {this.fail(new SDKError('Response exceeds limit')); return;}
    let end;
    while ((end = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, end); this.buffer = this.buffer.slice(end + 1);
      let response;
      try {response = JSON.parse(line);} catch {this.fail(new SDKError('Invalid JSON from renderer')); return;}
      const entry = this.pending.get(response?.id);
      if (!entry || response.version !== 1) {this.fail(new SDKError('Invalid renderer response / request ID')); return;}
      clearTimeout(entry.timer); this.pending.delete(response.id);
      if (response.ok) entry.resolve(response); else entry.reject(new SDKError(response.error || 'Renderer rejected request'));
    }
  }
  request(op, payload = {}) {
    if (this.closed) return Promise.reject(new SDKError('Client is closed'));
    if (this.pending.size >= 64) return Promise.reject(new SDKError('At most 64 pending requests'));
    const id = String(++this.counter);
    let line;
    try {
      line = JSON.stringify({...payload, version: 1, id, op}, (_key, value) => {
        if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Non-finite number; use null for missing');
        return value;
      }) + '\n';
    } catch (error) {return Promise.reject(error);}
    if (Buffer.byteLength(line, 'utf8') > MAX_INPUT) return Promise.reject(new SDKError('Request exceeds 1 MiB'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new SDKError('Renderer timed out; client closed')), this.timeout);
      this.pending.set(id, {resolve, reject, timer});
      this.proc.stdin.write(line, error => {if (error) this.fail(new SDKError(error.message));});
    });
  }
  async render(block, options = {}) {
    const response = await this.request('render', {block, options: {width: 80, height: 24, ...options}});
    return response.frame;
  }
  async hydrate(template, bindings) {return (await this.request('hydrate', {template, bindings})).data ?? null;}
  close() {this.fail(new SDKError('Client closed'));}
}

export const block = (type, props = {}) => ({...props, type});
export const text = (value, props = {}) => block('text', {...props, text: value});
export const panel = (title, child, props = {}) => block('panel', {...props, title, children: [child]});
export const row = (children, props = {}) => block('row', {gap: 2, ...props, children});
export const column = (children, props = {}) => block('column', {...props, children});
export const topology = (data, props = {}) => block('topology', {...props, data});
export const node = (data, props = {}) => block('node', {...props, node: data});
