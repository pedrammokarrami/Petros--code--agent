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
            time.sleep(3)
    
    # Toggle Holographic
    page.evaluate("""() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const holoBtn = buttons.find(b => b.textContent && (b.textContent.includes('هولوگرافیک') || b.textContent.includes('Holographic')));
        if (holoBtn) holoBtn.click();
    }""")
    time.sleep(4)
    
    # Test pausing requestAnimationFrame by overriding it
    print("Pausing requestAnimationFrame...")
    page.evaluate("""() => {
        window.__origRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = () => {};
    }""")
    time.sleep(0.5)
    
    print("Attempting page.screenshot...")
    try:
        page.screenshot(path='scripts/test_ui_and_3d.png', timeout=5000)
        print("SUCCESS! Captured scripts/test_ui_and_3d.png!")
    except Exception as e:
        print("Error:", e)
        
    browser.close()
