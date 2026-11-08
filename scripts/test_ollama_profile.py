import urllib.request
import json
import time

def test_ollama_speed(system_prompt, user_prompt):
    url = "http://127.0.0.1:11434/api/chat"
    payload = {
        "model": "qwen3:1.7b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False,
        "options": {
            "temperature": 0.6,
            "num_predict": 100
        }
    }
    
    start = time.time()
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = time.time() - start
            print(f"Total time: {elapsed:.2f}s")
            print(f"Prompt tokens: {data.get('prompt_eval_count')}, Prompt eval time: {data.get('prompt_eval_duration', 0)/1e9:.2f}s")
            print(f"Eval tokens: {data.get('eval_count')}, Eval time: {data.get('eval_duration', 0)/1e9:.2f}s")
            print("Response:", data["message"]["content"][:150])
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    print("--- Test 1: Short System Prompt ---")
    test_ollama_speed("شما لایا هستید، دستیار هوشمند استارتاپ و برنامه‌نویسی در پتروس.", "سلام، برای یک فروشگاه دیجیتال دو ایده بده.")
