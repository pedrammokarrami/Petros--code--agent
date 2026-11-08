import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\ELI\.gemini\antigravity\brain\72f7998b-aaf8-4244-9b86-e17d11a47f84"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True)
    
    # VIEW 1: Clean Default Landing (Unauthenticated)
    ctx1 = browser.new_context(viewport={"width": 1400, "height": 900})
    p1 = ctx1.new_page()
    p1.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    time.sleep(1)
    p1.screenshot(path=f"{ARTIFACT_DIR}/port_3000_view1_default_landing.png")
    text1 = p1.inner_text("body")
    print("View 1 (Default Landing):", text1[:200].replace("\n", " "))
    ctx1.close()

    # VIEW 2: Laya Redesign (Authenticated session)
    ctx2 = browser.new_context(viewport={"width": 1400, "height": 900})
    p2 = ctx2.new_page()
    p2.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    btn = p2.locator("button").filter(has_text="ایجاد کیف پول جدید").first
    if btn.count() > 0:
        btn.click()
        time.sleep(1)
        chk = p2.locator("input[type='checkbox']").first
        if chk.count() > 0:
            chk.check()
            time.sleep(0.5)
        enter_btn = p2.locator("button").filter(has_text="ورود به لایا").first
        if enter_btn.count() > 0:
            enter_btn.click()
            time.sleep(3)
    p2.screenshot(path=f"{ARTIFACT_DIR}/port_3000_view2_laya_redesign.png")
    text2 = p2.inner_text("body")
    print("View 2 (Laya Redesign):", text2[:200].replace("\n", " "))
    ctx2.close()

    # VIEW 3: Legacy Interface (?legacy=1)
    ctx3 = browser.new_context(viewport={"width": 1400, "height": 900})
    p3 = ctx3.new_page()
    p3.goto("http://127.0.0.1:3000/?legacy=1", wait_until="networkidle")
    time.sleep(1)
    p3.screenshot(path=f"{ARTIFACT_DIR}/port_3000_view3_legacy_interface.png")
    text3 = p3.inner_text("body")
    print("View 3 (Legacy Interface ?legacy=1):", text3[:200].replace("\n", " "))
    ctx3.close()

    browser.close()
    print("ALL THREE SCREENSHOTS CAPTURED SUCCESSFULLY.")
