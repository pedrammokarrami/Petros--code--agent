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

    print("Navigating to http://127.0.0.1:3000/...")
    page.goto("http://127.0.0.1:3000/")

    print("Waiting for engine to initialize...")
    page.wait_for_function("() => window.__petrosEngine && window.__petrosEngine.isRunning === true", timeout=30000)
    page.wait_for_timeout(2000)

    # Inject frame tracker to record every camera update
    page.evaluate("""
        () => {
            window.__frameSamples = [];
            window.__isTracking = false;
            const engine = window.__petrosEngine;
            if (!engine) return;

            const sample = (now) => {
                if (window.__isTracking) {
                    const cam = engine.camera;
                    const ctrl = engine.cameraController ? engine.cameraController.controls : null;
                    const isTrans = engine.cameraController ? engine.cameraController.isTransitioning : false;
                    window.__frameSamples.push({
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
                requestAnimationFrame(sample);
            };
            requestAnimationFrame(sample);
        }
    """)

    print("Starting frame tracking...")
    page.evaluate("() => { window.__frameSamples = []; window.__isTracking = true; }")

    print("Clicking #btn-room-headquarters...")
    page.click("#btn-room-headquarters")

    page.wait_for_timeout(2200)

    samples = page.evaluate("() => { window.__isTracking = false; return window.__frameSamples; }")
    print(f"Recorded {len(samples)} frames during room transition.")

    # Calculate step distances between consecutive frames
    deltas = []
    for i in range(1, len(samples)):
        dt = samples[i]['time'] - samples[i-1]['time']
        dx = samples[i]['x'] - samples[i-1]['x']
        dy = samples[i]['y'] - samples[i-1]['y']
        dz = samples[i]['z'] - samples[i-1]['z']
        dist = (dx**2 + dy**2 + dz**2)**0.5
        deltas.append((dt, dist, samples[i]['isTrans'], samples[i]['x'], samples[i]['y'], samples[i]['z']))

    print(f"\nFrame steps during transition (first 30):")
    for i, (dt, dist, isTrans, x, y, z) in enumerate(deltas[:30]):
        print(f"frame {i:02d}: dt={dt:5.1f}ms | dist={dist:6.3f} | trans={isTrans} | pos=({x:6.2f}, {y:5.2f}, {z:6.2f})")

    # Take screenshot of final arrived view
    page.screenshot(path="public/screenshots/after_smooth_room_glide.png")
    print("\nSaved screenshot to public/screenshots/after_smooth_room_glide.png")

    # Check for sudden jumps or zero frames
    trans_deltas = [d for d in deltas if d[2]] # frames where isTrans is True
    print(f"\nTransition frame count: {len(trans_deltas)}")
    if trans_deltas:
        max_dist = max(d[1] for d in trans_deltas)
        avg_dist = sum(d[1] for d in trans_deltas) / len(trans_deltas)
        print(f"Max single-frame distance during glide: {max_dist:.3f}")
        print(f"Average step distance during glide: {avg_dist:.3f}")

    browser.close()
