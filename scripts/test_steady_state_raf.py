import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=EDGE_EXE,
        headless=True
    )
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    page.add_init_script("""
        localStorage.setItem('petros_wallet_session', JSON.stringify({
            sessionId: 'sess_test_123',
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            projectSlug: 'petros-main'
        }));
        localStorage.setItem('petros_visual_mode', 'holographic');
        localStorage.setItem('codgar_project_confirmed', 'true');
    """)

    print("Navigating to http://127.0.0.1:3000/...")
    page.goto("http://127.0.0.1:3000/")

    # Wait for engine to be ready
    print("Waiting for __petrosEngine to initialize...")
    page.wait_for_function("() => window.__petrosEngine && window.__petrosEngine.isRunning === true", timeout=30000)
    print("Engine initialized! Waiting 3s for initial scene settling...")
    page.wait_for_timeout(3000)

    # Now measure 60 frames of steady-state RAF
    print("Measuring steady-state RAF...")
    samples = page.evaluate("""() => new Promise(resolve => {
        const timestamps = [];
        let count = 0;
        function loop(ts) {
            timestamps.push(ts);
            count++;
            if (count < 60) {
                requestAnimationFrame(loop);
            } else {
                resolve(timestamps);
            }
        }
        requestAnimationFrame(loop);
    })""")

    dts = [samples[i] - samples[i-1] for i in range(1, len(samples))]
    avg_dt = sum(dts) / len(dts) if dts else 0
    fps = 1000 / avg_dt if avg_dt > 0 else 0
    print(f"Steady-State RAF: Count={len(dts)}, Avg dt={avg_dt:.2f}ms, Approx FPS={fps:.1f}")
    print(f"First 15 dts: {[round(x, 1) for x in dts[:15]]}")

    browser.close()
