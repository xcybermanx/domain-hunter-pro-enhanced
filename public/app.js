// Domain Hunter Pro - Main App JavaScript

const API = '/api';
let selectedGenType = 'geo';

// Navigation
function navigate(page) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    if (page === 'monitoring') loadMonitoring();
    else if (page === 'profit') { loadSales(); loadProfitAnalytics('month'); }
    else if (page === 'portfolio') loadPortfolio();
    else if (page === 'settings') loadConfig();
    else if (page === 'dashboard') refreshStats();
    event.preventDefault();
    return false;
}

// Select generation type
function selectGenType(type) {
    selectedGenType = type;
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('active');
    });
    document.getElementById(`opt-${type}`).classList.add('active');
}

// Test LLM Connection
async function testConnection(provider) {
    const resultDiv = document.getElementById('connectionTestResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="alert alert-info"><i class="fas fa-spinner fa-spin"></i> Testing connection...</div>';
    try {
        let config = {};
        if (provider === 'local') {
            config = { provider: 'local', endpoint: document.getElementById('localEndpoint').value, model: document.getElementById('localModel').value };
        } else if (provider === 'openai') {
            config = { provider: 'openai', apiKey: document.getElementById('openaiKey').value, model: document.getElementById('openaiModel').value };
        } else if (provider === 'claude') {
            config = { provider: 'claude', apiKey: document.getElementById('claudeKey').value, model: document.getElementById('claudeModel').value };
        } else if (provider === 'perplexity') {
            config = { provider: 'perplexity', apiKey: document.getElementById('perplexityKey').value, model: document.getElementById('perplexityModel').value };
        } else if (provider === 'grok') {
            config = { provider: 'grok', apiKey: document.getElementById('grokKey').value, model: document.getElementById('grokModel').value };
        }
        const res = await fetch(`${API}/test-llm-connection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await res.json();
        if (data.success) {
            resultDiv.innerHTML = `<div style="background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(34,197,94,.1));border-left:4px solid #10b981;padding:15px;border-radius:8px;margin-bottom:20px;"><strong style="color:#10b981;">✅ Connection Successful!</strong><p style="margin:5px 0 0;color:#059669;">${data.message||'LLM is responding correctly'}</p>${data.model?`<p style="margin:5px 0 0;color:#6b7280;font-size:13px;">Model: ${data.model}</p>`:''}</div>`;
        } else {
            resultDiv.innerHTML = `<div style="background:linear-gradient(135deg,rgba(239,68,68,.1),rgba(220,38,38,.1));border-left:4px solid #ef4444;padding:15px;border-radius:8px;margin-bottom:20px;"><strong style="color:#ef4444;">❌ Connection Failed</strong><p style="margin:5px 0 0;color:#dc2626;">${data.error||'Unable to connect to LLM'}</p></div>`;
        }
        setTimeout(() => { resultDiv.style.opacity='0'; setTimeout(()=>{ resultDiv.style.display='none'; resultDiv.style.opacity='1'; },500); }, 10000);
    } catch (err) {
        resultDiv.innerHTML = `<div style="background:linear-gradient(135deg,rgba(239,68,68,.1),rgba(220,38,38,.1));border-left:4px solid #ef4444;padding:15px;border-radius:8px;"><strong style="color:#ef4444;">⚠️ Error Testing Connection</strong><p style="color:#dc2626;">${err.message||'Network error'}</p></div>`;
    }
}

// Refresh statistics
async function refreshStats() {
    try {
        const res = await fetch(`${API}/stats`);
        const stats = await res.json();
        document.getElementById('totalScans').textContent = stats.totalScans || 0;
        document.getElementById('availableDomains').textContent = stats.availableDomains || 0;
        document.getElementById('expiring7').textContent = stats.expiring7 || 0;
        document.getElementById('premiumDomains').textContent = stats.premiumDomains || 0;
        document.getElementById('totalProfit').textContent = `$${(stats.totalProfit || 0).toFixed(0)}`;
        document.getElementById('totalRevenue').textContent = `$${(stats.totalRevenue || 0).toFixed(0)}`;
        document.getElementById('totalInvested').textContent = `$${(stats.totalInvested || 0).toFixed(0)}`;
        document.getElementById('totalROI').textContent = `${(stats.totalROI || 0).toFixed(1)}%`;
        document.getElementById('monitorBadge').textContent = stats.totalMonitored || 0;
    } catch (err) {
        console.error('Failed to refresh stats:', err);
    }
}

// ✅ FIX #4 — Add custom domain to scanner textarea
function addCustomDomainToScanner() {
    const customInput = document.getElementById('customDomain');
    const domain = customInput.value.trim();
    if (!domain) {
        alert('⚠️ Please enter a domain name first');
        return;
    }
    const domainInput = document.getElementById('domainInput');
    const current = domainInput.value.trim();
    domainInput.value = current ? current + '\n' + domain : domain;
    customInput.value = '';
    // Navigate to scanner
    document.querySelector('.menu-item[onclick*="scanner"]').click();
}

// ✅ FIX #2 + #3 — Generate domains with progress bar and full params
async function generateDomains() {
    const keywords = document.getElementById('genKeywords').value.trim();
    const count = parseInt(document.getElementById('genCount').value) || 20;
    const useLLM = document.getElementById('useLLM').checked;

    // ✅ FIX #3 — Collect TLDs, length, and number options
    const tlds = Array.from(document.querySelectorAll('.tld-checkbox:checked')).map(c => c.value);
    const minLength = parseInt(document.getElementById('minLength').value) || 4;
    const maxLength = parseInt(document.getElementById('maxLength').value) || 20;
    const allowNumbers = document.getElementById('allowNumbers').checked;

    if (tlds.length === 0) {
        alert('⚠️ Please select at least one TLD extension');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    const progressDiv = document.getElementById('generationProgress');

    // ✅ FIX #2 — Show progress, disable button
    generateBtn.disabled = true;
    progressDiv.style.display = 'block';

    try {
        const res = await fetch(`${API}/generate-domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: selectedGenType, keywords, count, useLLM, tlds, minLength, maxLength, allowNumbers })
        });
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
            document.getElementById('domainInput').value = data.domains.join('\n');
            alert(`✅ Generated ${data.count} domains! Switching to Scanner...`);
            document.querySelector('.menu-item[onclick*="scanner"]').click();
        } else {
            alert('❌ Failed to generate domains. Please try again.');
        }
    } catch (err) {
        console.error('Generate error:', err);
        alert('❌ Error generating domains. Check console.');
    } finally {
        // ✅ FIX #2 — Always hide progress and re-enable button
        generateBtn.disabled = false;
        progressDiv.style.display = 'none';
    }
}

// ✅ FIX #1 — Check domains: correct endpoint + progress bar
async function checkDomains() {
    const input = document.getElementById('domainInput').value.trim();
    if (!input) {
        alert('⚠️ Please enter domains to check');
        return;
    }
    const domains = input.split('\n').map(d => d.trim()).filter(d => d);
    if (domains.length === 0) {
        alert('⚠️ No valid domains found');
        return;
    }

    const checkBtn = document.getElementById('checkBtn');
    const scanProgress = document.getElementById('scanProgress');
    const scanProgressText = document.getElementById('scanProgressText');

    checkBtn.disabled = true;
    scanProgress.style.display = 'block';
    scanProgressText.textContent = `Checking ${domains.length} domain(s)...`;

    try {
        // ✅ FIX #1 — Was /api/check-bulk, now /api/check-domains
        const res = await fetch(`${API}/check-domains`, {
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
        checkBtn.disabled = false;
        scanProgress.style.display = 'none';
    }
}

// Upload file
async function uploadFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`${API}/upload-domains`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.domains && data.domains.length > 0) {
            alert(`✅ Loaded ${data.count} domains from file`);
            document.getElementById('domainInput').value = data.domains.join('\n');
        } else {
            alert('❌ No domains found in file');
        }
    } catch (err) {
        console.error('Upload error:', err);
        alert('❌ Error uploading file');
    }
}

// Display scan results
function displayResults(results, containerId) {
    const container = document.getElementById(containerId);
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No results yet</p></div>';
        return;
    }
    let html = '<table><thead><tr><th>Domain</th><th>Status</th><th>Registrar</th><th>Expiration</th><th>Days Left</th><th>Method</th></tr></thead><tbody>';
    results.forEach(r => {
        const status = r.available
            ? '<span class="badge badge-success">✓ Available</span>'
            : r.available === null
                ? '<span class="badge" style="background:#9ca3af">? Unknown</span>'
                : '<span class="badge badge-danger">✗ Taken</span>';
        const exp = r.expirationDate ? new Date(r.expirationDate).toLocaleDateString() : 'N/A';
        const days = (r.daysLeft !== null && r.daysLeft !== undefined) ? r.daysLeft + 'd' : 'N/A';
        const daysClass = r.daysLeft !== null && r.daysLeft < 30 ? 'color:#ef4444;font-weight:700' : '';
        html += `<tr>
            <td><strong>${r.domain}</strong></td>
            <td>${status}</td>
            <td>${r.registrar || 'N/A'}</td>
            <td>${exp}</td>
            <td style="${daysClass}">${days}</td>
            <td><span style="font-size:11px;color:#6b7280;">${r.method || 'dns'}</span></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Load monitoring data
async function loadMonitoring() {
    try {
        const keyword = document.getElementById('monitorKeyword')?.value || '';
        const available = document.getElementById('monitorAvailable')?.value || '';
        const registrar = document.getElementById('monitorRegistrar')?.value || '';
        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (available) params.append('available', available);
        if (registrar) params.append('registrar', registrar);
        const res = await fetch(`${API}/monitoring/filter?${params}`);
        const data = await res.json();
        displayMonitoring(data.monitoring || data);
    } catch (err) {
        console.error('Monitoring error:', err);
        document.getElementById('monitoringResults').innerHTML = '<div class="empty-state"><p>Failed to load monitoring data</p></div>';
    }
}

function applyMonitorFilters() { loadMonitoring(); }

function clearMonitorFilters() {
    document.getElementById('monitorKeyword').value = '';
    document.getElementById('monitorAvailable').value = '';
    document.getElementById('monitorRegistrar').value = '';
    loadMonitoring();
}

function displayMonitoring(monitoring) {
    const container = document.getElementById('monitoringResults');
    if (!monitoring || monitoring.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-eye-slash"></i><p>No monitored domains yet. Scan some domains to start monitoring!</p></div>';
        return;
    }
    let html = '<table><thead><tr><th>Domain</th><th>Status</th><th>Registrar</th><th>Expiration</th><th>Days Left</th><th>Method</th><th>Last Checked</th></tr></thead><tbody>';
    monitoring.forEach(m => {
        const status = m.available
            ? '<span class="badge badge-success">✓ Available</span>'
            : '<span class="badge badge-danger">✗ Taken</span>';
        const last = m.lastChecked ? new Date(m.lastChecked).toLocaleString() : 'N/A';
        const exp = m.expirationDate ? new Date(m.expirationDate).toLocaleDateString() : 'N/A';
        const days = m.daysLeft !== null && m.daysLeft !== undefined ? m.daysLeft + 'd' : 'N/A';
        html += `<tr>
            <td><strong>${m.domain}</strong></td>
            <td>${status}</td>
            <td>${m.registrar || 'N/A'}</td>
            <td>${exp}</td>
            <td>${days}</td>
            <td><span style="font-size:11px;color:#6b7280">${m.method||'dns'}</span></td>
            <td><small>${last}</small></td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Add sale
async function addSale() {
    const domain = document.getElementById('saleDomain').value.trim();
    const buyPrice = parseFloat(document.getElementById('saleBuyPrice').value);
    const sellPrice = parseFloat(document.getElementById('saleSellPrice').value);
    const buyDate = document.getElementById('saleBuyDate').value;
    const sellDate = document.getElementById('saleSellDate').value;
    const notes = document.getElementById('saleNotes').value.trim();
    if (!domain || !buyPrice || !sellPrice) { alert('⚠️ Please fill in domain, buy price, and sell price'); return; }
    try {
        await fetch(`${API}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, buyPrice, sellPrice, buyDate, sellDate, notes })
        });
        ['saleDomain','saleBuyPrice','saleSellPrice','saleNotes'].forEach(id => document.getElementById(id).value = '');
        alert('✅ Sale added successfully!');
        loadSales();
        refreshStats();
    } catch (err) {
        console.error('Add sale error:', err);
        alert('❌ Error adding sale');
    }
}

// Load sales
async function loadSales() {
    try {
        const res = await fetch(`${API}/sales`);
        const sales = await res.json();
        displaySales(sales);
    } catch (err) {
        console.error('Load sales error:', err);
    }
}

function displaySales(sales) {
    const container = document.getElementById('salesList');
    if (!sales || sales.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><p>No sales recorded yet</p></div>';
        return;
    }
    let html = '<table><thead><tr><th>Domain</th><th>Buy Price</th><th>Sell Price</th><th>Profit</th><th>ROI</th><th>Date</th></tr></thead><tbody>';
    sales.forEach(s => {
        const profit = (s.sellPrice - s.buyPrice).toFixed(2);
        const roi = s.buyPrice > 0 ? (((s.sellPrice - s.buyPrice) / s.buyPrice) * 100).toFixed(1) : 0;
        const profitClass = profit >= 0 ? 'badge-success' : 'badge-danger';
        const date = s.sellDate ? new Date(s.sellDate).toLocaleDateString() : 'N/A';
        html += `<tr>
            <td><strong>${s.domain}</strong></td>
            <td>$${parseFloat(s.buyPrice).toFixed(2)}</td>
            <td>$${parseFloat(s.sellPrice).toFixed(2)}</td>
            <td><span class="badge ${profitClass}">$${profit}</span></td>
            <td><span class="badge ${profitClass}">${roi}%</span></td>
            <td>${date}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Load profit analytics
async function loadProfitAnalytics(period) {
    try {
        if (event && event.currentTarget) {
            document.querySelectorAll('.period-tab').forEach(tab => tab.classList.remove('active'));
            event.currentTarget.classList.add('active');
        }
        const res = await fetch(`${API}/analytics/profit?period=${period}`);
        const data = await res.json();
        const container = document.getElementById('profitAnalytics');
        container.innerHTML = `
            <div class="profit-cards">
                <div class="profit-card"><div class="profit-header"><i class="fas fa-shopping-cart"></i><span>Total Sales</span></div><div class="profit-amount">${data.totalSales||0}</div></div>
                <div class="profit-card"><div class="profit-header"><i class="fas fa-dollar-sign"></i><span>Total Profit</span></div><div class="profit-amount">$${(data.totalProfit||0).toFixed(2)}</div></div>
                <div class="profit-card"><div class="profit-header"><i class="fas fa-chart-bar"></i><span>Avg Profit</span></div><div class="profit-amount">$${(data.averageProfit||0).toFixed(2)}</div></div>
                <div class="profit-card"><div class="profit-header"><i class="fas fa-percentage"></i><span>Avg ROI</span></div><div class="profit-amount">${(data.averageProfitPercent||0).toFixed(1)}%</div></div>
            </div>`;
    } catch (err) {
        console.error('Analytics error:', err);
    }
}

// Load portfolio
async function loadPortfolio() {
    try {
        const res = await fetch(`${API}/portfolio`);
        const portfolio = await res.json();
        displayPortfolio(portfolio);
    } catch (err) {
        console.error('Portfolio error:', err);
    }
}

function displayPortfolio(portfolio) {
    const container = document.getElementById('portfolioList');
    if (!portfolio || portfolio.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i><p>Your portfolio is empty</p></div>';
        return;
    }
    let html = '<table><thead><tr><th>Domain</th><th>Price</th><th>Registrar</th><th>Notes</th><th>Added</th></tr></thead><tbody>';
    portfolio.forEach(p => {
        const date = new Date(p.dateAdded).toLocaleDateString();
        html += `<tr><td><strong>${p.domain}</strong></td><td>$${p.price}</td><td>${p.registrar||'N/A'}</td><td>${p.notes||'-'}</td><td>${date}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Add to portfolio
async function addToPortfolio() {
    const domain = document.getElementById('portfolioDomain').value.trim();
    const price = parseFloat(document.getElementById('portfolioPrice').value);
    const registrar = document.getElementById('portfolioRegistrar').value.trim();
    const notes = document.getElementById('portfolioNotes').value.trim();
    if (!domain || !price) { alert('⚠️ Please fill in domain and price'); return; }
    try {
        await fetch(`${API}/portfolio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, price, registrar, notes })
        });
        ['portfolioDomain','portfolioPrice','portfolioRegistrar','portfolioNotes'].forEach(id => document.getElementById(id).value = '');
        alert('✅ Domain added to portfolio!');
        loadPortfolio();
    } catch (err) {
        console.error('Add portfolio error:', err);
        alert('❌ Error adding to portfolio');
    }
}

// Load config
async function loadConfig() {
    try {
        const res = await fetch(`${API}/config`);
        const config = await res.json();
        document.getElementById('llmProvider').value = config.llm?.provider || 'local';
        updateLLMProvider();
        const local = config.llm?.local || {};
        if (document.getElementById('localEnabled')) document.getElementById('localEnabled').checked = local.enabled || false;
        if (document.getElementById('localModel')) document.getElementById('localModel').value = local.model || 'qwen2.5:3b';
        if (document.getElementById('localEndpoint')) document.getElementById('localEndpoint').value = local.endpoint || 'http://localhost:11434/api/generate';
        ['openai','claude','perplexity','grok'].forEach(p => {
            const cfg = config.llm?.[p] || {};
            const enabledEl = document.getElementById(`${p}Enabled`);
            const keyEl = document.getElementById(`${p}Key`);
            const modelEl = document.getElementById(`${p}Model`);
            if (enabledEl) enabledEl.checked = cfg.enabled || false;
            if (keyEl) keyEl.value = cfg.apiKey || '';
            if (modelEl && cfg.model) modelEl.value = cfg.model;
        });
    } catch (err) {
        console.error('Load config error:', err);
    }
}

function updateLLMProvider() {
    const provider = document.getElementById('llmProvider').value;
    document.querySelectorAll('.llm-config').forEach(c => c.style.display = 'none');
    const sel = document.getElementById(`${provider}Config`);
    if (sel) sel.style.display = 'block';
    const resultDiv = document.getElementById('connectionTestResult');
    if (resultDiv) resultDiv.style.display = 'none';
}

async function saveConfig() {
    const config = {
        llm: {
            provider: document.getElementById('llmProvider').value,
            local: { enabled: document.getElementById('localEnabled').checked, model: document.getElementById('localModel').value, endpoint: document.getElementById('localEndpoint').value },
            openai: { enabled: document.getElementById('openaiEnabled').checked, apiKey: document.getElementById('openaiKey').value, model: document.getElementById('openaiModel').value },
            claude: { enabled: document.getElementById('claudeEnabled').checked, apiKey: document.getElementById('claudeKey').value, model: document.getElementById('claudeModel').value },
            perplexity: { enabled: document.getElementById('perplexityEnabled').checked, apiKey: document.getElementById('perplexityKey').value, model: document.getElementById('perplexityModel').value },
            grok: { enabled: document.getElementById('grokEnabled').checked, apiKey: document.getElementById('grokKey').value, model: document.getElementById('grokModel').value }
        }
    };
    try {
        await fetch(`${API}/config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
        alert('✅ Configuration saved successfully!');
    } catch (err) {
        console.error('Save config error:', err);
        alert('❌ Error saving configuration');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Domain Hunter Pro initialized');
    refreshStats();
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('saleBuyDate')) document.getElementById('saleBuyDate').value = today;
    if (document.getElementById('saleSellDate')) document.getElementById('saleSellDate').value = today;
});

setInterval(refreshStats, 30000);
