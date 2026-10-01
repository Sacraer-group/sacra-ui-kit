/* SACRA Utils 1.4.3 — shared copy feedback. No dependencies or clipboard reads.
 * copy(text, { trigger: HTMLElement, message?: string }) -> Promise<boolean>
 * Call directly in the click handler to retain browser user activation.
 */
(function(g){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function download(name,data,type='text/plain;charset=utf-8') {
 const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
const paths={success:'m4 12 5 5L20 6',error:'m6 6 12 12M18 6 6 18',info:'M12 10v7M12 6v.1'};
function icon(kind='success') {
 const el=document.createElementNS('http://www.w3.org/2000/svg','svg');
 el.setAttribute('viewBox','0 0 24 24');el.setAttribute('aria-hidden','true');el.setAttribute('focusable','false');
 el.setAttribute('class','s-feedback-icon');
 const path=document.createElementNS(el.namespaceURI,'path');path.setAttribute('d',paths[kind]||paths.info);el.append(path);
 return el;
}
let region=null,noticeTimer=0,noticeDeadline=0,noticeRemaining=0;
function noticeHost(trigger) {
 const own=trigger?.closest?.('dialog[open]');
 return own||[...document.querySelectorAll('dialog[open]')].at(-1)||document.body;
}
function ensureRegion(host=document.body) {
 if(!region){
  region=document.createElement('div');region.id='sacra-notifications';region.className='s-notice-region';
  region.setAttribute('role','status');region.setAttribute('aria-live','polite');region.setAttribute('aria-atomic','true');
 }
 if(region.parentNode!==host)host.append(region);
 return region;
}
function dismissNotice(){clearTimeout(noticeTimer);if(region)region.replaceChildren();}
function armNotice(ms) {clearTimeout(noticeTimer);noticeRemaining=ms;noticeDeadline=performance.now()+ms;noticeTimer=setTimeout(dismissNotice,ms);}
function pauseNotice(){clearTimeout(noticeTimer);noticeRemaining=Math.max(200,noticeDeadline-performance.now());}
function resumeNotice(){if(region?.firstElementChild&&!region.matches(':hover')&&!region.contains(document.activeElement))armNotice(noticeRemaining);}
function notify(message,options={}) {
 const kind=['success','error','info'].includes(options.kind)?options.kind:'info';
 const host=noticeHost(options.trigger),r=ensureRegion(host),box=document.createElement('div');
 box.className='s-notice s-notice--'+kind;box.dataset.noticeKind=kind;
 const text=document.createElement('div');text.className='s-notice__text';
 const title=document.createElement('strong');title.textContent=options.title||String(message);
 text.append(title);
 if(options.title&&message){const detail=document.createElement('span');detail.textContent=String(message);text.append(detail);}
 const close=document.createElement('button');close.type='button';close.className='s-notice__close';close.setAttribute('aria-label','Закрыть уведомление');close.append(icon('error'));
 close.addEventListener('click',()=>{
  const hadFocus=document.activeElement===close;dismissNotice();
  if(hadFocus&&options.trigger?.isConnected)options.trigger.focus({preventScroll:true});
 });
 box.append(icon(kind),text,close);
 box.addEventListener('pointerenter',pauseNotice);box.addEventListener('pointerleave',resumeNotice);
 box.addEventListener('focusin',pauseNotice);box.addEventListener('focusout',()=>setTimeout(resumeNotice,0));
 r.replaceChildren(box);armNotice(options.duration||4000);
 if(host instanceof HTMLDialogElement)host.addEventListener('close',()=>{if(region?.parentNode===host)ensureRegion(noticeHost());},{once:true});
 return dismissNotice;
}
// Keep the live region in the document before messages are inserted.
if(document.body)ensureRegion();else document.addEventListener('DOMContentLoaded',()=>ensureRegion(),{once:true});
const feedback=new WeakMap(),operations=new WeakMap();let sequence=0;
function restoreAttribute(el,name,value){if(value===null)el.removeAttribute(name);else el.setAttribute(name,value);}
function restoreFeedback(trigger) {
 const saved=feedback.get(trigger);if(!saved)return;
 clearTimeout(saved.timer);saved.undo();trigger.classList.remove('is-copied');
 restoreAttribute(trigger,'aria-label',saved.ariaLabel);restoreAttribute(trigger,'title',saved.title);
 trigger.removeAttribute('data-copy-state');feedback.delete(trigger);
}
function markCopied(trigger) {
 if(!(trigger instanceof HTMLElement)||!trigger.isConnected)return;
 restoreFeedback(trigger);
 const ariaLabel=trigger.getAttribute('aria-label'),title=trigger.getAttribute('title');
 const originalName=ariaLabel||trigger.textContent.trim();
 const buttonWidth=trigger.getBoundingClientRect().width;
 let undo;
 // Palette tiles retain colour names, HEX and geometry. Only their icon is replaced.
 if(trigger.matches('.ds-swatch')){
  const target=trigger.querySelector('.ds-swatch__color');
  const old=target?.querySelector('svg');const tick=icon();tick.classList.add('s-copy-palette-check');
  if(old)old.replaceWith(tick);else target?.append(tick);
  undo=()=>{if(old)tick.replaceWith(old);else tick.remove();};
 }else{
  const children=[...trigger.childNodes];
  const base=document.createElement('span');base.className='s-copy__original';base.setAttribute('aria-hidden','true');base.append(...children);
  const done=document.createElement('span');done.className='s-copy__feedback';done.setAttribute('aria-hidden','true');done.append(icon());
  // Very narrow and icon-only buttons show the tick without squeezing their layout.
  if(!trigger.classList.contains('s-btn--icon')&&buttonWidth>=115){
   const label=document.createElement('span');label.textContent='Скопировано';done.append(label);
  }
  trigger.append(base,done);undo=()=>{base.replaceWith(...children);done.remove();};
 }
 trigger.classList.add('is-copied');trigger.dataset.copyState='success';
 trigger.setAttribute('aria-label','Скопировано. '+originalName);trigger.setAttribute('title','Скопировано');
 const saved={ariaLabel,title,undo,timer:0};feedback.set(trigger,saved);
 saved.timer=setTimeout(()=>restoreFeedback(trigger),2000);
}
function begin(trigger){
 const op={id:++sequence,trigger,busy:trigger?.getAttribute('aria-busy')??null};
 if(trigger){
  // A repeated click must not preserve an earlier transient aria-busy value.
  const previous=operations.get(trigger);if(previous)op.busy=previous.busy;
  restoreFeedback(trigger);operations.set(trigger,op);trigger.setAttribute('aria-busy','true');trigger.dataset.copyState='pending';
 }
 return op;
}
function isCurrent(op){return !op.trigger||operations.get(op.trigger)===op;}
function finish(op){
 if(!op.trigger)return;
 restoreAttribute(op.trigger,'aria-busy',op.busy);op.trigger.removeAttribute('data-copy-state');operations.delete(op.trigger);
}
function legacyWrite(text,trigger){
 if(typeof document.execCommand!=='function')return false;
 const input=document.createElement('textarea'),active=document.activeElement,selection=g.getSelection();
 const ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
 const inputSelection=active&&typeof active.selectionStart==='number'?{start:active.selectionStart,end:active.selectionEnd}:null;
 input.value=text;input.readOnly=true;input.className='s-copy-buffer';input.setAttribute('aria-label','Текст для копирования');
 noticeHost(trigger).append(input);let ok=false;
 try{input.focus({preventScroll:true});input.select();input.setSelectionRange(0,text.length);ok=document.execCommand('copy')===true;}
 catch(_){ok=false;}
 finally{
  input.remove();if(active?.isConnected)active.focus({preventScroll:true});
  if(inputSelection){try{active.setSelectionRange(inputSelection.start,inputSelection.end);}catch(_){}}
  else if(selection){try{selection.removeAllRanges();ranges.forEach(r=>selection.addRange(r));}catch(_){}}
 }
 return ok;
}
function manualCopy(text,options){
 document.querySelector('dialog[data-manual-copy]')?.close();
 const back=options.trigger||document.activeElement,d=document.createElement('dialog');d.className='s-dialog s-copy-dialog';d.dataset.manualCopy='';
 d.setAttribute('aria-label','Автокопирование недоступно');
 d.innerHTML='<div class="s-dialog__head"><h2>Автокопирование недоступно</h2><button class="s-btn s-btn--sm" type="button" data-copy-close>Закрыть</button></div><div class="s-dialog__body"><p>Браузер не разрешил запись в буфер. Текст выделен ниже: скопируй его через ⌘C / Ctrl+C или повтори попытку.</p><textarea class="s-input" aria-label="Текст для ручного копирования" rows="8" readonly></textarea><p class="s-muted" role="status" data-copy-retry-note></p></div><div class="s-dialog__foot"><button type="button" class="s-btn" data-copy-retry>Повторить копирование</button></div>';
 noticeHost(options.trigger).append(d);const area=d.querySelector('textarea');area.value=text;
 d.querySelector('[data-copy-close]').onclick=()=>d.close();
 d.addEventListener('close',()=>{if(region?.parentNode===d)ensureRegion(noticeHost(back));d.remove();if(back?.isConnected)back.focus({preventScroll:true});},{once:true});
 d.querySelector('[data-copy-retry]').onclick=async event=>{
  const retry=event.currentTarget;
  const ok=await copy(text,{...options,trigger:retry,manual:false});
  if(ok){d.close();markCopied(options.trigger);}
  else d.querySelector('[data-copy-retry-note]').textContent='Запись по-прежнему недоступна. Используй ⌘C / Ctrl+C для выделенного текста.';
 };
 d.showModal();area.focus({preventScroll:true});area.select();
}
async function copy(text,options={}) {
 if(options instanceof HTMLElement)options={trigger:options};
 if(typeof options==='string')options={message:options};
 options=options||{};
 const trigger=options.trigger instanceof HTMLElement?options.trigger:null;
 text=String(text??'');const op=begin(trigger);let ok=false;
 try{
  // No await before this call: WebKit requires the original user gesture.
  if(g.isSecureContext&&g.navigator.clipboard?.writeText){await g.navigator.clipboard.writeText(text);ok=true;}
 }catch(_){/* An explicit success from the local-file fallback is still required. */}
 if(!isCurrent(op))return ok;
 if(!ok)ok=legacyWrite(text,trigger);
 finish(op);
 if(ok){
  markCopied(trigger);notify(options.message||'Текст в буфере обмена.',{kind:'success',title:'Скопировано',trigger});
  return true;
 }
 notify('Браузер не разрешил запись в буфер.',{kind:'error',title:'Не скопировано',trigger});
 if(options.manual!==false)manualCopy(text,{...options,trigger});
 return false;
}
g.SacraUtils={esc,download,notify,copy,dismissNotice,version:'1.4.3'};
})(window);
