/* SACRA Charts 1.4.0 — plain SVG, synthetic-data-free core.
 * mount(element, {type,title,unit,data,series?,nodes?}). update(data), sort(),
 * toSVG(), toJSON(), toCSV(), destroy(). No chart dependencies, no network.
 */
(function(global){
'use strict';
const NS='http://www.w3.org/2000/svg';
const COLORS={accent:'#F2CC4D',muted:'#9BA3AE',text:'#F2F4F6',success:'#45BF92',danger:'#EF7B6D',border:'#414B58',surface:'#1B2027',raised:'#222831'};
const TYPES=['line','bar','stacked','candlestick','scatter','radar','heatmap','donut','gauge','sankey','treemap','sparkline'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const fmt=x=>Number.isInteger(x)?String(x):Number(x).toFixed(1);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
class Chart {
 constructor(host,options){
  if(!(host instanceof HTMLElement))throw new TypeError('Chart host must be an HTMLElement.');
  if(!options||!TYPES.includes(options.type))throw new TypeError('Unsupported chart type.');
  this.host=host;this.options={...options};this.data=Array.isArray(options.data)?structuredClone(options.data):[];
  this.hidden=new Set();this.selected=-1;this.id='sc-'+Math.random().toString(36).slice(2,9);this.colors={...COLORS};
  const style=getComputedStyle(host);for(const k of Object.keys(COLORS)){const val=style.getPropertyValue('--s-color-'+(k==='border'?'border-strong':k)).trim();if(val)this.colors[k]=val;}
  host.classList.add('s-chart');host.innerHTML='<div class="s-chart__plot"></div><div class="s-chart__legend" aria-label="Легенда"></div><div class="s-chart__readout" aria-live="polite">Наведи курсор или выбери точку клавишей Tab.</div><div class="s-chart__tooltip" role="tooltip" hidden></div>';
  this.plot=host.querySelector('.s-chart__plot');this.legend=host.querySelector('.s-chart__legend');this.readout=host.querySelector('.s-chart__readout');this.tip=host.querySelector('.s-chart__tooltip');
  this.abort=new AbortController();const signal=this.abort.signal;
  host.addEventListener('pointerover',e=>{const p=e.target.closest('[data-point]');if(p)this.inspect(Number(p.dataset.point),e);},{signal});
  host.addEventListener('pointermove',e=>{const p=e.target.closest('[data-point]');if(p)this.positionTip(e);},{signal});
  host.addEventListener('pointerleave',()=>{this.tip.hidden=true;},{signal});
  host.addEventListener('focusin',e=>{const p=e.target.closest('[data-point]');if(p)this.inspect(Number(p.dataset.point));},{signal});
  host.addEventListener('click',e=>{const p=e.target.closest('[data-point]');if(p){this.selected=Number(p.dataset.point);this.inspect(this.selected);this.plot.querySelectorAll('[data-point]').forEach(el=>el.classList.toggle('is-selected',Number(el.dataset.point)===this.selected));}},{signal});
  host.addEventListener('keydown',e=>{const p=e.target.closest('[data-point]');if(!p)return;const list=[...this.plot.querySelectorAll('[data-point]')],i=list.indexOf(p);
   if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;list[next]?.focus();}
   if(e.key==='Enter'||e.key===' '){e.preventDefault();p.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
   if(e.key==='Escape')this.tip.hidden=true;
  },{signal});
  this.render();
 }
 text(x,y,value,attrs=''){return `<text x="${x}" y="${y}" ${attrs}>${esc(value)}</text>`;}
 point(i,label){return `data-point="${i}" tabindex="0" role="button" aria-label="${esc(label)}"`;}
 seg(x1,y1,x2,y2,attrs=''){return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;}
 describe(row){return Object.entries(row||{}).map(([k,v])=>`${k}: ${typeof v==='number'?fmt(v):v}`).join(' · ')+(this.options.unit?' · '+this.options.unit:'');}
 inspect(i,event){const row=this.data[i];if(!row)return;const value=this.describe(row);this.readout.textContent=value;this.tip.textContent=value;
  if(event){this.tip.hidden=false;this.positionTip(event);}else this.tip.hidden=true;
 }
 positionTip(e){const r=this.host.getBoundingClientRect();this.tip.style.left=clamp(e.clientX-r.left+12,8,r.width-Math.min(280,r.width-16)-8)+'px';this.tip.style.top=clamp(e.clientY-r.top-50,4,r.height-50)+'px';}
 axes(max,xLabels=[],xTitle='Время',yTitle=this.options.unit||'Значение',min=0){
  const c=this.colors;let out='';for(let i=0;i<=4;i++){let y=208-i*41;out+=this.seg(55,y,604,y,`stroke="${c.border}" stroke-dasharray="3 6"`)+this.text(44,y+4,fmt(min+(max-min)*i/4),'text-anchor="end"');}
  xLabels.forEach((label,i)=>out+=this.text(55+i*549/Math.max(1,xLabels.length-1),231,label,'text-anchor="middle"'));
  out+=this.text(55,19,yTitle,`fill="${c.text}"`)+this.text(604,260,xTitle,'text-anchor="end"');return out;
 }
 render(){
  this.tip.hidden=true;this.selected=-1;this.legend.innerHTML='';const c=this.colors,o=this.options,unit=o.unit||'';
  let parts='';const attrs=`fill="${c.muted}" font-family="monospace" font-size="11"`;
  if(!this.data.length)parts=this.text(320,132,'Нет данных','text-anchor="middle"');
  else parts=this[o.type]();
  this.plot.innerHTML=`<svg xmlns="${NS}" viewBox="0 0 640 280" role="group" aria-labelledby="${this.id}-title" ${attrs}><title id="${this.id}-title">${esc(o.title||o.type)}${unit?' ('+esc(unit)+')':''}</title><desc>Стрелки перемещают фокус по точкам. Значения также доступны в таблице данных.</desc>${parts}</svg>`;
  this.renderLegend();this.readout.textContent=this.data.length?`${this.data.length} записей · ${o.description||'Данные доступны в таблице под графиком.'}`:'Нет данных для отображения.';
  this.host.dispatchEvent(new CustomEvent('sacra:chart-render',{detail:{type:o.type,rows:this.data.length},bubbles:true}));
 }
 renderLegend(){
  const o=this.options;let series=o.series||[];
  if(o.type==='candlestick')series=[{key:'up',label:'Закрытие ≥ открытия',color:'success'},{key:'down',label:'Закрытие < открытия',color:'danger'}];
  if(o.type==='scatter')series=[{key:'pass',label:'В пределах порога',color:'accent'},{key:'review',label:'Требует проверки',color:'danger'}];
  if(o.type==='gauge')series=[{key:'value',label:'Значение',color:'accent'},{key:'limit',label:'Порог 85%',color:'danger'}];
  for(const s of series){const interactive=['line','stacked'].includes(o.type);let el=document.createElement(interactive?'button':'span');el.className='s-chart__legend-item';
   if(interactive){el.type='button';el.setAttribute('aria-pressed',String(!this.hidden.has(s.key)));el.addEventListener('click',()=>{this.hidden.has(s.key)?this.hidden.delete(s.key):this.hidden.add(s.key);this.render();const btns=[...this.legend.querySelectorAll('button')];btns[series.indexOf(s)]?.focus();});}
   el.innerHTML=`<i style="background:${this.colors[s.color]||this.colors.accent};${s.dash?'border-bottom:1px dashed currentColor;background:transparent;':''}"></i><span>${esc(s.label)}</span>`;this.legend.append(el);}
 }
 line(){
  const c=this.colors,rows=this.data,series=(this.options.series||[{key:'value',label:'Значение',color:'accent'}]).filter(s=>!this.hidden.has(s.key));
  const max=Math.max(10,...rows.flatMap(r=>series.map(s=>num(r[s.key]))))*1.12;
  const px=i=>55+i*549/Math.max(1,rows.length-1),py=v=>208-num(v)/max*164;
  let out=this.axes(Math.ceil(max),[rows[0].label,rows[Math.floor(rows.length/2)].label,rows.at(-1).label],this.options.xTitle||'Время');
  const trueMax=Math.ceil(max); const y=v=>208-num(v)/trueMax*164;
  for(const [si,s] of series.entries()) {const d=rows.map((r,i)=>(i?'L':'M')+px(i)+','+y(r[s.key])).join('');
   if(si===0)out+=`<path d="${d}L604,208L55,208Z" fill="${c[s.color]||c.accent}" opacity=".07"/>`;
   out+=`<path d="${d}" stroke="${c[s.color]||c.accent}" stroke-width="1.8" fill="none" ${s.dash?'stroke-dasharray="5 5"':''}/>`;
   out+=rows.map((r,i)=>`<circle cx="${px(i)}" cy="${y(r[s.key])}" r="4" fill="${c.surface}" stroke="${c[s.color]||c.accent}" stroke-width="1.7" ${this.point(i,this.describe(r))}/>`).join('');}
  if(!series.length)out+=this.text(320,120,'Все серии скрыты','text-anchor="middle"');return out;
 }
 bar(){
  const c=this.colors,r=this.data,max=Math.ceil(Math.max(1,...r.map(x=>num(x.value)))*1.15),n=r.length,bw=Math.min(58,430/n),dx=549/n;
  let out=this.axes(max,[],this.options.xTitle||'Категория');r.forEach((d,i)=>{const h=num(d.value)/max*164,x=55+dx*(i+.5)-bw/2;out+=`<rect x="${x}" y="${208-h}" width="${bw}" height="${Math.max(0,h)}" fill="${c.accent}" opacity=".68" ${this.point(i,this.describe(d))}/>`+this.text(x+bw/2,200-h,fmt(num(d.value)),`text-anchor="middle" fill="${c.text}"`)+this.text(x+bw/2,231,d.label,'text-anchor="middle"');});return out;
 }
 stacked(){
  const c=this.colors,r=this.data,series=(this.options.series||[]).filter(s=>!this.hidden.has(s.key));
  const max=Math.ceil(Math.max(1,...r.map(d=>series.reduce((a,s)=>a+Math.max(0,num(d[s.key])),0)))*1.15),dx=549/r.length,bw=Math.min(52,dx*.6);
  let out=this.axes(max,[],'День');r.forEach((d,i)=>{let base=208;series.forEach(s=>{let h=Math.max(0,num(d[s.key]))/max*164;out+=`<rect x="${55+dx*(i+.5)-bw/2}" y="${base-h}" width="${bw}" height="${h}" fill="${c[s.color]||c.accent}" opacity=".82" ${this.point(i,this.describe(d))}/>`;base-=h;});out+=this.text(55+dx*(i+.5),231,d.label,'text-anchor="middle"');});return out;
 }
 candlestick(){
  const c=this.colors,r=this.data,min=Math.floor(Math.min(...r.map(d=>num(d.low)))-3),max=Math.ceil(Math.max(...r.map(d=>num(d.high)))+3),y=v=>208-(num(v)-min)/(max-min)*164,dx=549/r.length,bw=Math.min(25,dx*.52);
  let out=this.axes(max,[],this.options.xTitle||'Период',this.options.unit||'Условный индекс',min);
  r.forEach((d,i)=>{const x=55+dx*(i+.5),co=num(d.close)>=num(d.open)?c.success:c.danger;
   out+=`<g ${this.point(i,this.describe(d))}>${this.seg(x,y(d.high),x,y(d.low),`stroke="${co}" stroke-width="1.2"`)}<rect x="${x-bw/2}" y="${Math.min(y(d.open),y(d.close))}" width="${bw}" height="${Math.max(1,Math.abs(y(d.open)-y(d.close)))}" fill="${num(d.close)>=num(d.open)?c.surface:co}" stroke="${co}" stroke-width="1.5"/></g>`;
   if(i%2===0)out+=this.text(x,231,d.label,'text-anchor="middle"');});return out;
 }
 scatter(){
  const c=this.colors,r=this.data,xMax=Math.ceil(Math.max(1,...r.map(d=>num(d.x)))*1.12),yMax=Math.ceil(Math.max(1,...r.map(d=>num(d.y)))*1.15),py=v=>208-v/yMax*164;
  let out=this.axes(yMax,[0,fmt(xMax/2),xMax],this.options.xTitle||'Объём, МБ',this.options.unit||'Время, мс');
  const threshold=num(this.options.threshold||70);if(threshold<yMax)out+=this.seg(55,py(threshold),604,py(threshold),`stroke="${c.danger}" stroke-dasharray="5 5"`)+this.text(600,py(threshold)-7,'порог '+threshold,'text-anchor="end"');
  r.forEach((d,i)=>{const x=55+num(d.x)/xMax*549,y=py(num(d.y)),co=d.status==='review'?c.danger:c.accent;
   out+=d.status==='review'?`<path d="M${x} ${y-6}L${x+6} ${y}L${x} ${y+6}L${x-6} ${y}Z" fill="${co}" ${this.point(i,this.describe(d))}/>`:`<circle cx="${x}" cy="${y}" r="4.5" fill="${c.surface}" stroke="${co}" stroke-width="1.6" ${this.point(i,this.describe(d))}/>`;});return out;
 }
 radar(){
  const c=this.colors,r=this.data,n=r.length,cx=320,cy=138,rad=88,coord=(i,radius)=>[cx+Math.cos(-Math.PI/2+i*Math.PI*2/n)*radius,cy+Math.sin(-Math.PI/2+i*Math.PI*2/n)*radius];
  let out='';for(let level=1;level<=4;level++)out+=`<polygon points="${r.map((_,i)=>coord(i,rad*level/4).join(',')).join(' ')}" fill="none" stroke="${c.border}" stroke-dasharray="${level===4?'0':'3 6'}"/>`;
  r.forEach((d,i)=>{const [x,y]=coord(i,rad),[tx,ty]=coord(i,rad+22);out+=this.seg(cx,cy,x,y,`stroke="${c.border}"`)+this.text(tx,ty+4,d.label,`text-anchor="${Math.abs(tx-cx)<4?'middle':tx>cx?'start':'end'}"`);});
  out+=`<polygon points="${r.map((d,i)=>coord(i,rad*clamp(num(d.value),0,100)/100).join(',')).join(' ')}" fill="${c.accent}" fill-opacity=".07" stroke="${c.accent}" stroke-width="1.7"/>`;
  r.forEach((d,i)=>{const [x,y]=coord(i,rad*clamp(num(d.value),0,100)/100);out+=`<circle cx="${x}" cy="${y}" r="4" fill="${c.accent}" ${this.point(i,this.describe(d))}/>`;});out+=this.text(590,264,'Шкала 0–100','text-anchor="end"');return out;
 }
 heatmap(){
  const c=this.colors,r=this.data,days=[...new Set(r.map(d=>d.day))],hours=[...new Set(r.map(d=>d.hour))],max=Math.max(1,...r.map(d=>num(d.value))),cw=520/hours.length,ch=170/days.length;
  let out=this.text(62,20,'Активность / задач');r.forEach((d,i)=>{const x=62+hours.indexOf(d.hour)*cw,y=38+days.indexOf(d.day)*ch;out+=`<rect x="${x}" y="${y}" width="${cw-4}" height="${ch-4}" fill="${c.accent}" fill-opacity="${.06+.84*num(d.value)/max}" stroke="${c.border}" stroke-width=".5" ${this.point(i,this.describe(d))}/>`;});
  days.forEach((d,i)=>out+=this.text(48,38+ch*(i+.6),d,'text-anchor="end"'));hours.forEach((d,i)=>out+=this.text(62+cw*(i+.45),229,d,'text-anchor="middle"'));
  for(let k=0;k<5;k++)out+=`<rect x="${474+k*23}" y="249" width="20" height="8" fill="${c.accent}" opacity="${.06+.84*k/4}"/>`;
  out+=this.text(459,257,'0','text-anchor="end"')+this.text(598,257,fmt(max));return out;
 }
 donut(){
  const c=this.colors,r=this.data,total=r.reduce((a,d)=>a+Math.max(0,num(d.value)),0),cx=182,cy=135,rad=80,thick=27,circ=2*Math.PI*rad;
  let offset=0,out=`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${c.border}" stroke-width="${thick}"/>`;
  const cols=[c.accent,c.muted,c.text,c.border,c.raised];
  r.forEach((d,i)=>{const share=total?Math.max(0,num(d.value))/total:0,len=share*circ;out+=`<circle cx="${cx}" cy="${cy}" r="${rad}" transform="rotate(-90 ${cx} ${cy})" fill="none" stroke="${cols[i%cols.length]}" stroke-width="${thick}" stroke-dasharray="${Math.max(0,len-3)} ${circ-Math.max(0,len-3)}" stroke-dashoffset="${-offset}" ${this.point(i,this.describe(d))}/>`;offset+=len;
   out+=`<rect x="320" y="${56+i*38}" width="9" height="9" fill="${cols[i%cols.length]}"/>`+this.text(340,65+i*38,d.label)+this.text(581,65+i*38,`${fmt(num(d.value))} / ${(share*100).toFixed(0)}%`,'text-anchor="end"');});
  out+=this.text(cx,139,fmt(total),`text-anchor="middle" font-size="32" fill="${c.text}"`)+this.text(cx,164,this.options.unit||'всего','text-anchor="middle"');return out;
 }
 gauge(){
  const c=this.colors,d=this.data[0],max=Math.max(1,num(d.max)),value=clamp(num(d.value),0,max),ratio=value/max,r=106,cx=320,cy=172,end=Math.PI+ratio*Math.PI,ex=cx+Math.cos(end)*r,ey=cy+Math.sin(end)*r;
  let out=`<path d="M214 172 A106 106 0 0 1 426 172" fill="none" stroke="${c.border}" stroke-width="18"/>`;
  if(value>0)out+=`<path d="M214 172 A106 106 0 0 1 ${ex} ${ey}" fill="none" stroke="${ratio>=.85?c.danger:c.accent}" stroke-width="18" ${this.point(0,this.describe(d))}/>`;
  for(let i=0;i<=10;i++){let a=Math.PI+i*Math.PI/10;out+=this.seg(cx+Math.cos(a)*123,cy+Math.sin(a)*123,cx+Math.cos(a)*130,cy+Math.sin(a)*130,`stroke="${c.muted}"`);}
  let a=Math.PI+Math.PI*.85;out+=this.seg(cx+Math.cos(a)*94,cy+Math.sin(a)*94,cx+Math.cos(a)*120,cy+Math.sin(a)*120,`stroke="${c.danger}" stroke-width="2"`);
  out+=this.text(cx,157,fmt(value),`text-anchor="middle" font-size="40" fill="${c.text}"`)+this.text(cx,183,'из '+max+' '+(this.options.unit||''),'text-anchor="middle"')+this.text(197,205,'0')+this.text(443,205,fmt(max),'text-anchor="end"')+this.text(cx,235,ratio>=.85?'Порог предупреждения превышен':'Ниже порога предупреждения','text-anchor="middle"');return out;
 }
 sankey(){
  const c=this.colors,edges=this.data,nodes=structuredClone(this.options.nodes||[]);if(!nodes.length)return this.text(320,130,'Для Sankey нужны nodes','text-anchor="middle"');
  let maxDepth=Math.max(...nodes.map(n=>num(n.depth)));nodes.forEach(n=>{n.input=edges.filter(e=>e.target===n.id).reduce((a,e)=>a+num(e.value),0);n.output=edges.filter(e=>e.source===n.id).reduce((a,e)=>a+num(e.value),0);n.value=Math.max(n.input,n.output);});
  let scale=Infinity;for(let depth=0;depth<=maxDepth;depth++){let col=nodes.filter(n=>n.depth===depth),sum=col.reduce((a,n)=>a+n.value,0);if(sum)scale=Math.min(scale,(174-Math.max(0,col.length-1)*17)/sum);}if(!Number.isFinite(scale))scale=1;
  for(let depth=0;depth<=maxDepth;depth++){const col=nodes.filter(n=>n.depth===depth);let y=42;col.forEach(n=>{n.x=50+(depth/Math.max(1,maxDepth))*454;n.y=y;n.h=n.value*scale;n.src=0;n.dst=0;y+=n.h+17;});}
  let out='';edges.forEach((e,i)=>{const s=nodes.find(n=>n.id===e.source),t=nodes.find(n=>n.id===e.target);if(!s||!t)return;let h=num(e.value)*scale,x1=s.x+10,x2=t.x,y1=s.y+s.src,y2=t.y+t.dst,m=(x1+x2)/2;s.src+=h;t.dst+=h;out+=`<path d="M${x1} ${y1}C${m} ${y1},${m} ${y2},${x2} ${y2}L${x2} ${y2+h}C${m} ${y2+h},${m} ${y1+h},${x1} ${y1+h}Z" fill="${c[t.color]||c.accent}" fill-opacity=".16" stroke="${c[t.color]||c.accent}" stroke-opacity=".38" stroke-width=".7" ${this.point(i,this.describe(e))}/>`;});
  nodes.forEach(n=>{out+=`<rect x="${n.x}" y="${n.y}" width="10" height="${Math.max(1,n.h)}" fill="${c[n.color]||c.accent}"/>`;
   if(n.depth===maxDepth)out+=this.text(n.x+17,n.y+n.h/2+4,n.label||n.id,`font-size="10"`)+this.text(n.x+17,n.y+n.h/2+17,fmt(n.value),`fill="${c.text}" font-size="10"`);
   else out+=this.text(n.x,n.y-12,(n.label||n.id)+' / '+fmt(n.value),'font-size="10"');});out+=this.text(50,257,'Ширина потока пропорциональна количеству');return out;
 }
 treemap(){
  const c=this.colors,rows=this.data.map((d,i)=>({...d,index:i})).filter(d=>num(d.value)>0).sort((a,b)=>b.value-a.value),total=rows.reduce((a,d)=>a+num(d.value),0);let out='';
  const partition=(list,x,y,w,h)=>{if(!list.length)return;if(list.length===1){const d=list[0],alpha=.08+.32*(d.index%5)/4;out+=`<g ${this.point(d.index,this.describe(d))}><rect x="${x+2}" y="${y+2}" width="${Math.max(0,w-4)}" height="${Math.max(0,h-4)}" fill="${c.accent}" fill-opacity="${alpha}" stroke="${c.accent}" stroke-opacity=".55"/>`;
    if(w>64&&h>40)out+=this.text(x+12,y+24,d.label,`fill="${c.text}" font-size="11"`)+this.text(x+12,y+42,fmt(d.value)+' '+(this.options.unit||''),'font-size="10"');out+='</g>';return;}
   const sum=list.reduce((a,d)=>a+num(d.value),0);let accum=0,split=1;for(let i=0;i<list.length-1;i++){accum+=num(list[i].value);split=i+1;if(accum>=sum/2)break;}const ratio=accum/sum;
   if(w>=h){partition(list.slice(0,split),x,y,w*ratio,h);partition(list.slice(split),x+w*ratio,y,w*(1-ratio),h);}else{partition(list.slice(0,split),x,y,w,h*ratio);partition(list.slice(split),x,y+h*ratio,w,h*(1-ratio));}
  };
  partition(rows,32,26,576,206);out+=this.text(32,257,'Площадь ∝ объёму · всего '+fmt(total)+' '+(this.options.unit||''));return out;
 }
 sparkline(){
  const c=this.colors,r=this.data,max=Math.max(1,...r.map(d=>num(d.value)))*1.12,min=0,y=v=>210-num(v)/max*135;
  const path=r.map((d,i)=>(i?'L':'M')+(35+i*570/Math.max(1,r.length-1))+','+y(d.value)).join('');
  let out=this.text(35,32,'ПОСЛЕДНЕЕ ЗНАЧЕНИЕ','font-size="10"')+this.text(35,70,fmt(num(r.at(-1).value))+' '+(this.options.unit||''),`font-size="30" fill="${c.text}"`)+`<path d="${path}L605 225L35 225Z" fill="${c.accent}" opacity=".06"/><path d="${path}" fill="none" stroke="${c.accent}" stroke-width="2"/>`;
  r.forEach((d,i)=>out+=`<circle cx="${35+i*570/Math.max(1,r.length-1)}" cy="${y(d.value)}" r="4" fill="${c.surface}" stroke="${c.accent}" ${this.point(i,this.describe(d))}/>`);out+=this.text(35,252,r[0].label)+this.text(605,252,r.at(-1).label,'text-anchor="end"');return out;
 }
 update(data){if(!Array.isArray(data))throw new TypeError('Chart data must be an array');this.data=structuredClone(data);this.render();return this;}
 sort(){this.data.sort((a,b)=>num(b.value)-num(a.value));this.render();return this;}
 toJSON(){return JSON.stringify({...this.options,data:this.data},null,2);}
 toCSV(){const keys=[...new Set(this.data.flatMap(r=>Object.keys(r)))];const cell=v=>{let s=String(v??'');if(typeof v!=='number'&&/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};return [keys.map(cell).join(','),...this.data.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');}
 toSVG(){const svg=this.plot.querySelector('svg').cloneNode(true);svg.setAttribute('width','1280');svg.setAttribute('height','560');svg.setAttribute('role','img');const rect=document.createElementNS(NS,'rect');rect.setAttribute('width','640');rect.setAttribute('height','280');rect.setAttribute('fill',this.colors.surface);svg.insertBefore(rect,svg.firstChild);svg.querySelectorAll('[tabindex]').forEach(n=>{n.removeAttribute('tabindex');n.removeAttribute('role');});return new XMLSerializer().serializeToString(svg);}
 destroy(){this.abort.abort();this.host.replaceChildren();this.host.classList.remove('s-chart');}
}
global.SacraCharts={mount:(element,options)=>new Chart(element,options),types:TYPES,version:'1.4.0'};
})(window);
