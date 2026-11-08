import sys
from playwright.sync_api import sync_playwright

EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=EDGE_EXE,
        headless=True
    )
    page = browser.new_page()
    page.set_content("""
    <!DOCTYPE html>
    <html>
    <body>
    <canvas id="c" width="800" height="600"></canvas>
    <script>
        const canvas = document.getElementById('c');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        window.dts = [];
        let last = performance.now();
        let count = 0;
        function loop(t) {
            gl.clearColor(Math.random(), 0.5, 0.5, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            window.dts.push(t - last);
            last = t;
            count++;
            if (count < 30) {
                requestAnimationFrame(loop);
            }
        }
        requestAnimationFrame(loop);
    </script>
    </body>
    </html>
    """)
    page.wait_for_timeout(1000)
    dts = page.evaluate("window.dts")
    print(f"Simple WebGL RAF dts: len={len(dts)}, avg={sum(dts)/len(dts) if dts else 0:.2f}ms")
    print(f"First 10 dts: {[round(x, 1) for x in dts[:10]]}")
    browser.close()
