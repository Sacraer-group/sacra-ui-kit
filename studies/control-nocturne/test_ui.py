#!/usr/bin/env python3
"""Standalone SACRA Nocturne browser tests; all fixtures must remain synthetic."""
from pathlib import Path
import os, shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=(ROOT/'preview.html').read_text(encoding='utf-8')
PAGES=['overview','network','containers','models','chat','terminal','kit']
WIDTHS=[320,390,768,1024,1440]
results=[]
def check(name,condition):
    assert condition, name
    results.append(name)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('SACRA_CHROMIUM') or shutil.which('chromium') or shutil.which('google-chrome') or pw.chromium.executable_path,headless=True,args=['--no-sandbox','--disable-gpu-sandbox'])
    for width in WIDTHS:
        page=browser.new_page(viewport={'width':width,'height':850},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(HTML,wait_until='load')
        check(f'load and current page {width}',page.locator('nav [aria-current="page"]').count()==1)
        check(f'navigation official SVGs {width}',page.locator('nav .ni svg.lucide-icon use').count()==7)
        check(f'Lucide sprite definitions {width}',page.locator('svg.lucide-sprite symbol').count()==32)
        check(f'inline icons resolve {width}',page.evaluate("""() => [...document.querySelectorAll('svg.lucide-icon use')].every(e => !!document.querySelector(e.getAttribute('href')))"""))
        for route in PAGES:
            page.locator(f'nav [data-page="{route}"]').click(force=True)
            check(f'route {route} nav state {width}',page.locator('nav [aria-current="page"]').count()==1 and page.locator(f'nav [data-page="{route}"][aria-current="page"]').count()==1)
            check(f'route {route} no global overflow {width}',page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
            check(f'route {route} no browser JS error {width}',not errors)
            if route=='overview':
                check(f'overview 4 hosts {width}',page.locator('[data-host-card]').count()==4)
                for host in ['sacra','vivobook','edge-gw','macbook']:
                    card=page.locator(f'[data-host-card="{host}"]')
                    check(f'overview {host} has 3 processes {width}',card.locator('.process-row').count()==3)
                    check(f'overview {host} resources {width}',card.locator('.host-resource').count()>=3)
                check(f'service statuses English {width}',page.locator('.service .badge').all_text_contents().count('работает')==0 and 'INACTIVE' in page.locator('.service').all_text_contents()[2])
            if route=='network':
                for host in ['sacra','vivobook','edge-gw','macbook']:
                    page.locator(f'.netnode[data-host="{host}"]').click(force=True)
                    check(f'network inspect {host} {width}',page.locator(f'[data-inspected-host="{host}"] .process-row').count()==3)
                    check(f'network inspector active {host} {width}',page.locator(f'.netnode[data-host="{host}"][aria-pressed="true"]').count()==1)
                page.locator('.netnode[data-host="core-switch"]').click(force=True)
                check(f'network icon size stays inside label {width}',page.evaluate("() => [...document.querySelectorAll('.netnode .lucide-icon')].every(e => e.getBoundingClientRect().width <= 16)"))
                check(f'network switch missing-data not fake 0 {width}','N/A' in page.locator('[data-inspected-host="core-switch"]').inner_text())
            if route=='containers':
                check(f'VM and LXC resource cards {width}',page.locator('[data-workload-card]').count()==4)
                for c in ['ct109','vm107','vm111']:
                    check(f'VM or LXC {c} top3 {width}',page.locator(f'[data-workload-card="{c}"] .process-row').count()==3)
                check(f'inactive VM no fabricated processes {width}',page.locator('[data-workload-card="ct104"] .process-row').count()==0 and 'INACTIVE' in page.locator('[data-workload-card="ct104"]').inner_text())
            if route=='chat':
                check(f'chat Lucide attachment/send icons {width}',page.locator('#attachBtn svg use[href="#lc-paperclip"]').count()==1 and page.locator('#send svg use[href="#lc-send"]').count()==1)
            if route=='kit':
                check(f'kit official icon library {width}',page.locator('.icon-sample').count()==16)
            if route=='terminal':
                check(f'TUI host process sections {width}',page.locator('.termprocess').count()==4 and page.locator('.termprocess .procrow').count()==12)
        page.close()
    page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=2)
    page.set_content(HTML,wait_until='load')
    page.screenshot(path=str(ROOT/'overview-updated.png'),full_page=True)
    page.locator('nav [data-page="containers"]').click()
    page.screenshot(path=str(ROOT/'containers-updated.png'),full_page=True)
    page.on('dialog',lambda dlg:dlg.accept())
    page.locator('[data-id="ct109"][data-action="stop"]').click()
    check('stop action changes status to INACTIVE', 'INACTIVE' in page.locator('[data-workload-card="ct109"]').inner_text())
    check('stop action removes visible processes',page.locator('[data-workload-card="ct109"] .process-row').count()==0)
    page.locator('nav [data-page="overview"]').click()
    check('stop action synchronizes overview status', 'INACTIVE' in page.locator('.service').filter(has=page.locator('.sname',has_text='vpn-incy')).inner_text())
    page.locator('nav [data-page="containers"]').click()
    page.locator('[data-id="ct109"][data-action="start"]').click()
    check('start action returns process sample',page.locator('[data-workload-card="ct109"] .process-row').count()==3)
    check('host process list CPU descending', page.locator('[data-workload-card="ct109"] .process-row').evaluate_all("rows => rows.map(el => parseFloat(el.querySelector('.val').textContent)).every((v,i,a) => i===0 || a[i-1]>=v)"))
    page.locator('nav [data-page="network"]').click()
    page.screenshot(path=str(ROOT/'network-updated.png'),full_page=True)
    page.locator('nav [data-page="kit"]').click()
    page.screenshot(path=str(ROOT/'icons-updated.png'),full_page=True)
    page.close()
    browser.close()
print(f'{len(results)} checks PASSED.')
(ROOT/'ui-test-results.json').write_text(__import__('json').dumps({'passed':len(results),'failed':0,'widths':WIDTHS,'routes':PAGES},ensure_ascii=False,indent=2)+'\n')
