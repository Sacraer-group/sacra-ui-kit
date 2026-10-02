/* The gallery never uploads files to a server. */
document.querySelectorAll('[data-upload-demo]').forEach(root => SacraUpload.mount(root, {
  successMessage: 'Демо: файлы проверены, но никуда не отправлялись.',
  onSubmit(files) { SacraUtils.notify('Выбрано страниц: '+files.length+'. Это локальная демонстрация.', {title:'Без отправки',kind:'info'}); }
}));
