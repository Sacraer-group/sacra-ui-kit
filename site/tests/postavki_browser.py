"""Real browser regression checks for the extracted UI; no OCR server is used."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import base64, json, os, threading
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[2]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=')
checks=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
def file(name='page.png',mime='image/png',buffer=png): return {'name':name,'mimeType':mime,'buffer':buffer}
try:
    with sync_playwright() as p:
        opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        if os.environ.get('SACRA_CHROMIUM'):opts['executable_path']=os.environ['SACRA_CHROMIUM']
        browser=p.chromium.launch(**opts)
        context=browser.new_context(viewport={'width':1440,'height':1000},permissions=['clipboard-read','clipboard-write'])
        page=context.new_page();errors=[];requests=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda req:requests.append((req.url,req.resource_type)))
        page.goto(base+'/site/examples/postavki.html');page.wait_for_selector('[data-ops-task]')
        check('Four local task cards',page.locator('[data-ops-task]').count()==4)
        check('Upload starts disabled',page.locator('[data-upload-send]').is_disabled())
        picker=page.get_by_label('Выбрать изображения',exact=True)
        picker.set_input_files([file('first.png'),file('second.png')])
        check('Two previews in selection order',page.locator('.s-upload__name').all_text_contents()==['1. first.png','2. second.png'])
        check('Counter updated',page.locator('[data-upload-count]').inner_text()=='2 / 10')
        page.get_by_label('Удалить страницу 1',exact=True).click()
        check('Removal renumbers list',page.locator('.s-upload__name').all_text_contents()==['1. second.png'])
        check('Removal keeps keyboard focus',page.evaluate("document.activeElement.getAttribute('aria-label')")=='Удалить страницу 1')
        picker.set_input_files([file('bad.heic','image/heic')])
        check('HEIC rejected without discarding selected page',page.locator('.s-upload__item').count()==1 and 'HEIC' in page.locator('[data-upload-message]').inner_text())
        picker.set_input_files([file('zero.png',buffer=b'')])
        check('Zero bytes rejected',page.locator('.s-upload__item').count()==1 and page.locator('[data-upload-message]').evaluate("e=>e.classList.contains('s-danger')"))
        picker.set_input_files([file(str(n)+'.png') for n in range(10)])
        check('Oversized batch rejected atomically',page.locator('.s-upload__item').count()==1)
        page.locator('[data-upload-clear]').click()
        check('Clear empties the list',page.locator('.s-upload__item').count()==0)
        picker.set_input_files(file('<img onerror=alert(1)>.png'))
        check('Filename is text, not HTML',page.locator('.s-upload__name img').count()==0 and '<img' in page.locator('.s-upload__name').inner_text())
        page.locator('[data-upload-send]').click()
        check('Local submit is explicitly not OCR',page.locator('.s-upload__item').count()==0 and 'никуда не отправлялись' in page.locator('[data-upload-message]').inner_text())
        page.locator('[data-ops-filter=live]').click()
        check('Live filter and detail selection',page.locator('[data-ops-task]').count()==2 and page.locator('[data-ops-task][aria-current=true]').count()==1)
        page.locator('[data-ops-filter=done]').click()
        check('History filter',page.locator('[data-ops-task]').count()==2)
        page.locator('[data-ops-task=demo-004]').click()
        check('Error state carries text',page.locator('.s-alert--danger').count()==1)
        page.locator('[data-ops-task=demo-001]').click()
        page.get_by_role('button',name='Исходный текст',exact=True).click()
        check('Raw result shown',page.locator('.s-result-card pre').is_visible() and not page.locator('.s-result-card table').is_visible())
        page.get_by_role('button',name='Разметка',exact=True).click()
        check('Rendered result restored',page.locator('.s-result-card table').is_visible())
        button=page.get_by_label('Копировать JSON',exact=True)
        expected=page.locator('[data-ops-detail] .s-code-float pre').inner_text()
        button.click();page.wait_for_selector('[data-copy-state=success]')
        check('Real clipboard content',page.evaluate('navigator.clipboard.readText()')==expected)
        check('Copy tick and notification',page.locator('.is-copied .s-feedback-icon').count()==1 and page.locator('.s-notice--success').count()==1)
        page.evaluate("""() => { const n=document.querySelector('.s-upload').cloneNode(true);n.id='test-upload';document.body.append(n);
          n.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
          window.testRoot=n;window.testUpload=SacraUpload.mount(n,{onSubmit:()=>new Promise((resolve,reject)=>{window.rejectUpload=reject;})}); }""")
        root=page.locator('#test-upload');root.locator('input[multiple]').set_input_files(file())
        root.locator('[data-upload-send]').click()
        check('Pending controls disabled',root.locator('[data-upload-send]').is_disabled() and root.locator('input[multiple]').is_disabled())
        page.evaluate("rejectUpload(new Error('demo failure'))");page.wait_for_function("!testRoot.querySelector('[data-upload-send]').disabled")
        check('Failed callback retains selection',root.locator('.s-upload__item').count()==1 and 'сохранены' in root.locator('[data-upload-message]').inner_text())
        check('Destroy clears selected files',page.evaluate('testUpload.destroy(); testUpload.files.length')==0)
        page.evaluate('testRoot.remove()')
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':950})
            check('Operations no page overflow '+str(width),page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.set_viewport_size({'width':1440,'height':1100});page.goto(base+'/site/examples/postavki.html')
        out=R/'site/previews';out.mkdir(exist_ok=True)
        page.screenshot(path=str(out/'postavki-refresh.png'))
        if not os.environ.get('SACRA_SKIP_DOCS'):
            page.goto(base+'/site/examples/documentation-code.html')
            check('Two complete language groups',page.locator('[data-doc-languages]').count()==2 and page.locator('[data-doc-language]').count()==12)
            page.locator('[data-doc-language=go]').first.click()
            check('Language synchronized across groups',page.locator('[data-doc-language=go][aria-selected=true]').count()==2 and page.locator('[data-doc-panel]:visible').count()==2)
            page.locator('[data-doc-language=go]').first.press('End')
            check('Keyboard End selects React',page.locator('[data-doc-language=react][aria-selected=true]').count()==2)
            check('Keyboard focus follows tab',page.evaluate("document.activeElement.dataset.docLanguage")=='react')
            check('Every tab linked to a real panel',page.evaluate("[...document.querySelectorAll('[role=tab][data-doc-language]')].every(t=>{const p=document.getElementById(t.getAttribute('aria-controls'));return p?.getAttribute('aria-labelledby')===t.id&&p.role==='tabpanel';})"))
            page.reload();check('Language survives reload',page.locator('[data-doc-language=react][aria-selected=true]').count()==2)
            cp=page.locator('[data-doc-panel=react]').first.locator('[data-doc-copy]');cp.click();page.wait_for_selector('[data-copy-state=success]')
            check('Copies active snippet only',page.evaluate('navigator.clipboard.readText()')==page.locator('[data-doc-panel=react]').first.locator('code').inner_text())
            page.evaluate("""() => {const g=document.querySelector('[data-doc-languages]').cloneNode(true);delete g.dataset.docReady;
            g.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));g.querySelectorAll('[data-doc-copy-ready]').forEach(e=>delete e.dataset.docCopyReady);
            g.querySelectorAll('[data-doc-language]').forEach(e=>{if(e.dataset.docLanguage!=='go')e.remove()});g.querySelectorAll('[data-doc-panel]').forEach(e=>{if(e.dataset.docPanel!=='go')e.remove()});
            document.querySelector('.s-doc-content').append(g);SacraDocs.init();SacraDocs.selectLanguage('typescript');}""")
            check('Missing language never blanks another group',page.locator('[data-doc-languages]').last.locator('[data-doc-panel]:visible').count()==1)
            check('No duplicate generated IDs',page.evaluate("(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size})()"))
            page.wait_for_function("!document.querySelector('.is-copied')")
            page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('denied'))}});document.execCommand=()=>false;")
            page.locator('[data-doc-panel=typescript]').first.locator('[data-doc-copy]').click();page.wait_for_selector('dialog[data-manual-copy][open]')
            check('Copy denial shows manual fallback, not success',page.locator('.is-copied').count()==0 and page.locator('.s-notice--error').count()==1)
            page.locator('[data-copy-close]').click()
            for width in [320,390,768,1440]:
                page.set_viewport_size({'width':width,'height':950})
                check('Docs no page overflow '+str(width),page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            page.set_viewport_size({'width':1440,'height':1100});page.goto(base+'/site/examples/documentation-code.html')
            page.screenshot(path=str(out/'documentation-code-refresh.png'))
            page.goto(base+'/index.html');page.locator('#upstream-patterns').scroll_into_view_if_needed()
            check('Main gallery contains live upload specimen',page.locator('#upstream-patterns [data-upload-demo]').count()==1 and page.evaluate("typeof SacraUpload.mount==='function'"))
            check('Existing real WASM is still available',page.evaluate("typeof SacraMotion.mount==='function'"))
        check('No page JavaScript errors',not errors)
        check('No external service/API requests',not [(u,t) for u,t in requests if t in ('fetch','xhr') and '/site/src/' not in u])
        browser.close()
    report={'passed':len(checks),'checks':checks}
    (R/'site/tests/postavki-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))
finally:
    server.shutdown();server.server_close()
