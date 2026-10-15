
const { contextBridge, ipcRenderer } = require('electron');
try {
  contextBridge.exposeInMainWorld('electronAPI', {
    selectFolder: () => ipcRenderer.invoke('dialog:openDirectory')
  });
} catch (e) {
  window.electronAPI = { selectFolder: () => ipcRenderer.invoke('dialog:openDirectory') };
}
