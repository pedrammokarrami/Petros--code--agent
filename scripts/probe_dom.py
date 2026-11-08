import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    page = b.new_page()
    page.goto('http://127.0.0.1:3000')
    time.sleep(1.0)
    print('URL:', page.url)

    create_btn = page.query_selector("button:has-text('Create New Wallet')") or page.query_selector("button:has-text('ایجاد کیف پول جدید')")
    if create_btn:
        print('Found WalletAuthScreen, clicking create...')
        create_btn.click()
        time.sleep(1.0)
        chk = page.query_selector("input[type='checkbox']")
        if chk:
            chk.check()
        time.sleep(0.5)
        enter_btn = page.query_selector("button:has-text('Enter Laya')") or page.query_selector("button:has-text('ورود به لایا')")
        if enter_btn:
            print('Clicking Enter Laya...')
            enter_btn.click()
            time.sleep(3.0)

    print('\n--- ALL VISIBLE TEXT BLOCKS ---')
    for el in page.query_selector_all('p, span, div, button, input'):
        txt = el.evaluate('e => (e.innerText || e.placeholder || "").trim()')
        if txt and 0 < len(txt) < 120 and '\n' not in txt:
            print(f"  [{el.evaluate('e => e.tagName')}]: {txt}")

    b.close()
