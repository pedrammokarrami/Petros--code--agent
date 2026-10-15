const fs = require('fs');

// 1. Fix main.cjs
const mainPath = 'main.cjs';
if (fs.existsSync(mainPath)) {
    let content = fs.readFileSync(mainPath, 'utf8');
    if (!content.includes('dialog:openDirectory')) {
        const ipcCode = `
const { ipcMain, dialog } = require('electron');
if (ipcMain) {
  try {
    ipcMain.handle('dialog:openDirectory', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
      return canceled ? null : filePaths[0];
    });
  } catch (e) { console.error('IPC error:', e); }
}
`;
        content += ipcCode;
        fs.writeFileSync(mainPath, content, 'utf8');
        console.log('✅ main.cjs fixed.');
    }
}

// 2. Fix preload.cjs or create if missing
const preloadPath = 'preload.cjs';
let preloadContent = fs.existsSync(preloadPath) ? fs.readFileSync(preloadPath, 'utf8') : '';
if (!preloadContent.includes('selectFolder')) {
    preloadContent += `
const { contextBridge, ipcRenderer } = require('electron');
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory')
  });
} catch (e) {
  window.electronAPI = { selectFolder: () => ipcRenderer.invoke('dialog:openDirectory') };
}
`;
    fs.writeFileSync(preloadPath, preloadContent, 'utf8');
    console.log('✅ preload.cjs updated.');
}

// 3. Fix YodawWorkspace.tsx
const workspacePath = 'src/components/YodawWorkspace.tsx';
if (fs.existsSync(workspacePath)) {
    let code = fs.readFileSync(workspacePath, 'utf8');
    if (!code.includes('electronAPI')) {
        code = code.replace(
            /const\s+handleChooseFolder\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?\};/,
            `const handleChooseFolder = async () => {
      try {
        if ((window as any).electronAPI && (window as any).electronAPI.selectFolder) {
          const selectedPath = await (window as any).electronAPI.selectFolder();
          if (selectedPath) {
            setFolderPath(selectedPath);
          }
        } else {
          const p = prompt("Enter folder path manually:", "/Users/sarir/Desktop");
          if (p) setFolderPath(p);
        }
      } catch (err) {
        console.error("Folder select error:", err);
      }
    };`
        );
        fs.writeFileSync(workspacePath, code, 'utf8');
        console.log('✅ YodawWorkspace.tsx patched.');
    }
}
console.log('🎉 Patch script completed successfully!');
