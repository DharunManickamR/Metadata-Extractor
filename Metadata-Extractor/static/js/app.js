/* ----------------------------------------------------
   DIGITAL FORENSICS METADATA EXTRACTOR JS LOGIC
   ---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------------------
    // STATE & ELEMENT BINDINGS
    // ------------------------------------------------
    let filesState = []; // Global in-memory list of analyzed files
    let activeCategoryFilter = 'all';
    
    // Core Elements
    const bodyEl = document.body;
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    
    // Upload Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const queueContainer = document.getElementById('upload-queue-container');
    const queueList = document.getElementById('upload-queue-list');
    
    // Stats Elements
    const countFilesEl = document.getElementById('count-files');
    const countVolumeEl = document.getElementById('count-volume');
    const countHashesEl = document.getElementById('count-hashes');
    
    // Table Elements
    const tableSearch = document.getElementById('table-search');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const tableBody = document.getElementById('forensic-log-body');
    
    // Inspector Elements
    const inspectorDrawer = document.getElementById('inspector-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const inspectorFilename = document.getElementById('inspector-filename');
    const inspectorDownloadBtn = document.getElementById('inspector-download-pdf-btn');
    const inspectorGeneralGrid = document.getElementById('inspector-general-grid');
    const inspectorSpecificGrid = document.getElementById('inspector-specific-grid');
    const inspectorMd5 = document.getElementById('inspector-md5');
    const inspectorSha256 = document.getElementById('inspector-sha256');
    const inspectorRawJson = document.getElementById('inspector-raw-json');
    const tabButtons = document.querySelectorAll('.drawer-tabs .tab-btn');
    const tabPanels = document.querySelectorAll('.drawer-content .tab-panel');

    // ------------------------------------------------
    // THEME HANDLING
    // ------------------------------------------------
    const savedTheme = localStorage.getItem('forensic-theme') || 'dark-theme';
    bodyEl.className = savedTheme;
    updateThemeIcon();
    
    themeToggleBtn.addEventListener('click', () => {
        if (bodyEl.classList.contains('dark-theme')) {
            bodyEl.classList.replace('dark-theme', 'light-theme');
            localStorage.setItem('forensic-theme', 'light-theme');
        } else {
            bodyEl.classList.replace('light-theme', 'dark-theme');
            localStorage.setItem('forensic-theme', 'dark-theme');
        }
        updateThemeIcon();
    });
    
    function updateThemeIcon() {
        const isDark = bodyEl.classList.contains('dark-theme');
        themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
    }

    // ------------------------------------------------
    // DRAG AND DROP HANDLERS
    // ------------------------------------------------
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFileUpload(files);
        }
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFileUpload(this.files);
        }
    });

    // ------------------------------------------------
    // UPLOAD QUEUE & AJAX LOGIC
    // ------------------------------------------------
    function handleFileUpload(files) {
        queueContainer.classList.remove('hidden');
        queueList.innerHTML = ''; // Reset queue view
        
        // Prepare multi-upload payload
        const formData = new FormData();
        
        Array.from(files).forEach((file, index) => {
            formData.append('files', file);
            
            // Build visual progress items
            const fileId = `queue-file-${index}`;
            const sizeFormatted = formatBytes(file.size);
            const mimeType = file.type || "unknown";
            const iconClass = getIconByCategory(mimeType, file.name);
            
            const queueItem = document.createElement('div');
            queueItem.className = 'queue-item';
            queueItem.id = fileId;
            queueItem.innerHTML = `
                <div class="queue-file-details">
                    <i class="${iconClass}"></i>
                    <div>
                        <span class="queue-file-name" title="${file.name}">${file.name}</span>
                        <span class="queue-file-size">(${sizeFormatted})</span>
                    </div>
                </div>
                <div class="queue-progress-bar-wrapper">
                    <div class="queue-progress-bar" id="${fileId}-progress"></div>
                </div>
                <div class="queue-status uploading" id="${fileId}-status">Uploading...</div>
            `;
            queueList.appendChild(queueItem);
        });

        // Setup XHR upload to display real-time feedback
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                // Update all items progress bar proportionally for mock/real progress
                Array.from(files).forEach((_, idx) => {
                    const bar = document.getElementById(`queue-file-${idx}-progress`);
                    if (bar) bar.style.width = `${percentComplete}%`;
                });
            }
        });
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.status === 'success') {
                    // Update queue UI status
                    Array.from(files).forEach((_, idx) => {
                        const statusEl = document.getElementById(`queue-file-${idx}-status`);
                        if (statusEl) {
                            statusEl.innerText = "Analyzed";
                            statusEl.className = "queue-status completed";
                        }
                    });
                    
                    // Merge results and re-render
                    response.results.forEach(res => {
                        if (!res.error) {
                            filesState.push(res);
                        } else {
                            alert(`File analysis failed: ${res.filename} - ${res.error}`);
                        }
                    });
                    
                    setTimeout(() => {
                        queueContainer.classList.add('hidden');
                        queueList.innerHTML = '';
                    }, 2000);
                    
                    updateStats();
                    renderTable();
                }
            } else {
                alert("Upload failed due to connection issues or file limits.");
                Array.from(files).forEach((_, idx) => {
                    const statusEl = document.getElementById(`queue-file-${idx}-status`);
                    if (statusEl) {
                        statusEl.innerText = "Error";
                        statusEl.className = "queue-status failed";
                    }
                });
            }
        };
        
        xhr.onerror = function() {
            alert("A network error occurred during analysis upload.");
        };
        
        xhr.send(formData);
    }

    // ------------------------------------------------
    // TABLE PRESENTATION & FILTERS
    // ------------------------------------------------
    function renderTable() {
        tableBody.innerHTML = '';
        
        // Apply filters
        const query = tableSearch.value.toLowerCase().strip();
        const filtered = filesState.filter(item => {
            // Category filter
            if (activeCategoryFilter !== 'all' && item.category !== activeCategoryFilter) {
                return false;
            }
            // Search text filter
            if (query !== '') {
                const matchName = item.filename.toLowerCase().includes(query);
                const matchMime = item.mime.toLowerCase().includes(query);
                const matchMd5 = item.md5.toLowerCase().includes(query);
                const matchSha = item.sha256.toLowerCase().includes(query);
                return matchName || matchMime || matchMd5 || matchSha;
            }
            return true;
        });
        
        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-row-placeholder">
                    <td colspan="6" class="text-center text-muted">
                        <div class="empty-state">
                            <i class="fa-solid fa-folder-open"></i>
                            <p>${filesState.length === 0 ? 'No files loaded. Import files above to initiate forensic metadata extraction.' : 'No items match your active filters.'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        filtered.forEach(file => {
            const iconClass = getIconByCategory(file.mime, file.filename);
            const categoryClass = `${file.category}-cell-icon`;
            const uploadTime = file.uploaded_at || "N/A";
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="file-cell">
                        <div class="file-cell-icon ${categoryClass}"><i class="${iconClass}"></i></div>
                        <div class="file-cell-info">
                            <span class="file-cell-name" data-id="${file.file_id}">${file.filename}</span>
                            <span class="file-cell-size">${file.size}</span>
                        </div>
                    </div>
                </td>
                <td><code class="text-muted" style="font-size: 11px;">${file.mime}</code></td>
                <td>
                    <code class="monospaced-hash" id="table-md5-${file.file_id}">
                        ${file.md5.substring(0, 8)}...
                        <button class="copy-inline-btn" data-text="${file.md5}"><i class="fa-regular fa-copy"></i></button>
                    </code>
                </td>
                <td>
                    <code class="monospaced-hash" id="table-sha-${file.file_id}">
                        ${file.sha256.substring(0, 10)}...
                        <button class="copy-inline-btn" data-text="${file.sha256}"><i class="fa-regular fa-copy"></i></button>
                    </code>
                </td>
                <td class="text-muted" style="font-size: 12px;">${uploadTime}</td>
                <td>
                    <div class="row-actions">
                        <button class="action-icon-btn view-details-btn" data-id="${file.file_id}" title="Inspect Embedded Metadata">
                            <i class="fa-solid fa-magnifying-glass-chart"></i>
                        </button>
                        <a href="/report/${file.file_id}" class="action-icon-btn download-report-btn" title="Download Integrity PDF Report">
                            <i class="fa-solid fa-file-pdf"></i>
                        </a>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
        
        // Re-attach inline copy listeners
        document.querySelectorAll('.copy-inline-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const text = this.getAttribute('data-text');
                copyToClipboard(text, this);
            });
        });
        
        // Re-attach view details click listeners
        document.querySelectorAll('.view-details-btn, .file-cell-name').forEach(btn => {
            btn.addEventListener('click', function() {
                const fileId = this.getAttribute('data-id');
                openInspectorDrawer(fileId);
            });
        });
    }

    // Search input trigger
    tableSearch.addEventListener('input', () => {
        renderTable();
    });

    // Category button trigger
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeCategoryFilter = this.getAttribute('data-category');
            renderTable();
        });
    });

    // ------------------------------------------------
    // METADATA INSPECTOR DRAWER
    // ------------------------------------------------
    function openInspectorDrawer(fileId) {
        // Fetch full metadata details from API
        fetch(`/metadata/${fileId}`)
            .then(res => {
                if (!res.ok) throw new Error("Metadata request failed");
                return res.json();
            })
            .then(metadata => {
                // Bind Header
                inspectorFilename.innerText = metadata.general.filename;
                inspectorFilename.setAttribute('title', metadata.general.filename);
                inspectorDownloadBtn.setAttribute('href', `/report/${fileId}`);
                
                // Bind Hashes
                inspectorMd5.innerText = metadata.hashes.md5;
                inspectorSha256.innerText = metadata.hashes.sha256;
                
                // Bind Raw JSON
                inspectorRawJson.innerText = JSON.stringify(metadata, null, 4);
                
                // Bind General Grid
                inspectorGeneralGrid.innerHTML = `
                    <div class="meta-row"><span class="meta-label">File Type</span><span class="meta-val">${metadata.general.mime_type}</span></div>
                    <div class="meta-row"><span class="meta-label">Category</span><span class="meta-val">${metadata.general.category.toUpperCase()}</span></div>
                    <div class="meta-row"><span class="meta-label">File Size</span><span class="meta-val">${metadata.general.size_formatted} (${metadata.general.size_bytes} B)</span></div>
                    <div class="meta-row"><span class="meta-label">Created Time</span><span class="meta-val">${metadata.general.created}</span></div>
                    <div class="meta-row"><span class="meta-label">Modified Time</span><span class="meta-val">${metadata.general.modified}</span></div>
                    <div class="meta-row"><span class="meta-label">Investigation Path</span><span class="meta-val" style="font-family: var(--font-mono); font-size: 10.5px;">${metadata.general.filepath}</span></div>
                `;
                
                // Bind Format Specific Grid
                inspectorSpecificGrid.innerHTML = '';
                const specData = metadata.specific || {};
                
                if (Object.keys(specData).length === 0 || (specData.Message)) {
                    inspectorSpecificGrid.innerHTML = `<p class="text-muted text-center" style="padding: 20px 0;">No embedded metadata was extracted from this format structure.</p>`;
                } else {
                    for (const [key, value] of Object.entries(specData)) {
                        const row = document.createElement('div');
                        row.className = 'meta-row';
                        
                        let valHtml = value;
                        if (key === "Google Maps Link") {
                            valHtml = `<a href="${value}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-map-location-dot"></i> View on Google Maps</a>`;
                        }
                        
                        row.innerHTML = `<span class="meta-label">${key}</span><span class="meta-val">${valHtml}</span>`;
                        inspectorSpecificGrid.appendChild(row);
                    }
                }
                
                // Reset to default tab (General Info)
                switchTab('general-tab');
                
                // Open Drawer
                inspectorDrawer.classList.add('open');
            })
            .catch(err => {
                alert(`Inspection Drawer Error: ${err.message}`);
            });
    }

    function closeInspectorDrawer() {
        inspectorDrawer.classList.remove('open');
    }
    
    closeDrawerBtn.addEventListener('click', closeInspectorDrawer);
    
    // Tab switching listener
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    function switchTab(tabId) {
        tabButtons.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
        });
        tabPanels.forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });
    }
    
    // Copy buttons in Drawer
    document.querySelectorAll('.copy-hash-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                copyToClipboard(targetEl.innerText, this);
            }
        });
    });

    // Close drawer when clicking outside the drawer
    document.addEventListener('click', (e) => {
        if (inspectorDrawer.classList.contains('open') && 
            !inspectorDrawer.contains(e.target) && 
            !e.target.closest('.view-details-btn') && 
            !e.target.closest('.file-cell-name')) {
            closeInspectorDrawer();
        }
    });

    // ------------------------------------------------
    // SECURE WIPE ALL DATA
    // ------------------------------------------------
    clearAllBtn.addEventListener('click', () => {
        if (filesState.length === 0) {
            alert("Investigation log is already empty.");
            return;
        }
        if (confirm("WARNING: Proceeding will SECURELY WIPE all analyzed uploads, integrity cache files, and forensic records. This action is irreversible. Proceed?")) {
            fetch('/clear', { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        filesState = [];
                        closeInspectorDrawer();
                        updateStats();
                        renderTable();
                        alert(data.message);
                    } else {
                        alert(`Clear action report: ${data.message}`);
                    }
                })
                .catch(err => {
                    alert(`Error performing wipe: ${err.message}`);
                });
        }
    });

    // ------------------------------------------------
    // FORENSIC STATS & HELPER UTILITIES
    // ------------------------------------------------
    function updateStats() {
        countFilesEl.innerText = filesState.length;
        countHashesEl.innerText = filesState.length * 2; // MD5 & SHA-256 for each file
        
        let totalBytes = 0;
        filesState.forEach(file => {
            // Retrieve bytes from size formatted or state
            // To simplify, let's keep track of actual volume size
            const sizeStr = file.size; // e.g. "124.50 KB", "1.20 MB"
            const num = parseFloat(sizeStr);
            if (sizeStr.includes('MB')) totalBytes += num * 1024 * 1024;
            else if (sizeStr.includes('KB')) totalBytes += num * 1024;
            else totalBytes += num;
        });
        
        countVolumeEl.innerText = formatVolume(totalBytes);
    }
    
    function formatBytes(bytes) {
        if (bytes === 0) return '0.00 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function formatVolume(bytes) {
        if (bytes === 0) return '0.00 KB';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.max(1, Math.floor(Math.log(bytes) / Math.log(k)));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function getIconByCategory(mime, filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
            return 'fa-solid fa-file-image';
        } else if (mime === 'application/pdf' || ext === 'pdf') {
            return 'fa-solid fa-file-pdf';
        } else if (ext === 'docx') {
            return 'fa-solid fa-file-word';
        } else if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
            return 'fa-solid fa-file-audio';
        } else if (mime.startsWith('video/') || ['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
            return 'fa-solid fa-file-video';
        }
        return 'fa-solid fa-file';
    }

    function copyToClipboard(text, triggerEl) {
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            const originalHTML = triggerEl.innerHTML;
            triggerEl.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-green);"></i>';
            setTimeout(() => {
                triggerEl.innerHTML = originalHTML;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
});

// String strip polyfill
String.prototype.strip = function() {
    return this.replace(/^\s+|\s+$/g, '');
};
