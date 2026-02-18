// Domain Hunter Pro - Main App JavaScript

const API = '/api';
let selectedGenType = 'geo';

// Navigation
function navigate(page) {
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Remove active class from all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Add active class to clicked menu item
    event.currentTarget.classList.add('active');
    
    // Show selected page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }
    
    // Load data for specific pages
    if (page === 'monitoring') {
        loadMonitoring();
    } else if (page === 'profit') {
        loadSales();
    } else if (page === 'portfolio') {
        loadPortfolio();
    } else if (page === 'settings') {
        loadConfig();
    } else if (page === 'dashboard') {
        refreshStats();
    }
    
    // Prevent default link behavior
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
            config = {
                provider: 'local',
                endpoint: document.getElementById('localEndpoint').value,
                model: document.getElementById('localModel').value
            };
        } else if (provider === 'openai') {
            config = {
                provider: 'openai',
                apiKey: document.getElementById('openaiKey').value,
                model: document.getElementById('openaiModel').value
            };
        } else if (provider === 'claude') {
            config = {
                provider: 'claude',
                apiKey: document.getElementById('claudeKey').value,
                model: document.getElementById('claudeModel').value
            };
        } else if (provider === 'perplexity') {
            config = {
                provider: 'perplexity',
                apiKey: document.getElementById('perplexityKey').value,
                model: document.getElementById('perplexityModel').value
            };
        } else if (provider === 'grok') {
            config = {
                provider: 'grok',
                apiKey: document.getElementById('grokKey').value,
                model: document.getElementById('grokModel').value
            };
        }
        
        const res = await fetch(`${API}/test-llm-connection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        const data = await res.json();
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div class="alert alert-success" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.1)); border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-check-circle" style="color: #10b981; font-size: 24px;"></i>
                        <div>
                            <strong style="color: #10b981; font-size: 16px;">✅ Connection Successful!</strong>
                            <p style="margin: 5px 0 0 0; color: #059669;">${data.message || 'LLM is responding correctly'}</p>
                            ${data.model ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Model: ${data.model}</p>` : ''}
                            ${data.latency ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">Response time: ${data.latency}ms</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1)); border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-times-circle" style="color: #ef4444; font-size: 24px;"></i>
                        <div>
                            <strong style="color: #ef4444; font-size: 16px;">❌ Connection Failed</strong>
                            <p style="margin: 5px 0 0 0; color: #dc2626;">${data.error || 'Unable to connect to LLM'}</p>
                            ${data.details ? `<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 13px;">${data.details}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            resultDiv.style.opacity = '0';
            setTimeout(() => {
                resultDiv.style.display = 'none';
                resultDiv.style.opacity = '1';
            }, 500);
        }, 10000);
        
    } catch (err) {
        console.error('Test connection error:', err);
        resultDiv.innerHTML = `
            <div class="alert alert-danger" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1)); border-left: 4px solid #ef4444; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 24px;"></i>
                    <div>
                        <strong style="color: #ef4444; font-size: 16px;">⚠️ Error Testing Connection</strong>
                        <p style="margin: 5px 0 0 0; color: #dc2626;">${err.message || 'Network error or server unavailable'}</p>
                    </div>
                </div>
            </div>
        `;
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

// Generate domains
async function generateDomains() {
    const keywords = document.getElementById('genKeywords').value
        .split(',')
        .map(k => k.trim())
        .filter(k => k);
    const count = parseInt(document.getElementById('genCount').value) || 20;
    const useLLM = document.getElementById('useLLM').checked;
    
    try {
        const res = await fetch(`${API}/generate-domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: selectedGenType, keywords, count, useLLM })
        });
        
        const data = await res.json();
        
        if (data.domains && data.domains.length > 0) {
            document.getElementById('domainInput').value = data.domains.join('\n');
            alert(`✅ Generated ${data.count} domains! Switching to Scanner...`);
            // Navigate to scanner
            document.querySelector('.menu-item[onclick*="scanner"]').click();
        } else {
            alert('❌ Failed to generate domains. Please try again.');
        }
    } catch (err) {
        console.error('Generate error:', err);
        alert('❌ Error generating domains. Check console.');
    }
}

// Check domains
async function checkDomains() {
    const input = document.getElementById('domainInput').value.trim();
    if (!input) {
        alert('⚠️ Please enter domains to check');
        return;
    }
    
    const domains = input.split('\n').filter(d => d.trim());
    
    if (domains.length === 0) {
        alert('⚠️ No valid domains found');
        return;
    }
    
    try {
        const res = await fetch(`${API}/check-bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domains })
        });
        
        const data = await res.json();
        displayResults(data.results, 'scanResults');
        refreshStats();
    } catch (err) {
        console.error('Check error:', err);
        alert('❌ Error checking domains');
    }
}

// Upload file
async function uploadFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await fetch(`${API}/upload-domains`, {
            method: 'POST',
            body: formData
        });
        
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
    
    let html = '<table><thead><tr><th>Domain</th><th>Status</th><th>Registrar</th><th>Value</th><th>Expiration</th><th>Days</th></tr></thead><tbody>';
    
    results.forEach(r => {
        const status = r.available 
            ? '<span class="badge badge-success">Available</span>'
            : '<span class="badge badge-danger">Taken</span>';
        const premium = r.premium ? '<span class="badge badge-premium">PREMIUM</span>' : '';
        const exp = r.expirationDate ? new Date(r.expirationDate).toLocaleDateString() : 'N/A';
        const days = r.daysLeft !== null ? r.daysLeft : 'N/A';
        const value = r.estimatedValue ? `$${r.estimatedValue}` : 'N/A';
        
        html += `<tr>
            <td><strong>${r.domain}</strong> ${premium}</td>
            <td>${status}</td>
            <td>${r.registrar || 'Unknown'}</td>
            <td>${value}</td>
            <td>${exp}</td>
            <td>${days}</td>
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
        displayMonitoring(data.monitoring);
    } catch (err) {
        console.error('Monitoring error:', err);
    }
}

function applyMonitorFilters() {
    loadMonitoring();
}

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
    
    let html = '<table><thead><tr><th>Domain</th><th>First Check</th><th>Last Check</th><th>Checks</th><th>Status</th></tr></thead><tbody>';
    
    monitoring.forEach(m => {
        const first = new Date(m.firstChecked).toLocaleDateString();
        const last = new Date(m.lastChecked).toLocaleString();
        const latest = m.statusHistory[m.statusHistory.length - 1];
        const status = latest.available 
            ? '<span class="badge badge-success">Available</span>'
            : '<span class="badge badge-danger">Taken</span>';
        
        html += `<tr>
            <td><strong>${m.domain}</strong></td>
            <td>${first}</td>
            <td>${last}</td>
            <td>${m.checkCount}</td>
            <td>${status}</td>
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
    
    if (!domain || !buyPrice || !sellPrice) {
        alert('⚠️ Please fill in domain, buy price, and sell price');
        return;
    }
    
    try {
        await fetch(`${API}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, buyPrice, sellPrice, buyDate, sellDate, notes })
        });
        
        // Clear form
        document.getElementById('saleDomain').value = '';
        document.getElementById('saleBuyPrice').value = '';
        document.getElementById('saleSellPrice').value = '';
        document.getElementById('saleBuyDate').value = '';
        document.getElementById('saleSellDate').value = '';
        document.getElementById('saleNotes').value = '';
        
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
        const profitClass = s.profit >= 0 ? 'badge-success' : 'badge-danger';
        const date = new Date(s.sellDate).toLocaleDateString();
        
        html += `<tr>
            <td><strong>${s.domain}</strong></td>
            <td>$${s.buyPrice.toFixed(2)}</td>
            <td>$${s.sellPrice.toFixed(2)}</td>
            <td><span class="badge ${profitClass}">$${s.profit.toFixed(2)}</span></td>
            <td><span class="badge ${profitClass}">${s.profitPercent}%</span></td>
            <td>${date}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Load profit analytics
async function loadProfitAnalytics(period) {
    try {
        // Remove active class from all period tabs
        document.querySelectorAll('.period-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        event.currentTarget.classList.add('active');
        
        const res = await fetch(`${API}/analytics/profit?period=${period}`);
        const data = await res.json();
        
        const container = document.getElementById('profitAnalytics');
        container.innerHTML = `
            <div class="profit-cards">
                <div class="profit-card">
                    <div class="profit-header">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Total Sales</span>
                    </div>
                    <div class="profit-amount">${data.totalSales}</div>
                </div>
                <div class="profit-card">
                    <div class="profit-header">
                        <i class="fas fa-dollar-sign"></i>
                        <span>Total Profit</span>
                    </div>
                    <div class="profit-amount">$${data.totalProfit.toFixed(2)}</div>
                </div>
                <div class="profit-card">
                    <div class="profit-header">
                        <i class="fas fa-chart-bar"></i>
                        <span>Average Profit</span>
                    </div>
                    <div class="profit-amount">$${data.averageProfit.toFixed(2)}</div>
                </div>
                <div class="profit-card">
                    <div class="profit-header">
                        <i class="fas fa-percentage"></i>
                        <span>Average ROI</span>
                    </div>
                    <div class="profit-amount">${data.averageProfitPercent.toFixed(2)}%</div>
                </div>
            </div>
        `;
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
        html += `<tr>
            <td><strong>${p.domain}</strong></td>
            <td>$${p.price}</td>
            <td>${p.registrar || 'N/A'}</td>
            <td>${p.notes || '-'}</td>
            <td>${date}</td>
        </tr>`;
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
    
    if (!domain || !price) {
        alert('⚠️ Please fill in domain and price');
        return;
    }
    
    try {
        await fetch(`${API}/portfolio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain, price, registrar, notes })
        });
        
        // Clear form
        document.getElementById('portfolioDomain').value = '';
        document.getElementById('portfolioPrice').value = '';
        document.getElementById('portfolioRegistrar').value = '';
        document.getElementById('portfolioNotes').value = '';
        
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
        
        // Set provider
        document.getElementById('llmProvider').value = config.llm.provider || 'local';
        updateLLMProvider();
        
        // Local config
        document.getElementById('localEnabled').checked = config.llm.local.enabled;
        document.getElementById('localModel').value = config.llm.local.model;
        document.getElementById('localEndpoint').value = config.llm.local.endpoint;
        
        // OpenAI config
        if (config.llm.openai) {
            document.getElementById('openaiEnabled').checked = config.llm.openai.enabled;
            document.getElementById('openaiKey').value = config.llm.openai.apiKey || '';
            document.getElementById('openaiModel').value = config.llm.openai.model;
        }
        
        // Claude config
        if (config.llm.claude) {
            document.getElementById('claudeEnabled').checked = config.llm.claude.enabled;
            document.getElementById('claudeKey').value = config.llm.claude.apiKey || '';
            document.getElementById('claudeModel').value = config.llm.claude.model;
        }
        
        // Perplexity config
        if (config.llm.perplexity) {
            document.getElementById('perplexityEnabled').checked = config.llm.perplexity.enabled;
            document.getElementById('perplexityKey').value = config.llm.perplexity.apiKey || '';
            document.getElementById('perplexityModel').value = config.llm.perplexity.model;
        }
        
        // Grok config
        if (config.llm.grok) {
            document.getElementById('grokEnabled').checked = config.llm.grok.enabled;
            document.getElementById('grokKey').value = config.llm.grok.apiKey || '';
            document.getElementById('grokModel').value = config.llm.grok.model;
        }
    } catch (err) {
        console.error('Load config error:', err);
    }
}

// Update LLM provider
function updateLLMProvider() {
    const provider = document.getElementById('llmProvider').value;
    
    // Hide all configs
    document.querySelectorAll('.llm-config').forEach(config => {
        config.style.display = 'none';
    });
    
    // Show selected config
    const selectedConfig = document.getElementById(`${provider}Config`);
    if (selectedConfig) {
        selectedConfig.style.display = 'block';
    }
    
    // Hide test result when switching providers
    const resultDiv = document.getElementById('connectionTestResult');
    if (resultDiv) {
        resultDiv.style.display = 'none';
    }
}

// Save config
async function saveConfig() {
    const config = {
        llm: {
            provider: document.getElementById('llmProvider').value,
            local: {
                enabled: document.getElementById('localEnabled').checked,
                model: document.getElementById('localModel').value,
                endpoint: document.getElementById('localEndpoint').value
            },
            openai: {
                enabled: document.getElementById('openaiEnabled').checked,
                apiKey: document.getElementById('openaiKey').value,
                model: document.getElementById('openaiModel').value
            },
            claude: {
                enabled: document.getElementById('claudeEnabled').checked,
                apiKey: document.getElementById('claudeKey').value,
                model: document.getElementById('claudeModel').value
            },
            perplexity: {
                enabled: document.getElementById('perplexityEnabled').checked,
                apiKey: document.getElementById('perplexityKey').value,
                model: document.getElementById('perplexityModel').value
            },
            grok: {
                enabled: document.getElementById('grokEnabled').checked,
                apiKey: document.getElementById('grokKey').value,
                model: document.getElementById('grokModel').value
            }
        }
    };
    
    try {
        await fetch(`${API}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
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
    
    // Set initial dates for sale form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleBuyDate').value = today;
    document.getElementById('saleSellDate').value = today;
});

// Auto-refresh stats every 30 seconds
setInterval(refreshStats, 30000);