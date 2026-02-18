const express = require('express');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });
app.use(express.json());
app.use(express.static('public'));

const DB_FILE     = path.join(__dirname, 'data', 'domains.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const GEONAMES_USERNAME = 'xcybermanx';

if (!fs.existsSync(path.join(__dirname, 'data')))    fs.mkdirSync(path.join(__dirname, 'data'));
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
initDB();

// ── Config helpers ───────────────────────────────────────────────
const DEFAULT_CONFIG = {
    llm: {
        provider: 'local',
        local:       { enabled: false, model: 'qwen2.5:3b', endpoint: 'http://localhost:11434/api/generate' },
        openai:      { enabled: false, apiKey: '', model: 'gpt-3.5-turbo' },
        claude:      { enabled: false, apiKey: '', model: 'claude-3-haiku-20240307' },
        perplexity:  { enabled: false, apiKey: '', model: 'sonar' },
        grok:        { enabled: false, apiKey: '', model: 'grok-beta' }
    }
};

// Auto-migrate old Perplexity model names to new 2026 format
function migrateConfig(config) {
    let migrated = false;
    if (config.llm?.perplexity?.model) {
        const oldModel = config.llm.perplexity.model;
        // Map old llama-3.1-sonar-*-online models to new 'sonar' model
        if (oldModel.includes('llama-3.1-sonar') || oldModel.includes('-online')) {
            console.log(`🔄 Migrating Perplexity model: ${oldModel} → sonar`);
            config.llm.perplexity.model = 'sonar';
            migrated = true;
        }
    }
    if (migrated) {
        writeConfig(config);
        console.log('✅ Config migrated successfully');
    }
    return config;
}

function readConfig() {
    try { 
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); 
        return migrateConfig(config);
    }
    catch { return DEFAULT_CONFIG; }
}
function writeConfig(cfg) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }
    catch (e) { console.error('Config write error:', e.message); }
}

// Run migration on startup
if (fs.existsSync(CONFIG_FILE)) {
    console.log('🔍 Checking for config migrations...');
    readConfig();
}

// ── RDAP / WHOIS constants ───────────────────────────────────────
const RDAP_SERVERS = {
    'com': 'https://rdap.verisign.com/com/v1/domain/',
    'net': 'https://rdap.verisign.com/net/v1/domain/',
    'org': 'https://rdap.publicinterestregistry.org/v1/domain/',
    'dev': 'https://pubapi.registry.google/rdap/domain/',
    'app': 'https://pubapi.registry.google/rdap/domain/',
    'page':'https://pubapi.registry.google/rdap/domain/',
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

// ── Smart generator word banks ───────────────────────────────────
const FALLBACK_GEO_WORDS = ['properties','realty','homes','rentals','living','stays','guide','tours','eats','market','hub','zone','digital','tech','shop','agency','group','media','services','solutions'];
const FALLBACK_BIZ_WORDS = ['pro','hub','zone','digital','tech','shop','market','cloud','app','online','agency','group','media','solutions','services','studio','labs','works','HQ','desk'];
const GEO_SUFFIXES       = ['properties','realty','homes','rentals','living','stays','guide','tours','eats','market','hub','zone','agency','group','services','digital','media','studio','solutions','invest','capital','ventures','network','connect','links','city','place','spot'];
const BIZ_PREFIXES       = ['best','top','pro','my','get','go','the','smart','fast','easy','real','true','next','open','peak','core','bold','nova','apex','flux'];
const BIZ_INDUSTRY_WORDS = ['tech','digital','shop','market','hub','zone','app','cloud','online','agency','media','studio','labs','works','desk','link','base','point','gate','space','mind','brand','scale','shift','flow','forge','pulse','spark','rise','edge'];

// ── LLM-powered generator ────────────────────────────────────────
async function generateWithLLM(keywords, type, count, tlds) {
    const config = readConfig();
    const llmCfg = config.llm || {};
    const provider = llmCfg.provider || 'local';
    const providerCfg = llmCfg[provider] || {};
    const tldList = tlds.join(', ');
    const kwStr   = keywords.length > 0 ? keywords.join(', ') : 'general business';
    const style   = type === 'geo'
        ? 'geographic/location-based domain names (city + industry style)'
        : type === 'business'
            ? 'creative business domain names (professional, brandable)'
            : 'a mix of geographic and creative business domain names';
    const prompt = `Generate exactly ${count} unique, creative, and brandable domain names.

Requirements:
- Keywords to focus on: ${kwStr}
- Style: ${style}
- Use ONLY these TLD extensions: ${tldList}
- Each domain must be unique, memorable, and professional
- Incorporate the keywords naturally into the domain names
- Mix different patterns: keyword+word, word+keyword, abbreviations, creative combinations
- NO generic random combinations — every domain should feel intentional and marketable

Output ONLY a plain list of domains, one per line, no numbering, no explanation, no extra text.
Example format:
madridrealty.com
propertiesmadrid.es
madridpro.io`;
    try {
        let responseText = '';
        if (provider === 'local') {
            const r = await axios.post(providerCfg.endpoint || 'http://localhost:11434/api/generate', { model: providerCfg.model || 'qwen2.5:3b', prompt, stream: false }, { timeout: 60000 });
            responseText = r.data?.response || '';
        } else if (provider === 'openai') {
            const r = await axios.post('https://api.openai.com/v1/chat/completions', { model: providerCfg.model || 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0.8 }, { headers: { Authorization: `Bearer ${providerCfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        } else if (provider === 'claude') {
            const r = await axios.post('https://api.anthropic.com/v1/messages', { model: providerCfg.model || 'claude-3-haiku-20240307', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }, { headers: { 'x-api-key': providerCfg.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.content?.[0]?.text || '';
        } else if (provider === 'perplexity') {
            const r = await axios.post('https://api.perplexity.ai/chat/completions', { model: providerCfg.model || 'sonar', messages: [{ role: 'user', content: prompt }] }, { headers: { Authorization: `Bearer ${providerCfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        } else if (provider === 'grok') {
            const r = await axios.post('https://api.x.ai/v1/chat/completions', { model: providerCfg.model || 'grok-beta', messages: [{ role: 'user', content: prompt }], max_tokens: 800 }, { headers: { Authorization: `Bearer ${providerCfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        }
        const lines = responseText.split(/\n/)
            .map(l => l.trim().toLowerCase().replace(/^[\d.\-)\s]+/, ''))
            .filter(l => /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(l));
        if (lines.length >= 3) return lines;
    } catch (err) {
        console.error('LLM generation failed, falling back to smart generator:', err.message);
    }
    return null;
}

// ── Smart keyword-aware generator (no-LLM fallback) ──────────────
function generateSmart(keywords, type, count, tlds, minLen, maxLen, allowNumbers, allowHyphens) {
    const domains = new Set();
    let attempts  = 0;
    const maxAttempts = Math.max(count * 30, 500);
    const userKWs = keywords.length > 0 ? keywords : null;
    while (domains.size < count && attempts < maxAttempts) {
        attempts++;
        let name = '';
        if (type === 'geo' || (type === 'mixed' && Math.random() > 0.5)) {
            const kw     = userKWs ? userKWs[Math.floor(Math.random() * userKWs.length)] : FALLBACK_GEO_WORDS[Math.floor(Math.random() * FALLBACK_GEO_WORDS.length)];
            const suffix = GEO_SUFFIXES[Math.floor(Math.random() * GEO_SUFFIXES.length)];
            const p = Math.floor(Math.random() * 4);
            if (p === 0) name = kw + suffix;
            else if (p === 1) name = suffix + kw;
            else if (p === 2) name = kw + '-' + suffix;
            else name = kw + suffix.charAt(0).toUpperCase() + suffix.slice(1);
            name = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
        } else {
            const kw     = userKWs ? userKWs[Math.floor(Math.random() * userKWs.length)] : FALLBACK_BIZ_WORDS[Math.floor(Math.random() * FALLBACK_BIZ_WORDS.length)];
            const word   = BIZ_INDUSTRY_WORDS[Math.floor(Math.random() * BIZ_INDUSTRY_WORDS.length)];
            const prefix = BIZ_PREFIXES[Math.floor(Math.random() * BIZ_PREFIXES.length)];
            const p = Math.floor(Math.random() * 5);
            if (p === 0) name = kw + word;
            else if (p === 1) name = prefix + kw;
            else if (p === 2) name = kw + '-' + word;
            else if (p === 3) name = word + kw;
            else name = prefix + kw + word;
            name = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
        }
        if (!allowNumbers) name = name.replace(/[0-9]/g, '');
        if (!allowHyphens)  name = name.replace(/-/g, '');
        if (name.length < minLen || name.length > maxLen) continue;
        if (name.startsWith('-') || name.endsWith('-')) continue;
        const tld = tlds[Math.floor(Math.random() * tlds.length)];
        domains.add(name + tld);
    }
    return Array.from(domains);
}

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
    if (RDAP_SERVERS[tld]) {
        try {
            const response = await axios.get(`${RDAP_SERVERS[tld]}${domain}`, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
            if (response.status === 200 && response.data.events) {
                for (const event of response.data.events) {
                    if (event.eventAction === 'expiration' || event.eventAction === 'expiry') {
                        if (event.eventDate) return { expirationDate: new Date(event.eventDate), registrar: extractRegistrar(response.data), method: 'rdap' };
                    }
                }
                if (response.data.expirationDate) return { expirationDate: new Date(response.data.expirationDate), registrar: extractRegistrar(response.data), method: 'rdap' };
            }
        } catch { /* fallthrough */ }
    }
    try {
        const response = await axios.get(`https://rdap.org/domain/${domain}`, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
        if (response.status === 200 && response.data.events) {
            for (const event of response.data.events) {
                if (event.eventAction === 'expiration') return { expirationDate: new Date(event.eventDate), registrar: extractRegistrar(response.data), method: 'rdap' };
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

app.post('/api/check-domain', async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const db  = readDB();
    const key = domain.toLowerCase();
    if (db.cache[key] && (Date.now() - db.cache[key].lastChecked < 86400000)) return res.json(db.cache[key]);
    const result = await checkDomainInfo(domain);
    db.cache[key] = result;
    db.stats.totalScans = (db.stats.totalScans || 0) + 1;
    writeDB(db);
    res.json(result);
});

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
    db.stats.totalScans       = (db.stats.totalScans || 0) + domains.length;
    db.stats.availableDomains = Object.values(db.cache).filter(d => d.available === true).length;
    writeDB(db);
    res.json({ results, count: results.length });
});

// GeoNames API endpoints
app.get('/api/geonames/search', async (req, res) => {
    const { q, type } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter required' });
    const searchType = type === 'countries' ? 'countries' : 'cities';
    try {
        let url = '';
        if (searchType === 'countries') {
            url = `http://api.geonames.org/searchJSON?q=${encodeURIComponent(q)}&featureClass=A&featureCode=PCLI&maxRows=10&username=${GEONAMES_USERNAME}&style=SHORT`;
        } else {
            url = `http://api.geonames.org/searchJSON?q=${encodeURIComponent(q)}&featureClass=P&maxRows=10&username=${GEONAMES_USERNAME}&style=SHORT&orderby=population`;
        }
        const response = await axios.get(url, { timeout: 5000 });
        const results = (response.data?.geonames || []).map(g => ({
            name: g.name,
            country: g.countryName || g.countryCode || '',
            countryCode: g.countryCode || '',
            population: g.population || 0,
            geonameId: g.geonameId
        }));
        res.json({ results });
    } catch (err) {
        console.error('GeoNames API error:', err.message);
        res.status(500).json({ error: 'Failed to fetch from GeoNames', details: err.message });
    }
});

// Get all countries
app.get('/api/geonames/countries', async (req, res) => {
    try {
        const response = await axios.get(`http://api.geonames.org/countryInfoJSON?username=${GEONAMES_USERNAME}`, { timeout: 5000 });
        const countries = (response.data?.geonames || []).map(c => ({
            name: c.countryName,
            countryCode: c.countryCode,
            population: c.population || 0,
            capital: c.capital || '',
            continent: c.continentName || ''
        })).sort((a, b) => b.population - a.population);
        res.json({ countries });
    } catch (err) {
        console.error('GeoNames countries error:', err.message);
        res.status(500).json({ error: 'Failed to fetch countries', details: err.message });
    }
});

// Get cities by country
app.get('/api/geonames/cities/:countryCode', async (req, res) => {
    const { countryCode } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    try {
        const url = `http://api.geonames.org/searchJSON?country=${countryCode}&featureClass=P&maxRows=${limit}&username=${GEONAMES_USERNAME}&orderby=population&style=FULL`;
        const response = await axios.get(url, { timeout: 5000 });
        const cities = (response.data?.geonames || []).map(c => ({
            name: c.name,
            population: c.population || 0,
            countryCode: c.countryCode,
            geonameId: c.geonameId,
            adminName: c.adminName1 || ''
        }));
        res.json({ cities, count: cities.length });
    } catch (err) {
        console.error('GeoNames cities error:', err.message);
        res.status(500).json({ error: 'Failed to fetch cities', details: err.message });
    }
});

// AI Domain Generator
app.post('/api/generate-domains', async (req, res) => {
    const { type, keywords, count, useLLM, tlds, minLength, maxLength, allowNumbers, allowHyphens } = req.body;
    const targetCount  = Math.min(parseInt(count) || 20, 100);
    const selectedTLDs = (tlds && tlds.length > 0) ? tlds : ['.com', '.net', '.org', '.io'];
    const minLen       = Math.max(parseInt(minLength) || 4, 2);
    const maxLen       = Math.min(parseInt(maxLength) || 30, 63);
    const withNumbers  = allowNumbers !== false;
    const withHyphens  = allowHyphens !== false;
    let kwArray = [];
    if (Array.isArray(keywords)) {
        kwArray = keywords.map(k => k.trim().toLowerCase()).filter(Boolean);
    } else if (typeof keywords === 'string' && keywords.trim()) {
        kwArray = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    }
    let domains = [];
    if (useLLM) {
        console.log(`🤖 Attempting LLM generation for keywords: [${kwArray.join(', ')}]`);
        const llmResult = await generateWithLLM(kwArray, type, targetCount, selectedTLDs);
        if (llmResult && llmResult.length >= 3) {
            domains = llmResult.filter(d => {
                const namePart = d.split('.')[0];
                if (!withNumbers && /[0-9]/.test(namePart)) return false;
                if (!withHyphens && /-/.test(namePart)) return false;
                if (namePart.length < minLen || namePart.length > maxLen) return false;
                return true;
            }).slice(0, targetCount);
            console.log(`✅ LLM generated ${domains.length} domains`);
        } else {
            console.log('⚠️ LLM returned insufficient results, using smart fallback');
        }
    }
    if (domains.length < targetCount) {
        const remaining    = targetCount - domains.length;
        const smartDomains = generateSmart(kwArray, type, remaining, selectedTLDs, minLen, maxLen, withNumbers, withHyphens);
        domains = [...new Set([...domains, ...smartDomains])].slice(0, targetCount);
    }
    res.json({ domains, count: domains.length, usedLLM: useLLM && domains.length > 0 });
});

app.post('/api/upload-domains', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);
    const domains = content.split(/[\r\n,;\t]+/)
        .map(d => d.trim().toLowerCase())
        .filter(d => d && /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    res.json({ domains, count: domains.length });
});

app.get('/api/stats', (req, res) => {
    const db        = readDB();
    const domains   = Object.values(db.cache || {});
    const sales     = db.sales     || [];
    const portfolio = db.portfolio || [];
    const totalRevenue   = sales.reduce((s, x) => s + (parseFloat(x.sellPrice) || 0), 0);
    const totalCostSales = sales.reduce((s, x) => s + (parseFloat(x.buyPrice)  || 0), 0);
    const totalInvested  = totalCostSales + portfolio.reduce((s, x) => s + (parseFloat(x.price) || 0), 0);
    const totalProfit    = totalRevenue - totalCostSales;
    const totalROI       = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    const expiring30     = domains.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 30).length;
    res.json({
        totalScans:       db.stats?.totalScans || domains.length,
        availableDomains: domains.filter(d => d.available === true).length,
        expiring7:        domains.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7).length,
        expiring30,
        premiumDomains:   domains.filter(d => d.premium).length,
        totalMonitored:   domains.length,
        totalProfit, totalRevenue, totalInvested, totalROI
    });
});

// ── Monitoring routes ────────────────────────────────────────────

app.get('/api/monitoring/filter', (req, res) => {
    const db = readDB();
    let monitoring = Object.values(db.cache || {});
    const { keyword, available, registrar } = req.query;
    if (keyword)   monitoring = monitoring.filter(d => d.domain && d.domain.includes(keyword.toLowerCase()));
    if (available !== undefined && available !== '') monitoring = monitoring.filter(d => String(d.available) === available);
    if (registrar) monitoring = monitoring.filter(d => d.registrar && d.registrar.toLowerCase().includes(registrar.toLowerCase()));
    monitoring.sort((a, b) => (b.lastChecked || 0) - (a.lastChecked || 0));
    res.json({ monitoring, count: monitoring.length });
});

app.post('/api/monitoring', async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const key = domain.toLowerCase().trim();
    const db  = readDB();
    if (db.cache[key]) {
        return res.json({ success: true, domain: db.cache[key], alreadyExists: true });
    }
    const result = await checkDomainInfo(key);
    db.cache[key] = result;
    writeDB(db);
    res.json({ success: true, domain: result });
});

app.delete('/api/monitoring/:domain', (req, res) => {
    const key = req.params.domain.toLowerCase();
    const db  = readDB();
    if (!db.cache[key]) return res.status(404).json({ error: 'Domain not found in monitoring' });
    delete db.cache[key];
    writeDB(db);
    res.json({ success: true, removed: key });
});

// Remove all monitored domains
app.delete('/api/monitoring', (req, res) => {
    const db = readDB();
    const count = Object.keys(db.cache || {}).length;
    db.cache = {};
    writeDB(db);
    res.json({ success: true, removed: count });
});

app.get('/api/expiring', (req, res) => {
    const maxDays = parseInt(req.query.maxDays) || 30;
    const db = readDB();
    let expiring = Object.values(db.cache || {})
        .filter(d => d.daysLeft !== null && d.daysLeft !== undefined && d.daysLeft >= 0 && d.daysLeft <= maxDays)
        .sort((a, b) => (a.daysLeft || 999) - (b.daysLeft || 999));
    res.json({ expiring, count: expiring.length });
});

// ── Portfolio routes ─────────────────────────────────────────────

app.get('/api/portfolio', (req, res) => { const db = readDB(); res.json(db.portfolio || []); });

app.post('/api/portfolio', (req, res) => {
    const db   = readDB();
    const item = { id: Date.now().toString(), ...req.body, dateAdded: new Date().toISOString() };
    db.portfolio.push(item);
    writeDB(db);
    res.json(item);
});

app.delete('/api/portfolio/:id', (req, res) => {
    const db  = readDB();
    const idx = db.portfolio.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Portfolio item not found' });
    const removed = db.portfolio.splice(idx, 1)[0];
    writeDB(db);
    res.json({ success: true, removed });
});

// ── Sales routes ─────────────────────────────────────────────────

app.get('/api/sales', (req, res) => { const db = readDB(); res.json(db.sales || []); });

app.post('/api/sales', (req, res) => {
    const db = readDB();
    const { domain, buyPrice, sellPrice, buyDate, sellDate, notes } = req.body;
    const profit        = (parseFloat(sellPrice) || 0) - (parseFloat(buyPrice) || 0);
    const profitPercent = buyPrice > 0 ? ((profit / parseFloat(buyPrice)) * 100).toFixed(1) : '0';
    const sale = { id: Date.now().toString(), domain, buyPrice: parseFloat(buyPrice), sellPrice: parseFloat(sellPrice), profit, profitPercent, buyDate, sellDate, notes, dateAdded: new Date().toISOString() };
    db.sales.push(sale);
    writeDB(db);
    res.json(sale);
});

// ── Analytics ────────────────────────────────────────────────────

app.get('/api/analytics/profit', (req, res) => {
    const db     = readDB();
    const period = req.query.period || 'month';
    const now    = new Date();
    let cutoff   = new Date();
    if      (period === 'week')  cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else if (period === 'year')  cutoff.setFullYear(now.getFullYear() - 1);
    const sales = (db.sales || []).filter(s => !s.sellDate || new Date(s.sellDate) >= cutoff);
    const totalSales           = sales.length;
    const totalProfit          = sales.reduce((s, x) => s + (x.profit || 0), 0);
    const averageProfit        = totalSales > 0 ? totalProfit / totalSales : 0;
    const totalRevenue         = sales.reduce((s, x) => s + (parseFloat(x.sellPrice) || 0), 0);
    const totalCost            = sales.reduce((s, x) => s + (parseFloat(x.buyPrice)  || 0), 0);
    const averageProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    res.json({ totalSales, totalProfit, averageProfit, totalRevenue, totalCost, averageProfitPercent });
});

// ── Config / LLM ─────────────────────────────────────────────────

app.get('/api/config',  (req, res) => res.json(readConfig()));
app.post('/api/config', (req, res) => { writeConfig(req.body); res.json({ success: true }); });

app.post('/api/test-llm-connection', async (req, res) => {
    const { provider, endpoint, model, apiKey } = req.body;
    const start = Date.now();
    try {
        if (provider === 'local') {
            await axios.post(endpoint || 'http://localhost:11434/api/generate', { model: model || 'qwen2.5:3b', prompt: 'Say: OK', stream: false }, { timeout: 15000 });
            return res.json({ success: true, message: 'Local LLM connected', model, latency: Date.now() - start });
        } else if (provider === 'openai') {
            await axios.post('https://api.openai.com/v1/chat/completions', { model, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'OpenAI connected', model, latency: Date.now() - start });
        } else if (provider === 'claude') {
            await axios.post('https://api.anthropic.com/v1/messages', { model, max_tokens: 5, messages: [{ role: 'user', content: 'Say OK' }] }, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'Claude connected', model, latency: Date.now() - start });
        } else if (provider === 'perplexity') {
            await axios.post('https://api.perplexity.ai/chat/completions', { model, messages: [{ role: 'user', content: 'Say OK' }] }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'Perplexity connected', model, latency: Date.now() - start });
        } else if (provider === 'grok') {
            await axios.post('https://api.x.ai/v1/chat/completions', { model, messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 5 }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 });
            return res.json({ success: true, message: 'Grok connected', model, latency: Date.now() - start });
        }
        res.status(400).json({ success: false, error: 'Unknown provider' });
    } catch (err) {
        res.json({ success: false, error: err.message, details: err.response?.data?.error?.message || err.response?.data?.detail || '' });
    }
});

app.listen(PORT, () => {
    console.log(`\n✅ Database initialized`);
    console.log(`\n🚀 Domain Hunter Pro Enhanced!`);
    console.log(`📍 Local:  http://localhost:${PORT}`);
    console.log(`📊 API:    http://localhost:${PORT}/api`);
    console.log(`\n✨ Features:`);
    console.log(`   - 🤖 AI Domain Generator with LLM support`);
    console.log(`   - 🌍 GeoNames Location Integration (username: ${GEONAMES_USERNAME})`);
    console.log(`   - 🧪 Test LLM Connection`);
    console.log(`   - 📤 Bulk File Upload`);
    console.log(`   - 🔍 Advanced Filtering`);
    console.log(`   - 📊 Profit Tracking & Analytics`);
    console.log(`   - 👁️  Domain Monitoring`);
    console.log(`   - 💼 Portfolio Management`);
    console.log(`   - 💰 Sales History\n`);
});
