const express = require('express');
const dns = require('dns').promises;
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

const upload = multer({ dest: 'uploads/' });
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'data', 'domains.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const SCHEDULES_FILE = path.join(__dirname, 'data', 'schedules.json');
const WEBHOOKS_FILE = path.join(__dirname, 'data', 'webhooks.json');
const GEONAMES_USERNAME = 'xcybermanx';

if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(path.join(__dirname, 'uploads'))) fs.mkdirSync(path.join(__dirname, 'uploads'));

// ── Rate Limiting ───────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: { error: 'Too many authentication attempts, please try again later' }
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute  
    max: 60, // 60 requests per minute
    message: { error: 'Too many requests, please slow down' }
});

// ── DB Helpers ──────────────────────────────────────────────────
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ cache: {} }, null, 2));
        console.log('✅ Database initialized');
    }
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
        console.log('✅ Users database initialized');
    }
    if (!fs.existsSync(SCHEDULES_FILE)) {
        fs.writeFileSync(SCHEDULES_FILE, JSON.stringify({ schedules: [] }, null, 2));
        console.log('✅ Schedules database initialized');
    }
    if (!fs.existsSync(WEBHOOKS_FILE)) {
        fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify({ webhooks: [] }, null, 2));
        console.log('✅ Webhooks database initialized');
    }
}

function readDB() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
    catch { return { cache: {} }; }
}

function writeDB(data) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('DB write error:', e.message); }
}

function readUsers() {
    try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
    catch { return { users: [] }; }
}

function writeUsers(data) {
    try { fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('Users write error:', e.message); }
}

function readSchedules() {
    try { return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8')); }
    catch { return { schedules: [] }; }
}

function writeSchedules(data) {
    try { fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('Schedules write error:', e.message); }
}

function readWebhooks() {
    try { return JSON.parse(fs.readFileSync(WEBHOOKS_FILE, 'utf8')); }
    catch { return { webhooks: [] }; }
}

function writeWebhooks(data) {
    try { fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('Webhooks write error:', e.message); }
}

initDB();

// ── Auth Middleware ─────────────────────────────────────────────
function authenticateToken(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// ── Config Helpers ──────────────────────────────────────────────
const DEFAULT_CONFIG = {
    llm: {
        provider: 'local',
        local: { enabled: false, model: 'qwen2.5:3b', endpoint: 'http://localhost:11434/api/generate' },
        openai: { enabled: false, apiKey: '', model: 'gpt-3.5-turbo' },
        claude: { enabled: false, apiKey: '', model: 'claude-3-haiku-20240307' },
        perplexity: { enabled: false, apiKey: '', model: 'sonar' },
        grok: { enabled: false, apiKey: '', model: 'grok-beta' }
    },
    seo: {
        mozApiKey: '',
        mozApiSecret: '',
        ahrefsApiKey: ''
    }
};

function migrateConfig(config) {
    let migrated = false;
    if (config.llm?.perplexity?.model) {
        const oldModel = config.llm.perplexity.model;
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
    } catch { return DEFAULT_CONFIG; }
}

function writeConfig(cfg) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }
    catch (e) { console.error('Config write error:', e.message); }
}

if (fs.existsSync(CONFIG_FILE)) {
    console.log('🔍 Checking for config migrations...');
    readConfig();
}

// ── RDAP / WHOIS Constants ──────────────────────────────────────
const RDAP_SERVERS = {
    'com': 'https://rdap.verisign.com/com/v1/domain/',
    'net': 'https://rdap.verisign.com/net/v1/domain/',
    'org': 'https://rdap.publicinterestregistry.org/v1/domain/',
    'dev': 'https://pubapi.registry.google/rdap/domain/',
    'app': 'https://pubapi.registry.google/rdap/domain/',
    'page': 'https://pubapi.registry.google/rdap/domain/',
    'io': 'https://rdap.nic.io/v1/domain/',
    'co': 'https://rdap.nic.co/v1/domain/',
    'uk': 'https://rdap.nominet.uk/domain/',
    'de': 'https://rdap.denic.de/domain/',
    'nl': 'https://rdap.sidn.nl/v1/domain/',
    'fr': 'https://rdap.nic.fr/v1/domain/',
    'xyz': 'https://rdap.nic.xyz/v1/domain/',
    'club': 'https://rdap.nic.club/v1/domain/',
    'info': 'https://rdap.afilias.net/v1/domain/',
    'biz': 'https://rdap.nic.biz/v1/domain/',
    'ai': 'https://rdap.nic.ai/v1/domain/',
};

// ── Smart Generator Word Banks ──────────────────────────────────
const FALLBACK_BIZ_WORDS = ['pro', 'hub', 'zone', 'digital', 'tech', 'shop', 'market', 'cloud', 'app', 'online', 'agency', 'group', 'media', 'solutions', 'services', 'studio', 'labs', 'works', 'HQ', 'desk'];
const BIZ_PREFIXES = ['best', 'top', 'pro', 'my', 'get', 'go', 'the', 'smart', 'fast', 'easy', 'real', 'true', 'next', 'open', 'peak', 'core', 'bold', 'nova', 'apex', 'flux'];
const BIZ_INDUSTRY_WORDS = ['tech', 'digital', 'shop', 'market', 'hub', 'zone', 'app', 'cloud', 'online', 'agency', 'media', 'studio', 'labs', 'works', 'desk', 'link', 'base', 'point', 'gate', 'space', 'mind', 'brand', 'scale', 'shift', 'flow', 'forge', 'pulse', 'spark', 'rise', 'edge'];

// ── LLM-Powered Generator (FIXED) ───────────────────────────────
async function generateWithLLM(keywords, type, count, tlds) {
    const config = readConfig();
    const llmCfg = config.llm || {};
    const provider = llmCfg.provider || 'local';
    const providerCfg = llmCfg[provider] || {};
    
    // 🔥 FIX: Check if provider is enabled before attempting
    if (!providerCfg.enabled) {
        console.log(`⚠️ LLM provider "${provider}" is not enabled in settings`);
        return null;
    }
    
    const tldList = tlds.join(', ');
    const kwStr = keywords.length > 0 ? keywords.join(', ') : 'general business';
    const style = type === 'business' ? 'creative business domain names (professional, brandable)' : type === 'geo' ? 'location-based geo domain names' : 'a mix of creative and industry-focused domain names';
    const prompt = `Generate exactly ${count} unique, creative, and brandable domain names.\n\nRequirements:\n- Keywords to focus on: ${kwStr}\n- Style: ${style}\n- Use ONLY these TLD extensions: ${tldList}\n- Each domain must be unique, memorable, and professional\n- Incorporate the keywords naturally into the domain names\n- Mix different patterns: keyword+word, word+keyword, abbreviations, creative combinations\n- NO generic random combinations — every domain should feel intentional and marketable\n\nOutput ONLY a plain list of domains, one per line, no numbering, no explanation, no extra text.\nExample format:\nmadridpro.io\ndigitalagency.com\nbrandflow.app`;
    
    console.log(`🤖 Attempting LLM generation with ${provider} (${providerCfg.model || 'default'})`);
    
    try {
        let responseText = '';
        if (provider === 'local') {
            const endpoint = providerCfg.endpoint || 'http://localhost:11434/api/generate';
            const model = providerCfg.model || 'qwen2.5:3b';
            const r = await axios.post(endpoint, { model, prompt, stream: false }, { timeout: 60000 });
            responseText = r.data?.response || '';
        } else if (provider === 'openai') {
            if (!providerCfg.apiKey) throw new Error('OpenAI API key not configured');
            const r = await axios.post('https://api.openai.com/v1/chat/completions', { model: providerCfg.model || 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0.8 }, { headers: { Authorization: `Bearer ${providerCfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        } else if (provider === 'claude') {
            if (!providerCfg.apiKey) throw new Error('Claude API key not configured');
            const r = await axios.post('https://api.anthropic.com/v1/messages', { model: providerCfg.model || 'claude-3-haiku-20240307', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }, { headers: { 'x-api-key': providerCfg.apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.content?.[0]?.text || '';
        } else if (provider === 'perplexity') {
            if (!providerCfg.apiKey) throw new Error('Perplexity API key not configured');
            const r = await axios.post('https://api.perplexity.ai/chat/completions', { model: providerCfg.model || 'sonar', messages: [{ role: 'user', content: prompt }] }, { headers: { Authorization: `Bearer ${providerCfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        } else if (provider === 'grok') {
            if (!providerCfg.apiKey) throw new Error('Grok API key not configured');
            const r = await axios.post('https://api.x.ai/v1/chat/completions', { model: providerCfg.model || 'grok-beta', messages: [{ role: 'user', content: prompt }], max_tokens: 800 }, { headers: { Authorization: `Bearer ${providerCfg.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        }
        
        const lines = responseText.split(/\n/).map(l => l.trim().toLowerCase().replace(/^[\d.\-)\s]+/, '')).filter(l => /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(l));
        console.log(`✅ LLM generated ${lines.length} valid domains`);
        if (lines.length >= 3) return lines;
        else {
            console.log('⚠️ LLM returned insufficient results, falling back to smart generator');
            return null;
        }
    } catch (err) {
        console.error(`❌ LLM generation failed (${provider}):`, err.message);
        return null;
    }
}

// ── Smart Keyword-Aware Generator ───────────────────────────────
function generateSmart(keywords, type, count, tlds, minLen, maxLen, allowNumbers, allowHyphens) {
    const domains = new Set();
    let attempts = 0;
    const maxAttempts = Math.max(count * 30, 500);
    const userKWs = keywords.length > 0 ? keywords : null;
    
    while (domains.size < count && attempts < maxAttempts) {
        attempts++;
        let name = '';
        const kw = userKWs ? userKWs[Math.floor(Math.random() * userKWs.length)] : FALLBACK_BIZ_WORDS[Math.floor(Math.random() * FALLBACK_BIZ_WORDS.length)];
        const word = BIZ_INDUSTRY_WORDS[Math.floor(Math.random() * BIZ_INDUSTRY_WORDS.length)];
        const prefix = BIZ_PREFIXES[Math.floor(Math.random() * BIZ_PREFIXES.length)];
        const p = Math.floor(Math.random() * 5);
        
        if (p === 0) name = kw + word;
        else if (p === 1) name = prefix + kw;
        else if (p === 2) name = kw + '-' + word;
        else if (p === 3) name = word + kw;
        else name = prefix + kw + word;
        
        name = name.toLowerCase().replace(/[^a-z0-9-]/g, '');
        if (!allowNumbers) name = name.replace(/[0-9]/g, '');
        if (!allowHyphens) name = name.replace(/-/g, '');
        if (name.length < minLen || name.length > maxLen) continue;
        if (name.startsWith('-') || name.endsWith('-')) continue;
        
        const tld = tlds[Math.floor(Math.random() * tlds.length)];
        domains.add(name + tld);
    }
    return Array.from(domains);
}

// ── Domain Info Helpers ─────────────────────────────────────────
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

// ── SEO Metrics Helpers ─────────────────────────────────────────
async function fetchSEOMetrics(domain) {
    const config = readConfig();
    const seoConfig = config.seo || {};
    const metrics = { domain, da: null, pa: null, backlinks: null, refDomains: null, error: null };
    
    // Try Moz API for DA/PA
    if (seoConfig.mozApiKey && seoConfig.mozApiSecret) {
        try {
            // Moz API implementation would go here
            // This is a placeholder - you need actual Moz API credentials
            metrics.da = Math.floor(Math.random() * 100); // Placeholder
            metrics.pa = Math.floor(Math.random() * 100); // Placeholder
        } catch (err) {
            metrics.error = 'Moz API error: ' + err.message;
        }
    }
    
    // Try Ahrefs API for backlinks
    if (seoConfig.ahrefsApiKey) {
        try {
            // Ahrefs API implementation would go here
            metrics.backlinks = Math.floor(Math.random() * 10000); // Placeholder
            metrics.refDomains = Math.floor(Math.random() * 1000); // Placeholder
        } catch (err) {
            metrics.error = 'Ahrefs API error: ' + err.message;
        }
    }
    
    return metrics;
}

// ── Webhook Helpers ─────────────────────────────────────────────
async function triggerWebhook(event, data) {
    const webhooks = readWebhooks();
    const activeWebhooks = webhooks.webhooks.filter(w => w.active && w.events.includes(event));
    
    for (const webhook of activeWebhooks) {
        try {
            await axios.post(webhook.url, {
                event,
                timestamp: new Date().toISOString(),
                data
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000
            });
            console.log(`✅ Webhook triggered: ${webhook.name} for event: ${event}`);
        } catch (err) {
            console.error(`❌ Webhook failed: ${webhook.name}:`, err.message);
        }
    }
}

// ── Scheduler System ────────────────────────────────────────────
let scheduledJobs = new Map();

function initScheduler() {
    const schedules = readSchedules();
    schedules.schedules.filter(s => s.active).forEach(schedule => {
        startSchedule(schedule);
    });
    console.log(`✅ Scheduler initialized with ${scheduledJobs.size} active jobs`);
}

function startSchedule(schedule) {
    if (scheduledJobs.has(schedule.id)) {
        scheduledJobs.get(schedule.id).stop();
    }
    
    const job = cron.schedule(schedule.cron, async () => {
        console.log(`🔄 Running scheduled check: ${schedule.name}`);
        try {
            const db = readDB();
            const domainsToCheck = schedule.domains || [];
            
            for (const domain of domainsToCheck) {
                const result = await checkDomainInfo(domain);
                db.cache[domain.toLowerCase()] = result;
                
                // Trigger webhooks if domain becomes available
                if (result.available === true) {
                    await triggerWebhook('domain.available', { domain, result });
                }
                
                // Check expiration alerts
                if (result.daysLeft !== null && result.daysLeft <= 7) {
                    await triggerWebhook('domain.expiring', { domain, daysLeft: result.daysLeft });
                }
                
                await new Promise(r => setTimeout(r, 1000)); // Rate limit
            }
            
            writeDB(db);
            console.log(`✅ Scheduled check completed: ${schedule.name}`);
        } catch (err) {
            console.error(`❌ Scheduled check failed: ${schedule.name}:`, err.message);
        }
    });
    
    scheduledJobs.set(schedule.id, job);
}

function stopSchedule(scheduleId) {
    if (scheduledJobs.has(scheduleId)) {
        scheduledJobs.get(scheduleId).stop();
        scheduledJobs.delete(scheduleId);
    }
}

// Initialize scheduler on startup
setTimeout(initScheduler, 2000);

// ── AUTHENTICATION ROUTES ───────────────────────────────────────

app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const users = readUsers();
        
        if (users.users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        if (users.users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            portfolio: [],
            sales: []
        };
        
        users.users.push(newUser);
        writeUsers(users);
        
        const token = jwt.sign({ id: newUser.id, username: newUser.username, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        
        res.json({
            success: true,
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const users = readUsers();
        const user = users.users.find(u => u.email === email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        
        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, username: user.username, email: user.email });
});

// ── API ROUTES (Domain Checking) ────────────────────────────────

app.post('/api/check-domain', apiLimiter, async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const db = readDB();
    const key = domain.toLowerCase();
    if (db.cache[key] && (Date.now() - db.cache[key].lastChecked < 86400000)) return res.json(db.cache[key]);
    const result = await checkDomainInfo(domain);
    db.cache[key] = result;
    writeDB(db);
    res.json(result);
});

app.post('/api/check-domains', apiLimiter, async (req, res) => {
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
app.post('/api/generate-domains', apiLimiter, async (req, res) => {
    const { type, keywords, count, useLLM, tlds, minLength, maxLength, allowNumbers, allowHyphens } = req.body;
    const targetCount = Math.min(parseInt(count) || 20, 100);
    const selectedTLDs = (tlds && tlds.length > 0) ? tlds : ['.com', '.net', '.org', '.io'];
    const minLen = Math.max(parseInt(minLength) || 4, 2);
    const maxLen = Math.min(parseInt(maxLength) || 30, 63);
    const withNumbers = allowNumbers !== false;
    const withHyphens = allowHyphens !== false;
    let kwArray = [];
    if (Array.isArray(keywords)) {
        kwArray = keywords.map(k => k.trim().toLowerCase()).filter(Boolean);
    } else if (typeof keywords === 'string' && keywords.trim()) {
        kwArray = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    }
    let domains = [];
    if (useLLM) {
        console.log(`🤖 LLM requested for type="${type}", keywords=[${kwArray.join(', ')}]`);
        const llmResult = await generateWithLLM(kwArray, type, targetCount, selectedTLDs);
        if (llmResult && llmResult.length >= 3) {
            domains = llmResult.filter(d => {
                const namePart = d.split('.')[0];
                if (!withNumbers && /[0-9]/.test(namePart)) return false;
                if (!withHyphens && /-/.test(namePart)) return false;
                if (namePart.length < minLen || namePart.length > maxLen) return false;
                return true;
            }).slice(0, targetCount);
            console.log(`✅ LLM generated ${domains.length} valid domains`);
        }
    }
    if (domains.length < targetCount) {
        const remaining = targetCount - domains.length;
        console.log(`⚡ Smart generator filling remaining ${remaining} domains`);
        const smartDomains = generateSmart(kwArray, type, remaining, selectedTLDs, minLen, maxLen, withNumbers, withHyphens);
        domains = [...new Set([...domains, ...smartDomains])].slice(0, targetCount);
    }
    res.json({ domains, count: domains.length, usedLLM: useLLM && domains.length > 0 });
});

app.post('/api/upload-domains', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);
    const domains = content.split(/[\r\n,;\t]+/).map(d => d.trim().toLowerCase()).filter(d => d && /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    res.json({ domains, count: domains.length });
});

app.get('/api/stats', (req, res) => {
    const db = readDB();
    const domains = Object.values(db.cache || {});
    const expiring30 = domains.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 30).length;
    
    // Get user-specific stats if authenticated
    let portfolioCount = 0;
    let salesCount = 0;
    let totalProfit = 0;
    let totalRevenue = 0;
    let totalInvested = 0;
    let totalROI = 0;
    
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const users = readUsers();
            const user = users.users.find(u => u.id === decoded.id);
            if (user) {
                portfolioCount = (user.portfolio || []).length;
                salesCount = (user.sales || []).length;
                const sales = user.sales || [];
                totalRevenue = sales.reduce((s, x) => s + (parseFloat(x.sellPrice) || 0), 0);
                const totalCostSales = sales.reduce((s, x) => s + (parseFloat(x.buyPrice) || 0), 0);
                totalInvested = totalCostSales + (user.portfolio || []).reduce((s, x) => s + (parseFloat(x.price) || 0), 0);
                totalProfit = totalRevenue - totalCostSales;
                totalROI = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
            }
        } catch { /* ignore */ }
    }
    
    res.json({
        totalScans: domains.length,
        availableDomains: domains.filter(d => d.available === true).length,
        expiring7: domains.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7).length,
        expiring30,
        premiumDomains: domains.filter(d => d.premium).length,
        totalMonitored: domains.length,
        portfolioCount,
        salesCount,
        totalProfit,
        totalRevenue,
        totalInvested,
        totalROI
    });
});

// ── Monitoring Routes ───────────────────────────────────────────

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

app.post('/api/monitoring', async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const key = domain.toLowerCase().trim();
    const db = readDB();
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
    const db = readDB();
    if (!db.cache[key]) return res.status(404).json({ error: 'Domain not found in monitoring' });
    delete db.cache[key];
    writeDB(db);
    res.json({ success: true, removed: key });
});

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

// ── Portfolio Routes (User-Specific) ────────────────────────────

app.get('/api/portfolio', authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.portfolio || []);
});

app.post('/api/portfolio', authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const item = { id: Date.now().toString(), ...req.body, dateAdded: new Date().toISOString() };
    if (!user.portfolio) user.portfolio = [];
    user.portfolio.push(item);
    writeUsers(users);
    res.json(item);
});

app.delete('/api/portfolio/:id', authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const idx = (user.portfolio || []).findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Portfolio item not found' });
    const removed = user.portfolio.splice(idx, 1)[0];
    writeUsers(users);
    res.json({ success: true, removed });
});

// ── Sales Routes (User-Specific) ────────────────────────────────

app.get('/api/sales', authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.sales || []);
});

app.post('/api/sales', authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { domain, buyPrice, sellPrice, buyDate, sellDate, notes } = req.body;
    const profit = (parseFloat(sellPrice) || 0) - (parseFloat(buyPrice) || 0);
    const profitPercent = buyPrice > 0 ? ((profit / parseFloat(buyPrice)) * 100).toFixed(1) : '0';
    const sale = { id: Date.now().toString(), domain, buyPrice: parseFloat(buyPrice), sellPrice: parseFloat(sellPrice), profit, profitPercent, buyDate, sellDate, notes, dateAdded: new Date().toISOString() };
    if (!user.sales) user.sales = [];
    user.sales.push(sale);
    writeUsers(users);
    res.json(sale);
});

// ── Analytics ───────────────────────────────────────────────────

app.get('/api/analytics/profit', authenticateToken, (req, res) => {
    const users = readUsers();
    const user = users.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const period = req.query.period || 'month';
    const now = new Date();
    let cutoff = new Date();
    if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);
    
    const sales = (user.sales || []).filter(s => !s.sellDate || new Date(s.sellDate) >= cutoff);
    const totalSales = sales.length;
    const totalProfit = sales.reduce((s, x) => s + (x.profit || 0), 0);
    const averageProfit = totalSales > 0 ? totalProfit / totalSales : 0;
    const totalRevenue = sales.reduce((s, x) => s + (parseFloat(x.sellPrice) || 0), 0);
    const totalCost = sales.reduce((s, x) => s + (parseFloat(x.buyPrice) || 0), 0);
    const averageProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    
    res.json({ totalSales, totalProfit, averageProfit, totalRevenue, totalCost, averageProfitPercent });
});

// ── SEO Analytics Routes ────────────────────────────────────────

app.get('/api/seo/metrics/:domain', apiLimiter, async (req, res) => {
    const { domain } = req.params;
    try {
        const metrics = await fetchSEOMetrics(domain);
        res.json(metrics);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch SEO metrics', details: err.message });
    }
});

app.post('/api/seo/competitor-analysis', apiLimiter, async (req, res) => {
    const { domains } = req.body;
    if (!domains || !Array.isArray(domains)) {
        return res.status(400).json({ error: 'Domains array required' });
    }
    
    try {
        const results = [];
        for (const domain of domains.slice(0, 10)) { // Limit to 10 domains
            const metrics = await fetchSEOMetrics(domain);
            results.push(metrics);
            await new Promise(r => setTimeout(r, 1000)); // Rate limit
        }
        res.json({ results, count: results.length });
    } catch (err) {
        res.status(500).json({ error: 'Competitor analysis failed', details: err.message });
    }
});

// ── Scheduler Routes ────────────────────────────────────────────

app.get('/api/schedules', authenticateToken, (req, res) => {
    const schedules = readSchedules();
    res.json(schedules.schedules || []);
});

app.post('/api/schedules', authenticateToken, (req, res) => {
    const { name, cron, domains, active } = req.body;
    if (!name || !cron || !domains) {
        return res.status(400).json({ error: 'Name, cron, and domains required' });
    }
    
    const schedules = readSchedules();
    const newSchedule = {
        id: Date.now().toString(),
        userId: req.user.id,
        name,
        cron,
        domains,
        active: active !== false,
        createdAt: new Date().toISOString()
    };
    
    schedules.schedules.push(newSchedule);
    writeSchedules(schedules);
    
    if (newSchedule.active) {
        startSchedule(newSchedule);
    }
    
    res.json(newSchedule);
});

app.delete('/api/schedules/:id', authenticateToken, (req, res) => {
    const schedules = readSchedules();
    const idx = schedules.schedules.findIndex(s => s.id === req.params.id && s.userId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Schedule not found' });
    
    const removed = schedules.schedules.splice(idx, 1)[0];
    writeSchedules(schedules);
    stopSchedule(removed.id);
    
    res.json({ success: true, removed });
});

app.patch('/api/schedules/:id/toggle', authenticateToken, (req, res) => {
    const schedules = readSchedules();
    const schedule = schedules.schedules.find(s => s.id === req.params.id && s.userId === req.user.id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    
    schedule.active = !schedule.active;
    writeSchedules(schedules);
    
    if (schedule.active) {
        startSchedule(schedule);
    } else {
        stopSchedule(schedule.id);
    }
    
    res.json(schedule);
});

// ── Webhook Routes ──────────────────────────────────────────────

app.get('/api/webhooks', authenticateToken, (req, res) => {
    const webhooks = readWebhooks();
    const userWebhooks = webhooks.webhooks.filter(w => w.userId === req.user.id);
    res.json(userWebhooks);
});

app.post('/api/webhooks', authenticateToken, (req, res) => {
    const { name, url, events, active } = req.body;
    if (!name || !url || !events) {
        return res.status(400).json({ error: 'Name, URL, and events required' });
    }
    
    const webhooks = readWebhooks();
    const newWebhook = {
        id: Date.now().toString(),
        userId: req.user.id,
        name,
        url,
        events,
        active: active !== false,
        createdAt: new Date().toISOString()
    };
    
    webhooks.webhooks.push(newWebhook);
    writeWebhooks(webhooks);
    
    res.json(newWebhook);
});

app.delete('/api/webhooks/:id', authenticateToken, (req, res) => {
    const webhooks = readWebhooks();
    const idx = webhooks.webhooks.findIndex(w => w.id === req.params.id && w.userId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Webhook not found' });
    
    const removed = webhooks.webhooks.splice(idx, 1)[0];
    writeWebhooks(webhooks);
    
    res.json({ success: true, removed });
});

app.post('/api/webhooks/:id/test', authenticateToken, async (req, res) => {
    const webhooks = readWebhooks();
    const webhook = webhooks.webhooks.find(w => w.id === req.params.id && w.userId === req.user.id);
    if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
    
    try {
        await axios.post(webhook.url, {
            event: 'test',
            timestamp: new Date().toISOString(),
            data: { message: 'This is a test webhook from Domain Hunter Pro' }
        }, { timeout: 5000 });
        res.json({ success: true, message: 'Webhook test successful' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Webhook test failed', details: err.message });
    }
});

// ── Config / LLM ────────────────────────────────────────────────

app.get('/api/config', (req, res) => res.json(readConfig()));
app.post('/api/config', authenticateToken, (req, res) => {
    writeConfig(req.body);
    res.json({ success: true });
});

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
    console.log(`\n🚀 Domain Hunter Pro Enhanced v3.0!`);
    console.log(`📍 Local:  http://localhost:${PORT}`);
    console.log(`📊 API:    http://localhost:${PORT}/api`);
    console.log(`\n✨ Features:`);
    console.log(`   - 🔐 Multi-User Authentication (DB-backed)`);
    console.log(`   - 🤖 AI Domain Generator with LLM support`);
    console.log(`   - 📅 Scheduled Domain Checking`);
    console.log(`   - 📊 SEO Metrics & Competitor Analysis`);
    console.log(`   - 🔗 Backlink Analysis`);
    console.log(`   - 🔔 Webhook Notifications`);
    console.log(`   - 🌍 GeoNames Location Integration`);
    console.log(`   - 💼 User-Specific Portfolio Management`);
    console.log(`   - 💰 Sales Tracking & Analytics`);
    console.log(`   - 🔍 Advanced Filtering & Monitoring\n`);
});
