const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow = null;
const PORT = 39217;

// تنظیم پورت برای سرور بک‌اند
process.env.PORT = PORT.toString();
process.env.NODE_ENV = 'production';

// راه‌اندازی مستقیم سرور بک‌اند بدون نیاز به باینری مستقل node
try {
  require('./dist/server.cjs');
  console.log('✅ Embedded backend server required successfully.');
} catch (e) {
  console.error('❌ Failed to load embedded server:', e);
}

app.whenReady().then(() => {
  // هندلر بومی انتخاب پوشه
  ipcMain.handle('dialog:openDirectory', async () => {
    try {
      const res = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory']
      });
      return res.canceled ? null : res.filePaths[0];
    } catch (err) {
      console.error('Dialog error:', err);
      return null;
    }
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // لود شدن رابط کاربری پس از آماده شدن سرور
  setTimeout(() => {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }, 1500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
