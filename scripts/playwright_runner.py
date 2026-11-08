import sys
import os
import json
import argparse
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Users\ELI\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe"
]

def get_executable_path():
    for p in CHROME_PATHS:
        if os.path.exists(p):
            return p
    return None

def run_navigate(url, timeout=20000):
    exe = get_executable_path()
    if not exe:
        return {"success": False, "error": "No valid Chrome or Edge browser executable found."}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()
        try:
            response = page.goto(url, timeout=timeout, wait_until="domcontentloaded")
            title = page.title()
            final_url = page.url
            status = response.status if response else 200
            
            # Extract plain text content (limit to 3000 chars)
            text_body = page.text_content("body") or ""
            clean_text = " ".join(text_body.split())[:3000]
            
            # Extract top links
            links = []
            for a in page.query_selector_all("a[href]")[:10]:
                href = a.get_attribute("href")
                t = a.text_content() or ""
                if href and href.startswith("http"):
                    links.append({"href": href, "text": t.strip()[:60]})
            
            return {
                "success": True,
                "title": title,
                "url": final_url,
                "status": status,
                "snippet": clean_text,
                "links": links
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            browser.close()

def run_search(query, max_results=5):
    # Perform search via DuckDuckGo HTML without rate limits
    search_url = f"https://html.duckduckgo.com/html/?q={query.replace(' ', '+')}"
    exe = get_executable_path()
    if not exe:
        return {"success": False, "error": "No browser executable found."}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        page = context.new_page()
        try:
            page.goto(search_url, timeout=15000, wait_until="domcontentloaded")
            results = []
            items = page.query_selector_all(".result__body")[:max_results]
            for item in items:
                title_elem = item.query_selector(".result__title")
                snippet_elem = item.query_selector(".result__snippet")
                link_elem = item.query_selector(".result__url")
                
                t = title_elem.text_content().strip() if title_elem else ""
                s = snippet_elem.text_content().strip() if snippet_elem else ""
                l = link_elem.text_content().strip() if link_elem else ""
                if t:
                    results.append({"title": t, "snippet": s, "url": l})
            
            return {
                "success": True,
                "query": query,
                "results": results
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            browser.close()

def run_screenshot(url, output_path):
    exe = get_executable_path()
    if not exe:
        return {"success": False, "error": "No browser executable found."}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        try:
            page.goto(url, timeout=20000, wait_until="domcontentloaded")
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            page.screenshot(path=output_path, full_page=False)
            return {
                "success": True,
                "url": url,
                "screenshotPath": output_path
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            browser.close()

def run_interact(url, selector, action_type="click", text=""):
    exe = get_executable_path()
    if not exe:
        return {"success": False, "error": "No browser executable found."}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(url, timeout=20000, wait_until="domcontentloaded")
            if action_type == "click":
                page.click(selector, timeout=5000)
            elif action_type == "fill":
                page.fill(selector, text, timeout=5000)
            elif action_type == "press":
                page.press(selector, text or "Enter")
            
            return {
                "success": True,
                "action": action_type,
                "selector": selector,
                "currentUrl": page.url,
                "title": page.title()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            browser.close()

def run_extract(url):
    exe = get_executable_path()
    if not exe:
        return {"success": False, "error": "No browser executable found."}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe, headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto(url, timeout=20000, wait_until="domcontentloaded")
            title = page.title()
            headings = [h.text_content().strip() for h in page.query_selector_all("h1, h2, h3")[:8]]
            paragraphs = [p.text_content().strip() for p in page.query_selector_all("p")[:6] if len(p.text_content().strip()) > 30]
            
            return {
                "success": True,
                "url": url,
                "title": title,
                "headings": headings,
                "summary": " ".join(paragraphs)[:1500]
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            browser.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", required=True, choices=["navigate", "search", "screenshot", "interact", "extract"])
    parser.add_argument("--url", default="")
    parser.add_argument("--query", default="")
    parser.add_argument("--output", default="screenshot.png")
    parser.add_argument("--selector", default="")
    parser.add_argument("--type", default="click")
    parser.add_argument("--text", default="")
    args = parser.parse_args()

    if args.action == "navigate":
        res = run_navigate(args.url or "https://httpbin.org/get")
    elif args.action == "search":
        res = run_search(args.query or "Petros autonomous startup AI")
    elif args.action == "screenshot":
        res = run_screenshot(args.url or "https://httpbin.org/get", args.output)
    elif args.action == "interact":
        res = run_interact(args.url, args.selector, args.type, args.text)
    elif args.action == "extract":
        res = run_extract(args.url or "https://httpbin.org/get")
    else:
        res = {"success": False, "error": "Unknown action"}

    print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
