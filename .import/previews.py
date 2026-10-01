from pathlib import Path
import asyncio
from playwright.async_api import async_playwright

ROOT=Path.cwd()
OUT=ROOT/'site/previews'
OUT.mkdir(parents=True,exist_ok=True)
URL=(ROOT/'index.html').as_uri()

async def fresh(browser,width=1440,height=1000):
    page=await browser.new_page(viewport={'width':width,'height':height})
    await page.goto(URL,wait_until='load')
    await page.wait_for_timeout(500)
    return page

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])

        page=await fresh(browser)
        await page.screenshot(path=str(OUT/'preview.png'),full_page=False)
        for section,name in [('charts','charts.png'),('workspace','workspace.png')]:
            await page.locator('#'+section).scroll_into_view_if_needed()
            await page.wait_for_timeout(180)
            await page.screenshot(path=str(OUT/name),full_page=False)

        await page.locator('#motion-limit').evaluate("(n)=>n.parentElement.scrollIntoView({block:'center',behavior:'instant'})")
        await page.locator('#motion-limit').locator('xpath=..').locator('.s-selectbox__button').click()
        await page.screenshot(path=str(OUT/'dropdown-desktop.png'),full_page=False)
        await page.keyboard.press('Escape')

        await page.locator('#interaction-feedback').scroll_into_view_if_needed()
        await page.locator('#focus-demo-start').click()
        await page.wait_for_timeout(80)
        await page.screenshot(path=str(OUT/'feedback-desktop.png'),full_page=False)
        await page.close()

        mobile=await fresh(browser,390,844)
        await mobile.screenshot(path=str(OUT/'mobile.png'),full_page=False)
        await mobile.locator('#motion-limit').evaluate("(n)=>n.parentElement.scrollIntoView({block:'center',behavior:'instant'})")
        await mobile.locator('#motion-limit').locator('xpath=..').locator('.s-selectbox__button').click()
        await mobile.screenshot(path=str(OUT/'dropdown-mobile.png'),full_page=False)
        await mobile.keyboard.press('Escape')
        await mobile.locator('#interaction-feedback').scroll_into_view_if_needed()
        await mobile.locator('#focus-demo-start').click()
        await mobile.wait_for_timeout(80)
        await mobile.screenshot(path=str(OUT/'feedback-mobile.png'),full_page=False)
        await mobile.close()

        await browser.close()

asyncio.run(main())
