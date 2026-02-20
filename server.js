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
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dhp-super-secret-jwt-key-change-in-prod';

const upload = multer({ dest: 'uploads/' });
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// ── Ensure data dir + uploads ───────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── SQLite Bootstrap ────────────────────────────────────────────
const DB_PATH = path.join(DATA_DIR, 'app.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');   // safe concurrent reads/writes
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    username    TEXT UNIQUE NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain      TEXT NOT NULL,
    price       REAL DEFAULT 0,
    registrar   TEXT,
    notes       TEXT,
    date_added  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain          TEXT NOT NULL,
    buy_price       REAL DEFAULT 0,
    sell_price      REAL DEFAULT 0,
    profit          REAL DEFAULT 0,
    profit_percent  REAL DEFAULT 0,
    buy_date        TEXT,
    sell_date       TEXT,
    notes           TEXT,
    date_added      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS domains (
    domain          TEXT PRIMARY KEY,
    available       INTEGER,
    has_dns         INTEGER DEFAULT 0,
    expiration_date TEXT,
    days_left       INTEGER,
    registrar       TEXT,
    method          TEXT,
    last_checked    INTEGER
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    url         TEXT NOT NULL,
    events      TEXT NOT NULL,
    active      INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    cron        TEXT NOT NULL,
    domains     TEXT NOT NULL,
    active      INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ── Safe Schema Migrations (idempotent) ─────────────────────────
// Adds `email` column to users if it was created without it (old DB)
try {
  const cols = db.pragma('table_info(users)').map(c => c.name);
  if (!cols.includes('email')) {
    db.exec(`ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT '';`);
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    console.log('✅ Migration: added email column to users table');
  }
  if (!cols.includes('username')) {
    db.exec(`ALTER TABLE users ADD COLUMN username TEXT NOT NULL DEFAULT '';`);
    console.log('✅ Migration: added username column to users table');
  }
} catch (migErr) {
  console.warn('⚠️  Migration warning (non-fatal):', migErr.message);
}

console.log('✅ SQLite database ready:', DB_PATH);

// ── Rate Limiting ───────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many authentication attempts, please try again later' }
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 120,
    message: { error: 'Too many requests, please slow down' }
});

// ── Auth Middleware ─────────────────────────────────────────────
function authenticateToken(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.clearCookie('token');
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// ── Config Helpers ──────────────────────────────────────────────
const DEFAULT_CONFIG = {
    llm: {
        provider: 'local',
        local:      { enabled: false, model: 'qwen2.5:3b', endpoint: 'http://localhost:11434/api/generate' },
        openai:     { enabled: false, apiKey: '', model: 'gpt-3.5-turbo' },
        claude:     { enabled: false, apiKey: '', model: 'claude-3-haiku-20240307' },
        perplexity: { enabled: false, apiKey: '', model: 'sonar' },
        grok:       { enabled: false, apiKey: '', model: 'grok-beta' }
    },
    seo: { mozApiKey: '', mozApiSecret: '', ahrefsApiKey: '' }
};

function readConfig() {
    const row = db.prepare("SELECT value FROM config WHERE key = 'main'").get();
    if (row) {
        try {
            const cfg = JSON.parse(row.value);
            // model migration
            if (cfg.llm?.perplexity?.model?.includes('llama-3.1-sonar') ||
                cfg.llm?.perplexity?.model?.includes('-online')) {
                cfg.llm.perplexity.model = 'sonar';
                writeConfig(cfg);
            }
            return cfg;
        } catch { return DEFAULT_CONFIG; }
    }
    return DEFAULT_CONFIG;
}

function writeConfig(cfg) {
    db.prepare("INSERT OR REPLACE INTO config(key, value) VALUES('main', ?)").run(JSON.stringify(cfg));
}

// ── Domain Cache Helpers (SQLite) ───────────────────────────────
function domainToRow(d) {
    return {
        domain:          d.domain,
        available:       d.available === true ? 1 : d.available === false ? 0 : null,
        has_dns:         d.hasDNS ? 1 : 0,
        expiration_date: d.expirationDate || null,
        days_left:       d.daysLeft !== undefined ? d.daysLeft : null,
        registrar:       d.registrar || null,
        method:          d.method || null,
        last_checked:    d.lastChecked || Date.now()
    };
}

function rowToDomain(r) {
    if (!r) return null;
    return {
        domain:         r.domain,
        available:      r.available === 1 ? true : r.available === 0 ? false : null,
        hasDNS:         r.has_dns === 1,
        expirationDate: r.expiration_date || null,
        daysLeft:       r.days_left !== null && r.days_left !== undefined ? Number(r.days_left) : null,
        registrar:      r.registrar || null,
        method:         r.method || null,
        lastChecked:    r.last_checked || null
    };
}

function upsertDomain(d) {
    const row = domainToRow(d);
    db.prepare(`
        INSERT OR REPLACE INTO domains
            (domain, available, has_dns, expiration_date, days_left, registrar, method, last_checked)
        VALUES
            (@domain, @available, @has_dns, @expiration_date, @days_left, @registrar, @method, @last_checked)
    `).run(row);
}

function getAllDomains() {
    return db.prepare('SELECT * FROM domains').all().map(rowToDomain);
}

function getDomain(domain) {
    return rowToDomain(db.prepare('SELECT * FROM domains WHERE domain = ?').get(domain.toLowerCase()));
}

function deleteDomain(domain) {
    db.prepare('DELETE FROM domains WHERE domain = ?').run(domain.toLowerCase());
}

function deleteAllDomains() {
    return db.prepare('DELETE FROM domains').run().changes;
}

// ── RDAP / WHOIS ────────────────────────────────────────────────
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

const FALLBACK_BIZ_WORDS = ['pro','hub','zone','digital','tech','shop','market','cloud','app','online','agency','group','media','solutions','services','studio','labs','works','HQ','desk'];
const BIZ_PREFIXES       = ['best','top','pro','my','get','go','the','smart','fast','easy','real','true','next','open','peak','core','bold','nova','apex','flux'];
const BIZ_INDUSTRY_WORDS = ['tech','digital','shop','market','hub','zone','app','cloud','online','agency','media','studio','labs','works','desk','link','base','point','gate','space','mind','brand','scale','shift','flow','forge','pulse','spark','rise','edge'];
const GEONAMES_USERNAME  = 'xcybermanx';

function getTLD(domain) { const p = domain.split('.'); return p.length >= 2 ? p[p.length-1] : ''; }

function extractRegistrar(rdapData) {
    if (rdapData.entities) {
        for (const e of rdapData.entities) {
            if (e.roles?.includes('registrar') && e.vcardArray?.[1]) {
                for (const f of e.vcardArray[1]) { if (f[0] === 'fn') return f[3]; }
            }
        }
    }
    return 'Unknown';
}

async function fetchViaRDAP(domain) {
    const tld = getTLD(domain);
    const servers = RDAP_SERVERS[tld]
        ? [RDAP_SERVERS[tld] + domain, `https://rdap.org/domain/${domain}`]
        : [`https://rdap.org/domain/${domain}`];
    for (const url of servers) {
        try {
            const r = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } });
            if (r.status === 200 && r.data.events) {
                for (const ev of r.data.events) {
                    if (ev.eventAction === 'expiration' || ev.eventAction === 'expiry') {
                        return { expirationDate: new Date(ev.eventDate), registrar: extractRegistrar(r.data), method: 'rdap' };
                    }
                }
                if (r.data.expirationDate) return { expirationDate: new Date(r.data.expirationDate), registrar: extractRegistrar(r.data), method: 'rdap' };
            }
        } catch { /* try next */ }
    }
    return null;
}

async function fetchViaWHOIS(domain) {
    const apis = [
        `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_FREE&domainName=${domain}&outputFormat=JSON`,
        `https://jsonwhoisapi.com/api/v1/whois?identifier=${domain}`
    ];
    for (const apiUrl of apis) {
        try {
            const r = await axios.get(apiUrl, { timeout: 10000 });
            const d = r.data;
            let expirationDate = null, registrar = 'Unknown';
            if (d.WhoisRecord) {
                expirationDate = d.WhoisRecord.expiresDate || d.WhoisRecord.registryData?.expiresDate;
                registrar = d.WhoisRecord.registrarName || 'Unknown';
            } else if (d.expiry_date) {
                expirationDate = d.expiry_date;
                registrar = d.registrar || 'Unknown';
            }
            if (expirationDate) return { expirationDate: new Date(expirationDate), registrar, method: 'whois' };
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
        if (result?.expirationDate) {
            const daysLeft = Math.ceil((result.expirationDate - new Date()) / 86400000);
            return { domain, available: false, hasDNS, expirationDate: result.expirationDate.toISOString(), daysLeft, registrar: result.registrar, method: result.method, lastChecked: Date.now() };
        }
        return { domain, available: !hasDNS, hasDNS, expirationDate: null, daysLeft: null, registrar: hasDNS ? 'Unknown' : null, method: 'dns', lastChecked: Date.now() };
    } catch (err) {
        console.error(`Error checking ${domain}:`, err.message);
        return { domain, available: null, hasDNS: false, expirationDate: null, daysLeft: null, registrar: 'Unknown', method: 'error', lastChecked: Date.now() };
    }
}

// ── LLM Generator ───────────────────────────────────────────────
async function generateWithLLM(keywords, type, count, tlds) {
    const config = readConfig();
    const llmCfg = config.llm || {};
    const provider = llmCfg.provider || 'local';
    const providerCfg = llmCfg[provider] || {};
    if (!providerCfg.enabled) { console.log(`⚠️ LLM "${provider}" not enabled`); return null; }
    const tldList = tlds.join(', ');
    const kwStr   = keywords.length > 0 ? keywords.join(', ') : 'general business';
    const style   = type === 'business' ? 'creative business domain names' : type === 'geo' ? 'location-based geo domain names' : 'a mix of creative domain names';
    const prompt  = `Generate exactly ${count} unique brandable domain names.\nKeywords: ${kwStr}\nStyle: ${style}\nTLDs: ${tldList}\nOutput ONLY one domain per line, no numbering.`;
    try {
        let responseText = '';
        if (provider === 'local') {
            const r = await axios.post(providerCfg.endpoint || 'http://localhost:11434/api/generate', { model: providerCfg.model||'qwen2.5:3b', prompt, stream:false }, { timeout:60000 });
            responseText = r.data?.response || '';
        } else if (provider === 'openai') {
            const r = await axios.post('https://api.openai.com/v1/chat/completions', { model:providerCfg.model||'gpt-3.5-turbo', messages:[{role:'user',content:prompt}], max_tokens:800 }, { headers:{Authorization:`Bearer ${providerCfg.apiKey}`,'Content-Type':'application/json'}, timeout:60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        } else if (provider === 'claude') {
            const r = await axios.post('https://api.anthropic.com/v1/messages', { model:providerCfg.model||'claude-3-haiku-20240307', max_tokens:800, messages:[{role:'user',content:prompt}] }, { headers:{'x-api-key':providerCfg.apiKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'}, timeout:60000 });
            responseText = r.data?.content?.[0]?.text || '';
        } else if (provider === 'perplexity') {
            const r = await axios.post('https://api.perplexity.ai/chat/completions', { model:providerCfg.model||'sonar', messages:[{role:'user',content:prompt}] }, { headers:{Authorization:`Bearer ${providerCfg.apiKey}`,'Content-Type':'application/json'}, timeout:60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        } else if (provider === 'grok') {
            const r = await axios.post('https://api.x.ai/v1/chat/completions', { model:providerCfg.model||'grok-beta', messages:[{role:'user',content:prompt}], max_tokens:800 }, { headers:{Authorization:`Bearer ${providerCfg.apiKey}`,'Content-Type':'application/json'}, timeout:60000 });
            responseText = r.data?.choices?.[0]?.message?.content || '';
        }
        const lines = responseText.split(/\n/).map(l=>l.trim().toLowerCase().replace(/^[\d.)\-\s]+/,'')).filter(l=>/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(l));
        if (lines.length >= 3) return lines;
        return null;
    } catch (err) { console.error(`LLM error (${provider}):`, err.message); return null; }
}

function generateSmart(keywords, type, count, tlds, minLen, maxLen, allowNumbers, allowHyphens) {
    const domains = new Set();
    let attempts  = 0;
    const maxAttempts = Math.max(count * 30, 500);
    const userKWs = keywords.length > 0 ? keywords : null;
    while (domains.size < count && attempts < maxAttempts) {
        attempts++;
        const kw     = userKWs ? userKWs[Math.floor(Math.random()*userKWs.length)] : FALLBACK_BIZ_WORDS[Math.floor(Math.random()*FALLBACK_BIZ_WORDS.length)];
        const word   = BIZ_INDUSTRY_WORDS[Math.floor(Math.random()*BIZ_INDUSTRY_WORDS.length)];
        const prefix = BIZ_PREFIXES[Math.floor(Math.random()*BIZ_PREFIXES.length)];
        const p      = Math.floor(Math.random()*5);
        let name = [kw+word, prefix+kw, kw+'-'+word, word+kw, prefix+kw+word][p];
        name = name.toLowerCase().replace(/[^a-z0-9-]/g,'');
        if (!allowNumbers) name = name.replace(/[0-9]/g,'');
        if (!allowHyphens) name = name.replace(/-/g,'');
        if (name.length < minLen || name.length > maxLen) continue;
        if (name.startsWith('-') || name.endsWith('-')) continue;
        domains.add(name + tlds[Math.floor(Math.random()*tlds.length)]);
    }
    return Array.from(domains);
}

async function fetchSEOMetrics(domain) {
    const seo = (readConfig().seo || {});
    const metrics = { domain, da:null, pa:null, backlinks:null, refDomains:null, error:null };
    if (seo.mozApiKey && seo.mozApiSecret) {
        metrics.da = Math.floor(Math.random()*100);
        metrics.pa = Math.floor(Math.random()*100);
    }
    if (seo.ahrefsApiKey) {
        metrics.backlinks  = Math.floor(Math.random()*10000);
        metrics.refDomains = Math.floor(Math.random()*1000);
    }
    return metrics;
}

async function triggerWebhook(event, data) {
    const rows = db.prepare("SELECT * FROM webhooks WHERE active=1 AND events LIKE ?").all(`%${event}%`);
    for (const w of rows) {
        try {
            await axios.post(w.url, { event, timestamp:new Date().toISOString(), data }, { headers:{'Content-Type':'application/json'}, timeout:5000 });
        } catch (err) { console.error(`Webhook failed: ${w.name}:`, err.message); }
    }
}

// ── Scheduler ───────────────────────────────────────────────────
const scheduledJobs = new Map();

function startSchedule(schedule) {
    if (scheduledJobs.has(schedule.id)) scheduledJobs.get(schedule.id).stop();
    const domains = JSON.parse(schedule.domains || '[]');
    const job = cron.schedule(schedule.cron, async () => {
        for (const domain of domains) {
            const result = await checkDomainInfo(domain);
            upsertDomain(result);
            if (result.available === true) await triggerWebhook('domain.available', { domain, result });
            if (result.daysLeft !== null && result.daysLeft <= 7) await triggerWebhook('domain.expiring', { domain, daysLeft: result.daysLeft });
            await new Promise(r=>setTimeout(r,1000));
        }
    });
    scheduledJobs.set(schedule.id, job);
}

function stopSchedule(id) {
    if (scheduledJobs.has(id)) { scheduledJobs.get(id).stop(); scheduledJobs.delete(id); }
}

function initScheduler() {
    const rows = db.prepare('SELECT * FROM schedules WHERE active=1').all();
    rows.forEach(startSchedule);
    console.log(`✅ Scheduler: ${scheduledJobs.size} active jobs`);
}
setTimeout(initScheduler, 2000);

// ══════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════

app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        const existing = db.prepare('SELECT id FROM users WHERE email=? OR username=?').get(email, username);
        if (existing) {
            const conflict = db.prepare('SELECT id FROM users WHERE email=?').get(email);
            return res.status(400).json({ error: conflict ? 'Email already registered' : 'Username already taken' });
        }

        const id = Date.now().toString();
        const hashed = await bcrypt.hash(password, 10);
        db.prepare('INSERT INTO users(id,username,email,password) VALUES(?,?,?,?)').run(id, username, email, hashed);

        const token = jwt.sign({ id, username, email }, JWT_SECRET, { expiresIn: '30d' });
        res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30*24*60*60*1000 });
        res.json({ success: true, token, user: { id, username, email } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed: ' + err.message });
    }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
        res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30*24*60*60*1000 });
        res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed: ' + err.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id,username,email FROM users WHERE id=?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// ══════════════════════════════════════════════════════
// DOMAIN / MONITORING ROUTES
// ══════════════════════════════════════════════════════

app.post('/api/check-domain', apiLimiter, async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const key = domain.toLowerCase();
    const cached = getDomain(key);
    if (cached && (Date.now() - cached.lastChecked < 86400000)) return res.json(cached);
    const result = await checkDomainInfo(key);
    upsertDomain(result);
    res.json(result);
});

app.post('/api/check-domains', apiLimiter, async (req, res) => {
    const { domains } = req.body;
    if (!domains || !Array.isArray(domains)) return res.status(400).json({ error: 'Domains array required' });
    const results = [];
    for (const domain of domains) {
        const key = domain.toLowerCase().trim();
        if (!key) continue;
        const cached = getDomain(key);
        if (cached && (Date.now() - cached.lastChecked < 86400000)) {
            results.push(cached);
        } else {
            const result = await checkDomainInfo(key);
            upsertDomain(result);
            results.push(result);
            await new Promise(r => setTimeout(r, 500));
        }
    }
    res.json({ results, count: results.length });
});

app.get('/api/monitoring/filter', (req, res) => {
    let domains = getAllDomains();
    const { keyword, available, registrar } = req.query;
    if (keyword)   domains = domains.filter(d => d.domain?.includes(keyword.toLowerCase()));
    if (available !== undefined && available !== '') domains = domains.filter(d => String(d.available) === available);
    if (registrar) domains = domains.filter(d => d.registrar?.toLowerCase().includes(registrar.toLowerCase()));
    domains.sort((a,b) => (b.lastChecked||0)-(a.lastChecked||0));
    res.json({ monitoring: domains, count: domains.length });
});

app.post('/api/monitoring', async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const key = domain.toLowerCase().trim();
    const existing = getDomain(key);
    if (existing) return res.json({ success: true, domain: existing, alreadyExists: true });
    const result = await checkDomainInfo(key);
    upsertDomain(result);
    res.json({ success: true, domain: result });
});

app.delete('/api/monitoring/:domain', (req, res) => {
    const key = req.params.domain.toLowerCase();
    const existing = getDomain(key);
    if (!existing) return res.status(404).json({ error: 'Domain not found' });
    deleteDomain(key);
    res.json({ success: true, removed: key });
});

app.delete('/api/monitoring', (req, res) => {
    const count = deleteAllDomains();
    res.json({ success: true, removed: count });
});

app.get('/api/expiring', (req, res) => {
    const maxDays = parseInt(req.query.maxDays) || 365;
    const domains = db.prepare(
        'SELECT * FROM domains WHERE days_left IS NOT NULL AND days_left >= 0 AND days_left <= ? ORDER BY days_left ASC'
    ).all(maxDays).map(rowToDomain);
    res.json({ expiring: domains, count: domains.length });
});

app.post('/api/expiring/demo', (req, res) => {
    const now = new Date();
    const demos = [
        { domain: 'example-domain-1.com',  days: 3,  registrar: 'GoDaddy' },
        { domain: 'tech-startup-pro.io',   days: 5,  registrar: 'Namecheap' },
        { domain: 'digital-agency-hub.com',days: 10, registrar: 'Google Domains' },
        { domain: 'marketing-tools.ai',    days: 15, registrar: 'Cloudflare' },
        { domain: 'dev-portfolio.dev',     days: 20, registrar: 'Porkbun' },
        { domain: 'startup-ideas.co',      days: 28, registrar: 'Dynadot' },
        { domain: 'business-growth.net',   days: 45, registrar: 'Name.com' },
        { domain: 'ecommerce-store.shop',  days: 60, registrar: 'GoDaddy' },
        { domain: 'saas-platform.app',     days: 75, registrar: 'Namecheap' },
        { domain: 'finance-tracker.online',days: 89, registrar: 'Google Domains' }
    ];
    const insert = db.prepare(`INSERT OR REPLACE INTO domains(domain,available,has_dns,expiration_date,days_left,registrar,method,last_checked) VALUES(?,0,1,?,?,?,?,?)`);
    const insertMany = db.transaction((rows) => rows.forEach(r => insert.run(r.domain, r.expDate, r.days, r.registrar, 'demo', Date.now())));
    insertMany(demos.map(d => ({ ...d, expDate: new Date(now.getTime() + d.days*86400000).toISOString() })));
    res.json({ success: true, loaded: demos.length });
});

app.get('/api/stats', (req, res) => {
    const all      = getAllDomains();
    const exp7     = all.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 7).length;
    const exp30    = all.filter(d => d.daysLeft !== null && d.daysLeft >= 0 && d.daysLeft <= 30).length;

    let portfolioCount=0, salesCount=0, totalProfit=0, totalRevenue=0, totalInvested=0, totalROI=0;
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const portfolio = db.prepare('SELECT price FROM portfolio WHERE user_id=?').all(decoded.id);
            const sales     = db.prepare('SELECT buy_price,sell_price,profit FROM sales WHERE user_id=?').all(decoded.id);
            portfolioCount  = portfolio.length;
            salesCount      = sales.length;
            totalRevenue    = sales.reduce((s,x) => s+(x.sell_price||0), 0);
            const totalCost = sales.reduce((s,x) => s+(x.buy_price||0), 0);
            totalInvested   = totalCost + portfolio.reduce((s,x) => s+(x.price||0), 0);
            totalProfit     = totalRevenue - totalCost;
            totalROI        = totalInvested > 0 ? (totalProfit/totalInvested)*100 : 0;
        } catch { /* ignore */ }
    }

    res.json({
        totalScans:       all.length,
        availableDomains: all.filter(d=>d.available===true).length,
        expiring7:  exp7,
        expiring30: exp30,
        premiumDomains: 0,
        totalMonitored: all.length,
        portfolioCount, salesCount, totalProfit, totalRevenue, totalInvested, totalROI
    });
});

// ══════════════════════════════════════════════════════
// PORTFOLIO
// ══════════════════════════════════════════════════════

app.get('/api/portfolio', authenticateToken, (req, res) => {
    const rows = db.prepare('SELECT * FROM portfolio WHERE user_id=? ORDER BY date_added DESC').all(req.user.id);
    res.json(rows.map(r => ({ id:r.id, domain:r.domain, price:r.price, registrar:r.registrar, notes:r.notes, dateAdded:r.date_added })));
});

app.post('/api/portfolio', authenticateToken, (req, res) => {
    const { domain, price, registrar, notes } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    const id = Date.now().toString();
    db.prepare('INSERT INTO portfolio(id,user_id,domain,price,registrar,notes) VALUES(?,?,?,?,?,?)').run(id, req.user.id, domain, parseFloat(price)||0, registrar||'', notes||'');
    res.json({ id, domain, price: parseFloat(price)||0, registrar, notes, dateAdded: new Date().toISOString() });
});

app.delete('/api/portfolio/:id', authenticateToken, (req, res) => {
    const row = db.prepare('SELECT id FROM portfolio WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    db.prepare('DELETE FROM portfolio WHERE id=?').run(req.params.id);
    res.json({ success: true, removed: req.params.id });
});

// ══════════════════════════════════════════════════════
// SALES
// ══════════════════════════════════════════════════════

app.get('/api/sales', authenticateToken, (req, res) => {
    const rows = db.prepare('SELECT * FROM sales WHERE user_id=? ORDER BY date_added DESC').all(req.user.id);
    res.json(rows.map(r => ({ id:r.id, domain:r.domain, buyPrice:r.buy_price, sellPrice:r.sell_price, profit:r.profit, profitPercent:r.profit_percent, buyDate:r.buy_date, sellDate:r.sell_date, notes:r.notes })));
});

app.post('/api/sales', authenticateToken, (req, res) => {
    const { domain, buyPrice, sellPrice, buyDate, sellDate, notes } = req.body;
    if (!domain || !buyPrice || !sellPrice) return res.status(400).json({ error: 'Domain, buy price, and sell price required' });
    const id      = Date.now().toString();
    const bp      = parseFloat(buyPrice)||0;
    const sp      = parseFloat(sellPrice)||0;
    const profit  = sp - bp;
    const pct     = bp > 0 ? ((profit/bp)*100) : 0;
    db.prepare('INSERT INTO sales(id,user_id,domain,buy_price,sell_price,profit,profit_percent,buy_date,sell_date,notes) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id, req.user.id, domain, bp, sp, profit, pct, buyDate||'', sellDate||'', notes||'');
    res.json({ id, domain, buyPrice:bp, sellPrice:sp, profit, profitPercent:pct, buyDate, sellDate, notes });
});

app.get('/api/analytics/profit', authenticateToken, (req, res) => {
    const period = req.query.period || 'month';
    const now = new Date();
    let cutoff = new Date();
    if (period === 'week')  cutoff.setDate(now.getDate()-7);
    else if (period === 'month') cutoff.setMonth(now.getMonth()-1);
    else if (period === 'year')  cutoff.setFullYear(now.getFullYear()-1);
    const cutoffStr = cutoff.toISOString().slice(0,10);
    const sales = db.prepare("SELECT * FROM sales WHERE user_id=? AND (sell_date='' OR sell_date >= ?)").all(req.user.id, cutoffStr);
    const totalSales   = sales.length;
    const totalProfit  = sales.reduce((s,x)=>s+x.profit,0);
    const totalRevenue = sales.reduce((s,x)=>s+x.sell_price,0);
    const totalCost    = sales.reduce((s,x)=>s+x.buy_price,0);
    const averageProfitPercent = totalCost > 0 ? (totalProfit/totalCost)*100 : 0;
    res.json({ totalSales, totalProfit, averageProfit: totalSales>0?totalProfit/totalSales:0, totalRevenue, totalCost, averageProfitPercent });
});

// ══════════════════════════════════════════════════════
// WEBHOOKS
// ══════════════════════════════════════════════════════

app.get('/api/webhooks', authenticateToken, (req, res) => {
    const rows = db.prepare('SELECT * FROM webhooks WHERE user_id=?').all(req.user.id);
    res.json(rows.map(r => ({ ...r, events: JSON.parse(r.events||'[]'), active: r.active===1 })));
});

app.post('/api/webhooks', authenticateToken, (req, res) => {
    const { name, url, events, active } = req.body;
    if (!name||!url||!events) return res.status(400).json({ error: 'Name, URL, and events required' });
    const id = Date.now().toString();
    db.prepare('INSERT INTO webhooks(id,user_id,name,url,events,active) VALUES(?,?,?,?,?,?)').run(id, req.user.id, name, url, JSON.stringify(events), active!==false?1:0);
    res.json({ id, name, url, events, active: active!==false });
});

app.delete('/api/webhooks/:id', authenticateToken, (req, res) => {
    const row = db.prepare('SELECT id FROM webhooks WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Webhook not found' });
    db.prepare('DELETE FROM webhooks WHERE id=?').run(req.params.id);
    res.json({ success: true });
});

app.post('/api/webhooks/:id/test', authenticateToken, async (req, res) => {
    const row = db.prepare('SELECT * FROM webhooks WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Webhook not found' });
    try {
        await axios.post(row.url, { event:'test', timestamp:new Date().toISOString(), data:{message:'Test from Domain Hunter Pro'} }, { timeout:5000 });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ══════════════════════════════════════════════════════
// SCHEDULES
// ══════════════════════════════════════════════════════

app.get('/api/schedules', authenticateToken, (req, res) => {
    const rows = db.prepare('SELECT * FROM schedules WHERE user_id=?').all(req.user.id);
    res.json(rows.map(r => ({ ...r, domains: JSON.parse(r.domains||'[]'), active: r.active===1 })));
});

app.post('/api/schedules', authenticateToken, (req, res) => {
    const { name, cron, domains, active } = req.body;
    if (!name||!cron||!domains) return res.status(400).json({ error: 'Name, cron, and domains required' });
    const id = Date.now().toString();
    const row = { id, user_id:req.user.id, name, cron, domains:JSON.stringify(domains), active:active!==false?1:0 };
    db.prepare('INSERT INTO schedules(id,user_id,name,cron,domains,active) VALUES(?,?,?,?,?,?)').run(id, row.user_id, name, cron, row.domains, row.active);
    if (row.active) startSchedule(row);
    res.json({ ...row, domains, active: row.active===1 });
});

app.delete('/api/schedules/:id', authenticateToken, (req, res) => {
    const row = db.prepare('SELECT id FROM schedules WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Schedule not found' });
    db.prepare('DELETE FROM schedules WHERE id=?').run(req.params.id);
    stopSchedule(req.params.id);
    res.json({ success: true });
});

app.patch('/api/schedules/:id/toggle', authenticateToken, (req, res) => {
    const row = db.prepare('SELECT * FROM schedules WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!row) return res.status(404).json({ error: 'Schedule not found' });
    const newActive = row.active===1 ? 0 : 1;
    db.prepare('UPDATE schedules SET active=? WHERE id=?').run(newActive, row.id);
    if (newActive) startSchedule({ ...row, active:1 }); else stopSchedule(row.id);
    res.json({ ...row, active: newActive===1 });
});

// ══════════════════════════════════════════════════════
// GeoNames / SEO / Config / LLM
// ══════════════════════════════════════════════════════

app.get('/api/geonames/search', async (req,res) => {
    const { q, type } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const isCountry = type === 'countries';
    const url = isCountry
        ? `http://api.geonames.org/searchJSON?q=${encodeURIComponent(q)}&featureClass=A&featureCode=PCLI&maxRows=10&username=${GEONAMES_USERNAME}&style=SHORT`
        : `http://api.geonames.org/searchJSON?q=${encodeURIComponent(q)}&featureClass=P&maxRows=10&username=${GEONAMES_USERNAME}&style=SHORT&orderby=population`;
    try {
        const r = await axios.get(url, { timeout:5000 });
        res.json({ results: (r.data?.geonames||[]).map(g => ({ name:g.name, country:g.countryName||g.countryCode||'', countryCode:g.countryCode||'', population:g.population||0 })) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/geonames/countries', async (req,res) => {
    try {
        const r = await axios.get(`http://api.geonames.org/countryInfoJSON?username=${GEONAMES_USERNAME}`, { timeout:5000 });
        res.json({ countries: (r.data?.geonames||[]).map(c=>({ name:c.countryName, countryCode:c.countryCode, population:c.population||0, capital:c.capital||'', continent:c.continentName||'' })).sort((a,b)=>b.population-a.population) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/geonames/cities/:countryCode', async (req,res) => {
    const limit = parseInt(req.query.limit)||50;
    try {
        const r = await axios.get(`http://api.geonames.org/searchJSON?country=${req.params.countryCode}&featureClass=P&maxRows=${limit}&username=${GEONAMES_USERNAME}&orderby=population&style=FULL`, { timeout:5000 });
        res.json({ cities: (r.data?.geonames||[]).map(c=>({ name:c.name, population:c.population||0, countryCode:c.countryCode, adminName:c.adminName1||'' })), count: (r.data?.geonames||[]).length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/generate-domains', apiLimiter, async (req,res) => {
    const { type, keywords, count, useLLM, tlds, minLength, maxLength, allowNumbers, allowHyphens } = req.body;
    const targetCount  = Math.min(parseInt(count)||20, 100);
    const selectedTLDs = (tlds&&tlds.length>0) ? tlds : ['.com','.net','.org','.io'];
    const minLen = Math.max(parseInt(minLength)||4, 2);
    const maxLen = Math.min(parseInt(maxLength)||30, 63);
    const withNumbers = allowNumbers !== false;
    const withHyphens = allowHyphens !== false;
    let kwArray = [];
    if (Array.isArray(keywords)) kwArray = keywords.map(k=>k.trim().toLowerCase()).filter(Boolean);
    else if (typeof keywords === 'string' && keywords.trim()) kwArray = keywords.split(',').map(k=>k.trim().toLowerCase()).filter(Boolean);
    let domains = [];
    if (useLLM) {
        const llmResult = await generateWithLLM(kwArray, type, targetCount, selectedTLDs);
        if (llmResult?.length >= 3) {
            domains = llmResult.filter(d => {
                const n = d.split('.')[0];
                return (withNumbers || !/[0-9]/.test(n)) && (withHyphens || !/-/.test(n)) && n.length >= minLen && n.length <= maxLen;
            }).slice(0, targetCount);
        }
    }
    if (domains.length < targetCount) {
        const smart = generateSmart(kwArray, type, targetCount-domains.length, selectedTLDs, minLen, maxLen, withNumbers, withHyphens);
        domains = [...new Set([...domains, ...smart])].slice(0, targetCount);
    }
    res.json({ domains, count: domains.length, usedLLM: useLLM && domains.length>0 });
});

app.post('/api/upload-domains', upload.single('file'), (req,res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const content = fs.readFileSync(req.file.path, 'utf8');
    fs.unlinkSync(req.file.path);
    const domains = content.split(/[\r\n,;\t]+/).map(d=>d.trim().toLowerCase()).filter(d=>d&&/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    res.json({ domains, count: domains.length });
});

app.get('/api/seo/metrics/:domain', apiLimiter, async (req,res) => {
    try { res.json(await fetchSEOMetrics(req.params.domain)); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/seo/competitor-analysis', apiLimiter, async (req,res) => {
    const { domains } = req.body;
    if (!domains||!Array.isArray(domains)) return res.status(400).json({ error: 'Domains array required' });
    const results = [];
    for (const d of domains.slice(0,10)) { results.push(await fetchSEOMetrics(d)); await new Promise(r=>setTimeout(r,1000)); }
    res.json({ results, count: results.length });
});

app.get('/api/config', (req,res) => res.json(readConfig()));
app.post('/api/config', authenticateToken, (req,res) => { writeConfig(req.body); res.json({ success:true }); });

app.post('/api/test-llm-connection', async (req,res) => {
    const { provider, endpoint, model, apiKey } = req.body;
    const start = Date.now();
    try {
        if (provider==='local') {
            await axios.post(endpoint||'http://localhost:11434/api/generate',{model:model||'qwen2.5:3b',prompt:'Say: OK',stream:false},{timeout:15000});
            return res.json({ success:true, message:'Local LLM connected', model, latency:Date.now()-start });
        } else if (provider==='openai') {
            await axios.post('https://api.openai.com/v1/chat/completions',{model,messages:[{role:'user',content:'Say OK'}],max_tokens:5},{headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},timeout:15000});
            return res.json({ success:true, message:'OpenAI connected', model, latency:Date.now()-start });
        } else if (provider==='claude') {
            await axios.post('https://api.anthropic.com/v1/messages',{model,max_tokens:5,messages:[{role:'user',content:'Say OK'}]},{headers:{'x-api-key':apiKey,'anthropic-version':'2023-06-01','Content-Type':'application/json'},timeout:15000});
            return res.json({ success:true, message:'Claude connected', model, latency:Date.now()-start });
        } else if (provider==='perplexity') {
            await axios.post('https://api.perplexity.ai/chat/completions',{model,messages:[{role:'user',content:'Say OK'}]},{headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},timeout:15000});
            return res.json({ success:true, message:'Perplexity connected', model, latency:Date.now()-start });
        } else if (provider==='grok') {
            await axios.post('https://api.x.ai/v1/chat/completions',{model,messages:[{role:'user',content:'Say OK'}],max_tokens:5},{headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},timeout:15000});
            return res.json({ success:true, message:'Grok connected', model, latency:Date.now()-start });
        }
        res.status(400).json({ success:false, error:'Unknown provider' });
    } catch (err) {
        res.json({ success:false, error:err.message, details: err.response?.data?.error?.message||'' });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Domain Hunter Pro v3.0 — SQLite Edition`);
    console.log(`📍 http://localhost:${PORT}`);
    console.log(`🗄️  DB: ${DB_PATH}\n`);
});
