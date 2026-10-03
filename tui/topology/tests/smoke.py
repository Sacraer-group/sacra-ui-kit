import os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=root.joinpath('index.html').read_text()
css='\n'.join(root.joinpath(x).read_text() for x in ['assets/tokens.css','assets/topology.css'])
themes=root.joinpath('assets/themes.js').read_text(); app=root.joinpath('assets/topology.js').read_text()
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=os.environ.get('SACRA_CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1440,'height':1050},reduced_motion='no-preference')
    errors=[]; page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(html,wait_until='domcontentloaded'); page.add_style_tag(content=css); page.add_script_tag(content=themes); page.add_script_tag(content=app); page.wait_for_timeout(150)
    assert page.locator('[data-node]').count()==7
    assert page.locator('.edge.is-active').count()>=0
    page.click('[data-scale=".8"]'); assert page.evaluate('SacraTopology.state.scale')==0.8
    page.click('[data-width="96"]'); assert page.evaluate('SacraTopology.state.width')=='96'
    page.click('#step'); assert page.evaluate('SacraTopology.state.phase')==1
    page.keyboard.press('3'); assert 'PLACEHOLDER SLOTS' in page.locator('#screen').inner_text()
    page.evaluate("SacraTopology.setData({session:{id:'plug'},runtime:{maxThreads:2},nodes:[{id:'main',slot:'main',role:'CUSTOM',model:{name:'M'},state:'running',params:{x:1},metrics:{y:2}}],events:[]})")
    page.keyboard.press('1'); assert 'CUSTOM' in page.locator('#screen').inner_text()
    page.keyboard.press('t'); assert page.locator('#theme-pop').is_visible(); page.keyboard.press('Escape')
    assert not errors, errors
    b.close()
print('OK · dynamic topology · animation controls · scale · adapter data · themes')
