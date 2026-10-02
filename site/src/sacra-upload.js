/* SACRA upload — adapted from postavki d74d09d / internal/admin/static/admin.js.
 * UI only: the host supplies onSubmit(files). No fetch, auth or OCR in this module. */
(function(g){
'use strict';
const mounted = new WeakMap();
function mount(root, options = {}) {
  if (!(root instanceof HTMLElement)) throw new TypeError('Upload root must be an element');
  if (mounted.has(root)) return mounted.get(root);
  const get = name => root.querySelector('[data-upload-' + name + ']');
  const pickers = [...root.querySelectorAll('input[type=file]')];
  const list = get('preview'), message = get('message'), count = get('count');
  const send = get('send'), clear = get('clear');
  if (!pickers.length || !list || !message || !count || !send || !clear) throw new Error('Incomplete upload markup');
  const maxFiles = Number(options.maxFiles ?? root.dataset.maxFiles ?? 10);
  const maxBytes = Number(options.maxBytes ?? root.dataset.maxBytes ?? 10 * 1024 * 1024);
  if (!Number.isInteger(maxFiles) || maxFiles < 1 || !Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('Invalid upload limits');
  let items = [], busy = false, destroyed = false;
  const events = new AbortController();
  function status(text, error = false) {
    message.textContent = text;
    message.classList.toggle('s-danger', error);
    pickers.forEach(input => input.setAttribute('aria-invalid', String(error)));
  }
  function release() { items.forEach(item => URL.revokeObjectURL(item.url)); items = []; }
  function render(focusIndex = null) {
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('li'); row.className = 's-upload__item';
      const image = document.createElement('img'); image.src = item.url; image.alt = 'Страница ' + (index + 1);
      const name = document.createElement('span'); name.className = 's-upload__name'; name.textContent = (index + 1) + '. ' + item.file.name;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 's-btn s-btn--ghost s-btn--sm';
      remove.textContent = 'Удалить'; remove.disabled = busy; remove.setAttribute('aria-label', 'Удалить страницу ' + (index + 1));
      remove.addEventListener('click', () => {
        URL.revokeObjectURL(item.url); items.splice(index, 1); render(Math.min(index, items.length - 1));
        status(items.length ? 'Страницы готовы к отправке.' : 'Изображения пока не выбраны.');
      });
      row.append(image, name, remove); list.append(row);
    });
    count.textContent = items.length + ' / ' + maxFiles;
    send.disabled = busy || !items.length; clear.disabled = busy || !items.length;
    pickers.forEach(input => input.disabled = busy);
    root.setAttribute('aria-busy', String(busy));
    if (focusIndex !== null) (list.querySelectorAll('button')[focusIndex] || pickers[0]).focus({preventScroll:true});
  }
  function add(input) {
    const files = [...(input.files || [])]; input.value = '';
    if (busy || destroyed || !files.length) return;
    if (items.length + files.length > maxFiles) return status('Не больше ' + maxFiles + ' изображений за раз.', true);
    for (const file of files) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) return status('Поддерживаются только JPEG и PNG. HEIC не поддерживается.', true);
      if (!file.size || file.size > maxBytes) return status('Размер каждого изображения: от 1 байта до ' + (maxBytes / 1048576) + ' МиБ.', true);
    }
    // Validate the whole batch before changing the selection (same upstream behavior).
    const additions = [];
    try { for (const file of files) additions.push({file, url:URL.createObjectURL(file)}); }
    catch (_) { additions.forEach(item => URL.revokeObjectURL(item.url)); return status('Не удалось создать предпросмотр.', true); }
    items.push(...additions); render(); status('Страницы готовы к отправке.');
  }
  pickers.forEach(input => input.addEventListener('change', () => add(input), {signal:events.signal}));
  clear.addEventListener('click', () => { release(); render(-1); status('Изображения пока не выбраны.'); }, {signal:events.signal});
  send.addEventListener('click', async () => {
    if (busy || !items.length) return;
    if (typeof options.onSubmit !== 'function') return status('Подключите обработчик onSubmit(files) в приложении.', true);
    busy = true; render(); status('Отправка…');
    try {
      await options.onSubmit(items.map(item => item.file));
      if (destroyed) return;
      release(); status(options.successMessage || 'Файлы приняты обработчиком.');
    } catch (_) { if (!destroyed) status('Отправка не выполнена. Страницы сохранены для повторной попытки.', true); }
    finally { busy = false; if (!destroyed) { render(); pickers[0].focus({preventScroll:true}); } }
  }, {signal:events.signal});
  const api = {get files(){return items.map(item => item.file);}, destroy(){destroyed=true;events.abort();release();render();mounted.delete(root);}};
  mounted.set(root, api); render(); return api;
}
g.SacraUpload = {mount, version:'1.0.0'};
})(window);
