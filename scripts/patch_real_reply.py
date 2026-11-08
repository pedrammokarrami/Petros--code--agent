with open("C:/Users/ELI/Petros/server.ts", "r", encoding="utf-8") as f:
    text = f.read()

old_s = 'const realReply = ollamaData.message?.content || "";'
new_s = 'const realReply = (ollamaData.message?.content && ollamaData.message.content.trim().length > 0) ? ollamaData.message.content.trim() : (ollamaData.message?.thinking ? ollamaData.message.thinking.trim() : "");'

if old_s in text:
    text = text.replace(old_s, new_s, 1)
    with open("C:/Users/ELI/Petros/server.ts", "w", encoding="utf-8") as f:
        f.write(text)
    print("SUCCESS: server.ts updated with thinking fallback!")
else:
    print("Target old_s not found")
