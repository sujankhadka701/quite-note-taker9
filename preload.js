const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    
    // Basic features
    saveNote: (text) => ipcRenderer.invoke('save-note', text),
    loadNote: () => ipcRenderer.invoke('load-note'),
    deleteNote: () => ipcRenderer.invoke('delete-note'),

    // New features
    saveAs: (text) => ipcRenderer.invoke('save-as', text),
    openFile: () => ipcRenderer.invoke('open-file'),
    newNote: () => ipcRenderer.invoke('new-note'),
    smartSave: (text, filePath) => ipcRenderer.invoke('smart-save', text, filePath),
    onMenuAction: (channel, callback) => ipcRenderer.on(channel, callback),
    getNotes: () => ipcRenderer.invoke('get-notes'),
    saveNoteJson: (note) => ipcRenderer.invoke('save-note-json', note),
    deleteNoteJson: (id) => ipcRenderer.invoke('delete-note-json', id),
    exportPDF: (htmlContent, title) => ipcRenderer.invoke('export-pdf', htmlContent, title),
    showConfirmDialog: (message, title) => ipcRenderer.invoke('show-confirm-dialog', message, title)
});