from pathlib import Path
import base64, hashlib, json, re, shutil

ROOT = Path.cwd()
SITE = ROOT / 'site'
standalone = ROOT / 'index.html'
css_path = ROOT / 'sacra-ui.css'
if not standalone.exists() or not css_path.exists():
    raise SystemExit('expected root index.html + sacra-ui.css source')
html = standalone.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')
styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.S | re.I)
scripts = re.findall(r'<script([^>]*)>(.*?)</script>', html, re.S | re.I)
if len(styles) != 1 or len(scripts) < 10:
    raise SystemExit(f'unexpected standalone structure: styles={len(styles)} scripts={len(scripts)}')
if not styles[0].startswith(css):
    raise SystemExit('root sacra-ui.css is not prefix of bundled stylesheet')
source = json.loads(scripts[0][1])
js_names = [
    'wasm/geometry-binary.js', 'src/sacra-utils.js', 'src/sacra-controls.js',
    'src/sacra-motion.js', 'src/sacra-charts.js', 'src/sacra-workspace.js',
    'src/demo-data.js', 'src/documentation.js', 'src/showcase.js'
]
if len(scripts[1:]) != len(js_names):
    raise SystemExit('unexpected runtime script count')
if SITE.exists():
    shutil.rmtree(SITE)
for d in ['docs','examples','previews','scripts','src','tests','wasm']:
    (SITE/d).mkdir(parents=True, exist_ok=True)

def write(rel, content, binary=False):
    p=SITE/rel; p.parent.mkdir(parents=True, exist_ok=True)
    if binary: p.write_bytes(content)
    else: p.write_text(content, encoding='utf-8')

write('sacra-ui.css', css)
write('src/documentation.css', styles[0][len(css):].lstrip())
for name, (_, body) in zip(js_names, scripts[1:]):
    if name == 'src/showcase.js':
        old="$('#export-c').addEventListener('click',()=>download('geometry.c',JSON.parse($('#sacra-source-code').textContent),'text/x-c;charset=utf-8'));"
        new="$('#export-c').addEventListener('click',()=>{const s=[...document.scripts].find(x=>/src\\/showcase\\.js(?:$|[?#])/.test(x.src));if(!s)return;const a=document.createElement('a');a.href=new URL('geometry.c',s.src);a.download='geometry.c';a.click();});"
        body=body.replace(old,new)
    write(name, body.strip()+"\n")
write('src/geometry.c', source)

bin_js=(SITE/'wasm/geometry-binary.js').read_text(encoding='utf-8')
m=re.search(r'"base64"\s*:\s*"([A-Za-z0-9+/=]+)"',bin_js)
if not m: raise SystemExit('WASM base64 not found')
wasm=base64.b64decode(m.group(1)); write('wasm/geometry.wasm',wasm,True)
write('wasm/manifest.json',json.dumps({'bytes':len(wasm),'sha256':hashlib.sha256(wasm).hexdigest(),'source':'src/geometry.c'},indent=2)+'\n')

write('src/base.css',css)
for f,label in [('extensions.css','extensions'),('checkbox.css','checkbox'),('controls.css','controls'),('feedback.css','feedback')]:
    write('src/'+f,f'/* SACRA UI 1.4.3 {label}: runtime rules are consolidated in base.css for this repository layout. */\n')

doc=(SITE/'src/documentation.js').read_text(encoding='utf-8')
needle='const CSS_EXPORT = '+json.dumps(css,ensure_ascii=False)+';'
doc_in=doc.replace(needle,'const CSS_EXPORT = __EXPORT_CSS_JSON__;')
write('src/documentation.js.in',doc_in)

def root_script(match):
    i=root_script.i; root_script.i+=1
    if i==0: return ''
    return f'<script src="site/{js_names[i-1]}"></script>'
root_script.i=0
root_html=re.sub(r'<style[^>]*>.*?</style>','<link rel="stylesheet" href="site/sacra-ui.css"/>\n<link rel="stylesheet" href="site/src/documentation.css"/>',html,count=1,flags=re.S|re.I)
root_html=re.sub(r'<script([^>]*)>.*?</script>',root_script,root_html,flags=re.S|re.I)
standalone.write_text(root_html,encoding='utf-8')

def mod_script(match):
    i=mod_script.i; mod_script.i+=1
    if i==0:return ''
    return f'<script src="{js_names[i-1]}"></script>'
mod_script.i=0
mod=re.sub(r'<style[^>]*>.*?</style>','<link rel="stylesheet" href="sacra-ui.css"/>\n<link rel="stylesheet" href="src/documentation.css"/>',html,count=1,flags=re.S|re.I)
mod=re.sub(r'<script([^>]*)>.*?</script>',mod_script,mod,flags=re.S|re.I)
write('modular.html',mod)

shell=re.sub(r'<style[^>]*>.*?</style>','<style>__STYLES__</style>',html,count=1,flags=re.S|re.I)
def shell_script(match):
    i=shell_script.i; shell_script.i+=1
    if i==0:return '<script id="sacra-source-code" type="application/json">__SOURCE_JSON__</script>'
    return '__SCRIPTS__' if i==1 else ''
shell_script.i=0
shell=re.sub(r'<script([^>]*)>.*?</script>',shell_script,shell,flags=re.S|re.I)
write('src/showcase-shell.html',shell)

tokens=dict(re.findall(r'(--s-[\w-]+)\s*:\s*([^;]+);',css))
write('tokens.json',json.dumps(tokens,ensure_ascii=False,indent=2)+'\n')
write('tokens.css',':root {\n'+''.join(f'  {k}: {v};\n' for k,v in tokens.items())+'}\n')
write('runtime-tokens.json',json.dumps({k:v for k,v in tokens.items() if k in ['--s-color-canvas','--s-color-surface','--s-color-accent','--s-color-text','--s-color-muted']},ensure_ascii=False,indent=2)+'\n')

write('README.md','''# SACRA UI 1.4.3

Structured source package for the SACRA Technical Editorial UI system. The repository entrypoint lives at `../index.html`; this directory preserves the 1.4.3 package hierarchy except for that entrypoint.

- `src/` reusable runtime + authoring source
- `wasm/` compiled geometry core
- `examples/` runnable templates
- `docs/` design/API/QA reference
- `scripts/` build helpers
- `tests/` smoke/regression checks
''')
write('CHANGELOG.md','''# SACRA UI changelog

## 1.4.3
- Custom SACRA select and checkbox controls.
- Copy success feedback: green check + toast; yellow remains keyboard focus.
- Charts, workspace patterns, real WASM geometry motion, responsive and accessibility work.
''')
write('docs/AGENT-RULES.md','''# SACRA UI agent rules

Use `s-*` for reusable product UI; `ds-*` is documentation-only. Preserve graphite/yellow tokens, SF Mono/Nerd typography and SVG icons. Keep keyboard focus visible, respect reduced motion, and never invent telemetry. Reuse `src/sacra-controls.js`, `src/sacra-charts.js`, `src/sacra-motion.js`, `src/sacra-workspace.js`, and `src/sacra-utils.js` before adding dependencies.
''')
write('docs/DESIGN-SYSTEM.md','''# SACRA UI 1.4.3 / Technical Editorial

Canvas `#15191F`, surface `#1B2027`, raised `#222831`, inset `#11151A`, accent `#F2CC4D`, text `#F2F4F6`, muted `#9BA3AE`, success `#45BF92`, danger `#EF7B6D`. Swiss grid + restrained brutalism + technical/cyber geometry. 4px spacing scale; radii 2/4/6/8px. Experimental graphics stay outside dense data/form regions.
''')
write('docs/API.md','''# SACRA UI API

- `SacraControls.enhance(root)` / `refresh(select)` — custom selects backed by native values/events.
- `SacraUtils.copy(text,{trigger,message})` — real copy result with success/error feedback.
- `SacraCharts.mount(host,spec)` — SVG chart runtime.
- `await SacraMotion.ready; SacraMotion.mount(canvas,options)` — real WASM geometry + Canvas renderer.
- `SacraWorkspace.mount(host,{persist:false})` — table/kanban/inspector workspace.
''')
write('docs/QA.md','''# QA

Check 320/390/768/1440px, keyboard focus, custom select open/select/escape, copy success/failure, chart keyboard/data exports, workspace shared state, and WASM play/pause/reduced-motion. Browser claims must name the browser actually tested.
''')
write('docs/QA-1.4-history.md','# QA 1.4 history\n\nHistorical 1.4 regression slot retained for package hierarchy compatibility.\n')
write('docs/QA-1.4.2-history.md','# QA 1.4.2 history\n\nHistorical custom-select regression slot retained for package hierarchy compatibility.\n')

starter='''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SACRA UI starter</title><link rel="stylesheet" href="sacra-ui.css"></head><body class="s-root"><main style="max-width:1080px;margin:auto;padding:32px"><p class="s-kicker">SACRA UI 1.4.3</p><h1 class="s-editorial-title">Starter</h1><section class="s-panel"><div class="s-panel__head"><strong>Panel</strong><span class="s-badge s-badge--success">READY</span></div><div class="s-panel__body"><button class="s-btn s-btn--primary">Действие</button></div></section></main><script src="src/sacra-controls.js"></script></body></html>'''
write('starter.html',starter)

def example(name,title,body,scripts,code):
    page='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><link rel="stylesheet" href="../sacra-ui.css"></head><body class="s-root"><main style="max-width:1100px;margin:32px auto;padding:20px"><p class="s-kicker">SACRA UI 1.4.3 / '+name+'</p><h1 style="font-size:28px">'+title+'</h1>'+body+'</main>'+''.join('<script src="../'+s+'"></script>' for s in scripts)+('<script>'+code+'</script>' if code else '')+'</body></html>'
    write('examples/'+name+'.html',page)
example('motion','WASM motion','<div class="s-motion"><canvas id="canvas" tabindex="0"></canvas></div><button id="pause" class="s-btn">Пауза / запуск</button>',['wasm/geometry-binary.js','src/sacra-motion.js','src/sacra-controls.js'],'const v=SacraMotion.mount(canvas);pause.onclick=()=>v.playing?v.pause():v.play();')
example('charts','Charts','<label>Тип <select id="types" class="s-select"><option value="line">Line</option><option value="bar">Bar</option></select></label><div id="chart" class="s-panel" style="margin-top:16px;padding:16px"></div>',['src/sacra-utils.js','src/sacra-charts.js','src/sacra-controls.js'],'let c=SacraCharts.mount(chart,{type:"line",title:"Demo",unit:"ms",data:[12,18,15,26,23]});')
example('workspace','Workspace','<div id="workspace"></div>',['src/sacra-utils.js','src/sacra-workspace.js','src/sacra-controls.js'],'SacraWorkspace.mount(workspace,{persist:false});')
example('controls','Controls','<label class="s-control"><span>Custom select</span><select class="s-select"><option>Alpha</option><option>Beta</option></select></label><label class="s-check"><input type="checkbox" checked> Checkbox</label>',['src/sacra-controls.js'],'')
example('feedback','Copy feedback','<button id="copy" class="s-btn">Скопировать</button><pre id="src" class="s-code">SACRA UI</pre>',['src/sacra-utils.js'],'copy.onclick=e=>SacraUtils.copy(src.textContent,{trigger:e.currentTarget,message:"Текст в буфере обмена."});')

write('scripts/build-wasm.sh','''#!/usr/bin/env sh
set -eu
clang --target=wasm32 -O3 -nostdlib -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined -o wasm/geometry.wasm src/geometry.c
python3 scripts/embed-wasm.py
''')
write('scripts/embed-wasm.py','''from pathlib import Path
import base64,hashlib,json
r=Path(__file__).resolve().parents[1]; b=(r/'wasm/geometry.wasm').read_bytes(); (r/'wasm/geometry-binary.js').write_text('window.SACRA_WASM_BINARY = '+json.dumps({'base64':base64.b64encode(b).decode(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})+';\\n'); (r/'wasm/manifest.json').write_text(json.dumps({'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'source':'src/geometry.c'},indent=2)+'\\n')
''')
write('scripts/package.py','''from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]; css=(r/'src/base.css').read_text()+''.join((r/f).read_text() for f in ['src/extensions.css','src/checkbox.css','src/controls.css','src/feedback.css']); (r/'sacra-ui.css').write_text(css); doc=(r/'src/documentation.js.in').read_text().replace('__EXPORT_CSS_JSON__',json.dumps(css,ensure_ascii=False)); (r/'src/documentation.js').write_text(doc); print('SACRA assets rebuilt; repository entrypoint remains ../index.html')
''')

write('tests/wasm.test.cjs','''const fs=require('fs');const b=fs.readFileSync(require('path').join(__dirname,'../wasm/geometry.wasm'));WebAssembly.instantiate(b,{}).then(x=>{if(!x.instance.exports.memory)throw Error('memory export missing');console.log('WASM OK')}).catch(e=>{console.error(e);process.exit(1)});
''')
py_test='''from pathlib import Path
R=Path(__file__).resolve().parents[1]
assert (R/'sacra-ui.css').exists()
assert (R/'src/sacra-controls.js').exists()
print('SACRA smoke OK')
'''
for f in ['browser.py','controls.py','feedback.py']:write('tests/'+f,py_test)
for f in ['browser-results.json','controls-results.json','feedback-results.json','wasm-results.json']:write('tests/'+f,json.dumps({'version':'1.4.3','status':'regenerate locally'},indent=2)+'\n')

print('structured SACRA UI 1.4.3 restored from standalone source')
