/* SACRA Docs 1.0 — synchronized language tabs, copy actions and TOC state. */
(function(g){
'use strict';
const root=document.documentElement;
const tabs=()=>[...document.querySelectorAll('[data-doc-language]')];
const panels=()=>[...document.querySelectorAll('[data-doc-panel]')];
function languages(){return [...new Set(tabs().map(tab=>tab.dataset.docLanguage))];}
function selectLanguage(language,{focus=false,source=null}={}){
 if(!languages().includes(language))return;
 root.dataset.docLanguage=language;
 tabs().forEach(tab=>{
  const active=tab.dataset.docLanguage===language;
  tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
 });
 panels().forEach(panel=>{panel.hidden=panel.dataset.docPanel!==language;});
 try{localStorage.setItem('sacra-doc-language',language);}catch(_){}
 if(focus){
  const target=source?.closest('[role="tablist"]')?.querySelector(`[data-doc-language="${CSS.escape(language)}"]`);
  target?.focus();
 }
 document.dispatchEvent(new CustomEvent('sacra:doc-language',{detail:{language}}));
}
function initTabs(){
 const preferred=(()=>{try{return localStorage.getItem('sacra-doc-language');}catch(_){return null;}})();
 const first=tabs()[0]?.dataset.docLanguage;
 selectLanguage(languages().includes(preferred)?preferred:first);
 document.querySelectorAll('[data-doc-languages]').forEach(group=>{
  const own=[...group.querySelectorAll('[role="tab"][data-doc-language]')];
  own.forEach((tab,index)=>{
   tab.addEventListener('click',()=>selectLanguage(tab.dataset.docLanguage));
   tab.addEventListener('keydown',event=>{
    let next;
    if(event.key==='ArrowRight')next=(index+1)%own.length;
    if(event.key==='ArrowLeft')next=(index+own.length-1)%own.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=own.length-1;
    if(next===undefined)return;
    event.preventDefault();selectLanguage(own[next].dataset.docLanguage,{focus:true,source:own[next]});
   });
  });
 });
}
function initCopy(){
 document.querySelectorAll('[data-doc-copy]').forEach(button=>{
  button.addEventListener('click',event=>{
   const box=button.closest('[data-doc-code]');
   const code=box?.querySelector('pre code, pre');
   if(!code)return;
   if(g.SacraUtils?.copy)g.SacraUtils.copy(code.textContent,{trigger:event.currentTarget,message:'Фрагмент документации скопирован.'});
  });
 });
}
function initToc(){
 const links=[...document.querySelectorAll('.s-doc-toc a[href^="#"]')];
 const sections=links.map(link=>document.querySelector(link.getAttribute('href'))).filter(Boolean);
 if(!links.length||!sections.length)return;
 const update=()=>{
  let current=sections[0];
  sections.forEach(section=>{if(section.getBoundingClientRect().top<=110)current=section;});
  links.forEach(link=>link.classList.toggle('is-active',link.getAttribute('href')==='#'+current.id));
 };
 update();addEventListener('scroll',update,{passive:true});
}
function init(){initTabs();initCopy();initToc();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
g.SacraDocs={selectLanguage,version:'1.0.0'};
})(window);
