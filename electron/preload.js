/**
 * PuterAgent Studio - Desktop Preload Bridge
 * Exposes secure IPC channels for local agentic computing and file operations.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,

  // System Information
  getSystemInfo: () => ipcRenderer.invoke('desktop:get-system-info'),

  // Puter Authentication & Persistent Token Storage
  loginPuter: () => ipcRenderer.invoke('desktop:login-puter'),
  getSavedToken: () => ipcRenderer.invoke('desktop:get-saved-token'),
  saveToken: (token) => ipcRenderer.invoke('desktop:save-token', token),
  clearToken: () => ipcRenderer.invoke('desktop:clear-token'),

  // Workspace & Folder Dialog
  selectDirectory: (defaultPath) => ipcRenderer.invoke('desktop:select-directory', defaultPath),

  // File Operations
  readFile: (filePath, options = {}) => ipcRenderer.invoke('desktop:read-file', { filePath, ...options }),
  writeFile: (filePath, content, options = {}) => ipcRenderer.invoke('desktop:write-file', { filePath, content, ...options }),
  editFile: (filePath, targetContent, replacementContent, options = {}) => 
    ipcRenderer.invoke('desktop:edit-file', { filePath, targetContent, replacementContent, ...options }),
  listDirectory: (dirPath, options = {}) => ipcRenderer.invoke('desktop:list-directory', { dirPath, ...options }),
  createDirectory: (dirPath) => ipcRenderer.invoke('desktop:create-directory', { dirPath }),
  deletePath: (targetPath, options = {}) => ipcRenderer.invoke('desktop:delete-path', { targetPath, ...options }),
  fileExists: (targetPath) => ipcRenderer.invoke('desktop:exists', { targetPath }),

  // Shell Command Execution
  runCommand: (command, options = {}) => ipcRenderer.invoke('desktop:run-command', { command, ...options }),

  // OS Utilities
  revealInFolder: (targetPath) => ipcRenderer.invoke('desktop:reveal-in-folder', targetPath)
});
