"""Dependency-free validation of the opt-in SACRA Control study and its sources.

Run from any directory: python3 studies/control-nocturne/validate_bundle.py
"""
from __future__ import annotations
import ast, json, re, sys
from pathlib import Path
from html.parser import HTMLParser

ROOT=Path(__file__).resolve().parent
REQUIRED={"canvas","surface","raised","sunken","hover","border","border-strong","text","muted","subtle","accent","accent-hover","accent-soft","success","success-soft","danger","danger-soft"}
EXPECTED_ROUTES=['overview','network','containers','models','chat','terminal','kit']
assert (ROOT/'preview.html').exists(), 'standalone preview absent'
html=(ROOT/'preview.html').read_text(encoding='utf-8')

class Checker(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=set(); self.duplicates=[]; self.labels=[]
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids:self.duplicates.append(attrs['id'])
            self.ids.add(attrs['id'])
        if tag=='button' and 'data-page' in attrs:self.labels.append((attrs['data-page'],attrs.get('aria-label')))

c=Checker(); c.feed(html)
assert not c.duplicates, f'duplicate HTML ids: {c.duplicates}'
assert {r for r,_ in c.labels}==set(EXPECTED_ROUTES), f'bad routes: {c.labels}'
assert all(v for _,v in c.labels), 'some icon-only nav buttons lack aria-label'
assert 'tui_demo.py' not in html, 'incorrect reference to non-shipped TUI demo'
assert 'LOCAL ONLY / NO API' in html, 'must describe the mock as disconnected'
assert 'aria-live="polite"' in html
assert 'grid-template-columns:minmax(0,1fr)' in html, 'mobile min-size overflow regression'
assert 'image/svg+xml' not in html.split('accept=')[-1].split('>')[0], 'untrusted SVG attachment not permitted'

j=json.loads((ROOT/'theme.nocturne.json').read_text(encoding='utf-8'))
assert j['id']=='nocturne' and j['scheme']=='dark'
assert set(j['colors'])==REQUIRED, f'role mismatch: {set(j["colors"]) ^ REQUIRED}'
css=(ROOT/'sacra-nocturne.css').read_text(encoding='utf-8')
assert '[data-s-theme="nocturne"]' in css
for key,val in j['colors'].items():
    assert re.search(re.escape(f'--s-color-{key}')+r'\s*:\s*'+re.escape(val)+r'\s*;',css,re.I), f'mismatch {key}'
assert len(re.findall(r'--s-color-(?:[\w-]+)\s*:',css))==len(REQUIRED), 'unexpected semantic CSS roles'

def lum(v):
    a=[int(v[i:i+2],16)/255 for i in (1,3,5)]
    a=[x/12.92 if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in a]
    return sum(x*k for x,k in zip(a,(0.2126,0.7152,0.0722)))
def contrast(a,b):
    a,b=sorted([lum(a),lum(b)])
    return (b+.05)/(a+.05)

for bg in ('canvas','surface','raised'):
    for foreground in ('text','muted','accent','success','danger'):
        ratio=contrast(j['colors'][foreground],j['colors'][bg])
        assert ratio>=4.5, f'{foreground}/{bg} contrast {ratio:.2f}:1 < 4.5'

sample=ROOT/'references/kb_gpu.py'
if sample.exists():
    t=ast.parse(sample.read_text(encoding='utf-8'))
    # Verify imported gradient's numeric representation without importing Windows-only msvcrt.
    nodes=[x for x in t.body if isinstance(x,(ast.FunctionDef,ast.Assign)) and (isinstance(x,ast.FunctionDef) and x.name in ('_lerp','grad') or isinstance(x,ast.Assign) and any(isinstance(z,ast.Name) and z.id=='PALETTES' for z in x.targets))]
    env={};exec(compile(ast.Module(body=nodes,type_ignores=[]),str(sample),'exec'),env)
    assert env['grad'](env['PALETTES']['load'],0)=='#2ecc71'
    assert env['grad'](env['PALETTES']['load'],0.5)=='#f1c40f'
    assert env['grad'](env['PALETTES']['load'],1)=='#ff4757'

print('OK: HTML structure, 7 labelled routes, mock guardrails, palette 17/17, CSS mirror,')
print('    AA contrast on canvas/surface/raised for core text roles, source gradient endpoints.')
