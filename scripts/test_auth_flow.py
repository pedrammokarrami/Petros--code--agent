import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE_PATH, headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    
    # 1. Click Create New Wallet
    page.locator("button").filter(has_text="ایجاد کیف پول جدید").first.click()
    time.sleep(1)
    
    # 2. Check the backup confirmation checkbox
    cb = page.locator("input[type='checkbox']").first
    cb.check()
    time.sleep(0.5)
    
    # 3. Click Enter Laya
    enter_btn = page.locator("button").filter(has_text="ورود به لایا").first
    print("Found enter laya button count:", enter_btn.count())
    enter_btn.click()
    time.sleep(3)
    
    buttons = [b.inner_text().strip().replace('\n', ' ') for b in page.query_selector_all('button')]
    print("Buttons in Laya Experience:", buttons)
    print("Textarea count:", page.locator("textarea").count())
    print("Canvas count:", page.locator("canvas").count())
    page.screenshot(path="public/screenshots/laya_entered.png")
