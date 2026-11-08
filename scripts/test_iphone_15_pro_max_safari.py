import sys
import json
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

IPHONE_15_PRO_MAX = {
    "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "viewport": {"width": 430, "height": 932},
    "device_scale_factor": 3,
    "is_mobile": True,
    "has_touch": True,
}

with sync_playwright() as p:
    print("Launching Chromium with iPhone 15 Pro Max Safari emulation...")
    browser = p.chromium.launch(executable_path=EDGE_EXE, headless=True)
    context = browser.new_context(**IPHONE_15_PRO_MAX)
    page = context.new_page()

    # Pre-seed session
    page.add_init_script("""
        localStorage.setItem('petros_wallet_session', JSON.stringify({
            sessionId: 'sess_iphone_test',
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            projectSlug: 'petros-main'
        }));
        localStorage.setItem('petros_visual_mode', 'holographic');
        localStorage.setItem('codgar_project_confirmed', 'true');
    """)

    console_errors = []
    page.on('pageerror', lambda err: console_errors.append(str(err)))

    print("Navigating to http://127.0.0.1:3000/ on iPhone 15 Pro Max...")
    page.goto("http://127.0.0.1:3000/")

    print("Waiting for 3D world to initialize...")
    page.wait_for_function("() => window.__petrosEngine && window.__petrosEngine.isRunning === true", timeout=35000)
    page.wait_for_timeout(2000)

    # 1. Capture initial mobile view
    page.screenshot(path="public/screenshots/iphone15_01_campus_arrival.png")
    print("Saved public/screenshots/iphone15_01_campus_arrival.png")

    # 2. Check layout responsiveness
    layout_info = page.evaluate("""() => {
        const header = document.querySelector('header');
        const canvas = document.querySelector('#petros-world-canvas-container');
        const ribbon = document.querySelector('[id^="btn-room-"]')?.parentElement;
        const chatInput = document.querySelector('input[placeholder], textarea[placeholder]');
        return {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            headerHeight: header ? header.clientHeight : 0,
            canvasWidth: canvas ? canvas.clientWidth : 0,
            canvasHeight: canvas ? canvas.clientHeight : 0,
            ribbonScrollable: ribbon ? ribbon.scrollWidth > ribbon.clientWidth : false,
            hasInput: !!chatInput
        };
    }""")
    print("Mobile Layout Metrics:", json.dumps(layout_info, indent=2))

    # 3. Test Touch Orbit Simulation on 3D Canvas
    print("\nTesting touch orbit drag on 3D canvas...")
    canvas_box = page.locator("#petros-world-canvas-container").bounding_box()
    if canvas_box:
        start_x = canvas_box["x"] + canvas_box["width"] * 0.5
        start_y = canvas_box["y"] + canvas_box["height"] * 0.4
        end_x = start_x + 90
        end_y = start_y - 40

        page.touchscreen.tap(start_x, start_y)
        page.mouse.move(start_x, start_y)
        page.mouse.down()
        page.mouse.move(end_x, end_y, steps=10)
        page.mouse.up()
        page.wait_for_timeout(600)
        print("Touch drag executed successfully!")
        page.screenshot(path="public/screenshots/iphone15_02_after_touch_drag.png")
        print("Saved public/screenshots/iphone15_02_after_touch_drag.png")

    # 4. Test Smooth Room Navigation on Mobile
    print("\nTapping #btn-room-headquarters...")
    page.evaluate("""() => {
        window.__iphoneFrames = [];
        window.__tracking = true;
        const engine = window.__petrosEngine;
        const tick = (t) => {
            if (window.__tracking) {
                const cam = engine.camera;
                const isTrans = engine.cameraController ? engine.cameraController.isTransitioning : false;
                window.__iphoneFrames.push({
                    time: t,
                    x: cam.position.x,
                    y: cam.position.y,
                    z: cam.position.z,
                    isTrans
                });
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }""")

    page.click("#btn-room-headquarters")
    page.wait_for_timeout(2000)

    samples = page.evaluate("() => { window.__tracking = false; return window.__iphoneFrames; }")
    print(f"Recorded {len(samples)} frames during iPhone room transition.")

    deltas = []
    for i in range(1, len(samples)):
        dt = samples[i]['time'] - samples[i-1]['time']
        dx = samples[i]['x'] - samples[i-1]['x']
        dy = samples[i]['y'] - samples[i-1]['y']
        dz = samples[i]['z'] - samples[i-1]['z']
        dist = (dx**2 + dy**2 + dz**2)**0.5
        deltas.append((dt, dist, samples[i]['isTrans']))

    trans_frames = [d for d in deltas if d[2]]
    if trans_frames:
        max_step = max(d[1] for d in trans_frames)
        avg_step = sum(d[1] for d in trans_frames) / len(trans_frames)
        print(f"iPhone Transition: Frames={len(trans_frames)}, Max step={max_step:.3f}, Avg step={avg_step:.3f}")

    page.screenshot(path="public/screenshots/iphone15_03_headquarters_arrived.png")
    print("Saved public/screenshots/iphone15_03_headquarters_arrived.png")

    # 5. Tap Fountain
    print("\nTapping #btn-room-fountain...")
    page.click("#btn-room-fountain")
    page.wait_for_timeout(2000)
    page.screenshot(path="public/screenshots/iphone15_04_fountain_arrived.png")
    print("Saved public/screenshots/iphone15_04_fountain_arrived.png")

    # 6. Check WebGL, Memory & Errors
    webgl_metrics = page.evaluate("""() => {
        const engine = window.__petrosEngine;
        if (!engine) return null;
        const gl = engine.renderer.getContext();
        const info = engine.renderer.info;
        return {
            webglVendor: gl.getParameter(gl.VENDOR),
            webglRenderer: gl.getParameter(gl.RENDERER),
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            drawCalls: info.render.calls
        };
    }""")
    print("\nWebGL & GPU Metrics on iPhone 15 Pro Max:")
    print(json.dumps(webgl_metrics, indent=2))

    print(f"\nConsole Errors Count: {len(console_errors)}")
    if console_errors:
        for err in console_errors:
            print("Error:", err)
    else:
        print("Zero JS / WebGL errors detected on mobile!")

    browser.close()
