import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=EDGE_EXE,
        headless=True,
        args=[
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding"
        ]
    )
    page = browser.new_page(viewport={"width": 1920, "height": 1080})

    console_logs = []
    page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
    page.on('pageerror', lambda err: console_logs.append(f"[ERROR] {err}"))

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

    # Now let's measure 30 frames with RAF
    fps_data = page.evaluate("""
        () => new Promise(resolve => {
            const times = [];
            let count = 0;
            function step(t) {
                times.push(t);
                count++;
                if (count < 30) {
                    requestAnimationFrame(step);
                } else {
                    resolve(times);
                }
            }
            requestAnimationFrame(step);
        })
    """)

    dts = [fps_data[i] - fps_data[i-1] for i in range(1, len(fps_data))]
    avg_dt = sum(dts) / len(dts) if dts else 0
    fps = 1000 / avg_dt if avg_dt > 0 else 0
    print(f"WITH CHROMIUM FLAGS: Count={len(dts)}, Avg dt={avg_dt:.2f}ms, Approx FPS={fps:.1f}")
    print(f"First 10 dts: {[round(x, 1) for x in dts[:10]]}")

    print("\nRecent Console Logs (last 20):")
    for log in console_logs[-20:]:
        print(log)

    browser.close()
