import shutil
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

SERVER_FILE = "C:/Users/ELI/Petros/server.ts"
BACKUP_FILE = "C:/Users/ELI/Petros/server.ts.bak_ai_patch2"

with open(SERVER_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Backup
shutil.copyfile(SERVER_FILE, BACKUP_FILE)
print("Backup created at", BACKUP_FILE)

# 1. Check isExplicitToolRequest
target1 = "const isExplicitToolRequest = /(ابزار|tools|dependency|dependencies|نصب کن|پیدا کن|مدیریت فروش|بازی|game|godot|phaser|تحقیق|research|مقایسه)/i.test(trimmedP);"
if target1 in content:
    print("Found Target 1: isExplicitToolRequest")
    replacement1 = "const isExplicitToolRequest = !/(?:بساز|کدنویسی|برنامه‌نویسی|درست کن|طراحی کن|یک بازی|یک برنامه|کدش)/i.test(trimmedP) && /(ابزار|اکوسیستم ابزار|tools|dependency|dependencies|لیست ابزار|نصب ابزار|نصب پکیج|پیدا کردن پکیج|مدیریت پکیج)\\b/i.test(trimmedP);"
    content = content.replace(target1, replacement1, 1)
else:
    print("WARNING: Target 1 not found verbatim! Searching with regex...")
    m = re.search(r"const isExplicitToolRequest = /[^/]+/i\.test\(trimmedP\);", content)
    if m:
        print("Found regex match for Target 1:", m.group(0))
        replacement1 = "const isExplicitToolRequest = !/(?:بساز|کدنویسی|برنامه‌نویسی|درست کن|طراحی کن|یک بازی|یک برنامه|کدش)/i.test(trimmedP) && /(ابزار|اکوسیستم ابزار|tools|dependency|dependencies|لیست ابزار|نصب ابزار|نصب پکیج|پیدا کردن پکیج|مدیریت پکیج)\\b/i.test(trimmedP);"
        content = content[:m.start()] + replacement1 + content[m.end():]

# 2. Check isStartupDiscussion early return
m2 = re.search(r"(const isStartupDiscussion = [^\n]+\n)(\s*if \(!isCodingTask && isStartupDiscussion\) \{)", content)
if m2:
    print("Found Target 2 header")
    content = content[:m2.start()] + "let startupFallbackReply = '';\n    " + content[m2.start():]

m3 = re.search(r"(const finalStartupReply = reqLang === 'fa' \? startupReplyFa : startupReplyEn;)\s*return res\.json\(\{\s*success: true,\s*text: finalStartupReply,[^}]+routerTier: 'Startup Strategy Engine'[^}]+timestamp: new Date\(\)\.toISOString\(\),\s*\}\);(\s*\})", content)
if m3:
    print("Found Target 2 return block!")
    replacement3 = r"\1\n      startupFallbackReply = finalStartupReply;\n      console.log('[AgentChat] Startup strategy synchronized into project memory. Forwarding to live AI pipeline for tailored analysis...');\2"
    content = content[:m3.start()] + re.sub(r"(const finalStartupReply = reqLang === 'fa' \? startupReplyFa : startupReplyEn;)\s*return res\.json\(\{\s*success: true,\s*text: finalStartupReply,[^}]+routerTier: 'Startup Strategy Engine'[^}]+timestamp: new Date\(\)\.toISOString\(\),\s*\}\);(\s*\})", replacement3, content[m3.start():m3.end()]) + content[m3.end():]
else:
    print("WARNING: Target 2 return block not found with regex! Searching partial...")

# 3. Check isGithubQuery
m4 = re.search(r"const isGithubQuery = !isEmailQuery && /[^/]+/i\.test\(trimmedP\);", content)
if m4:
    print("Found Target 3 isGithubQuery:", m4.group(0))
    replacement4 = "const isGithubQuery = !isEmailQuery && /(گیت‌هاب|گیت هاب|\\bgithub\\b|ریپازیتوری|\\brepo\\b|آخرین کامیت|pull request|پی آر|\\bpr\\b|\\bبرنچ\\b)/i.test(trimmedP);"
    content = content[:m4.start()] + replacement4 + content[m4.end():]

# 4. Ollama cleanReply & dynamic num_predict
target_num_predict = "num_predict: 600"
if target_num_predict in content:
    print("Found Target 4 num_predict: 600")
    content = content.replace(target_num_predict, "num_predict: isCodingTask ? 1200 : 800", 1)

target_reply = 'const realReply = ollamaData.message?.content || "";\n            if (realReply && realReply.trim().length > 0) {\n              responseText = realReply.trim();'
if target_reply in content:
    print("Found Target 4 realReply replace")
    replacement_reply = 'const realReply = ollamaData.message?.content || "";\n            if (realReply && realReply.trim().length > 0) {\n              const cleanReply = realReply.replace(/<think>[\\s\\S]*?<\\/think>/gi, "").trim();\n              responseText = cleanReply || realReply.trim();'
    content = content.replace(target_reply, replacement_reply, 1)

# 5. Fallback transparency with startupFallbackReply
target5 = """      // Safeguard: Ensure responseText is never empty and strictly matches requested language
      if (!responseText) {
        executionSource = 'offline-template-fallback' as any;
        routerTierUsed = 'Offline Deterministic Fallback (No Live AI)';
        chosenModelProfile = {
          id: 'offline-template-fallback',
          name: 'Petros Deterministic Template Fallback',
          provider: 'Local Offline Fallback Engine'
        };"""

if target5 in content:
    print("Found Target 5 fallback")
    replacement5 = """      // Safeguard: Ensure responseText is never empty and strictly matches requested language
      if (!responseText) {
        if (startupFallbackReply) {
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
        }"""
    content = content.replace(target5, replacement5, 1)
    # Add closing brace for the else branch
    # Let's inspect where else branch ends in content
else:
    print("WARNING: Target 5 not found verbatim")

with open(SERVER_FILE, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated server.ts successfully!")
