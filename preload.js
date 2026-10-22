const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yui', {
  appInfo: () => ipcRenderer.invoke('app:info'),
  ready: () => ipcRenderer.send('ui:ready'),
  setDirty: (dirty) => ipcRenderer.send('ui:dirty', Boolean(dirty)),
  getWorkspace: () => ipcRenderer.invoke('workspace:get'),
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  listDir: (dirPath) => ipcRenderer.invoke('workspace:list', dirPath),
  projectOutline: () => ipcRenderer.invoke('workspace:outline'),
  readFile: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write', filePath, content),
  createFile: (filePath) => ipcRenderer.invoke('fs:create-file', filePath),
  createDir: (dirPath) => ipcRenderer.invoke('fs:create-dir', dirPath),
  renamePath: (fromPath, toPath) => ipcRenderer.invoke('fs:rename', fromPath, toPath),
  trashPath: (targetPath) => ipcRenderer.invoke('fs:trash', targetPath),
  revealPath: (targetPath) => ipcRenderer.invoke('fs:reveal', targetPath),
  saveCapture: (payload) => ipcRenderer.invoke('capture:save', payload),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
});
