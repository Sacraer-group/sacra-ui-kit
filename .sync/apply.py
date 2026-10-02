"""One-time integration into the existing multi-file site; no downloads."""
from pathlib import Path
import hashlib, html, json, re, sys
R = Path(__file__).resolve().parents[1]
def edit(path, fn):
    p=R/path; s=p.read_text(); new=fn(s)
    if s!=new:p.write_text(new)
def checksums():
    site=R/'site'
    result={str(p.relative_to(site)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(site.rglob('*')) if p.is_file() and p.name!='SHA256SUMS.json' and '__pycache__' not in p.parts}
    result['../index.html']=hashlib.sha256((R/'index.html').read_bytes()).hexdigest()
    (site/'SHA256SUMS.json').write_text(json.dumps(result,indent=2)+'\n')
if '--checksums-only' in sys.argv:
    checksums();raise SystemExit

def blob(path):
    data=(R/path).read_bytes()
    return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
assert blob('site/sacra-ui.css')=='72a43c4c63c42ca7f124379342f7daf9d649a075', 'Core CSS changed: review before integrating'
assert blob('site/src/sacra-utils.js')=='44170a62742020fb6d88c62fe91d7246cb58a37b', 'Copy helper changed: review before integrating'

upload=re.search(r'<section class="s-panel s-upload".*?</section>',(R/'site/examples/postavki.html').read_text(),re.S).group()
upload=upload.replace('id="document-upload"','id="upstream-upload" data-upload-demo').replace('upload-title','upstream-upload-title').replace('upload-message','upstream-upload-message')
upload=upload.replace('data-upstream-upload-message','data-upload-message')
section='''<section class="ds-section" id="upstream-patterns" aria-labelledby="upstream-title">
<div class="ds-section-head"><div><span class="ds-section-num">EXT / POSTAVKI</span><h2 id="upstream-title">Фронт из Поставок.</h2></div><p>Выбор фото, миниатюры, валидация и очередь с просмотром результата. Источник: d74d09d · 02.10.2026. Здесь только локальная демонстрация.</p></div>
UPLOAD
<div class="s-row"><a class="s-btn s-btn--primary" href="PREFIXexamples/postavki.html">Очередь и результат ↗</a><a class="s-btn" href="PREFIXexamples/documentation-code.html">Код и языковые вкладки ↗</a><a class="s-btn s-btn--ghost" href="PREFIXdocs/UPSTREAM-POSTAVKI.md">Что перенесено ↗</a></div>
</section>'''.replace('UPLOAD',upload)

def entry(s, prefix):
    if 'id="upstream-patterns"' in s:return s
    marker=re.search(r'<section\b[^>]*\bid="patterns"[^>]*>',s)
    if not marker:raise RuntimeError('patterns section missing')
    s=s[:marker.start()]+section.replace('PREFIX',prefix)+'\n'+s[marker.start():]
    css='<link rel="stylesheet" href="'+prefix+'src/sacra-operations.css"/>\n'
    s=s.replace('</head>',css+'</head>',1)
    scripts=''.join('<script src="'+prefix+'src/'+f+'"></script>\n' for f in ['sacra-upload.js','operations-showcase.js'])
    s=s.replace('</body>',scripts+'</body>',1)
    def nav(m):
        original=m.group()
        if 'data-nav' not in original and 'data-mobile-link' not in original:return original
        data='data-mobile-link' if 'data-mobile-link' in original else 'data-nav'
        return '<a class="ds-nav-link" '+data+' href="#upstream-patterns"><svg aria-hidden="true" class="s-icon"><use href="#i-box"></use></svg><span>Фронт Поставок</span><span class="ds-nav-index">+</span></a>'+original
    return re.sub(r'<a\b[^>]*href="#patterns"[^>]*>.*?</a>',nav,s,flags=re.S)
for path,prefix in [('index.html','site/'),('site/modular.html',''),('site/src/showcase-shell.html','../')]:
    edit(path,lambda s,p=prefix:entry(s,p))
for path in ['site/src/documentation.js','site/src/documentation.js.in']:
    edit(path,lambda s:s if "'upstream-patterns'" in s else s.replace('const entries = [', "const entries = [\n    ['Фронт Поставок / выбор фото / очередь', 'upstream-patterns', 'box', 'Upstream'],",1))

css='''\n/* Postavki refresh: local overflow, stable reading column, keyboard tab focus. */
.s-doc-prose p,.s-doc-prose li { overflow-wrap:anywhere; }
.s-doc-lang,.s-doc-pair > *,.s-doc-code { min-width:0; max-width:100%; }
.s-doc-lang__tabs .s-tab:focus-visible { outline-offset:-3px; }
.s-doc-lang__panel { min-width:0; }
.s-doc-prose p,.s-doc-prose li { color:var(--s-color-muted); }
.s-doc-code pre { color:var(--s-color-text); }
.s-doc-prose .s-code-float { margin-top:16px; }
@media(max-width:600px) { .s-doc-copy { width:44px; height:44px; min-height:44px; flex-basis:44px; } }
'''
edit('site/src/sacra-docs.css',lambda s:s if 'Postavki refresh:' in s else s+css)

icon='<svg class="s-icon" aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="2"></rect><path d="M15 8V3H3v13h5"></path></svg>'
langs={'curl':'cURL','python':'Python','go':'Go','typescript':'TypeScript','vue':'Vue','react':'React'}
snippets={
 'curl': ('# Illustrative URL: supply your own API_BASE\ncurl --fail "$API_BASE/v1/documents/demo"', '# Illustrative URL: supply your own API_BASE\ncurl --fail "$API_BASE/v1/documents/demo/status"'),
 'python': ('document = {"name": "demo-document"}\nprint(document["name"])', 'status = "demo"\nprint(status)'),
 'go': ('package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("demo-document") }','package main\n\nimport "fmt"\n\nfunc main() { fmt.Println("status: demo") }'),
 'typescript': ('const documentName: string = "demo-document";\nconsole.log(documentName);','const status: string = "demo";\nconsole.log(status);'),
 'vue': ('<template>\n  <p>demo-document</p>\n</template>','<template>\n  <output aria-live="polite">status: demo</output>\n</template>'),
 'react': ('export default function Document() {\n  return <p>demo-document</p>;\n}', 'export default function Status() {\n  return <output aria-live="polite">status: demo</output>;\n}')}
def group(index):
    parts=['<div class="s-doc-lang" data-doc-languages><div class="s-tabs s-doc-lang__tabs" role="tablist" aria-label="Язык примера '+str(index+1)+'">']
    for key,label in langs.items():
        parts.append('<button type="button" class="s-tab" role="tab" id="code-'+str(index)+'-'+key+'" aria-controls="panel-'+str(index)+'-'+key+'" aria-selected="'+str(key=='curl').lower()+'" tabindex="'+('0' if key=='curl' else '-1')+'" data-doc-language="'+key+'">'+label+'</button>')
    parts.append('</div>')
    for key,label in langs.items():
        parts.append('<div class="s-doc-lang__panel" role="tabpanel" id="panel-'+str(index)+'-'+key+'" aria-labelledby="code-'+str(index)+'-'+key+'" tabindex="0" data-doc-panel="'+key+'"'+(' hidden' if key!='curl' else '')+'><div class="s-doc-code" data-doc-code><div class="s-doc-code__head"><span>'+label+' / DEMO</span><button type="button" class="s-btn s-btn--ghost s-btn--icon s-doc-copy" data-doc-copy aria-label="Копировать '+label+'">'+icon+'</button></div><pre><code>'+html.escape(snippets[key][index])+'</code></pre></div></div>')
    return ''.join(parts)+'</div>'
page='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>SACRA Docs · Код и вкладки</title><link rel="stylesheet" href="../sacra-ui.css"><link rel="stylesheet" href="../src/sacra-docs.css"></head><body class="s-root s-doc-root"><div class="s-doc-shell"><header class="s-doc-topbar"><a class="s-doc-brand" href="../../index.html"><span class="s-doc-brand__mark" aria-hidden="true">S</span><span><strong>SACRA DOCS</strong><small>POSTAVKI / PATTERN REFRESH</small></span></a><nav class="s-doc-topnav" aria-label="Примеры"><a href="postavki.html">Очередь</a><a href="documentation.html">Reference</a><a href="documentation-guide.html">Guide</a><a href="documentation-code.html" aria-current="page">Код и вкладки</a></nav></header><main><section class="s-doc-hero"><span class="s-kicker">DOCUMENTATION / CODE</span><h1>Код. Вкладки.<br>Копирование.</h1><p>Шесть вариантов примера, синхронный выбор языка и одна видимая панель в каждом блоке. Это образец оформления, а не контракт API.</p></section><div class="s-doc-layout"><aside class="s-doc-toc" aria-label="Содержание"><a href="#example-one">01 / Первый блок</a><a href="#example-two">02 / Второй блок</a><a href="#details">03 / Поведение</a></aside><article class="s-doc-content s-doc-prose"><section class="s-doc-section" id="example-one"><h2>Пример 01</h2><p>Выберите любой язык. Второй блок переключится вместе с ним; кнопка Copy копирует только свой фрагмент, без названия вкладки.</p>GROUP0</section><section class="s-doc-section" id="example-two"><h2>Пример 02</h2><p>Вкладки доступны через Tab, стрелки, Home и End. После подтверждённого копирования появляются зелёная галочка и уведомление.</p>GROUP1</section><section class="s-doc-section" id="details"><h2>Перенос в проект</h2><div class="s-doc-callout"><strong>Дизайн и поведение, не язык документации</strong><p>Подставьте реальные примеры проекта. Не переносите API-адреса, токены и ограничения Поставок в чужую документацию.</p></div><p>Если в другом блоке нет выбранного языка, он сохраняет доступную вкладку и не становится пустым. Без доступа к localStorage переключение также работает.</p></section></article></div></main><footer class="s-doc-footer"><span>SACRA UI / локальный пример</span><a href="../docs/UPSTREAM-POSTAVKI.md">Происхождение ↗</a></footer></div><script src="../src/sacra-utils.js"></script><script src="../src/sacra-docs.js"></script></body></html>'''.replace('GROUP0',group(0)).replace('GROUP1',group(1))
(R/'site/examples/documentation-code.html').write_text(page+'\n')
for path in ['site/examples/documentation.html','site/examples/documentation-guide.html']:
    edit(path,lambda s:s if 'href="documentation-code.html"' in s else s.replace('</nav>','<a href="documentation-code.html">Код и вкладки</a></nav>',1))

notes={
 'sacra-ui-build':'For a task list + detail view or image upload, start with `site/examples/postavki.html`, `site/src/sacra-operations.css` and `site/src/sacra-upload.js`. Keep the selected task edge, local scroll containers and calm result cards.',
 'sacra-ui-controls':'Use `SacraUpload.mount(root,{maxFiles,maxBytes,onSubmit})` for camera/file pickers and removable previews. Preserve whole-batch validation, file order, pending controls, error retention and Object URL cleanup. Source defaults are not global product rules; transport belongs to the host app.',
 'sacra-ui-docs':'Use `site/examples/documentation-code.html` for six-language synchronized code tabs and copy buttons. Preserve tab/panel ARIA links and a visible fallback panel if a language is missing from a group. Do not label a snippet with a language it is not written in.',
 'sacra-ui-audit':'Run `python site/tests/postavki_browser.py` for uploads, local queue/detail, copy success/failure, language groups and responsive checks. Verify result grids use `minmax(0,1fr)` and code/table overflow stays local. Browser MIME checks do not replace server validation.',
 'sacra-ui-data-viz':'For document-processing dashboards, reuse `site/examples/postavki.html` metric strip and state/detail cards. A processed-page counter is not an overall completion percentage. Demo queue values are not telemetry; never replace measured WASM statistics with synthetic data.'}
fallbacks={'sacra-ui-build':'design-system.md','sacra-ui-controls':'controls.md','sacra-ui-docs':'documentation.md','sacra-ui-audit':'audit-checklist.md','sacra-ui-data-viz':'data-viz.md'}
for skill,note in notes.items():
    path='skills/'+skill+'/SKILL.md'
    def skill_update(s,n=note):
        if '## Postavki frontend refresh' in s:return s
        s=re.sub(r'version: "(\d+)\.(\d+)\.(\d+)"',lambda m:'version: "'+m[1]+'.'+str(int(m[2])+1)+'.0"',s,count=1)
        return s+'\n## Postavki frontend refresh\n\n'+n+'\n\nRead `site/docs/UPSTREAM-POSTAVKI.md` under the resolved kit root (current checkout or `$HOME/.codex/sacra-ui-kit`). Import the visuals/interactions, not the source application API contract. Base palette, custom select, checkbox, WASM and `SacraUtils.copy` remain unchanged.\n'
    edit(path,skill_update)
    edit('skills/'+skill+'/references/'+fallbacks[skill],lambda s,n=note:s if 'Postavki refresh' in s else s+'\n## Postavki refresh\n\n'+n+'\nThe full source map is `site/docs/UPSTREAM-POSTAVKI.md` in the global or local kit.\n')

readme='''\n## Frontend refresh from Postavki (2026-10-02)\n\nSource commit: `d74d09d357cf184026973dbb9d055f2ea91894a2`. Core SACRA UI 1.4.3 tokens and existing modules are retained.\n\n- [Queue, upload and result example](site/examples/postavki.html): camera/file pickers, removable previews, validation, master/detail, raw/rendered result and JSON copy. This example is local-only and uses synthetic data.\n- [Six-language code blocks](site/examples/documentation-code.html): cURL/Python/Go/TypeScript/Vue/React, synchronized tabs, keyboard navigation and confirmed copy feedback.\n- `site/src/sacra-upload.js` + `site/src/sacra-operations.css`: reusable, transport-free components.\n- [Source map and adaptations](site/docs/UPSTREAM-POSTAVKI.md).\n\nThe main `index.html` includes a working upload specimen and links to both examples. All runtime CSS/JS stays in `site/`; no code is baked into the entrypoint. The existing global Codex update command downloads the new site and updated five skills together.\n\nUI checks: `python site/tests/postavki_browser.py` (requires Playwright + Chromium; `SACRA_CHROMIUM` may name an installed binary). No OCR service is contacted. These are not Safari or real-device camera tests.\n'''
edit('README.md',lambda s:s if '## Frontend refresh from Postavki' in s else s+readme)
edit('AGENTS.md',lambda s:s if 'Postavki frontend refresh' in s else s+'\n## Postavki frontend refresh\n\nUse `site/examples/postavki.html`, `site/examples/documentation-code.html` and `site/docs/UPSTREAM-POSTAVKI.md` for the newly extracted patterns. Keep source app APIs out of kit demos; reuse `SacraUpload` and `SacraUtils` rather than writing another picker/clipboard helper.\n')
edit('site/CHANGELOG.md',lambda s:s if 'Postavki refresh' in s else s+'\n## 2026-10-02 — Postavki refresh\n\nExtracted upload/queue/result patterns from d74d09d, added local examples, strengthened documentation tabs and synchronized the five global skills. Existing core 1.4.3 palette and controls retained.\n')
checksums()
print('Integrated Postavki patterns into root entrypoint, site and five skills.')
