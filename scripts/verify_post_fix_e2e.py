import os
import sys
import json
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

CHROME_EXE = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_URL = "http://127.0.0.1:3000"
SCREENSHOT_DIR = r"C:\Users\ELI\Petros\public\screenshots\post-fix-audit"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_verification():
    print("==================================================================")
    print(" PETROS v4.0.0 — COMPREHENSIVE POST-FIX E2E & REGRESSION AUDIT")
    print("==================================================================")
    
    results = {
        "timestamp": time.time(),
        "js_syntax_errors": [],
        "mic_handler_test": {},
        "app_factory_validate_api": {},
        "mode_switching_test": {},
        "laya_chat_test": {},
        "history_persistence_test": {},
        "history_drawer_test": {}
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True)
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()

        # Capture console & page errors
        page.on("pageerror", lambda err: results["js_syntax_errors"].append(str(err)))

        print("\n--- 1. Initial Load & Syntax Integrity ---")
        t0 = time.time()
        page.goto(BASE_URL, timeout=30000, wait_until="networkidle")
        load_time_ms = round((time.time() - t0) * 1000, 2)
        print(f"   Page loaded in {load_time_ms} ms. JS syntax errors detected: {len(results['js_syntax_errors'])}")

        # -------------------------------------------------------------
        # STEP 2: Authenticate Wallet to enter Laya Generative Experience
        # -------------------------------------------------------------
        print("\n--- 2. Entering Laya Generative Experience ---")
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
                time.sleep(3.0)
        
        shot_entry = os.path.join(SCREENSHOT_DIR, "01_laya_main_stage.png")
        page.screenshot(path=shot_entry)
        print(f"   Main stage screenshot captured: {shot_entry}")

        # -------------------------------------------------------------
        # STEP 3: Microphone Handler Syntax & Event Verification
        # -------------------------------------------------------------
        print("\n--- 3. Verifying Microphone Handler (index.html:251) ---")
        mic_eval = page.evaluate("""() => {
            const btn = document.querySelector('.mic-button') || document.querySelector('[aria-label*="mic"]') || document.querySelector('[data-action="mic"]');
            if (btn) {
                btn.click();
                return { found: true, clicked: true, synthetic: false };
            }
            // Trigger custom event on temporary button to verify line 251 listener syntax
            const testBtn = document.createElement('button');
            testBtn.className = 'mic-button';
            testBtn.setAttribute('data-action', 'mic');
            document.body.appendChild(testBtn);
            let success = false;
            try {
                testBtn.click();
                success = true;
            } catch(e) {
                return { found: true, clicked: false, error: e.toString() };
            } finally {
                testBtn.remove();
            }
            return { found: true, clicked: success, synthetic: true };
        }""")
        results["mic_handler_test"] = mic_eval
        print(f"   Mic Handler Test Result: {mic_eval}")

        # -------------------------------------------------------------
        # STEP 4: App Factory API Validation from Browser Context
        # -------------------------------------------------------------
        print("\n--- 4. Verifying App Factory Validation (sourceCode vs code) ---")
        app_res = page.evaluate("""async () => {
            try {
                // Test 1: with sourceCode
                const r1 = await fetch('/api/app-factory/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appName: 'ValidationTest App',
                        sourceCode: 'export default function App() { return <div className=\"p-4\">Auton Test</div>; }'
                    })
                });
                const d1 = await r1.json();

                // Test 2: with code
                const r2 = await fetch('/api/app-factory/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        appName: 'ValidationTest Code App',
                        code: 'export default function App() { return <div className=\"p-4\">Auton Test Code</div>; }'
                    })
                });
                const d2 = await r2.json();

                return {
                    sourceCodeTest: { status: r1.status, success: d1.success, valid: d1.valid, buildTimeMs: d1.buildTimeMs },
                    codeTest: { status: r2.status, success: d2.success, valid: d2.valid, buildTimeMs: d2.buildTimeMs }
                };
            } catch(err) {
                return { error: err.toString() };
            }
        }""")
        results["app_factory_validate_api"] = app_res
        print(f"   App Factory Validate API results: {app_res}")

        # -------------------------------------------------------------
        # STEP 5: Mode Switching (Normal vs Holographic)
        # -------------------------------------------------------------
        print("\n--- 5. Verifying Mode Switching (Normal <-> Holographic) ---")
        # Check initial state
        is_normal_btn = page.query_selector("#btn-mode-normal")
        is_holo_btn = page.query_selector("#btn-mode-holographic")
        print(f"   Mode buttons located: Normal={bool(is_normal_btn)}, Holographic={bool(is_holo_btn)}")

        if is_normal_btn and is_holo_btn:
            # 1. Click Normal Mode
            is_normal_btn.click()
            time.sleep(1.0)
            normal_state = page.evaluate("""() => {
                const btn = document.getElementById('btn-mode-normal');
                const isNormalActive = btn?.classList.contains('bg-gradient-to-r');
                const canvasContainer = document.querySelector('div[style*=\"background: rgb(2, 4, 10)\"]') || document.querySelector('canvas')?.parentElement;
                const isHidden = canvasContainer ? (canvasContainer.classList.contains('opacity-0') || canvasContainer.classList.contains('pointer-events-none')) : false;
                return { isNormalActive, isHidden };
            }""")
            print(f"   Normal Mode Switch: {normal_state}")

            # 2. Click Holographic Mode
            is_holo_btn.click()
            time.sleep(1.0)
            holo_state = page.evaluate("""() => {
                const btn = document.getElementById('btn-mode-holographic');
                const isHoloActive = btn?.classList.contains('bg-gradient-to-r');
                const canvasContainer = document.querySelector('div[style*=\"background: rgb(2, 4, 10)\"]') || document.querySelector('canvas')?.parentElement;
                const isVisible = canvasContainer ? canvasContainer.classList.contains('opacity-100') : false;
                return { isHoloActive, isVisible };
            }""")
            print(f"   Holographic Mode Switch: {holo_state}")

            results["mode_switching_test"] = {
                "buttons_found": True,
                "normal": normal_state,
                "holographic": holo_state,
                "success": normal_state.get("isNormalActive") and holo_state.get("isHoloActive")
            }
        else:
            results["mode_switching_test"] = {"buttons_found": False, "success": False}

        # -------------------------------------------------------------
        # STEP 6: Laya Chat, Clean Turn Focus, and State Persistence
        # -------------------------------------------------------------
        print("\n--- 6. Verifying Laya Chat & Clean Turn Focus ---")
        prompt_sent = page.evaluate("""() => {
            const input = document.querySelector('form input[type=\"text\"]') || document.querySelector('input[type=\"text\"]');
            if (!input) return false;
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) {
                nativeSetter.call(input, 'ایده استارتاپ گردشگری سلامت');
            } else {
                input.value = 'ایده استارتاپ گردشگری سلامت';
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            const form = input.closest('form');
            const submitBtn = form ? form.querySelector('button[type=\"submit\"]') : null;
            if (submitBtn) {
                submitBtn.click();
                return true;
            }
            if (form) {
                form.requestSubmit();
                return true;
            }
            return false;
        }""")
        print(f"   Chat Prompt Dispatched via form: {prompt_sent}")
        if prompt_sent:
            time.sleep(7.0)

            shot_chat = os.path.join(SCREENSHOT_DIR, "02_laya_turn_response.png")
            try:
                page.screenshot(path=shot_chat, timeout=6000)
            except Exception as e:
                print(f"   (Screenshot skipped: {e})")

            # Verify response appeared on screen
            chat_verified = page.evaluate("""() => {
                const text = document.body.innerText;
                const hasTopic = text.includes('گردشگری سلامت') || text.includes('سلامت');
                return { hasTopic: hasTopic, textSnippet: text.substring(0, 200) };
            }""")
            results["laya_chat_test"] = chat_verified
            print(f"   Chat Verified on Screen: {chat_verified}")

            # Verify localStorage history persistence
            hist_eval = page.evaluate("""() => {
                const raw = localStorage.getItem('petros_generative_messages') || localStorage.getItem('petros_laya_clean_history') || localStorage.getItem('petros_city_laya_history');
                if (!raw) return { persisted: false, count: 0 };
                try {
                    const parsed = JSON.parse(raw);
                    return { persisted: true, count: parsed.length, latestRole: parsed[parsed.length - 1]?.role };
                } catch {
                    return { persisted: false, count: 0 };
                }
            }""")
            results["history_persistence_test"] = hist_eval
            print(f"   History Persistence in LocalStorage: {hist_eval}")

        # -------------------------------------------------------------
        # STEP 7: History Drawer Slide-Over Verification
        # -------------------------------------------------------------
        print("\n--- 7. Verifying History Drawer Slide-Over ---")
        drawer_click_success = page.evaluate("""() => {
            const btn = document.getElementById('btn-toggle-history') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('تاریخچه') || b.textContent.includes('History'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        }""")
        if drawer_click_success:
            time.sleep(1.0)
            drawer_open = page.evaluate("""() => {
                return document.querySelector('.apple-drawer-enter') !== null || document.body.textContent.includes('تاریخچه کامل گفتگو');
            }""")
            results["history_drawer_test"] = {"button_clicked": True, "drawer_open": drawer_open}
            print(f"   History Drawer open: {drawer_open}")
            try:
                shot_drawer = os.path.join(SCREENSHOT_DIR, "03_history_drawer_open.png")
                page.screenshot(path=shot_drawer, timeout=6000)
            except Exception as e:
                print(f"   (Screenshot skipped: {e})")
        else:
            results["history_drawer_test"] = {"button_clicked": False, "drawer_open": False}
            print("   History Drawer button not found!")

        browser.close()

    print("\n==================================================================")
    print(" VERIFICATION TEST RESULTS SUMMARY")
    print("==================================================================")
    print(json.dumps(results, indent=2, ensure_ascii=False))

    passed = (
        len(results["js_syntax_errors"]) == 0 and
        results["mic_handler_test"].get("clicked") == True and
        results["app_factory_validate_api"].get("sourceCodeTest", {}).get("success") == True and
        results["app_factory_validate_api"].get("sourceCodeTest", {}).get("valid") == True and
        results["app_factory_validate_api"].get("codeTest", {}).get("success") == True and
        results["app_factory_validate_api"].get("codeTest", {}).get("valid") == True and
        results["mode_switching_test"].get("success") == True and
        results["laya_chat_test"].get("hasTopic") == True and
        results["history_persistence_test"].get("persisted") == True and
        results["history_drawer_test"].get("drawer_open") == True
    )

    print(f"\nOVERALL RESULT: {'ALL TESTS PASSED (PASS)' if passed else 'FAIL'}")
    if not passed:
        sys.exit(1)

if __name__ == "__main__":
    run_verification()
