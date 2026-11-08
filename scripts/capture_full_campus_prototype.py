import os
import sys
import time
import base64
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\ELI\.gemini\antigravity\brain\72f7998b-aaf8-4244-9b86-e17d11a47f84"
SCREENSHOT_DIR = r"C:\Users\ELI\Petros\public\screenshots\campus_3d"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def pause_and_screenshot(page, filepath, artifact_name=None):
    page.evaluate("if (window.__petrosCancel) window.__petrosCancel();")
    time.sleep(0.2)
    page.screenshot(path=filepath, timeout=8000)
    if artifact_name:
        page.screenshot(path=os.path.join(ARTIFACT_DIR, artifact_name), timeout=8000)
    page.evaluate("if (window.__petrosAnimate) requestAnimationFrame(window.__petrosAnimate);")
    time.sleep(0.2)

def capture_canvas_direct(page, filepath, artifact_name=None):
    data_url = page.evaluate("""() => {
        const canvas = document.querySelector('canvas');
        return canvas ? canvas.toDataURL('image/png') : null;
    }""")
    if data_url and 'base64,' in data_url:
        b64 = data_url.split('base64,')[1]
        data = base64.b64decode(b64)
        with open(filepath, 'wb') as f:
            f.write(data)
        if artifact_name:
            with open(os.path.join(ARTIFACT_DIR, artifact_name), 'wb') as f:
                f.write(data)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True)
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()

    page.on('console', lambda msg: None)
    page.on('pageerror', lambda err: None)

    print("Navigating to http://127.0.0.1:3000/ ...")
    page.goto("http://127.0.0.1:3000/", wait_until="networkidle")
    time.sleep(1)

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
            time.sleep(3)

    # Ensure Holographic mode is toggled on
    page.evaluate("""() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const holoBtn = buttons.find(b => b.textContent && (b.textContent.includes('هولوگرافیک') || b.textContent.includes('Holographic')));
        if (holoBtn) holoBtn.click();
    }""")

    print("Waiting 6s for models to load in holographic mode...")
    time.sleep(6)

    # VIEW 1: Wide Courtyard Panorama (Arrival View)
    print("Capturing View 1: Wide Courtyard Panorama (Arrival View)...")
    page.evaluate("""() => {
        if (window.__petrosSetRoom) window.__petrosSetRoom('void');
        document.getElementById('btn-room-void')?.click();
    }""")
    time.sleep(2)
    pause_and_screenshot(page, os.path.join(SCREENSHOT_DIR, "01_campus_courtyard_arrival_full.png"), "01_campus_courtyard_arrival_full.png")
    capture_canvas_direct(page, os.path.join(SCREENSHOT_DIR, "01_campus_courtyard_arrival_canvas.png"), "01_campus_courtyard_arrival_canvas.png")

    # VIEW 2: Headquarters Revolving Entrance (Agency Room)
    print("Navigating to View 2: Headquarters Revolving Entrance (#btn-room-agency)...")
    page.evaluate("""() => {
        if (window.__petrosSetRoom) window.__petrosSetRoom('agency');
        document.getElementById('btn-room-agency')?.click();
    }""")
    time.sleep(2.5)
    pause_and_screenshot(page, os.path.join(SCREENSHOT_DIR, "02_headquarters_revolving_entrance_full.png"), "02_headquarters_revolving_entrance_full.png")
    capture_canvas_direct(page, os.path.join(SCREENSHOT_DIR, "02_headquarters_revolving_entrance_canvas.png"), "02_headquarters_revolving_entrance_canvas.png")

    # VIEW 3: Engineering Lab Wing (#btn-room-engineering)
    print("Navigating to View 3: Engineering Lab Wing (#btn-room-engineering)...")
    page.evaluate("""() => {
        if (window.__petrosSetRoom) window.__petrosSetRoom('engineering');
        document.getElementById('btn-room-engineering')?.click();
    }""")
    time.sleep(2.5)
    pause_and_screenshot(page, os.path.join(SCREENSHOT_DIR, "03_engineering_lab_wing_full.png"), "03_engineering_lab_wing_full.png")
    capture_canvas_direct(page, os.path.join(SCREENSHOT_DIR, "03_engineering_lab_wing_canvas.png"), "03_engineering_lab_wing_canvas.png")

    # VIEW 4: Commerce Center Wing (#btn-room-commerce)
    print("Navigating to View 4: Commerce Center Wing (#btn-room-commerce)...")
    page.evaluate("""() => {
        if (window.__petrosSetRoom) window.__petrosSetRoom('commerce');
        document.getElementById('btn-room-commerce')?.click();
    }""")
    time.sleep(2.5)
    pause_and_screenshot(page, os.path.join(SCREENSHOT_DIR, "04_commerce_center_wing_full.png"), "04_commerce_center_wing_full.png")
    capture_canvas_direct(page, os.path.join(SCREENSHOT_DIR, "04_commerce_center_wing_canvas.png"), "04_commerce_center_wing_canvas.png")

    # VIEW 5: Interactive Orbit Angle
    print("Navigating to View 5: Interactive Orbit Angle...")
    page.evaluate("""() => {
        if (window.__petrosSetRoom) window.__petrosSetRoom('void');
        document.getElementById('btn-room-void')?.click();
    }""")
    time.sleep(1.5)
    page.mouse.move(180, 400)
    page.mouse.down()
    page.mouse.move(500, 280, steps=25)
    page.mouse.up()
    time.sleep(1.5)
    pause_and_screenshot(page, os.path.join(SCREENSHOT_DIR, "05_interactive_orbit_angle_full.png"), "05_interactive_orbit_angle_full.png")
    capture_canvas_direct(page, os.path.join(SCREENSHOT_DIR, "05_interactive_orbit_angle_canvas.png"), "05_interactive_orbit_angle_canvas.png")

    # VIEW 6: Normal Mode Comparison (proves seamless mode switching)
    print("Switching to Normal Mode for comparison...")
    page.evaluate("""() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const normalBtn = buttons.find(b => b.textContent && (b.textContent.includes('حالت عادی') || b.textContent.includes('Normal')));
        if (normalBtn) normalBtn.click();
    }""")
    time.sleep(1.5)
    pause_and_screenshot(page, os.path.join(SCREENSHOT_DIR, "06_normal_mode_clean_stage.png"), "06_normal_mode_clean_stage.png")

    browser.close()
    print("ALL PROTOTYPE VIEWS CAPTURED SUCCESSFULLY!")
