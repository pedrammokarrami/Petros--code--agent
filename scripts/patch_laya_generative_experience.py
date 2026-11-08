import re

target_file = 'src/components/petros-city/LayaGenerativeExperience.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
old_import = "import { PetrosWorldCanvas, WorldEnvironment } from './PetrosWorldCanvas';"
new_import = """import { PetrosWorldViewport } from '../../petros-world/ui/PetrosWorldViewport';
import { WorldHeaderBar } from '../../petros-world/ui/WorldHeaderBar';
import { EventActivityFeed } from '../../petros-world/ui/EventActivityFeed';
import { eventGateway } from '../../petros-world/events/BusinessEventGateway';
import { useBusinessWorldStore } from '../../petros-world/business/BusinessWorldManager';"""

assert old_import in content, "old_import not found"
content = content.replace(old_import, new_import, 1)

# 2. Update handleSetMode
old_mode_fn = """  const handleSetMode = (mode: 'normal' | 'holographic') => {
    console.log('[Laya] Switch visual mode to:', mode);
    setVisualMode(mode);
    try {
      localStorage.setItem('petros_visual_mode', mode);
    } catch {}
  };"""

new_mode_fn = """  const handleSetMode = (mode: 'normal' | 'holographic') => {
    console.log('[Laya] Switch visual mode to:', mode);
    setVisualMode(mode);
    try {
      localStorage.setItem('petros_visual_mode', mode);
      useBusinessWorldStore.getState().setVisualMode(mode);
    } catch {}
  };"""

assert old_mode_fn in content, "old_mode_fn not found"
content = content.replace(old_mode_fn, new_mode_fn, 1)

# 3. Replace canvas and header blocks
# From line containing '{/* 1. THREE.JS 3D GENERATIVE WORLD CANVAS' to before '{/* 4. MAIN CONVERSATIONAL STAGE'
pattern = re.compile(
    r'\{\/\* 1\. THREE\.JS 3D GENERATIVE WORLD CANVAS.*?'
    r'(?=\{\/\* 4\. MAIN CONVERSATIONAL STAGE)',
    re.DOTALL
)

new_viewport_and_header = """{/* 1. THREE.JS 3D GENERATIVE WORLD VIEWPORT */}
      <PetrosWorldViewport activeMode={visualMode} />

      {/* 2. TOP APPLE-GRADE HEADER BAR & DOMAIN/ROOM DOCK */}
      <WorldHeaderBar
        language={language}
        onLanguageChange={onLanguageChange}
        visualMode={visualMode}
        onToggleVisualMode={handleSetMode}
        onOpenToolCenter={() => setShowToolCenter(true)}
        onOpenBrowserWorkspace={() => setShowBrowserWorkspace(true)}
        onToggleHistory={() => setShowHistoryDrawer(!showHistoryDrawer)}
        onClearHistory={handleClearHistory}
        messageCount={messages.length}
        showHistoryDrawer={showHistoryDrawer}
      />

      {/* 3. REAL-TIME OPERATIONS EVENT FEED */}
      <EventActivityFeed language={language} />

      """

match = pattern.search(content)
assert match is not None, "Pattern for viewport and header replacement not found"
content = pattern.sub(new_viewport_and_header, content, count=1)

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: LayaGenerativeExperience.tsx patched with new ecosystem!")
