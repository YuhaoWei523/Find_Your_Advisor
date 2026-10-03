// ==========================================
// Find Your Advisor - Academic Programs Management
// Enhanced with Multi-Dimensional Filters & International Fee Waiver Callouts
// ==========================================

const API_BASE = (window.location.protocol.startsWith('http')) 
    ? (window.location.origin + '/api') 
    : 'http://127.0.0.1:5000/api';

let allPrograms = [];
let allUniversities = [];
let currentViewMode = 'cards'; // 'cards' | 'table'

// Active Filter State
let selectedWaiver = '';
let selectedDiscipline = '';
let selectedRating = ''; // '' | '5' | '4' | '3' | '2' | '1' | 'unrated'
let selectedUniversity = ''; // '' or specific university name
let selectedDifficulty = ''; // '' | 'Reach' | 'Target' | 'Safety' | 'unassigned'

// Status definitions and color themes
const STATUS_CONFIG = {
    'Considering': { color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', label: '💡 Considering' },
    'Preparing Materials': { color: '#b45309', bg: '#fef3c7', border: '#fde68a', label: '📝 Preparing Materials' },
    'Submitted': { color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd', label: '🚀 Submitted' },
    'Interviewing': { color: '#6d28d9', bg: '#ede9fe', border: '#ddd6fe', label: '🎤 Interviewing' },
    'Accepted / Offer': { color: '#15803d', bg: '#dcfce7', border: '#86efac', label: '🏆 Accepted / Offer' },
    'Waitlisted': { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', label: '⏳ Waitlisted' },
    'Rejected': { color: '#991b1b', bg: '#fee2e2', border: '#fecaca', label: '❌ Rejected' }
};

// Difficulty Tier definitions and color themes (5 granular tiers + custom)
const DIFFICULTY_CONFIG = {
    'Super Reach': { color: '#991b1b', bg: '#fee2e2', border: '#fca5a5', badgeClass: 'tier-super-reach', label: '🔴 Super Reach (极限冲刺)' },
    'High Reach': { color: '#c2410c', bg: '#ffedd5', border: '#fdba74', badgeClass: 'tier-high-reach', label: '🟠 High Reach (重点冲刺)' },
    'Hard Target': { color: '#b45309', bg: '#fef3c7', border: '#fcd34d', badgeClass: 'tier-hard-target', label: '🟡 Hard Target (优势匹配)' },
    'Target': { color: '#15803d', bg: '#dcfce7', border: '#86efac', badgeClass: 'tier-target', label: '🟢 Target (稳妥匹配)' },
    'Safety': { color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', badgeClass: 'tier-safety', label: '🔵 Safety (稳健保底)' },
    '': { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', badgeClass: 'unassigned', label: '⚪ Unassigned' }
};

function getDifficultyMeta(tier) {
    if (!tier) return DIFFICULTY_CONFIG[''];
    if (DIFFICULTY_CONFIG[tier]) return DIFFICULTY_CONFIG[tier];
    const lower = String(tier).toLowerCase().trim();
    if (lower === 'super reach' || lower === 'reach') return DIFFICULTY_CONFIG['Super Reach'];
    if (lower === 'high reach') return DIFFICULTY_CONFIG['High Reach'];
    if (lower === 'hard target') return DIFFICULTY_CONFIG['Hard Target'];
    if (lower === 'target') return DIFFICULTY_CONFIG['Target'];
    if (lower === 'safety') return DIFFICULTY_CONFIG['Safety'];
    if (lower === 'unassigned' || lower === '') return DIFFICULTY_CONFIG[''];

    return {
        color: '#6d28d9',
        bg: '#ede9fe',
        border: '#ddd6fe',
        badgeClass: 'tier-custom',
        label: `🟣 ${tier}`
    };
}

function renderDifficultySelectOptions(currentDiff) {
    const stdTiers = [
        { val: 'Super Reach', label: '🔴 Super Reach' },
        { val: 'High Reach', label: '🟠 High Reach' },
        { val: 'Hard Target', label: '🟡 Hard Target' },
        { val: 'Target', label: '🟢 Target' },
        { val: 'Safety', label: '🔵 Safety' }
    ];
    let html = `<option value="" ${!currentDiff ? 'selected' : ''}>⚪ Unassigned</option>`;
    let matched = !currentDiff;

    stdTiers.forEach(t => {
        const isSel = (currentDiff && currentDiff.toLowerCase() === t.val.toLowerCase());
        if (isSel) matched = true;
        html += `<option value="${t.val}" ${isSel ? 'selected' : ''}>${t.label}</option>`;
    });

    if (currentDiff && !matched) {
        html += `<option value="${escapeHtml(currentDiff)}" selected>🟣 ${escapeHtml(currentDiff)}</option>`;
    }
    html += `<option value="__custom__">➕ Custom Tier...</option>`;
    return html;
}

// URL Sanitization: strip accidental trailing brackets, parentheses, or punctuation
function sanitizeUrl(url) {
    if (!url) return '';
    let clean = String(url).trim();
    clean = clean.replace(/[\]\)\>\.\,\;\'\"]+$/, '');
    return clean;
}

// Robust deadline parser: extracts first YYYY-MM-DD pattern
function parseProgramDeadline(deadlineStr) {
    if (!deadlineStr) return null;
    const match = deadlineStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Adapt back link if opened as file://
    const backLink = document.getElementById('link-advisors');
    if (backLink && window.location.protocol === 'file:') {
        backLink.href = (window.location.href.includes('NeuroAI') || !window.location.href.includes('Find_Your_Advisor')) 
            ? 'NeuroAI_Database.html' 
            : 'index.html';
    }

    setupEventListeners();
    initSidebarResizer();
    await Promise.all([loadUniversities(), loadPrograms()]);

    // Check URL parameters for deep-linking
    const urlParams = new URLSearchParams(window.location.search);
    const uniParam = urlParams.get('uni') || urlParams.get('institute');
    const ratingParam = urlParams.get('rating');
    const searchParam = urlParams.get('search');
    const degreeParam = urlParams.get('degree');
    const statusParam = urlParams.get('status');
    const waiverParam = urlParams.get('waiver');
    const discParam = urlParams.get('discipline');
    const diffParam = urlParams.get('difficulty') || urlParams.get('tier');

    if (uniParam) {
        selectUniversityFilter(uniParam);
    }
    if (ratingParam) {
        selectRatingFilter(ratingParam);
    }
    if (diffParam) {
        selectDifficultyFilter(diffParam);
    }
    if (searchParam) {
        const searchInput = document.getElementById('search-program-input');
        if (searchInput) searchInput.value = searchParam;
    }
    if (statusParam) {
        const statEl = document.getElementById('filter-status');
        if (statEl) statEl.value = statusParam;
    }
    if (waiverParam) {
        selectWaiverFilter(waiverParam);
    }
    if (discParam) {
        selectDisciplineFilter(discParam);
    }

    if (uniParam || ratingParam || diffParam || searchParam || statusParam || waiverParam || discParam) {
        renderPrograms();
    }
});

function setupEventListeners() {
    const searchInput = document.getElementById('search-program-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderPrograms());
    }

    ['filter-master-req', 'filter-language-type', 'filter-letters-count', 'filter-deadline', 'filter-country', 'filter-status', 'sort-programs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => renderPrograms());
    });
}

// --- Draggable Resizable Sidebar with Persistence ---
function initSidebarResizer() {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebar-resizer');
    if (!sidebar || !resizer) return;

    const STORAGE_KEY = 'programs_sidebar_width';
    const DEFAULT_WIDTH = 330;
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
    };

    // Double-click on handle resets to default width
    resizer.addEventListener('dblclick', () => {
        sidebar.style.width = `${DEFAULT_WIDTH}px`;
        try {
            localStorage.setItem(STORAGE_KEY, DEFAULT_WIDTH);
        } catch (_) {}
    });

    resizer.addEventListener('pointerdown', onPointerDown);
}

// --- Data Fetching ---
async function loadUniversities() {
    try {
        const res = await fetch(`${API_BASE}/universities`);
        if (!res.ok) throw new Error("Failed to load universities");
        allUniversities = await res.json();
        
        populateUniversityOptions();
        populateCountryFilter();
    } catch (err) {
        console.error("Error loading universities:", err);
    }
}

async function loadPrograms() {
    const cardsContainer = document.getElementById('programs-cards-container');
    const tableBody = document.getElementById('programs-table-body');
    if (cardsContainer) cardsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#64748b;">⏳ Loading programs...</div>';
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 40px; color:#64748b;">⏳ Loading programs...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/programs`);
        if (!res.ok) throw new Error("Failed to load programs");
        allPrograms = await res.json();
        
        updateMetricsBanner();
        updateSidebarFilterCounts();
        populateSidebarUniversities();
        renderPrograms();
    } catch (err) {
        console.error("Error loading programs:", err);
        const errMsg = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#ef4444;">Error loading programs: ${err.message}</div>`;
        if (cardsContainer) cardsContainer.innerHTML = errMsg;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 40px; color:#ef4444;">Error loading programs: ${err.message}</td></tr>`;
    }
}

function populateUniversityOptions() {
    const select = document.getElementById('prog-university');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select University / Institution * --</option>';
    
    const sorted = [...allUniversities].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    sorted.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.innerText = `${u.name} (${u.country || 'USA'})`;
        select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
}

function populateCountryFilter() {
    const countryFilter = document.getElementById('filter-country');
    if (!countryFilter) return;
    const countries = new Set();
    allUniversities.forEach(u => {
        if (u.country) countries.add(u.country);
    });
    const sortedCountries = [...countries].sort();
    
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    sortedCountries.forEach(c => {
        countryFilter.innerHTML += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
    });
}

// --- Sidebar Filter Selection Handlers ---
function selectRatingFilter(val) {
    selectedRating = val;
    document.querySelectorAll('[id^="rating-pill-"]').forEach(el => el.classList.remove('active'));
    if (!val) {
        document.getElementById('rating-pill-all')?.classList.add('active');
    } else if (val === '5') {
        document.getElementById('rating-pill-5')?.classList.add('active');
    } else if (val === '4' || val === '4+') {
        document.getElementById('rating-pill-4')?.classList.add('active');
    } else if (val === '3' || val === '3+') {
        document.getElementById('rating-pill-3')?.classList.add('active');
    } else if (val === '2') {
        document.getElementById('rating-pill-2')?.classList.add('active');
    } else if (val === '1') {
        document.getElementById('rating-pill-1')?.classList.add('active');
    } else if (val === 'unrated') {
        document.getElementById('rating-pill-unrated')?.classList.add('active');
    }
    renderPrograms();
}

function selectDifficultyFilter(tier) {
    selectedDifficulty = tier;
    document.querySelectorAll('[id^="diff-pill-"]').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.custom-diff-pill').forEach(el => el.classList.remove('active'));

    const lower = (tier || '').toLowerCase().trim();
    if (!tier) {
        document.getElementById('diff-pill-all')?.classList.add('active');
    } else if (lower === 'super reach' || lower === 'reach') {
        document.getElementById('diff-pill-super-reach')?.classList.add('active');
    } else if (lower === 'high reach') {
        document.getElementById('diff-pill-high-reach')?.classList.add('active');
    } else if (lower === 'hard target') {
        document.getElementById('diff-pill-hard-target')?.classList.add('active');
    } else if (lower === 'target') {
        document.getElementById('diff-pill-target')?.classList.add('active');
    } else if (lower === 'safety') {
        document.getElementById('diff-pill-safety')?.classList.add('active');
    } else if (lower === 'unassigned') {
        document.getElementById('diff-pill-unassigned')?.classList.add('active');
    } else {
        const customPill = document.querySelector(`.custom-diff-pill[data-tier="${escapeJs(tier)}"]`);
        if (customPill) customPill.classList.add('active');
    }
    renderPrograms();
}

async function quickUpdateProgramDifficulty(id, newDifficulty) {
    if (newDifficulty === '__custom__') {
        const customName = prompt("Enter custom difficulty tier name (e.g. Dream Tier, Top 10, Safety+):");
        if (!customName || !customName.trim()) {
            renderPrograms();
            return;
        }
        newDifficulty = customName.trim();
    }
    try {
        const prog = allPrograms.find(p => p.id === id);
        if (prog) prog.difficulty = newDifficulty;

        updateSidebarFilterCounts();
        renderPrograms();

        await fetch(`${API_BASE}/programs/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, difficulty: newDifficulty })
        });
    } catch (err) {
        console.error("Error updating program difficulty:", err);
    }
}

function handleModalDifficultyChange(selectEl) {
    if (!selectEl) return;
    if (selectEl.value === '__custom__') {
        const custom = prompt("Enter custom difficulty tier name (e.g. Dream Tier, Tier 1):");
        if (custom && custom.trim()) {
            const trimmed = custom.trim();
            let opt = Array.from(selectEl.options).find(o => o.value.toLowerCase() === trimmed.toLowerCase());
            if (!opt) {
                opt = document.createElement('option');
                opt.value = trimmed;
                opt.innerText = `🟣 ${trimmed}`;
                selectEl.insertBefore(opt, selectEl.lastElementChild);
            }
            selectEl.value = trimmed;
        } else {
            selectEl.value = '';
        }
    }
}

function selectUniversityFilter(uniName) {
    selectedUniversity = uniName;
    populateSidebarUniversities();
    renderPrograms();
}

function filterSidebarUniversities() {
    const q = (document.getElementById('filter-uni-search')?.value || '').toLowerCase().trim();
    const items = document.querySelectorAll('.uni-sidebar-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name') || '';
        item.style.display = (!q || name.includes(q)) ? 'flex' : 'none';
    });
}

function populateSidebarUniversities() {
    const container = document.getElementById('sidebar-uni-list');
    const badge = document.getElementById('uni-filter-count-badge');
    if (!container) return;

    const counts = {};
    allPrograms.forEach(p => {
        const u = p.university_name || 'Unknown University';
        counts[u] = (counts[u] || 0) + 1;
    });

    const uniNames = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    if (badge) badge.innerText = `${uniNames.length} total`;

    const totalPrograms = allPrograms.length;
    let html = `
        <div class="filter-pill ${!selectedUniversity ? 'active' : ''}" onclick="selectUniversityFilter('')" style="padding:6px 10px; font-size:0.82em; margin-bottom:2px;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">⚡ All Institutions</span>
            <span class="filter-pill-count">${totalPrograms}</span>
        </div>
    `;

    uniNames.forEach(name => {
        const isActive = (selectedUniversity && selectedUniversity.toLowerCase() === name.toLowerCase());
        html += `
            <div class="filter-pill uni-sidebar-item ${isActive ? 'active' : ''}" data-name="${escapeHtml(name.toLowerCase())}" onclick="selectUniversityFilter('${escapeJs(name)}')" style="padding:6px 10px; font-size:0.82em; margin-bottom:2px;" title="${escapeHtml(name)}">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:205px;">${escapeHtml(name)}</span>
                <span class="filter-pill-count">${counts[name]}</span>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Star Rating Rendering and Interactive Updates
function renderStarRating(ratingVal, progId) {
    let html = '';
    const r = ratingVal || 0;
    for (let i = 1; i <= 5; i++) {
        html += `<span class="star-rating-btn ${i <= r ? 'active' : ''}" data-prog-id="${progId}" data-val="${i}" onclick="event.stopPropagation(); setProgramRating(${progId}, ${i})">★</span>`;
    }
    return html;
}

async function setProgramRating(id, ratingVal) {
    try {
        const prog = allPrograms.find(p => p.id === id);
        if (prog) prog.rating = ratingVal;

        // Visual update in DOM
        const containers = document.querySelectorAll(`.star-rating[data-id="${id}"]`);
        containers.forEach(container => {
            const stars = container.querySelectorAll('.star-rating-btn');
            stars.forEach(s => {
                const val = parseInt(s.getAttribute('data-val'), 10);
                if (val <= ratingVal) s.classList.add('active');
                else s.classList.remove('active');
            });
        });

        updateSidebarFilterCounts();

        // Background update
        await fetch(`${API_BASE}/programs/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, rating: ratingVal })
        });
    } catch (err) {
        console.error("Error setting rating:", err);
    }
}

function selectWaiverFilter(waiverType) {
    selectedWaiver = waiverType;
    
    // Update pill styles
    document.querySelectorAll('[id^="waiver-pill-"]').forEach(el => el.classList.remove('active'));
    if (!waiverType) {
        document.getElementById('waiver-pill-all')?.classList.add('active');
    } else if (waiverType.includes('Free for All')) {
        document.getElementById('waiver-pill-free')?.classList.add('active');
    } else if (waiverType.includes('Virtual Info Session')) {
        document.getElementById('waiver-pill-session')?.classList.add('active');
    } else if (waiverType.includes('Financial Hardship')) {
        document.getElementById('waiver-pill-hardship')?.classList.add('active');
    } else if (waiverType.includes('Standard Paid')) {
        document.getElementById('waiver-pill-paid')?.classList.add('active');
    }
    
    renderPrograms();
}

function selectDisciplineFilter(disc) {
    selectedDiscipline = disc;
    
    document.querySelectorAll('[id^="disc-pill-"]').forEach(el => el.classList.remove('active'));
    if (!disc) {
        document.getElementById('disc-pill-all')?.classList.add('active');
    } else if (disc.includes('Neuro')) {
        document.getElementById('disc-pill-neuro')?.classList.add('active');
    } else if (disc.includes('BME') || disc.includes('Biomedical')) {
        document.getElementById('disc-pill-bme')?.classList.add('active');
    } else if (disc.includes('Bioengineering')) {
        document.getElementById('disc-pill-bioe')?.classList.add('active');
    } else if (disc.includes('ECE') || disc.includes('Electrical')) {
        document.getElementById('disc-pill-ece')?.classList.add('active');
    } else if (disc.includes('Psych') || disc.includes('Cognitive')) {
        document.getElementById('disc-pill-psych')?.classList.add('active');
    } else if (disc.includes('Comp') || disc.includes('Bioinformatics')) {
        document.getElementById('disc-pill-compbio')?.classList.add('active');
    } else if (disc.includes('Biological')) {
        document.getElementById('disc-pill-biosci')?.classList.add('active');
    } else if (disc.includes('Machine Learning') || disc.includes('AI')) {
        document.getElementById('disc-pill-ai')?.classList.add('active');
    }
    
    renderPrograms();
}

function resetAllFilters() {
    selectedWaiver = '';
    selectedDiscipline = '';
    selectedRating = '';
    selectedUniversity = '';
    selectedDifficulty = '';

    document.querySelectorAll('[id^="rating-pill-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('rating-pill-all')?.classList.add('active');

    document.querySelectorAll('[id^="diff-pill-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('diff-pill-all')?.classList.add('active');

    document.querySelectorAll('[id^="waiver-pill-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('waiver-pill-all')?.classList.add('active');

    document.querySelectorAll('[id^="disc-pill-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('disc-pill-all')?.classList.add('active');

    const searchInput = document.getElementById('search-program-input');
    if (searchInput) searchInput.value = '';

    const uniSearchInput = document.getElementById('filter-uni-search');
    if (uniSearchInput) uniSearchInput.value = '';

    ['filter-master-req', 'filter-language-type', 'filter-letters-count', 'filter-deadline', 'filter-country', 'filter-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const sortEl = document.getElementById('sort-programs');
    if (sortEl) sortEl.value = 'rating_desc';

    populateSidebarUniversities();
    renderPrograms();
}

// --- Live Sidebar Filter Counts ---
function updateSidebarFilterCounts() {
    const total = allPrograms.length;
    
    const setBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.innerText = count;
    };

    // Priority Rating Counts
    setBadge('count-rating-all', total);
    setBadge('count-rating-5', allPrograms.filter(p => (p.rating || 0) === 5).length);
    setBadge('count-rating-4', allPrograms.filter(p => (p.rating || 0) === 4).length);
    setBadge('count-rating-3', allPrograms.filter(p => (p.rating || 0) === 3).length);
    setBadge('count-rating-2', allPrograms.filter(p => (p.rating || 0) === 2).length);
    setBadge('count-rating-1', allPrograms.filter(p => (p.rating || 0) === 1).length);
    setBadge('count-rating-unrated', allPrograms.filter(p => !p.rating || p.rating === 0).length);

    // Difficulty Tier Counts (5 granular tiers + custom)
    setBadge('count-diff-all', total);
    setBadge('count-diff-super-reach', allPrograms.filter(p => {
        const d = (p.difficulty || '').toLowerCase().trim();
        return d === 'super reach' || d === 'reach';
    }).length);
    setBadge('count-diff-high-reach', allPrograms.filter(p => (p.difficulty || '').toLowerCase().trim() === 'high reach').length);
    setBadge('count-diff-hard-target', allPrograms.filter(p => (p.difficulty || '').toLowerCase().trim() === 'hard target').length);
    setBadge('count-diff-target', allPrograms.filter(p => (p.difficulty || '').toLowerCase().trim() === 'target').length);
    setBadge('count-diff-safety', allPrograms.filter(p => (p.difficulty || '').toLowerCase().trim() === 'safety').length);
    setBadge('count-diff-unassigned', allPrograms.filter(p => {
        const d = (p.difficulty || '').toLowerCase().trim();
        return !d || d === 'unassigned';
    }).length);

    // Dynamic Custom Tiers in Sidebar
    const customListEl = document.getElementById('sidebar-custom-diff-list');
    if (customListEl) {
        const standardSet = new Set(['super reach', 'reach', 'high reach', 'hard target', 'target', 'safety', 'unassigned', '']);
        const customCounts = {};
        allPrograms.forEach(p => {
            const raw = (p.difficulty || '').trim();
            if (raw && !standardSet.has(raw.toLowerCase())) {
                customCounts[raw] = (customCounts[raw] || 0) + 1;
            }
        });
        const customTiers = Object.keys(customCounts).sort((a, b) => a.localeCompare(b));
        if (customTiers.length === 0) {
            customListEl.innerHTML = '';
        } else {
            customListEl.innerHTML = customTiers.map(t => {
                const isActive = (selectedDifficulty && selectedDifficulty.toLowerCase().trim() === t.toLowerCase());
                return `
                    <div class="filter-pill custom-diff-pill ${isActive ? 'active tier-custom' : ''}" data-tier="${escapeHtml(t)}" onclick="selectDifficultyFilter('${escapeJs(t)}')">
                        <span>🟣 ${escapeHtml(t)}</span>
                        <span class="filter-pill-count">${customCounts[t]}</span>
                    </div>
                `;
            }).join('');
        }
    }

    setBadge('count-waiver-all', total);
    setBadge('count-waiver-free', allPrograms.filter(p => (p.intl_waiver_type || '').includes('Free for All')).length);
    setBadge('count-waiver-session', allPrograms.filter(p => (p.intl_waiver_type || '').includes('Virtual Info Session')).length);
    setBadge('count-waiver-hardship', allPrograms.filter(p => (p.intl_waiver_type || '').includes('Financial Hardship')).length);
    setBadge('count-waiver-paid', allPrograms.filter(p => (p.intl_waiver_type || '').includes('Standard Paid')).length);

    setBadge('count-disc-all', total);
    setBadge('count-disc-neuro', allPrograms.filter(p => (p.discipline_tag || '').includes('Neuro')).length);
    setBadge('count-disc-bme', allPrograms.filter(p => (p.discipline_tag || '').includes('Biomedical Engineering') || (p.discipline_tag || '').includes('BME')).length);
    setBadge('count-disc-bioe', allPrograms.filter(p => (p.discipline_tag || '').includes('Bioengineering')).length);
    setBadge('count-disc-ece', allPrograms.filter(p => (p.discipline_tag || '').includes('ECE') || (p.discipline_tag || '').includes('Electrical')).length);
    setBadge('count-disc-psych', allPrograms.filter(p => (p.discipline_tag || '').includes('Psych') || (p.discipline_tag || '').includes('Cognitive')).length);
    setBadge('count-disc-compbio', allPrograms.filter(p => (p.discipline_tag || '').includes('Comp') || (p.discipline_tag || '').includes('Bioinformatics')).length);
    setBadge('count-disc-biosci', allPrograms.filter(p => (p.discipline_tag || '').includes('Biological Sciences')).length);
    setBadge('count-disc-ai', allPrograms.filter(p => (p.discipline_tag || '').includes('Machine Learning') || (p.discipline_tag || '').includes('AI')).length);
}

// --- Metrics & Upcoming Deadline Banner ---
function updateMetricsBanner() {
    const totalEl = document.getElementById('metric-total-count');
    const deadlineAlertEl = document.getElementById('metric-deadline-alert');
    const pipelineCountsEl = document.getElementById('metric-pipeline-counts');

    if (totalEl) {
        totalEl.innerText = `${allPrograms.length} Tracked Programs`;
    }

    const statusCounts = {};
    Object.keys(STATUS_CONFIG).forEach(k => statusCounts[k] = 0);
    allPrograms.forEach(p => {
        const s = p.status || 'Considering';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    if (pipelineCountsEl) {
        pipelineCountsEl.innerHTML = `
            <span class="pipeline-pill" style="background:#f1f5f9; color:#475569;" title="Considering">💡 Considering: <strong>${statusCounts['Considering'] || 0}</strong></span>
            <span class="pipeline-pill" style="background:#fef3c7; color:#b45309;" title="Preparing Materials">📝 Preparing: <strong>${statusCounts['Preparing Materials'] || 0}</strong></span>
            <span class="pipeline-pill" style="background:#e0f2fe; color:#0369a1;" title="Submitted">🚀 Submitted: <strong>${statusCounts['Submitted'] || 0}</strong></span>
            <span class="pipeline-pill" style="background:#ede9fe; color:#6d28d9;" title="Interviewing">🎤 Interviewing: <strong>${statusCounts['Interviewing'] || 0}</strong></span>
            <span class="pipeline-pill" style="background:#dcfce7; color:#15803d;" title="Accepted / Offer">🏆 Offers: <strong>${statusCounts['Accepted / Offer'] || 0}</strong></span>
        `;
    }

    if (deadlineAlertEl) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = allPrograms
            .map(p => {
                const d = parseProgramDeadline(p.deadline);
                if (!d) return null;
                const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                return { program: p, date: d, diffDays };
            })
            .filter(item => item && item.diffDays >= 0)
            .sort((a, b) => a.diffDays - b.diffDays);

        if (upcoming.length > 0) {
            const nearest = upcoming[0];
            const badgeClass = nearest.diffDays <= 7 ? 'danger' : (nearest.diffDays <= 30 ? 'warning' : 'info');
            deadlineAlertEl.innerHTML = `
                <div class="deadline-highlight-box ${badgeClass}">
                    <span>⏰ Nearest Deadline: <strong>${escapeHtml(nearest.program.university_name || 'University')}</strong> — ${escapeHtml(nearest.program.name)}</span>
                    <span class="countdown-badge">${nearest.diffDays === 0 ? 'Today!' : (nearest.diffDays === 1 ? 'Tomorrow!' : `${nearest.diffDays} days left (${nearest.program.deadline})`)}</span>
                </div>
            `;
        } else {
            deadlineAlertEl.innerHTML = `
                <div class="deadline-highlight-box info">
                    <span>📅 No pending deadlines within range. Keep up the great research!</span>
                </div>
            `;
        }
    }
}

// --- Active Filter Chips Rendering ---
function renderActiveChips() {
    const chipsContainer = document.getElementById('active-chips-container');
    if (!chipsContainer) return;

    const chips = [];

    if (selectedRating) {
        let label = '⭐ Priority: ' + selectedRating;
        if (selectedRating === '5') label = '⭐⭐⭐⭐⭐ 5 Stars';
        else if (selectedRating === '4' || selectedRating === '4+') label = '⭐⭐⭐⭐ 4 Stars';
        else if (selectedRating === '3' || selectedRating === '3+') label = '⭐⭐⭐ 3 Stars';
        else if (selectedRating === '2') label = '⭐⭐ 2 Stars';
        else if (selectedRating === '1') label = '⭐ 1 Star';
        else if (selectedRating === 'unrated') label = '⚪ Unrated';
        chips.push({ label, onRemove: "selectRatingFilter('')" });
    }

    if (selectedDifficulty) {
        let label = '🎯 Difficulty: ' + selectedDifficulty;
        const low = selectedDifficulty.toLowerCase().trim();
        if (low === 'super reach' || low === 'reach') label = '🎯 🔴 Super Reach (极限冲刺)';
        else if (low === 'high reach') label = '🎯 🟠 High Reach (重点冲刺)';
        else if (low === 'hard target') label = '🎯 🟡 Hard Target (优势匹配)';
        else if (low === 'target') label = '🎯 🟢 Target (稳妥匹配)';
        else if (low === 'safety') label = '🎯 🔵 Safety (稳健保底)';
        else if (low === 'unassigned') label = '🎯 ⚪ Unassigned (未分级)';
        else label = `🎯 🟣 ${selectedDifficulty}`;
        chips.push({ label, onRemove: "selectDifficultyFilter('')" });
    }

    if (selectedUniversity) {
        chips.push({ label: `🏛️ ${selectedUniversity}`, onRemove: "selectUniversityFilter('')" });
    }

    if (selectedWaiver) {
        let label = 'Waiver: ' + selectedWaiver;
        if (selectedWaiver.includes('Free for All')) label = '🎁 $0 Free Application';
        else if (selectedWaiver.includes('Virtual Info Session')) label = '🎟️ Info Session Free Code';
        else if (selectedWaiver.includes('Financial Hardship')) label = '🤝 Hardship Waiver';
        else if (selectedWaiver.includes('Standard Paid')) label = '💵 Standard Paid';
        chips.push({ label, onRemove: "selectWaiverFilter('')" });
    }

    if (selectedDiscipline) {
        chips.push({ label: `🔬 ${selectedDiscipline}`, onRemove: "selectDisciplineFilter('')" });
    }

    const masterVal = document.getElementById('filter-master-req')?.value;
    if (masterVal) {
        const label = masterVal === 'direct_bachelor' ? "🟢 Direct Bachelor's Eligible" : "🔴 Master's Required";
        chips.push({ label, onRemove: "document.getElementById('filter-master-req').value=''; renderPrograms();" });
    }

    const langVal = document.getElementById('filter-language-type')?.value;
    if (langVal) {
        const label = langVal === 'det_accepted' ? "🦉 Duolingo (DET) Accepted" : "🌐 TOEFL / IELTS Only";
        chips.push({ label, onRemove: "document.getElementById('filter-language-type').value=''; renderPrograms();" });
    }

    const lettersVal = document.getElementById('filter-letters-count')?.value;
    if (lettersVal) {
        const label = lettersVal === '2_letters' ? "✉️ 2 Letters of Rec" : "✉️ 3 Letters of Rec";
        chips.push({ label, onRemove: "document.getElementById('filter-letters-count').value=''; renderPrograms();" });
    }

    const deadlineVal = document.getElementById('filter-deadline')?.value;
    if (deadlineVal) {
        const dText = document.getElementById('filter-deadline')?.selectedOptions[0]?.text || deadlineVal;
        chips.push({ label: dText, onRemove: "document.getElementById('filter-deadline').value=''; renderPrograms();" });
    }

    const countryVal = document.getElementById('filter-country')?.value;
    if (countryVal) {
        chips.push({ label: `🏛️ ${countryVal}`, onRemove: "document.getElementById('filter-country').value=''; renderPrograms();" });
    }

    const statusVal = document.getElementById('filter-status')?.value;
    if (statusVal) {
        chips.push({ label: `📊 ${statusVal}`, onRemove: "document.getElementById('filter-status').value=''; renderPrograms();" });
    }

    if (chips.length === 0) {
        chipsContainer.innerHTML = '';
        return;
    }

    chipsContainer.innerHTML = chips.map(c => `
        <span class="chip">
            <span>${escapeHtml(c.label)}</span>
            <span class="chip-remove" onclick="${c.onRemove}">✕</span>
        </span>
    `).join('') + `
        <button class="sidebar-reset-btn" onclick="resetAllFilters()" style="font-size:0.8em; margin-left:4px;">Clear All</button>
    `;
}

// --- Filtering & Sorting Core Logic ---
function getFilteredPrograms() {
    const searchVal = (document.getElementById('search-program-input')?.value || '').trim().toLowerCase();
    const masterReqVal = document.getElementById('filter-master-req')?.value || '';
    const langTypeVal = document.getElementById('filter-language-type')?.value || '';
    const lettersCountVal = document.getElementById('filter-letters-count')?.value || '';
    const statusVal = document.getElementById('filter-status')?.value || '';
    const countryVal = document.getElementById('filter-country')?.value || '';
    const deadlineVal = document.getElementById('filter-deadline')?.value || '';
    const sortVal = document.getElementById('sort-programs')?.value || 'rating_desc';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = allPrograms.filter(p => {
        // Priority Rating filter
        if (selectedRating) {
            const r = p.rating || 0;
            if (selectedRating === 'unrated') {
                if (r !== 0) return false;
            } else if (selectedRating === '4+') {
                if (r < 4) return false;
            } else if (selectedRating === '3+') {
                if (r < 3) return false;
            } else {
                const targetR = parseInt(selectedRating, 10);
                if (r !== targetR) return false;
            }
        }

        // Difficulty Tier filter
        if (selectedDifficulty) {
            const pDiff = (p.difficulty || '').toLowerCase().trim();
            const targetDiff = selectedDifficulty.toLowerCase().trim();
            if (targetDiff === 'unassigned') {
                if (pDiff && pDiff !== 'unassigned') return false;
            } else if (targetDiff === 'super reach' || targetDiff === 'reach') {
                if (pDiff !== 'super reach' && pDiff !== 'reach') return false;
            } else {
                if (pDiff !== targetDiff) return false;
            }
        }

        // University / Institute filter
        if (selectedUniversity) {
            const selLower = selectedUniversity.toLowerCase();
            const pUni = (p.university_name || '').toLowerCase();
            if (pUni !== selLower && !pUni.includes(selLower) && !selLower.includes(pUni)) {
                return false;
            }
        }

        // Search filter across all fields
        if (searchVal) {
            const matchName = (p.name || '').toLowerCase().includes(searchVal);
            const matchUni = (p.university_name || '').toLowerCase().includes(searchVal);
            const matchDept = (p.department || '').toLowerCase().includes(searchVal);
            const matchNotes = (p.notes || '').toLowerCase().includes(searchVal);
            const matchFaculty = (p.faculty_match || '').toLowerCase().includes(searchVal);
            const matchEvent = (p.intl_waiver_event || '').toLowerCase().includes(searchVal);
            const matchDisc = (p.discipline_tag || '').toLowerCase().includes(searchVal);
            if (!matchName && !matchUni && !matchDept && !matchNotes && !matchFaculty && !matchEvent && !matchDisc) {
                return false;
            }
        }

        // Waiver pill filter
        if (selectedWaiver) {
            const pWaiver = p.intl_waiver_type || '';
            if (selectedWaiver.includes('Free for All') && !pWaiver.includes('Free for All')) return false;
            if (selectedWaiver.includes('Virtual Info Session') && !pWaiver.includes('Virtual Info Session')) return false;
            if (selectedWaiver.includes('Financial Hardship') && !pWaiver.includes('Financial Hardship')) return false;
            if (selectedWaiver.includes('Standard Paid') && !pWaiver.includes('Standard Paid')) return false;
        }

        // Discipline pill filter
        if (selectedDiscipline) {
            const pDisc = (p.discipline_tag || '').toLowerCase();
            const targetDisc = selectedDiscipline.toLowerCase();
            if (!pDisc.includes(targetDisc)) {
                // Check partial key matches
                if (targetDisc.includes('neuro') && !pDisc.includes('neuro')) return false;
                if (targetDisc.includes('bme') && !(pDisc.includes('bme') || pDisc.includes('biomedical'))) return false;
                if (targetDisc.includes('bioengineering') && !pDisc.includes('bioengineering')) return false;
                if (targetDisc.includes('ece') && !(pDisc.includes('ece') || pDisc.includes('electrical'))) return false;
                if (targetDisc.includes('psych') && !(pDisc.includes('psych') || pDisc.includes('cog'))) return false;
                if (targetDisc.includes('comp') && !(pDisc.includes('comp') || pDisc.includes('bioinformatics'))) return false;
                if (targetDisc.includes('biological') && !pDisc.includes('biological')) return false;
                if (targetDisc.includes('ai') && !(pDisc.includes('machine learning') || pDisc.includes('ai'))) return false;
            }
        }

        // Master requirement filter
        if (masterReqVal) {
            const pReq = (p.requires_master || '').toLowerCase();
            if (masterReqVal === 'direct_bachelor') {
                if (pReq.includes('yes') && !pReq.includes('no')) return false;
            } else if (masterReqVal === 'master_required') {
                if (!pReq.includes('yes') && !pReq.includes('master\'s degree required') && !pReq.includes('preferred')) return false;
            }
        }

        // Language requirement filter (DET vs TOEFL)
        if (langTypeVal) {
            const pLang = (p.toefl_det || p.english_requirement || '').toLowerCase();
            const detAccepted = pLang.includes('det: accepted') || pLang.includes('det accepted') || (pLang.includes('det') && !pLang.includes('not accepted'));
            if (langTypeVal === 'det_accepted' && !detAccepted) return false;
            if (langTypeVal === 'toefl_only' && detAccepted) return false;
        }

        // Letters of rec filter
        if (lettersCountVal) {
            const pLetters = (p.letters_of_rec || '').toLowerCase();
            if (lettersCountVal === '2_letters' && !pLetters.includes('2')) return false;
            if (lettersCountVal === '3_letters' && !pLetters.includes('3')) return false;
        }

        // Status filter
        if (statusVal && (p.status || 'Considering') !== statusVal) return false;

        // Country filter
        if (countryVal && p.university_country !== countryVal) return false;

        // Deadline filter
        if (deadlineVal) {
            if (!p.deadline) return false;
            const d = parseProgramDeadline(p.deadline);
            if (!d) {
                if (deadlineVal !== 'future') return false;
            } else {
                const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                if (deadlineVal === 'upcoming_30' && (diffDays < 0 || diffDays > 30)) return false;
                if (deadlineVal === 'upcoming_60' && (diffDays < 0 || diffDays > 60)) return false;
                if (deadlineVal === 'dec_1' && !p.deadline.includes('-12-01')) return false;
                if (deadlineVal === 'dec_15' && !p.deadline.includes('-12-15')) return false;
                if (deadlineVal === 'jan' && (!p.deadline.includes('-01-') && !p.deadline.includes('-01/'))) return false;
                if (deadlineVal === 'future' && diffDays <= 60) return false;
                if (deadlineVal === 'passed' && diffDays >= 0) return false;
            }
        }

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortVal === 'rating_desc') {
            const rA = a.rating || 0;
            const rB = b.rating || 0;
            if (rB !== rA) return rB - rA;
            const dA = parseProgramDeadline(a.deadline);
            const dB = parseProgramDeadline(b.deadline);
            if (!dA && !dB) return 0;
            if (!dA) return 1;
            if (!dB) return -1;
            return dA - dB;
        } else if (sortVal === 'diff_reach') {
            const tierOrder = {
                'super reach': 1,
                'reach': 1,
                'high reach': 2,
                'hard target': 3,
                'target': 4,
                'safety': 5,
                '': 7
            };
            const getOrder = (diff) => {
                const d = (diff || '').toLowerCase().trim();
                if (tierOrder[d] !== undefined) return tierOrder[d];
                return 6;
            };
            const ordA = getOrder(a.difficulty);
            const ordB = getOrder(b.difficulty);
            if (ordA !== ordB) return ordA - ordB;
            const rA = a.rating || 0;
            const rB = b.rating || 0;
            return rB - rA;
        } else if (sortVal === 'diff_safety') {
            const tierOrder = {
                'safety': 1,
                'target': 2,
                'hard target': 3,
                'high reach': 4,
                'super reach': 5,
                'reach': 5,
                '': 7
            };
            const getOrder = (diff) => {
                const d = (diff || '').toLowerCase().trim();
                if (tierOrder[d] !== undefined) return tierOrder[d];
                return 6;
            };
            const ordA = getOrder(a.difficulty);
            const ordB = getOrder(b.difficulty);
            if (ordA !== ordB) return ordA - ordB;
            const rA = a.rating || 0;
            const rB = b.rating || 0;
            return rB - rA;
        } else if (sortVal === 'waiver_priority') {
            const getPriority = (item) => {
                const w = item.intl_waiver_type || '';
                if (w.includes('Free for All')) return 1;
                if (w.includes('Virtual Info Session')) return 2;
                if (w.includes('Financial Hardship')) return 3;
                return 4;
            };
            const pA = getPriority(a);
            const pB = getPriority(b);
            if (pA !== pB) return pA - pB;
            const dA = parseProgramDeadline(a.deadline);
            const dB = parseProgramDeadline(b.deadline);
            if (!dA && !dB) return 0;
            if (!dA) return 1;
            if (!dB) return -1;
            return dA - dB;
        } else if (sortVal === 'deadline_asc') {
            const dA = parseProgramDeadline(a.deadline);
            const dB = parseProgramDeadline(b.deadline);
            if (!dA && !dB) return 0;
            if (!dA) return 1;
            if (!dB) return -1;
            return dA - dB;
        } else if (sortVal === 'deadline_desc') {
            const dA = parseProgramDeadline(a.deadline);
            const dB = parseProgramDeadline(b.deadline);
            if (!dA && !dB) return 0;
            if (!dA) return 1;
            if (!dB) return -1;
            return dB - dA;
        } else if (sortVal === 'uni_asc') {
            return (a.university_name || '').localeCompare(b.university_name || '');
        } else if (sortVal === 'name_asc') {
            return (a.name || '').localeCompare(b.name || '');
        } else if (sortVal === 'status') {
            return (a.status || '').localeCompare(b.status || '');
        }
        return 0;
    });

    return filtered;
}

function renderPrograms() {
    const filtered = getFilteredPrograms();
    const countBadge = document.getElementById('programs-count-badge');
    if (countBadge) {
        countBadge.innerText = `${filtered.length} of ${allPrograms.length} programs`;
    }

    renderActiveChips();

    if (currentViewMode === 'cards') {
        renderCardsView(filtered);
    } else {
        renderTableView(filtered);
    }
}

// --- Render Cards View ---
function renderCardsView(programs) {
    const container = document.getElementById('programs-cards-container');
    const tableContainer = document.getElementById('programs-table-container');
    if (container) container.style.display = 'grid';
    if (tableContainer) tableContainer.style.display = 'none';

    if (!container) return;

    if (programs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding: 60px 20px; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">
                <div style="font-size: 2.5em; margin-bottom: 12px;">🎓</div>
                <h3 style="margin: 0 0 8px 0; color: #1e293b;">No matching programs found</h3>
                <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9em;">Try adjusting your filters or resetting all filters.</p>
                <button class="btn btn-primary" onclick="resetAllFilters()">Reset All Filters</button>
            </div>
        `;
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    container.innerHTML = programs.map(p => {
        const statusKey = p.status || 'Considering';
        const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG['Considering'];

        // Deadline computation
        let deadlineHtml = '<span style="color:#94a3b8; font-style:italic;">No deadline set</span>';
        let isUrgent = false;
        if (p.deadline) {
            const d = parseProgramDeadline(p.deadline);
            if (d) {
                const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    deadlineHtml = `<span style="color:#991b1b; font-weight:600;">📅 ${escapeHtml(p.deadline)} (Passed)</span>`;
                } else if (diffDays === 0) {
                    deadlineHtml = `<span style="color:#dc2626; font-weight:700; animation: pulse 1.5s infinite;">📅 ${escapeHtml(p.deadline)} · Today!</span>`;
                    isUrgent = true;
                } else if (diffDays <= 7) {
                    deadlineHtml = `<span style="color:#dc2626; font-weight:700;">📅 ${escapeHtml(p.deadline)} · ${diffDays} days left</span>`;
                    isUrgent = true;
                } else if (diffDays <= 30) {
                    deadlineHtml = `<span style="color:#d97706; font-weight:600;">📅 ${escapeHtml(p.deadline)} · ${diffDays} days left</span>`;
                } else {
                    deadlineHtml = `<span style="color:#15803d; font-weight:600;">📅 ${escapeHtml(p.deadline)} · ${diffDays} days left</span>`;
                }
            } else {
                deadlineHtml = `<span style="color:#475569; font-weight:600;">📅 ${escapeHtml(p.deadline)}</span>`;
            }
        }

        // Degree styling
        let degreeBadgeStyle = 'background: #e0e7ff; color: #3730a3;';
        if (p.degree === "Master's") degreeBadgeStyle = 'background: #ccfbf1; color: #115e59;';
        else if (p.degree === 'Postdoc') degreeBadgeStyle = 'background: #fef3c7; color: #92400e;';
        else if (p.degree === 'Fellowship') degreeBadgeStyle = 'background: #fce7f3; color: #9d174d;';

        // Discipline tags rendering
        let disciplinePillsHtml = '';
        if (p.discipline_tag) {
            const tags = p.discipline_tag.split(',').map(t => t.trim()).filter(t => t);
            disciplinePillsHtml = tags.map(tag => {
                let cls = 'disc-neuro';
                const lower = tag.toLowerCase();
                if (lower.includes('bme') || lower.includes('biomedical')) cls = 'disc-bme';
                else if (lower.includes('bioengineering')) cls = 'disc-bioe';
                else if (lower.includes('ece') || lower.includes('electrical')) cls = 'disc-ece';
                else if (lower.includes('psych') || lower.includes('cog')) cls = 'disc-psych';
                else if (lower.includes('comp') || lower.includes('bioinformatics')) cls = 'disc-compbio';
                else if (lower.includes('biological')) cls = 'disc-biosci';
                else if (lower.includes('machine learning') || lower.includes('ai')) cls = 'disc-ai';
                return `<span class="discipline-pill-tag ${cls}">${escapeHtml(tag)}</span>`;
            }).join('');
        }

        // Dedicated International Fee Waiver Callout
        let waiverCalloutHtml = '';
        const wType = p.intl_waiver_type || '';
        const cleanWaiverLink = sanitizeUrl(p.intl_waiver_link);
        if (wType.includes('Virtual Info Session')) {
            waiverCalloutHtml = `
                <div class="waiver-callout-card gold">
                    <div class="waiver-badge-header">
                        <span>🎟️ Virtual Info Session Free Waiver Code (Intl Eligible)</span>
                    </div>
                    <div class="waiver-event-title">
                        ${escapeHtml(p.intl_waiver_event || 'Attend virtual graduate showcase/webinar to receive free application fee waiver code.')}
                    </div>
                    ${cleanWaiverLink ? `
                        <div>
                            <a href="${escapeHtml(cleanWaiverLink)}" target="_blank" rel="noopener noreferrer" class="waiver-btn gold">
                                🔗 Register for Info Session / Get Code ↗
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (wType.includes('Free for All')) {
            waiverCalloutHtml = `
                <div class="waiver-callout-card green">
                    <div class="waiver-badge-header">
                        <span>🎁 100% Free Application ($0 Fee Worldwide)</span>
                    </div>
                    <div style="font-size:0.83em; color:#14532d;">
                        ${escapeHtml(p.fee_waiver_info || 'No application fee charged for international or domestic applicants.')}
                    </div>
                </div>
            `;
        } else if (wType.includes('Financial Hardship')) {
            waiverCalloutHtml = `
                <div class="waiver-callout-card blue">
                    <div class="waiver-badge-header">
                        <span>🤝 Financial Hardship Waiver (Intl Eligible)</span>
                    </div>
                    <div style="font-size:0.83em; color:#1e3a8a;">
                        ${escapeHtml(p.intl_waiver_event || p.fee_waiver_info || 'International applicants eligible to request fee waiver via application portal based on financial need.')}
                    </div>
                    ${cleanWaiverLink ? `
                        <div>
                            <a href="${escapeHtml(cleanWaiverLink)}" target="_blank" rel="noopener noreferrer" class="waiver-btn blue">
                                Request Fee Waiver ↗
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Faculty match tags
        let facultyPillsHtml = '';
        if (p.faculty_match) {
            const names = p.faculty_match.split(/[,;\n]/).map(n => n.trim()).filter(n => n);
            if (names.length > 0) {
                facultyPillsHtml = `
                    <div style="margin-top: 8px;">
                        <span style="font-size: 0.78em; color: #64748b; font-weight: 600;">Target Faculty:</span>
                        <div style="display:flex; flex-wrap:wrap; gap: 4px; margin-top: 4px;">
                            ${names.map(name => `<span style="background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; padding:2px 7px; border-radius:12px; font-size:0.75em; font-weight:600;">${escapeHtml(name)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        }

        // Affiliated PIs link
        const piCount = p.affiliated_pi_count || 0;
        const advisorPage = (window.location.protocol === 'file:' && (window.location.href.includes('NeuroAI') || !window.location.href.includes('Find_Your_Advisor'))) 
            ? 'NeuroAI_Database.html' 
            : 'index.html';
        const piLink = `${advisorPage}?uni=${encodeURIComponent(p.university_name || '')}`;

        // Parse international admissions source link
        let intlStatsHtml = '';
        if (p.intl_student_stats) {
            const parsedStats = renderStatsWithSource(p.intl_student_stats);
            intlStatsHtml = `
                <div style="background: #f0fdfa; border: 1px solid #ccfbf1; color: #0f766e; padding: 7px 10px; border-radius: 8px; font-size: 0.81em; margin-bottom: 12px; line-height: 1.4;">
                    🌍 <strong>Intl Admissions:</strong> ${parsedStats}
                </div>
            `;
        }

        const cleanPortalUrl = sanitizeUrl(p.portal_url);
        const diffKey = p.difficulty || '';
        const diffCfg = getDifficultyMeta(diffKey);
        const difficultyBadgeHtml = diffKey ? `<span class="tier-badge ${diffCfg.badgeClass}" onclick="event.stopPropagation(); quickPromptChangeDifficulty(${p.id}, '${escapeJs(diffKey)}')" style="cursor:pointer;" title="Click to change difficulty tier">${diffCfg.label}</span>` : '';

        return `
            <div class="program-card ${isUrgent ? 'urgent-border' : ''}" style="border-left: 5px solid ${statusCfg.color};">
                <!-- University & Degree & Priority Rating -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div style="flex: 1; min-width: 0; padding-right: 8px;">
                        <span style="font-weight: 700; color: #1e293b; font-size: 1.05em; display: flex; align-items: center; gap: 6px;">
                            🏛️ ${escapeHtml(p.university_name || 'Unknown University')}
                        </span>
                        <span style="font-size: 0.78em; color: #64748b; font-weight: 600;">${escapeHtml(p.university_country || 'USA')}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
                        <div style="display:flex; gap:4px; align-items:center;">
                            <span style="${degreeBadgeStyle} padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 0.75em; text-transform: uppercase;">
                                ${escapeHtml(p.degree || 'PhD')}
                            </span>
                            ${difficultyBadgeHtml}
                        </div>
                        <div class="star-rating" data-id="${p.id}" ondblclick="event.stopPropagation(); setProgramRating(${p.id}, 0)" title="Click star to rate priority (1-5). Double-click to clear.">
                            ${renderStarRating(p.rating || 0, p.id)}
                        </div>
                    </div>
                </div>

                <!-- Discipline Tags -->
                <div style="margin: 4px 0 8px 0;">
                    ${disciplinePillsHtml}
                </div>

                <!-- Program Name & Department -->
                <h3 style="margin: 0 0 3px 0; font-size: 1.15em; color: var(--primary); font-weight: 700; line-height: 1.3;">
                    ${escapeHtml(p.name)}
                </h3>
                <div style="font-size: 0.84em; color: #475569; margin-bottom: 10px; min-height: 1.2em;">
                    ${escapeHtml(p.department || 'Department not specified')}
                </div>

                <!-- Status & Difficulty Selectors -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
                    <div>
                        <select class="program-status-select" onchange="quickUpdateProgramStatus(${p.id}, this.value)" style="background: ${statusCfg.bg}; color: ${statusCfg.color}; border: 1px solid ${statusCfg.border}; padding: 5px 8px; font-size: 0.82em;">
                            ${Object.keys(STATUS_CONFIG).map(st => `
                                <option value="${st}" ${st === statusKey ? 'selected' : ''}>${STATUS_CONFIG[st].label}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div>
                        <select class="program-difficulty-select" onchange="quickUpdateProgramDifficulty(${p.id}, this.value)" style="background: ${diffCfg.bg}; color: ${diffCfg.color}; border: 1px solid ${diffCfg.border}; padding: 5px 8px; font-size: 0.82em;">
                            ${renderDifficultySelectOptions(diffKey)}
                        </select>
                    </div>
                </div>

                <!-- Dedicated Fee Waiver Alert Banner -->
                ${waiverCalloutHtml}

                <!-- Deadline Box -->
                <div style="background: #f8fafc; border: 1px solid #f1f5f9; padding: 7px 10px; border-radius: 8px; font-size: 0.84em; margin-bottom: 10px;">
                    ${deadlineHtml}
                </div>

                <!-- Key Requirements 4-Grid -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82em; margin-bottom: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div>
                        <span style="color:#64748b;">💵 Fee:</span> <strong>${escapeHtml(p.app_fee || 'Unspecified')}</strong>
                    </div>
                    <div>
                        <span style="color:#64748b;">✉️ Rec Letters:</span> <strong>${escapeHtml(p.letters_of_rec || '3 letters')}</strong>
                    </div>
                    <div>
                        <span style="color:#64748b;">🎓 Master's?:</span> <strong>${escapeHtml(p.requires_master || 'No (Bachelor\'s OK)')}</strong>
                    </div>
                    <div>
                        <span style="color:#64748b;">📝 GRE:</span> <strong>${escapeHtml(p.gre_requirement || 'Not Required')}</strong>
                    </div>
                    <div style="grid-column: 1/-1; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 2px;">
                        <span style="color:#64748b;">🌐 TOEFL / DET:</span> <strong>${escapeHtml(p.toefl_det || p.english_requirement || 'Unspecified')}</strong>
                    </div>
                </div>

                <!-- International Student Stats (with Source Link) -->
                ${intlStatsHtml}

                <!-- Affiliated PIs Link & Matched Faculty -->
                <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px dashed #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size: 0.82em; color: #475569;">
                            👥 <strong>${piCount}</strong> Affiliated PIs in database
                        </span>
                        <a href="${piLink}" class="btn btn-action" style="font-size: 0.75em; padding: 3px 8px; text-decoration:none;" title="View all PIs from this university">
                            View PIs →
                        </a>
                    </div>
                    ${facultyPillsHtml}
                </div>

                <!-- Notes snippet -->
                ${p.notes ? `
                    <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 8px; border-radius: 6px; font-size: 0.81em; margin-bottom: 12px; max-height: 80px; overflow-y: auto;">
                        <strong>📝 Strategy Notes:</strong> ${escapeHtml(p.notes)}
                    </div>
                ` : ''}

                <!-- Actions -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                    <div>
                        ${cleanPortalUrl ? `
                            <a href="${escapeHtml(cleanPortalUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-action" style="font-size: 0.8em; padding: 5px 10px; text-decoration:none;">
                                🔗 Portal
                            </a>
                        ` : '<span style="font-size:0.8em; color:#cbd5e1;">No portal link</span>'}
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="btn btn-action" onclick="openProgramModal(${p.id})" title="Edit program" style="padding: 5px 10px; font-size: 0.82em;">✏️ Edit</button>
                        <button class="btn btn-action" onclick="deleteProgram(${p.id}, '${escapeJs(p.name)}')" title="Delete program" style="padding: 5px 8px; font-size: 0.82em; color: var(--danger);">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// --- Render Table View ---
function renderTableView(programs) {
    const container = document.getElementById('programs-cards-container');
    const tableContainer = document.getElementById('programs-table-container');
    const tableBody = document.getElementById('programs-table-body');
    if (container) container.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';

    if (!tableBody) return;

    if (programs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 40px; color:#94a3b8;">No matching programs found.</td></tr>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tableBody.innerHTML = programs.map(p => {
        const statusKey = p.status || 'Considering';
        const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG['Considering'];
        const diffKey = p.difficulty || '';
        const diffCfg = getDifficultyMeta(diffKey);

        let deadlineText = p.deadline || '-';
        if (p.deadline) {
            const d = parseProgramDeadline(p.deadline);
            if (d) {
                const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) deadlineText += ' (Passed)';
                else if (diffDays === 0) deadlineText += ' (Today!)';
                else deadlineText += ` (${diffDays}d)`;
            }
        }

        // Waiver badge
        let waiverCol = '<span style="color:#94a3b8;">Standard Paid</span>';
        const wType = p.intl_waiver_type || '';
        const cleanWaiverLink = sanitizeUrl(p.intl_waiver_link);
        if (wType.includes('Virtual Info Session')) {
            waiverCol = `
                <div style="font-weight:700; color:#b45309; font-size:0.86em;">🎟️ Info Session Code</div>
                <div style="font-size:0.78em; color:#78350f;">${escapeHtml(p.intl_waiver_event || '')}</div>
                ${cleanWaiverLink ? `<a href="${escapeHtml(cleanWaiverLink)}" target="_blank" class="source-link-badge">Register ↗</a>` : ''}
            `;
        } else if (wType.includes('Free for All')) {
            waiverCol = '<span style="font-weight:700; color:#15803d; font-size:0.86em;">🎁 $0 Free for All</span>';
        } else if (wType.includes('Financial Hardship')) {
            waiverCol = `
                <div style="font-weight:600; color:#1d4ed8; font-size:0.86em;">🤝 Hardship Waiver</div>
                ${cleanWaiverLink ? `<a href="${escapeHtml(cleanWaiverLink)}" target="_blank" class="source-link-badge">Request ↗</a>` : ''}
            `;
        }

        const cleanPortalUrl = sanitizeUrl(p.portal_url);

        return `
            <tr>
                <td>
                    <strong style="color:#0f172a;">${escapeHtml(p.university_name || 'University')}</strong>
                    <div style="font-size:0.8em; color:#64748b;">${escapeHtml(p.university_country || 'USA')}</div>
                </td>
                <td>
                    <div style="font-weight:600; color:var(--primary);">${escapeHtml(p.name)}</div>
                    <div style="display:flex; gap:4px; margin-top:3px; flex-wrap:wrap;">
                        <span style="background:#e0e7ff; color:#3730a3; padding:1px 6px; border-radius:8px; font-size:0.75em; font-weight:700;">${escapeHtml(p.degree || 'PhD')}</span>
                        ${p.discipline_tag ? `<span style="font-size:0.75em; color:#64748b;">${escapeHtml(p.discipline_tag)}</span>` : ''}
                    </div>
                </td>
                <td style="white-space: nowrap;">
                    <div class="star-rating" data-id="${p.id}" ondblclick="event.stopPropagation(); setProgramRating(${p.id}, 0)" title="Click star to rate priority (1-5). Double-click to clear.">
                        ${renderStarRating(p.rating || 0, p.id)}
                    </div>
                </td>
                <td>
                    <select class="program-difficulty-select" onchange="quickUpdateProgramDifficulty(${p.id}, this.value)" style="background: ${diffCfg.bg}; color: ${diffCfg.color}; border: 1px solid ${diffCfg.border}; padding: 4px 6px; font-size: 0.82em;">
                        ${renderDifficultySelectOptions(diffKey)}
                    </select>
                </td>
                <td style="color:#475569; font-size:0.85em;">${escapeHtml(p.department || '-')}</td>
                <td>
                    <select class="program-status-select" onchange="quickUpdateProgramStatus(${p.id}, this.value)" style="background: ${statusCfg.bg}; color: ${statusCfg.color}; border: 1px solid ${statusCfg.border}; padding: 4px 6px; font-size: 0.82em;">
                        ${Object.keys(STATUS_CONFIG).map(st => `
                            <option value="${st}" ${st === statusKey ? 'selected' : ''}>${STATUS_CONFIG[st].label}</option>
                        `).join('')}
                    </select>
                </td>
                <td style="white-space: nowrap; font-size: 0.85em;">${deadlineText}</td>
                <td style="font-size: 0.82em;">${waiverCol}</td>
                <td style="font-size: 0.82em;">${escapeHtml(p.toefl_det || p.english_requirement || '-')}</td>
                <td style="font-size: 0.82em;">
                    <div>${escapeHtml(p.requires_master || 'Bachelor OK')}</div>
                    <div style="color:#64748b;">${escapeHtml(p.letters_of_rec || '3 letters')}</div>
                </td>
                <td style="font-size: 0.82em;">
                    <div>${escapeHtml(p.faculty_match || '-')}</div>
                    ${p.intl_student_stats ? `<div style="color:#0f766e; margin-top:2px;">${renderStatsWithSource(p.intl_student_stats)}</div>` : ''}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        ${cleanPortalUrl ? `<a href="${escapeHtml(cleanPortalUrl)}" target="_blank" class="btn btn-action" style="padding: 4px 6px; font-size: 0.78em;" title="Open Portal">🔗</a>` : ''}
                        <button class="btn btn-action" onclick="openProgramModal(${p.id})" style="padding: 4px 6px; font-size: 0.78em;" title="Edit">✏️</button>
                        <button class="btn btn-action" onclick="deleteProgram(${p.id}, '${escapeJs(p.name)}')" style="padding: 4px 6px; font-size: 0.78em; color:var(--danger);" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Helper to parse "Source: https://..." into clickable link without trailing punctuation
function renderStatsWithSource(text) {
    if (!text) return '';
    const sourceBlockRegex = /\[?(?:Source|Official Source)?:\s*(https?:\/\/[^\s\]\)\<\>"]+)\]?/gi;
    let rendered = text.replace(sourceBlockRegex, (match, url) => {
        const cleanUrl = sanitizeUrl(url);
        return `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="source-link-badge">Official Source ↗</a>`;
    });
    const standaloneUrlRegex = /(https?:\/\/[^\s<>"'()[\]]+)/g;
    rendered = rendered.replace(standaloneUrlRegex, (url) => {
        const cleanUrl = sanitizeUrl(url);
        return `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" class="source-link-badge">Official Source ↗</a>`;
    });
    return rendered;
}

function setViewMode(mode) {
    currentViewMode = mode;
    const cardsBtn = document.getElementById('view-cards-btn');
    const tableBtn = document.getElementById('view-table-btn');
    if (mode === 'cards') {
        if (cardsBtn) { cardsBtn.className = 'btn btn-primary'; }
        if (tableBtn) { tableBtn.className = 'btn btn-action'; }
    } else {
        if (cardsBtn) { cardsBtn.className = 'btn btn-action'; }
        if (tableBtn) { tableBtn.className = 'btn btn-primary'; }
    }
    renderPrograms();
}

// --- Quick Status Update ---
async function quickUpdateProgramStatus(id, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/programs/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus })
        });
        if (!res.ok) throw new Error("Failed to update status");
        
        const prog = allPrograms.find(p => p.id === id);
        if (prog) prog.status = newStatus;
        
        updateMetricsBanner();
        renderPrograms();
    } catch (err) {
        alert("Error updating program status: " + err.message);
    }
}

// --- Add / Edit Program Modal ---
function openProgramModal(id = null) {
    const modal = document.getElementById('program-modal');
    const title = document.getElementById('program-modal-title');
    const btn = document.getElementById('btn-save-program');
    if (!modal) return;

    if (id) {
        const prog = allPrograms.find(p => p.id === id);
        if (!prog) return;

        title.innerText = "✏️ Edit Academic Program";
        btn.innerText = "Update Program";
        document.getElementById('prog-id').value = prog.id;
        document.getElementById('prog-university').value = prog.university_id || '';
        document.getElementById('prog-name').value = prog.name || '';
        document.getElementById('prog-degree').value = prog.degree || 'PhD';
        document.getElementById('prog-rating').value = String(prog.rating || 0);
        const diffSelect = document.getElementById('prog-difficulty');
        const curDiff = prog.difficulty || '';
        if (diffSelect) {
            if (curDiff && !Array.from(diffSelect.options).some(o => o.value.toLowerCase() === curDiff.toLowerCase())) {
                const opt = document.createElement('option');
                opt.value = curDiff;
                opt.innerText = `🟣 ${curDiff}`;
                diffSelect.insertBefore(opt, diffSelect.lastElementChild);
            }
            diffSelect.value = curDiff;
        }
        document.getElementById('prog-department').value = prog.department || '';
        document.getElementById('prog-discipline').value = prog.discipline_tag || '';
        document.getElementById('prog-waiver-type').value = prog.intl_waiver_type || 'Standard Paid (Domestic Waivers Only)';
        document.getElementById('prog-waiver-event').value = prog.intl_waiver_event || '';
        document.getElementById('prog-waiver-link').value = prog.intl_waiver_link || '';
        document.getElementById('prog-deadline').value = prog.deadline || '';
        document.getElementById('prog-fee').value = prog.app_fee || '';
        document.getElementById('prog-letters').value = prog.letters_of_rec || '3 letters required';
        document.getElementById('prog-toefl-det').value = prog.toefl_det || prog.english_requirement || '';
        document.getElementById('prog-requires-master').value = prog.requires_master || "No (Bachelor's eligible)";
        document.getElementById('prog-fee-waiver').value = prog.fee_waiver_info || '';
        document.getElementById('prog-intl-stats').value = prog.intl_student_stats || '';
        document.getElementById('prog-status').value = prog.status || 'Considering';
        document.getElementById('prog-portal').value = prog.portal_url || '';
        document.getElementById('prog-faculty').value = prog.faculty_match || '';
        document.getElementById('prog-notes').value = prog.notes || '';
    } else {
        title.innerText = "➕ Add New Academic Program";
        btn.innerText = "Save Program";
        document.getElementById('prog-id').value = '';
        document.getElementById('prog-university').value = '';
        document.getElementById('prog-name').value = '';
        document.getElementById('prog-degree').value = 'PhD';
        document.getElementById('prog-rating').value = '0';
        document.getElementById('prog-difficulty').value = '';
        document.getElementById('prog-department').value = '';
        document.getElementById('prog-discipline').value = '';
        document.getElementById('prog-waiver-type').value = 'Standard Paid (Domestic Waivers Only)';
        document.getElementById('prog-waiver-event').value = '';
        document.getElementById('prog-waiver-link').value = '';
        document.getElementById('prog-deadline').value = '';
        document.getElementById('prog-fee').value = '';
        document.getElementById('prog-letters').value = '3 letters required';
        document.getElementById('prog-toefl-det').value = '';
        document.getElementById('prog-requires-master').value = "No (Bachelor's eligible)";
        document.getElementById('prog-fee-waiver').value = '';
        document.getElementById('prog-intl-stats').value = '';
        document.getElementById('prog-status').value = 'Considering';
        document.getElementById('prog-portal').value = '';
        document.getElementById('prog-faculty').value = '';
        document.getElementById('prog-notes').value = '';
    }

    modal.style.display = 'flex';
}

function closeProgramModal() {
    const modal = document.getElementById('program-modal');
    if (modal) modal.style.display = 'none';
}

async function saveProgram() {
    const id = document.getElementById('prog-id').value;
    const university_id = document.getElementById('prog-university').value;
    const name = document.getElementById('prog-name').value.trim();

    if (!university_id) {
        alert("Please select a university / institution.");
        return;
    }
    if (!name) {
        alert("Please enter the program name.");
        return;
    }

    const payload = {
        university_id: parseInt(university_id, 10),
        name,
        degree: document.getElementById('prog-degree').value,
        rating: parseInt(document.getElementById('prog-rating')?.value || '0', 10),
        difficulty: (document.getElementById('prog-difficulty')?.value || '').trim(),
        department: document.getElementById('prog-department').value.trim(),
        discipline_tag: document.getElementById('prog-discipline').value.trim(),
        intl_waiver_type: document.getElementById('prog-waiver-type').value,
        intl_waiver_event: document.getElementById('prog-waiver-event').value.trim(),
        intl_waiver_link: document.getElementById('prog-waiver-link').value.trim(),
        deadline: document.getElementById('prog-deadline').value,
        app_fee: document.getElementById('prog-fee').value.trim(),
        letters_of_rec: document.getElementById('prog-letters').value.trim(),
        toefl_det: document.getElementById('prog-toefl-det').value.trim(),
        english_requirement: document.getElementById('prog-toefl-det').value.trim(),
        requires_master: document.getElementById('prog-requires-master').value,
        fee_waiver_info: document.getElementById('prog-fee-waiver').value.trim(),
        intl_student_stats: document.getElementById('prog-intl-stats').value.trim(),
        status: document.getElementById('prog-status').value,
        portal_url: document.getElementById('prog-portal').value.trim(),
        faculty_match: document.getElementById('prog-faculty').value.trim(),
        notes: document.getElementById('prog-notes').value.trim()
    };

    const endpoint = id ? `${API_BASE}/programs/update` : `${API_BASE}/programs/add`;
    if (id) payload.id = parseInt(id, 10);

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to save program");
        }
        closeProgramModal();
        await loadPrograms();
    } catch (err) {
        alert("Error saving program: " + err.message);
    }
}

async function deleteProgram(id, progName) {
    if (!confirm(`Are you sure you want to delete the program "${progName}"?`)) return;

    try {
        const res = await fetch(`${API_BASE}/programs/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error("Failed to delete program");
        await loadPrograms();
    } catch (err) {
        alert("Error deleting program: " + err.message);
    }
}

// Suggest PIs from selected school into the target faculty input
async function suggestPIsForModal() {
    const uniSelect = document.getElementById('prog-university');
    const facultyInput = document.getElementById('prog-faculty');
    if (!uniSelect || !facultyInput) return;

    const uniId = uniSelect.value;
    if (!uniId) {
        alert("Please select a university first.");
        return;
    }

    const selectedUni = allUniversities.find(u => String(u.id) === String(uniId));
    if (!selectedUni) return;

    try {
        const res = await fetch(`${API_BASE}/researchers?limit=1000`);
        if (!res.ok) throw new Error("Failed to fetch researchers");
        const researchers = await res.json();
        
        const matched = researchers.filter(r => {
            const uName = (r.university || '').toLowerCase();
            return uName.includes(selectedUni.name.toLowerCase()) || selectedUni.name.toLowerCase().includes(uName);
        });

        if (matched.length === 0) {
            alert(`No affiliated PIs currently in database for ${selectedUni.name}. You can type faculty names manually.`);
            return;
        }

        const topPIs = matched.slice(0, 5).map(r => r.name).join(', ');
        if (facultyInput.value.trim()) {
            facultyInput.value += ', ' + topPIs;
        } else {
            facultyInput.value = topPIs;
        }
    } catch (err) {
        console.error("Error suggesting PIs:", err);
    }
}

// --- Export CSV ---
function exportProgramsCSV() {
    if (allPrograms.length === 0) {
        alert("No programs available to export.");
        return;
    }

    const headers = [
        "University", "Country", "Program Name", "Degree", "Priority Rating", "Difficulty Tier", "Department",
        "Discipline Tags", "International Waiver Type", "Waiver Event / Timeline", "Waiver Link",
        "Deadline", "Application Fee", "Letters of Rec", "TOEFL / DET Requirements",
        "Requires Master", "Application Status", "Portal URL", "Target Faculty", "Admissions Stats", "Notes"
    ];

    const rows = allPrograms.map(p => [
        p.university_name || '',
        p.university_country || '',
        p.name || '',
        p.degree || '',
        p.rating || 0,
        p.difficulty || 'Unassigned',
        p.department || '',
        p.discipline_tag || '',
        p.intl_waiver_type || '',
        p.intl_waiver_event || '',
        p.intl_waiver_link || '',
        p.deadline || '',
        p.app_fee || '',
        p.letters_of_rec || '',
        p.toefl_det || p.english_requirement || '',
        p.requires_master || '',
        p.status || '',
        p.portal_url || '',
        p.faculty_match || '',
        p.intl_student_stats || '',
        p.notes || ''
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academic_programs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- Institution Management Modal Handlers ---
let allInstitutionsData = [];

async function openInstitutionModal() {
    const modal = document.getElementById('institution-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    cancelUniForm();
    await loadInstitutionsList();
}

function closeInstitutionModal() {
    const modal = document.getElementById('institution-modal');
    if (modal) modal.style.display = 'none';
}

async function loadInstitutionsList() {
    const tbody = document.getElementById('institutions-table-body');
    const badge = document.getElementById('uni-count-badge');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">⏳ Loading institutions...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/institutions`);
        if (!res.ok) throw new Error("Failed to load institutions");
        allInstitutionsData = await res.json();
        
        if (badge) badge.innerText = `${allInstitutionsData.length} institutions`;
        renderInstitutionsTable(allInstitutionsData);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:#ef4444;">Error: ${err.message}</td></tr>`;
    }
}

function renderInstitutionsTable(list) {
    const tbody = document.getElementById('institutions-table-body');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:#64748b;">No institutions found.</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(u => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 14px; font-weight:600; color:#1e293b;">
                ${escapeHtml(u.name)}
            </td>
            <td style="padding: 10px 12px; color:#64748b;">
                ${escapeHtml(u.country || 'USA')}
            </td>
            <td style="padding: 10px 12px; font-family: monospace; font-size:0.85em; color:#64748b;">
                ${(u.lat != null && u.lon != null) ? `${Number(u.lat).toFixed(2)}, ${Number(u.lon).toFixed(2)}` : '<span style="color:#f59e0b;">Missing</span>'}
            </td>
            <td style="padding: 10px 12px; text-align:center; font-weight:700; color:${u.researcher_count > 0 ? '#2563eb' : '#94a3b8'};">
                ${u.researcher_count || 0}
            </td>
            <td style="padding: 10px 14px; text-align:right;">
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                    <button class="btn btn-action" onclick="editUniForm(${u.id})" style="padding:4px 8px; font-size:0.8em;">✏️ Edit</button>
                    <button class="btn btn-action" onclick="deleteInstitution(${u.id}, '${escapeJs(u.name)}', ${u.researcher_count || 0})" style="padding:4px 8px; font-size:0.8em; color:var(--danger);">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterInstitutionsTable() {
    const q = (document.getElementById('uni-table-search')?.value || '').toLowerCase().trim();
    if (!q) {
        renderInstitutionsTable(allInstitutionsData);
        return;
    }
    const filtered = allInstitutionsData.filter(u => 
        (u.name || '').toLowerCase().includes(q) || 
        (u.country || '').toLowerCase().includes(q)
    );
    renderInstitutionsTable(filtered);
}

function toggleAddUniForm() {
    const card = document.getElementById('uni-form-card');
    if (!card) return;
    if (card.style.display === 'none') {
        document.getElementById('uni-form-id').value = '';
        document.getElementById('uni-form-name').value = '';
        document.getElementById('uni-form-country').value = 'USA';
        document.getElementById('uni-form-lat').value = '';
        document.getElementById('uni-form-lon').value = '';
        document.getElementById('uni-form-title').innerText = "➕ Add New Institution";
        document.getElementById('uni-form-submit-btn').innerText = "Save Institution";
        card.style.display = 'block';
    } else {
        card.style.display = 'none';
    }
}

function cancelUniForm() {
    const card = document.getElementById('uni-form-card');
    if (card) card.style.display = 'none';
}

function editUniForm(id) {
    const u = allInstitutionsData.find(item => item.id === id);
    if (!u) return;

    const card = document.getElementById('uni-form-card');
    if (!card) return;

    document.getElementById('uni-form-id').value = u.id;
    document.getElementById('uni-form-name').value = u.name || '';
    document.getElementById('uni-form-country').value = u.country || 'USA';
    document.getElementById('uni-form-lat').value = u.lat != null ? u.lat : '';
    document.getElementById('uni-form-lon').value = u.lon != null ? u.lon : '';
    document.getElementById('uni-form-title').innerText = `✏️ Edit: ${u.name}`;
    document.getElementById('uni-form-submit-btn').innerText = "Update Institution";
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function autoDetectCoordinates() {
    const name = document.getElementById('uni-form-name')?.value.trim();
    const btn = document.getElementById('uni-detect-coord-btn');
    if (!name) {
        alert("Please enter the university name first.");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = "⏳ Looking up...";
    }

    try {
        const query = encodeURIComponent(name);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        if (!res.ok) throw new Error("Network error during lookup");
        const data = await res.json();
        if (data && data.length > 0) {
            document.getElementById('uni-form-lat').value = parseFloat(data[0].lat).toFixed(4);
            document.getElementById('uni-form-lon').value = parseFloat(data[0].lon).toFixed(4);
        } else {
            alert(`Could not automatically locate "${name}". Please check the spelling or enter coordinates manually.`);
        }
    } catch (err) {
        alert("Lookup failed: " + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "🌐 Auto-Detect";
        }
    }
}

async function submitUniForm() {
    const id = document.getElementById('uni-form-id').value;
    const name = document.getElementById('uni-form-name').value.trim();
    const country = document.getElementById('uni-form-country').value.trim();
    const lat = document.getElementById('uni-form-lat').value.trim();
    const lon = document.getElementById('uni-form-lon').value.trim();

    if (!name) {
        alert("Please provide the institution name.");
        return;
    }

    const payload = {
        name,
        country: country || 'USA',
        lat: lat ? parseFloat(lat) : null,
        lon: lon ? parseFloat(lon) : null
    };

    const endpoint = id ? `${API_BASE}/institutions/update` : `${API_BASE}/institutions/add`;
    if (id) payload.id = parseInt(id, 10);

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to save institution");
        }
        cancelUniForm();
        await loadInstitutionsList();
        await loadUniversities();
    } catch (err) {
        alert("Error saving institution: " + err.message);
    }
}

async function deleteInstitution(id, name, resCount) {
    let confirmMsg = `Are you sure you want to delete "${name}"?`;
    if (resCount > 0) {
        confirmMsg = `WARNING: "${name}" currently has ${resCount} affiliated researcher(s).\nDeleting this institution will un-link them. Are you sure you want to proceed?`;
    }
    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`${API_BASE}/institutions/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error("Failed to delete institution");
        await loadInstitutionsList();
        await loadUniversities();
    } catch (err) {
        alert("Error deleting institution: " + err.message);
    }
}

// --- Utilities ---
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// --- Difficulty Tier Management & Batch Operations ---
function openTierManagerModal() {
    const modal = document.getElementById('tier-manager-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    renderTierManagerDistribution();
    populateBatchUniSelect();
    populateBatchRenameSource();
}

function closeTierManagerModal() {
    const modal = document.getElementById('tier-manager-modal');
    if (modal) modal.style.display = 'none';
}

function renderTierManagerDistribution() {
    const grid = document.getElementById('tier-distribution-grid');
    if (!grid) return;

    const total = allPrograms.length || 1;
    const counts = {
        'Super Reach': 0,
        'High Reach': 0,
        'Hard Target': 0,
        'Target': 0,
        'Safety': 0,
        'Unassigned': 0
    };
    const customCounts = {};

    allPrograms.forEach(p => {
        const raw = (p.difficulty || '').trim();
        const lower = raw.toLowerCase();
        if (!raw || lower === 'unassigned') {
            counts['Unassigned']++;
        } else if (lower === 'super reach' || lower === 'reach') {
            counts['Super Reach']++;
        } else if (lower === 'high reach') {
            counts['High Reach']++;
        } else if (lower === 'hard target') {
            counts['Hard Target']++;
        } else if (lower === 'target') {
            counts['Target']++;
        } else if (lower === 'safety') {
            counts['Safety']++;
        } else {
            customCounts[raw] = (customCounts[raw] || 0) + 1;
        }
    });

    const tierCards = [
        { name: 'Super Reach', label: '🔴 Super Reach', count: counts['Super Reach'], color: '#991b1b', bg: '#fee2e2', border: '#fca5a5' },
        { name: 'High Reach', label: '🟠 High Reach', count: counts['High Reach'], color: '#c2410c', bg: '#ffedd5', border: '#fdba74' },
        { name: 'Hard Target', label: '🟡 Hard Target', count: counts['Hard Target'], color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
        { name: 'Target', label: '🟢 Target', count: counts['Target'], color: '#15803d', bg: '#dcfce7', border: '#86efac' },
        { name: 'Safety', label: '🔵 Safety', count: counts['Safety'], color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd' },
        { name: 'Unassigned', label: '⚪ Unassigned', count: counts['Unassigned'], color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' }
    ];

    Object.keys(customCounts).sort().forEach(t => {
        tierCards.push({
            name: t,
            label: `🟣 ${t}`,
            count: customCounts[t],
            color: '#6d28d9',
            bg: '#ede9fe',
            border: '#ddd6fe'
        });
    });

    grid.innerHTML = tierCards.map(tc => {
        const pct = ((tc.count / total) * 100).toFixed(1);
        return `
            <div style="background: ${tc.bg}; border: 1.5px solid ${tc.border}; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform 0.15s ease;"
                 onclick="closeTierManagerModal(); selectDifficultyFilter('${escapeJs(tc.name)}')"
                 title="Click to view all ${escapeHtml(tc.name)} programs">
                <div style="font-weight: 700; font-size: 0.86em; color: ${tc.color}; margin-bottom: 6px;">
                    ${escapeHtml(tc.label)}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                    <span style="font-size: 1.35em; font-weight: 800; color: ${tc.color};">${tc.count}</span>
                    <span style="font-size: 0.78em; color: ${tc.color}; opacity: 0.85;">${pct}%</span>
                </div>
            </div>
        `;
    }).join('');
}

function populateBatchUniSelect() {
    const select = document.getElementById('batch-uni-select');
    if (!select) return;

    const uniCounts = {};
    allPrograms.forEach(p => {
        if (p.university_id) {
            const uid = p.university_id;
            const uname = p.university_name || 'University #' + uid;
            if (!uniCounts[uid]) uniCounts[uid] = { id: uid, name: uname, count: 0 };
            uniCounts[uid].count++;
        }
    });

    const sorted = Object.values(uniCounts).sort((a, b) => a.name.localeCompare(b.name));
    select.innerHTML = '<option value="">-- Select Institution --</option>' +
        sorted.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${u.count} programs)</option>`).join('');
}

function populateBatchRenameSource() {
    const select = document.getElementById('batch-rename-source');
    if (!select) return;

    const tiers = new Set();
    allPrograms.forEach(p => {
        const raw = (p.difficulty || '').trim();
        if (raw) tiers.add(raw);
    });

    const sorted = Array.from(tiers).sort();
    select.innerHTML = '<option value="">-- Select Source Tier --</option>' +
        sorted.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
}

async function applyBatchUniTier() {
    const uniSelect = document.getElementById('batch-uni-select');
    const tierSelect = document.getElementById('batch-tier-select');
    if (!uniSelect || !tierSelect) return;

    const uniId = parseInt(uniSelect.value, 10);
    if (!uniId) {
        alert("Please select an institution first.");
        return;
    }

    let targetTier = tierSelect.value;
    if (targetTier === '__custom__') {
        const custom = prompt("Enter custom difficulty tier name (e.g. Dream Tier, Tier 1):");
        if (!custom || !custom.trim()) return;
        targetTier = custom.trim();
    }

    const uniObj = allUniversities.find(u => u.id === uniId);
    const uniName = uniObj ? uniObj.name : `Institution #${uniId}`;

    if (!confirm(`Are you sure you want to set all programs for "${uniName}" to "${targetTier || 'Unassigned'}"?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/programs/batch-update-difficulty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                university_id: uniId,
                new_difficulty: targetTier
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Batch update failed");

        alert(`Successfully updated ${data.affected_rows} program(s) for "${uniName}" to "${targetTier || 'Unassigned'}".`);
        await loadPrograms();
        renderTierManagerDistribution();
        populateBatchRenameSource();
    } catch (err) {
        alert("Error applying batch difficulty: " + err.message);
    }
}

async function applyRenameTier() {
    const srcSelect = document.getElementById('batch-rename-source');
    const targetInput = document.getElementById('batch-rename-target');
    if (!srcSelect || !targetInput) return;

    const oldTier = srcSelect.value;
    const newTier = targetInput.value.trim();

    if (!oldTier) {
        alert("Please select a source tier to rename.");
        return;
    }
    if (!newTier) {
        alert("Please enter the new tier name.");
        return;
    }

    if (!confirm(`Are you sure you want to rename all "${oldTier}" programs to "${newTier}"?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/programs/batch-update-difficulty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                old_difficulty: oldTier,
                new_difficulty: newTier
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Rename failed");

        alert(`Successfully renamed ${data.affected_rows} program(s) from "${oldTier}" to "${newTier}".`);
        targetInput.value = '';
        await loadPrograms();
        renderTierManagerDistribution();
        populateBatchRenameSource();
    } catch (err) {
        alert("Error renaming tier: " + err.message);
    }
}

function quickPromptChangeDifficulty(id, currentTier) {
    const newTier = prompt(`Change difficulty tier for this program.\nCurrent: "${currentTier || 'Unassigned'}"\nOptions: Super Reach, High Reach, Hard Target, Target, Safety, or custom name:`, currentTier || '');
    if (newTier !== null) {
        quickUpdateProgramDifficulty(id, newTier.trim());
    }
}
