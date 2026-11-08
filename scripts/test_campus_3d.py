import os
import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\ELI\.gemini\antigravity\brain\72f7998b-aaf8-4244-9b86-e17d11a47f84"
SCREENSHOT_DIR = r"C:\Users\ELI\Petros\public\screenshots\campus_3d"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

chrome_args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu-watchdog',
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True, args=chrome_args)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()

    page.on('console', lambda msg: None)
    page.on('pageerror', lambda err: None)

    print("Navigating to http://127.0.0.1:3000/ ...")
    page.goto("http://127.0.0.1:3000/", wait_until="domcontentloaded")
    time.sleep(2)

    # Click through wallet entry if on wallet screen
    create_wallet_btn = page.locator("button").filter(has_text="ایجاد کیف پول جدید").first
    if create_wallet_btn.count() > 0:
        create_wallet_btn.click()
        time.sleep(1)
        chk = page.locator("input[type='checkbox']").first
        if chk.count() > 0:
            chk.check()
            time.sleep(0.5)
        enter_btn = page.locator("button").filter(has_text="ورود به لایا").first
        if enter_btn.count() > 0:
            enter_btn.click()
            time.sleep(2)

    # Ensure Holographic mode is toggled on
    page.evaluate("""
        const buttons = Array.from(document.querySelectorAll('button'));
        const holoBtn = buttons.find(b => b.textContent && (b.textContent.includes('هولوگرافیک') || b.textContent.includes('Holographic')));
        if (holoBtn) holoBtn.click();
    """)

    print("Waiting 5s for models and scene...")
    time.sleep(5)

    # 1. Arrival View
    p1 = os.path.join(SCREENSHOT_DIR, "01_campus_courtyard_arrival.png")
    page.screenshot(path=p1, animations="disabled", timeout=10000)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "01_campus_courtyard_arrival.png"), animations="disabled", timeout=10000)
    print("View 1 saved:", p1)

    # 2. Main Entrance
    page.evaluate("""
        const roomButtons = Array.from(document.querySelectorAll('button'));
        const btn = roomButtons.find(b => b.textContent && (b.textContent.includes('اتاق فرمان') || b.textContent.includes('Agency') || b.textContent.includes('عملیات')));
        if (btn) btn.click();
    """)
    time.sleep(3)
    p2 = os.path.join(SCREENSHOT_DIR, "02_headquarters_revolving_entrance.png")
    page.screenshot(path=p2, animations="disabled", timeout=10000)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "02_headquarters_revolving_entrance.png"), animations="disabled", timeout=10000)
    print("View 2 saved:", p2)

    # 3. Engineering Lab Wing
    page.evaluate("""
        const roomButtons = Array.from(document.querySelectorAll('button'));
        const btn = roomButtons.find(b => b.textContent && (b.textContent.includes('کارخانه') || b.textContent.includes('Engineering') || b.textContent.includes('مهندسی')));
        if (btn) btn.click();
    """)
    time.sleep(3)
    p3 = os.path.join(SCREENSHOT_DIR, "03_engineering_lab_wing.png")
    page.screenshot(path=p3, animations="disabled", timeout=10000)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "03_engineering_lab_wing.png"), animations="disabled", timeout=10000)
    print("View 3 saved:", p3)

    # 4. Commerce Center Wing
    page.evaluate("""
        const roomButtons = Array.from(document.querySelectorAll('button'));
        const btn = roomButtons.find(b => b.textContent && (b.textContent.includes('فروشگاه') || b.textContent.includes('Commerce') || b.textContent.includes('تجارت')));
        if (btn) btn.click();
    """)
    time.sleep(3)
    p4 = os.path.join(SCREENSHOT_DIR, "04_commerce_center_wing.png")
    page.screenshot(path=p4, animations="disabled", timeout=10000)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "04_commerce_center_wing.png"), animations="disabled", timeout=10000)
    print("View 4 saved:", p4)

    # 5. Courtyard Fountain
    page.evaluate("""
        const roomButtons = Array.from(document.querySelectorAll('button'));
        const btn = roomButtons.find(b => b.textContent && (b.textContent.includes('تحقیق') || b.textContent.includes('Research') || b.textContent.includes('آزمایشگاه')));
        if (btn) btn.click();
    """)
    time.sleep(3)
    p5 = os.path.join(SCREENSHOT_DIR, "05_courtyard_plaza_fountain.png")
    page.screenshot(path=p5, animations="disabled", timeout=10000)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "05_courtyard_plaza_fountain.png"), animations="disabled", timeout=10000)
    print("View 5 saved:", p5)

    # 6. Interactive Orbit View
    page.mouse.move(960, 540)
    page.mouse.down()
    page.mouse.move(650, 460, steps=15)
    page.mouse.up()
    time.sleep(1.5)
    p6 = os.path.join(SCREENSHOT_DIR, "06_interactive_orbit_angle.png")
    page.screenshot(path=p6, animations="disabled", timeout=10000)
    page.screenshot(path=os.path.join(ARTIFACT_DIR, "06_interactive_orbit_angle.png"), animations="disabled", timeout=10000)
    print("View 6 saved:", p6)

    browser.close()
    print("All screenshots successfully captured!")
