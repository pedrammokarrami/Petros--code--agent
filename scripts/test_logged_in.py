import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True)
    page = browser.new_page(viewport={'width': 1400, 'height': 900})
    page.goto('http://127.0.0.1:3000/', wait_until='networkidle')
    btn = page.locator('button').filter(has_text='ایجاد کیف پول جدید').first
    if btn.count() > 0:
        btn.click()
        time.sleep(1)
        chk = page.locator("input[type='checkbox']").first
        if chk.count() > 0:
            chk.check()
            time.sleep(0.5)
        enter_btn = page.locator('button').filter(has_text='ورود به لایا').first
        if enter_btn.count() > 0:
            enter_btn.click()
            print("Clicked login, waiting 4s...")
            time.sleep(4)
            
    canvas_count = page.locator('canvas').count()
    print('Canvas count in DOM:', canvas_count)
    page.screenshot(path='scripts/test_logged_in.png', timeout=10000)
    print('Screenshot test_logged_in.png captured!')
    browser.close()
