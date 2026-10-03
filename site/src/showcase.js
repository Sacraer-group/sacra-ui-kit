/* Wiring for the documentation only. Libraries are independently reusable. */
(function(g){'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],{esc,copy,download,notify}=SacraUtils;
const app={charts:new Map(),motion:null,previews:[],workspace:null};g.SacraDemo=app;
function metrics(s){
 $('#wasm-status').textContent=s.engine==='wasm'?'WASM · ACTIVE':s.engine==='error'?'WASM · ERROR':'WASM · ЗАГРУЗКА';
 $('#motion-state').textContent=s.engine==='error'?(s.error||'Ошибка WASM'):!s.playing?'На паузе':!s.active?'Автопауза вне экрана':'Анимация активна';
 $('#actual-fps').textContent=s.active&&s.fps?Math.round(s.fps)+' fps':'—';
 $('#compute-ms').textContent=s.engine==='wasm'?s.computeMs.toFixed(2)+' мс':'—';
 $('#vertex-count').textContent=s.vertices.toLocaleString('ru-RU');
 $('#linear-memory').textContent=s.memoryBytes?Math.round(s.memoryBytes/1024)+' КиБ':'—';
 $('#motion-play').textContent=s.playing?'Ⅱ Пауза':'▶ Запустить';$('#motion-play').setAttribute('aria-pressed',String(s.playing));
}
if($('#motion-main')){
 app.motion=SacraMotion.mount($('#motion-main'),{onStats:metrics});
 const hero=SacraMotion.mount($('#hero-motion'),{density:22,speed:.32,interactive:false});app.hero=hero;
 $('#hero-pause').addEventListener('click',()=>{hero.playing?hero.pause():hero.play();$('#hero-pause').textContent=hero.playing?'Ⅱ Пауза':'▶ Запустить';});
 $('#hero-pause').textContent=hero.playing?'Ⅱ Пауза':'▶ Запустить';
 $$('.ds-preset canvas').forEach(c=>app.previews.push(SacraMotion.mount(c,{mode:Number(c.dataset.preview),density:14,speed:.4,interactive:false,grid:false})));
 $('#motion-play').addEventListener('click',()=>app.motion.playing?app.motion.pause():app.motion.play());
 $('#motion-step').addEventListener('click',()=>app.motion.step());
 const controls={mode:'motion-mode',speed:'motion-speed',density:'motion-density',deformation:'motion-deformation',zoom:'motion-zoom',fpsLimit:'motion-limit'};
 const outputs={speed:'speed-output',density:'density-output',deformation:'deformation-output',zoom:'zoom-output'};
 function syncControls(){const s=app.motion.state();for(const[k,id]of Object.entries(controls)){$('#'+id).value=s[k];if(outputs[k])$('#'+outputs[k]).textContent=k==='speed'?s[k].toFixed(2)+'×':k==='density'?s[k]:Math.round(s[k]*100)+'%';}$('#motion-grid').checked=s.grid;g.SacraControls?.refresh($('#motion-lab'));}
 for(const[k,id]of Object.entries(controls))$('#'+id).addEventListener('input',e=>{app.motion.set({[k]:Number(e.target.value)});syncControls();});
 $('#motion-grid').addEventListener('change',e=>app.motion.set({grid:e.target.checked}));
 $('#motion-reset').addEventListener('click',()=>{app.motion.reset();syncControls();});
 $$('[data-load-preset]').forEach(b=>b.addEventListener('click',()=>{app.motion.set({mode:Number(b.dataset.loadPreset)});syncControls();$('#motion-lab').scrollIntoView({behavior:'instant'});}));
 $('#export-wasm').addEventListener('click',()=>download('geometry.wasm',SacraMotion.wasmBytes(),'application/wasm'));
 $('#export-c').addEventListener('click',()=>{const s=[...document.scripts].find(x=>/src\/showcase\.js(?:$|[?#])/.test(x.src));if(!s)return;const a=document.createElement('a');a.href=new URL('geometry.c',s.src);a.download='geometry.c';a.click();});
 $('#export-motion-svg').addEventListener('click',()=>{try{download('sacra-motion.svg',app.motion.toSVG(),'image/svg+xml');}catch(e){notify(e.message);}});
 $('#export-preset').addEventListener('click',()=>download('motion.preset.json',JSON.stringify(app.motion.state(),null,2),'application/json'));
 SacraMotion.ready.then(info=>{
  $('#binary-size').textContent=(info.bytes/1024).toFixed(1)+' КиБ';$('#wasm-hash').textContent=info.sha256.slice(0,20)+'…';$('#wasm-proof').textContent='geometry.wasm / '+info.bytes+' байт / 0 импортов / ABI 10400';
 }).catch(e=>{const b=$('#motion-error');b.hidden=false;b.textContent='WASM не запущен: '+e.message;});
 syncControls();
}
function fillData(card,chart){const keys=[...new Set(chart.data.flatMap(r=>Object.keys(r)))];card.querySelector('[data-rows]').innerHTML=`<table><caption class="s-sr">Синтетические данные ${esc(chart.options.title)}</caption><thead><tr>${keys.map(k=>'<th scope="col">'+esc(k)+'</th>').join('')}</tr></thead><tbody>${chart.data.map(r=>'<tr>'+keys.map(k=>'<td>'+esc(r[k])+'</td>').join('')+'</tr>').join('')}</tbody></table>`;}
$$('[data-chart-card]').forEach(card=>{
 const type=card.dataset.chartCard;let rev=0;const options=SacraDemoData.spec(type),chart=SacraCharts.mount(card.querySelector('[data-chart]'),options);app.charts.set(type,chart);fillData(card,chart);
 const code='const chart = SacraCharts.mount(\n  document.querySelector("#my-chart"),\n  '+JSON.stringify(options,null,2).replace(/\n/g,'\n  ')+'\n);\n\n// Новые данные: chart.update(rows);\n// Экспорт: chart.toSVG(), chart.toCSV(), chart.toJSON();';
 card.querySelector('[data-chart-code]').textContent=code;
 card.querySelector('[data-chart-copy]').addEventListener('click',e=>copy(code,{trigger:e.currentTarget,message:'JS-пример графика в буфере обмена.'}));
 card.addEventListener('click',e=>{const b=e.target.closest('[data-chart-action]');if(!b)return;switch(b.dataset.chartAction){
  case 'update':rev++;chart.update(SacraDemoData.spec(type,rev).data);fillData(card,chart);if(type==='gauge'){card.querySelector('[data-gauge-input]').value=chart.data[0].value;card.querySelector('output').textContent=chart.data[0].value+'%';}break;
  case 'svg':download(type+'.svg',chart.toSVG(),'image/svg+xml');break;
  case 'json':download(type+'.demo.json',chart.toJSON(),'application/json');break;
  case 'csv':download(type+'.demo.csv','\uFEFF'+chart.toCSV(),'text/csv;charset=utf-8');break;
  case 'sort':chart.sort();fillData(card,chart);break;
 }});
 const gauge=card.querySelector('[data-gauge-input]');if(gauge)gauge.addEventListener('input',e=>{chart.update([{label:'Занятость',value:Number(e.target.value),max:100}]);fillData(card,chart);card.querySelector('output').textContent=e.target.value+'%';});
});
$$('[data-chart-filter]').forEach(b=>b.addEventListener('click',()=>{let visible=0;$$('[data-chart-filter]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));$$('[data-chart-card]').forEach(c=>{c.hidden=b.dataset.chartFilter!=='all'&&c.dataset.group!==b.dataset.chartFilter;if(!c.hidden)visible++;});$('#chart-visible-count').textContent=visible+' / 12 типов';}));
$$('[data-copy-code]').forEach(b=>b.addEventListener('click',()=>copy($('#'+b.dataset.copyCode).textContent,{trigger:b,message:'JS-пример в буфере обмена.'})));
if($('#workspace-demo'))app.workspace=SacraWorkspace.mount($('#workspace-demo'),{persist:true});

function bootWebThemes(){
 const finish=()=>{
  if(!g.SacraThemes||$('#sacra-theme-select'))return;
  const host=$('.ds-top-actions');if(!host)return;
  const wrap=document.createElement('label');wrap.className='sacra-theme-control';
  const caption=document.createElement('span');caption.textContent='THEME';
  const select=document.createElement('select');select.className='s-select';select.id='sacra-theme-select';select.setAttribute('aria-label','Палитра SACRA UI');
  for(const theme of g.SacraThemes.all){const option=document.createElement('option');option.value=theme.id;option.textContent=theme.name;select.append(option);}
  wrap.append(caption,select);host.prepend(wrap);
  const refresh=()=>{
   for(const chart of app.charts.values()){const style=getComputedStyle(chart.host);for(const key of Object.keys(chart.colors)){const role=key==='border'?'border-strong':key,val=style.getPropertyValue('--s-color-'+role).trim();if(val)chart.colors[key]=val;}chart.render();}
   for(const view of [app.motion,app.hero,...app.previews]){if(!view)continue;view.updatePalette?.();view.draw?.();view.report?.();}
  };
  const applied=g.SacraThemes.restore({persist:false});select.value=applied.id;
  select.addEventListener('change',()=>{const theme=g.SacraThemes.apply(select.value,{persist:true});refresh();g.SacraControls?.refresh(select);notify('Палитра: '+theme.name);});
  g.SacraControls?.enhance(wrap);g.SacraControls?.refresh(select);refresh();
  document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.key!=='t'||event.target.matches('input,textarea,select,[contenteditable=true]'))return;event.preventDefault();const control=g.SacraControls?.get(select);if(control){control.button.focus();control.open();}else select.focus();});
 };
 if(g.SacraThemes){finish();return;}
 const source=[...document.scripts].find(node=>/src\/showcase\.js(?:$|[?#])/.test(node.src));if(!source)return;
 const script=document.createElement('script');script.src=new URL('sacra-themes.js',source.src).href;script.onload=finish;script.onerror=()=>console.warn('SACRA themes helper failed to load');document.head.append(script);
}
bootWebThemes();

})(window);