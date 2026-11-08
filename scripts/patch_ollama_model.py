import sys

sys.stdout.reconfigure(encoding='utf-8')

SERVER_FILE = "C:/Users/ELI/Petros/server.ts"

with open(SERVER_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Replace model selection
old_select = "const selectedModel = availableModels.find((m: string) => m.includes('qwen3')) || availableModels[0];"
new_select = """const selectedModel = availableModels.find((m: string) => m === 'qwen3:1.7b') || 
                              availableModels.find((m: string) => m === 'qwen3:latest') || 
                              availableModels.find((m: string) => !m.includes('40k') && m.includes('qwen3')) || 
                              'qwen3:1.7b';"""

if old_select in content:
    content = content.replace(old_select, new_select, 1)
    print("Replaced model selection successfully!")
else:
    print("WARNING: old_select not found verbatim")

# Add num_ctx and better error logging
old_options = """              options: {
                temperature: 0.6,
                num_predict: isCodingTask ? 1200 : 800
              }"""
new_options = """              options: {
                temperature: 0.6,
                num_ctx: 4096,
                num_predict: isCodingTask ? 1000 : 600
              }"""

if old_options in content:
    content = content.replace(old_options, new_options, 1)
    print("Replaced options successfully!")
else:
    print("WARNING: old_options not found verbatim")

# Add error logging for non-ok ollamaRes
old_if_ok = """          if (ollamaRes.ok) {
            const ollamaData: any = await ollamaRes.json();"""

new_if_ok = """          if (!ollamaRes.ok) {
            const errBody = await ollamaRes.text();
            console.log(`[AgentChat] Ollama HTTP ${ollamaRes.status}: ${errBody.slice(0, 120)}`);
          } else {
            const ollamaData: any = await ollamaRes.json();"""

if old_if_ok in content:
    content = content.replace(old_if_ok, new_if_ok, 1)
    # Also adjust the matching closing brace for else
    old_end = """              console.log(`[AgentChat] o. Live real inference successfully returned by Ollama (${selectedModel})!`);
            }
          }"""
    # Let's inspect where it ends
    print("Replaced if_ok successfully!")

with open(SERVER_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Saved server.ts!")
