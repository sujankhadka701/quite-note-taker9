const { app, BrowserWindow, ipcMain, dialog, Menu, MenuItem } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const settingFilepath = path.join(app.getPath('userData'), 'settings.json');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu-cache');


function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Explicitly set spellchecker languages
    win.webContents.session.setSpellCheckerLanguages(['en-US', 'en-GB']);

    // Set up spellchecker and context menu
    win.webContents.on('context-menu', (event, params) => {
        const menu = new Menu();

        // Spelling suggestions
        if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
            for (const suggestion of params.dictionarySuggestions) {
                menu.append(new MenuItem({
                    label: suggestion,
                    click: () => win.webContents.replaceMisspelling(suggestion)
                }));
            }
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // Add misspelled word to dictionary
        if (params.misspelledWord) {
            menu.append(new MenuItem({
                label: `Add "${params.misspelledWord}" to Dictionary`,
                click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
            }));
            menu.append(new MenuItem({ type: 'separator' }));
        }

        // Standard text options
        if (params.isEditable) {
            menu.append(new MenuItem({ label: 'Undo', role: 'undo' }));
            menu.append(new MenuItem({ label: 'Redo', role: 'redo' }));
            menu.append(new MenuItem({ type: 'separator' }));
            menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
            menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
            menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
            menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
        } else {
            menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
            menu.append(new MenuItem({ label: 'Select All', role: 'selectAll' }));
        }

        menu.popup();
    });

    win.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                { label: 'New Note', accelerator: 'CmdOrCtrl+N', click: () => {
                    const focused = BrowserWindow.getFocusedWindow();
                    if (focused) focused.webContents.send('menu-new-note');
                }},
                { label: 'Open File', accelerator: 'CmdOrCtrl+O', click: () => {
                    const focused = BrowserWindow.getFocusedWindow();
                    if (focused) focused.webContents.send('menu-open-file');
                }},
                { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => {
                    const focused = BrowserWindow.getFocusedWindow();
                    if (focused) focused.webContents.send('menu-save');
                }},
                { label: 'Save As', accelerator: 'CmdOrCtrl+Shift+S', click: () => {
                    const focused = BrowserWindow.getFocusedWindow();
                    if (focused) focused.webContents.send('menu-save-as');
                }},
                { label: 'Export PDF', accelerator: 'CmdOrCtrl+P', click: () => {
                    const focused = BrowserWindow.getFocusedWindow();
                    if (focused) focused.webContents.send('menu-export-pdf');
                }},
                { type: 'separator' },
                { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- Helpers ---
const notesFile = path.join(app.getPath('documents'), 'notes.json');
function loadNotes() {
    if (fs.existsSync(notesFile)) {
        try {
            const raw = fs.readFileSync(notesFile, 'utf-8');
            return JSON.parse(raw || '[]');
        } catch (e) {
            console.error('Error loading notes:', e);
            return [];
        }
    }
    return [];
}
function saveNotes(notes) {
    fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2));
}
function readSettings() {
    if (!fs.existsSync(settingFilepath)) {
        return { fontSize: 16 };
    }
    try {
        const raw = fs.readFileSync(settingFilepath, 'utf-8');
        return JSON.parse(raw || '{}');
    } catch (e) {
        console.error('Error reading settings:', e);
        return { fontSize: 16 };
    }
}
function writeSettings(settings) {
    fs.writeFileSync(settingFilepath, JSON.stringify(settings, null, 2), 'utf-8');
}




// --- IPC Handlers ---
ipcMain.handle('get-notes', async () => loadNotes());

ipcMain.handle('save-note-json', async (event, note) => {
    let notes = loadNotes();
    const index = notes.findIndex(n => n.id && note.id && String(n.id) === String(note.id));
    if (index !== -1) {
        notes[index] = { ...notes[index], ...note, updatedAt: new Date().toISOString() };
    } else {
        notes.push({ ...note, updatedAt: new Date().toISOString() });
    }
    saveNotes(notes);
    return { success: true };
});

ipcMain.handle('delete-note-json', async (event, id) => {
    let notes = loadNotes();
    notes = notes.filter(n => n.id && id ? String(n.id) !== String(id) : true);
    saveNotes(notes);
    return { confirmed: true };
});

ipcMain.handle('save-note', async (event, text) => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
    fs.writeFileSync(filePath, text, 'utf-8');
    return { success: true };
});

ipcMain.handle('load-note', async () => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
    }
    return '';
});

ipcMain.handle('save-as', async (event, text) => {
    const result = await dialog.showSaveDialog({
        defaultPath: 'mynote.txt',
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (result.canceled) return { success: false };
    fs.writeFileSync(result.filePath, text, 'utf-8');
    return { success: true, filePath: result.filePath };
});

ipcMain.handle('new-note', async () => {
    const result = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Discard changes', 'Cancel'],
        defaultId: 1,
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Start a new note anyway?'
    });
    return { confirmed: result.response === 0 };
});

ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Text Files', extensions: ['txt'] }]
    });
    if (result.canceled) return { success: false };
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content, filePath };
});

ipcMain.handle('delete-note', async () => {
    const filePath = path.join(app.getPath('documents'), 'quicknote.txt');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
});

ipcMain.handle('smart-save', async (event, text, filePath) => {
    const targetPath = filePath || path.join(app.getPath('documents'), 'quicknote.txt');
    fs.writeFileSync(targetPath, text, 'utf-8');
    return { success: true, filePath: targetPath };
});

ipcMain.handle('get-settings', async () => {
    return readSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
    const current = readSettings();
    const updated = { ...current, ...settings };
    writeSettings(updated);
    return { success: true };
});

ipcMain.handle('export-pdf', async (event, htmlContent, title) => {
    const result = await dialog.showSaveDialog({
        defaultPath: `${title || 'note'}.pdf`,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled) return { success: false };

    // Create a temporary hidden window to render the PDF content
    const tempWin = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title || 'Note'}</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    padding: 40px;
                    color: #333;
                    line-height: 1.6;
                }
                h1 {
                    font-size: 28px;
                    border-bottom: 2px solid #eaeaea;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .content {
                    font-size: 14px;
                }
                b, strong { font-weight: bold; }
                i, em { font-style: italic; }
                u { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>${title || 'Untitled Note'}</h1>
            <div class="content">
                ${htmlContent}
            </div>
        </body>
        </html>
    `;

    // Load URL as HTML data
    await tempWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(styledHtml)}`);
    
    try {
        const data = await tempWin.webContents.printToPDF({
            margins: {
                top: 72,
                bottom: 72,
                left: 72,
                right: 72
            },
            pageSize: 'A4',
            printBackground: true
        });
        fs.writeFileSync(result.filePath, data);
        tempWin.close();
        return { success: true, filePath: result.filePath };
    } catch (err) {
        tempWin.close();
        return { success: false, error: err.message };
    }
});

ipcMain.handle('show-confirm-dialog', async (event, message, title) => {
    const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
        title: title || 'Confirm Action',
        message: message
    });
    return result.response === 0;
    
});
ipcMain.handle('print-note', async (event, html, title) => {
    const printWin = new BrowserWindow({ show: false });
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWin.webContents.print(
        { silent: false, printBackground: true },
        (success, errorType) => {
            if (!success) console.error('Print failed:', errorType);
            printWin.close();
        }
    );
});

ipcMain.handle('toggle-pin', async (event, noteId) => {
    const notes = loadNotes();

    const note = notes.find(n => String(n.id) === String(noteId));

    if (!note) {
        return { success: false };
    }

    note.pinned = !(note.pinned === true);

    note.updatedAt = new Date().toISOString();

    saveNotes(notes);

    return {
        success: true,
        pinned: note.pinned
    };
});