const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getLogs: () => ipcRenderer.invoke('get-logs'),
  addLog: (log) => ipcRenderer.invoke('add-log', log),
  deleteLog: (id) => ipcRenderer.invoke('delete-log', id),
  updateLog: (log) => ipcRenderer.invoke('update-log', log),
});