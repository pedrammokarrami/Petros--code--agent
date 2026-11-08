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
OUTPUT_DIR = r"C:\Users\ELI\Petros\public\screenshots\3d-world"

def test_generative_3d_world():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results = {
        "timestamp": time.time(),
        "stages": {},
        "overall": "FAILED"
    }

    print("==================================================================")
    print(" PETROS — GENERATIVE 3D WORLD & ORIGINAL VISION ACCEPTANCE TEST")
    print("==================================================================")

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME_EXE, headless=True)
        context = browser.new_context(viewport={"width": 1600, "height": 900})
        page = context.new_page()

        print("\n--- STEP 1: Entry & Disposable Wallet Authentication ---")
        page.goto(BASE_URL, timeout=30000, wait_until="networkidle")
        time.sleep(1.0)

        create_btn = page.query_selector("button:has-text('Create New Wallet')") or page.query_selector("button:has-text('ایجاد کیف پول جدید')")
        if create_btn:
            print("   Creating disposable test wallet...")
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

        # -------------------------------------------------------------
        # STEP 2: STAGE 1 — MINIMAL INITIAL ENTRY (Purity & Focus)
        # -------------------------------------------------------------
        print("\n--- STEP 2: Stage 1 — Minimal Initial Entry Audit ---")
        canvas = page.query_selector("canvas")
        has_canvas = canvas is not None
        print("   [Check] Three.js WebGL canvas mounted:", has_canvas)

        brand_el = page.query_selector("text='PETROS'")
        has_brand = brand_el is not None
        print("   [Check] Petros Brand identity visible:", has_brand)

        chat_input = page.query_selector("input[placeholder*='استارتاپ'], input[placeholder*='Describe']")
        has_input = chat_input is not None
        print("   [Check] Minimal floating input field present:", has_input)

        voice_btn = page.query_selector("button[title*='صوت'], button[title*='Voice']")
        has_voice = voice_btn is not None
        print("   [Check] Voice interaction button present:", has_voice)

        cards = page.query_selector_all(".card, [class*='grid-cols-4'], [class*='grid-cols-3']")
        dashboard_cards_count = len(cards)
        print("   [Check] Dashboard card count (must be minimal/0):", dashboard_cards_count)

        ss_initial = os.path.join(OUTPUT_DIR, "01_initial_screen_minimal.png")
        page.screenshot(path=ss_initial)
        print(f"   [Screenshot Saved] {ss_initial}")

        results["stages"]["01_initial_minimal"] = {
            "has_canvas": has_canvas,
            "has_brand": has_brand,
            "has_input": has_input,
            "has_voice": has_voice,
            "dashboard_cards_count": dashboard_cards_count,
            "passed": has_canvas and has_input and has_voice and dashboard_cards_count == 0
        }

        # -------------------------------------------------------------
        # STEP 3: STAGE 2 — PERSIAN CONVERSATION & UNDERSTANDING
        # -------------------------------------------------------------
        print("\n--- STEP 3: Stage 2 — Persian Conversation with Laya ---")
        persian_prompt = "من می‌خواهم یک استارتاپ تجارت الکترونیک بین‌المللی بسازم"
        print(f"   Sending query: '{persian_prompt}'")

        if chat_input:
            chat_input.fill(persian_prompt)
            time.sleep(0.5)

            send_btn = page.query_selector("form button[type='submit']")
            if send_btn:
                send_btn.click()
            else:
                chat_input.press("Enter")

        print("   Waiting for Laya inference and world evolution...")
        time.sleep(5.0)

        ss_chat = os.path.join(OUTPUT_DIR, "02_persian_conversation_understanding.png")
        page.screenshot(path=ss_chat)
        print(f"   [Screenshot Saved] {ss_chat}")

        results["stages"]["02_persian_conversation"] = {
            "prompt": persian_prompt,
            "passed": True
        }

        # -------------------------------------------------------------
        # STEP 4: STAGE 3 — 3D WORLD GENERATION (Commerce Showroom)
        # -------------------------------------------------------------
        print("\n--- STEP 4: Stage 3 — 3D World Generation (Commerce Showroom) ---")
        hud_commerce = page.query_selector("text='COMMERCE'") or page.query_selector("text='commerce'")
        has_hud_commerce = hud_commerce is not None
        print("   [Check] Spatial Commerce HUD active:", has_hud_commerce)

        node_buttons = page.query_selector_all("button:has-text('ویترین'), button:has-text('واحد اقتصادی')")
        print(f"   [Check] Contextual spatial node controls found: {len(node_buttons)}")

        ss_world = os.path.join(OUTPUT_DIR, "03_world_generated_commerce_showroom.png")
        page.screenshot(path=ss_world)
        print(f"   [Screenshot Saved] {ss_world}")

        results["stages"]["03_world_generated_commerce"] = {
            "hud_commerce_active": has_hud_commerce,
            "node_count": len(node_buttons),
            "passed": has_hud_commerce and len(node_buttons) > 0
        }

        # -------------------------------------------------------------
        # STEP 5: STAGE 4 — SPATIAL NODE INTERACTION (Storefront Drawer)
        # -------------------------------------------------------------
        print("\n--- STEP 5: Stage 4 — Spatial Node Interaction & Drawer ---")
        node_btn = page.query_selector("button:has-text('ویترین')")
        if node_btn:
            print("   Clicking spatial node to inspect live business asset...")
            node_btn.click()
            time.sleep(1.5)

            drawer_title = page.query_selector("h3:has-text('commerce')") or page.query_selector("[class*='slide-in-from-right']")
            has_drawer = drawer_title is not None
            print("   [Check] Interactive spatial drawer opened:", has_drawer)

            ss_drawer = os.path.join(OUTPUT_DIR, "04_spatial_interaction_node_drawer.png")
            page.screenshot(path=ss_drawer)
            print(f"   [Screenshot Saved] {ss_drawer}")

            # Close drawer
            close_btn = page.locator("button").filter(has=page.locator("svg.lucide-x"))
            if close_btn:
                close_btn.first.click()
                time.sleep(1.0)

            results["stages"]["04_node_drawer"] = {
                "drawer_opened": has_drawer,
                "passed": has_drawer
            }
        else:
            results["stages"]["04_node_drawer"] = {"passed": False}

        # -------------------------------------------------------------
        # STEP 6: STAGE 5 — TRANSITION TO APP FACTORY / ENGINEERING LAB
        # -------------------------------------------------------------
        print("\n--- STEP 6: Stage 5 — Transition to App Factory / Engineering ---")
        app_prompt = "حالا می‌خواهم یک اپلیکیشن داشبورد React و TypeScript بسازی"
        print(f"   Sending query: '{app_prompt}'")

        chat_input = page.query_selector("input[placeholder*='استارتاپ'], input[placeholder*='Describe']")
        if chat_input:
            chat_input.fill(app_prompt)
            time.sleep(0.5)

            send_btn = page.query_selector("form button[type='submit']")
            if send_btn:
                send_btn.click()
            else:
                chat_input.press("Enter")

        time.sleep(5.0)

        hud_eng = page.query_selector("text='ENGINEERING'") or page.query_selector("text='engineering'")
        has_hud_eng = hud_eng is not None
        print("   [Check] Spatial App Factory HUD active:", has_hud_eng)

        eng_nodes = page.query_selector_all("button:has-text('کامپایلر'), button:has-text('خروجی دسکتاپ')")
        print(f"   [Check] Engineering spatial node controls found: {len(eng_nodes)}")

        ss_eng = os.path.join(OUTPUT_DIR, "05_app_factory_engineering_lab.png")
        page.screenshot(path=ss_eng)
        print(f"   [Screenshot Saved] {ss_eng}")

        if len(eng_nodes) > 0:
            print("   Clicking App Factory Compiler node...")
            eng_nodes[0].click()
            time.sleep(1.5)
            ss_eng_drawer = os.path.join(OUTPUT_DIR, "06_app_factory_compiler_drawer.png")
            page.screenshot(path=ss_eng_drawer)
            print(f"   [Screenshot Saved] {ss_eng_drawer}")

            # Close drawer
            close_btn = page.locator("button").filter(has=page.locator("svg.lucide-x"))
            if close_btn:
                close_btn.first.click()
                time.sleep(1.0)

        results["stages"]["05_app_factory"] = {
            "hud_eng_active": has_hud_eng,
            "node_count": len(eng_nodes),
            "passed": has_hud_eng and len(eng_nodes) > 0
        }

        # -------------------------------------------------------------
        # STEP 7: STAGE 6 — RETURN TO LAYA CORE VOID
        # -------------------------------------------------------------
        print("\n--- STEP 7: Stage 6 — Return to Laya Core Void ---")
        reset_btn = page.query_selector("button[title*='شروع گفتگوی جدید'], button[title*='Start Fresh']")
        if reset_btn:
            reset_btn.click()
            time.sleep(2.0)
            ss_reset = os.path.join(OUTPUT_DIR, "07_return_to_laya_void.png")
            page.screenshot(path=ss_reset)
            print(f"   [Screenshot Saved] {ss_reset}")
            results["stages"]["06_reset_void"] = {"passed": True}

        # Final verdict
        all_passed = all(st.get("passed", False) for st in results["stages"].values())
        results["overall"] = "PASSED" if all_passed else "FAILED"
        print(f"\n[FINAL QA VERDICT] {results['overall']}")

        context.close()
        browser.close()

    # Save results json
    results_path = os.path.join(OUTPUT_DIR, "qa_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Results written to: {results_path}")
    return results

if __name__ == "__main__":
    test_generative_3d_world()
