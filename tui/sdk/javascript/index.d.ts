export type JSONValue = null | boolean | number | string | JSONValue[] | {[key: string]: JSONValue};
export type State = 'idle' | 'queued' | 'running' | 'done' | 'error' | 'blocked' | 'disabled' | 'stale';
export interface NodeData {
  id: string; slot: string; role: string; state: State; task?: string;
  model?: {[key: string]: JSONValue}; params?: {[key: string]: JSONValue};
  metrics?: {[key: string]: JSONValue}; extra?: {[key: string]: JSONValue};
}
export interface TopologyData {
  session: {[key: string]: JSONValue}; nodes: NodeData[];
  runtime?: {[key: string]: JSONValue}; events?: {[key: string]: JSONValue}[];
  extra?: {[key: string]: JSONValue};
}
export interface Block {
  type: 'text' | 'status' | 'kv' | 'table' | 'meter' | 'sparkline' | 'events' | 'node' | 'topology' | 'panel' | 'row' | 'column';
  id?: string; title?: string; text?: string; role?: string; children?: Block[];
  height?: number; weight?: number; gap?: number; scroll?: number;
  fields?: {label: string; value: JSONValue}[]; columns?: string[]; rows?: JSONValue[][];
  value?: number | null; min?: number; max?: number; unit?: string; samples?: (number | null)[];
  node?: NodeData; data?: TopologyData; events?: {[key: string]: JSONValue}[];
}
export interface Options {
  width?: number; height?: number; theme?: string; color?: 'none' | 'ansi16' | 'truecolor';
  ascii?: boolean; scrollY?: number; selectedId?: string; focusId?: string; activeEdges?: string[];
}
export interface Frame {
  width: number; height: number; contentHeight: number; scrollY: number;
  lines: string[]; runs: {text: string; fg: string; bg: string}[][];
  regions: {id: string; type: string; x: number; y: number; width: number; height: number}[];
  ansi?: string;
}
export const version: string;
export class SDKError extends Error {}
export class Client {
  constructor(options?: {executable?: string; timeout?: number});
  render(block: Block, options?: Options): Promise<Frame>;
  hydrate(template: JSONValue, bindings: {[key: string]: JSONValue}): Promise<JSONValue>;
  request(op: string, payload?: object): Promise<{version: number; id: string; ok: boolean; frame?: Frame; data?: JSONValue}>;
  close(): void;
}
export function block(type: Block['type'], props?: Partial<Block>): Block;
export function text(value: string, props?: Partial<Block>): Block;
export function panel(title: string, child: Block, props?: Partial<Block>): Block;
export function row(children: Block[], props?: Partial<Block>): Block;
export function column(children: Block[], props?: Partial<Block>): Block;
export function topology(data: TopologyData, props?: Partial<Block>): Block;
export function node(data: NodeData, props?: Partial<Block>): Block;
