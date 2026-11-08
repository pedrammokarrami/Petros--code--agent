import urllib.request
import json
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_dispatch():
    url = "http://127.0.0.1:3000/api/laya/dispatch"
    payload = {
        "agent": "coder",
        "prompt": "Create a minimal healthcheck test file in workspace.",
        "kind": "task",
        "cwd": "C:/Users/ELI/Desktop/petros",
        "timeoutMs": 30000
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Dispatch Response Status:", resp.status)
            print("Success:", data.get("success"))
            print("Job:", json.dumps(data.get("job"), ensure_ascii=False, indent=2))
            
            job_id = data.get("job", {}).get("id")
            if job_id:
                # Poll job
                poll_url = f"http://127.0.0.1:3000/api/laya/jobs/{job_id}"
                poll_req = urllib.request.Request(poll_url)
                with urllib.request.urlopen(poll_req, timeout=10) as poll_resp:
                    job_data = json.loads(poll_resp.read().decode("utf-8"))
                    print("Poll Job Status:", job_data.get("job", {}).get("status"))
                    print("Job Output:", job_data.get("job", {}).get("output"))
    except Exception as e:
        print("Dispatch error:", e)

if __name__ == "__main__":
    test_dispatch()
