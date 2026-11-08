import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE_EXE, headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    # Pre-seed localStorage with authenticated session and holographic visual mode
    page.add_init_script("""
        localStorage.setItem('petros_wallet_session', JSON.stringify({
            sessionId: 'sess_test_123',
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            projectSlug: 'petros-main'
        }));
        localStorage.setItem('petros_visual_mode', 'holographic');
        localStorage.setItem('codgar_project_confirmed', 'true');
    """)

    page.goto("http://127.0.0.1:3000/")
    page.wait_for_timeout(3000)

    print("Title:", page.title())

    btn_ids = page.evaluate("() => Array.from(document.querySelectorAll('button')).map(b => ({ id: b.id, text: b.innerText.trim() }))")
    print(f"Buttons found ({len(btn_ids)}):")
    for b in btn_ids:
        if b['id']:
            print(f"  id='{b['id']}' | text='{b['text']}'")

    canvases = page.locator("canvas").count()
    print("Canvases count:", canvases)

    globals_check = page.evaluate("""
        () => ({
            hasPetrosEngine: typeof window.__petrosEngine !== 'undefined',
            hasPetrosSetRoom: typeof window.__petrosSetRoom !== 'undefined',
            hasPetrosSetDomain: typeof window.__petrosSetDomain !== 'undefined',
            engineDomain: window.__petrosEngine ? window.__petrosEngine.currentDomain : null,
            engineRoom: window.__petrosEngine ? window.__petrosEngine.currentRoomId : null,
        })
    """)
    print("Globals check:", globals_check)

    browser.close()
