const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const db = require('./db');

let mainWindow;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html')).catch(console.error);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize(); // ✅ uruchamiaj zmaksymalizowane okno
    mainWindow.show();
  });

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* ------------ IPC ------------- */
ipcMain.handle('get-logs', async () => await db.getAll());
ipcMain.handle('add-log', async (event, log) => await db.insert(log));
ipcMain.handle('update-log', async (event, log) => await db.update(log));
ipcMain.handle('delete-log', async (event, id) => await db.delete(id));