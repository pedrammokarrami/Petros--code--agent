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

    create_btn = page.query_selector("button:has-text('Create New Wallet')") or page.query_selector("button:has-text('ایجاد کیف پول جدید')")
    if create_btn:
        create_btn.click()
        time.sleep(1.0)
        chk = page.query_selector("input[type='checkbox']")
        if chk:
            chk.check()
        time.sleep(0.5)
        enter_btn = page.query_selector("button:has-text('Enter Laya')") or page.query_selector("button:has-text('ورود به لایا')")
        if enter_btn:
            enter_btn.click()
            time.sleep(2.5)

    input_el = page.query_selector("input[placeholder*='استارتاپ']")
    print("Input found:", input_el is not None)
    if input_el:
        prompt = "من می‌خواهم یک استارتاپ تجارت الکترونیک بسازم"
        input_el.fill(prompt)
        time.sleep(0.5)
        print("Input value after fill:", input_el.evaluate("e => e.value"))

        submit_btn = page.query_selector("form button[type='submit']")
        print("Submit btn found:", submit_btn is not None)
        print("Submit btn disabled:", submit_btn.evaluate("e => e.disabled"))

        submit_btn.click()
        print("Clicked submit button! Waiting 5s...")
        time.sleep(5.0)

        # Inspect messages
        for el in page.query_selector_all("p, span, div"):
            txt = el.evaluate("e => (e.innerText || '').trim()")
            if "تجارت" in txt or "لایا" in txt or "استارتاپ" in txt:
                print(f"Matched text: {txt[:80]}")

    b.close()
