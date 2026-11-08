import sys
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=EDGE_EXE,
        headless=True,
        args=[
            "--disable-frame-rate-limit",
            "--disable-gpu-vsync",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding"
        ]
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

    page.goto("http://127.0.0.1:3000/")
    page.wait_for_function("() => window.__petrosEngine && window.__petrosEngine.isRunning === true", timeout=30000)
    page.wait_for_timeout(1000)

    res = page.evaluate("""() => new Promise(resolve => {
        const dts = [];
        let last = performance.now();
        let count = 0;
        function loop(t) {
            dts.push(t - last);
            last = t;
            count++;
            if (count < 60) requestAnimationFrame(loop);
            else resolve(dts);
        }
        requestAnimationFrame(loop);
    })""")

    print(f"With --disable-gpu-vsync: Count={len(res)}, Avg dt={sum(res)/len(res):.2f}ms")
    print(f"First 10 dts: {[round(x, 1) for x in res[:10]]}")
    browser.close()
