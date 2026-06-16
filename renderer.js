window.addEventListener('DOMContentLoaded', async () => {
    try {
        const noteEditor = document.getElementById('note');
        const titleInput = document.getElementById('note-title');
        const saveBtn = document.getElementById('save');
        const statusEl = document.getElementById('save_status');
        const saveAsBtn = document.getElementById('save-as');
        const newNoteBtn = document.getElementById('new-note');
        const deleteBtn = document.getElementById('delete-note');
        const deleteAllBtn = document.getElementById('delete-all');
        const openFileBtn = document.getElementById('open-file');
        const exportPdfBtn = document.getElementById('export-pdf');
        const noteList = document.getElementById('notes-list');
        const fontIncreaseBtn = document.getElementById('font-increase');
        const fontDecreaseBtn = document.getElementById('font-decrease');
        const darkModeSidebarBtn = document.getElementById('toggle-dark');
        const darkModeEditorBtn = document.getElementById('dark-mode-toggle');
        const searchInput = document.getElementById('search');

        const tabNotes = document.getElementById('tab-notes');
        const tabTrash = document.getElementById('tab-trash');
        const trashBanner = document.getElementById('trash-banner');
        const bannerRestoreBtn = document.getElementById('banner-restore');
        const bannerDeletePermBtn = document.getElementById('banner-delete-perm');
        const toolbar = document.getElementById('toolbar');
        const categoryInput = document.getElementById('note-category');
        const categoryFilterEl = document.getElementById('category-filter');

        // State
        let notes = [];
        let currentNoteId = null;
        let lastSavedContent = '';
        let debounceTimer = null;
        let currentFilePath = null;
        let currentFontSize = 16;
        let isDarkMode = false;
        let currentTab = 'notes'; // 'notes' or 'trash'

        function getCategoryColor(category) {
            if (!category) return '#888888';
            let hash = 0;
            for (let i = 0; i < category.length; i++) {
                hash = category.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            return `hsl(${hue}, 60%, 40%)`;
        }

        function updateCategoryFilter() {
            const currentValue = categoryFilterEl.value;
            const categories = [...new Set(notes.map(n => n.category).filter(Boolean))];
            categoryFilterEl.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                if (cat === currentValue) option.selected = true;
                categoryFilterEl.appendChild(option);
            });
        }

        categoryFilterEl.addEventListener('change', () => {
            renderNoteList(searchInput.value);
        });

        // Word count
        function updateWordCount() {
            const text = noteEditor.innerText || '';
            const characters = text.length;
            const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
            const wordCountEl = document.getElementById('word_count');
            wordCountEl.textContent = `Word : ${words} | Characters: ${characters}`;
        }

        // FIX: applyFontSize and applyDarkMode moved OUT of renderNoteList — they were
        // accidentally nested inside the first (broken) renderNoteList definition, putting
        // them out of scope for all callers.
        function applyFontSize(size) {
            currentFontSize = Math.min(32, Math.max(10, size));
            noteEditor.style.fontSize = `${currentFontSize}px`;
        }

        function applyDarkMode(enabled) {
            isDarkMode = enabled;
            if (enabled) {
                document.body.classList.add('dark-mode');
                if (darkModeSidebarBtn) darkModeSidebarBtn.textContent = '☀️ Light Mode';
                if (darkModeEditorBtn) darkModeEditorBtn.textContent = '☀️ Light Mode';
            } else {
                document.body.classList.remove('dark-mode');
                if (darkModeSidebarBtn) darkModeSidebarBtn.textContent = '🌙 Dark Mode';
                if (darkModeEditorBtn) darkModeEditorBtn.textContent = '🌙 Dark Mode';
            }
        }

        // Load settings on startup
        const settings = await window.electronAPI.getSettings() || {};
        if (settings && settings.fontSize) {
            applyFontSize(settings.fontSize);
        }
        applyDarkMode(settings && settings.darkMode || false);

        // Load all notes at startup
        await loadAllNotes();

        async function loadAllNotes() {
            notes = await window.electronAPI.getNotes() || [];
            notes = notes.map(n => ({
                ...n,
                isTrashed: n.isTrashed || false,
                content: n.content || ''
            }));

            const activeNotes = notes.filter(n => currentTab === 'notes' ? !n.isTrashed : n.isTrashed);

            if (activeNotes.length > 0) {
                const mostRecent = activeNotes.reduce((a, b) =>
                    new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b
                );
                await switchNote(mostRecent.id);
            } else {
                clearEditor();
                if (currentTab === 'notes') {
                    createNewNoteSilently();
                }
            }
            renderNoteList(searchInput.value);
        }

        function createNewNoteSilently() {
            const newNote = {
                id: Date.now().toString(),
                title: 'Untitled',
                content: '',
                category: '',
                pinned: false,
                isTrashed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            notes.unshift(newNote);
            currentNoteId = newNote.id;
            titleInput.value = '';
            categoryInput.value = '';
            noteEditor.innerHTML = '';
            lastSavedContent = '';
            window.electronAPI.saveNoteJson(newNote);
            renderNoteList(searchInput.value);
            updateWordCount();
        }

        // Tab switcher
        tabNotes.addEventListener('click', () => {
            if (currentTab === 'notes') return;
            currentTab = 'notes';
            tabNotes.classList.add('active');
            tabTrash.classList.remove('active');
            newNoteBtn.style.display = 'block';
            deleteAllBtn.textContent = '🗑️ Delete All';
            deleteAllBtn.classList.add('danger');

            trashBanner.style.display = 'none';

            noteEditor.contentEditable = "true";
            titleInput.disabled = false;
            toolbar.style.display = 'flex';

            saveBtn.disabled = false;
            saveAsBtn.disabled = false;
            openFileBtn.disabled = false;
            exportPdfBtn.disabled = false;
            deleteBtn.disabled = false;

            loadAllNotes();
        });

        tabTrash.addEventListener('click', () => {
            if (currentTab === 'trash') return;
            currentTab = 'trash';
            tabTrash.classList.add('active');
            tabNotes.classList.remove('active');
            newNoteBtn.style.display = 'none';
            deleteAllBtn.textContent = '🗑️ Empty Trash';
            deleteAllBtn.classList.remove('danger');

            if (currentNoteId) {
                trashBanner.style.display = 'flex';
            } else {
                trashBanner.style.display = 'none';
            }

            noteEditor.contentEditable = "false";
            titleInput.disabled = true;
            toolbar.style.display = 'none';

            saveBtn.disabled = true;
            saveAsBtn.disabled = true;
            openFileBtn.disabled = true;
            exportPdfBtn.disabled = true;
            deleteBtn.disabled = true;

            loadAllNotes();
        });

        // Dark mode toggles
        const toggleDarkModeFunc = async () => {
            applyDarkMode(!isDarkMode);
            await window.electronAPI.saveSettings({ darkMode: isDarkMode });
        };
        if (darkModeSidebarBtn) darkModeSidebarBtn.addEventListener('click', toggleDarkModeFunc);
        if (darkModeEditorBtn) darkModeEditorBtn.addEventListener('click', toggleDarkModeFunc);

        // Save note manually
        saveBtn.addEventListener('click', async () => {
            await saveCurrentNote();
        });

        saveAsBtn.addEventListener('click', async () => {
            const text = stripHtml(noteEditor.innerHTML);
            const result = await window.electronAPI.saveAs(text);
            if (result.success) {
                lastSavedContent = noteEditor.innerHTML;
                currentFilePath = result.filePath;
                statusEl.textContent = `Saved to: ${result.filePath}`;
            } else {
                statusEl.textContent = 'Save As cancelled';
            }
        });

        newNoteBtn.addEventListener('click', async () => {
            if (noteEditor.innerHTML !== lastSavedContent) {
                const result = await window.electronAPI.newNote();
                if (!result.confirmed) return;
            }
            const newNote = {
                id: Date.now().toString(),
                title: 'Untitled',
                content: '',
                category: '',
                isTrashed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await window.electronAPI.saveNoteJson(newNote);
            notes.unshift(newNote);
            currentNoteId = newNote.id;
            titleInput.value = '';
            categoryInput.value = '';
            noteEditor.innerHTML = '';
            lastSavedContent = '';
            renderNoteList(searchInput.value);
            statusEl.textContent = 'New note created.';
            titleInput.focus();
            updateWordCount();
        });

        // PDF Export Click Handler
        exportPdfBtn.addEventListener('click', async () => {
            if (!currentNoteId) return;
            statusEl.textContent = 'Exporting note to PDF...';
            const result = await window.electronAPI.exportPDF(noteEditor.innerHTML, titleInput.value || 'Untitled');
            if (result.success) {
                statusEl.textContent = `Successfully exported PDF to ${result.filePath}`;
            } else if (result.error) {
                statusEl.textContent = `PDF Export failed: ${result.error}`;
            } else {
                statusEl.textContent = 'PDF Export cancelled';
            }
        });

        deleteBtn.addEventListener('click', async () => {
            if (!currentNoteId) return;
            if (currentTab === 'notes') {
                await moveNoteToTrash(currentNoteId);
            }
        });

        deleteAllBtn.addEventListener('click', async () => {
            if (currentTab === 'notes') {
                const activeNotes = notes.filter(n => !n.isTrashed);
                if (activeNotes.length === 0) return;
                const confirmed = await window.electronAPI.showConfirmDialog("Are you sure you want to move all active notes to the Trash Bin?", "Move All to Trash");
                if (!confirmed) return;

                for (const note of activeNotes) {
                    note.isTrashed = true;
                    note.updatedAt = new Date().toISOString();
                    await window.electronAPI.saveNoteJson(note);
                }
                statusEl.textContent = 'All notes moved to Trash.';
                await loadAllNotes();
            } else {
                const trashedNotes = notes.filter(n => n.isTrashed);
                if (trashedNotes.length === 0) return;
                const confirmed = await window.electronAPI.showConfirmDialog("Are you sure you want to permanently delete all notes in the Trash Bin? This action is irreversible.", "Empty Trash");
                if (!confirmed) return;

                for (const note of trashedNotes) {
                    await window.electronAPI.deleteNoteJson(note.id);
                }
                statusEl.textContent = 'Trash Bin emptied.';
                await loadAllNotes();
            }
        });

        openFileBtn.addEventListener('click', async () => {
            const result = await window.electronAPI.openFile();
            if (result.success) {
                const formattedContent = result.content.replace(/\r?\n/g, '<br>');
                noteEditor.innerHTML = formattedContent;
                lastSavedContent = formattedContent;
                currentFilePath = result.filePath;
                statusEl.textContent = `Opened: ${result.filePath}`;
                updateWordCount();
            } else {
                statusEl.textContent = 'Open canceled';
            }
        });

        // Font size handlers
        fontIncreaseBtn.addEventListener('click', async () => {
            applyFontSize(currentFontSize + 2);
            await window.electronAPI.saveSettings({ fontSize: currentFontSize });
        });

        fontDecreaseBtn.addEventListener('click', async () => {
            applyFontSize(currentFontSize - 2);
            await window.electronAPI.saveSettings({ fontSize: currentFontSize });
        });

        // Rich Text Formatting Buttons
        document.getElementById('format-bold').addEventListener('click', () => {
            document.execCommand('bold', false, null);
            noteEditor.focus();
            updateFormattingState();
        });
        document.getElementById('format-italic').addEventListener('click', () => {
            document.execCommand('italic', false, null);
            noteEditor.focus();
            updateFormattingState();
        });
        document.getElementById('format-underline').addEventListener('click', () => {
            document.execCommand('underline', false, null);
            noteEditor.focus();
            updateFormattingState();
        });

        document.addEventListener('selectionchange', () => {
            updateFormattingState();
        });

        function updateFormattingState() {
            if (document.activeElement === noteEditor) {
                document.getElementById('format-bold').classList.toggle('active', document.queryCommandState('bold'));
                document.getElementById('format-italic').classList.toggle('active', document.queryCommandState('italic'));
                document.getElementById('format-underline').classList.toggle('active', document.queryCommandState('underline'));
            }
        }

        async function autoSave() {
            if (currentTab !== 'notes' || !currentNoteId) return;
            const currentContent = noteEditor.innerHTML;
            const note = notes.find(n => n.id && currentNoteId && String(n.id) === String(currentNoteId));

            if (currentContent === lastSavedContent && note && note.title === titleInput.value) {
                if (statusEl) statusEl.textContent = 'No changes - already saved';
                return;
            }

            try {
                await saveCurrentNote();
                const now = new Date().toLocaleTimeString();
                if (statusEl) statusEl.textContent = `Auto-saved at ${now}`;
            } catch (err) {
                console.error('Auto-save FAILED:', err);
                if (statusEl) statusEl.textContent = 'Auto-save error - check console';
            }
        }

        noteEditor.addEventListener('input', () => {
            updateWordCount();
            if (currentTab === 'notes') {
                if (statusEl) statusEl.textContent = 'Changes detected - auto save in 5s...';
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(autoSave, 5000);
            }
        });

        titleInput.addEventListener('input', () => {
            if (currentTab === 'notes') {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(autoSave, 5000);
            }
        });

        searchInput.addEventListener('input', () => {
            renderNoteList(searchInput.value);
        });

        function stripHtml(html) {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || "";
        }

        // FIX: Single, correct definition of renderNoteList. The original had two definitions:
        // the first was incomplete (missing closing braces, contained misplaced functions,
        // orphaned sort logic that never rendered anything), and the second was the real one.
        function renderNoteList(filter = '') {
            noteList.innerHTML = '';
            const categoryFilter = categoryFilterEl.value;
            let filtered = notes.filter(note => {
                const inCurrentTab = currentTab === 'notes' ? !note.isTrashed : note.isTrashed;
                const matchesSearch = filter.trim() === '' ||
                    (note.title || '').toLowerCase().includes(filter.toLowerCase()) ||
                    (note.content || '').toLowerCase().includes(filter.toLowerCase());
                const matchesCategory = categoryFilter.trim() === '' ||
                    (note.category || '') === categoryFilter;
                return inCurrentTab && matchesSearch && matchesCategory;
            });

            // FIX: sort was in the dead first definition; moved here where it belongs
            filtered.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return new Date(b.updatedAt) - new Date(a.updatedAt);
            });

            if (filtered.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'note-date';
                emptyMsg.style.textAlign = 'center';
                emptyMsg.style.padding = '20px';
                emptyMsg.textContent = currentTab === 'notes' ? 'No active notes' : 'Trash is empty';
                noteList.appendChild(emptyMsg);
                updateCategoryFilter();
                return;
            }

            filtered.forEach(note => {
                const item = document.createElement('div');
                item.className = 'note-item' + (note.id === currentNoteId ? ' active' : '');

                if (currentTab === 'notes') {
                    const categoryColor = getCategoryColor(note.category);
                    // FIX: badgeHtml is now actually inserted into the template (was built but dropped)
                    const badgeHtml = note.category
                        ? `<span class="category-badge" style="background-color: ${categoryColor};">${note.category}</span>`
                        : '';
                    // FIX: added missing closing </div> for .note-item-header
                    item.innerHTML = `
                        <div class="note-item-header">
                            <div class="note-item-title">${note.pinned ? '📌 ' : ''}${note.title || 'Untitled'}</div>
                            <button class="delete-note" data-id="${note.id}" title="Move to Trash">🗑️</button>
                            <button class="pin-note" data-id="${note.id}" title="${note.pinned ? 'Unpin Note' : 'Pin Note'}">${note.pinned ? '📌' : '📍'}</button>
                            <div class="note-item-date">${new Date(note.updatedAt).toLocaleString()}</div>
                        </div>
                        ${badgeHtml}
                    `;
                    item.querySelector('.delete-note').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await moveNoteToTrash(note.id);
                    });
                    item.querySelector('.pin-note').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const result = await window.electronAPI.togglePin(note.id);
                        if (result.success) {
                            const index = notes.findIndex(n => n.id === note.id);
                            if (index !== -1) {
                                notes[index].pinned = result.pinned;
                                renderNoteList(searchInput.value);
                            }
                        }
                    });
                } else {
                    const categoryColor = getCategoryColor(note.category);
                    // FIX: badgeHtml is now actually inserted into the template
                    const badgeHtml = note.category
                        ? `<span class="category-badge" style="background-color: ${categoryColor};">${note.category}</span>`
                        : '';
                    item.innerHTML = `
                        <div class="note-item-header">
                            <div class="note-title">${note.title || 'Untitled'}</div>
                            <div>
                                <button class="restore-note" data-id="${note.id}" title="Restore Note">♻️</button>
                                <button class="delete-note" data-id="${note.id}" title="Delete Permanently">❌</button>
                            </div>
                        </div>
                        ${badgeHtml}
                        <div class="note-date">${new Date(note.updatedAt).toLocaleString()}</div>
                    `;
                    item.querySelector('.restore-note').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await restoreNote(note.id);
                    });
                    item.querySelector('.delete-note').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await deletePermanently(note.id);
                    });
                }

                item.addEventListener('click', async (e) => {
                    if (e.target.closest('button')) return;
                    await switchNote(note.id);
                });

                noteList.appendChild(item);
            });

            updateCategoryFilter();
        }

        async function switchNote(id) {
            if (currentTab === 'notes' && currentNoteId && id && String(currentNoteId) !== String(id)) {
                clearTimeout(debounceTimer);
                await autoSave();
            }

            const note = notes.find(n => n.id && id && String(n.id) === String(id));
            if (!note) return;
            currentNoteId = note.id;
            titleInput.value = note.title || '';
            noteEditor.innerHTML = note.content || '';
            categoryInput.value = note.category || '';
            lastSavedContent = note.content || '';
            statusEl.textContent = '';

            if (currentTab === 'trash') {
                trashBanner.style.display = 'flex';
                noteEditor.contentEditable = "false";
                titleInput.disabled = true;
            } else {
                trashBanner.style.display = 'none';
                noteEditor.contentEditable = "true";
                titleInput.disabled = false;
            }

            renderNoteList(searchInput.value);
            updateWordCount();
        }

        function clearEditor() {
            currentNoteId = null;
            titleInput.value = '';
            categoryInput.value = '';
            noteEditor.innerHTML = '';
            lastSavedContent = '';
            trashBanner.style.display = 'none';
            updateWordCount();
        }

        async function saveCurrentNote() {
            if (!currentNoteId || currentTab !== 'notes') return;
            const existingNote = notes.find(n => n.id && currentNoteId && String(n.id) === String(currentNoteId));
            const note = {
                id: currentNoteId,
                title: titleInput.value || 'Untitled',
                content: noteEditor.innerHTML,
                category: categoryInput.value.trim() || '',
                pinned: existingNote ? existingNote.pinned || false : false,
                isTrashed: false
            };
            await window.electronAPI.saveNoteJson(note);
            lastSavedContent = noteEditor.innerHTML;
            const index = notes.findIndex(n => n.id && currentNoteId && String(n.id) === String(currentNoteId));
            if (index !== -1) {
                notes[index] = { ...notes[index], ...note, updatedAt: new Date().toISOString() };
            }
            renderNoteList(searchInput.value);
            statusEl.textContent = `Note saved at ${new Date().toLocaleTimeString()}`;
        }

        async function moveNoteToTrash(id) {
            const index = notes.findIndex(n => n.id && id && String(n.id) === String(id));
            if (index !== -1) {
                notes[index].isTrashed = true;
                notes[index].updatedAt = new Date().toISOString();
                await window.electronAPI.saveNoteJson(notes[index]);

                if (currentNoteId && id && String(currentNoteId) === String(id)) {
                    currentNoteId = null;
                    clearEditor();
                }

                statusEl.textContent = 'Note moved to Trash Bin.';
                await loadAllNotes();
            }
        }

        async function restoreNote(id) {
            const index = notes.findIndex(n => n.id && id && String(n.id) === String(id));
            if (index !== -1) {
                notes[index].isTrashed = false;
                notes[index].updatedAt = new Date().toISOString();
                await window.electronAPI.saveNoteJson(notes[index]);

                if (currentNoteId && id && String(currentNoteId) === String(id)) {
                    currentNoteId = null;
                    clearEditor();
                }

                statusEl.textContent = 'Note restored.';
                await loadAllNotes();
            }
        }

        async function deletePermanently(id) {
            const confirmed = await window.electronAPI.showConfirmDialog("Are you sure you want to permanently delete this note? This action is irreversible.", "Delete Note Permanently");
            if (!confirmed) return;

            await window.electronAPI.deleteNoteJson(id);
            notes = notes.filter(n => n.id && id ? String(n.id) !== String(id) : true);

            if (currentNoteId && id && String(currentNoteId) === String(id)) {
                currentNoteId = null;
                clearEditor();
            }

            statusEl.textContent = 'Note permanently deleted.';
            await loadAllNotes();
        }

        // Connect trash banner buttons
        bannerRestoreBtn.addEventListener('click', async () => {
            if (currentNoteId) {
                await restoreNote(currentNoteId);
            }
        });

        bannerDeletePermBtn.addEventListener('click', async () => {
            if (currentNoteId) {
                await deletePermanently(currentNoteId);
            }
        });

        document.getElementById('print-note').addEventListener('click', async () => {
            if (!currentNoteId) return;
            await window.electronAPI.printNote(noteEditor.innerHTML, titleInput.value || 'Untitled');
        });

        // Menu action listeners
        window.electronAPI.onMenuAction('menu-new-note', () => {
            if (currentTab === 'notes') newNoteBtn.click();
        });
        window.electronAPI.onMenuAction('menu-open-file', () => {
            if (currentTab === 'notes') openFileBtn.click();
        });
        window.electronAPI.onMenuAction('menu-save', () => {
            if (currentTab === 'notes') saveBtn.click();
        });
        window.electronAPI.onMenuAction('menu-save-as', () => {
            if (currentTab === 'notes') saveAsBtn.click();
        });
        window.electronAPI.onMenuAction('menu-export-pdf', () => {
            exportPdfBtn.click();
        });

    } catch (err) {
        console.error('Renderer initialization failed:', err);
        alert('Renderer initialization failed: ' + err.message);
    }
});