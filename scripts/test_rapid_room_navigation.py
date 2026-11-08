import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE_EXE, headless=True)
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

    print("Loading Petros at http://127.0.0.1:3000/...")
    page.goto("http://127.0.0.1:3000/")

    print("Waiting for __petrosEngine...")
    page.wait_for_function("() => window.__petrosEngine && window.__petrosEngine.isRunning === true", timeout=30000)
    page.wait_for_timeout(2000)

    # Set up rapid tracking
    page.evaluate("""
        () => {
            window.__rapidSamples = [];
            window.__trackRapid = false;
            const engine = window.__petrosEngine;
            if (!engine) return;

            const track = (now) => {
                if (window.__trackRapid) {
                    const cam = engine.camera;
                    const ctrl = engine.cameraController ? engine.cameraController.controls : null;
                    const isTrans = engine.cameraController ? engine.cameraController.isTransitioning : false;
                    window.__rapidSamples.push({
                        time: now,
                        x: cam ? cam.position.x : 0,
                        y: cam ? cam.position.y : 0,
                        z: cam ? cam.position.z : 0,
                        targetX: ctrl ? ctrl.target.x : 0,
                        targetY: ctrl ? ctrl.target.y : 0,
                        targetZ: ctrl ? ctrl.target.z : 0,
                        isTrans
                    });
                }
                requestAnimationFrame(track);
            };
            requestAnimationFrame(track);
        }
    """)

    print("Starting rapid navigation test...")
    page.evaluate("() => { window.__rapidSamples = []; window.__trackRapid = true; }")

    # 1. Click Headquarters
    print("1. Clicking Headquarters...")
    page.click("#btn-room-headquarters")
    page.wait_for_timeout(350)

    # 2. Click Fountain mid-flight!
    print("2. Clicking Fountain mid-flight (rapid click!)...")
    page.click("#btn-room-fountain")
    page.wait_for_timeout(350)

    # 3. Click Courtyard mid-flight!
    print("3. Clicking Courtyard mid-flight (rapid click!)...")
    page.click("#btn-room-courtyard")
    page.wait_for_timeout(2000)

    samples = page.evaluate("() => { window.__trackRapid = false; return window.__rapidSamples; }")
    print(f"Recorded {len(samples)} frames across rapid navigation clicks.")

    # Calculate step distances
    deltas = []
    for i in range(1, len(samples)):
        dt = samples[i]['time'] - samples[i-1]['time']
        dx = samples[i]['x'] - samples[i-1]['x']
        dy = samples[i]['y'] - samples[i-1]['y']
        dz = samples[i]['z'] - samples[i-1]['z']
        dist = (dx**2 + dy**2 + dz**2)**0.5
        deltas.append((dt, dist, samples[i]['isTrans'], samples[i]['x'], samples[i]['y'], samples[i]['z']))

    print(f"\nFirst 20 frames of rapid redirection:")
    for i, (dt, dist, isTrans, x, y, z) in enumerate(deltas[:20]):
        print(f"frame {i:02d}: dt={dt:5.1f}ms | dist={dist:6.3f} | trans={isTrans} | pos=({x:6.2f}, {y:5.2f}, {z:6.2f})")

    # Final arrived position
    last = samples[-1]
    print(f"\nFinal Settled Camera Position: ({last['x']:.2f}, {last['y']:.2f}, {last['z']:.2f})")
    print(f"Final Settled Target LookAt:   ({last['targetX']:.2f}, {last['targetY']:.2f}, {last['targetZ']:.2f})")
    print(f"Transition Completed: {not last['isTrans']}")

    page.screenshot(path="public/screenshots/rapid_navigation_settled.png")
    print("Screenshot saved to public/screenshots/rapid_navigation_settled.png")

    browser.close()
