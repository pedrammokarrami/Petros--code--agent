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
    btn = page.query_selector("button:has-text('Create New Wallet')") or page.query_selector("button:has-text('ایجاد کیف پول جدید')")
    if btn:
        btn.click()
        time.sleep(0.5)
        chk = page.query_selector("input[type='checkbox']")
        if chk:
            chk.check()
        time.sleep(0.5)
        enter = page.query_selector("button:has-text('Enter Laya')") or page.query_selector("button:has-text('ورود به لایا')")
        if enter:
            enter.click()
            time.sleep(2.0)

    inp = page.query_selector("input[placeholder*='استارتاپ']")
    inp.fill("من می‌خواهم یک استارتاپ تجارت الکترونیک بسازم")
    page.query_selector("form button[type='submit']").click()
    time.sleep(4.0)

    node_btn = page.query_selector("button:has-text('ویترین')")
    print("Node button found:", node_btn is not None)
    if node_btn:
        print("Clicking node button...")
        node_btn.click()
        time.sleep(1.0)
        # Check drawer
        drawer = page.query_selector("h3:has-text('commerce')") or page.query_selector("text='ویترین'") or page.query_selector("[class*='slide-in-from-right']")
        print("Drawer found:", drawer is not None)
        if drawer:
            print("Drawer text:", drawer.inner_text()[:80].replace("\n", " "))
    b.close()
