const express = require('express');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer configuration
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database & config files
const DB_FILE = path.join(__dirname, 'data', 'domains.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));

// ── DB helpers ──────────────────────────────────────────────────
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({
            domains: [], watchlist: [], portfolio: [], sales: [], cache: {},
            stats: { totalScans: 0, totalDomains: 0, availableDomains: 0, premiumDomains: 0 }
        }, null, 2));
        console.log('✅ Database initialized');
    }
}

function readDB() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch { return { domains: [], watchlist: [], portfolio: [], sales: [], cache: {}, stats: {} }; }
}

function writeDB(data) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('DB write error:', e.message); }
}

// ── Config helpers ───────────────────────────────────────────────
const DEFAULT_CONFIG = {
    llm: {
        provider: 'local',
        local: { enabled: false, model: 'qwen2.5:3b', endpoint: 'http://localhost:11434/api/generate' },
        openai: { enabled: false, apiKey: '', model: 'gpt-3.5-turbo' },
        claude: { enabled: false, apiKey: '', model: 'claude-3-haiku' },
        perplexity: { enabled: false, apiKey: '', model: 'llama-3.1-sonar-small-128k-online' },
        grok: { enabled: false, apiKey: '', model: 'grok-1' }
    }
};

function readConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
    catch { return DEFAULT_CONFIG; }
}

function writeConfig(cfg) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }
    catch (e) { console.error('Config write error:', e.message); }
}

initDB();

// ── RDAP / WHOIS constants ───────────────────────────────────────
const RDAP_SERVERS = {
    'com': 'https://rdap.verisign.com/com/v1/domain/',
    'net': 'https://rdap.verisign.com/net/v1/domain/',
    'org': 'https://rdap.publicinterestregistry.org/v1/domain/',
    'dev': 'https://pubapi.registry.google/rdap/domain/',
    'app': 'https://pubapi.registry.google/rdap/domain/',
    'page': 'https://pubapi.registry.google/rdap/domain/',
    'io':  'https://rdap.nic.io/v1/domain/',
    'co':  'https://rdap.nic.co/v1/domain/',
    'uk':  'https://rdap.nominet.uk/domain/',
    'de':  'https://rdap.denic.de/domain/',
    'nl':  'https://rdap.sidn.nl/v1/domain/',
    'fr':  'https://rdap.nic.fr/v1/domain/',
    'xyz': 'https://rdap.nic.xyz/v1/domain/',
    'club':'https://rdap.nic.club/v1/domain/',
    'info':'https://rdap.afilias.net/v1/domain/',
    'biz': 'https://rdap.nic.biz/v1/domain/',
    'ai':  'https://rdap.nic.ai/v1/domain/',
};

// ── Generator constants ──────────────────────────────────────────
const CITIES    = ['new','san','los','miami','tokyo','paris','london','berlin','madrid','rome'];
const COUNTRIES = ['usa','uk','japan','france','spain','italy','canada','germany'];
const PREFIXES  = ['best','top','pro','my','get','go','the'];
const KEYWORDS  = ['web','tech','digital','shop','market','hub','zone','app','cloud','online'];

// ── Domain info helpers ──────────────────────────────────────────
function getTLD(domain) {
    const parts = domain.split('.');
    return parts.length >= 2 ? parts[parts.length - 1] : '';
}

function extractRegistrar(rdapData) {
    if (rdapData.entities) {
        for (const entity of rdapData.entities) {
            if (entity.roles && entity.roles.includes('registrar')) {
                if (entity.vcardArray && entity.vcardArray[1]) {
                    for (const field of entity.vcardArray[1]) {
                        if (field[0] === 'fn') return field[3];
                    }
                }
            }
        }
    }
    return 'Unknown';
}

async function fetchViaRDAP(domain) {
    const tld = getTLD(domain);
    // Try TLD-specific RDAP
    if (RDAP_SERVERS[tld]) {
        try {
            const url = `${RDAP_SERVERS[tld]}${domain}`;
            const response = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
            if (response.status === 200 && response.data.events) {
                for (const event of response.data.events) {
                    if (event.eventAction === 'expiration' || event.eventAction === 'expiry') {
                        if (event.eventDate) {
                            return { expirationDate: new Date(event.eventDate), registrar: extractRegistrar(response.data), method: 'rdap' };
                        }
                    }
                }
                if (response.data.expirationDate) {
                    return { expirationDate: new Date(response.data.expirationDate), registrar: extractRegistrar(response.data), method: 'rdap' };
                }
            }
        } catch { /* fallthrough */ }
    }
    // Generic RDAP fallback
    try {
        const response = await axios.get(`https://rdap.org/domain/${domain}`, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
        if (response.status === 200 && response.data.events) {
            for (const event of response.data.events) {
                if (event.eventAction === 'expiration') {
                    return { expirationDate: new Date(event.eventDate), registrar: extractRegistrar(response.data), method: 'rdap' };
                }
            }
        }
    } catch { /* fallthrough */ }
    return null;
}

async function fetchViaWHOIS(domain) {
    const apis = [
        `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_FREE&domainName=${domain}&outputFormat=JSON`,
        `https://jsonwhoisapi.com/api/v1/whois?identifier=${domain}`
    ];
    for (const apiUrl of apis) {
        try {
            const response = await axios.get(apiUrl, { timeout: 10000 });
            if (response.data) {
                const data = response.data;
                let expirationDate = null, registrar = 'Unknown';
                if (data.WhoisRecord) {
                    expirationDate = data.WhoisRecord.expiresDate || data.WhoisRecord.registryData?.expiresDate;
                    registrar = data.WhoisRecord.registrarName || 'Unknown';
                } else if (data.expiry_date) {
                    expirationDate = data.expiry_date;
                    registrar = data.registrar || 'Unknown';
                }
                if (expirationDate) return { expirationDate: new Date(expirationDate), registrar, method: 'whois' };
            }
        } catch { continue; }
    }
    return null;
}

async function checkDomainInfo(domain) {
    try {
        let result = await fetchViaRDAP(domain);
        if (!result) result = await fetchViaWHOIS(domain);
        let hasDNS = false;
        try { await dns.resolve(domain); hasDNS = true; } catch { hasDNS = false; }
        if (result && result.expirationDate) {
            const daysLeft = Math.ceil((result.expirationDate - new Date()) / 86400000);
            return { domain, available: false, hasDNS, expirationDate: result.expirationDate.toISOString(), daysLeft, registrar: result.registrar, method: result.method, lastChecked: Date.now() };
        } else {
            return { domain, available: !hasDNS, hasDNS, expirationDate: null, daysLeft: null, registrar: hasDNS ? 'Unknown' : null, method: 'dns', lastChecked: Date.now() };
        }
    } catch (error) {
        console.error(`Error checking ${domain}:`, error.message);
        return { domain, available: null, hasDNS: false, expirationDate: null, daysLeft: null, registrar: 'Unknown', method: 'error', lastChecked: Date.now() };
    }
}

// ── API ROUTES ───────────────────────────────────────────────────

// Check single domain
app.post('/api/check-domain', async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const db = readDB();
    const key = domain.toLowerCase();
    if (db.cache[key] && (Date.now() - db.cache[key].lastChecked < 86400000)) return res.json(db.cache[key]);
    const result = await checkDomainInfo(domain);
    db.cache[key] = result;
    db.stats.totalScans = (db.stats.totalScans || 0) + 1;
    writeDB(db);
    res.json(result);
});

// Check multiple domains (FIX #1 — was missing, frontend called /api/check-bulk)
app.post('/api/check-domains', async (req, res) => {
    const { domains } = req.body;
    if (!domains || !Array.isArray(domains)) return res.status(400).json({ error: 'Domains array required' });
    const results = [];
    const db = readDB();
    for (const domain of domains) {
        const key = domain.toLowerCase().trim();
        if (!key) continue;
        if (db.cache[key] && (Date.now() - db.cache[key].lastChecked < 86400000)) {
            results.push(db.cache[key]);
        } else {
            const result = await checkDomainInfo(key);
            db.cache[key] = result;
            results.push(result);
            await new Promise(r => setTimeout(r, 500));
        }
    }
    db.stats.totalScans = (db.stats.totalScans || 0) + domains.length;
    db.stats.availableDomains = Object.values(db.cache).filter(d => d.available === true).length;
    writeDB(db);
    res.json({ results, count: results.length });
});

// ✅ FIX #5 + #6 — Generator with minLength, maxLength, allowNumbers + infinite-loop guard
app.post('/api/generate-domains', (req, res) => {
    const { type, keywords, count, tlds, minLength, maxLength, allowNumbers } = req.body;
    const targetCount = Math.min(count || 20, 100);
    const selectedTLDs = tlds && tlds.length > 0 ? tlds : ['.com', '.net', '.org', '.io'];
    const min = Math.max(parseInt(minLength) || 4, 2);
    const max = Math.min(parseInt(maxLength) || 20, 63);
    const withNumbers = allowNumbers !== false; // default true

    const customKW = keywords
        ? keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
        : [];
    const allKeywords = [...KEYWORDS, ...customKW];
    const domains = new Set();
    let attempts = 0; // ✅ FIX #6 — infinite loop guard

    while (domains.size < targetCount && attempts < 500) {
        attempts++;
        let name = '';

        if (type === 'geo' || (type === 'mixed' && Math.random() > 0.5)) {
            const city = CITIES[Math.floor(Math.random() * CITIES.length)];
            const kw   = allKeywords[Math.floor(Math.random() * allKeywords.length)];
            name = city + kw;
        } else {
            const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
            const kw1    = allKeywords[Math.floor(Math.random() * allKeywords.length)];
            const kw2    = allKeywords[Math.floor(Math.random() * allKeywords.length)];
            name = prefix + kw1 + (Math.random() > 0.5 ? kw2 : '');
        }

        // ✅ FIX #5 — Strip numbers if not allowed
        if (!withNumbers) name = name.replace(/[0-9]/g, '');

        // ✅ FIX #5 — Apply length filter
        if (name.length < min || name.length > max) continue;

        const tld = selectedTLDs[Math.floor(Math.random() * selectedTLDs.length)];
        domains.add(name + tld);
    }

    res.json({ domains: Array.from(domains), count: domains.size });
});

// Upload domains from file
app.post('/api/upload-domains', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);
    const domains = content.split(/[\r\n,;\t]+/)
        .map(d => d.trim().toLowerCase())
        .filter(d => d && /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    res.json({ domains, count: domains.length });
});

// Stats — computed live from DB
app.get('/api/stats', (req, res) => {
    const db = readDB();
    const domains = Object.values(db.cache || {});
    const now = Date.now();
    const sales = db.sales || [];
    const portfolio = db.portfolio || [];
    const totalRevenue = sales.reduce((s, x) => s + (parseFloat(x.sellPrice) || 0), 0);
    const totalInvested = sales.reduce((s, x) => s + (parseFloat(x.buyPrice) || 0), 0) +
                          portfolio.reduce((s, x) => s + (parseFloat(x.price) || 0), 0);
    const totalProfit = totalRevenue - sales.reduce((s, x) => s + (parseFloat(x.buyPrice) || 0), 0);
    const totalROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    res.json({
        totalScans: db.stats?.totalScans || domains.length,
        availableDomains: domains.filter(d => d.available === true).length,
        expiring7: domains.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7).length,
        premiumDomains: domains.filter(d => d.premium).length,
        totalMonitored: domains.length,
        totalProfit, totalRevenue, totalInvested, totalROI
    });
});

// Monitoring filter
app.get('/api/monitoring/filter', (req, res) => {
    const db = readDB();
    let monitoring = Object.values(db.cache || {});
    const { keyword, available, registrar } = req.query;
    if (keyword) monitoring = monitoring.filter(d => d.domain && d.domain.includes(keyword.toLowerCase()));
    if (available !== undefined && available !== '') monitoring = monitoring.filter(d => String(d.available) === available);
    if (registrar) monitoring = monitoring.filter(d => d.registrar && d.registrar.toLowerCase().includes(registrar.toLowerCase()));
    monitoring.sort((a, b) => (b.lastChecked || 0) - (a.lastChecked || 0));
    res.json({ monitoring, count: monitoring.length });
});

// Portfolio
app.get('/api/portfolio', (req, res) => { const db = readDB(); res.json(db.portfolio || []); });
app.post('/api/portfolio', (req, res) => {
    const db = readDB();
    const item = { id: Date.now().toString(), ...req.body, dateAdded: new Date().toISOString() };
    db.portfolio.push(item);
    writeDB(db);
    res.json(item);
});

// Sales
app.get('/api/sales', (req, res) => { const db = readDB(); res.json(db.sales || []); });
app.post('/api/sales', (req, res) => {
    const db = readDB();
    const { domain, buyPrice, sellPrice, buyDate, sellDate, notes } = req.body;
    const profit = (parseFloat(sellPrice) || 0) - (parseFloat(buyPrice) || 0);
    const profitPercent = buyPrice > 0 ? ((profit / parseFloat(buyPrice)) * 100).toFixed(1) : '0';
    const sale = { id: Date.now().toString(), domain, buyPrice: parseFloat(buyPrice), sellPrice: parseFloat(sellPrice), profit, profitPercent, buyDate, sellDate, notes, dateAdded: new Date().toISOString() };
    db.sales.push(sale);
    writeDB(db);
    res.json(sale);
});

// Profit analytics
app.get('/api/analytics/profit', (req, res) => {
    const db = readDB();
    const period = req.query.period || 'month';
    const now = new Date();
    let cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);
    const sales = (db.sales || []).filter(s => !s.sellDate || new Date(s.sellDate) >= cutoff);
    const totalSales = sales.length;
    const totalProfit = sales.reduce((s, x) => s + (x.profit || 0), 0);
    const averageProfit = totalSales > 0 ? totalProfit / totalSales : 0;
    const totalRevenue = sales.reduce((s, x) => s + (parseFloat(x.sellPrice) || 0), 0);
    const totalCost = sales.reduce((s, x) => s + (parseFloat(x.buyPrice) || 0), 0);
    const averageProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    res.json({ totalSales, totalProfit, averageProfit, totalRevenue, totalCost, averageProfitPercent });
});

// Config
app.get('/api/config', (req, res) => res.json(readConfig()));
app.post('/api/config', (req, res) => {
    writeConfig(req.body);
    res.json({ success: true });
});

// LLM connection test
app.post('/api/test-llm-connection', async (req, res) => {
    const { provider, endpoint, model, apiKey } = req.body;
    const start = Date.now();
    try {
        if (provider === 'local') {
            const url = endpoint || 'http://localhost:11434/api/generate';
            const r = await axios.post(url, { model: model || 'qwen2.5:3b', prompt: 'Say: OK', stream: false }, { timeout: 15000 });
            return res.json({ success: true, message: 'Local LLM connected', model: model, latency: Date.now() - start });
        } else if (provider === 'openai') {
            const r = await axios.post('https://api.openai.com/v1/chat/completions', { model, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'OpenAI connected', model, latency: Date.now() - start });
        } else if (provider === 'claude') {
            const r = await axios.post('https://api.anthropic.com/v1/messages', { model, max_tokens: 5, messages: [{ role: 'user', content: 'Say OK' }] }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'Claude connected', model, latency: Date.now() - start });
        } else if (provider === 'perplexity') {
            const r = await axios.post('https://api.perplexity.ai/chat/completions', { model, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'Perplexity connected', model, latency: Date.now() - start });
        } else if (provider === 'grok') {
            const r = await axios.post('https://api.x.ai/v1/chat/completions', { model, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'Grok connected', model, latency: Date.now() - start });
        }
        res.status(400).json({ success: false, error: 'Unknown provider' });
    } catch (err) {
        res.json({ success: false, error: err.message, details: err.response?.data?.error?.message || '' });
    }
});

app.listen(PORT, () => {
    console.log(`\n✅ Database initialized`);
    console.log(`\n🚀 Domain Hunter Pro Enhanced!`);
    console.log(`📍 Local:  http://localhost:${PORT}`);
    console.log(`📊 API:    http://localhost:${PORT}/api`);
    console.log(`\n✨ Features:`);
    console.log(`   - 🤖 AI Domain Generator with LLM support`);
    console.log(`   - 🧪 Test LLM Connection`);
    console.log(`   - 📤 Bulk File Upload`);
    console.log(`   - 🔍 Advanced Filtering`);
    console.log(`   - 📊 Profit Tracking & Analytics`);
    console.log(`   - 👁️  Domain Monitoring`);
    console.log(`   - 💼 Portfolio Management`);
    console.log(`   - 💰 Sales History\n`);
});
