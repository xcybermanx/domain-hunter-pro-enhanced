// Domain Hunter Pro — Frontend JS v3.0
const API = '/api';
let selectedGenType = 'business';
let currentUser = null;

// ── Authentication ──────────────────────────────────
function checkAuth() {
    fetch(`${API}/auth/me`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(user => {
            currentUser = user;
            document.getElementById('currentUsername').textContent = user.username;
            document.getElementById('mainApp').style.display = 'flex';
            document.getElementById('authModal').style.display = 'none';
            refreshStats();
        })
        .catch(() => {
            document.getElementById('authModal').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
        });
}

function showLoginForm() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('registerForm').classList.add('active');
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return alert('⚠️ Please fill all fields');
    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Login successful!', 'success');
            checkAuth();
        } else {
            alert('❌ ' + (data.error || 'Login failed'));
        }
    } catch (err) {
        alert('❌ Network error: ' + err.message);
    }
}

async function handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    if (!username || !email || !password) return alert('⚠️ Please fill all fields');
    if (password.length < 6) return alert('⚠️ Password must be at least 6 characters');
    try {
        const res = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Account created!', 'success');
            checkAuth();
        } else {
            alert('❌ ' + (data.error || 'Registration failed'));
        }
    } catch (err) {
        alert('❌ Network error: ' + err.message);
    }
}

async function handleLogout() {
    if (!confirm('🚪 Logout from Domain Hunter Pro?')) return;
    try {
        await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
        currentUser = null;
        document.getElementById('authModal').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        showToast('👋 Logged out successfully', 'info');
    } catch (err) {
        alert('❌ Logout error: ' + err.message);
    }
}

// ── Navigation ──────────────────────────────────────
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
    else if (page === 'webhooks')   loadWebhooks();
    event.preventDefault();
    return false;
}

// ── Generator Type Selection ────────────────────────
function selectGenType(type) {
    const clickedCard = document.getElementById(`opt-${type}`);
    if (!clickedCard) return;
    document.querySelectorAll('.gen-type-card').forEach(c => c.classList.remove('active'));
    clickedCard.classList.add('active');
    selectedGenType = type;
}

// ── Count stepper & preset buttons ─────────────────
function stepCount(delta) {
    const el = document.getElementById('genCount');
    if (!el) return;
    const current = parseInt(el.value) || 20;
    el.value = Math.max(5, Math.min(100, current + delta));
}

function setCount(n) {
    const el = document.getElementById('genCount');
    if (el) el.value = n;
}

// ── TLD helpers ─────────────────────────────────────
function selectAllTLDs() {
    document.querySelectorAll('.tld-checkbox').forEach(c => c.checked = true);
}
function clearAllTLDs() {
    document.querySelectorAll('.tld-checkbox').forEach(c => c.checked = false);
}
function selectPopularTLDs() {
    clearAllTLDs();
    ['.com', '.io', '.ai'].forEach(tld => {
        const cb = document.querySelector(`.tld-checkbox[value="${tld}"]`);
        if (cb) cb.checked = true;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('saleBuyDate'))  document.getElementById('saleBuyDate').value  = today;
    if (document.getElementById('saleSellDate')) document.getElementById('saleSellDate').value = today;
    console.log('🎯 Domain Hunter Pro v3.0 initialized');
});

// ── Stats ─────────────────────────────────────────
async function refreshStats() {
    try {
        const res   = await fetch(`${API}/stats`, { credentials: 'include' });
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

        const expRes = await fetch(`${API}/expiring?maxDays=365`, { credentials: 'include' });
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
                return `<div style="background:linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.9));backdrop-filter:blur(10px);padding:20px;border-radius:16px;box-shadow:0 5px 20px rgba(0,0,0,0.1);border-left:4px solid ${color};cursor:pointer;transition:transform 0.2s;" onclick="document.querySelector('.menu-item[onclick*=&quot;expiring&quot;]').click()">
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

// ── Generator ──────────────────────────────────────
async function generateDomains() {
    const keywords    = document.getElementById('genKeywords').value.trim();
    const count       = parseInt(document.getElementById('genCount').value) || 20;
    const useLLM      = document.getElementById('useLLM').checked;
    const checkboxTLDs= Array.from(document.querySelectorAll('.tld-checkbox:checked')).map(c => c.value);
    const tlds        = checkboxTLDs;
    const minLength   = parseInt(document.getElementById('minLength').value)   || 4;
    const maxLength   = parseInt(document.getElementById('maxLength').value)   || 30;
    const allowNumbers= document.getElementById('allowNumbers').checked;
    const allowHyphens= document.getElementById('allowHyphens').checked;

    if (tlds.length === 0) { alert('⚠️ Please select at least one TLD extension'); return; }
    let kwArray = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    if (kwArray.length === 0) {
        const go = confirm('⚠️ No keywords entered — the generator will use generic words.\n\nFor better results, enter keywords like "tech, digital, agency".\n\nContinue anyway?');
        if (!go) return;
    }

    const generateBtn  = document.getElementById('generateBtn');
    const progressDiv  = document.getElementById('generationProgress');
    const progressText = document.getElementById('generationProgressText');
    generateBtn.disabled      = true;
    progressDiv.style.display = 'block';
    progressText.textContent = useLLM ? '🤖 Asking AI to generate domains... (may take 10-30s)' : '⚡ Building keyword-based domain names...';

    try {
        const res  = await fetch(`${API}/generate-domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ type: selectedGenType, keywords: kwArray.join(','), count, useLLM, tlds, minLength, maxLength, allowNumbers, allowHyphens })
        });
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
            document.getElementById('domainInput').value = data.domains.join('\n');
            const msg = data.usedLLM ? `🤖 AI generated ${data.count} domains!` : `⚡ Generated ${data.count} domains!`;
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

// ── Scanner ───────────────────────────────────────
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
            credentials: 'include',
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
        const res  = await fetch(`${API}/upload-domains`, { method: 'POST', credentials: 'include', body: formData });
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
            credentials: 'include',
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

// ── Monitoring ────────────────────────────────────
async function loadMonitoring() {
    try {
        const keyword   = document.getElementById('monitorKeyword')?.value   || '';
        const available = document.getElementById('monitorAvailable')?.value || '';
        const registrar = document.getElementById('monitorRegistrar')?.value || '';
        const params    = new URLSearchParams();
        if (keyword)   params.append('keyword',   keyword);
        if (available) params.append('available', available);
        if (registrar) params.append('registrar', registrar);
        const res  = await fetch(`${API}/monitoring/filter?${params}`, { credentials: 'include' });
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
        const res = await fetch(`${API}/monitoring`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            showToast(`🗑️ Removed ${data.removed} domain(s) from monitoring`, 'success');
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
        const res = await fetch(`${API}/monitoring/${encodeURIComponent(domain)}`, { method: 'DELETE', credentials: 'include' });
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

// ═══════════════════════════════════════════════════
// ── Expiring Domains (FIXED) ────────────────────────
// ═══════════════════════════════════════════════════
let currentExpiringFilter = 30;

async function loadExpiring(maxDays) {
    currentExpiringFilter = maxDays;

    // Highlight active filter button
    document.querySelectorAll('.expiring-filter-btn').forEach(b => b.classList.remove('active-filter'));
    const activeBtn = document.querySelector(`.expiring-filter-btn[data-days="${maxDays}"]`);
    if (activeBtn) activeBtn.classList.add('active-filter');

    const container = document.getElementById('expiringResults');
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#6b7280;"><i class="fas fa-spinner fa-spin" style="font-size:32px;color:#6366f1;"></i><p style="margin-top:12px;">Loading expiring domains...</p></div>';

    try {
        const res  = await fetch(`${API}/expiring?maxDays=${maxDays}`, { credentials: 'include' });
        const data = await res.json();
        displayExpiring(data.expiring || [], maxDays);
    } catch {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i><p>Failed to load expiring domains</p></div>';
    }
}

function displayExpiring(domains, maxDays) {
    const container = document.getElementById('expiringResults');

    if (!domains || domains.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:50px 20px;">
                <div style="font-size:64px;margin-bottom:20px;">⏰</div>
                <h3 style="color:#1e293b;margin:0 0 10px;font-size:22px;">No Expiring Domains Found</h3>
                <p style="color:#6b7280;margin:0 0 30px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;">
                    Expiring domains appear here after you scan registered domains in the
                    <strong>Scanner</strong>. Domains with RDAP/WHOIS expiration data will
                    automatically show up.
                </p>
                <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
                    <button class="btn btn-primary" style="padding:12px 24px;" onclick="document.querySelector('.menu-item[onclick*=&quot;scanner&quot;]').click()">
                        <i class="fas fa-search"></i> Go to Scanner
                    </button>
                    <button class="btn btn-secondary" style="padding:12px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;" onclick="loadDemoExpiring()">
                        <i class="fas fa-flask"></i> Load Demo Data
                    </button>
                </div>
                <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
                    💡 Tip: Demo data loads 10 sample expiring domains so you can explore the UI.
                </p>
            </div>`;
        return;
    }

    // Summary bar
    const urgent   = domains.filter(d => d.daysLeft <= 7).length;
    const soon     = domains.filter(d => d.daysLeft > 7 && d.daysLeft <= 30).length;
    const moderate = domains.filter(d => d.daysLeft > 30).length;

    let html = `
        <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
            <div style="flex:1;min-width:120px;background:linear-gradient(135deg,rgba(239,68,68,0.1),rgba(239,68,68,0.05));border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#ef4444;">${urgent}</div>
                <div style="font-size:12px;color:#6b7280;font-weight:600;">🚨 Critical (≤7d)</div>
            </div>
            <div style="flex:1;min-width:120px;background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(245,158,11,0.05));border:1px solid rgba(245,158,11,0.2);border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#f59e0b;">${soon}</div>
                <div style="font-size:12px;color:#6b7280;font-weight:600;">⚠️ Soon (8-30d)</div>
            </div>
            <div style="flex:1;min-width:120px;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.05));border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#10b981;">${moderate}</div>
                <div style="font-size:12px;color:#6b7280;font-weight:600;">✅ Moderate (>30d)</div>
            </div>
            <div style="flex:1;min-width:120px;background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(99,102,241,0.05));border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;text-align:center;">
                <div style="font-size:28px;font-weight:800;color:#6366f1;">${domains.length}</div>
                <div style="font-size:12px;color:#6b7280;font-weight:600;">📋 Total shown</div>
            </div>
        </div>
        <table>
            <thead><tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Registrar</th>
                <th>Expires</th>
                <th>Days Left</th>
                <th>Urgency</th>
                <th>Method</th>
            </tr></thead><tbody>`;

    domains.forEach(d => {
        const status = d.available === true
            ? '<span class="badge badge-success">✓ Available</span>'
            : d.available === false
                ? '<span class="badge badge-danger">✗ Taken</span>'
                : '<span class="badge" style="background:#9ca3af">? Unknown</span>';
        const exp  = d.expirationDate ? new Date(d.expirationDate).toLocaleDateString() : 'N/A';
        const days = d.daysLeft !== null && d.daysLeft !== undefined ? d.daysLeft : '?';

        let urgencyBadge, daysColor, rowBg;
        if (typeof days === 'number' && days <= 7) {
            urgencyBadge = '<span style="background:#ef4444;color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">🚨 Critical</span>';
            daysColor = '#ef4444';
            rowBg = 'background:rgba(239,68,68,0.03);';
        } else if (typeof days === 'number' && days <= 30) {
            urgencyBadge = '<span style="background:#f59e0b;color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">⚠️ Soon</span>';
            daysColor = '#f59e0b';
            rowBg = 'background:rgba(245,158,11,0.03);';
        } else {
            urgencyBadge = '<span style="background:#10b981;color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">✅ OK</span>';
            daysColor = '#10b981';
            rowBg = '';
        }

        html += `<tr style="${rowBg}">
            <td><strong>${d.domain}</strong></td>
            <td>${status}</td>
            <td>${d.registrar || 'N/A'}</td>
            <td>${exp}</td>
            <td style="color:${daysColor};font-weight:800;font-size:18px;">${days}${typeof days === 'number' ? 'd' : ''}</td>
            <td>${urgencyBadge}</td>
            <td><span style="font-size:11px;color:#6b7280;">${d.method || 'dns'}</span></td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Load demo expiring domains
async function loadDemoExpiring() {
    const btn = event.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    try {
        const res = await fetch(`${API}/expiring/demo`, { method: 'POST', credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            showToast(`✅ Loaded ${data.loaded} demo expiring domains!`, 'success');
            refreshStats();
            loadExpiring(currentExpiringFilter);
        } else {
            alert('❌ Failed to load demo data');
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-flask"></i> Load Demo Data';
    }
}

// ── Webhooks ──────────────────────────────────────
async function loadWebhooks() {
    try {
        const res = await fetch(`${API}/webhooks`, { credentials: 'include' });
        const webhooks = await res.json();
        displayWebhooks(webhooks);
    } catch {
        document.getElementById('webhooksList').innerHTML = '<div class="empty-state"><p>Failed to load webhooks</p></div>';
    }
}

function displayWebhooks(webhooks) {
    const container = document.getElementById('webhooksList');
    if (!webhooks || webhooks.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell"></i><p>No webhooks yet. Create one above!</p></div>';
        return;
    }
    let html = '<table><thead><tr><th>Name</th><th>URL</th><th>Events</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
    webhooks.forEach(w => {
        const status = w.active ? '<span class="badge badge-success">✅ Active</span>' : '<span class="badge" style="background:#9ca3af">⏸️ Inactive</span>';
        const events = (w.events || []).join(', ');
        const safeId = w.id.replace(/'/g, "\\'");
        html += `<tr>
            <td><strong>${w.name}</strong></td>
            <td><small>${w.url}</small></td>
            <td><small>${events}</small></td>
            <td>${status}</td>
            <td>
                <button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="testWebhook('${safeId}')">
                    <i class="fas fa-vial"></i> Test
                </button>
                <button class="btn" style="padding:4px 10px;font-size:12px;background:rgba(239,68,68,0.1);color:#ef4444;" onclick="deleteWebhook('${safeId}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function createWebhook() {
    const name = document.getElementById('webhookName').value.trim();
    const url = document.getElementById('webhookUrl').value.trim();
    const events = Array.from(document.querySelectorAll('.webhook-event:checked')).map(e => e.value);
    if (!name || !url || events.length === 0) return alert('⚠️ Please fill all fields and select at least one event');
    try {
        const res = await fetch(`${API}/webhooks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, url, events, active: true })
        });
        const data = await res.json();
        if (data.id) {
            showToast('✅ Webhook created!', 'success');
            document.getElementById('webhookName').value = '';
            document.getElementById('webhookUrl').value = '';
            document.querySelectorAll('.webhook-event').forEach(e => e.checked = false);
            loadWebhooks();
        } else {
            alert('❌ Failed: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function testWebhook(id) {
    try {
        const res = await fetch(`${API}/webhooks/${id}/test`, { method: 'POST', credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            showToast('✅ Webhook test successful!', 'success');
        } else {
            alert('❌ Test failed: ' + (data.details || 'Unknown error'));
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function deleteWebhook(id) {
    if (!confirm('Delete this webhook?')) return;
    try {
        const res = await fetch(`${API}/webhooks/${id}`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (data.success) {
            showToast('🗑️ Webhook deleted', 'success');
            loadWebhooks();
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// ── SEO Analytics ──────────────────────────────────
async function analyzeSEO() {
    const domain = document.getElementById('seoDomain').value.trim();
    if (!domain) return alert('⚠️ Please enter a domain');
    try {
        const res = await fetch(`${API}/seo/metrics/${encodeURIComponent(domain)}`, { credentials: 'include' });
        const data = await res.json();
        const container = document.getElementById('seoResults');
        if (data.error) {
            container.innerHTML = `<div class="alert" style="background:rgba(239,68,68,0.1);border-left:4px solid #ef4444;">❌ ${data.error}</div>`;
        } else {
            container.innerHTML = `
                <div class="stats-grid" style="margin-top:20px;">
                    <div class="stat-card gradient-purple">
                        <div class="stat-icon"><i class="fas fa-trophy"></i></div>
                        <div class="stat-content"><div class="stat-value">${data.da || 'N/A'}</div><div class="stat-label">Domain Authority</div></div>
                    </div>
                    <div class="stat-card gradient-green">
                        <div class="stat-icon"><i class="fas fa-star"></i></div>
                        <div class="stat-content"><div class="stat-value">${data.pa || 'N/A'}</div><div class="stat-label">Page Authority</div></div>
                    </div>
                    <div class="stat-card gradient-gold">
                        <div class="stat-icon"><i class="fas fa-link"></i></div>
                        <div class="stat-content"><div class="stat-value">${data.backlinks || 'N/A'}</div><div class="stat-label">Backlinks</div></div>
                    </div>
                    <div class="stat-card gradient-red">
                        <div class="stat-icon"><i class="fas fa-globe"></i></div>
                        <div class="stat-content"><div class="stat-value">${data.refDomains || 'N/A'}</div><div class="stat-label">Referring Domains</div></div>
                    </div>
                </div>`;
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function analyzeCompetitors() {
    const text = document.getElementById('competitorDomains').value.trim();
    if (!text) return alert('⚠️ Please enter competitor domains');
    const domains = text.split('\n').map(d => d.trim()).filter(Boolean);
    try {
        const res = await fetch(`${API}/seo/competitor-analysis`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ domains })
        });
        const data = await res.json();
        const container = document.getElementById('competitorResults');
        if (data.results && data.results.length > 0) {
            let html = '<table><thead><tr><th>Domain</th><th>DA</th><th>PA</th><th>Backlinks</th><th>Ref Domains</th></tr></thead><tbody>';
            data.results.forEach(r => {
                html += `<tr><td><strong>${r.domain}</strong></td><td>${r.da || 'N/A'}</td><td>${r.pa || 'N/A'}</td><td>${r.backlinks || 'N/A'}</td><td>${r.refDomains || 'N/A'}</td></tr>`;
            });
            html += '</tbody></table>';
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div class="empty-state"><p>No results</p></div>';
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// ── Portfolio ──────────────────────────────────────
async function loadPortfolio() {
    try { const res = await fetch(`${API}/portfolio`, { credentials: 'include' }); displayPortfolio(await res.json()); } catch {}
}

function displayPortfolio(portfolio) {
    const container = document.getElementById('portfolioList');
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i><p>Portfolio is empty</p></div>';
        return;
    }
    let html = `<table><thead><tr><th>Domain</th><th>Price</th><th>Registrar</th><th>Notes</th><th>Added</th><th>Action</th></tr></thead><tbody>`;
    portfolio.forEach(p => {
        const date   = new Date(p.dateAdded).toLocaleDateString();
        const safeId = p.id.replace(/'/g, "\\'");
        html += `<tr>
            <td><strong>${p.domain}</strong></td><td>$${p.price}</td><td>${p.registrar || 'N/A'}</td><td>${p.notes || '-'}</td><td>${date}</td>
            <td><button class="btn" style="padding:4px 10px;font-size:12px;background:rgba(239,68,68,0.1);color:#ef4444;border:1px solid rgba(239,68,68,0.3);border-radius:6px;cursor:pointer;" onclick="removeFromPortfolio('${safeId}')"><i class="fas fa-trash"></i> Remove</button></td>
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
        await fetch(`${API}/portfolio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ domain, price, registrar, notes }) });
        ['portfolioDomain','portfolioPrice','portfolioRegistrar','portfolioNotes'].forEach(id => document.getElementById(id).value = '');
        showToast('✅ Added to portfolio!', 'success');
        loadPortfolio();
    } catch { alert('❌ Error adding to portfolio'); }
}

async function removeFromPortfolio(id) {
    if (!confirm('Remove this domain from portfolio?')) return;
    try {
        const res  = await fetch(`${API}/portfolio/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' });
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

// ── Sales / Profit ──────────────────────────────────
async function addSale() {
    const domain    = document.getElementById('saleDomain').value.trim();
    const buyPrice  = parseFloat(document.getElementById('saleBuyPrice').value);
    const sellPrice = parseFloat(document.getElementById('saleSellPrice').value);
    const buyDate   = document.getElementById('saleBuyDate').value;
    const sellDate  = document.getElementById('saleSellDate').value;
    const notes     = document.getElementById('saleNotes').value.trim();
    if (!domain || !buyPrice || !sellPrice) { alert('⚠️ Please fill domain, buy price, and sell price'); return; }
    try {
        await fetch(`${API}/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ domain, buyPrice, sellPrice, buyDate, sellDate, notes }) });
        ['saleDomain','saleBuyPrice','saleSellPrice','saleNotes'].forEach(id => document.getElementById(id).value = '');
        showToast('✅ Sale added!', 'success');
        loadSales();
        refreshStats();
    } catch { alert('❌ Error adding sale'); }
}
async function loadSales() {
    try { const res = await fetch(`${API}/sales`, { credentials: 'include' }); displaySales(await res.json()); } catch {}
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
        const res  = await fetch(`${API}/analytics/profit?period=${period}`, { credentials: 'include' });
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

// ── Config / Settings ────────────────────────────────
async function loadConfig() {
    try {
        const res    = await fetch(`${API}/config`, { credentials: 'include' });
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
        const seo = config.seo || {};
        if (document.getElementById('mozApiKey'))     document.getElementById('mozApiKey').value     = seo.mozApiKey     || '';
        if (document.getElementById('mozApiSecret'))  document.getElementById('mozApiSecret').value  = seo.mozApiSecret  || '';
        if (document.getElementById('ahrefsApiKey'))  document.getElementById('ahrefsApiKey').value  = seo.ahrefsApiKey  || '';
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
    try { await fetch(`${API}/config`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(cfg) }); showToast('✅ LLM Config saved!', 'success'); } catch { alert('❌ Save failed'); }
}

async function saveSEOConfig() {
    const res = await fetch(`${API}/config`, { credentials: 'include' });
    const config = await res.json();
    config.seo = {
        mozApiKey:    document.getElementById('mozApiKey').value.trim(),
        mozApiSecret: document.getElementById('mozApiSecret').value.trim(),
        ahrefsApiKey: document.getElementById('ahrefsApiKey').value.trim()
    };
    try {
        await fetch(`${API}/config`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(config) });
        showToast('✅ SEO Config saved!', 'success');
    } catch {
        alert('❌ Save failed');
    }
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
        const res  = await fetch(`${API}/test-llm-connection`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(config) });
        const data = await res.json();
        if (data.success) {
            resultDiv.innerHTML = `<div style="padding:12px;background:rgba(16,185,129,0.1);border-left:4px solid #10b981;border-radius:8px;"><strong style="color:#10b981;">✅ Connected!</strong> ${data.message}${data.latency ? ` (${data.latency}ms)` : ''}</div>`;
        } else {
            resultDiv.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.1);border-left:4px solid #ef4444;border-radius:8px;"><strong style="color:#ef4444;">❌ Failed:</strong> ${data.error || 'Connection error'}${data.details ? `<br><small>${data.details}</small>` : ''}</div>`;
        }
        setTimeout(() => { resultDiv.style.display = 'none'; }, 10000);
    } catch (err) {
        resultDiv.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.1);border-radius:8px;"><strong style="color:#ef4444;">⚠️ Error:</strong> ${err.message}</div>`;
    }
}

// ── Toast notification ────────────────────────────────
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
