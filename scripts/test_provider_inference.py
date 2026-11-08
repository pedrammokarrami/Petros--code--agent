import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def test_chat():
    url = "http://127.0.0.1:11434/api/chat"
    payload = {
        "model": "qwen3:1.7b",
        "messages": [
            {"role": "user", "content": "پاسخ کوتاه: پایتون چیست؟"}
        ],
        "stream": False,
        "options": {
            "num_predict": 400
        }
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            res = json.loads(response.read().decode("utf-8"))
            msg = res.get("message", {})
            content = msg.get("content", "")
            thinking = msg.get("thinking", "")
            print("Content:", content)
            print("Thinking length:", len(thinking))
            return content
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_chat()
