from pathlib import Path
import asyncio
from playwright.async_api import async_playwright
ROOT=Path.cwd()
OUT=ROOT/'site/previews'
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=await browser.new_page(viewport={'width':1440,'height':1000})
        await page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        await page.wait_for_timeout(700)
        await page.screenshot(path=str(OUT/'preview.png'),full_page=False)
        for section,name in [('charts','charts.png'),('workspace','workspace.png')]:
            await page.locator('#'+section).scroll_into_view_if_needed()
            await page.wait_for_timeout(250)
            await page.screenshot(path=str(OUT/name),full_page=False)
        await page.set_viewport_size({'width':390,'height':844})
        await page.goto((ROOT/'index.html').as_uri(),wait_until='load')
        await page.wait_for_timeout(500)
        await page.screenshot(path=str(OUT/'mobile.png'),full_page=False)
        await browser.close()
asyncio.run(main())
