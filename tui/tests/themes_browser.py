"""New 0.2 regression checks. Source injection, not file:// E2E.
Persistence is tested using a controlled Storage adapter because this environment
blocks origin-bearing page navigation. Native storage access failure is also tested.
"""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];checks=[]
def check(name,ok):
 if not ok:raise AssertionError(name)
 checks.append(name)
def load(page,stored=None):
 text=(ROOT/'index.html').read_text()
 for f in re.findall(r'(?:href|src)="(assets/[^"]+)"',text):assert(ROOT/f).is_file(),f
 text=re.sub(r'<script[^>]*src=[^>]*></script>|<link[^>]*>','',text);page.set_content(text)
 if stored is not None:
  page.evaluate('''values=>{window.testStorage={...values};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.testStorage[k]??null,setItem:(k,v)=>window.testStorage[k]=String(v)}});}''',stored)
 for f in ['tokens.css','lab.css','coordinates-themes.css']:page.add_style_tag(content=(ROOT/'assets'/f).read_text())
 for f in ['themes.js','coordinates.js','charts.js','app.js']:page.add_script_tag(content=(ROOT/'assets'/f).read_text())
 page.wait_for_timeout(80)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('SACRA_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce',accept_downloads=True)
 errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 load(page,{})
 check('SACRA remains default',page.evaluate('SacraTUI.state.theme')=='sacra')
 page.locator('#session-name').fill('keep-me');page.evaluate("SacraTUI.jobs[0].progress=73")
 page.locator('#theme-button').click();check('Own palette dialog, no native select',page.locator('#theme-dialog').is_visible() and page.locator('[name=tui-theme]').count()==8)
 page.locator('[name=tui-theme][value=nord]').check();check('Theme live preview applies',page.evaluate('SacraTUI.state.theme')=='nord')
 check('Draft is not yet persisted',page.evaluate("window.testStorage['sacra-tui-theme-v1']??null")==None)
 page.keyboard.press('Escape');page.wait_for_timeout(80)
 check('Escape restores original palette',page.evaluate('SacraTUI.state.theme')=='sacra')
 check('Cancel preserves in-progress form',page.locator('#session-name').input_value()=='keep-me')
 check('Focus returns to palette trigger',page.evaluate('document.activeElement.id')=='theme-button')
 page.locator('#terminal').focus();page.keyboard.press('t');page.keyboard.press('ArrowDown');check('Radio arrows preview next theme',page.evaluate('SacraTUI.state.theme')=='nord')
 page.keyboard.press('Enter');page.wait_for_timeout(100)
 check('Enter applies and stores palette',page.evaluate("window.testStorage['sacra-tui-theme-v1']")=='nord')
 check('Theme does not reset task data',page.evaluate('SacraTUI.jobs[0].progress')==73)
 check('Theme does not restart paused sampling',not page.evaluate('SacraTUI.state.playing'))
 check('Browser wrapper remains SACRA',page.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(21, 25, 31)')
 saved=page.evaluate('window.testStorage')
 restored=browser.new_page(reduced_motion='reduce');load(restored,saved)
 check('Preference restored at fresh app startup (Storage adapter)',restored.evaluate('SacraTUI.state.theme')=='nord');restored.close()
 page.evaluate("SacraTUI.go('charts')")
 check('Each full chart has coordinate frame',page.locator('.plot-coordinates').count()==3)
 check('CPU real scale labels',page.locator('.plot-y').first.inner_text().split()==['100','75','50','25','0'])
 for mode in ['pixels','octant','ascii']:
  page.locator(f'[data-renderer={mode}]').click()
  check('Same technical frame in '+mode,page.locator('.coordinate-crosses').count()==3 and page.locator('.coordinate-center').first.get_attribute('d')!='')
  check('Same time domain in '+mode,page.evaluate("document.querySelector('[data-plot]')._axes.xTicks.map(t=>t.value)")==[-60000,-45000,-30000,-15000,0])
 page.locator('#coordinate-button').click();check('Grid switch removes only guides',page.locator('.coordinate-grid').first.get_attribute('d')=='' and page.locator('.coordinate-rulers').first.get_attribute('d')=='' and page.locator('.coordinate-frame').first.get_attribute('d')!='')
 page.locator('#terminal').focus();page.keyboard.press('g');check('g restores guide lines',page.evaluate('SacraTUI.state.grid') and page.locator('.coordinate-center').first.get_attribute('d')!='')
 page.locator('#window-button').click();check('Five-minute axis labels exact',page.evaluate("document.querySelector('[data-plot]')._axes.xTicks.map(t=>t.label)")==['−5m','−3:45','−2:30','−1:15','now'])
 page.locator('.plot-canvas').first.focus();page.keyboard.press('End');page.keyboard.press('ArrowLeft')
 check('Keyboard cursor steps one second at five-minute window','t -1 s' in page.locator('[data-readout]').first.inner_text())
 check('Two-dimensional readout has marker and crosshair',page.locator('.plot-horizontal').first.is_visible() and page.locator('.plot-point').first.is_visible())
 page.locator('.plot-canvas').nth(1).focus();page.keyboard.press('End');check('Shared plot cursor reads both series','DOWN' in page.locator('[data-readout]').nth(1).inner_text() and 'UP' in page.locator('[data-readout]').nth(1).inner_text())
 page.locator('[data-scenario=missing]').click();page.locator('.plot-canvas').nth(1).focus();page.keyboard.press('End');check('Missing has no invented Y coordinate',page.locator('.plot-point').nth(1).is_hidden() and 'N/A' in page.locator('[data-readout]').nth(1).inner_text())
 page.locator('[data-scenario=zero]').click();check('Zero preserved on baseline',page.locator('[data-value]').first.inner_text()=='0.0')
 page.locator('[data-scenario=normal]').click();page.locator('[data-renderer=pixels]').click()
 themes=page.evaluate('TuiThemes.all')
 for theme in themes:
  id=theme['id'];page.evaluate('(id)=>SacraTUI.setTheme(id)',id)
  check(id+' scopes dialog and terminal',page.evaluate("[...document.querySelectorAll('[data-tui-theme-root]')].every(n=>n.dataset.theme===SacraTUI.state.theme)"))
  check(id+' foreground actually inherits palette',page.evaluate("getComputedStyle(document.querySelector('.t-heading h2')).color")=='rgb('+', '.join(str(int(theme['colors']['text'][i:i+2],16)) for i in [1,3,5])+')')
  check(id+' canvas recolors while paused',page.evaluate('''()=>{const c=document.querySelector('.plot-canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data,t=SacraTUI.colors.primary;for(let i=0;i<p.length;i+=4)if(p[i]===t[0]&&p[i+1]===t[1]&&p[i+2]===t[2]&&p[i+3]===255)return true;return false;}'''))
  for width in [390,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   for view in ['components','tasks','charts','monitor','rules']:
    page.evaluate('(v)=>SacraTUI.go(v)',view);page.wait_for_timeout(20)
    check(f'{id} / {view} fits {width}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  page.evaluate("SacraTUI.go('charts')")
 page.evaluate("SacraTUI.go('rules')");check('Rules show current palette hex',page.locator('[data-theme-token=accent]').inner_text()==page.evaluate('TuiThemes.get(SacraTUI.state.theme).colors.accent'))
 page.locator('#theme-button').click();page.locator('[name=tui-theme][value=dracula]').check()
 with page.expect_download() as dl:page.locator('#theme-export').click()
 data=json.loads(Path(dl.value.path()).read_text());check('Export contains current full role mapping',data['id']=='dracula' and len(data['colors'])==17)
 page.locator('#theme-reset').click();check('SACRA reset updates live preview',page.evaluate('SacraTUI.state.theme')=='sacra')
 page.locator('#theme-dialog button[value=apply]').click();page.wait_for_timeout(80)
 check('Only one real theme is persisted',page.evaluate("window.testStorage['sacra-tui-theme-v1']")=='sacra')
 page.set_viewport_size({'width':320,'height':650});page.locator('#theme-button').click()
 check('Palette picker fits 320px',page.locator('#theme-dialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 page.keyboard.press('Escape');page.wait_for_timeout(60)
 page.evaluate("Object.defineProperty(window,'localStorage',{get:()=>{throw Error('blocked')},configurable:true});")
 page.locator('#theme-button').click();page.locator('[name=tui-theme][value=nord]').check();page.locator('#theme-dialog button[value=apply]').click();page.wait_for_timeout(80)
 check('Unavailable storage does not prevent theme use',page.evaluate('SacraTUI.state.theme')=='nord')
 check('Unavailable storage not falsely reported as saved','хранилище недоступно' in page.locator('#notice').inner_text())
 # Independent graph example uses the same coordinate module, without the app runtime.
 minimal=browser.new_page(viewport={'width':900,'height':650});minimal.on('pageerror',lambda e:errors.append(str(e)));minimal.on('request',lambda r:requests.append(r.url))
 html=(ROOT/'examples/minimal-chart.html').read_text()
 for resource in re.findall(r'(?:src|href)="([^"]+)"',html):
  if resource.endswith(('.css','.js','.html')):assert(ROOT/'examples'/resource).is_file(),resource
 minimal.set_content(re.sub(r'<script[^>]*src=[^>]*></script>|<link[^>]*>','',html))
 for f in ['assets/tokens.css','examples/minimal-chart.css']:minimal.add_style_tag(content=(ROOT/f).read_text())
 for f in ['assets/coordinates.js','assets/charts.js','examples/minimal-chart.js']:minimal.add_script_tag(content=(ROOT/f).read_text())
 minimal.wait_for_timeout(60)
 check('Independent example has no app runtime',minimal.evaluate('typeof window.SacraTUI')=='undefined')
 check('Independent example uses the coordinate frame',minimal.locator('.coordinate-crosses').count()==1 and minimal.locator('.coordinate-center').get_attribute('d')!='')
 check('Independent example has real 0–100 domain',minimal.locator('.y-labels').inner_text().split()==['100','75','50','25','0'])
 minimal.locator('summary').click()
 check('Independent example exposes 61 data rows, 10 missing samples',minimal.locator('#values tr').count()==61 and minimal.locator('#values').inner_text().count('N/A')==10)
 for width in [320,390,768,1440]:
  minimal.set_viewport_size({'width':width,'height':650});minimal.wait_for_timeout(30)
  check(f'Independent chart fits {width}',minimal.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 minimal.close()
 check('No new JavaScript errors',not errors);check('No network requests from prototype',not requests)
 browser.close()
(ROOT/'tests/themes-browser-results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'renderer':'Chromium','resource_loading':'Source injection; file:// and HTTPS navigation blocked by environment','persistence':'Controlled Storage adapter; actual opaque-origin access failure also checked','safari_tested':False},ensure_ascii=False,indent=2)+'\n')
print(f'{len(checks)}/{len(checks)} new browser checks passed')
