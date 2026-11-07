import os
import sys
import time
import shutil
import base64
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\ELI\.gemini\antigravity\brain\72f7998b-aaf8-4244-9b86-e17d11a47f84"
LOCAL_SHOTS_DIR = os.path.join(os.getcwd(), "public", "screenshots", "ecosystem")
os.makedirs(LOCAL_SHOTS_DIR, exist_ok=True)
os.makedirs(ARTIFACT_DIR, exist_ok=True)

def copy_to_artifact(src_path, filename):
    dest_path = os.path.join(ARTIFACT_DIR, filename)
    shutil.copyfile(src_path, dest_path)
    print(f"Copied {filename} to artifact dir: {dest_path}")

def run():
    print("[Playwright] Starting Full Ecosystem Visual Verification with Chrome:", CHROME_EXE)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True)

        # 1. Desktop Context
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=1.0,
            ignore_https_errors=True
        )

        context.add_init_script("""
            localStorage.setItem('petros_wallet_session', JSON.stringify({
                sessionId: 'session_ecosystem_eval',
                walletAddress: '0x71C...B29',
                projectSlug: 'ecosystem-prime'
            }));
            localStorage.setItem('petros_visual_mode', 'holographic');
            localStorage.setItem('petros_active_domain', 'campus');
        """)

        page = context.new_page()
        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text[:120]}"))

        print("[Playwright] Navigating to http://127.0.0.1:3000...")
        page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded", timeout=15000)
        time.sleep(3.5)

        def safe_screenshot(filepath, base_name):
            try:
                page.evaluate("if (window.__petrosCancel) window.__petrosCancel();")
            except:
                pass
            time.sleep(0.3)
            page.screenshot(path=filepath, timeout=8000)
            copy_to_artifact(filepath, base_name)
            try:
                page.evaluate("if (window.__petrosAnimate) window.__petrosAnimate();")
            except:
                pass
            time.sleep(0.3)

        # 1. Campus Courtyard
        print("\n--- TEST 1: Campus Central Headquarters ---")
        shot1 = os.path.join(LOCAL_SHOTS_DIR, "01_ecosystem_campus_courtyard.png")
        safe_screenshot(shot1, "01_ecosystem_campus_courtyard.png")

        # 2. Agency World
        print("\n--- TEST 2: Agency Domain (Executive Consulting Suite) ---")
        page.evaluate("""
            if (window.__petrosSetDomain) {
                window.__petrosSetDomain('agency');
            } else {
                document.getElementById('btn-domain-agency')?.click();
            }
        """)
        time.sleep(3.0)
        shot2 = os.path.join(LOCAL_SHOTS_DIR, "02_ecosystem_agency_world.png")
        safe_screenshot(shot2, "02_ecosystem_agency_world.png")

        # 3. Commerce World
        print("\n--- TEST 3: Commerce Domain (Logistics & Distribution Bay) ---")
        page.evaluate("""
            if (window.__petrosSetDomain) {
                window.__petrosSetDomain('commerce');
            } else {
                document.getElementById('btn-domain-commerce')?.click();
            }
        """)
        time.sleep(3.0)
        shot3 = os.path.join(LOCAL_SHOTS_DIR, "03_ecosystem_commerce_world.png")
        safe_screenshot(shot3, "03_ecosystem_commerce_world.png")

        # 4. Content Studio World
        print("\n--- TEST 4: Content Domain (Media Broadcast Stage) ---")
        page.evaluate("""
            if (window.__petrosSetDomain) {
                window.__petrosSetDomain('content');
            } else {
                document.getElementById('btn-domain-content')?.click();
            }
        """)
        time.sleep(3.0)
        shot4 = os.path.join(LOCAL_SHOTS_DIR, "04_ecosystem_content_studio.png")
        safe_screenshot(shot4, "04_ecosystem_content_studio.png")

        # 5. Research Lab World
        print("\n--- TEST 5: Research Domain (AI Supercomputing Lab) ---")
        page.evaluate("""
            if (window.__petrosSetDomain) {
                window.__petrosSetDomain('research');
            } else {
                document.getElementById('btn-domain-research')?.click();
            }
        """)
        time.sleep(3.0)
        shot5 = os.path.join(LOCAL_SHOTS_DIR, "05_ecosystem_research_lab.png")
        safe_screenshot(shot5, "05_ecosystem_research_lab.png")

        # 6. Real Business Event Reaction
        print("\n--- TEST 6: Business Event Gateway Reaction ---")
        page.evaluate("""
            if (window.__petrosEmitEvent) {
                window.__petrosEmitEvent({
                    id: 'evt-test-live-' + Date.now(),
                    category: 'research',
                    domain: 'research',
                    type: 'simulation_completed',
                    title: 'Quantum Neural Model Convergence',
                    description: 'Loss reached 0.0012, all 128 TPU pods verified.',
                    timestamp: Date.now()
                });
            }
        """)
        time.sleep(2.0)
        shot6 = os.path.join(LOCAL_SHOTS_DIR, "06_ecosystem_event_reaction.png")
        safe_screenshot(shot6, "06_ecosystem_event_reaction.png")

        # 7. Normal Mode (Clean Conversational Stage)
        print("\n--- TEST 7: Normal Mode (Clean Distraction-Free Stage) ---")
        page.evaluate("document.getElementById('btn-mode-normal')?.click();")
        time.sleep(1.5)
        shot7 = os.path.join(LOCAL_SHOTS_DIR, "07_ecosystem_normal_stage.png")
        safe_screenshot(shot7, "07_ecosystem_normal_stage.png")

        # Switch back to holographic
        page.evaluate("document.getElementById('btn-mode-holographic')?.click();")
        time.sleep(1.0)
        context.close()

        # 8. Mobile Viewport (iPhone 14 / modern responsive layout)
        print("\n--- TEST 8: Mobile Responsive Viewport (390x844) ---")
        mobile_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2.0,
            is_mobile=True,
            has_touch=True
        )
        mobile_context.add_init_script("""
            localStorage.setItem('petros_wallet_session', JSON.stringify({
                sessionId: 'session_mobile',
                walletAddress: '0x71C...B29',
                projectSlug: 'ecosystem-prime'
            }));
            localStorage.setItem('petros_visual_mode', 'holographic');
            localStorage.setItem('petros_active_domain', 'agency');
        """)
        mobile_page = mobile_context.new_page()
        mobile_page.goto("http://127.0.0.1:3000", wait_until="domcontentloaded", timeout=15000)
        time.sleep(3.5)

        try:
            mobile_page.evaluate("if (window.__petrosCancel) window.__petrosCancel();")
        except:
            pass
        time.sleep(0.3)
        shot8 = os.path.join(LOCAL_SHOTS_DIR, "08_ecosystem_mobile_viewport.png")
        mobile_page.screenshot(path=shot8, timeout=8000)
        copy_to_artifact(shot8, "08_ecosystem_mobile_viewport.png")

        mobile_context.close()
        browser.close()
        print("\n[Playwright] All 8 Ecosystem Tests Completed Successfully!")

if __name__ == "__main__":
    run()
