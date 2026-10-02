/* Local-only fixture: no service requests, timers pretending to measure OCR, or credentials. */
(() => {
'use strict';
const $ = selector => document.querySelector(selector);
const el = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const names = {queued:'В очереди',processing:'Обработка',succeeded:'Готово',failed:'Ошибка'};
const tasks = [{id:'demo-001',state:'succeeded',pages:2,stage:'Проверка'}, {id:'demo-002',state:'processing',pages:3,stage:'Таблица'}, {id:'demo-003',state:'queued',pages:1,stage:'Ожидание'}, {id:'demo-004',state:'failed',pages:1,stage:'Проверка формата'}];
let selected='demo-001',filter='all';
function state(task){const n=el('span','s-ops__state',names[task.state]);n.dataset.state=task.state;return n;}
function visible(){return tasks.filter(t=>filter==='all'||(['queued','processing'].includes(t.state)===(filter==='live')));}
function list(){
  const host=$('[data-ops-list]');host.replaceChildren();
  for(const task of visible()){
    const b=el('button','s-ops__task');b.type='button';b.dataset.opsTask=task.id;b.setAttribute('aria-current',String(task.id===selected));
    const row=el('span','s-row');row.append(el('strong','',task.id),state(task));
    b.append(row,el('small','',task.pages+' стр. · '+task.stage));
    b.onclick=()=>{selected=task.id;list();detail();host.querySelector('[data-ops-task="'+selected+'"]').focus({preventScroll:true});};host.append(b);
  }
}
function detail(){
  const task=tasks.find(t=>t.id===selected),host=$('[data-ops-detail]');host.replaceChildren(el('h3','',task.id));
  const badge=$('[data-ops-status]');badge.replaceChildren(state(task));
  host.append(el('p','',task.pages+' стр. · '+task.stage+' · Синтетический пример'));
  if(task.state==='failed'){const a=el('div','s-alert s-alert--danger','DEMO_INVALID_IMAGE — пример ошибки формата. Исходный файл не изменён.');host.append(a);return;}
  if(task.state!=='succeeded'){host.append(el('p','',task.state==='queued'?'Задача в очереди.':'Проходы OCR ещё не завершены. Количество страниц не является процентом готовности.'));return;}
  const list=el('div','s-result-list'),card=el('article','s-result-card');
  const head=el('div','s-result-card__head');head.append(el('strong','','Страница 1 · Таблица'),el('small','','Демонстрационная запись'));
  const body=el('div','s-result-card__body'),toggle=el('button','s-btn s-btn--ghost s-btn--sm','Исходный текст');toggle.type='button';toggle.setAttribute('aria-pressed','false');
  const raw=el('pre','','| Товар | Количество | Цена |\n|---|---:|---:|\n| Демонстрационный товар | 2 | 100 |');raw.hidden=true;
  const wrap=el('div','s-table-wrap');wrap.tabIndex=0;wrap.setAttribute('aria-label','Результат: таблица');
  const table=el('table','s-table'),thead=el('thead'),tr=el('tr');['Наименование','Количество','Цена'].forEach(text=>tr.append(el('th','',text)));thead.append(tr);table.append(thead);
  const tbody=el('tbody'),row=el('tr');['Демонстрационный товар',2,100].forEach(text=>row.append(el('td','',String(text))));tbody.append(row);table.append(tbody);wrap.append(table);
  // Trusted fixture DOM only. Arbitrary OCR Markdown/HTML requires the upstream sanitizer.
  toggle.onclick=()=>{raw.hidden=!raw.hidden;wrap.hidden=!wrap.hidden;toggle.textContent=raw.hidden?'Исходный текст':'Разметка';toggle.setAttribute('aria-pressed',String(!raw.hidden));};
  body.append(toggle,wrap,raw);card.append(head,body);list.append(card);host.append(list);
  const box=el('div','s-code-float'),button=el('button','s-btn s-btn--icon');button.type='button';button.setAttribute('aria-label','Копировать JSON');button.title='Копировать JSON';
  const icon=$('[data-copy-integration] svg').cloneNode(true);button.append(icon);
  const pre=el('pre','',JSON.stringify({_demo:true,id:task.id,state:task.state,products:[{name:'Демонстрационный товар',quantity:2,unit_price:100,total:200}]},null,2));
  button.onclick=e=>SacraUtils.copy(pre.textContent,{trigger:e.currentTarget});box.append(button,pre);host.append(el('h3','','Итоговый JSON'),box);
}
$('[data-copy-integration]').onclick=e=>SacraUtils.copy($('[data-integration-code]').textContent,{trigger:e.currentTarget});
document.querySelectorAll('[data-ops-filter]').forEach(button=>button.onclick=()=>{
  filter=button.dataset.opsFilter;document.querySelectorAll('[data-ops-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  if(!visible().some(task=>task.id===selected))selected=visible()[0]?.id;
  list();if(selected)detail();
});
SacraUpload.mount($('#document-upload'),{onSubmit:async files=>{SacraUtils.notify(files.length+' файлов проверено только локально. Отправки в OCR нет.',{kind:'info',title:'Локальная демонстрация'});},successMessage:'Локальная проверка завершена. Файлы никуда не отправлялись.'});
list();detail();
})();
