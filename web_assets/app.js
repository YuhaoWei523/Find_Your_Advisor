function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Backend API URL
const API_BASE = 'http://127.0.0.1:5000/api';

let activeMethods = new Set();
let activeDomains = new Set();
let activeUniversities = new Set();
let activeStatuses = new Set();
let activePriorities = new Set();
let searchQuery = "";
let selectedCardIds = new Set();
let map = null;
let markersLayer = null;
let mapVisible = false;
let activeMapUniversityFilter = null;
let markerByUni = new Map();


function toggleCardSelection(id, event) {
    if (event.target.closest('.star-rating-btn') || event.target.closest('select') || event.target.closest('textarea') || event.target.closest('a') || event.target.closest('.tag')) {
        return;
    }
    
    const cardEl = event.currentTarget;
    
    if (event.ctrlKey || event.metaKey) {
        if (selectedCardIds.has(id)) {
            selectedCardIds.delete(id);
            cardEl.classList.remove('selected');
        } else {
            selectedCardIds.add(id);
            cardEl.classList.add('selected');
        }
    } else {
        if (selectedCardIds.has(id) && selectedCardIds.size === 1) {
            selectedCardIds.clear();
            cardEl.classList.remove('selected');
        } else {
            selectedCardIds.clear();
            document.querySelectorAll('.card.selected').forEach(el => el.classList.remove('selected'));
            selectedCardIds.add(id);
            cardEl.classList.add('selected');
        }
    }
    
    updateGlobalActionButtons();
}

function updateGlobalActionButtons() {
    const editBtn = document.getElementById('btn-edit-selected');
    const delBtn = document.getElementById('btn-delete-selected');
    if (!editBtn || !delBtn) return;
    
    if (selectedCardIds.size === 1) {
        editBtn.disabled = false;
        editBtn.className = 'btn btn-primary';
        editBtn.onclick = (e) => { e.stopPropagation(); openModal([...selectedCardIds][0]); };
    } else {
        editBtn.disabled = true;
        editBtn.className = 'btn btn-disabled';
        editBtn.onclick = null;
    }
    
    if (selectedCardIds.size >= 1) {
        delBtn.disabled = false;
        delBtn.className = 'btn btn-danger';
        delBtn.onclick = async (e) => {
            e.stopPropagation();
            if(!confirm(`Are you sure you want to delete ${selectedCardIds.size} selected researcher(s)?`)) return;
            for (let id of selectedCardIds) {
                try {
                    await fetch(`${API_BASE}/researchers/delete`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({id})
                    });
                } catch(err) {}
            }
            selectedCardIds.clear();
            requestRender();
        };
    } else {
        delBtn.disabled = true;
        delBtn.className = 'btn btn-disabled';
        delBtn.onclick = null;
    }
}

// --- Draggable Resizable Sidebar with Persistence ---
function initSidebarResizer() {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebar-resizer');
    if (!sidebar || !resizer) return;

    const STORAGE_KEY = 'advisor_sidebar_width';
    const DEFAULT_WIDTH = 320;
    const MIN_WIDTH = 230;

    // Restore saved width from localStorage if exists
    try {
        const savedWidth = localStorage.getItem(STORAGE_KEY);
        if (savedWidth) {
            const parsed = parseInt(savedWidth, 10);
            const currentMax = Math.min(750, Math.floor(window.innerWidth * 0.65));
            if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= currentMax) {
                sidebar.style.width = `${parsed}px`;
            }
        }
    } catch (e) {
        console.warn("Could not read sidebar width from localStorage", e);
    }

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;

    const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        
        isDragging = true;
        startX = e.clientX;
        startWidth = sidebar.getBoundingClientRect().width;

        resizer.classList.add('is-dragging');
        document.body.classList.add('is-resizing-sidebar');

        if (resizer.setPointerCapture && e.pointerId !== undefined) {
            try { resizer.setPointerCapture(e.pointerId); } catch (_) {}
        }

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        e.preventDefault();
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        let newWidth = startWidth + deltaX;

        const currentMax = Math.min(750, Math.floor(window.innerWidth * 0.65));
        newWidth = Math.max(MIN_WIDTH, Math.min(newWidth, currentMax));

        sidebar.style.width = `${newWidth}px`;
        if (map) {
            map.invalidateSize();
        }
    };

    const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;

        resizer.classList.remove('is-dragging');
        document.body.classList.remove('is-resizing-sidebar');

        if (resizer.releasePointerCapture && e.pointerId !== undefined) {
            try { resizer.releasePointerCapture(e.pointerId); } catch (_) {}
        }

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        try {
            const finalWidth = Math.round(sidebar.getBoundingClientRect().width);
            localStorage.setItem(STORAGE_KEY, finalWidth);
        } catch (_) {}

        if (map) {
            map.invalidateSize();
        }
    };

    // Double-click on handle resets to default width
    resizer.addEventListener('dblclick', () => {
        sidebar.style.width = `${DEFAULT_WIDTH}px`;
        try {
            localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH);
        } catch (_) {}
        if (map) {
            map.invalidateSize();
        }
    });

    resizer.addEventListener('pointerdown', onPointerDown);
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    initSidebarResizer();
    try {
        const res = await fetch(`${API_BASE}/tags`);
        if (!res.ok) throw new Error("Failed to load tags from backend.");
        const data = await res.json();
        
        buildFilters(data.methods, data.domains, data.universities, data.statuses);
        setupEventListeners();
        
        // Initial fetch
        requestRender();
    } catch (e) {
        document.getElementById('stats-text').innerText = "INIT ERROR: " + e.message;
        console.error(e);
    }
});

let renderTimeout = null;
function triggerRender() {
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout = setTimeout(requestRender, 150);
}

function buildFilters(methods, domains, universities, statuses) {
    const buildCheckboxes = (containerId, items, activeSet) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const val = item.value !== undefined ? item.value : item;
            const isChecked = activeSet.has(val) ? 'checked' : '';
            const label = document.createElement('label');
            label.className = 'filter-label';
            label.innerHTML = `<input type="checkbox" value="${val}" ${isChecked}> ${item.label || item}`;
            label.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) activeSet.add(val);
                else activeSet.delete(val);
                triggerRender();
            });
            container.appendChild(label);
        });
    };
    
    const priorities = [
        {value: 5, label: '★★★★★ (5 Stars)'},
        {value: 4, label: '★★★★☆ (4 Stars)'},
        {value: 3, label: '★★★☆☆ (3 Stars)'},
        {value: 2, label: '★★☆☆☆ (2 Stars)'},
        {value: 1, label: '★☆☆☆☆ (1 Star)'},
        {value: 0, label: 'Unrated (0 Stars)'}
    ];

    buildCheckboxes('priority-filters', priorities, activePriorities);
    buildCheckboxes('methods-filters', methods, activeMethods);
    buildCheckboxes('domains-filters', domains, activeDomains);
        const uniContainer = document.getElementById('university-filters');
    uniContainer.innerHTML = '';
    Object.keys(universities).sort().forEach(country => {
        const details = document.createElement('details');
        details.style.marginBottom = '5px';
        const summary = document.createElement('summary');
        summary.innerText = country;
        summary.style.cursor = 'pointer';
        summary.style.fontWeight = 'bold';
        details.appendChild(summary);
        
        const subContainer = document.createElement('div');
        subContainer.style.marginLeft = '10px';
        subContainer.style.marginTop = '5px';
        
        universities[country].forEach(uni => {
            const isChecked = activeUniversities.has(uni) ? 'checked' : '';
            const label = document.createElement('label');
            label.className = 'filter-label';
            label.innerHTML = `<input type="checkbox" value="${uni}" ${isChecked}> ${uni}`;
            label.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) activeUniversities.add(uni);
                else activeUniversities.delete(uni);
                triggerRender();
            });
            subContainer.appendChild(label);
        });
        
        details.appendChild(subContainer);
        uniContainer.appendChild(details);
    });
    buildCheckboxes('status-filters', statuses, activeStatuses);
}

function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        triggerRender();
    });

    document.getElementById('methods-logic').addEventListener('change', triggerRender);
    document.getElementById('domains-logic').addEventListener('change', triggerRender);

    const newPiFilterEl = document.getElementById('filter-new-pi');
    if (newPiFilterEl) newPiFilterEl.addEventListener('change', triggerRender);
    const incomingPiFilterEl = document.getElementById('filter-incoming-pi');
    if (incomingPiFilterEl) incomingPiFilterEl.addEventListener('change', triggerRender);

    const toggleBtn = document.getElementById('toggle-map-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => toggleMap());
    }

    const fitBoundsBtn = document.getElementById('map-fit-bounds-btn');
    if (fitBoundsBtn) {
        fitBoundsBtn.addEventListener('click', () => fitMapBounds());
    }

    const heightToggleBtn = document.getElementById('map-height-toggle-btn');
    if (heightToggleBtn) {
        heightToggleBtn.addEventListener('click', () => toggleMapHeight());
    }

    const closeMapBtn = document.getElementById('map-close-btn');
    if (closeMapBtn) {
        closeMapBtn.addEventListener('click', () => toggleMap(false));
    }

    const flytoSelect = document.getElementById('map-uni-flyto');
    if (flytoSelect) {
        flytoSelect.addEventListener('change', (e) => {
            if (!e.target.value) return;
            const [lat, lon, uni] = e.target.value.split('|');
            flyToUniversity(uni, parseFloat(lat), parseFloat(lon));
        });
    }

    const addBtn = document.getElementById('add-pi-btn');
    if (addBtn) addBtn.addEventListener('click', () => openModal());
}

async function requestRender() {
    document.getElementById('stats-text').innerText = "Loading...";
    
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    
    activeMethods.forEach(m => params.append('methods[]', m));
    activeDomains.forEach(d => params.append('domains[]', d));
    activeUniversities.forEach(u => params.append('universities[]', u));
    if (activeMapUniversityFilter) {
        params.append('universities[]', activeMapUniversityFilter);
    }
    activeStatuses.forEach(s => params.append('statuses[]', s));
    activePriorities.forEach(p => params.append('priorities[]', p));
    
    params.append('methods_logic', document.getElementById('methods-logic').value);
    params.append('domains_logic', document.getElementById('domains-logic').value);
    
    const newPiFilterEl = document.getElementById('filter-new-pi');
    if (newPiFilterEl && newPiFilterEl.checked) params.append('new_pi', 'true');
    
    const incomingPiFilterEl = document.getElementById('filter-incoming-pi');
    if (incomingPiFilterEl && incomingPiFilterEl.checked) params.append('incoming_pi', 'true');
    
    try {
        const res = await fetch(`${API_BASE}/researchers?${params.toString()}`);
        if (!res.ok) throw new Error("API request failed");
        const results = await res.json();
        
        renderResults(results);
    } catch (e) {
        document.getElementById('stats-text').innerText = "ERROR: " + e.message;
        console.error(e);
    }
}

let currentResults = [];
let currentPage = 1;
const PAGE_SIZE = 50;

function renderResults(researchers) {
    currentResults = researchers;
    currentPage = 1;
    
    document.getElementById('stats-text').innerText = `Showing ${researchers.length} researchers`;
    
    updateMap(researchers);
    renderGridPage();
}

function getStatusClass(status) {
    if (status.includes('Reading')) return 'card-status-Reading';
    if (status.includes('Drafting')) return 'card-status-Drafting';
    if (status.includes('Contacted')) return 'card-status-Contacted';
    if (status.includes('Positive')) return 'card-status-Positive';
    if (status.includes('Negative')) return 'card-status-Negative';
    if (status.includes('Interview')) return 'card-status-Interview';
    if (status.includes('Offer')) return 'card-status-Offer';
    if (status.includes('Rejected')) return 'card-status-Rejected';
    return 'card-status-Uncontacted';
}

function renderGridPage(append = false) {
    const grid = document.getElementById('results-grid');
    
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, currentResults.length);
    const pageData = currentResults.slice(startIndex, endIndex);
    
    const container = document.createDocumentFragment();
    
    
    const statuses = [
        'Uncontacted', 'Reading Papers', 'Drafting Email', 
        'Contacted', 'Replied - Positive', 'Replied - Negative', 
        'Interview', 'Offer', 'Rejected'
    ];

    pageData.forEach(r => {
        let badgeHtml = '';
        const st = String(r['Start Time'] || '');
        if (st.includes('2027')) {
            badgeHtml = `<span class="tag badge-incoming">🚀 Incoming (2027)</span>`;
        } else if (st.includes('2025') || st.includes('2026')) {
            badgeHtml = `<span class="tag badge-new">🔥 New PI</span>`;
        }
        
        let sourceBadge = '';
        if (r.Source === 'Manual') {
            sourceBadge = '<span class="tag badge-manual">👤 Manual</span>';
        }
        
        let logBadge = '';
        if (r.log_count && r.log_count > 0) {
            logBadge = `<span class="tag badge-logs" title="View Logs" onclick="event.stopPropagation(); openModal(${r.id})">📔 ${r.log_count} Logs</span>`;
        }


        let mHtml = (r.Methods_Tags || '').split(',').filter(x=>x.trim()).map(t => `<span class="tag tag-method">${t.trim()}</span>`).join('');
        let dHtml = (r.Domains_Tags || '').split(',').filter(x=>x.trim()).map(t => `<span class="tag tag-domain">${t.trim()}</span>`).join('');

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star-rating-btn ${i <= (r.Priority || 0) ? 'active' : ''}" data-val="${i}">★</span>`;
        }

        let optionsHtml = statuses.map(s => `<option value="${s}" ${r.Application_Status === s ? 'selected' : ''}>${s}</option>`).join('');

        const card = document.createElement('div');
        card.className = `card ${getStatusClass(r.Application_Status || '')} ${selectedCardIds.has(r.id) ? 'selected' : ''}`;
        card.setAttribute('data-id', r.id);
        card.onclick = (e) => toggleCardSelection(r.id, e);
        card.ondblclick = (e) => {
            if (e.target.closest('.star-rating-btn') || e.target.closest('select') || e.target.closest('textarea') || e.target.closest('a') || e.target.closest('.tag')) return;
            openModal(r.id);
        };
        card.innerHTML = `
            <div class="card-header" style="margin-bottom:10px;">
                <h3 style="margin:0; display:flex; align-items:center; flex-wrap:wrap; gap:10px;">
                    ${r.Name || 'Unknown'} 
                    <span class="star-rating" data-id="${r.id}" title="Click to rate. Double-click to clear rating.">${starsHtml}</span>
                </h3>
            </div>
            ${badgeHtml || sourceBadge || logBadge ? `<div style="margin-bottom:10px; overflow:hidden;">${logBadge}${sourceBadge}${badgeHtml}</div>` : ''}
            <p><strong>University:</strong> ${
                ((r.Lat && r.Lon) || (r.uni_lat && r.uni_lon)) 
                ? `<span class="uni-fly-link" onclick="event.stopPropagation(); flyToUniversity('${(r.University || r.uni_name || '').replace(/'/g, "\\'")}', ${r.Lat || r.uni_lat}, ${r.Lon || r.uni_lon})" title="Fly to university on map">📍 ${r.University || ''}</span>`
                : (r.University || '')
            } ${r.City ? `(${r.City})` : ''} ${r.University ? `<a href="programs.html?uni=${encodeURIComponent(r.University)}" onclick="event.stopPropagation();" title="View graduate programs at this university" style="font-size:0.8em; color:var(--accent); text-decoration:none; margin-left:6px; font-weight:600;">🎓 Programs</a>` : ''}</p>
            <p><strong>Department:</strong> ${r.Department || ''}</p>
            <p><strong>Title:</strong> ${r.Title || ''}</p>
            <p><strong>Subject:</strong> ${r.Subject || ''}</p>
            <p><strong>H-index:</strong> ${r['H-index'] || 'Unknown'}</p>
            <p><strong>Start Time:</strong> ${r['Start Time'] || ''}</p>
            <div style="margin-top:10px;">${mHtml} ${dHtml}</div>
            ${r.Web ? `<div style="margin-top:10px;"><a href="${r.Web}" target="_blank">Personal Webpage &rarr;</a></div>` : ''}
            
            <div class="crm-controls" data-id="${r.id}">
                <select class="status-select">
                    ${optionsHtml}
                </select>
                <textarea class="notes-area" placeholder="Write personal notes, reading insights, or email drafts here...">${r.User_Notes || ''}</textarea>
            </div>
        `;
        
        // Attach Event Listeners
        const statusSelect = card.querySelector('.status-select');
        statusSelect.addEventListener('change', (e) => {
            updateCRM(r.id, 'Application_Status', e.target.value);
            card.className = `card ${getStatusClass(e.target.value)}`;
        });

        let noteTimeout;
        const notesArea = card.querySelector('.notes-area');
        notesArea.addEventListener('input', (e) => {
            if(noteTimeout) clearTimeout(noteTimeout);
            noteTimeout = setTimeout(() => {
                updateCRM(r.id, 'User_Notes', e.target.value);
            }, 1000); // Autosave after 1s
        });

        const starBtns = card.querySelectorAll('.star-rating-btn');
        starBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = parseInt(e.target.dataset.val);
                updateCRM(r.id, 'Priority', val);
                // Update UI visually
                starBtns.forEach(b => {
                    if (parseInt(b.dataset.val) <= val) b.classList.add('active');
                    else b.classList.remove('active');
                });
            });
        });

        // Double click anywhere on the stars to clear rating
        const starRatingContainer = card.querySelector('.star-rating');
        starRatingContainer.addEventListener('dblclick', () => {
            updateCRM(r.id, 'Priority', 0);
            starBtns.forEach(b => b.classList.remove('active'));
        });

        container.appendChild(card);
    });
    
    if (append) {
        grid.appendChild(container);
    } else {
        grid.innerHTML = '';
        grid.appendChild(container);
    }
    
    // Handle Load More Button
    let loadMoreBtn = document.getElementById('load-more-btn');
    if (endIndex < currentResults.length) {
        if (!loadMoreBtn) {
            loadMoreBtn = document.createElement('button');
            loadMoreBtn.id = 'load-more-btn';
            loadMoreBtn.innerText = 'Load More';
            loadMoreBtn.style.cssText = 'display:block; width:100%; padding:15px; margin-top:20px; font-size:16px; cursor:pointer; background:#1976d2; color:white; border:none; border-radius:8px; font-weight:bold;';
            loadMoreBtn.onclick = () => {
                currentPage++;
                renderGridPage(true);
            };
            grid.parentNode.appendChild(loadMoreBtn);
        } else {
            loadMoreBtn.style.display = 'block';
        }
    } else if (loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
}

// ================= Modal & CRUD Logic =================
let universityOptions = [];

async function fetchUniversities() {
    try {
        const response = await fetch(`${API_BASE}/universities`);
        universityOptions = await response.json();
        
        const select = document.getElementById('edit-university');
        select.innerHTML = '<option value="">-- Select University --</option>';
        universityOptions.forEach(u => {
            select.innerHTML += `<option value="${u.id}">${u.name}</option>`;
        });
    } catch (e) {
        console.error("Failed to load universities", e);
    }
}

// Fetch them on init
fetchUniversities();

function openModal(id = null) {
    const modal = document.getElementById('editor-modal');
    const title = document.getElementById('modal-title');
    
    // Reset Form
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-name').value = '';
    document.getElementById('edit-university').value = '';
    document.getElementById('edit-department').value = '';
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-subject').value = '';
    document.getElementById('edit-start-time').value = '';
    document.getElementById('edit-h-index').value = '';
    document.getElementById('edit-web').value = '';
    document.getElementById('edit-methods').value = '';
    document.getElementById('edit-domains').value = '';

    if (id) {
        title.innerText = 'Edit Researcher';
        const r = currentResults.find(x => x.id === id);
        if (r) {
            document.getElementById('edit-id').value = r.id;
            document.getElementById('edit-name').value = r.Name || '';
            document.getElementById('edit-university').value = r.university_id || '';
            document.getElementById('edit-department').value = r.Department || '';
            document.getElementById('edit-title').value = r.Title || '';
            document.getElementById('edit-subject').value = r.Subject || '';
            document.getElementById('edit-start-time').value = r['Start Time'] || '';
            document.getElementById('edit-h-index').value = r['H-index'] || '';
            document.getElementById('edit-web').value = r.Web || '';
            document.getElementById('edit-methods').value = r.Methods_Tags || '';
            document.getElementById('edit-domains').value = r.Domains_Tags || '';
            loadHistory(id);
        }
    } else {
        title.innerText = 'Add New Researcher';
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('editor-modal').style.display = 'none';
}

async function saveResearcher() {
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value.trim();
    const uni_id = document.getElementById('edit-university').value;
    
    if (!name || !uni_id) {
        alert("Name and University are required!");
        return;
    }

    const payload = {
        Name: name,
        university_id: parseInt(uni_id),
        Department: document.getElementById('edit-department').value.trim(),
        Title: document.getElementById('edit-title').value.trim(),
        Subject: document.getElementById('edit-subject').value.trim(),
        Start_Time: document.getElementById('edit-start-time').value.trim(),
        H_index: document.getElementById('edit-h-index').value.trim(),
        Web: document.getElementById('edit-web').value.trim(),
        Methods_Tags: document.getElementById('edit-methods').value.trim(),
        Domains_Tags: document.getElementById('edit-domains').value.trim(),
        Source: id ? undefined : 'Manual'
    };

    try {
        if (id) {
            payload.id = parseInt(id);
            await fetch(`${API_BASE}/researchers/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            await fetch(`${API_BASE}/researchers/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        closeModal();
        requestRender(); // Refresh UI
    } catch (e) {
        alert("Error saving researcher: " + e.message);
    }
}

async function updateCRM(id, field, value) {
    try {
        await fetch(`${API_BASE}/researchers/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, [field]: value })
        });
    } catch (e) {
        console.error("Failed to update CRM data", e);
    }
}

function initMap() {
    if (map) return;
    map = L.map('map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView([28, 10], 2);
    
    // High-resolution CartoDB Voyager tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

function toggleMap(forceState = null) {
    const wrapper = document.getElementById('map-wrapper');
    const toggleBtn = document.getElementById('toggle-map-btn');
    const shouldShow = forceState !== null ? forceState : (wrapper.style.display === 'none' || wrapper.style.display === '');

    if (shouldShow) {
        wrapper.style.display = 'block';
        if (toggleBtn) toggleBtn.classList.add('active');
        mapVisible = true;
        if (!map) {
            initMap();
        }
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                fitMapBounds();
            }
        }, 150);
        triggerRender();
    } else {
        wrapper.style.display = 'none';
        if (toggleBtn) toggleBtn.classList.remove('active');
        mapVisible = false;
    }
}

function toggleMapHeight() {
    const mapDiv = document.getElementById('map');
    const btn = document.getElementById('map-height-toggle-btn');
    if (mapDiv.classList.contains('expanded')) {
        mapDiv.classList.remove('expanded');
        if (btn) btn.innerText = '📐 Expand';
    } else {
        mapDiv.classList.add('expanded');
        if (btn) btn.innerText = '📐 Compact';
    }
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 380);
}

function fitMapBounds() {
    if (!map || !markersLayer) return;
    const bounds = markersLayer.getBounds();
    if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }
}

function updateMap(researchers) {
    if (!mapVisible) return;
    if (!map) initMap();
    if (!markersLayer) return;

    markersLayer.clearLayers();
    markerByUni.clear();

    const clusterMap = new Map();

    researchers.forEach(r => {
        const lat = r.Lat || r.uni_lat;
        const lon = r.Lon || r.uni_lon;
        if (lat && lon) {
            const key = `${lat}_${lon}`;
            if (!clusterMap.has(key)) {
                clusterMap.set(key, {
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                    uni: r.University || r.Institute || r.uni_name || 'Unknown',
                    city: r.City || '',
                    count: 0,
                    starred: 0,
                    outreach: 0,
                    pis: []
                });
            }
            const item = clusterMap.get(key);
            item.count += 1;
            if (r.Priority && r.Priority >= 4) item.starred += 1;
            if (r.Application_Status && ['Contacted', 'Replied - Positive', 'Interview', 'Offer'].includes(r.Application_Status)) {
                item.outreach += 1;
            }
            if (item.pis.length < 5) {
                item.pis.push({
                    name: r.Name || 'Unknown',
                    dept: r.Department || '',
                    priority: r.Priority || 0
                });
            }
        }
    });

    // Populate HUD stats
    const hud = document.getElementById('map-hud-stats');
    if (hud) {
        hud.innerText = `📍 ${clusterMap.size} Universities · ${researchers.length} Researchers`;
    }

    // Populate Fly-To Select dropdown
    const flytoSelect = document.getElementById('map-uni-flyto');
    if (flytoSelect) {
        const currentVal = flytoSelect.value;
        flytoSelect.innerHTML = '<option value="">✈️ Fly to university...</option>';
        const sortedUnis = Array.from(clusterMap.values()).sort((a, b) => a.uni.localeCompare(b.uni));
        sortedUnis.forEach(item => {
            const opt = document.createElement('option');
            opt.value = `${item.lat}|${item.lon}|${item.uni}`;
            opt.innerText = `${item.uni} (${item.count})`;
            flytoSelect.appendChild(opt);
        });
        flytoSelect.value = currentVal;
    }

    // Render Badges and Popups
    clusterMap.forEach(item => {
        let badgeClass = 'map-marker-badge';
        if (item.outreach > 0) {
            badgeClass += ' has-outreach';
        } else if (item.starred > 0) {
            badgeClass += ' has-starred';
        }

        const customIcon = L.divIcon({
            className: 'map-marker-container',
            html: `<div class="${badgeClass}" title="${item.uni} (${item.count} researchers)">${item.count}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([item.lat, item.lon], { icon: customIcon });

        const piListHtml = item.pis.map(p => 
            `<div class="popup-pi-item">👤 <strong>${p.name}</strong> ${p.priority >= 4 ? '⭐' : ''} <span style="color:#64748b;">${p.dept ? '(' + p.dept + ')' : ''}</span></div>`
        ).join('');

        const remaining = item.count - item.pis.length;
        const moreHtml = remaining > 0 ? `<div style="font-size:0.75em; color:#94a3b8; margin-top:4px;">+ ${remaining} more researchers...</div>` : '';

        const escapedUni = item.uni.replace(/'/g, "\\'");
        const popupHtml = `
            <div class="custom-map-popup">
                <div class="popup-header">
                    <h4 class="popup-uni-name">${item.uni}</h4>
                    ${item.city ? `<span class="popup-country">📍 ${item.city}</span>` : ''}
                </div>
                <div class="popup-body">
                    <div class="popup-stat-grid">
                        <div class="popup-stat">
                            <span class="stat-num">${item.count}</span>
                            <span class="stat-label">Scholars</span>
                        </div>
                        <div class="popup-stat">
                            <span class="stat-num" style="color:#d97706;">★ ${item.starred}</span>
                            <span class="stat-label">Top Rated</span>
                        </div>
                        <div class="popup-stat">
                            <span class="stat-num" style="color:#059669;">📬 ${item.outreach}</span>
                            <span class="stat-label">Contacted</span>
                        </div>
                    </div>
                    <div class="popup-pi-preview">
                        ${piListHtml}
                        ${moreHtml}
                    </div>
                    <div class="popup-actions">
                        <button class="popup-filter-btn" onclick="applyMapUniversityFilter('${escapedUni}')">
                            🎯 Filter to this University
                        </button>
                    </div>
                </div>
            </div>
        `;

        marker.bindPopup(popupHtml, { maxWidth: 320, autoPanPadding: [75, 75] });
        marker.addTo(markersLayer);
        markerByUni.set(item.uni, marker);
    });
}

function flyToUniversity(uniName, lat, lon) {
    if (!mapVisible) {
        toggleMap(true);
    }
    setTimeout(() => {
        if (!map) return;
        map.flyTo([lat, lon], 9, { duration: 1.2 });
        setTimeout(() => {
            const marker = markerByUni.get(uniName);
            if (marker) {
                marker.openPopup();
            }
        }, 1300);
    }, 200);
}

function applyMapUniversityFilter(uniName) {
    activeMapUniversityFilter = uniName;
    const banner = document.getElementById('map-filter-banner');
    const nameEl = document.getElementById('map-filter-uni-name');
    if (banner && nameEl) {
        nameEl.innerText = uniName;
        banner.style.display = 'flex';
    }
    if (map) map.closePopup();
    requestRender();
}

function clearMapFilter() {
    activeMapUniversityFilter = null;
    const banner = document.getElementById('map-filter-banner');
    if (banner) banner.style.display = 'none';
    requestRender();
}


// ================= Journal Logic =================
let allLogs = [];
let allResearchers = [];

async function loadAllResearchersForMentions() {
    try {
        const params = new URLSearchParams();
        const res = await fetch(`${API_BASE}/researchers?` + params.toString());
        allResearchers = await res.json();
    } catch (e) { console.error(e); }
}

async function fetchLogs() {
    try {
        const res = await fetch(`${API_BASE}/logs`);
        allLogs = await res.json();
        renderTimeline();
    } catch (e) { console.error(e); }
}

function parseMentionsToHTML(text) {
    if(!text) return '';
    return text.replace(/\[@.*?\]\(pi:\d+\)/g, match => {
        const name = match.split(']')[0].substring(2);
        const id = match.match(/pi:(\d+)/)[1];
        return `<span class="mention-badge" onclick="event.stopPropagation(); closeJournal(); openModal(${id});">@${name}</span>`;
    });
}

function parseHTMLToMentions(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Replace mention badges with markdown
    const badges = temp.querySelectorAll('.mention-badge');
    badges.forEach(b => {
        const id = b.getAttribute('data-id');
        const name = b.innerText.substring(1); // remove @
        b.outerHTML = `[@${name}](pi:${id})`;
    });
    
    // Convert divs/brs to newlines for simple storage if needed, or just store HTML. 
    // Wait, storing HTML directly is better if we use contenteditable!
    // But we want clean text. Let's just store HTML but with mention badges converted to markdown.
    // Actually, it's easier to store the exact markdown in the DB, and render it to HTML in the UI.
    
    // To preserve newlines from contenteditable:
    let text = temp.innerHTML.replace(/<div>/g, '\n').replace(/<\/div>/g, '').replace(/<br>/g, '\n');
    // Strip other tags
    text = text.replace(/<[^>]*>?/gm, '');
    
    // Decode html entities (like &nbsp;)
    const txtArea = document.createElement('textarea');
    txtArea.innerHTML = text;
    return txtArea.value;
}

function formatTextToEditableHTML(text) {
    if(!text) return '';
    // Escape html
    let escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Parse mentions
    let html = escaped.replace(/\[@.*?\]\(pi:\d+\)/g, match => {
        const name = match.split(']')[0].substring(6); // handles &lt;@Name
        const nameClean = match.match(/\[@(.*)\]/)[1];
        const id = match.match(/pi:(\d+)/)[1];
        return `<span class="mention-badge" contenteditable="false" data-id="${id}">@${nameClean}</span>&nbsp;`;
    });
    // Replace newlines with divs
    html = html.replace(/\n/g, '<br>');
    return html;
}

function renderTimeline() {
    const tl = document.getElementById('journal-timeline');
    const filter = document.getElementById('timeline-filter').value;
    tl.innerHTML = '';
    
    let filteredLogs = allLogs;
    if (filter !== 'All') {
        filteredLogs = allLogs.filter(l => l.log_type === filter);
    }
    
    if (filteredLogs.length === 0) {
        tl.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">No logs found.</p>';
        return;
    }
    
    filteredLogs.forEach(log => {
        const div = document.createElement('div');
        div.style.cssText = 'padding:15px; border:1px solid #eee; cursor:pointer; margin-bottom:10px; border-radius:8px; transition:all 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.05);';
        div.onmouseover = () => { div.style.transform = 'translateY(-2px)'; div.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'; };
        div.onmouseout = () => { div.style.transform = 'none'; div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; };
        div.onclick = () => openLog(log);
        
        let badgeColor = log.log_type === 'Daily' ? '#4caf50' : (log.log_type === 'Weekly' ? '#2196f3' : '#9c27b0');
        
        // Truncate and render mentions
        let preview = log.content;
        if(preview.length > 150) preview = preview.substring(0, 150) + '...';
        
        let htmlPreview = parseMentionsToHTML(preview.replace(/\n/g, ' '));
        
        div.innerHTML = `
            <div style="font-size:0.8em; color:#666; margin-bottom:8px; display:flex; align-items:center;">
                <strong style="color:#333; font-size:1.1em;">${log.date}</strong> 
                <span style="background:${badgeColor}; color:white; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.9em; margin-left:10px;">${log.log_type}</span>
            </div>
            <div style="font-size:0.95em; color:#444; line-height:1.5;">
                ${htmlPreview}
            </div>
        `;
        tl.appendChild(div);
    });
}

function openJournal() {
    document.getElementById('journal-workspace').style.display = 'flex';
    fetchLogs();
    if(allResearchers.length === 0) loadAllResearchersForMentions();
    newLog();
}

function closeJournal() {
    document.getElementById('journal-workspace').style.display = 'none';
}

function newLog() {
    document.getElementById('log-id').value = '';
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('log-type').value = 'Daily';
    document.getElementById('log-content-editable').innerHTML = '';
    document.getElementById('btn-delete-log').style.display = 'none';
}

function openLog(log) {
    document.getElementById('log-id').value = log.id;
    document.getElementById('log-date').value = log.date;
    document.getElementById('log-type').value = log.log_type;
    document.getElementById('log-content-editable').innerHTML = formatTextToEditableHTML(log.content);
    document.getElementById('btn-delete-log').style.display = 'inline-block';
}

async function saveLog() {
    const editor = document.getElementById('log-content-editable');
    const content = parseHTMLToMentions(editor.innerHTML).trim();
    const date = document.getElementById('log-date').value;
    const log_type = document.getElementById('log-type').value;
    const id = document.getElementById('log-id').value;
    
    if (!content || !date) {
        alert("Date and Content are required.");
        return;
    }
    
    const mentionRegex = /\[@.*?\]\(pi:(\d+)\)/g;
    let match;
    const researcher_ids = [];
    while ((match = mentionRegex.exec(content)) !== null) {
        researcher_ids.push(parseInt(match[1]));
    }
    
    const payload = {
        id: id ? parseInt(id) : null,
        date, log_type, content, researcher_ids
    };
    
    try {
        await fetch(`${API_BASE}/logs/save`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        fetchLogs();
        newLog();
        // Trigger main render to update log counts
        requestRender();
    } catch(e) { alert(e); }
}

async function deleteLog() {
    const id = document.getElementById('log-id').value;
    if(!id) return;
    if(!confirm("Are you sure you want to delete this log?")) return;
    
    try {
        await fetch(`${API_BASE}/logs/delete`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: parseInt(id)})
        });
        fetchLogs();
        newLog();
        requestRender();
    } catch(e) { alert(e); }
}

// Mention Logic for contenteditable
document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('log-content-editable');
    if(!editor) return;
    
    const dropdown = document.getElementById('mention-dropdown');
    
    let currentMentionRange = null;

    editor.addEventListener('input', () => {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.substring(0, range.startOffset);
            const match = text.match(/@([a-zA-Z0-9\s]*)$/);
            
            if (match) {
                const search = match[1].toLowerCase();
                const filtered = allResearchers.filter(r => r.Name && r.Name.toLowerCase().includes(search)).slice(0, 10);
                
                if (filtered.length > 0) {
                    dropdown.innerHTML = '';
                    filtered.forEach(r => {
                        const item = document.createElement('div');
                        item.style.cssText = 'padding:10px 15px; border-bottom:1px solid #eee; cursor:pointer; display:flex; justify-content:space-between; align-items:center;';
                        item.innerHTML = `<strong style="color:#1976d2;">${r.Name}</strong> <span style="font-size:0.8em; color:#888;">${r.University || ''}</span>`;
                        item.onmousedown = (ev) => {
                            ev.preventDefault();
                            
                            // Delete the typed @text
                            const textNode = node;
                            textNode.textContent = textNode.textContent.substring(0, range.startOffset - match[0].length) + textNode.textContent.substring(range.startOffset);
                            
                            // Insert badge
                            const badge = document.createElement('span');
                            badge.className = 'mention-badge';
                            badge.setAttribute('contenteditable', 'false');
                            badge.setAttribute('data-id', r.id);
                            badge.innerText = `@${r.Name}`;
                            
                            const space = document.createTextNode('\u00A0'); // non-breaking space
                            
                            // Adjust range
                            range.setStart(textNode, range.startOffset - match[0].length);
                            range.insertNode(space);
                            range.insertNode(badge);
                            
                            // Move cursor after space
                            range.setStartAfter(space);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                            
                            dropdown.style.display = 'none';
                        };
                        item.onmouseover = () => item.style.background = '#f5f5f5';
                        item.onmouseout = () => item.style.background = 'transparent';
                        dropdown.appendChild(item);
                    });
                    
                    // Position dropdown
                    const rect = range.getBoundingClientRect();
                    const editorRect = editor.getBoundingClientRect();
                    
                    dropdown.style.display = 'block';
                    dropdown.style.top = (rect.bottom - editorRect.top + editor.scrollTop + 10) + 'px';
                    dropdown.style.left = Math.max(0, rect.left - editorRect.left) + 'px';
                } else {
                    dropdown.style.display = 'none';
                }
            } else {
                dropdown.style.display = 'none';
            }
        } else {
            dropdown.style.display = 'none';
        }
    });
    
    editor.addEventListener('blur', () => {
        setTimeout(() => dropdown.style.display = 'none', 200);
    });
    
    const btn = document.getElementById('open-journal-btn');
    if(btn) btn.addEventListener('click', openJournal);
});

async function loadHistory(id) {
    const historyDiv = document.getElementById('edit-history');
    historyDiv.innerHTML = '<em style="color:#888;">Loading history...</em>';
    try {
        const res = await fetch(`${API_BASE}/researchers/history?id=${id}`);
        const data = await res.json();
        if (data.length === 0) {
            historyDiv.innerHTML = '<em style="color:#888;">No outreach history logged yet.</em>';
            return;
        }
        historyDiv.innerHTML = data.map(log => {
            let badgeColor = log.log_type === 'Daily' ? '#4caf50' : (log.log_type === 'Weekly' ? '#2196f3' : '#9c27b0');
            return `
            <div style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
                <div style="margin-bottom:5px;">
                    <strong style="color:#333;">${log.date}</strong> 
                    <span style="background:${badgeColor}; color:white; padding:2px 6px; border-radius:8px; font-size:0.8em; margin-left:5px;">${log.log_type}</span>
                </div>
                <div style="color:#555; line-height:1.5;">
                    ${parseMentionsToHTML(log.content.replace(/\n/g, '<br>'))}
                </div>
            </div>
            `;
        }).join('');
    } catch(e) {
        historyDiv.innerHTML = '<em style="color:red;">Error loading history.</em>';
    }
}



// ==========================================
// --- Institution Management System ---
// ==========================================
let cachedInstitutionsList = [];

async function openInstitutionModal() {
    const modal = document.getElementById('institution-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    cancelUniForm();
    const searchInput = document.getElementById('uni-table-search');
    if (searchInput) searchInput.value = '';
    await loadInstitutionsTable();
}

function closeInstitutionModal() {
    const modal = document.getElementById('institution-modal');
    if (modal) modal.style.display = 'none';
}

async function loadInstitutionsTable() {
    const tbody = document.getElementById('institutions-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">Loading institutions...</td></tr>';
    
    try {
        const res = await fetch(`${API_BASE}/universities`);
        if (!res.ok) throw new Error("Failed to load institutions");
        cachedInstitutionsList = await res.json();
        renderInstitutionsTable();
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#ef4444;">Error: ${err.message}</td></tr>`;
    }
}

function filterInstitutionsTable() {
    const searchInput = document.getElementById('uni-table-search');
    const filterText = (searchInput ? searchInput.value : '').trim().toLowerCase();
    renderInstitutionsTable(filterText);
}

function renderInstitutionsTable(filterText = '') {
    const tbody = document.getElementById('institutions-table-body');
    const badge = document.getElementById('uni-count-badge');
    if (!tbody) return;

    let filtered = cachedInstitutionsList;
    if (filterText) {
        filtered = cachedInstitutionsList.filter(u => 
            (u.name && u.name.toLowerCase().includes(filterText)) ||
            (u.country && u.country.toLowerCase().includes(filterText))
        );
    }

    if (badge) {
        badge.innerText = `${filtered.length} of ${cachedInstitutionsList.length} institutions`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#94a3b8;">No institutions match the filter.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(uni => {
        const safeName = (uni.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const hasCoords = (uni.lat !== null && uni.lat !== undefined && uni.lat !== '' && 
                           uni.lon !== null && uni.lon !== undefined && uni.lon !== '');
        const coordsText = hasCoords 
            ? `${Number(uni.lat).toFixed(4)}, ${Number(uni.lon).toFixed(4)}`
            : '<span style="color:#94a3b8; font-style:italic;">None</span>';
        const piCount = uni.researcher_count || 0;
        const piBadgeStyle = piCount > 0 
            ? 'background: #dbeafe; color: #1e40af;' 
            : 'background: #f1f5f9; color: #64748b;';

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 10px 14px; font-weight: 600; color: var(--text-main);">
                    ${escapeHtml(uni.name)}
                </td>
                <td style="padding: 10px 12px; color: var(--text-muted);">
                    ${escapeHtml(uni.country || 'USA')}
                </td>
                <td style="padding: 10px 12px; font-family: monospace; font-size: 0.82em; color: #475569;">
                    ${coordsText}
                </td>
                <td style="padding: 10px 12px; text-align: center;">
                    <span style="${piBadgeStyle} padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 0.8em; display: inline-block;">
                        ${piCount} PIs
                    </span>
                </td>
                <td style="padding: 10px 14px; text-align: right; white-space: nowrap;">
                    ${hasCoords ? `<button class="btn btn-action" onclick="flyToInstitutionFromModal(${uni.lat}, ${uni.lon}, '${safeName}')" title="Fly to map" style="padding: 4px 8px; font-size: 0.8em; margin-right: 4px;">📍</button>` : ''}
                    <button class="btn btn-action" onclick="editInstitution(${uni.id})" title="Edit institution" style="padding: 4px 8px; font-size: 0.8em; margin-right: 4px;">✏️</button>
                    <button class="btn btn-action" onclick="deleteInstitution(${uni.id}, '${safeName}', ${piCount})" title="Delete institution" style="padding: 4px 8px; font-size: 0.8em; color: var(--danger);">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleAddUniForm(show = null) {
    const card = document.getElementById('uni-form-card');
    const toggleBtn = document.getElementById('toggle-add-uni-btn');
    if (!card) return;
    
    const shouldShow = (show !== null) ? show : (card.style.display === 'none');
    if (shouldShow) {
        card.style.display = 'block';
        if (toggleBtn) toggleBtn.innerText = '➖ Hide Form';
    } else {
        cancelUniForm();
    }
}

function cancelUniForm() {
    const card = document.getElementById('uni-form-card');
    const toggleBtn = document.getElementById('toggle-add-uni-btn');
    if (card) card.style.display = 'none';
    if (toggleBtn) toggleBtn.innerText = '➕ Add Institution';

    const idInput = document.getElementById('uni-form-id');
    const nameInput = document.getElementById('uni-form-name');
    const countryInput = document.getElementById('uni-form-country');
    const latInput = document.getElementById('uni-form-lat');
    const lonInput = document.getElementById('uni-form-lon');
    const titleEl = document.getElementById('uni-form-title');
    const hintEl = document.getElementById('uni-form-hint');
    const submitBtn = document.getElementById('uni-form-submit-btn');
    const noticeEl = document.getElementById('uni-sync-notice');

    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (countryInput) countryInput.value = '';
    if (latInput) latInput.value = '';
    if (lonInput) lonInput.value = '';
    if (titleEl) titleEl.innerText = '➕ Add New Institution';
    if (hintEl) hintEl.innerText = '';
    if (submitBtn) submitBtn.innerText = 'Save Institution';
    if (noticeEl) noticeEl.style.display = 'none';
}

function editInstitution(id) {
    const uni = cachedInstitutionsList.find(u => u.id === id);
    if (!uni) return;

    toggleAddUniForm(true);
    document.getElementById('uni-form-id').value = uni.id;
    document.getElementById('uni-form-name').value = uni.name || '';
    document.getElementById('uni-form-country').value = uni.country || '';
    document.getElementById('uni-form-lat').value = (uni.lat !== null && uni.lat !== undefined) ? uni.lat : '';
    document.getElementById('uni-form-lon').value = (uni.lon !== null && uni.lon !== undefined) ? uni.lon : '';
    
    document.getElementById('uni-form-title').innerText = `✏️ Edit Institution: ${uni.name}`;
    document.getElementById('uni-form-submit-btn').innerText = 'Update Institution';
    
    const piCount = uni.researcher_count || 0;
    const hint = document.getElementById('uni-form-hint');
    const notice = document.getElementById('uni-sync-notice');
    if (piCount > 0) {
        if (hint) hint.innerText = `Affiliated with ${piCount} researcher(s)`;
        if (notice) notice.style.display = 'block';
    } else {
        if (hint) hint.innerText = 'No affiliated researchers yet';
        if (notice) notice.style.display = 'none';
    }

    const card = document.getElementById('uni-form-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function submitUniForm() {
    const id = document.getElementById('uni-form-id').value;
    const name = document.getElementById('uni-form-name').value.trim();
    const country = document.getElementById('uni-form-country').value.trim() || 'USA';
    const latStr = document.getElementById('uni-form-lat').value.trim();
    const lonStr = document.getElementById('uni-form-lon').value.trim();

    if (!name) {
        alert('Please enter an institution name.');
        return;
    }

    const payload = {
        name: name,
        country: country,
        lat: latStr !== '' ? parseFloat(latStr) : null,
        lon: lonStr !== '' ? parseFloat(lonStr) : null
    };

    const isEdit = !!id;
    if (isEdit) {
        payload.id = parseInt(id, 10);
    }

    const endpoint = isEdit ? `${API_BASE}/universities/update` : `${API_BASE}/universities/add`;
    const submitBtn = document.getElementById('uni-form-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) {
            alert(`Error: ${result.error || 'Failed to save institution'}`);
            return;
        }

        cancelUniForm();
        await loadInstitutionsTable();
        await reloadTagsAndFilters();
    } catch (err) {
        alert(`Request failed: ${err.message}`);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function deleteInstitution(id, name, piCount) {
    let confirmMsg = `Are you sure you want to delete "${name}"?`;
    if (piCount > 0) {
        confirmMsg = `Are you sure you want to delete "${name}"?\n\n⚠️ WARNING: There are ${piCount} researcher(s) affiliated with this institution. They will be unlinked (their profiles will be kept, but institution cleared).`;
    }

    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`${API_BASE}/universities/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const result = await res.json();
        if (!res.ok) {
            alert(`Error: ${result.error || 'Failed to delete institution'}`);
            return;
        }

        // If the deleted institution was in activeUniversities filter, remove it
        if (activeUniversities.has(name)) {
            activeUniversities.delete(name);
        }

        await loadInstitutionsTable();
        await reloadTagsAndFilters();
    } catch (err) {
        alert(`Delete failed: ${err.message}`);
    }
}

async function autoDetectCoordinates() {
    const name = document.getElementById('uni-form-name').value.trim();
    const country = document.getElementById('uni-form-country').value.trim();
    const detectBtn = document.getElementById('uni-detect-coord-btn');

    if (!name) {
        alert('Please enter an institution name first to look up coordinates.');
        return;
    }

    if (detectBtn) {
        detectBtn.disabled = true;
        detectBtn.innerText = '⌛ Searching...';
    }

    try {
        let query = `${name} ${country}`.trim();
        let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
        let res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        let data = await res.json();

        if (!data || data.length === 0) {
            url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}&limit=1`;
            res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            data = await res.json();
        }

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat).toFixed(4);
            const lon = parseFloat(data[0].lon).toFixed(4);
            document.getElementById('uni-form-lat').value = lat;
            document.getElementById('uni-form-lon').value = lon;
            
            if (!country && data[0].display_name) {
                const parts = data[0].display_name.split(',');
                const detectedCountry = parts[parts.length - 1].trim();
                if (detectedCountry) {
                    document.getElementById('uni-form-country').value = detectedCountry;
                }
            }
        } else {
            alert(`Could not automatically find coordinates for "${name}". You can enter latitude and longitude manually.`);
        }
    } catch (err) {
        alert(`Geocoding lookup failed: ${err.message}. You can enter coordinates manually.`);
    } finally {
        if (detectBtn) {
            detectBtn.disabled = false;
            detectBtn.innerText = '🌐 Auto-Detect';
        }
    }
}

function flyToInstitutionFromModal(lat, lon, name) {
    closeInstitutionModal();
    if (!mapVisible) {
        toggleMap(true);
    }
    setTimeout(() => {
        flyToUniversity(name, lat, lon);
    }, 300);
}

async function reloadTagsAndFilters() {
    try {
        const res = await fetch(`${API_BASE}/tags`);
        if (!res.ok) return;
        const data = await res.json();
        
        // Re-build sidebar university list preserving selected filters
        buildFilters(data.methods, data.domains, data.universities, data.statuses);
        
        // Re-fetch universities for the researcher editor dropdown
        await fetchUniversities();
        
        // Re-render cards and map markers
        requestRender();
    } catch (err) {
        console.error("Failed to reload tags and filters:", err);
    }
}
