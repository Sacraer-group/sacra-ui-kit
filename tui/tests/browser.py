"""Run: python tests/browser.py. Requires Playwright and Chromium.
This test loads local HTML/assets by set_content/add_*_tag because the authoring
container blocks navigation (including file: and localhost) by browser policy.
This is explicit source injection for testing, not a change to the shipped files.
"""
import base64, json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests'
checks=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
def load(page):
    text=(ROOT/'index.html').read_text()
    # Verify every external resource before loading its unmodified bytes.
    for path in re.findall(r'(?:href|src)="(assets/[^"]+)"',text):
        assert (ROOT/path).is_file(),path
    text=re.sub(r'<script[^>]*src=[^>]*></script>','',text)
    text=re.sub(r'<link[^>]*>','',text)
    page.set_content(text)
    for path in ['tokens.css','lab.css','coordinates-themes.css']: page.add_style_tag(content=(ROOT/'assets'/path).read_text())
    for path in ['themes.js','coordinates.js','charts.js','app.js']: page.add_script_tag(content=(ROOT/'assets'/path).read_text())
    page.wait_for_timeout(100)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('SACRA_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True)
    errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url))
    load(page)
    page.locator('#zen-button').click();check('Terminal-only mode hides wrapper',not page.locator('.intro').is_visible())
    page.locator('#zen-button').click();check('Wrapper can be restored',page.locator('.intro').is_visible())
    check('Five views exposed',page.locator('[data-view]').count()==5)
    check('Catalogue is the initial view',page.evaluate('SacraTUI.state.view')=='components')
    page.locator('[data-view="monitor"]').click()
    check('Monitor contains three raster charts',page.locator('.plot-canvas').count()==3)
    check('Palette is SACRA',page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--s-color-accent').trim()")=='#F2CC4D')
    page.locator('#pause').click();now=page.evaluate('SacraTUI.state.now');page.wait_for_timeout(1150)
    check('Pause stops sampling',page.evaluate('SacraTUI.state.now')==now)
    page.locator('#step-button').click();check('Single-step advances exactly one sample',page.evaluate('SacraTUI.state.now')==now+1000)
    page.locator('[data-view="charts"]').click()
    for mode in ['pixels','octant','ascii']:
        page.locator(f'[data-renderer="{mode}"]').click()
        check('Renderer '+mode,page.evaluate('SacraTUI.state.renderer')==mode)
    check('ASCII contains real characters',len(page.locator('.plot-ascii').first.inner_text())>20)
    page.locator('[data-scenario="zero"]').click()
    check('Zero stays zero',page.locator('[data-value]').first.inner_text()=='0.0')
    page.locator('[data-scenario="missing"]').click()
    check('Missing is not zero',page.locator('[data-value]').first.inner_text()=='N/A' and page.locator('.plot-msg').first.is_visible())
    page.locator('[data-scenario="gaps"]').click()
    check('Gap creates separate segments',page.evaluate("TuiCharts.segments(SacraTUI.windowHistory().map(s=>({t:s.t,v:(s.t>SacraTUI.state.now-36000&&s.t<SacraTUI.state.now-24000)?null:s.cpu})),'v',60000).length") == 2)
    page.locator('[data-renderer="pixels"]').click();page.locator('[data-scenario="normal"]').click()
    page.locator('.plot-canvas').first.focus();page.keyboard.press('ArrowLeft')
    check('Chart keyboard cursor',page.locator('.plot-crosshair').first.is_visible())
    with page.expect_download() as dl:page.locator('[data-action="export-data"]').click()
    data=json.loads(Path(dl.value.path()).read_text())
    check('JSON export identifies synthetic data',data['source']=='synthetic' and len(data['samples'])>0)
    page.locator('[data-view="components"]').click()
    check('Twelve working component frames',page.locator('.spec-grid .frame').count()==12)
    page.locator('#check-grid').focus();page.keyboard.press('Space');check('Native checkbox keyboard semantics',not page.locator('#check-grid').is_checked())
    check('Grid toggle updates shared state',page.evaluate('SacraTUI.state.grid')==False)
    page.locator('#profile-trigger').click();check('Custom listbox opens',page.locator('#profile-list').is_visible())
    page.keyboard.press('End');page.keyboard.press('Enter')
    check('Custom select keyboard choice',page.locator('#profile-value').inner_text()=='Quiet')
    check('Select restores trigger focus',page.evaluate('document.activeElement.id')=='profile-trigger')
    page.locator('#profile-trigger').click();page.keyboard.press('Escape');check('Escape closes select',not page.locator('#profile-list').is_visible())
    page.locator('#session-name').fill('a');page.locator('#name-form button').click();check('Invalid field marked',page.locator('#session-name').get_attribute('aria-invalid')=='true')
    page.locator('#session-name').fill('mesh-demo');page.locator('#name-form button').click();check('Valid field succeeds',page.locator('#session-name').get_attribute('aria-invalid')=='false')
    page.locator('[data-mini="raw"]').focus();page.keyboard.press('ArrowRight');check('Component tab switches',page.locator('#spec-panel-meta').is_visible())
    page.locator('[data-action="progress"]').click();check('Progress changes state',page.evaluate('SacraTUI.state.progress')==72)
    page.locator('[data-page="next"]').click();check('Pagination works',page.evaluate('SacraTUI.state.compPage')==2)
    # Clipboard success, verified by pasting into a separate textarea (no read API).
    page.locator('[data-action="copy-demo"]').click()
    if page.locator('[data-action="copy-demo"]').get_attribute('class').find('copy-ok')>=0:
        page.evaluate("let t=document.createElement('textarea');t.id='paste-test';document.body.append(t);t.focus();")
        page.keyboard.press('Control+V');page.wait_for_timeout(100)
        check('Clipboard actual paste equals snippet',page.locator('#paste-test').input_value()=='SACRA / TUI\nstate: confirmed\nsource: browser demo')
        page.locator('#paste-test').evaluate('(e)=>e.remove()')
        check('Copy gives success feedback',page.locator('#notice').inner_text().startswith('[OK]'))
    else:
        raise AssertionError('Clipboard write unavailable in test environment')
    # Refusal must not produce a false tick.
    page.wait_for_timeout(2050)
    page.evaluate("document.execCommand=()=>false")
    page.locator('[data-action="copy-demo"]').click()
    check('Copy denial gives manual fallback',page.locator('#dialog textarea').is_visible())
    check('No false success after denial','copy-ok' not in page.locator('[data-action="copy-demo"]').get_attribute('class'))
    page.keyboard.press('Escape')
    page.locator('[data-view="tasks"]').click();page.locator('#job-search').fill('схемы')
    check('Task search filters',page.locator('#task-rows [data-job]').count()==1)
    page.locator('#job-search').press('Escape')
    check('Escape clears search',page.locator('#job-search').input_value()=='')
    page.locator('[data-job="1"]').click();page.keyboard.press('j');check('j moves selection',page.evaluate('SacraTUI.state.task')==2)
    page.keyboard.press('Enter');check('Action requires confirmation',page.locator('#dialog').is_visible())
    before=page.evaluate('JSON.stringify(SacraTUI.jobs)');page.keyboard.press('Escape');check('Cancel preserves state',page.evaluate('JSON.stringify(SacraTUI.jobs)')==before)
    page.locator('[data-job="4"]').click();page.keyboard.press('Enter');page.locator('[data-confirm]').click()
    check('Confirm changes only selected job',page.evaluate('SacraTUI.jobs.find(j=>j.id===4).status')=='queued')
    page.locator('#terminal').focus();page.keyboard.press(':');check('Command palette opens',page.locator('#command-search').is_visible())
    page.locator('#command-search').fill('монитор');check('Command filter works',page.locator('[data-command]:visible').count()==1)
    page.keyboard.press('ArrowDown');page.keyboard.press('Enter');check('Command navigates',page.evaluate('SacraTUI.state.view')=='monitor')
    with page.expect_download() as dl:page.locator('#export-frame').click()
    check('TXT export includes ASCII plots', 'SYNTHETIC DATA' in Path(dl.value.path()).read_text() and '*' in Path(dl.value.path()).read_text())
    for size in ['80','120','160','auto']:
        page.locator(f'[data-size="{size}"]').click();page.wait_for_timeout(80)
        check('Viewport preset '+size,page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    for width in [320,390,768,1440,1920]:
        page.set_viewport_size({'width':width,'height':1000})
        for view in ['monitor','charts','components','tasks','rules']:
            page.evaluate(f"SacraTUI.go('{view}')");page.wait_for_timeout(80)
            check(f'{view} no page overflow {width}',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    check('No page JavaScript errors',not errors)
    check('No network requests',not requests)
    # Source-injected reduced-motion check.
    reduced=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    load(reduced);check('Reduced motion pauses by default',not reduced.evaluate('SacraTUI.state.playing'))
    browser.close()
(OUT/'browser-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'browser':'Chromium','resource_loading':'source injection; navigation blocked by container policy','native_terminal_tested':False,'safari_tested':False},ensure_ascii=False,indent=2)+'\n')
print(f'{len(checks)}/{len(checks)} browser checks passed')
