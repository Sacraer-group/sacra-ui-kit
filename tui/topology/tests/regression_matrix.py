import os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=root.joinpath('index.html').read_text(); css='\n'.join(root.joinpath(x).read_text() for x in ['assets/tokens.css','assets/topology.css']); themes=root.joinpath('assets/themes.js').read_text(); app=root.joinpath('assets/topology.js').read_text()
ids=['sacra','nord','gruvbox','dracula','tokyo','solarized','solarized-light','mono']
widths=['auto','160','120','96','80']; scales=[1,.9,.8,.7]
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path=os.environ.get('SACRA_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
  page=b.new_page(viewport={'width':1500,'height':1100},reduced_motion='no-preference'); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='domcontentloaded'); page.add_style_tag(content=css); page.add_script_tag(content=themes); page.add_script_tag(content=app); page.wait_for_timeout(100)
  page.evaluate('SacraTopology.pause()')
  for theme in ids:
    page.evaluate('(id)=>SacraTopology.setTheme(id,false)',theme)
    for width in widths:
      page.evaluate('(v)=>SacraTopology.setWidth(v)',width)
      for scale in scales:
        page.evaluate('(v)=>SacraTopology.setScale(v)',scale)
        page.wait_for_timeout(25)
        for _ in range(8):
          page.evaluate('SacraTopology.step()')
          page.wait_for_timeout(10)
          rects=page.locator('[data-node]:visible').evaluate_all('(els)=>els.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,Number.isFinite(r.x),Number.isFinite(r.y)]})')
          assert rects and all(w>0 and h>0 and fx and fy for w,h,fx,fy in rects),(theme,width,scale,rects)
  assert not errors,errors
  reduced=b.new_page(viewport={'width':1200,'height':900},reduced_motion='reduce'); reduced.set_content(html); reduced.add_style_tag(content=css); reduced.add_script_tag(content=themes); reduced.add_script_tag(content=app); reduced.wait_for_timeout(50); assert reduced.evaluate('SacraTopology.state.playing') is False
  b.close()
print('OK · 8 themes × 5 width presets × 4 scales × 8 phases + reduced motion')
