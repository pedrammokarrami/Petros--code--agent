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

    page.on('console', lambda msg: print(f"[{msg.type}] {msg.text}"))

    # Intercept WebGL readPixels and HTMLCanvasElement.toDataURL before page scripts run
    page.add_init_script("""
        localStorage.setItem('petros_wallet_session', JSON.stringify({
            sessionId: 'sess_test_123',
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            projectSlug: 'petros-main'
        }));
        localStorage.setItem('petros_visual_mode', 'holographic');
        localStorage.setItem('codgar_project_confirmed', 'true');

        const hook = (proto, name) => {
            if (!proto || !proto[name]) return;
            const orig = proto[name];
            proto[name] = function(...args) {
                console.log('🚨 HOOK TRIGGERED:', name, new Error().stack);
                return orig.apply(this, args);
            };
        };

        if (window.WebGLRenderingContext) {
            hook(WebGLRenderingContext.prototype, 'readPixels');
        }
        if (window.WebGL2RenderingContext) {
            hook(WebGL2RenderingContext.prototype, 'readPixels');
        }
        hook(HTMLCanvasElement.prototype, 'toDataURL');
        hook(HTMLCanvasElement.prototype, 'toBlob');
        hook(CanvasRenderingContext2D.prototype, 'getImageData');
    """)

    page.goto("http://127.0.0.1:3000/")
    page.wait_for_timeout(3500)
    browser.close()
