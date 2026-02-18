// Domain Hunter Pro — Frontend JS
const API = '/api';
let selectedGenType = 'geo';
let selectedGeoLocation = null;
let geoSearchTimeout = null;
let currentPopFilter = 0;

// ── Navigation ──────────────────────────────────────────────────
function navigate(page) {
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    event.currentTarget.classList.add('active');
    const el = document.getElementById(`${page}-page`);
    if (el) el.classList.add('active');
    if (page === 'monitoring')      loadMonitoring();
    else if (page === 'profit')     { loadSales(); loadProfitAnalytics('month'); }
    else if (page === 'portfolio')  loadPortfolio();
    else if (page === 'settings')   loadConfig();
    else if (page === 'dashboard')  refreshStats();
    else if (page === 'expiring')   loadExpiring(30);
    event.preventDefault();
    return false;
}

function selectGenType(type) {
    selectedGenType = type;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(`opt-${type}`);
    if (el) el.classList.add('active');
}

// ── GeoNames Location Search ────────────────────────────────────
let currentPopFilter = 0;

function setPopulationFilter(minPop) {
    currentPopFilter = minPop;
    document.querySelectorAll('#populationFilter button').forEach(btn => {
        btn.style.background = 'rgba(229,231,235,0.5)';
        btn.style.color = '#6b7280';
        btn.style.border = '1px solid #e5e7eb';
    });
    const activeBtn = document.querySelector(`#populationFilter button[data-pop="${minPop}"]`);
    if (activeBtn) {
        activeBtn.style.background = 'rgba(16,185,129,0.15)';
        activeBtn.style.color = '#059669';
        activeBtn.style.border = '1px solid #10b981';
    }
    const query = document.getElementById('geoSearchInput').value.trim();
    if (query.length >= 2) handleGeoSearch(query);
}

function handleGeoSearch(query) {
    clearTimeout(geoSearchTimeout);
    if (!query || query.trim().length < 2) {
        document.getElementById('geoSearchDropdown').style.display = 'none';
        return;
    }
    geoSearchTimeout = setTimeout(() => {
        const geoType = document.querySelector('input[name="geoType"]:checked').value;
        searchGeoNames(query.trim(), geoType);
    }, 400);
}

async function searchGeoNames(query, type) {
    try {
        let url = `${API}/geonames/search?q=${encodeURIComponent(query)}&type=${type}`;
        if (type === 'cities' && currentPopFilter > 0) {
            url += `&minPopulation=${currentPopFilter}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            renderGeoResults(data.results, type);
        } else {
            const dropdown = document.getElementById('geoSearchDropdown');
            dropdown.innerHTML = '<div style="padding:15px;text-align:center;color:#9ca3af;">No results found</div>';
            dropdown.style.display = 'block';
        }
    } catch (err) {
        console.error('GeoNames search error:', err);
    }
}

function renderGeoResults(results, type) {
    const dropdown = document.getElementById('geoSearchDropdown');
    dropdown.innerHTML = results.map(r => {
        const safeName = r.name.replace(/'/g, "\\'");
        const safeCountry = (r.country || '').replace(/'/g, "\\'");
        const safeCode = (r.countryCode || '').replace(/'/g, "\\'");
        const popText = r.population > 0 ? `👥 ${(r.population / 1000).toFixed(0)}k` : '';
        
        if (type === 'countries') {
            return `<div onclick="loadCountryCities('${safeCode}', '${safeName}')" style="padding:12px 15px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;" onmouseover="this.style.background='rgba(16,185,129,0.08)'" onmouseout="this.style.background='transparent'">
                <div>
                    <strong style="color:#1e293b;">${r.name}</strong>
                    <span style="color:#6b7280;font-size:13px;margin-left:8px;">🌍 ${r.countryCode}</span>
                </div>
                <i class="fas fa-chevron-right" style="color:#9ca3af;font-size:12px;"></i>
            </div>`;
        } else {
            return `<div onclick="selectGeoLocation('${safeName}', '${safeCountry}')" style="padding:12px 15px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;" onmouseover="this.style.background='rgba(16,185,129,0.08)'" onmouseout="this.style.background='transparent'">
                <div>
                    <strong style="color:#1e293b;">${r.name}</strong>
                    <span style="color:#6b7280;font-size:13px;margin-left:8px;">${r.country ? `🌍 ${r.country}` : ''}</span>
                </div>
                <span style="font-size:12px;color:#9ca3af;background:rgba(0,0,0,0.05);padding:3px 8px;border-radius:6px;">${popText}</span>
            </div>`;
        }
    }).join('');
    dropdown.style.display = 'block';
}

async function loadAllCountries() {
    try {
        const res = await fetch(`${API}/geonames/countries`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const dropdown = document.getElementById('geoSearchDropdown');
            dropdown.innerHTML = '<div style="padding:10px 15px;background:rgba(16,185,129,0.1);border-bottom:2px solid #10b981;font-weight:700;color:#059669;">🌍 All Countries (click to see cities)</div>' + 
                data.results.map(r => {
                    const safeName = r.name.replace(/'/g, "\\'");
                    const safeCode = r.countryCode.replace(/'/g, "\\'");
                    return `<div onclick="loadCountryCities('${safeCode}', '${safeName}')" style="padding:12px 15px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;" onmouseover="this.style.background='rgba(16,185,129,0.08)'" onmouseout="this.style.background='transparent'">
                        <strong style="color:#1e293b;">${r.name}</strong>
                        <span style="font-size:12px;color:#9ca3af;background:rgba(0,0,0,0.05);padding:3px 8px;border-radius:6px;">${r.countryCode}</span>
                        <i class="fas fa-chevron-right" style="color:#9ca3af;font-size:12px;margin-left:8px;"></i>
                    </div>`;
                }).join('');
            dropdown.style.display = 'block';
        }
    } catch (err) {
        console.error('Load countries error:', err);
    }
}

async function loadCountryCities(countryCode, countryName) {
    try {
        const res = await fetch(`${API}/geonames/country/${countryCode}/cities`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const dropdown = document.getElementById('geoSearchDropdown');
            dropdown.innerHTML = `<div style="padding:10px 15px;background:rgba(16,185,129,0.1);border-bottom:2px solid #10b981;display:flex;align-items:center;justify-content:space-between;">
                <div>
                    <button onclick="loadAllCountries();event.stopPropagation();" style="background:none;border:none;cursor:pointer;color:#059669;font-size:14px;margin-right:10px;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <strong style="color:#059669;">🏙️ Major Cities in ${countryName}</strong>
                </div>
            </div>` + 
                data.results.map(r => {
                    const safeName = r.name.replace(/'/g, "\\'");
                    const safeCountry = countryName.replace(/'/g, "\\'");
                    const popText = r.population > 0 ? `👥 ${(r.population / 1000).toFixed(0)}k` : '';
                    return `<div onclick="selectGeoLocation('${safeName}', '${safeCountry}')" style="padding:12px 15px;cursor:pointer;border-bottom:1px solid #f3f4f6;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;" onmouseover="this.style.background='rgba(16,185,129,0.08)'" onmouseout="this.style.background='transparent'">
                        <strong style="color:#1e293b;">${r.name}</strong>
                        <span style="font-size:12px;color:#9ca3af;background:rgba(0,0,0,0.05);padding:3px 8px;border-radius:6px;">${popText}</span>
                    </div>`;
                }).join('');
            dropdown.style.display = 'block';
        }
    } catch (err) {
        console.error('Load country cities error:', err);
    }
}

function handleCountryMode() {
    document.getElementById('geoSearchInput').value = '';
    document.getElementById('geoSearchDropdown').style.display = 'none';
}

function selectGeoLocation(name, country) {
    selectedGeoLocation = { name, country };
    const badge = document.getElementById('selectedLocationBadge');
    const text = document.getElementById('selectedLocationText');
    text.textContent = `📍 ${name}${country ? `, ${country}` : ''}`;
    badge.style.display = 'block';
    document.getElementById('geoSearchInput').value = '';
    document.getElementById('geoSearchDropdown').style.display = 'none';
    showToast(`✅ Selected: ${name}${country ? `, ${country}` : ''}`, 'success');
}

function clearSelectedLocation() {
    selectedGeoLocation = null;
    document.getElementById('selectedLocationBadge').style.display = 'none';
    document.getElementById('geoSearchInput').value = '';
}

function clearGeoSearch() {
    document.getElementById('geoSearchInput').value = '';
    document.getElementById('geoSearchDropdown').style.display = 'none';
    currentPopFilter = 0;
    setPopulationFilter(0);
}

// ── Custom TLD manager ──────────────────────────────────────────
const customTLDs = new Set();

function addCustomTLD() {
    const input = document.getElementById('customTldInput');
    let val = input.value.trim().toLowerCase();
    if (!val) return;
    if (!val.startsWith('.')) val = '.' + val;
    if (!/^\.[a-z]{2,24}$/.test(val)) {
        alert(`⚠️ "${val}" is not a valid TLD. Use letters only, e.g. .es, .realty, .global`);
        return;
    }
    if (customTLDs.has(val)) { alert(`"${val}" is already in the list.`); return; }
    customTLDs.add(val);
    renderCustomTLDs();
    input.value = '';
    input.focus();
}

function removeCustomTLD(val) {
    customTLDs.delete(val);
    renderCustomTLDs();
}

function renderCustomTLDs() {
    const container = document.getElementById('customTldList');
    if (customTLDs.size === 0) {
        container.innerHTML = '<span style="color:#9ca3af;font-size:13px;">No custom TLDs added yet</span>';
        return;
    }
    container.innerHTML = Array.from(customTLDs).map(tld =>
        `<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(99,102,241,0.15);border:1px solid #818cf8;border-radius:20px;padding:4px 12px;font-size:13px;color:#6366f1;font-weight:600;">
            ${tld}
            <button onclick="removeCustomTLD('${tld}')" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;line-height:1;padding:0;">×</button>
        </span>`
    ).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const ctInput = document.getElementById('customTldInput');
    if (ctInput) ctInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTLD(); } });
    renderCustomTLDs();
    refreshStats();
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('saleBuyDate'))  document.getElementById('saleBuyDate').value  = today;
    if (document.getElementById('saleSellDate')) document.getElementById('saleSellDate').value = today;
    
    // Close GeoNames dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('geoSearchDropdown');
        const input = document.getElementById('geoSearchInput');
        if (dropdown && input && !input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
    
    console.log('🎯 Domain Hunter Pro initialized');
});

// ── Stats ───────────────────────────────────────────────────────
async function refreshStats() {
    try {
        const res   = await fetch(`${API}/stats`);
        const stats = await res.json();
        document.getElementById('totalScans').textContent       = stats.totalScans       || 0;
        document.getElementById('availableDomains').textContent = stats.availableDomains || 0;
        document.getElementById('expiring7').textContent        = stats.expiring7        || 0;
        document.getElementById('premiumDomains').textContent   = stats.premiumDomains   || 0;
        document.getElementById('totalProfit').textContent      = `$${(stats.totalProfit   || 0).toFixed(0)}`;
        document.getElementById('totalRevenue').textContent     = `$${(stats.totalRevenue  || 0).toFixed(0)}`;
        document.getElementById('totalInvested').textContent    = `$${(stats.totalInvested || 0).toFixed(0)}`;
        document.getElementById('totalROI').textContent         = `${(stats.totalROI       || 0).toFixed(1)}%`;
        document.getElementById('monitorBadge').textContent     = stats.totalMonitored    || 0;
        document.getElementById('expiringBadge').textContent    = stats.expiring30        || 0;

        // Load top 3 next expiring - make them clickable
        const expRes = await fetch(`${API}/expiring?maxDays=365`);
        const expData = await expRes.json();
        const top3 = (expData.expiring || []).slice(0, 3);
        const container = document.getElementById('nextExpiringList');
        if (top3.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:40px;grid-column:1/-1;"><i class="fas fa-check-circle" style="font-size:48px;margin-bottom:15px;display:block;"></i>No domains expiring soon</div>';
        } else {
            container.innerHTML = top3.map(d => {
                const days = d.daysLeft !== null ? d.daysLeft : '?';
                const expDate = d.expirationDate ? new Date(d.expirationDate).toLocaleDateString() : 'N/A';
                const color = days <= 7 ? '#ef4444' : days <= 30 ? '#f59e0b' : '#10b981';
                return `<div class="domain-card-clickable" onclick="document.querySelector('.menu-item[onclick*=\\"expiring\\"]').click()" style="background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));backdrop-filter:blur(10px);padding:20px;border-radius:16px;box-shadow:0 5px 20px rgba(0,0,0,0.1);border-left:4px solid ${color};">
                    <div style="font-size:14px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📍 Domain</div>
                    <div style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:12px;word-break:break-all;">${d.domain}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <span style="font-size:13px;color:#6b7280;">Days Left:</span>
                        <span style="font-size:24px;font-weight:800;color:${color};">${days}d</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;">
                        <span>📅 Expires: ${expDate}</span>
                        <span>🏛️ ${d.registrar || 'N/A'}</span>
                    </div>
                </div>`;
            }).join('');
        }
    } catch (err) { console.error('Stats error:', err); }
}
setInterval(refreshStats, 30000);

// ── Generator ───────────────────────────────────────────────────
async function generateDomains() {
    const keywords    = document.getElementById('genKeywords').value.trim();
    const count       = parseInt(document.getElementById('genCount').value) || 20;
    const useLLM      = document.getElementById('useLLM').checked;
    const checkboxTLDs= Array.from(document.querySelectorAll('.tld-checkbox:checked')).map(c => c.value);
    const tlds        = [...new Set([...checkboxTLDs, ...Array.from(customTLDs)])];
    const minLength   = parseInt(document.getElementById('minLength').value)   || 4;
    const maxLength   = parseInt(document.getElementById('maxLength').value)   || 30;
    const allowNumbers= document.getElementById('allowNumbers').checked;
    const allowHyphens= document.getElementById('allowHyphens').checked;

    if (tlds.length === 0) { alert('⚠️ Please select at least one TLD extension'); return; }
    
    // Build keywords array: user keywords + geo location
    let kwArray = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    if (selectedGeoLocation && selectedGeoLocation.name) {
        kwArray.push(selectedGeoLocation.name.toLowerCase());
    }
    
    if (kwArray.length === 0) {
        const go = confirm('⚠️ No keywords or location entered — the generator will use generic words.\nFor better results, enter a keyword like "loyer" or select a location.\n\nContinue anyway?');
        if (!go) return;
    }

    const generateBtn  = document.getElementById('generateBtn');
    const progressDiv  = document.getElementById('generationProgress');
    const progressText = document.getElementById('generationProgressText');
    generateBtn.disabled      = true;
    progressDiv.style.display = 'block';
    
    if (selectedGeoLocation) {
        progressText.textContent = `🗺️ Generating geo-targeted domains for ${selectedGeoLocation.name}...`;
    } else {
        progressText.textContent = useLLM ? '🤖 Asking AI to generate domains... (may take 10-30s)' : '⚡ Building keyword-based domain names...';
    }

    try {
        const res  = await fetch(`${API}/generate-domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: selectedGenType, 
                keywords: kwArray.join(','), 
                count, 
                useLLM, 
                tlds, 
                minLength, 
                maxLength, 
                allowNumbers, 
                allowHyphens,
                geoLocation: selectedGeoLocation 
            })
        });
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
            document.getElementById('domainInput').value = data.domains.join('\n');
            let msg = data.usedLLM ? `🤖 AI generated ${data.count} domains!` : `⚡ Generated ${data.count} domains!`;
            if (selectedGeoLocation) msg += ` (geo-targeted for ${selectedGeoLocation.name})`;
            alert(`${msg} Switching to Scanner...`);
            document.querySelector('.menu-item[onclick*="scanner"]').click();
        } else {
            alert('❌ Failed to generate domains. Try different keywords or relax the length filters.');
        }
    } catch (err) {
        console.error('Generate error:', err);
        alert('❌ Error generating domains. Is the server running?');
    } finally {
        generateBtn.disabled      = false;
        progressDiv.style.display = 'none';
    }
}

// ── Scanner ─────────────────────────────────────────────────────
async function checkDomains() {
    const input = document.getElementById('domainInput').value.trim();
    if (!input) { alert('⚠️ Please enter domains to check'); return; }
    const domains = input.split('\n').map(d => d.trim()).filter(d => d);
    if (domains.length === 0) { alert('⚠️ No valid domains found'); return; }

    const checkBtn     = document.getElementById('checkBtn');
    const scanProgress = document.getElementById('scanProgress');
    const scanText     = document.getElementById('scanProgressText');
    checkBtn.disabled          = true;
    scanProgress.style.display = 'block';
    scanText.textContent       = `Checking ${domains.length} domain(s)... (≈${Math.ceil(domains.length * 0.5)}s)`;

    try {
        const res  = await fetch(`${API}/check-domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domains })
        });
        const data = await res.json();
        displayResults(data.results, 'scanResults');
        refreshStats();
    } catch (err) {
        console.error('Check error:', err);
        alert('❌ Error checking domains. Is the server running?');
    } finally {
        checkBtn.disabled          = false;
        scanProgress.style.display = 'none';
    }
}

async function uploadFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res  = await fetch(`${API}/upload-domains`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
            alert(`✅ Loaded ${data.count} domains from file`);
            document.getElementById('domainInput').value = data.domains.join('\n');
        } else {
            alert('❌ No domains found in file');
        }
    } catch { alert('❌ Error uploading file'); }
}

function displayResults(results, containerId) {
    const container = document.getElementById(containerId);
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No results yet</p></div>';
        return;
    }
    let html = `<table>
        <thead><tr>
            <th>Domain</th><th>Status</th><th>Registrar</th>
            <th>Expiration</th><th>Days Left</th><th>Method</th><th>Action</th>
        </tr></thead><tbody>`;
    results.forEach(r => {
        const status = r.available === true
            ? '<span class="badge badge-success">✓ Available</span>'
            : r.available === null
                ? '<span class="badge" style="background:#9ca3af">? Unknown</span>'
                : '<span class="badge badge-danger">✗ Taken</span>';
        const exp  = r.expirationDate ? new Date(r.expirationDate).toLocaleDateString() : 'N/A';
        const days = (r.daysLeft !== null && r.daysLeft !== undefined) ? r.daysLeft + 'd' : 'N/A';
        const dCls = r.daysLeft !== null && r.daysLeft < 30 ? 'color:#ef4444;font-weight:700' : '';
        const safeD = r.domain.replace(/'/g, "\\'");
        html += `<tr>
            <td><strong>${r.domain}</strong></td>
            <td>${status}</td>
            <td>${r.registrar || 'N/A'}</td>
            <td>${exp}</td>
            <td style="${dCls}">${days}</td>
            <td><span style="font-size:11px;color:#6b7280;">${r.method || 'dns'}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="addToMonitoring('${safeD}')">
                    <i class="fas fa-eye"></i> Monitor
                </button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function addToMonitoring(domain) {
    try {
        const res  = await fetch(`${API}/monitoring`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        });
        const data = await res.json();
        if (data.success) {
            const msg = data.alreadyExists ? `ℹ️ "${domain}" is already in monitoring.` : `✅ "${domain}" added to monitoring!`;
            showToast(msg, data.alreadyExists ? 'info' : 'success');
            refreshStats();
        }
    } catch (err) {
        showToast('❌ Error adding to monitoring', 'error');
    }
}

// ── Monitoring ──────────────────────────────────────────────────
async function loadMonitoring() {
    try {
        const keyword   = document.getElementById('monitorKeyword')?.value   || '';
        const available = document.getElementById('monitorAvailable')?.value || '';
        const registrar = document.getElementById('monitorRegistrar')?.value || '';
        const params    = new URLSearchParams();
        if (keyword)   params.append('keyword',   keyword);
        if (available) params.append('available', available);
        if (registrar) params.append('registrar', registrar);
        const res  = await fetch(`${API}/monitoring/filter?${params}`);
        const data = await res.json();
        displayMonitoring(data.monitoring || data);
    } catch {
        document.getElementById('monitoringResults').innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
    }
}

function applyMonitorFilters() { loadMonitoring(); }

function clearMonitorFilters() {
    ['monitorKeyword','monitorRegistrar'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('monitorAvailable').value = '';
    loadMonitoring();
}

async function removeAllMonitoring() {
    if (!confirm('⚠️ Remove ALL monitored domains?\n\nThis will delete all domains from monitoring. This action cannot be undone.')) return;
    try {
        const res = await fetch(`${API}/monitoring/all`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast(`🗑️ Removed ${data.count} domain(s) from monitoring`, 'success');
            loadMonitoring();
            refreshStats();
        } else {
            showToast('❌ Could not remove all: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch {
        showToast('❌ Error removing all domains', 'error');
    }
}

function displayMonitoring(monitoring) {
    const container = document.getElementById('monitoringResults');
    if (!monitoring || monitoring.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-eye-slash"></i><p>No monitored domains yet. Scan some domains or add them via the Scanner!</p></div>';
        return;
    }
    let html = `<table>
        <thead><tr>
            <th>Domain</th><th>Status</th><th>Registrar</th>
            <th>Expiration</th><th>Days Left</th><th>Method</th><th>Last Checked</th><th>Action</th>
        </tr></thead><tbody>`;
    monitoring.forEach(m => {
        const status = m.available === true
            ? '<span class="badge badge-success">✓ Available</span>'
            : '<span class="badge badge-danger">✗ Taken</span>';
        const exp  = m.expirationDate ? new Date(m.expirationDate).toLocaleDateString() : 'N/A';
        const days = (m.daysLeft !== null && m.daysLeft !== undefined) ? m.daysLeft + 'd' : 'N/A';
        const last = m.lastChecked ? new Date(m.lastChecked).toLocaleString() : 'N/A';
        const safeD = m.domain.replace(/'/g, "\\'");
        html += `<tr>
            <td><strong>${m.domain}</strong></td>
            <td>${status}</td>
            <td>${m.registrar || 'N/A'}</td>
            <td>${exp}</td>
            <td>${days}</td>
            <td><span style="font-size:11px;color:#6b7280">${m.method || 'dns'}</span></td>
            <td><small>${last}</small></td>
            <td>
                <button class="btn" style="padding:4px 10px;font-size:12px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;cursor:pointer;" onclick="removeFromMonitoring('${safeD}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function removeFromMonitoring(domain) {
    if (!confirm(`Remove "${domain}" from monitoring?`)) return;
    try {
        const res = await fetch(`${API}/monitoring/${encodeURIComponent(domain)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast(`🗑️ "${domain}" removed from monitoring`, 'success');
            loadMonitoring();
            refreshStats();
        } else {
            showToast('❌ Could not remove: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch { showToast('❌ Error removing domain', 'error'); }
}

// ── Expiring Domains ────────────────────────────────────────────
async function loadExpiring(maxDays) {
    try {
        const res  = await fetch(`${API}/expiring?maxDays=${maxDays}`);
        const data = await res.json();
        displayExpiring(data.expiring || []);
    } catch {
        document.getElementById('expiringResults').innerHTML = '<div class="empty-state"><p>Failed to load expiring domains</p></div>';
    }
}

function applyExpiringFilter() {
    const custom = parseInt(document.getElementById('customExpDays').value);
    if (custom && custom > 0) {
        loadExpiring(custom);
    } else {
        alert('⚠️ Please enter a valid number of days');
    }
}

function displayExpiring(domains) {
    const container = document.getElementById('expiringResults');
    if (!domains || domains.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle" style="color:#10b981;"></i><p>No domains expiring in this range</p></div>';
        return;
    }
    let html = `<table>
        <thead><tr>
            <th>Domain</th><th>Status</th><th>Registrar</th>
            <th>Expiration</th><th>Days Left</th><th>Method</th>
        </tr></thead><tbody>`;
    domains.forEach(d => {
        const status = d.available === true
            ? '<span class="badge badge-success">✓ Available</span>'
            : '<span class="badge badge-danger">✗ Taken</span>';
        const exp  = d.expirationDate ? new Date(d.expirationDate).toLocaleDateString() : 'N/A';
        const days = d.daysLeft !== null ? d.daysLeft : '?';
        const daysColor = days <= 7 ? '#ef4444' : days <= 30 ? '#f59e0b' : '#10b981';
        html += `<tr>
            <td><strong>${d.domain}</strong></td>
            <td>${status}</td>
            <td>${d.registrar || 'N/A'}</td>
            <td>${exp}</td>
            <td style="color:${daysColor};font-weight:800;font-size:16px;">${days}d</td>
            <td><span style="font-size:11px;color:#6b7280;">${d.method || 'dns'}</span></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ── Portfolio ───────────────────────────────────────────────────
async function loadPortfolio() {
    try { const res = await fetch(`${API}/portfolio`); displayPortfolio(await res.json()); } catch {}
}

function displayPortfolio(portfolio) {
    const container = document.getElementById('portfolioList');
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i><p>Portfolio is empty</p></div>';
        return;
    }
    let html = `<table>
        <thead><tr>
            <th>Domain</th><th>Price</th><th>Registrar</th><th>Notes</th><th>Added</th><th>Action</th>
        </tr></thead><tbody>`;
    portfolio.forEach(p => {
        const date  = new Date(p.dateAdded).toLocaleDateString();
        const safeId = p.id.replace(/'/g, "\\'");
        html += `<tr>
            <td><strong>${p.domain}</strong></td>
            <td>$${p.price}</td>
            <td>${p.registrar || 'N/A'}</td>
            <td>${p.notes || '-'}</td>
            <td>${date}</td>
            <td>
                <button class="btn" style="padding:4px 10px;font-size:12px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;cursor:pointer;" onclick="removeFromPortfolio('${safeId}')">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function addToPortfolio() {
    const domain    = document.getElementById('portfolioDomain').value.trim();
    const price     = parseFloat(document.getElementById('portfolioPrice').value);
    const registrar = document.getElementById('portfolioRegistrar').value.trim();
    const notes     = document.getElementById('portfolioNotes').value.trim();
    if (!domain || !price) { alert('⚠️ Please fill domain and price'); return; }
    try {
        await fetch(`${API}/portfolio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, price, registrar, notes }) });
        ['portfolioDomain','portfolioPrice','portfolioRegistrar','portfolioNotes'].forEach(id => document.getElementById(id).value = '');
        showToast('✅ Added to portfolio!', 'success');
        loadPortfolio();
    } catch { alert('❌ Error adding to portfolio'); }
}

async function removeFromPortfolio(id) {
    if (!confirm('Remove this domain from portfolio?')) return;
    try {
        const res  = await fetch(`${API}/portfolio/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast(`🗑️ Removed from portfolio`, 'success');
            loadPortfolio();
            refreshStats();
        } else {
            showToast('❌ Could not remove: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch { showToast('❌ Error removing from portfolio', 'error'); }
}

// ── Sales / Profit ──────────────────────────────────────────────
async function addSale() {
    const domain    = document.getElementById('saleDomain').value.trim();
    const buyPrice  = parseFloat(document.getElementById('saleBuyPrice').value);
    const sellPrice = parseFloat(document.getElementById('saleSellPrice').value);
    const buyDate   = document.getElementById('saleBuyDate').value;
    const sellDate  = document.getElementById('saleSellDate').value;
    const notes     = document.getElementById('saleNotes').value.trim();
    if (!domain || !buyPrice || !sellPrice) { alert('⚠️ Please fill domain, buy price, and sell price'); return; }
    try {
        await fetch(`${API}/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, buyPrice, sellPrice, buyDate, sellDate, notes }) });
        ['saleDomain','saleBuyPrice','saleSellPrice','saleNotes'].forEach(id => document.getElementById(id).value = '');
        showToast('✅ Sale added!', 'success');
        loadSales();
        refreshStats();
    } catch { alert('❌ Error adding sale'); }
}
async function loadSales() {
    try { const res = await fetch(`${API}/sales`); displaySales(await res.json()); } catch {}
}
function displaySales(sales) {
    const container = document.getElementById('salesList');
    if (!sales || sales.length === 0) { container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>No sales yet</p></div>'; return; }
    let html = '<table><thead><tr><th>Domain</th><th>Buy</th><th>Sell</th><th>Profit</th><th>ROI</th><th>Date</th></tr></thead><tbody>';
    sales.forEach(s => {
        const profit = (s.sellPrice - s.buyPrice).toFixed(2);
        const roi    = s.buyPrice > 0 ? (((s.sellPrice - s.buyPrice) / s.buyPrice) * 100).toFixed(1) : 0;
        const cls    = profit >= 0 ? 'badge-success' : 'badge-danger';
        const date   = s.sellDate ? new Date(s.sellDate).toLocaleDateString() : 'N/A';
        html += `<tr><td><strong>${s.domain}</strong></td><td>$${parseFloat(s.buyPrice).toFixed(2)}</td><td>$${parseFloat(s.sellPrice).toFixed(2)}</td><td><span class="badge ${cls}">$${profit}</span></td><td><span class="badge ${cls}">${roi}%</span></td><td>${date}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}
async function loadProfitAnalytics(period) {
    try {
        if (event && event.currentTarget) {
            document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
            event.currentTarget.classList.add('active');
        }
        const res  = await fetch(`${API}/analytics/profit?period=${period}`);
        const data = await res.json();
        document.getElementById('profitAnalytics').innerHTML = `
            <div class="profit-cards">
                <div class="profit-card"><div class="profit-header"><i class="fas fa-shopping-cart"></i><span>Sales</span></div><div class="profit-amount">${data.totalSales||0}</div></div>
                <div class="profit-card"><div class="profit-header"><i class="fas fa-dollar-sign"></i><span>Profit</span></div><div class="profit-amount">$${(data.totalProfit||0).toFixed(2)}</div></div>
                <div class="profit-card"><div class="profit-header"><i class="fas fa-chart-bar"></i><span>Avg Profit</span></div><div class="profit-amount">$${(data.averageProfit||0).toFixed(2)}</div></div>
                <div class="profit-card"><div class="profit-header"><i class="fas fa-percentage"></i><span>Avg ROI</span></div><div class="profit-amount">${(data.averageProfitPercent||0).toFixed(1)}%</div></div>
            </div>`;
    } catch {}
}

// ── Config / Settings ───────────────────────────────────────────
async function loadConfig() {
    try {
        const res    = await fetch(`${API}/config`);
        const config = await res.json();
        document.getElementById('llmProvider').value = config.llm?.provider || 'local';
        updateLLMProvider();
        const local = config.llm?.local || {};
        if (document.getElementById('localEnabled'))  document.getElementById('localEnabled').checked   = local.enabled  || false;
        if (document.getElementById('localModel'))    document.getElementById('localModel').value        = local.model    || 'qwen2.5:3b';
        if (document.getElementById('localEndpoint')) document.getElementById('localEndpoint').value     = local.endpoint || 'http://localhost:11434/api/generate';
        ['openai','claude','perplexity','grok'].forEach(p => {
            const cfg = config.llm?.[p] || {};
            const e = document.getElementById(`${p}Enabled`); if (e) e.checked = cfg.enabled || false;
            const k = document.getElementById(`${p}Key`);     if (k) k.value   = cfg.apiKey  || '';
            const m = document.getElementById(`${p}Model`);   if (m && cfg.model) m.value = cfg.model;
        });
    } catch (err) { console.error('Load config error:', err); }
}
function updateLLMProvider() {
    const p = document.getElementById('llmProvider').value;
    document.querySelectorAll('.llm-config').forEach(c => c.style.display = 'none');
    const el = document.getElementById(`${p}Config`);
    if (el) el.style.display = 'block';
    const r = document.getElementById('connectionTestResult'); if (r) r.style.display = 'none';
}
async function saveConfig() {
    const cfg = {
        llm: {
            provider:   document.getElementById('llmProvider').value,
            local:      { enabled: document.getElementById('localEnabled').checked,      model: document.getElementById('localModel').value,      endpoint: document.getElementById('localEndpoint').value },
            openai:     { enabled: document.getElementById('openaiEnabled').checked,     apiKey: document.getElementById('openaiKey').value,      model: document.getElementById('openaiModel').value },
            claude:     { enabled: document.getElementById('claudeEnabled').checked,     apiKey: document.getElementById('claudeKey').value,      model: document.getElementById('claudeModel').value },
            perplexity: { enabled: document.getElementById('perplexityEnabled').checked, apiKey: document.getElementById('perplexityKey').value,  model: document.getElementById('perplexityModel').value },
            grok:       { enabled: document.getElementById('grokEnabled').checked,       apiKey: document.getElementById('grokKey').value,        model: document.getElementById('grokModel').value }
        }
    };
    try { await fetch(`${API}/config`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(cfg) }); showToast('✅ Config saved!', 'success'); } catch { alert('❌ Save failed'); }
}
async function testConnection(provider) {
    const resultDiv = document.getElementById('connectionTestResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="padding:12px;background:rgba(59,130,246,0.1);border-radius:8px;"><i class="fas fa-spinner fa-spin"></i> Testing...</div>';
    try {
        let config = {};
        if (provider === 'local')           config = { provider, endpoint: document.getElementById('localEndpoint').value, model: document.getElementById('localModel').value };
        else if (provider === 'openai')     config = { provider, apiKey: document.getElementById('openaiKey').value,      model: document.getElementById('openaiModel').value };
        else if (provider === 'claude')     config = { provider, apiKey: document.getElementById('claudeKey').value,      model: document.getElementById('claudeModel').value };
        else if (provider === 'perplexity') config = { provider, apiKey: document.getElementById('perplexityKey').value,  model: document.getElementById('perplexityModel').value };
        else if (provider === 'grok')       config = { provider, apiKey: document.getElementById('grokKey').value,        model: document.getElementById('grokModel').value };
        const res  = await fetch(`${API}/test-llm-connection`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(config) });
        const data = await res.json();
        if (data.success) {
            resultDiv.innerHTML = `<div style="padding:12px;background:rgba(16,185,129,0.1);border-left:4px solid #10b981;border-radius:8px;"><strong style="color:#10b981;">✅ Connected!</strong> ${data.message}${data.latency ? ` (${data.latency}ms)` : ''}</div>`;
        } else {
            resultDiv.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.1);border-left:4px solid #ef4444;border-radius:8px;"><strong style="color:#ef4444;">❌ Failed:</strong> ${data.error || 'Connection error'}</div>`;
        }
        setTimeout(() => { resultDiv.style.display = 'none'; }, 10000);
    } catch (err) {
        resultDiv.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.1);border-radius:8px;"><strong style="color:#ef4444;">⚠️ Error:</strong> ${err.message}</div>`;
    }
}

// ── Toast notification ──────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();
    const colors = {
        success: { bg: 'rgba(16,185,129,0.95)', border: '#10b981' },
        info:    { bg: 'rgba(59,130,246,0.95)',  border: '#3b82f6' },
        error:   { bg: 'rgba(239,68,68,0.95)',   border: '#ef4444' }
    };
    const c = colors[type] || colors.success;
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position:fixed;bottom:28px;right:28px;z-index:9999;
        background:${c.bg};border-left:4px solid ${c.border};
        color:#fff;padding:14px 20px;border-radius:10px;
        font-size:14px;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,0.3);
        animation:slideInRight 0.3s ease;max-width:360px;`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}
