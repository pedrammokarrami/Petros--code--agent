import sys

sys.stdout.reconfigure(encoding='utf-8')

SERVER_FILE = "C:/Users/ELI/Petros/server.ts"

with open(SERVER_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # 1. Look for finalStartupReply and the return res.json block
    if "const finalStartupReply = reqLang === 'fa' ? startupReplyFa : startupReplyEn;" in line:
        new_lines.append(line)
        # Check if next line is return res.json
        if i + 1 < len(lines) and "return res.json({" in lines[i+1]:
            # Skip the return res.json block up to the closing brace of the if statement
            # The return res.json block ends around 'executionTimeMs: 12,' followed by 'timestamp:' and '});'
            j = i + 1
            while j < len(lines) and "timestamp: new Date().toISOString()" not in lines[j]:
                j += 1
            # lines[j] is timestamp, lines[j+1] is });, lines[j+2] is }
            if j < len(lines) and "timestamp: new Date().toISOString()" in lines[j]:
                print(f"Skipping return res.json from line {i+2} to {j+2}")
                new_lines.append("      startupFallbackReply = finalStartupReply;\n")
                new_lines.append("      console.log('[AgentChat] Startup strategy synchronized into project memory. Forwarding to live AI pipeline for tailored analysis...');\n")
                i = j + 2  # lines[j+2] is '    }' which closes 'if (!isCodingTask && isStartupDiscussion)'
                new_lines.append(lines[i]) # append the closing '    }\n'
                i += 1
                continue
    
    # 2. Check the fallback block
    if "if (startupFallbackReply) {" in line:
        # Collect and restructure lines around 2690-2715
        pass

    new_lines.append(line)
    i += 1

restructured = "".join(new_lines)

# Fix the fallback block cleanly
bad_fallback = """        if (startupFallbackReply) {
          responseText = startupFallbackReply;
          executionSource = 'offline-template-fallback' as any;
          routerTierUsed = 'Offline Deterministic Fallback (No Live AI)';
          chosenModelProfile = {
            id: 'laya-startup-fallback',
            name: 'Laya Startup Intelligence (Deterministic Offline Fallback)',
            provider: 'Local Offline Fallback Engine'
          };
        } else {
          executionSource = 'offline-template-fallback' as any;
          routerTierUsed = 'Offline Deterministic Fallback (No Live AI)';
          chosenModelProfile = {
            id: 'offline-template-fallback',
            name: 'Petros Deterministic Template Fallback',
            provider: 'Local Offline Fallback Engine'
          };
        }
        if (!isCodingTask) {"""

good_fallback = """        if (startupFallbackReply) {
          responseText = startupFallbackReply;
          executionSource = 'offline-template-fallback' as any;
          routerTierUsed = 'Offline Deterministic Fallback (No Live AI)';
          chosenModelProfile = {
            id: 'laya-startup-fallback',
            name: 'Laya Startup Intelligence (Deterministic Offline Fallback)',
            provider: 'Local Offline Fallback Engine'
          };
        } else {
          executionSource = 'offline-template-fallback' as any;
          routerTierUsed = 'Offline Deterministic Fallback (No Live AI)';
          chosenModelProfile = {
            id: 'offline-template-fallback',
            name: 'Petros Deterministic Template Fallback',
            provider: 'Local Offline Fallback Engine'
          };
          if (!isCodingTask) {"""

if bad_fallback in restructured:
    print("Found bad fallback structure, fixing...")
    # Also find where the old if (!isCodingTask) block closes and add the extra closing brace
    restructured = restructured.replace(bad_fallback, good_fallback, 1)
    
    # Replace the closing part of if (!isCodingTask)
    old_close = """            : 'Hello! Your request was received and I am ready to code and build your application. What would you like to build?';
        }
      }"""
    new_close = """            : 'Hello! Your request was received and I am ready to code and build your application. What would you like to build?';
          }
        }
      }"""
    if old_close in restructured:
        print("Found old close, replacing...")
        restructured = restructured.replace(old_close, new_close, 1)

with open(SERVER_FILE, "w", encoding="utf-8") as f:
    f.write(restructured)

print("Saved cleanly to server.ts")
