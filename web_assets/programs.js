// ==========================================
// Find Your Advisor - Academic Programs Management
// ==========================================

const API_BASE = (window.location.protocol.startsWith('http')) 
    ? (window.location.origin + '/api') 
    : 'http://127.0.0.1:5000/api';

let allPrograms = [];
let allUniversities = [];
let currentViewMode = 'cards'; // 'cards' | 'table'

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

    if (uniParam) {
        const searchInput = document.getElementById('search-program-input');
        if (searchInput) searchInput.value = uniParam;
    } else if (searchParam) {
        const searchInput = document.getElementById('search-program-input');
        if (searchInput) searchInput.value = searchParam;
    }
    if (degreeParam) {
        const degEl = document.getElementById('filter-degree');
        if (degEl) degEl.value = degreeParam;
    }
    if (statusParam) {
        const statEl = document.getElementById('filter-status');
        if (statEl) statEl.value = statusParam;
    }

    if (uniParam || searchParam || degreeParam || statusParam) {
        renderPrograms();
    }
});

function setupEventListeners() {
    const searchInput = document.getElementById('search-program-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderPrograms());
    }

    ['filter-degree', 'filter-status', 'filter-country', 'filter-deadline', 'sort-programs'].forEach(id => {
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
        
        // Populate university dropdowns
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
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px; color:#64748b;">⏳ Loading programs...</td></tr>';

    try {
        const res = await fetch(`${API_BASE}/programs`);
        if (!res.ok) throw new Error("Failed to load programs");
        allPrograms = await res.json();
        updateMetricsBanner();
        renderPrograms();
    } catch (err) {
        console.error("Error loading programs:", err);
        const errMsg = `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#ef4444;">Error loading programs: ${err.message}</div>`;
        if (cardsContainer) cardsContainer.innerHTML = errMsg;
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color:#ef4444;">Error loading programs: ${err.message}</td></tr>`;
    }
}

function populateUniversityOptions() {
    const select = document.getElementById('prog-university');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select University / Institution * --</option>';
    
    // Sort universities alphabetically
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

// --- Metrics & Upcoming Deadline Banner ---
function updateMetricsBanner() {
    const totalEl = document.getElementById('metric-total-count');
    const deadlineAlertEl = document.getElementById('metric-deadline-alert');
    const pipelineCountsEl = document.getElementById('metric-pipeline-counts');

    if (totalEl) {
        totalEl.innerText = `${allPrograms.length} Tracked Programs`;
    }

    // Count by status
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

    // Find closest upcoming deadline
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

// --- Filtering & Sorting ---
function getFilteredPrograms() {
    const searchVal = (document.getElementById('search-program-input')?.value || '').trim().toLowerCase();
    const degreeVal = document.getElementById('filter-degree')?.value || '';
    const statusVal = document.getElementById('filter-status')?.value || '';
    const countryVal = document.getElementById('filter-country')?.value || '';
    const deadlineVal = document.getElementById('filter-deadline')?.value || '';
    const sortVal = document.getElementById('sort-programs')?.value || 'deadline_asc';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered = allPrograms.filter(p => {
        // Search filter
        if (searchVal) {
            const matchName = (p.name || '').toLowerCase().includes(searchVal);
            const matchUni = (p.university_name || '').toLowerCase().includes(searchVal);
            const matchDept = (p.department || '').toLowerCase().includes(searchVal);
            const matchNotes = (p.notes || '').toLowerCase().includes(searchVal);
            const matchFaculty = (p.faculty_match || '').toLowerCase().includes(searchVal);
            if (!matchName && !matchUni && !matchDept && !matchNotes && !matchFaculty) {
                return false;
            }
        }

        // Degree filter
        if (degreeVal && p.degree !== degreeVal) return false;

        // Status filter
        if (statusVal && (p.status || 'Considering') !== statusVal) return false;

        // Country filter
        if (countryVal && p.university_country !== countryVal) return false;

        // Deadline filter
        if (deadlineVal && p.deadline) {
            const parts = p.deadline.split('-');
            const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
            d.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));

            if (deadlineVal === 'upcoming_30' && (diffDays < 0 || diffDays > 30)) return false;
            if (deadlineVal === 'upcoming_60' && (diffDays < 0 || diffDays > 60)) return false;
            if (deadlineVal === 'future' && diffDays <= 60) return false;
            if (deadlineVal === 'passed' && diffDays >= 0) return false;
        } else if (deadlineVal && !p.deadline) {
            return false;
        }

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortVal === 'deadline_asc') {
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
                <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9em;">Try adjusting your filters or click below to add a new graduate program.</p>
                <button class="btn btn-primary" onclick="openProgramModal()">➕ Add Your First Program</button>
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

        // Faculty match tags
        let facultyPillsHtml = '';
        if (p.faculty_match) {
            const names = p.faculty_match.split(/[,;\n]/).map(n => n.trim()).filter(n => n);
            if (names.length > 0) {
                facultyPillsHtml = `
                    <div style="margin-top: 10px;">
                        <span style="font-size: 0.78em; color: #64748b; font-weight: 600;">Target Faculty:</span>
                        <div style="display:flex; flex-wrap:wrap; gap: 4px; margin-top: 4px;">
                            ${names.map(name => `<span class="faculty-match-tag">${escapeHtml(name)}</span>`).join('')}
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

        return `
            <div class="program-card ${isUrgent ? 'urgent-border' : ''}" style="border-left: 5px solid ${statusCfg.color};">
                <!-- University & Degree -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
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

                <!-- Program Name & Department -->
                <h3 style="margin: 6px 0 2px 0; font-size: 1.18em; color: var(--primary); font-weight: 700; line-height: 1.3;">
                    ${escapeHtml(p.name)}
                </h3>
                <div style="font-size: 0.85em; color: #475569; margin-bottom: 12px; min-height: 1.2em;">
                    ${escapeHtml(p.department || 'Department not specified')}
                </div>

                <!-- Status Selector -->
                <div style="margin-bottom: 12px;">
                    <select class="program-status-select" onchange="quickUpdateProgramStatus(${p.id}, this.value)" style="background: ${statusCfg.bg}; color: ${statusCfg.color}; border: 1px solid ${statusCfg.border};">
                        ${Object.keys(STATUS_CONFIG).map(st => `
                            <option value="${st}" ${st === statusKey ? 'selected' : ''}>${STATUS_CONFIG[st].label}</option>
                        `).join('')}
                    </select>
                </div>

                <!-- Deadline Box -->
                <div class="program-info-pill" style="margin-bottom: 12px;">
                    ${deadlineHtml}
                </div>

                <!-- Key Requirements -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82em; margin-bottom: 12px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div>
                        <span style="color:#64748b;">💵 Fee:</span> <strong>${escapeHtml(p.app_fee || 'Unspecified')}</strong>
                    </div>
                    <div>
                        <span style="color:#64748b;">📝 GRE:</span> <strong>${escapeHtml(p.gre_requirement || 'Not Required')}</strong>
                    </div>
                    <div style="grid-column: 1/-1;">
                        <span style="color:#64748b;">🌐 English:</span> <strong>${escapeHtml(p.english_requirement || 'Unspecified')}</strong>
                    </div>
                </div>

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
                    <div style="background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 8px; border-radius: 6px; font-size: 0.82em; margin-bottom: 14px; max-height: 80px; overflow-y: auto;">
                        <strong>📝 Notes:</strong> ${escapeHtml(p.notes)}
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
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px; color:#94a3b8;">No matching programs found.</td></tr>';
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

        const piCount = p.affiliated_pi_count || 0;
        const advisorPage = (window.location.protocol === 'file:' && (window.location.href.includes('NeuroAI') || !window.location.href.includes('Find_Your_Advisor'))) 
            ? 'NeuroAI_Database.html' 
            : 'index.html';
        const piLink = `${advisorPage}?uni=${encodeURIComponent(p.university_name || '')}`;

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 12px 14px;">
                    <div style="font-weight: 600; color: #1e293b;">${escapeHtml(p.university_name || 'Unknown')}</div>
                    <span style="font-size: 0.78em; color: #64748b;">${escapeHtml(p.university_country || 'USA')}</span>
                </td>
                <td style="padding: 12px 14px;">
                    <div style="font-weight: 700; color: var(--primary);">${escapeHtml(p.name)}</div>
                    <span style="display:inline-block; font-size: 0.75em; padding: 2px 6px; border-radius: 8px; background: #e0e7ff; color: #3730a3; font-weight:600;">${escapeHtml(p.degree || 'PhD')}</span>
                </td>
                <td style="padding: 12px 14px; font-size: 0.85em; color: #475569;">
                    ${escapeHtml(p.department || '-')}
                </td>
                <td style="padding: 12px 14px;">
                    <select class="program-status-select" onchange="quickUpdateProgramStatus(${p.id}, this.value)" style="background: ${statusCfg.bg}; color: ${statusCfg.color}; border: 1px solid ${statusCfg.border}; padding: 4px 8px; font-size: 0.82em;">
                        ${Object.keys(STATUS_CONFIG).map(st => `
                            <option value="${st}" ${st === statusKey ? 'selected' : ''}>${STATUS_CONFIG[st].label}</option>
                        `).join('')}
                    </select>
                </td>
                <td style="padding: 12px 14px; font-size: 0.85em; font-weight: 600; white-space: nowrap;">
                    ${deadlineText}
                </td>
                <td style="padding: 12px 14px; font-size: 0.82em; color: #475569;">
                    <div>Fee: <strong>${escapeHtml(p.app_fee || '-')}</strong></div>
                    <div>GRE: <strong>${escapeHtml(p.gre_requirement || '-')}</strong></div>
                </td>
                <td style="padding: 12px 14px; font-size: 0.82em;">
                    <a href="${piLink}" style="color: var(--primary); font-weight: 600; text-decoration: none;">${piCount} PIs →</a>
                    ${p.faculty_match ? `<div style="font-size: 0.75em; color: #64748b; margin-top: 2px;">${escapeHtml(p.faculty_match)}</div>` : ''}
                </td>
                <td style="padding: 12px 14px; text-align: right; white-space: nowrap;">
                    ${p.portal_url ? `<a href="${escapeHtml(p.portal_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-action" style="padding: 4px 8px; font-size: 0.8em; margin-right: 4px; text-decoration:none;">🔗</a>` : ''}
                    <button class="btn btn-action" onclick="openProgramModal(${p.id})" title="Edit program" style="padding: 4px 8px; font-size: 0.8em; margin-right: 4px;">✏️</button>
                    <button class="btn btn-action" onclick="deleteProgram(${p.id}, '${escapeJs(p.name)}')" title="Delete program" style="padding: 4px 8px; font-size: 0.8em; color: var(--danger);">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function setViewMode(mode) {
    currentViewMode = mode;
    const btnCards = document.getElementById('view-cards-btn');
    const btnTable = document.getElementById('view-table-btn');
    if (btnCards && btnTable) {
        if (mode === 'cards') {
            btnCards.className = 'btn btn-primary';
            btnTable.className = 'btn btn-action';
        } else {
            btnCards.className = 'btn btn-action';
            btnTable.className = 'btn btn-primary';
        }
    }
    renderPrograms();
}

// --- Quick Status Updater ---
async function quickUpdateProgramStatus(id, newStatus) {
    const prog = allPrograms.find(p => p.id === id);
    if (!prog) return;

    try {
        const payload = {
            id: prog.id,
            university_id: prog.university_id,
            name: prog.name,
            degree: prog.degree,
            department: prog.department,
            deadline: prog.deadline,
            app_fee: prog.app_fee,
            gre_requirement: prog.gre_requirement,
            english_requirement: prog.english_requirement,
            status: newStatus,
            portal_url: prog.portal_url,
            faculty_match: prog.faculty_match,
            notes: prog.notes
        };

        const res = await fetch(`${API_BASE}/programs/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Failed to update status");
        prog.status = newStatus;
        updateMetricsBanner();
        renderPrograms();
    } catch (err) {
        alert(`Status update failed: ${err.message}`);
    }
}

// --- Program Modal (Add & Edit) ---
function openProgramModal(id = null) {
    const modal = document.getElementById('program-modal');
    const titleEl = document.getElementById('program-modal-title');
    if (!modal) return;

    // Reset fields
    document.getElementById('prog-id').value = '';
    document.getElementById('prog-university').value = '';
    document.getElementById('prog-name').value = '';
    document.getElementById('prog-degree').value = 'PhD';
    document.getElementById('prog-department').value = '';
    document.getElementById('prog-deadline').value = '';
    document.getElementById('prog-fee').value = '';
    document.getElementById('prog-gre').value = 'Not Required';
    document.getElementById('prog-english').value = '';
    document.getElementById('prog-status').value = 'Considering';
    document.getElementById('prog-portal').value = '';
    document.getElementById('prog-faculty').value = '';
    document.getElementById('prog-notes').value = '';

    if (id) {
        if (titleEl) titleEl.innerText = '✏️ Edit Program';
        const prog = allPrograms.find(p => p.id === id);
        if (prog) {
            document.getElementById('prog-id').value = prog.id;
            document.getElementById('prog-university').value = prog.university_id || '';
            document.getElementById('prog-name').value = prog.name || '';
            document.getElementById('prog-degree').value = prog.degree || 'PhD';
            document.getElementById('prog-department').value = prog.department || '';
            document.getElementById('prog-deadline').value = prog.deadline || '';
            document.getElementById('prog-fee').value = prog.app_fee || '';
            document.getElementById('prog-gre').value = prog.gre_requirement || 'Not Required';
            document.getElementById('prog-english').value = prog.english_requirement || '';
            document.getElementById('prog-status').value = prog.status || 'Considering';
            document.getElementById('prog-portal').value = prog.portal_url || '';
            document.getElementById('prog-faculty').value = prog.faculty_match || '';
            document.getElementById('prog-notes').value = prog.notes || '';
        }
    } else {
        if (titleEl) titleEl.innerText = '➕ Add New Program';
    }

    modal.style.display = 'flex';
}

function closeProgramModal() {
    const modal = document.getElementById('program-modal');
    if (modal) modal.style.display = 'none';
}

async function saveProgram() {
    const id = document.getElementById('prog-id').value;
    const uniId = document.getElementById('prog-university').value;
    const name = document.getElementById('prog-name').value.trim();
    const degree = document.getElementById('prog-degree').value;
    const dept = document.getElementById('prog-department').value.trim();
    const deadline = document.getElementById('prog-deadline').value.trim();
    const fee = document.getElementById('prog-fee').value.trim();
    const gre = document.getElementById('prog-gre').value;
    const english = document.getElementById('prog-english').value.trim();
    const status = document.getElementById('prog-status').value;
    const portal = document.getElementById('prog-portal').value.trim();
    const faculty = document.getElementById('prog-faculty').value.trim();
    const notes = document.getElementById('prog-notes').value.trim();

    if (!name || !uniId) {
        alert('Please fill in both the Program Name and University.');
        return;
    }

    const payload = {
        university_id: parseInt(uniId, 10),
        name: name,
        degree: degree,
        department: dept,
        deadline: deadline,
        app_fee: fee,
        gre_requirement: gre,
        english_requirement: english,
        status: status,
        portal_url: portal,
        faculty_match: faculty,
        notes: notes
    };

    const isEdit = !!id;
    if (isEdit) payload.id = parseInt(id, 10);
    const endpoint = isEdit ? `${API_BASE}/programs/update` : `${API_BASE}/programs/add`;

    const saveBtn = document.getElementById('btn-save-program');
    if (saveBtn) saveBtn.disabled = true;

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!res.ok) {
            alert(`Error: ${result.error || 'Failed to save program'}`);
            return;
        }

        closeProgramModal();
        await loadPrograms();
    } catch (err) {
        alert(`Request failed: ${err.message}`);
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

async function deleteProgram(id, name) {
    if (!confirm(`Are you sure you want to delete the program "${name}"?`)) return;

    try {
        const res = await fetch(`${API_BASE}/programs/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const result = await res.json();
        if (!res.ok) {
            alert(`Error: ${result.error || 'Failed to delete program'}`);
            return;
        }

        await loadPrograms();
    } catch (err) {
        alert(`Delete failed: ${err.message}`);
    }
}

// Auto-suggest PIs from selected university in modal
async function suggestPIsForModal() {
    const uniSelect = document.getElementById('prog-university');
    const uniId = uniSelect ? uniSelect.value : null;
    if (!uniId) {
        alert('Please select a university first.');
        return;
    }

    const selectedUni = allUniversities.find(u => u.id == uniId);
    if (!selectedUni) return;

    try {
        const res = await fetch(`${API_BASE}/researchers?universities=${encodeURIComponent(selectedUni.name)}`);
        const researchers = await res.json();

        if (!researchers || researchers.length === 0) {
            alert(`No researchers found in database for ${selectedUni.name}.`);
            return;
        }

        const facultyInput = document.getElementById('prog-faculty');
        const currentFaculty = (facultyInput.value || '').trim();
        const piNames = researchers.slice(0, 6).map(r => r.Name).filter(Boolean);
        const combined = currentFaculty ? `${currentFaculty}, ${piNames.join(', ')}` : piNames.join(', ');
        facultyInput.value = combined;
    } catch (err) {
        alert(`Failed to fetch PIs: ${err.message}`);
    }
}

// --- CSV Export ---
function exportProgramsCSV() {
    if (allPrograms.length === 0) {
        alert('No programs to export.');
        return;
    }

    const headers = [
        'ID', 'University', 'Country', 'Program Name', 'Degree', 'Department',
        'Status', 'Deadline', 'Application Fee', 'GRE', 'English Requirement',
        'Portal URL', 'Target Faculty', 'Notes', 'Affiliated PIs Count'
    ];

    const rows = allPrograms.map(p => [
        p.id,
        `"${(p.university_name || '').replace(/"/g, '""')}"`,
        `"${(p.university_country || '').replace(/"/g, '""')}"`,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.degree || '').replace(/"/g, '""')}"`,
        `"${(p.department || '').replace(/"/g, '""')}"`,
        `"${(p.status || '').replace(/"/g, '""')}"`,
        `"${(p.deadline || '').replace(/"/g, '""')}"`,
        `"${(p.app_fee || '').replace(/"/g, '""')}"`,
        `"${(p.gre_requirement || '').replace(/"/g, '""')}"`,
        `"${(p.english_requirement || '').replace(/"/g, '""')}"`,
        `"${(p.portal_url || '').replace(/"/g, '""')}"`,
        `"${(p.faculty_match || '').replace(/"/g, '""')}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
        p.affiliated_pi_count || 0
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `Find_Your_Advisor_Programs_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Institution Management System (Reused for modal) ---
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
    if (isEdit) payload.id = parseInt(id, 10);
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
        await loadUniversities();
    } catch (err) {
        alert(`Request failed: ${err.message}`);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function deleteInstitution(id, name, piCount) {
    let confirmMsg = `Are you sure you want to delete "${name}"?`;
    if (piCount > 0) {
        confirmMsg = `Are you sure you want to delete "${name}"?\\n\\n⚠️ WARNING: There are ${piCount} researcher(s) affiliated with this institution. They will be unlinked (their profiles will be kept, but institution cleared).`;
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

        await loadInstitutionsTable();
        await loadUniversities();
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

// --- Helper Functions ---
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeJs(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
