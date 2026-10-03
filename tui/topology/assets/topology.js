(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const terminal=$('#terminal'),screen=$('#screen'),pop=$('#theme-pop');
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDemo=()=>state.data.session?.source==='synthetic';
const demo={session:{id:'9E31',label:'local demo',source:'synthetic'},runtime:{maxThreads:6,contextUsed:184000,contextMax:400000},nodes:[
{id:'main',slot:'main',role:'MAIN / COORDINATOR',model:{provider:'openai',name:'sol',effort:'high'},state:'running',task:'plans + writes code',params:{context:'400k',mode:'write'},metrics:{tokens:'184k',calls:'—'}},
{id:'router',slot:'router',role:'FORK / POLICY',model:{provider:'local',name:'classifier',effort:'code'},state:'idle',task:'routes low-cost decisions',params:{threshold:.82},metrics:{forks:'1,397'}},
{id:'worker',slot:'worker1',role:'WORKER',model:{provider:'openai',name:'sol',effort:'medium'},state:'idle',task:'edits + runs tests',params:{write:true},metrics:{tokens:'41k',calls:'2 patches'}},
{id:'explorer',slot:'worker2',role:'EXPLORER',model:{provider:'openai',name:'luna',effort:'medium'},state:'idle',task:'reads repository',params:{write:false},metrics:{tokens:'29k',calls:'14 reads'}},
{id:'researcher',slot:'worker3',role:'RESEARCHER',model:{provider:'openai',name:'luna',effort:'medium'},state:'idle',task:'pulls docs + refs',params:{network:'read'},metrics:{tokens:'18k',calls:'8 reads'}},
{id:'architect',slot:'architect',role:'ARCHITECT / ON CALL',model:{provider:'openai',name:'astra',effort:'high'},state:'idle',task:'review at gates only',params:{write:false,gates:['before plan','on repeated error','before done']},metrics:{tokens:'224k',calls:'2 reviews'}},
{id:'review',slot:'review',role:'REVIEW / VERIFY',model:{provider:'openai',name:'sol',effort:'high'},state:'queued',task:'checks result + approvals',params:{approval:'required'},metrics:{tokens:'—',calls:'pending'}}
],events:[],extra:{}};
const phases=[
{name:'plan',active:['main'],edges:[],event:['main','building plan','high effort']},
{name:'route',active:['router'],edges:['main-router'],event:['router','classify fork','p=.97']},
{name:'fan-out',active:['worker','explorer','researcher'],edges:['router-worker','router-explorer','router-researcher'],event:['router','spawn agents','3 / 6']},
{name:'work',active:['worker','explorer'],done:['researcher'],edges:['router-worker','router-explorer'],event:['worker','edit + test','running']},
{name:'gate',active:['architect'],done:['worker','explorer','researcher'],edges:['architect-review'],event:['architect','review gate','2 notes']},
{name:'merge',active:['review'],done:['worker','explorer','researcher'],edges:['worker-review','explorer-review','researcher-review'],event:['review','merge results','verify']},
{name:'verify',active:['review'],done:['worker','explorer','researcher'],edges:['worker-review','explorer-review','researcher-review'],event:['review','approval checks','running']},
{name:'done',active:[],done:['main','router','worker','explorer','researcher','review'],edges:[],event:['main','run complete','[OK]']}
];
const state={view:'topology',selected:'main',theme:'sacra',previewTheme:null,phase:0,playing:!matchMedia('(prefers-reduced-motion: reduce)').matches,speed:1,scale:1,width:'auto',timer:null,layoutRaf:0,data:clone(demo)};
const getPath=(o,p)=>String(p).split('.').reduce((v,k)=>v==null?undefined:v[k],o);
function hydrateTemplate(template,values){if(Array.isArray(template))return template.map(v=>hydrateTemplate(v,values));if(template&&typeof template==='object')return Object.fromEntries(Object.entries(template).map(([k,v])=>[k,hydrateTemplate(v,values)]));if(typeof template!=='string')return template;const exact=template.match(/^\{\{\s*([^}]+?)\s*\}\}$/);if(exact){const v=getPath(values,exact[1]);return v===undefined?template:clone(v)}return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g,(_,p)=>{const v=getPath(values,p);return v===undefined?`{{${p}}}`:String(v)});}
function normalise(input){
 const d=clone(input||demo);
 if(!d||typeof d!=='object'||Array.isArray(d))throw new TypeError('topology must be an object');
 d.session=d.session||{id:'—'};d.runtime=d.runtime||{};
 if(typeof d.session!=='object'||Array.isArray(d.session)||typeof d.runtime!=='object'||Array.isArray(d.runtime))throw new TypeError('session/runtime must be objects');
 d.nodes=Array.isArray(d.nodes)?d.nodes:[];d.events=Array.isArray(d.events)?d.events:[];
 if(d.nodes.length>128||d.events.length>10000)throw new RangeError('payload limit exceeded');
 const ids=new Set(),slots=new Set();
 for(const n of d.nodes){
  if(!n||typeof n!=='object'||typeof n.id!=='string'||!n.id||n.id.length>128)throw new TypeError('node.id must be a nonempty string');
  if(ids.has(n.id))throw new TypeError('duplicate node.id');ids.add(n.id);
  if(n.slot&&slots.has(n.slot))throw new TypeError('duplicate node.slot');if(n.slot)slots.add(n.slot);
 }
 if(d.events.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw new TypeError('events must contain objects');
 return d;
}
function node(id){return state.data.nodes.find(n=>n.id===id)}function slot(name){return state.data.nodes.find(n=>n.slot===name)}
function fmtObject(v){if(v==null)return'—';if(typeof v!=='object')return String(v);return Object.entries(v).map(([k,x])=>`${k}=${Array.isArray(x)?x.join('|'):typeof x==='object'?JSON.stringify(x):x}`).join(' · ')||'—'}
function modelLabel(n){if(!n?.model)return'—';return [n.model.provider,n.model.name,n.model.effort].filter(Boolean).join(' / ')}
function statusTag(s){return s==='done'?'[OK]':s==='running'?'[RUN]':s==='error'?'[ERR]':s==='queued'?'[WAIT]':s==='blocked'?'[BLOCK]':s==='disabled'?'[OFF]':s==='stale'?'[STALE]':'[IDLE]'}
function effectiveState(n){if(!isDemo())return ['idle','queued','running','done','error','blocked','disabled','stale'].includes(n.state)?n.state:'idle';const p=phases[state.phase];if(p.active?.includes(n.id))return'running';if(p.done?.includes(n.id))return'done';return n.state==='error'?'error':n.id==='review'?'queued':'idle'}
function eventPush(actor,message,tag,tone='accent'){const now=new Date().toLocaleTimeString('ru-RU',{hour12:false});state.data.events.push({time:now,actor,message,tag,tone});if(state.data.events.length>24)state.data.events.shift()}
// Patch existing nodes instead of replacing the live screen on every animation tick.
// Keys keep interactive controls and SVG paths alive. Unchanged attributes are not
// written, so neither focus nor CSS animations are restarted by unrelated updates.
function domKey(el){
 if(!el||el.nodeType!==1)return '';
 for(const attr of ['id','data-node','data-action','data-edge','data-track','data-junction','data-scroll-key']){
  if(el.hasAttribute(attr))return attr+':'+el.getAttribute(attr);
 }
 return '';
}
function sameKind(a,b){return a&&a.nodeType===b.nodeType&&a.nodeName===b.nodeName&&a.namespaceURI===b.namespaceURI;}
function patchNode(live,next){
 if(live.nodeType!==1){if(live.nodeValue!==next.nodeValue)live.nodeValue=next.nodeValue;return;}
 // Geometry has its own reconciler; a data/selection render must not clear it.
 if(live.matches('svg.topology-edges'))return;
 for(const attr of [...live.attributes])if(!next.hasAttribute(attr.name))live.removeAttribute(attr.name);
 for(const attr of [...next.attributes])if(live.getAttribute(attr.name)!==attr.value)live.setAttribute(attr.name,attr.value);
 patchChildren(live,next);
}
function patchChildren(live,next){
 let cursor=live.firstChild;
 for(const wanted of [...next.childNodes]){
  const key=domKey(wanted);
  if(!sameKind(cursor,wanted)||domKey(cursor)!==key){
   const found=key?[...live.childNodes].find(el=>sameKind(el,wanted)&&domKey(el)===key):null;
   if(found){live.insertBefore(found,cursor);cursor=found;}
   else{live.insertBefore(wanted.cloneNode(true),cursor);continue;}
  }
  patchNode(cursor,wanted);cursor=cursor.nextSibling;
 }
 while(cursor){const nextSibling=cursor.nextSibling;cursor.remove();cursor=nextSibling;}
}
function patchMarkup(target,html,svg=false){
 const template=document.createElement('template');
 template.innerHTML=svg?`<svg xmlns="http://www.w3.org/2000/svg">${html}</svg>`:html;
 patchChildren(target,svg?template.content.firstChild:template.content);
}
function rememberScroll(){
 return {x:window.scrollX,y:window.scrollY,panes:$$('#viewport,.t-tabs,[data-scroll-key]').map(el=>({el,x:el.scrollLeft,y:el.scrollTop}))};
}
function restoreScroll(saved){
 // Restore synchronously, never in a timer/rAF: a deferred restore can override
 // a wheel/touch gesture that happened after the render and feels like a lock.
 for(const pane of saved.panes)if(pane.el.isConnected){
  if(pane.el.scrollLeft!==pane.x)pane.el.scrollLeft=pane.x;
  if(pane.el.scrollTop!==pane.y)pane.el.scrollTop=pane.y;
 }
 if(window.scrollX!==saved.x||window.scrollY!==saved.y)window.scrollTo({left:saved.x,top:saved.y,behavior:'instant'});
}
// SVG coordinates are relative to its *painted rectangle*, not getScreenCTM.
// A viewBox matching that rectangle avoids mixing zoomed CSS pixels and SVG
// units. Scrolling/translating the page cancels out when rectangles are subtracted.
const EDGE_GAP = 3;
let observedWrap=null;
const observedCards=new Set();
const edgeObserver=new ResizeObserver(()=>drawEdges());
function edgeSVG(){
 return `<svg class="topology-edges" aria-hidden="true" focusable="false" preserveAspectRatio="none">
  <defs>${['idle','active','done'].map(tone => `<marker id="topology-arrow-${tone}" class="arrow-${tone}" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z"/></marker>`).join('')}</defs>
  <g class="edge-tracks"></g><g class="edge-lines"></g><g class="edge-junctions"></g>
 </svg>`;
}
function drawEdges(){
 const wrap=$('.graph-wrap',screen), svg=wrap?.querySelector('.topology-edges');
 if(!svg)return;
 const lines=$('.edge-lines',svg), junctions=$('.edge-junctions',svg), tracks=$('.edge-tracks',svg);
 // Stacked mode intentionally has no wires. This also drops a hidden architect's link.
 const svgRect=svg.getBoundingClientRect();
 if(!svgRect.width||!svgRect.height){lines.replaceChildren();junctions.replaceChildren();tracks.replaceChildren();return;}
 const viewBox=`0 0 ${svgRect.width} ${svgRect.height}`;
 if(svg.getAttribute('viewBox')!==viewBox)svg.setAttribute('viewBox',viewBox);
 const local=(x,y)=>({x:x-svgRect.left,y:y-svgRect.top});
 const box=selector=>{
  const el=wrap.querySelector(selector);if(!el)return null;
  const r=el.getBoundingClientRect();if(!r.width||!r.height)return null;
  const a=local(r.left,r.top),b=local(r.right,r.bottom);
  return {left:a.x,top:a.y,right:b.x,bottom:b.y,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};
 };
 const cards={
  main:box('.row.root > .agent-node[data-node]'),
  router:box('.row.router > .agent-node[data-node]'),
  worker1:box('.row.workers > .agent-node[data-node]:nth-child(1)'),
  worker2:box('.row.workers > .agent-node[data-node]:nth-child(2)'),
  worker3:box('.row.workers > .agent-node[data-node]:nth-child(3)'),
  review:box('.row.review > .agent-node[data-node]'),
  architect:box('.architect-rail > .agent-node[data-node]')
 };
 const topology=box('.topology');
 const active=new Set(isDemo()?(phases[state.phase].edges||[]):(Array.isArray(state.data.runtime.activeEdges)?state.data.runtime.activeEdges:[]));
 const done=new Set(isDemo()&&state.phase>=5?['router-worker','router-explorer','router-researcher']:[]);
 const tone=ids=>ids.some(id=>active.has(id))?'active':ids.some(id=>done.has(id))?'done':'idle';
 const workers=[['worker1','worker'],['worker2','explorer'],['worker3','researcher']]
  .filter(([slotName])=>cards[slotName]);
 const paths=[],dots=[],rails=[];
 // Limit serialization noise, without snapping coordinates away from card centres.
 const num=v=>Number(v.toFixed(3));
 function path(id,points,{arrow=false,ids=[id],from='',to=''}={}){
  const cleaned=points.filter((p,i)=>!i||Math.abs(p[0]-points[i-1][0])>.001||Math.abs(p[1]-points[i-1][1])>.001);
  if(cleaned.length<2)return;
  const t=tone(ids),d=cleaned.map((p,i)=>`${i?'L':'M'}${num(p[0])} ${num(p[1])}`).join(' ');
  // Keep a continuous underlying rail even while animated dashes pass a corner.
  rails.push(`<path data-track="${id}" class="edge-track" d="${d}"/>`);
  paths.push(`<path data-edge="${id}" data-from-slot="${from}" data-to-slot="${to}" class="edge${t==='idle'?'':t==='active'?' is-active':' is-done'}" d="${d}"${arrow?` marker-end="url(#topology-arrow-${t})"`:''}/>`);
 }
 function dot(id,x,y,ids){
  const t=tone(ids);
  dots.push(`<rect data-junction="${id}" class="edge-junction${t==='idle'?'':t==='active'?' is-active':' is-done'}" x="${num(x-1.5)}" y="${num(y-1.5)}" width="3" height="3"/>`);
 }
 const m=cards.main,r=cards.router,v=cards.review;
 if(m&&r){
  const a=m.bottom+EDGE_GAP,b=r.top-EDGE_GAP,mid=(a+b)/2;
  path('main-router',[[m.cx,a],[m.cx,mid],[r.cx,mid],[r.cx,b]],{arrow:true,from:'main',to:'router'});
 }
 if(r&&workers.length){
  const sourceY=r.bottom+EDGE_GAP;
  const targetY=Math.min(...workers.map(([key])=>cards[key].top))-EDGE_GAP;
  const busY=(sourceY+targetY)/2,ids=workers.map(([,key])=>'router-'+key);
  // One shared stem; branches begin at the same junction, not at guessed percentages.
  path('router-fanout',[[r.cx,sourceY],[r.cx,busY]],{ids,from:'router'});
  for(const [key,name] of workers){const w=cards[key];
   path('router-'+name,[[r.cx,busY],[w.cx,busY],[w.cx,w.top-EDGE_GAP]],{arrow:true,to:key});
  }
  dot('fanout',r.cx,busY,ids);
 }
 if(v&&workers.length){
  // The collector sits below the tallest worker, even if model/metric text wraps.
  const sourceY=Math.max(...workers.map(([key])=>cards[key].bottom))+EDGE_GAP;
  const targetY=v.top-EDGE_GAP,busY=(sourceY+targetY)/2;
  const ids=workers.map(([,key])=>key+'-review');
  for(const [key,name] of workers){const w=cards[key];
   path(name+'-review',[[w.cx,w.bottom+EDGE_GAP],[w.cx,busY],[v.cx,busY]],{from:key});
  }
  // A single final arrow, not three coincident markers and differently sized tails.
  path('merge-review',[[v.cx,busY],[v.cx,targetY]],{arrow:true,ids,to:'review'});
  dot('merge',v.cx,busY,ids);
 }
 const a=cards.architect;
 if(a&&v&&topology){
  // Separate review gate: use the gutter beside the graph, never the worker bus.
  const gutter=(a.right+topology.left)/2;
  path('architect-review',[[a.right+EDGE_GAP,a.cy],[gutter,a.cy],[gutter,v.cy],[v.left-EDGE_GAP,v.cy]],{arrow:true,from:'architect',to:'review'});
 }
 // SVG is the only mutated subtree: measuring and redrawing cannot resize the cards.
 patchMarkup(tracks,rails.join(''),true);patchMarkup(lines,paths.join(''),true);patchMarkup(junctions,dots.join(''),true);
}
function observeEdges(){
 const wrap=$('.graph-wrap',screen);
 if(wrap!==observedWrap){edgeObserver.disconnect();observedCards.clear();observedWrap=wrap;if(wrap)edgeObserver.observe(wrap);}
 if(!wrap)return;
 const cards=new Set($$('.agent-node',wrap));
 for(const el of observedCards)if(!cards.has(el)){edgeObserver.unobserve(el);observedCards.delete(el);}
 for(const el of cards)if(!observedCards.has(el)){edgeObserver.observe(el);observedCards.add(el);}
 drawEdges();
}
function nodeHTML(n,extra=''){if(!n)return`<div class="agent-node" data-state="disabled"><header><span class="role">EMPTY SLOT</span><span class="state">[OFF]</span></header><p>adapter may fill this slot</p></div>`;const s=effectiveState(n),pulse=s==='running'?' is-pulse':'';return `<button class="agent-node ${extra}${pulse}" data-node="${esc(n.id)}" data-state="${s}" aria-selected="${n.id===state.selected}" type="button"><header><span class="role">${esc(n.role||n.id)}</span><span class="state">${statusTag(s)}</span></header><p>${esc(n.task||'—')}</p><div class="node-foot"><span class="model">${esc(modelLabel(n))}</span><span>${esc(fmtObject(n.metrics))}</span></div><div class="node-params">${esc(fmtObject(n.params))}</div>${n.slot==='router'?routerDetail():''}</button>`}
function routerDetail(){if(!isDemo())return '';return `<div class="router-grid"><span>which file</span><span class="meter"><i style="--v:97%"></i></span><span>0.97</span><span>which tool</span><span class="meter"><i style="--v:90%"></i></span><span>0.90</span><span>retry/stop</span><span class="meter"><i style="--v:88%"></i></span><span>0.88</span></div>`}
function metrics(){const running=state.data.nodes.filter(n=>effectiveState(n)==='running').length,done=state.data.nodes.filter(n=>effectiveState(n)==='done').length;return `<section class="metrics"><div class="metric"><label>NODES</label><strong>${String(state.data.nodes.length).padStart(2,'0')}</strong><small>bound data</small></div><div class="metric"><label>RUNNING</label><strong>${String(running).padStart(2,'0')}</strong><small>${phases[state.phase].name}</small></div><div class="metric"><label>DONE</label><strong>${String(done).padStart(2,'0')}</strong><small>phase state</small></div><div class="metric"><label>THREADS</label><strong>${esc(state.data.runtime.maxThreads??'—')}</strong><small>runtime slot</small></div><div class="metric"><label>CONTEXT</label><strong>${state.data.runtime.contextUsed!=null?Math.round(state.data.runtime.contextUsed/1000)+'k':'—'}</strong><small>${state.data.runtime.contextMax!=null?Math.round(state.data.runtime.contextMax/1000)+'k max':'placeholder'}</small></div><div class="metric"><label>SCALE</label><strong>${Math.round(state.scale*100)}%</strong><small>preview only</small></div></section>`}
function architectHTML(){const n=slot('architect');if(!n)return'';const s=effectiveState(n);return `<button class="agent-node architect-node ${s==='running'?'is-pulse':''}" data-node="${esc(n.id)}" data-state="${s}" aria-selected="${n.id===state.selected}" type="button"><header><span class="role">${esc(n.role)}</span><span class="state">${statusTag(s)}</span></header><p>${esc(n.task)}</p><div class="gate-list">${(Array.isArray(n.params?.gates)?n.params.gates:(isDemo()?['before plan','on repeated error','before done']:[])).map(g=>`<span class="gate"><b>◇</b><span>${esc(g)}</span></span>`).join('')}</div><div class="architect-note">model ${esc(modelLabel(n))}<br>${esc(fmtObject(n.metrics))}<br><br>params: ${esc(fmtObject(n.params))}</div></button>`}
function eventLog(limit=10){const e=state.data.events.slice(-limit);return `<div class="event-log" data-scroll-key="events">${e.length?e.map(x=>`<div class="event" data-tone="${esc(x.tone||'')}"><time>${esc(x.time||'—')}</time><span class="actor">${esc(x.actor||'system')}</span><span>${esc(x.message||'—')}</span><span class="tag">${esc(x.tag||'')}</span></div>`).join(''):`<div class="event"><time>—</time><span class="actor">system</span><span>waiting for events[] / animation step</span><span class="tag">placeholder</span></div>`}</div>`}
function inspector(){const n=node(state.selected)||state.data.nodes[0];if(!n)return'';return `<section class="frame" data-active="true"><h2>INSPECT / ${esc(n.role||n.id)}</h2><dl class="inspect-list"><div class="kv"><dt>id / slot</dt><dd>${esc(n.id)} / ${esc(n.slot||'—')}</dd></div><div class="kv"><dt>state</dt><dd>${statusTag(effectiveState(n))} ${effectiveState(n)}</dd></div><div class="kv"><dt>model</dt><dd>${esc(modelLabel(n))}</dd></div><div class="kv"><dt>task</dt><dd>${esc(n.task||'—')}</dd></div><div class="kv"><dt>params</dt><dd>${esc(fmtObject(n.params))}</dd></div><div class="kv"><dt>metrics</dt><dd>${esc(fmtObject(n.metrics))}</dd></div></dl><div class="stack"><button class="primary" data-action="step">→ next phase</button><button data-action="select-next">select next node</button></div></section><section class="frame"><h2>ADAPTER / CONTRACT</h2><div class="kv"><dt>source</dt><dd>window.SACRA_TOPOLOGY_BOOT or SacraTopology.setData()</dd></div><div class="kv"><dt>template</dt><dd>data/topology.template.json</dd></div><div class="kv"><dt>schema</dt><dd>data/topology.schema.json</dd></div></section>`}
function topologyView(){return `${metrics()}<div class="overview"><div><section class="frame" data-active="true"><h2>EXECUTION GRAPH / DYNAMIC STATES</h2><div class="graph-wrap">${edgeSVG()}<aside class="architect-rail">${architectHTML()}</aside><div class="topology"><div class="branch-label a">forks · max_threads ${esc(state.data.runtime.maxThreads??'{{runtime.maxThreads}}')}</div><div class="branch-label b">merge · results → verify</div><div class="row root">${nodeHTML(slot('main'))}</div><div class="row router">${nodeHTML(slot('router'))}</div><div class="row workers">${nodeHTML(slot('worker1'))}${nodeHTML(slot('worker2'))}${nodeHTML(slot('worker3'))}</div><div class="row review">${nodeHTML(slot('review'))}</div></div></div>${eventLog(5)}</section></div><aside class="inspector">${inspector()}</aside></div>`}
function eventsView(){return `${metrics()}<section class="frame" data-active="true"><h2>SESSION EVENTS / LIVE DEMO</h2>${eventLog(24)}<div class="stack"><button class="primary" data-action="step">+1 synthetic phase</button></div></section>`}
const bindings=[['session.id','run/session id'],['runtime.maxThreads','thread ceiling'],['nodes[].model.name','model id/name'],['nodes[].model.provider','provider/backend'],['nodes[].model.effort','reasoning effort'],['nodes[].params','free-form params object'],['nodes[].metrics','tokens/calls/latency/cost/etc'],['nodes[].state','idle/queued/running/done/error/...'],['events[]','append-only runtime feed'],['extra','anything project-specific']];
function bindingsView(){return `<div class="binding-grid"><section class="frame" data-active="true"><h2>PLACEHOLDER SLOTS / STABLE CONTRACT</h2><table class="binding-table"><thead><tr><th>path</th><th>purpose</th></tr></thead><tbody>${bindings.map(([a,b])=>`<tr><td><code>{{${a}}}</code></td><td>${b}</td></tr>`).join('')}</tbody></table></section><section class="frame"><h2>RUNTIME API / NO FRAMEWORK</h2><pre class="t-code" data-scroll-key="code">// direct data\nSacraTopology.setData(payload)\n\n// async adapter\nawait SacraTopology.useAdapter(async () => {\n  return await yourClient.getAgentRun()\n})\n\n// hydrate placeholder JSON\nconst ready = SacraTopology.hydrateTemplate(template, values)\nSacraTopology.setData(ready)\n\n// source may be Codex, OpenCode, your agent, logs, WS/SSE bridge, etc.</pre></section></div>`}
function specView(){return `<section class="frame" data-active="true"><h2>COMPONENT SPEC / PORTABLE TOPOLOGY</h2><div class="kv"><dt>geometry</dt><dd>fixed SACRA TUI slots + orthogonal edges</dd></div><div class="kv"><dt>responsive</dt><dd>column presets reflow; narrow mode hides secondary panes; font size is unchanged</dd></div><div class="kv"><dt>preview zoom</dt><dd>70/80/90/100% browser-lab scale; not a native terminal typography rule</dd></div><div class="kv"><dt>animation</dt><dd>data state → active nodes/edges; play/pause/step/speed; reduced-motion starts paused</dd></div><div class="kv"><dt>data source</dt><dd>plain object, placeholder template, or async adapter function</dd></div><div class="kv"><dt>extensibility</dt><dd>params / metrics / extra accept project-specific payloads</dd></div><div class="kv"><dt>themes</dt><dd>semantic colors only; no geometry changes</dd></div></section>`}
let renderedView=null;
function render(){
 const saved=rememberScroll();
 const html=state.view==='topology'?topologyView():state.view==='events'?eventsView():state.view==='bindings'?bindingsView():specView();
 if(renderedView!==state.view){
  // Only a deliberate view change mounts a new screen, never an animation tick.
  screen.innerHTML=html;renderedView=state.view;
 }else patchMarkup(screen,html);
 $$('[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===state.view?'page':'false'));
 $('#breadcrumb').textContent=`sacra://agents/${state.data.session.id||'—'}/${state.view}`;
 $('#phase-label').textContent=isDemo()?`phase ${String(state.phase+1).padStart(2,'0')} / ${phases[state.phase].name}`:'ADAPTER / source states';
 $('#status-right').textContent=`${state.data.nodes.length} NODES · ${state.data.session.source||'adapter'} · ${state.playing?'ANIMATING':'PAUSED'}`;
 observeEdges();restoreScroll(saved);
}
// A single delegated handler survives data updates and view changes.
screen.addEventListener('click',e=>{
 const control=e.target.closest('[data-node],[data-action]');if(!control)return;
 if(control.hasAttribute('data-node'))select(control.dataset.node,true);
 else if(control.dataset.action==='step')step();
 else if(control.dataset.action==='select-next')move(1);
});
function select(id,focus=false){state.selected=id;render();if(focus)$(`[data-node="${CSS.escape(String(id))}"]`)?.focus({preventScroll:true})}
function move(dir){const list=state.data.nodes.map(n=>n.id);if(!list.length)return;let i=list.indexOf(state.selected);i=(i+dir+list.length)%list.length;select(list[i],true)}
function applyPhase(log=true){const p=phases[state.phase];if(log&&p.event)eventPush(p.event[0],p.event[1],p.event[2],state.phase===7?'good':'accent');render()}
function step(){if(!isDemo())return;state.phase=(state.phase+1)%phases.length;applyPhase(true)}function reset(){state.phase=0;if(isDemo())state.data.events=[];applyPhase(false)}
function schedule(){clearInterval(state.timer);state.timer=null;if(!state.playing)return;state.timer=setInterval(step,Math.max(350,1500/state.speed))}
function play(v=!state.playing){state.playing=!!v&&isDemo();terminal.classList.toggle('animation-paused',!state.playing);$('#play').textContent=state.playing?'Ⅱ PAUSE':'▶ PLAY';$('#live-indicator').textContent=state.playing?'● RUNNING':'○ PAUSED';$('#live-indicator').classList.toggle('paused',!state.playing);schedule();render()}
function setSpeed(v){state.speed=Number(v)||1;terminal.style.setProperty('--anim-speed',state.speed);$$('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.speed)===state.speed)));schedule()}
function settleLayout(){
 drawEdges();cancelAnimationFrame(state.layoutRaf);
 state.layoutRaf=requestAnimationFrame(()=>{state.layoutRaf=0;render()});
}
function setScale(v){state.scale=Math.max(.7,Math.min(1,Number(v)||1));terminal.style.zoom=String(state.scale);$$('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.scale)===state.scale)));settleLayout()}
function setWidth(v){state.width=v;terminal.style.width=v==='auto'?'100%':v+'ch';$$('[data-width]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.width===String(v))));settleLayout()}
function setView(v){if(!['topology','events','bindings','spec'].includes(v))return;state.view=v;render();terminal.focus({preventScroll:true})}
function setData(input){
 const previousSession=state.data.session?.id;
 state.data=normalise(input);if(!isDemo()){clearInterval(state.timer);state.timer=null;state.playing=false;terminal.classList.add('animation-paused');$('#play').textContent='ADAPTER';$('#live-indicator').textContent='○ ADAPTER';}
 if(!state.data.nodes.some(n=>n.id===state.selected))state.selected=state.data.nodes[0]?.id||'';
 if(state.data.session.id!==previousSession)state.phase=0;
 for(const id of ['play','step','reset'])$('#'+id).disabled=!isDemo();
 // Adapter refreshes retain their supplied events and the selected surviving node.
 // reset() remains the explicit action for clearing the synthetic event history.
 render();
 $('#session-label').textContent=`run ${state.data.session.id||'—'} · ${state.data.session.label||state.data.session.source||'adapter'}`;
 return snapshot();
}
async function useAdapter(adapter){if(typeof adapter!=='function')throw new TypeError('adapter must be a function returning topology data');const payload=await adapter();return setData(payload)}
function snapshot(){return clone({state:{view:state.view,selected:state.selected,phase:state.phase,playing:state.playing,speed:state.speed,scale:state.scale,width:state.width},data:state.data})}
const THEME_KEY='sacra-agent-topology-dynamic-theme';function themeSaved(){try{return localStorage.getItem(THEME_KEY)||'sacra'}catch(_){return'sacra'}}function setTheme(id,persist=true){const t=SacraThemes.apply(id);state.theme=t.id;$$('[data-theme-name]').forEach(x=>x.textContent=t.name);$('#theme-note').textContent=t.note+' · semantic color roles only';if(persist)try{localStorage.setItem(THEME_KEY,t.id)}catch(_){};renderThemeList()}
function renderThemeList(){if(!window.SacraThemes)return;$('#theme-list').innerHTML=SacraThemes.all.map(t=>`<button class="theme-option" data-theme="${t.id}" aria-current="${t.id===state.theme}"><span>${t.id===state.theme?'●':'○'}</span><span>${t.name}</span><span class="swatches">${['canvas','text','accent','success','danger'].map(k=>`<i style="--sw:${t.colors[k]}"></i>`).join('')}</span></button>`).join('');$$('[data-theme]').forEach(b=>b.onclick=()=>{setTheme(b.dataset.theme,false);$('[data-theme="'+b.dataset.theme+'"]')?.focus({preventScroll:true})})}
function openThemes(){state.previewTheme=state.theme;renderThemeList();pop.hidden=false;setTimeout(()=>$('#theme-list .theme-option[aria-current=true]')?.focus({preventScroll:true}),0)}function closeThemes(apply){if(!apply&&state.previewTheme)setTheme(state.previewTheme,false);if(apply)try{localStorage.setItem(THEME_KEY,state.theme)}catch(_){};state.previewTheme=null;pop.hidden=true;terminal.focus({preventScroll:true})}
$('#theme-open').onclick=openThemes;$('#theme-key').onclick=openThemes;$('#theme-x').onclick=()=>closeThemes(false);$('#theme-apply').onclick=()=>closeThemes(true);$('#play').onclick=()=>play();$('#step').onclick=step;$('#reset').onclick=reset;$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$$('[data-speed]').forEach(b=>b.onclick=()=>setSpeed(b.dataset.speed));$$('[data-scale]').forEach(b=>b.onclick=()=>setScale(b.dataset.scale));$$('[data-width]').forEach(b=>b.onclick=()=>setWidth(b.dataset.width));
document.addEventListener('keydown',e=>{if(!pop.hidden){if(e.key==='Escape'){e.preventDefault();closeThemes(false);return}if(e.key==='Enter'&&e.target.matches('[data-theme]')){e.preventDefault();closeThemes(true);return}if(['ArrowDown','ArrowUp'].includes(e.key)&&e.target.matches('[data-theme]')){e.preventDefault();const a=$$('[data-theme]'),i=a.indexOf(e.target),n=(i+(e.key==='ArrowDown'?1:a.length-1))%a.length;a[n].click()}return}if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea,select'))return;if(e.key>='1'&&e.key<='4'){e.preventDefault();setView(['topology','events','bindings','spec'][Number(e.key)-1]);return}if(e.key==='t'){e.preventDefault();openThemes();return}if(e.code==='Space'&&e.target.closest('.terminal')){e.preventDefault();play();return}if(e.key==='ArrowRight'&&e.target.closest('.terminal')){e.preventDefault();step();return}if(['+','='].includes(e.key)){e.preventDefault();setScale(Math.min(1,state.scale+.1));return}if(e.key==='-'){e.preventDefault();setScale(Math.max(.7,state.scale-.1));return}if(state.view==='topology'&&e.target.closest('.terminal')&&(e.key==='j'||(e.key==='ArrowDown'&&e.target.closest('[data-node]')))){e.preventDefault();move(1)}if(state.view==='topology'&&e.target.closest('.terminal')&&(e.key==='k'||(e.key==='ArrowUp'&&e.target.closest('[data-node]')))){e.preventDefault();move(-1)}if(e.key==='Escape'&&e.target.closest('.terminal'))terminal.focus({preventScroll:true})});
setInterval(()=>{$('#clock').textContent=new Date().toLocaleTimeString('ru-RU',{hour12:false})},1000);
window.addEventListener('resize',drawEdges);
if(document.fonts)document.fonts.addEventListener('loadingdone',drawEdges);
setTheme(themeSaved(),false);setSpeed(1);setScale(1);setWidth('auto');setData(window.SACRA_TOPOLOGY_BOOT?.data||demo);if(window.SACRA_TOPOLOGY_BOOT?.adapter)useAdapter(window.SACRA_TOPOLOGY_BOOT.adapter).catch(e=>eventPush('adapter',e.message,'[ERR]','bad'));play(state.playing);
window.SacraTopology={version:'0.3.3-sdk-reference',refreshLayout:drawEdges,state,setData,useAdapter,hydrateTemplate,snapshot,setScale,setWidth,setSpeed,play,pause:()=>play(false),step,reset,setTheme,setView};
})();
