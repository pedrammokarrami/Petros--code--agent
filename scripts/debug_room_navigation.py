import time
import json
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=EDGE_EXE, headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        console_logs = []
        page.on("console", lambda m: console_logs.append(f"[{m.type}] {m.text}"))
        page.on("pageerror", lambda e: console_logs.append(f"[PAGEERROR] {e}"))

        print("Navigating to http://127.0.0.1:3000 ...")
        page.goto("http://127.0.0.1:3000/", wait_until="networkidle")
        time.sleep(3.0)

        # Inspect what buttons exist
        buttons = page.evaluate("""
            () => {
                const btns = Array.from(document.querySelectorAll('button'));
                return btns.map(b => ({
                    id: b.id,
                    text: b.innerText.trim(),
                    className: b.className
                }));
            }
        """)
        print(f"Found {len(buttons)} buttons.")
        room_buttons = [b for b in buttons if 'room' in b['id'] or 'domain' in b['id'] or 'Focal' in b['text'] or 'View' in b['text']]
        print("Navigation buttons found:", json.dumps(room_buttons, indent=2))

        # Check what window globals exist (__petrosEngine, __petrosSetRoom, pocManager, etc.)
        globals_check = page.evaluate("""
            () => ({
                hasPetrosEngine: typeof window.__petrosEngine !== 'undefined',
                hasPetrosSetRoom: typeof window.__petrosSetRoom !== 'undefined',
                hasPocManager: typeof window.pocManager !== 'undefined',
                canvasCount: document.querySelectorAll('canvas').length
            })
        """)
        print("Globals check:", globals_check)

        # Let's track camera position during room switch
        track_script = """
            () => new Promise((resolve) => {
                const samples = [];
                const engine = window.__petrosEngine;
                if (!engine) {
                    resolve({ error: 'No __petrosEngine' });
                    return;
                }
                const camera = engine.camera;
                const controls = engine.cameraController ? engine.cameraController.controls : null;
                const startTime = performance.now();

                const interval = setInterval(() => {
                    const t = performance.now() - startTime;
                    samples.push({
                        t: Math.round(t),
                        pos: camera ? [camera.position.x.toFixed(3), camera.position.y.toFixed(3), camera.position.z.toFixed(3)] : null,
                        look: controls ? [controls.target.x.toFixed(3), controls.target.y.toFixed(3), controls.target.z.toFixed(3)] : null,
                        isTransitioning: engine.cameraController ? engine.cameraController.isTransitioning : false
                    });
                    if (t > 2500) {
                        clearInterval(interval);
                        resolve(samples);
                    }
                }, 40); // 25 Hz sampling
            })
        """

        # Click a room button or call switchRoom
        print("\nTriggering room switch to 'headquarters' or clicking next room button...")
        # Start tracking in background
        tracking_promise = page.evaluate_handle(track_script)

        # Click next room button if found
        if any(b['id'] == 'btn-room-headquarters' for b in buttons):
            print("Clicking #btn-room-headquarters ...")
            page.click("#btn-room-headquarters")
        elif globals_check['hasPetrosSetRoom']:
            print("Calling window.__petrosSetRoom('headquarters') ...")
            page.evaluate("() => window.__petrosSetRoom('headquarters')")

        samples = tracking_promise.json_value()
        print(f"\nRecorded {len(samples)} samples during camera transition:")
        for s in samples[:15]:
            print(f"t={s['t']}ms | pos={s['pos']} | look={s['look']} | trans={s['isTransitioning']}")
        if len(samples) > 15:
            print("...")
            for s in samples[-5:]:
                print(f"t={s['t']}ms | pos={s['pos']} | look={s['look']} | trans={s['isTransitioning']}")

        browser.close()

if __name__ == "__main__":
    run()
