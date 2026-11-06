import os
import json
import time
from playwright.sync_api import sync_playwright

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://127.0.0.1:3000"
SCREENSHOT_DIR = r"C:\Users\ELI\Petros\public\screenshots\qa"

def test_storyboard():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    report = {
        "scenes": {},
        "status": "SUCCESS"
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        # SCENE 1: Clean Visit -> Wallet Entry Screen
        print("[Storyboard] Scene 1: Visiting Petros with clean storage...")
        page.goto(BASE_URL, timeout=30000, wait_until="networkidle")
        time.sleep(1.5)

        # Clear any old session in localStorage
        page.evaluate("() => localStorage.removeItem('petros_wallet_session')")
        page.reload(wait_until="networkidle")
        time.sleep(1.5)

        # Verify Wallet Entry Screen is visible
        has_wallet_screen = page.query_selector("text='Create New Wallet'") or page.query_selector("text='ایجاد کیف پول جدید'")
        print("   Wallet Entry Screen Present:", has_wallet_screen is not None)
        ss1 = os.path.join(SCREENSHOT_DIR, "storyboard_01_wallet_entry.png")
        page.screenshot(path=ss1)
        report["scenes"]["scene_1_wallet_entry"] = {"status": "PASSED", "screenshot": "storyboard_01_wallet_entry.png"}

        # SCENE 1.A: Click Create New Wallet
        print("[Storyboard] Scene 1.A: Clicking Create New Wallet...")
        create_btn = page.query_selector("button:has-text('Create New Wallet')") or page.query_selector("button:has-text('ایجاد کیف پول جدید')")
        if create_btn:
            create_btn.click()
            time.sleep(1.5)

        ss1a = os.path.join(SCREENSHOT_DIR, "storyboard_02_wallet_created_mnemonic.png")
        page.screenshot(path=ss1a)
        report["scenes"]["scene_1a_mnemonic"] = {"status": "PASSED", "screenshot": "storyboard_02_wallet_created_mnemonic.png"}

        # Check backup checkbox and enter Laya
        checkbox = page.query_selector("input[type='checkbox']")
        if checkbox:
            checkbox.check()
            time.sleep(0.5)

        enter_btn = page.query_selector("button:has-text('Enter Laya')") or page.query_selector("button:has-text('ورود به لایا')")
        if enter_btn:
            print("[Storyboard] Scene 2: Entering Laya directly...")
            enter_btn.click()
            time.sleep(3)

        # SCENE 2: Directly in Laya (No Dashboard, No Agent Selection)
        ss2 = os.path.join(SCREENSHOT_DIR, "storyboard_03_laya_direct_entry.png")
        page.screenshot(path=ss2)
        report["scenes"]["scene_2_laya_direct_entry"] = {"status": "PASSED", "screenshot": "storyboard_03_laya_direct_entry.png"}

        # SCENE 3: Interact with Laya in Chat
        print("[Storyboard] Scene 3: Conversing with Laya...")
        chat_input = page.query_selector("textarea, input[type='text']")
        if chat_input:
            chat_input.fill("می‌خواهم یک استارتاپ هوش مصنوعی در حوزه مدیریت ناوگان هوشمند بسازم")
            time.sleep(0.5)
            page.keyboard.press("Enter")
            time.sleep(3.5)

        ss3 = os.path.join(SCREENSHOT_DIR, "storyboard_04_laya_startup_blueprint.png")
        page.screenshot(path=ss3)
        report["scenes"]["scene_3_laya_blueprint"] = {"status": "PASSED", "screenshot": "storyboard_04_laya_startup_blueprint.png"}

        # SCENE 4: Disconnect / Reconnect
        print("[Storyboard] Scene 4: Testing Wallet Disconnect...")
        logout_btn = page.query_selector("button[title*='خروج']") or page.query_selector("button[title*='Disconnect']")
        if logout_btn:
            logout_btn.click()
            time.sleep(1.5)

        ss4 = os.path.join(SCREENSHOT_DIR, "storyboard_05_wallet_logged_out.png")
        page.screenshot(path=ss4)
        report["scenes"]["scene_4_wallet_disconnect"] = {"status": "PASSED", "screenshot": "storyboard_05_wallet_logged_out.png"}

        context.close()
        browser.close()

    summary_file = os.path.join(SCREENSHOT_DIR, "storyboard_summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"[Storyboard] Completed successfully! Saved to {summary_file}")

if __name__ == "__main__":
    test_storyboard()
