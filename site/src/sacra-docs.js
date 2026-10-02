/* SACRA docs: scoped language groups, copy through SacraUtils, stable TOC anchors.
 * Carries forward postavki's code-sample / synchronized-language interaction. */
(function(g){
'use strict';
const groups = () => [...document.querySelectorAll('[data-doc-languages]')];
const own = (group, selector) => [...group.querySelectorAll(selector)].filter(el => el.closest('[data-doc-languages]') === group);
const tabs = group => own(group, '[role=tab][data-doc-language]');
const available = group => tabs(group).filter(tab => !tab.disabled && tab.getAttribute('aria-disabled') !== 'true');
const store = 'sacra-doc-language';
let serial = 0;
function unique(prefix) {let id; do {id = prefix + serial++;} while (document.getElementById(id)); return id;}
function activate(group, language) {
  const usable = available(group);
  const selected = usable.find(tab => tab.dataset.docLanguage === language) || usable.find(tab => tab.getAttribute('aria-selected') === 'true') || usable[0];
  if (!selected) return;
  tabs(group).forEach(tab => {const active = tab === selected; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;});
  own(group, '[data-doc-panel]').forEach(panel => panel.hidden = panel.dataset.docPanel !== selected.dataset.docLanguage);
}
function selectLanguage(language, {focus = false, source = null} = {}) {
  if (!groups().some(group => available(group).some(tab => tab.dataset.docLanguage === language))) return false;
  groups().forEach(group => activate(group, language));
  document.documentElement.dataset.docLanguage = language;
  try { localStorage.setItem(store, language); } catch (_) {}
  if (focus && source) {
    const group = source.closest('[data-doc-languages]');
    if (group) available(group).find(tab => tab.dataset.docLanguage === language)?.focus({preventScroll:true});
  }
  document.dispatchEvent(new CustomEvent('sacra:doc-language', {detail:{language}}));
  return true;
}
function init() {
  groups().forEach(group => {
    if (group.dataset.docReady) return;
    group.dataset.docReady = 'true';
    const panels = own(group, '[data-doc-panel]');
    const list = group.querySelector('[role=tablist]');
    if (list && !list.hasAttribute('aria-label')) list.setAttribute('aria-label', 'Язык примера');
    tabs(group).forEach(tab => {
      if (tab instanceof HTMLButtonElement) tab.type = 'button';
      const panel = panels.find(item => item.dataset.docPanel === tab.dataset.docLanguage);
      if (!panel) {tab.setAttribute('aria-disabled','true');tab.tabIndex=-1;return;}
      tab.id ||= unique('s-doc-tab-');
      panel.id ||= unique('s-doc-panel-');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', tab.id); panel.tabIndex = 0;
      tab.addEventListener('click', () => {if (!tab.disabled && tab.getAttribute('aria-disabled') !== 'true') selectLanguage(tab.dataset.docLanguage);});
      tab.addEventListener('keydown', event => {
        const keys = ['ArrowRight','ArrowLeft','Home','End']; if (!keys.includes(event.key)) return;
        const set = available(group), current = set.indexOf(tab); if (current < 0) return;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? set.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + set.length) % set.length;
        event.preventDefault(); selectLanguage(set[next].dataset.docLanguage, {focus:true,source:set[next]});
      });
    });
  });
  let preferred = null;
  try { preferred = localStorage.getItem(store); } catch (_) {}
  if (!selectLanguage(preferred)) groups().forEach(group => activate(group, null));
  document.querySelectorAll('[data-doc-copy]').forEach(button => {
    if (button.dataset.docCopyReady) return; button.dataset.docCopyReady='true';
    button.addEventListener('click', event => {
      const code = button.closest('[data-doc-code]')?.querySelector('pre code, pre');
      if (code && g.SacraUtils) g.SacraUtils.copy(code.textContent, {trigger:event.currentTarget,message:'Фрагмент документации скопирован.'});
    });
  });
}
function initToc() {
  const links = [...document.querySelectorAll('.s-doc-toc a[href^="#"]')];
  const pairs = links.map(link => [link, document.getElementById(link.hash.slice(1))]).filter(pair => pair[1]);
  if (!pairs.length) return;
  let scheduled = false;
  function update() {
    scheduled = false; let current = pairs[0][1];
    pairs.forEach(([,section]) => {if (section.getBoundingClientRect().top <= 110) current=section;});
    pairs.forEach(([link,section]) => {
      link.classList.toggle('is-active', section===current);
      if (section===current) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
    });
  }
  update();g.addEventListener('scroll', () => {if (!scheduled) {scheduled=true;requestAnimationFrame(update);}}, {passive:true});
}
function start(){init();initToc();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
g.SacraDocs={init,selectLanguage,version:'1.1.0'};
})(window);
