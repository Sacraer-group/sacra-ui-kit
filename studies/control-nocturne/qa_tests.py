"""Automated smoke/regression checks for standalone SACRA Control concept (Chromium)."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent
PAGES = ['overview', 'network', 'containers', 'models', 'chat', 'terminal', 'kit']
RESULTS = []

def record(name, passed, detail=''):
    RESULTS.append({'name': name, 'pass': bool(passed), 'detail': str(detail)[:350]})
    print(('PASS' if passed else 'FAIL'), name, str(detail)[:160])

with sync_playwright() as p:
    chromium=os.getenv('SACRA_CHROMIUM') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
    browser = p.chromium.launch(executable_path=chromium, headless=True, args=['--no-sandbox'])
    for width in [320, 390, 768, 1440]:
        page = browser.new_page(viewport={'width':width,'height':900}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.set_content((BASE/'preview.html').read_text(encoding='utf-8'), wait_until='load')
        for section in PAGES:
            page.locator(f'nav [data-page="{section}"]').click()
            result = page.evaluate('''() => ({
                title: document.querySelector('#crumb')?.textContent,
                width: document.documentElement.scrollWidth,
                viewport: window.innerWidth,
                section: document.querySelector('nav [aria-current="page"]')?.dataset.page,
                empty: document.querySelector('#content').innerHTML.length === 0
            })''')
            record(f'view {section} @ {width}', not result['empty'] and (result['width'] <= result['viewport'] + 2), result)
            if width==1440 and section in ['overview','terminal','chat','kit']:
                page.screenshot(path=str(BASE/f'qa-{section}.png'),full_page=True)
        record(f'JS no uncaught errors @ {width}', not errors, errors)
        page.close()

    page=browser.new_page(viewport={'width':1280,'height':800})
    page.on('dialog', lambda d: d.accept())
    page.set_content((BASE/'preview.html').read_text(encoding='utf-8'), wait_until='load')
    page.keyboard.press('Control+k')
    record('command palette opens',page.locator('#paletteSearch').count()==1)
    page.locator('#paletteSearch').fill('cont')
    page.keyboard.press('Enter')
    record('palette navigation',page.locator('#crumb').inner_text()=='CONTAINERS')
    search=page.locator('#filterContainer')
    search.fill('does-not-exist')
    record('filter excludes all',page.locator('tbody tr').count()==1 and 'Совпадений нет' in page.locator('tbody tr').first.inner_text())
    search.fill('sacra')
    record('filter includes sacra',page.locator('tbody tr').count()>0)
    page.locator('[data-action="stop"]').first.click()
    record('demo stop action confirms and updates state', page.evaluate("state.containers.find(x=>x.id==='ct109').state === 'stopped'"))
    page.locator('nav [data-page="chat"]').click()
    page.locator('#compose').fill('<img src=x onerror=alert(1)>')
    page.locator('#send').click()
    record('chat escapes entered markup',page.locator('.bubble img[src="x"]').count()==0)
    page.locator('#attach').set_input_files({'name':'<img src=x onerror=alert(1)>.png','mimeType':'image/png','buffer': bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082')})
    page.wait_for_timeout(300)
    record('attachment escapes filename',page.locator('.caption img').count()==0)
    before=page.locator('.chatmedia img').count()
    page.locator('#attach').set_input_files({'name':'sample.svg','mimeType':'image/svg+xml','buffer':b'<svg xmlns="http://www.w3.org/2000/svg"/>'})
    record('SVG attachment rejected',page.locator('.chatmedia img').count()==before and 'PNG, JPEG' in page.locator('#toast').inner_text())
    page.locator('nav [data-page="kit"]').click()
    record('tokens showcased',page.locator('.swatch').count()>=17,page.locator('.swatch').count())
    page.locator('#cmd').click()
    last=page.locator('#commandDialog [data-goto]').last
    last.focus()
    page.keyboard.press('Tab')
    record('palette traps Tab',page.evaluate("document.activeElement.id==='paletteSearch'"))
    page.keyboard.press('Shift+Tab')
    record('palette traps Shift+Tab',page.evaluate("document.activeElement.dataset.goto === 'kit'"))
    page.keyboard.press('Escape')
    record('palette Esc restores focus',page.evaluate("document.activeElement.id==='cmd'"))
    page.locator('#theme').click()
    record('paper theme toggles',page.locator('body.paper').count()==1)
    # An action is not allowed to mutate mock state if confirmation is cancelled.
    cancel=browser.new_page(viewport={'width':1024,'height':768})
    cancel.on('dialog',lambda d: d.dismiss())
    cancel.set_content((BASE/'preview.html').read_text(encoding='utf-8'),wait_until='load')
    cancel.locator('nav [data-page="containers"]').click()
    cancel.locator('[data-action="stop"]').first.click()
    record('cancelled workload action unchanged',cancel.evaluate("state.containers.find(x=>x.id==='ct109').state==='running'"))
    cancel.close()
    browser.close()

out = BASE/'qa-results.json'
out.write_text(json.dumps({'passed':sum(x['pass'] for x in RESULTS),'total':len(RESULTS),'results':RESULTS}, ensure_ascii=False, indent=2))
print('SUMMARY',sum(x['pass'] for x in RESULTS),'/',len(RESULTS),'->',out)
raise SystemExit(0 if all(x['pass'] for x in RESULTS) else 1)
