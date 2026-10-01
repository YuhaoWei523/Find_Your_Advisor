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
    await Promise.all([loadUniversities(), loadPrograms()]);

    // Check URL parameters for deep-linking
    const urlParams = new URLSearchParams(window.location.search);
    const uniParam = urlParams.get('uni');
    const searchParam = urlParams.get('search');
    const degreeParam = urlParams.get('degree');
    const statusParam = urlParams.get('status');
    const waiverParam = urlParams.get('waiver');
    const discParam = urlParams.get('discipline');

    if (uniParam) {
        const searchInput = document.getElementById('search-program-input');
        if (searchInput) searchInput.value = uniParam;
    } else if (searchParam) {
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

    if (uniParam || searchParam || statusParam || waiverParam || discParam) {
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
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 40px; color:#64748b;">⏳ Loading programs...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/programs`);
        if (!res.ok) throw new Error("Failed to load programs");
        allPrograms = await res.json();
        
        updateMetricsBanner();
        updateSidebarFilterCounts();
        renderPrograms();
    } catch (err) {
        console.error("Error loading programs:", err);
        const errMsg = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#ef4444;">Error loading programs: ${err.message}</div>`;
        if (cardsContainer) cardsContainer.innerHTML = errMsg;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 40px; color:#ef4444;">Error loading programs: ${err.message}</td></tr>`;
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

    document.querySelectorAll('[id^="waiver-pill-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('waiver-pill-all')?.classList.add('active');

    document.querySelectorAll('[id^="disc-pill-"]').forEach(el => el.classList.remove('active'));
    document.getElementById('disc-pill-all')?.classList.add('active');

    const searchInput = document.getElementById('search-program-input');
    if (searchInput) searchInput.value = '';

    ['filter-master-req', 'filter-language-type', 'filter-letters-count', 'filter-deadline', 'filter-country', 'filter-status'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const sortEl = document.getElementById('sort-programs');
    if (sortEl) sortEl.value = 'deadline_asc';

    renderPrograms();
}

// --- Live Sidebar Filter Counts ---
function updateSidebarFilterCounts() {
    const total = allPrograms.length;
    
    const setBadge = (id, count) => {
        const el = document.getElementById(id);
        if (el) el.innerText = count;
    };

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
            .filter(p => p.deadline && p.deadline.trim())
            .map(p => {
                const parts = p.deadline.split('-');
                const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
                d.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                return { program: p, date: d, diffDays };
            })
            .filter(item => item.diffDays >= 0)
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
    const sortVal = document.getElementById('sort-programs')?.value || 'deadline_asc';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = allPrograms.filter(p => {
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
            const parts = p.deadline.split('-');
            const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
            d.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

            if (deadlineVal === 'upcoming_30' && (diffDays < 0 || diffDays > 30)) return false;
            if (deadlineVal === 'upcoming_60' && (diffDays < 0 || diffDays > 60)) return false;
            if (deadlineVal === 'dec_1' && !p.deadline.includes('-12-01')) return false;
            if (deadlineVal === 'dec_15' && !p.deadline.includes('-12-15')) return false;
            if (deadlineVal === 'jan' && (!p.deadline.includes('-01-') && !p.deadline.includes('-01/'))) return false;
            if (deadlineVal === 'future' && diffDays <= 60) return false;
            if (deadlineVal === 'passed' && diffDays >= 0) return false;
        }

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortVal === 'waiver_priority') {
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
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        } else if (sortVal === 'deadline_asc') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return a.deadline.localeCompare(b.deadline);
        } else if (sortVal === 'deadline_desc') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return b.deadline.localeCompare(a.deadline);
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
            const parts = p.deadline.split('-');
            const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
            d.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
                deadlineHtml = `<span style="color:#991b1b; font-weight:600;">📅 ${p.deadline} (Passed)</span>`;
            } else if (diffDays === 0) {
                deadlineHtml = `<span style="color:#dc2626; font-weight:700; animation: pulse 1.5s infinite;">📅 ${p.deadline} · Today!</span>`;
                isUrgent = true;
            } else if (diffDays <= 7) {
                deadlineHtml = `<span style="color:#dc2626; font-weight:700;">📅 ${p.deadline} · ${diffDays} days left</span>`;
                isUrgent = true;
            } else if (diffDays <= 30) {
                deadlineHtml = `<span style="color:#d97706; font-weight:600;">📅 ${p.deadline} · ${diffDays} days left</span>`;
            } else {
                deadlineHtml = `<span style="color:#15803d; font-weight:600;">📅 ${p.deadline} · ${diffDays} days left</span>`;
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
        if (wType.includes('Virtual Info Session')) {
            waiverCalloutHtml = `
                <div class="waiver-callout-card gold">
                    <div class="waiver-badge-header">
                        <span>🎟️ Virtual Info Session Free Waiver Code (Intl Eligible)</span>
                    </div>
                    <div class="waiver-event-title">
                        ${escapeHtml(p.intl_waiver_event || 'Attend virtual graduate showcase/webinar to receive free application fee waiver code.')}
                    </div>
                    ${p.intl_waiver_link ? `
                        <div>
                            <a href="${escapeHtml(p.intl_waiver_link)}" target="_blank" rel="noopener noreferrer" class="waiver-btn gold">
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
                    ${p.intl_waiver_link ? `
                        <div>
                            <a href="${escapeHtml(p.intl_waiver_link)}" target="_blank" rel="noopener noreferrer" class="waiver-btn blue">
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

        return `
            <div class="program-card ${isUrgent ? 'urgent-border' : ''}" style="border-left: 5px solid ${statusCfg.color};">
                <!-- University & Degree -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <div>
                        <span style="font-weight: 700; color: #1e293b; font-size: 1.05em; display: flex; align-items: center; gap: 6px;">
                            🏛️ ${escapeHtml(p.university_name || 'Unknown University')}
                        </span>
                        <span style="font-size: 0.78em; color: #64748b; font-weight: 600;">${escapeHtml(p.university_country || 'USA')}</span>
                    </div>
                    <span style="${degreeBadgeStyle} padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 0.75em; text-transform: uppercase;">
                        ${escapeHtml(p.degree || 'PhD')}
                    </span>
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

                <!-- Status Selector -->
                <div style="margin-bottom: 10px;">
                    <select class="program-status-select" onchange="quickUpdateProgramStatus(${p.id}, this.value)" style="background: ${statusCfg.bg}; color: ${statusCfg.color}; border: 1px solid ${statusCfg.border};">
                        ${Object.keys(STATUS_CONFIG).map(st => `
                            <option value="${st}" ${st === statusKey ? 'selected' : ''}>${STATUS_CONFIG[st].label}</option>
                        `).join('')}
                    </select>
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
                        ${p.portal_url ? `
                            <a href="${escapeHtml(p.portal_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-action" style="font-size: 0.8em; padding: 5px 10px; text-decoration:none;">
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
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 40px; color:#94a3b8;">No matching programs found.</td></tr>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tableBody.innerHTML = programs.map(p => {
        const statusKey = p.status || 'Considering';
        const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG['Considering'];

        let deadlineText = p.deadline || '-';
        if (p.deadline) {
            const parts = p.deadline.split('-');
            const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
            d.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) deadlineText += ' (Passed)';
            else if (diffDays === 0) deadlineText += ' (Today!)';
            else deadlineText += ` (${diffDays}d)`;
        }

        // Waiver badge
        let waiverCol = '<span style="color:#94a3b8;">Standard Paid</span>';
        const wType = p.intl_waiver_type || '';
        if (wType.includes('Virtual Info Session')) {
            waiverCol = `
                <div style="font-weight:700; color:#b45309; font-size:0.86em;">🎟️ Info Session Code</div>
                <div style="font-size:0.78em; color:#78350f;">${escapeHtml(p.intl_waiver_event || '')}</div>
                ${p.intl_waiver_link ? `<a href="${escapeHtml(p.intl_waiver_link)}" target="_blank" class="source-link-badge">Register ↗</a>` : ''}
            `;
        } else if (wType.includes('Free for All')) {
            waiverCol = '<span style="font-weight:700; color:#15803d; font-size:0.86em;">🎁 $0 Free for All</span>';
        } else if (wType.includes('Financial Hardship')) {
            waiverCol = `
                <div style="font-weight:600; color:#1d4ed8; font-size:0.86em;">🤝 Hardship Waiver</div>
                ${p.intl_waiver_link ? `<a href="${escapeHtml(p.intl_waiver_link)}" target="_blank" class="source-link-badge">Request ↗</a>` : ''}
            `;
        }

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
                        ${p.portal_url ? `<a href="${escapeHtml(p.portal_url)}" target="_blank" class="btn btn-action" style="padding: 4px 6px; font-size: 0.78em;" title="Open Portal">🔗</a>` : ''}
                        <button class="btn btn-action" onclick="openProgramModal(${p.id})" style="padding: 4px 6px; font-size: 0.78em;" title="Edit">✏️</button>
                        <button class="btn btn-action" onclick="deleteProgram(${p.id}, '${escapeJs(p.name)}')" style="padding: 4px 6px; font-size: 0.78em; color:var(--danger);" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Helper to parse "Source: https://..." into clickable link
function renderStatsWithSource(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="source-link-badge">Official Source ↗</a>`;
    });
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
        "University", "Country", "Program Name", "Degree", "Department",
        "Discipline Tags", "International Waiver Type", "Waiver Event / Timeline", "Waiver Link",
        "Deadline", "Application Fee", "Letters of Rec", "TOEFL / DET Requirements",
        "Requires Master", "Application Status", "Portal URL", "Target Faculty", "Admissions Stats", "Notes"
    ];

    const rows = allPrograms.map(p => [
        p.university_name || '',
        p.university_country || '',
        p.name || '',
        p.degree || '',
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
