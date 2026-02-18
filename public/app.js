// Domain Hunter Pro — Frontend JS
const API = '/api';
let selectedGenType = 'geo';

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
    event.preventDefault();
    return false;
}

function selectGenType(type) {
    selectedGenType = type;
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(`opt-${type}`);
    if (el) el.classList.add('active');
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
    console.log('🎯 Domain Hunter Pro initialized');
});

// ── Stats ────────────────────────────────────────────────────────
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
    } catch (err) { console.error('Stats error:', err); }
}
setInterval(refreshStats, 30000);

// ── Generator ────────────────────────────────────────────────────
async function generateDomains() {
    const keywords    = document.getElementById('genKeywords').value.trim();
    const count       = parseInt(document.getElementById('genCount').value) || 20;
    const useLLM      = document.getElementById('useLLM').checked;
    const checkboxTLDs= Array.from(document.querySelectorAll('.tld-checkbox:checked')).map(c => c.value);
    const tlds        = [...new Set([...checkboxTLDs, ...Array.from(customTLDs)])];
    const minLength   = parseInt(document.getElementById('minLength').value)   || 4;
    const maxLength   = parseInt(document.getElementById('maxLength').value)   || 30;
    const allowNumbers= document.getElementById('allowNumbers').checked;

    if (tlds.length === 0) { alert('⚠️ Please select at least one TLD extension'); return; }
    if (!keywords) {
        const go = confirm('⚠️ No keywords entered — the generator will use generic words.\nFor better results, enter a keyword like "madrid" or "realty".\n\nContinue anyway?');
        if (!go) return;
    }

    const generateBtn  = document.getElementById('generateBtn');
    const progressDiv  = document.getElementById('generationProgress');
    const progressText = document.getElementById('generationProgressText');
    generateBtn.disabled      = true;
    progressDiv.style.display = 'block';
    progressText.textContent  = useLLM ? '🤖 Asking AI to generate domains... (may take 10-30s)' : '⚡ Building keyword-based domain names...';

    try {
        const res  = await fetch(`${API}/generate-domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: selectedGenType, keywords, count, useLLM, tlds, minLength, maxLength, allowNumbers })
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

// ── Scanner ──────────────────────────────────────────────────────
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

// Render scanner results table — with "Add to Monitoring" button per row
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

// Add a scanned domain to monitoring
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
            // Quick in-page toast instead of blocking alert
            showToast(msg, data.alreadyExists ? 'info' : 'success');
            refreshStats();
        }
    } catch (err) {
        showToast('❌ Error adding to monitoring', 'error');
    }
}

// ── Monitoring ───────────────────────────────────────────────────
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

// Render monitoring table — with "Remove" button per row
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

// Remove a domain from monitoring
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

// ── Portfolio ────────────────────────────────────────────────────
async function loadPortfolio() {
    try { const res = await fetch(`${API}/portfolio`); displayPortfolio(await res.json()); } catch {}
}

// Render portfolio table — with "Remove" button per row
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

// Remove a portfolio item
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

// ── Sales / Profit ───────────────────────────────────────────────
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

// ── Config / Settings ────────────────────────────────────────────
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
            resultDiv.innerHTML = `<div style="padding:12px;background:rgba(16,185,129,0.1);border-left:4px solid #10b981;border-radius:8px;"><strong style="color:#10b981">✅ Connected!</strong> ${data.message}${data.latency ? ` (${data.latency}ms)` : ''}</div>`;
        } else {
            resultDiv.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.1);border-left:4px solid #ef4444;border-radius:8px;"><strong style="color:#ef4444">❌ Failed:</strong> ${data.error || 'Connection error'}</div>`;
        }
        setTimeout(() => { resultDiv.style.display = 'none'; }, 10000);
    } catch (err) {
        resultDiv.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.1);border-radius:8px;"><strong style="color:#ef4444">⚠️ Error:</strong> ${err.message}</div>`;
    }
}

// ── Toast notification ───────────────────────────────────────────
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
