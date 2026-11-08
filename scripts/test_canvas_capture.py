import sys
import time
import base64
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
            time.sleep(3)
    
    # Toggle Holographic mode
    page.evaluate("""() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const holoBtn = buttons.find(b => b.textContent && (b.textContent.includes('هولوگرافیک') || b.textContent.includes('Holographic')));
        if (holoBtn) holoBtn.click();
    }""")
    print("Waiting 5s for models to load in holographic mode...")
    time.sleep(5)
    
    data_url = page.evaluate("""() => {
        const canvas = document.querySelector('canvas');
        return canvas ? canvas.toDataURL('image/png') : null;
    }""")
    if data_url and 'base64,' in data_url:
        b64 = data_url.split('base64,')[1]
        with open('scripts/canvas_direct.png', 'wb') as f:
            f.write(base64.b64decode(b64))
        print('Captured canvas_direct.png! Bytes written:', len(base64.b64decode(b64)))
    else:
        print('No data URL returned')
    browser.close()
