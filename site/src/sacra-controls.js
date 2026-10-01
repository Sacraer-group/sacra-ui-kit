/* SACRA Controls 1.4.2. No dependencies.
 * Enhances single-value selects; the hidden native select remains the form/data source.
 * Public API: SacraControls.enhance(root), refresh(root), get(select), destroy(select).
 * Dynamic selects are discovered automatically. After a silent `.value = ...`, call refresh.
 */
(function (g) {
  'use strict';
  if (g.SacraControls) return;
  const instances = new Map();
  let nextId = 0, current = null, observer = null;
  const svg = (path, cls) => '<svg class="' + cls + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="' + path + '"/></svg>';
  const caret = svg('m5 8 5 5 5-5', 's-selectbox__caret');
  const check = svg('m4 10 4 4 8-8', 's-selectbox__check');
  const labelText = (select) => {
    if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
    if (select.labels?.length) return [...select.labels].map(label => {
      const clone = label.cloneNode(true);
      clone.querySelectorAll('select,button,input,textarea,.s-selectbox,.s-selectbox__list').forEach(el => el.remove());
      return clone.textContent.trim();
    }).join(' ').replace(/\s+/g, ' ');
    return select.title || select.name || 'Выберите значение';
  };
  class SelectControl {
    constructor(select) {
      this.select = select;
      this.abort = new AbortController();
      this.opened = false; this.active = -1; this.buffer = ''; this.typedAt = 0;
      this.original = { hidden: select.hidden, tabindex: select.getAttribute('tabindex'), ariaHidden: select.getAttribute('aria-hidden') };
      this.name = labelText(select);
      const id = 's-combo-' + (++nextId);
      this.wrapper = document.createElement('span');
      this.wrapper.className = 's-selectbox';
      this.wrapper.dataset.selectFor = select.id || id;
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.id = id;
      this.button.className = 's-selectbox__button';
      this.button.setAttribute('role', 'combobox');
      this.button.setAttribute('aria-haspopup', 'listbox');
      this.button.setAttribute('aria-expanded', 'false');
      this.button.setAttribute('aria-controls', id + '-list');
      this.button.innerHTML = '<span class="s-selectbox__label"></span>' + caret;
      this.label = this.button.firstElementChild;
      this.list = document.createElement('div');
      this.list.className = 's-selectbox__list';
      this.list.id = id + '-list'; this.list.hidden = true;
      this.list.setAttribute('role', 'listbox');
      this.list.setAttribute('aria-label', this.name);
      this.popover = typeof this.list.showPopover === 'function';
      if (this.popover) this.list.setAttribute('popover', 'manual');
      select.before(this.wrapper);
      this.wrapper.append(select, this.button);
      select.dataset.sacraSelect = 'true';
      select.hidden = true;
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      (select.closest('dialog') || select.closest('.s-root') || document.body).append(this.list);
      const on = (target, event, fn, options = {}) => target.addEventListener(event, fn, { ...options, signal: this.abort.signal });
      on(this.button, 'click', (event) => {
        event.preventDefault();
        if (!select.isConnected) return;
        this.opened ? this.close() : this.open();
      });
      on(this.button, 'keydown', (event) => this.keydown(event));
      on(this.button, 'focus', () => this.sync());
      // Keep actual DOM focus on the combobox, including when clicking an option.
      on(this.list, 'mousedown', event => event.preventDefault());
      on(this.list, 'click', event => {
        const option = event.target.closest('[data-select-index]');
        if (option && this.list.contains(option)) this.commit(Number(option.dataset.selectIndex), true);
      });
      on(this.list, 'pointermove', event => {
        if (event.pointerType === 'touch') return;
        const option = event.target.closest('[data-select-index]');
        if (option) this.activate(Number(option.dataset.selectIndex), false);
      });
      for (const event of ['input', 'change']) on(select, event, () => this.sync());
      on(select, 'invalid', event => {
        event.preventDefault(); this.button.setAttribute('aria-invalid', 'true');
        this.button.focus(); this.open();
      });
      if (select.form) on(select.form, 'reset', () => setTimeout(() => this.sync(), 0));
      const dialog = select.closest('dialog');
      if (dialog) on(dialog, 'close', () => this.close());
      // Clicking the original field label must never activate a native popup.
      [...(select.labels || [])].forEach(label => on(label, 'click', event => {
        if (this.wrapper.contains(event.target) || event.target.closest('a,button,input,textarea,select')) return;
        event.preventDefault();
        if (!this.button.disabled) { this.button.focus(); this.open(); }
      }));
      this.optionObserver = new MutationObserver(() => this.sync());
      this.optionObserver.observe(select, { subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: ['disabled','selected','label','value','required','aria-invalid','aria-label','aria-labelledby','aria-describedby'] });
      instances.set(select, this);
      this.sync();
    }
    enabled(index) {
      const option = this.select.options[index];
      return !!option && !option.hidden && !option.disabled && !(option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled);
    }
    sync() {
      if (!this.select.isConnected) return;
      const s = this.select;
      this.button.disabled = s.matches(':disabled');
      this.button.setAttribute('aria-disabled', String(this.button.disabled));
      this.button.setAttribute('aria-required', String(s.required));
      this.button.setAttribute('aria-invalid', s.getAttribute('aria-invalid') || String(!s.validity.valid));
      this.name = labelText(s) || this.name;
      this.button.setAttribute('aria-label', this.name);
      this.list.setAttribute('aria-label', this.name);
      for (const attr of ['aria-labelledby', 'aria-describedby']) {
        if (s.hasAttribute(attr)) this.button.setAttribute(attr, s.getAttribute(attr));
        else this.button.removeAttribute(attr);
      }
      this.label.textContent = s.selectedIndex < 0 ? '—' : s.options[s.selectedIndex].label;
      this.signature = [...s.options].map((o, i) => [i,o.label,o.value,this.enabled(i),o.hidden,o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : '']);
      const serial = JSON.stringify(this.signature);
      if (serial !== this.lastSignature) {
        this.lastSignature = serial;
        this.list.replaceChildren(); this.items = [];
        let previousGroup = null;
        [...s.options].forEach((o, i) => {
          const group = o.parentElement.tagName === 'OPTGROUP' ? o.parentElement : null;
          if (group && group !== previousGroup) {
            const heading = document.createElement('div'); heading.className = 's-selectbox__group';
            heading.textContent = group.label; heading.setAttribute('role','presentation'); this.list.append(heading);
          }
          previousGroup = group;
          const node = document.createElement('div');
          node.id = this.button.id + '-option-' + i;
          node.className = 's-selectbox__option'; node.dataset.selectIndex = String(i);
          node.setAttribute('role','option'); node.setAttribute('aria-disabled', String(!this.enabled(i)));
          node.hidden = o.hidden;
          const text = document.createElement('span'); text.textContent = o.label;
          node.append(text); node.insertAdjacentHTML('beforeend', check);
          this.list.append(node); this.items.push(node);
        });
      }
      this.items.forEach((node, i) => {
        const selected = i === s.selectedIndex;
        node.classList.toggle('is-selected', selected);
        node.setAttribute('aria-selected', String(selected));
      });
      if (this.button.disabled && this.opened) this.close();
      if (this.opened) { if (!this.enabled(this.active)) this.active = this.first(); this.activate(this.active, false); this.position(); }
    }
    first() { return [...this.select.options].findIndex((_, i) => this.enabled(i)); }
    last() { for (let i = this.select.options.length - 1; i >= 0; i--) if (this.enabled(i)) return i; return -1; }
    open() {
      this.sync();
      if (this.opened || this.button.disabled || !this.select.isConnected) return;
      if (current && current !== this) current.close();
      current = this; this.opened = true;
      this.wrapper.classList.add('is-open'); this.button.setAttribute('aria-expanded', 'true');
      this.list.hidden = false;
      if (this.popover) {
        try { this.list.showPopover(); }
        catch (_) { this.list.removeAttribute('popover'); this.popover = false; }
      }
      this.position();
      this.activate(this.enabled(this.select.selectedIndex) ? this.select.selectedIndex : this.first());
    }
    position() {
      if (!this.opened) return;
      const r = this.button.getBoundingClientRect(), gap = 6, margin = 8;
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      if (r.bottom <= 0 || r.top >= vh || !r.width || !r.height) { this.close(); return; }
      const width = Math.min(Math.max(r.width, 176), vw - margin * 2);
      const below = vh - r.bottom - gap - margin, above = r.top - gap - margin;
      const wanted = Math.min(this.items.filter(n => !n.hidden).length * 40 + 14, 256);
      const up = below < wanted && above > below;
      const available = Math.max(40, up ? above : below);
      Object.assign(this.list.style, {
        width: width + 'px', maxHeight: Math.min(256, available) + 'px',
        left: Math.max(margin, Math.min(r.left, vw - width - margin)) + 'px',
        top: '0px', bottom: 'auto', right: 'auto'
      });
      const height = this.list.getBoundingClientRect().height;
      this.list.style.top = Math.max(margin, up ? r.top - height - gap : r.bottom + gap) + 'px';
      this.list.dataset.placement = up ? 'top' : 'bottom';
    }
    activate(index, scroll = true) {
      if (!this.enabled(index)) return;
      this.active = index;
      this.items.forEach((item, i) => item.classList.toggle('is-active', i === index));
      const item = this.items[index];
      this.button.setAttribute('aria-activedescendant', item.id);
      if (scroll) {
        const y = item.offsetTop, bottom = y + item.offsetHeight;
        if (y < this.list.scrollTop) this.list.scrollTop = y;
        else if (bottom > this.list.scrollTop + this.list.clientHeight) this.list.scrollTop = bottom - this.list.clientHeight;
      }
    }
    move(direction) {
      for (let i = this.active + direction; i >= 0 && i < this.items.length; i += direction) {
        if (this.enabled(i)) { this.activate(i); break; }
      }
    }
    commit(index = this.active, focus = false) {
      if (!this.enabled(index) || this.button.disabled) return;
      const changed = this.select.selectedIndex !== index;
      this.select.selectedIndex = index;
      // Close BEFORE change callbacks, since workspace callbacks may rebuild the DOM.
      this.close(); this.sync();
      if (focus && this.button.isConnected) this.button.focus({preventScroll:true});
      if (changed) {
        this.select.dispatchEvent(new Event('input', {bubbles:true}));
        this.select.dispatchEvent(new Event('change', {bubbles:true}));
      }
    }
    close() {
      if (!this.opened) return;
      this.opened = false; this.buffer = '';
      if (this.popover) { try { this.list.hidePopover(); } catch (_) {} }
      this.list.hidden = true; this.wrapper.classList.remove('is-open');
      this.button.setAttribute('aria-expanded', 'false'); this.button.removeAttribute('aria-activedescendant');
      if (current === this) current = null;
    }
    keydown(event) {
      const key = event.key;
      if (event.ctrlKey || event.metaKey) return;
      if (key === 'Tab') { if (this.opened) this.commit(); return; }
      if (key === 'Escape') { if (this.opened) { event.preventDefault(); event.stopPropagation(); this.close(); } return; }
      if (['Enter',' ','ArrowDown','ArrowUp','Home','End','PageDown','PageUp'].includes(key)) {
        event.preventDefault(); event.stopPropagation();
        if (key === 'Enter' || key === ' ') { this.opened ? this.commit() : this.open(); return; }
        if (event.altKey && key === 'ArrowUp') { if (this.opened) this.commit(); return; }
        if (!this.opened) {
          this.open();
          if (key === 'Home') this.activate(this.first());
          if (key === 'End') this.activate(this.last());
          return;
        }
        if (key === 'Home') this.activate(this.first());
        else if (key === 'End') this.activate(this.last());
        else if (!event.altKey) for (let n = 0; n < (key.startsWith('Page') ? 10 : 1); n++) this.move(key.endsWith('Down') ? 1 : -1);
        return;
      }
      if (key.length === 1 && !event.altKey) {
        event.preventDefault(); event.stopPropagation();
        if (!this.opened) this.open();
        const now = performance.now();
        this.buffer = now - this.typedAt > 700 ? key : this.buffer + key; this.typedAt = now;
        const lower = this.buffer.toLocaleLowerCase();
        const repeated = [...lower].every(char => char === lower[0]);
        const query = repeated ? lower[0] : lower;
        const start = repeated ? this.active + 1 : this.active;
        for (let n = 0; n < this.items.length; n++) {
          const i = (start + n + this.items.length) % this.items.length;
          if (this.enabled(i) && this.select.options[i].label.trim().toLocaleLowerCase().startsWith(query)) { this.activate(i); break; }
        }
      }
    }
    destroy() {
      this.close(); this.abort.abort(); this.optionObserver.disconnect(); this.list.remove();
      if (this.wrapper.isConnected) { this.wrapper.before(this.select); this.wrapper.remove(); }
      this.select.hidden = this.original.hidden;
      for (const [attr, value] of [['tabindex', this.original.tabindex],['aria-hidden',this.original.ariaHidden]]) {
        if (value === null) this.select.removeAttribute(attr); else this.select.setAttribute(attr, value);
      }
      delete this.select.dataset.sacraSelect; instances.delete(this.select);
    }
  }
  function enhance(root = document) {
    const targets = [...(root.querySelectorAll?.('select') || [])];
    if (root.matches?.('select')) targets.unshift(root);
    targets.forEach(select => {
      if (!instances.has(select) && !select.multiple && select.size <= 1 && !select.hasAttribute('data-native-select') && !select.hidden) new SelectControl(select);
    });
  }
  function refresh(root = document) {
    enhance(root);
    instances.forEach((control, select) => { if (root === document || root === select || root.contains(select)) control.sync(); });
  }
  function boot() {
    enhance();
    observer = new MutationObserver(records => {
      let removed = false;
      for (const record of records) {
        if (record.removedNodes.length) removed = true;
        for (const node of record.addedNodes) if (node.nodeType === 1 && !node.closest('.s-selectbox__list')) enhance(node);
      }
      if (removed) instances.forEach((control, select) => { if (!select.isConnected) control.destroy(); });
    });
    observer.observe(document.body, {childList:true,subtree:true});
    document.addEventListener('pointerdown', event => {
      if (current && !current.wrapper.contains(event.target) && !current.list.contains(event.target)) current.close();
    }, true);
    document.addEventListener('focusin', event => {
      if (current && !current.wrapper.contains(event.target) && !current.list.contains(event.target)) current.close();
    });
    document.addEventListener('keydown', event => {
      if (current && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); current.close(); }
    }, true);
    document.addEventListener('scroll', event => { if (current && !current.list.contains(event.target)) current.position(); }, true);
    window.addEventListener('resize', () => current?.position());
    window.visualViewport?.addEventListener('resize', () => current?.position());
    document.addEventListener('visibilitychange', () => { if (document.hidden) current?.close(); });
  }
  g.SacraControls = { version:'1.4.2', enhance, refresh, get: select => instances.get(select), destroy: select => instances.get(select)?.destroy() };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})(window);
