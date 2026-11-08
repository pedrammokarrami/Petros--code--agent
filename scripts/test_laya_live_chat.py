import urllib.request
import json
import time
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

RESULTS_FILE = "C:/Users/ELI/Petros/release/report/laya_real_inference_results.json"
os.makedirs(os.path.dirname(RESULTS_FILE), exist_ok=True)

def test_chat(prompt, test_name):
    print(f"\n==========================================")
    print(f"Testing: {test_name}")
    print(f"Prompt: {prompt}")
    print(f"==========================================")
    
    url = "http://127.0.0.1:3000/api/agent/chat"
    payload = {
        "prompt": prompt,
        "mode": "chat",
        "language": "fa"
    }
    
    start_time = time.time()
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            elapsed = time.time() - start_time
            res_json = json.loads(resp.read().decode("utf-8"))
            router_info = res_json.get("routerInfo") or res_json.get("model") or {}
            model_selected = router_info.get("modelSelected") or router_info.get("name")
            model_id = router_info.get("modelId") or router_info.get("id")
            router_tier = res_json.get("routerTier") or router_info.get("routerTier")
            exec_source = res_json.get("executionSource") or ("live-bridge" if "qwen3" in str(model_id) else "fallback")
            reply = res_json.get("text") or res_json.get("response") or ""
            
            print(f"Status: {resp.status}")
            print(f"Duration: {elapsed:.2f}s")
            print(f"Success: {res_json.get('success')}")
            print(f"Model Selected: {model_selected}")
            print(f"Model ID: {model_id}")
            print(f"Router Tier: {router_tier}")
            print(f"Execution Source: {exec_source}")
            print(f"Response ({len(reply)} chars):")
            print(reply[:400] + ("..." if len(reply) > 400 else ""))
            
            return {
                "test": test_name,
                "prompt": prompt,
                "duration_seconds": round(elapsed, 2),
                "status_code": resp.status,
                "success": res_json.get("success", False),
                "model_selected": model_selected,
                "model_id": model_id,
                "router_tier": router_tier,
                "execution_source": exec_source,
                "is_live_ai": "qwen3" in str(model_id).lower(),
                "response_text": reply
            }
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"Error after {elapsed:.2f}s: {e}")
        return {
            "test": test_name,
            "prompt": prompt,
            "duration_seconds": round(elapsed, 2),
            "error": str(e),
            "success": False,
            "is_live_ai": False
        }

if __name__ == "__main__":
    prompts = [
        ("Prompt 1: Market Analysis", "برای یک فروشگاه اینترنتی محصولات دیجیتال، بازار هدف، مشتریان و مدل درآمدی را تحلیل کن."),
        ("Prompt 2: 5-Step Implementation Plan", "برای این کسب‌وکار یک برنامه اجرایی ۵ مرحله‌ای با اولویت و وابستگی‌ها تهیه کن."),
        ("Prompt 3: Interactive Game", "یک بازی ساده با قابلیت حرکت، امتیاز و برخورد بساز و آن را اجرا کن."),
        ("Prompt 4: Real Project Error Analysis", "این خطای واقعی پروژه را تحلیل کن و راه‌حل پیشنهادی بده: TypeError: Cannot read properties of undefined.")
    ]
    
    all_results = []
    for name, p in prompts:
        res = test_chat(p, name)
        all_results.append(res)
        # Small rest between heavy CPU generation tasks
        time.sleep(2)
        
    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)
    print(f"\nAll 4 prompt tests completed! Saved to {RESULTS_FILE}")
