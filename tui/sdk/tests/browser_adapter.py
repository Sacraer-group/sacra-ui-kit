import os
"""Live data remains literal; native SDK integration cannot revive demo activity."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[2] / 'topology'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True,executable_path=os.environ.get('SACRA_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1500,'height':1000})
    errors = []; page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(root.joinpath('index.html').read_text(encoding='utf-8'))
    for path in ['assets/tokens.css','assets/topology.css']:
        page.add_style_tag(content=root.joinpath(path).read_text(encoding='utf-8'))
    for path in ['assets/themes.js','assets/topology.js']:
        page.add_script_tag(content=root.joinpath(path).read_text(encoding='utf-8'))
    data = page.evaluate('SacraTopology.snapshot().data')
    data['session']['source'] = 'adapter'
    data['nodes'][0]['role'] = '<img src=x onerror="window.__pwned=1">'
    data['nodes'][0]['state'] = 'blocked'
    data['nodes'][0]['params']['test'] = '</button><script>window.__pwned=1</script>'
    data['runtime']['contextUsed'] = 0
    data['events'] = [{'actor':'<img src=x onerror="window.__pwned=1">','message':'<script>bad()</script>'}]
    page.evaluate('(d)=>SacraTopology.setData(d)',data)
    before = page.evaluate('SacraTopology.snapshot()')
    page.evaluate('SacraTopology.step();SacraTopology.play(true)')
    page.wait_for_timeout(200)
    after = page.evaluate('SacraTopology.snapshot()')
    assert after['state']['playing'] is False
    assert after['data']==before['data']
    assert page.locator('[data-node="main"]').get_attribute('data-state')=='blocked'
    assert '<img' in page.locator('#screen').inner_text()
    assert page.locator('#screen img,#screen script').count()==0
    assert page.evaluate('window.__pwned || 0')==0
    assert page.locator('.router-grid').count()==0
    assert not errors, errors
    browser.close()
print('OK: literal adapter states/events, escaped DOM, no synthetic confidence in live mode')
