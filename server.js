const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const dns = require('dns').promises;
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'domains.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AI Domain Generator Data
const CITIES = ['new', 'san', 'los', 'miami', 'tokyo', 'paris', 'london', 'dubai', 'sydney', 'berlin', 'vegas', 'boston', 'seattle', 'chicago', 'atlanta'];
const COUNTRIES = ['usa', 'canada', 'france', 'spain', 'italy', 'japan', 'china', 'brazil', 'mexico', 'india', 'korea', 'uk', 'australia', 'germany'];
const PREFIXES = ['best', 'top', 'pro', 'my', 'get', 'buy', 'find', 'quick', 'fast', 'easy', 'smart', 'super', 'mega', 'ultra', 'prime'];
const KEYWORDS = ['web', 'tech', 'digital', 'online', 'mobile', 'cloud', 'smart', 'app', 'shop', 'store', 'market', 'hub', 'zone', 'net', 'link', 'site', 'media', 'world', 'global', 'deals'];
const TLDS = ['.com', '.net', '.org', '.io', '.ai', '.co', '.app', '.dev', '.tech', '.online', '.store', '.shop', '.xyz', '.club'];

// Initialize database
async function initDB() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
        
        // Initialize domains DB
        try {
            await fs.access(DB_FILE);
        } catch {
            const initialData = {
                domains: [],
                watchlist: [],
                portfolio: [],
                sales: [],
                monitoring: [],
                cache: {},
                stats: { 
                    totalScans: 0, 
                    totalDomains: 0, 
                    availableDomains: 0, 
                    premiumDomains: 0,
                    totalProfit: 0,
                    totalInvested: 0,
                    totalRevenue: 0
                }
            };
            await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
        }
        
        // Initialize config
        try {
            await fs.access(CONFIG_FILE);
        } catch {
            const initialConfig = {
                llm: {
                    provider: 'local',
                    local: {
                        enabled: false,
                        model: 'llama',
                        endpoint: 'http://localhost:11434/api/generate'
                    },
                    openai: {
                        enabled: false,
                        apiKey: '',
                        model: 'gpt-3.5-turbo'
                    },
                    claude: {
                        enabled: false,
                        apiKey: '',
                        model: 'claude-3-sonnet'
                    },
                    grok: {
                        enabled: false,
                        apiKey: '',
                        model: 'grok-1'
                    }
                }
            };
            await fs.writeFile(CONFIG_FILE, JSON.stringify(initialConfig, null, 2));
        }
        
        console.log('✅ Database initialized');
    } catch (error) {
        console.error('❌ Database error:', error);
    }
}

async function readDB() {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
}

async function writeDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

async function readConfig() {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
}

async function writeConfig(config) {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// AI Domain Generation with LLM
async function generateWithLLM(prompt, config) {
    try {
        if (config.llm.local.enabled && config.llm.provider === 'local') {
            const response = await fetch(config.llm.local.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.llm.local.model,
                    prompt: prompt,
                    stream: false
                })
            });
            const data = await response.json();
            return data.response;
        } else if (config.llm.openai.enabled && config.llm.provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.llm.openai.apiKey}`
                },
                body: JSON.stringify({
                    model: config.llm.openai.model,
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('LLM Error:', error);
    }
    return null;
}

function generateGeoDomains(count = 10) {
    const domains = [];
    for (let i = 0; i < count; i++) {
        const type = Math.random();
        let domain;
        
        if (type < 0.3) {
            const city = CITIES[Math.floor(Math.random() * CITIES.length)];
            const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
            domain = `${city}${keyword}`;
        } else if (type < 0.6) {
            const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
            const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
            domain = `${country}${keyword}`;
        } else {
            const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
            const location = Math.random() > 0.5 
                ? CITIES[Math.floor(Math.random() * CITIES.length)]
                : COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
            domain = `${prefix}${location}`;
        }
        
        const tld = TLDS[Math.floor(Math.random() * TLDS.length)];
        domains.push(domain + tld);
    }
    return [...new Set(domains)];
}

function generateRealisticDomains(keywords = [], count = 10) {
    const domains = [];
    const patterns = [
        (w1, w2) => `${w1}${w2}`,
        (w1, w2) => `get${w1}`,
        (w1, w2) => `${w1}online`,
        (w1, w2) => `${w1}hub`,
        (w1, w2) => `my${w1}`,
        (w1, w2) => `${w1}pro`,
        (w1, w2) => `best${w1}`,
        (w1, w2) => `${w1}zone`,
    ];
    
    const wordList = keywords.length > 0 ? keywords : KEYWORDS;
    
    for (let i = 0; i < count; i++) {
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const w1 = wordList[Math.floor(Math.random() * wordList.length)];
        const w2 = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
        const tld = TLDS[Math.floor(Math.random() * TLDS.length)];
        domains.push(pattern(w1, w2) + tld);
    }
    
    return [...new Set(domains)];
}

async function checkDomainAvailability(domain) {
    try {
        await dns.resolve4(domain);
        return { available: false, hasDNS: true };
    } catch (error) {
        if (error.code === 'ENOTFOUND') {
            return { available: true, hasDNS: false };
        }
        return { available: false, hasDNS: false, error: error.message };
    }
}

function getWhoisInfo(domain) {
    const daysUntil = Math.floor(Math.random() * 365) + 1;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + daysUntil);
    
    const registrars = ['GoDaddy', 'Namecheap', 'Google Domains', 'CloudFlare', 'Network Solutions', 'Domain.com'];
    
    return {
        expirationDate: expDate.toISOString(),
        creationDate: new Date(Date.now() - Math.random() * 365 * 5 * 24 * 60 * 60 * 1000).toISOString(),
        registrar: registrars[Math.floor(Math.random() * registrars.length)],
        nameServers: ['ns1.example.com', 'ns2.example.com'],
        status: ['clientTransferProhibited']
    };
}

function calculateDaysLeft(expirationDate) {
    if (!expirationDate) return null;
    const expDate = new Date(expirationDate);
    const now = new Date();
    const diffTime = expDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function isPremiumDomain(domain) {
    const indicators = [
        domain.split('.')[0].length <= 4,
        /^[a-z]{3}\.(com|net|org)$/.test(domain),
        /\.(io|ai|app|tech|dev)$/.test(domain)
    ];
    return indicators.some(i => i);
}

function estimateDomainValue(domain) {
    let value = 10;
    const name = domain.split('.')[0];
    const tld = domain.split('.')[1];
    
    if (name.length <= 3) value += 500;
    else if (name.length <= 5) value += 200;
    else if (name.length <= 7) value += 50;
    
    if (['.com', '.net', '.org'].includes('.' + tld)) value += 100;
    else if (['.io', '.ai', '.app'].includes('.' + tld)) value += 150;
    
    if (/^[a-z]+$/.test(name)) value += 50;
    
    return Math.round(value + Math.random() * 100);
}

// API Routes

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config endpoints
app.get('/api/config', async (req, res) => {
    try {
        const config = await readConfig();
        const safeConfig = JSON.parse(JSON.stringify(config));
        
        if (safeConfig.llm.openai.apiKey) safeConfig.llm.openai.apiKey = '***hidden***';
        if (safeConfig.llm.claude.apiKey) safeConfig.llm.claude.apiKey = '***hidden***';
        if (safeConfig.llm.grok.apiKey) safeConfig.llm.grok.apiKey = '***hidden***';
        
        res.json(safeConfig);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        await writeConfig(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Domain Generator
app.post('/api/generate-domains', async (req, res) => {
    try {
        const { type, keywords, count, useLLM } = req.body;
        let domains = [];
        
        if (useLLM) {
            const config = await readConfig();
            const prompt = `Generate ${count} creative domain name suggestions for keywords: ${keywords.join(', ')}. Return only domain names, one per line.`;
            const llmResponse = await generateWithLLM(prompt, config);
            
            if (llmResponse) {
                domains = llmResponse.split('\n').filter(d => d.includes('.')).slice(0, count);
            }
        }
        
        if (domains.length === 0) {
            if (type === 'geo') {
                domains = generateGeoDomains(count || 20);
            } else if (type === 'realistic') {
                domains = generateRealisticDomains(keywords || [], count || 20);
            } else {
                domains = [...generateGeoDomains(10), ...generateRealisticDomains(keywords, 10)];
            }
        }
        
        res.json({ domains, count: domains.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Domain checking
app.post('/api/check-domain', async (req, res) => {
    try {
        const { domain } = req.body;
        if (!domain) return res.status(400).json({ error: 'Domain required' });
        
        const cleanDomain = domain.toLowerCase().trim();
        const db = await readDB();
        
        if (db.cache[cleanDomain]) {
            const cacheAge = Date.now() - db.cache[cleanDomain].lastChecked;
            if (cacheAge < 86400000) {
                return res.json({ ...db.cache[cleanDomain], cached: true });
            }
        }
        
        const availCheck = await checkDomainAvailability(cleanDomain);
        const whoisInfo = getWhoisInfo(cleanDomain);
        
        const result = {
            domain: cleanDomain,
            available: availCheck.available,
            hasDNS: availCheck.hasDNS,
            whois: whoisInfo,
            expirationDate: whoisInfo.expirationDate,
            creationDate: whoisInfo.creationDate,
            daysLeft: calculateDaysLeft(whoisInfo.expirationDate),
            registrar: whoisInfo.registrar,
            nameServers: whoisInfo.nameServers,
            premium: isPremiumDomain(cleanDomain),
            estimatedValue: estimateDomainValue(cleanDomain),
            lastChecked: Date.now(),
            cached: false
        };
        
        db.cache[cleanDomain] = result;
        
        const existing = db.domains.find(d => d.domain === cleanDomain);
        if (!existing) {
            db.domains.push(result);
            db.stats.totalDomains++;
        } else {
            const idx = db.domains.findIndex(d => d.domain === cleanDomain);
            db.domains[idx] = result;
        }
        
        // Add to monitoring
        const monitorExists = db.monitoring.find(m => m.domain === cleanDomain);
        if (!monitorExists) {
            db.monitoring.push({
                domain: cleanDomain,
                firstChecked: Date.now(),
                lastChecked: Date.now(),
                checkCount: 1,
                statusHistory: [{
                    date: Date.now(),
                    available: result.available,
                    registrar: result.registrar
                }]
            });
        } else {
            const idx = db.monitoring.findIndex(m => m.domain === cleanDomain);
            db.monitoring[idx].lastChecked = Date.now();
            db.monitoring[idx].checkCount++;
            db.monitoring[idx].statusHistory.push({
                date: Date.now(),
                available: result.available,
                registrar: result.registrar
            });
        }
        
        db.stats.totalScans++;
        db.stats.availableDomains = db.domains.filter(d => d.available).length;
        db.stats.premiumDomains = db.domains.filter(d => d.premium).length;
        
        await writeDB(db);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/check-bulk', async (req, res) => {
    try {
        const { domains } = req.body;
        if (!domains || !Array.isArray(domains)) {
            return res.status(400).json({ error: 'Domains array required' });
        }
        
        const results = [];
        const db = await readDB();
        
        for (const domain of domains) {
            try {
                const cleanDomain = domain.toLowerCase().trim();
                
                if (db.cache[cleanDomain]) {
                    const cacheAge = Date.now() - db.cache[cleanDomain].lastChecked;
                    if (cacheAge < 86400000) {
                        results.push({ ...db.cache[cleanDomain], cached: true });
                        continue;
                    }
                }
                
                const availCheck = await checkDomainAvailability(cleanDomain);
                const whoisInfo = getWhoisInfo(cleanDomain);
                
                const result = {
                    domain: cleanDomain,
                    available: availCheck.available,
                    hasDNS: availCheck.hasDNS,
                    whois: whoisInfo,
                    expirationDate: whoisInfo.expirationDate,
                    creationDate: whoisInfo.creationDate,
                    daysLeft: calculateDaysLeft(whoisInfo.expirationDate),
                    registrar: whoisInfo.registrar,
                    nameServers: whoisInfo.nameServers,
                    premium: isPremiumDomain(cleanDomain),
                    estimatedValue: estimateDomainValue(cleanDomain),
                    lastChecked: Date.now(),
                    cached: false
                };
                
                db.cache[cleanDomain] = result;
                
                const existing = db.domains.find(d => d.domain === cleanDomain);
                if (!existing) {
                    db.domains.push(result);
                    db.stats.totalDomains++;
                }
                
                // Add to monitoring
                const monitorExists = db.monitoring.find(m => m.domain === cleanDomain);
                if (!monitorExists) {
                    db.monitoring.push({
                        domain: cleanDomain,
                        firstChecked: Date.now(),
                        lastChecked: Date.now(),
                        checkCount: 1,
                        statusHistory: [{ date: Date.now(), available: result.available, registrar: result.registrar }]
                    });
                } else {
                    const idx = db.monitoring.findIndex(m => m.domain === cleanDomain);
                    db.monitoring[idx].lastChecked = Date.now();
                    db.monitoring[idx].checkCount++;
                }
                
                results.push(result);
            } catch (error) {
                results.push({ domain, error: error.message });
            }
        }
        
        db.stats.totalScans += domains.length;
        db.stats.availableDomains = db.domains.filter(d => d.available).length;
        db.stats.premiumDomains = db.domains.filter(d => d.premium).length;
        
        await writeDB(db);
        res.json({ results, total: results.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Monitoring
app.get('/api/monitoring', async (req, res) => {
    try {
        const db = await readDB();
        res.json({ monitoring: db.monitoring, count: db.monitoring.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monitoring/filter', async (req, res) => {
    try {
        const { keyword, available, registrar, dateFrom, dateTo } = req.query;
        const db = await readDB();
        let filtered = db.monitoring;
        
        if (keyword) {
            filtered = filtered.filter(m => m.domain.includes(keyword.toLowerCase()));
        }
        
        if (available !== undefined) {
            filtered = filtered.filter(m => {
                const latest = m.statusHistory[m.statusHistory.length - 1];
                return latest.available === (available === 'true');
            });
        }
        
        if (registrar) {
            filtered = filtered.filter(m => {
                const latest = m.statusHistory[m.statusHistory.length - 1];
                return latest.registrar && latest.registrar.toLowerCase().includes(registrar.toLowerCase());
            });
        }
        
        if (dateFrom) {
            const from = new Date(dateFrom).getTime();
            filtered = filtered.filter(m => m.firstChecked >= from);
        }
        
        if (dateTo) {
            const to = new Date(dateTo).getTime();
            filtered = filtered.filter(m => m.firstChecked <= to);
        }
        
        res.json({ monitoring: filtered, count: filtered.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sales & Profit Tracking
app.get('/api/sales', async (req, res) => {
    try {
        const db = await readDB();
        res.json(db.sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        const { domain, buyPrice, sellPrice, buyDate, sellDate, notes } = req.body;
        const db = await readDB();
        
        const profit = parseFloat(sellPrice) - parseFloat(buyPrice);
        const profitPercent = (profit / parseFloat(buyPrice)) * 100;
        
        const sale = {
            id: Date.now().toString(),
            domain,
            buyPrice: parseFloat(buyPrice),
            sellPrice: parseFloat(sellPrice),
            profit,
            profitPercent: profitPercent.toFixed(2),
            buyDate: buyDate || new Date().toISOString(),
            sellDate: sellDate || new Date().toISOString(),
            notes: notes || '',
            createdAt: Date.now()
        };
        
        db.sales.push(sale);
        
        // Update stats
        db.stats.totalProfit = db.sales.reduce((sum, s) => sum + s.profit, 0);
        db.stats.totalInvested = db.sales.reduce((sum, s) => sum + s.buyPrice, 0);
        db.stats.totalRevenue = db.sales.reduce((sum, s) => sum + s.sellPrice, 0);
        
        await writeDB(db);
        res.json({ success: true, sale });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/sales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await readDB();
        db.sales = db.sales.filter(s => s.id !== id);
        
        db.stats.totalProfit = db.sales.reduce((sum, s) => sum + s.profit, 0);
        db.stats.totalInvested = db.sales.reduce((sum, s) => sum + s.buyPrice, 0);
        db.stats.totalRevenue = db.sales.reduce((sum, s) => sum + s.sellPrice, 0);
        
        await writeDB(db);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Profit Analytics
app.get('/api/analytics/profit', async (req, res) => {
    try {
        const { period } = req.query; // week, month, year
        const db = await readDB();
        
        const now = Date.now();
        const periods = {
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
            year: 365 * 24 * 60 * 60 * 1000
        };
        
        const periodMs = periods[period] || periods.month;
        const cutoff = now - periodMs;
        
        const periodSales = db.sales.filter(s => new Date(s.sellDate).getTime() >= cutoff);
        
        const analytics = {
            period,
            totalSales: periodSales.length,
            totalProfit: periodSales.reduce((sum, s) => sum + s.profit, 0),
            totalRevenue: periodSales.reduce((sum, s) => sum + s.sellPrice, 0),
            totalInvested: periodSales.reduce((sum, s) => sum + s.buyPrice, 0),
            averageProfit: periodSales.length > 0 ? periodSales.reduce((sum, s) => sum + s.profit, 0) / periodSales.length : 0,
            averageProfitPercent: periodSales.length > 0 ? periodSales.reduce((sum, s) => sum + parseFloat(s.profitPercent), 0) / periodSales.length : 0,
            topSales: periodSales.sort((a, b) => b.profit - a.profit).slice(0, 5)
        };
        
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Advanced filtering
app.get('/api/domains/filter', async (req, res) => {
    try {
        const { days, keyword, registrar, available, premium } = req.query;
        const db = await readDB();
        let filtered = db.domains;
        
        if (days) {
            const maxDays = parseInt(days);
            filtered = filtered.filter(d => d.daysLeft !== null && d.daysLeft <= maxDays);
        }
        
        if (keyword) {
            filtered = filtered.filter(d => d.domain.includes(keyword.toLowerCase()));
        }
        
        if (registrar) {
            filtered = filtered.filter(d => d.registrar && d.registrar.toLowerCase().includes(registrar.toLowerCase()));
        }
        
        if (available !== undefined) {
            filtered = filtered.filter(d => d.available === (available === 'true'));
        }
        
        if (premium !== undefined) {
            filtered = filtered.filter(d => d.premium === (premium === 'true'));
        }
        
        res.json({ domains: filtered, count: filtered.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk upload
app.post('/api/upload-domains', upload.single('file'), async (req, res) => {
    try {
        const fileContent = await fs.readFile(req.file.path, 'utf8');
        const domains = fileContent
            .split(/[\n,;\t]+/)
            .map(d => d.trim())
            .filter(d => d && d.includes('.'));
        
        await fs.unlink(req.file.path);
        res.json({ domains, count: domains.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Portfolio
app.get('/api/portfolio', async (req, res) => {
    try {
        const db = await readDB();
        res.json(db.portfolio);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/portfolio', async (req, res) => {
    try {
        const { domain, price, notes, registrar } = req.body;
        const db = await readDB();
        const item = {
            domain,
            price: parseFloat(price),
            notes: notes || '',
            registrar: registrar || '',
            dateAdded: new Date().toISOString(),
            id: Date.now().toString()
        };
        db.portfolio.push(item);
        await writeDB(db);
        res.json({ success: true, item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/portfolio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const db = await readDB();
        db.portfolio = db.portfolio.filter(item => item.id !== id);
        await writeDB(db);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Statistics
app.get('/api/stats', async (req, res) => {
    try {
        const db = await readDB();
        const domains = Object.values(db.cache);
        const expired = domains.filter(d => d.daysLeft !== null && d.daysLeft <= 0).length;
        const expiring7 = domains.filter(d => d.daysLeft !== null && d.daysLeft > 0 && d.daysLeft <= 7).length;
        const expiring30 = domains.filter(d => d.daysLeft !== null && d.daysLeft > 7 && d.daysLeft <= 30).length;
        
        res.json({
            ...db.stats,
            expired,
            expiring7,
            expiring30,
            totalMonitored: db.monitoring.length,
            totalSales: db.sales.length,
            portfolioCount: db.portfolio.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export/Import
app.get('/api/export', async (req, res) => {
    try {
        const db = await readDB();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=domain-hunter-${Date.now()}.json`);
        res.send(JSON.stringify(db, null, 2));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/import', async (req, res) => {
    try {
        await writeDB(req.body);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/cache', async (req, res) => {
    try {
        const db = await readDB();
        db.cache = {};
        await writeDB(db);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 Domain Hunter Pro Enhanced!`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📊 API: http://localhost:${PORT}/api`);
        console.log(`\n✨ Features:`);
        console.log(`   - 🤖 AI Domain Generator with LLM support`);
        console.log(`   - 📤 Bulk File Upload`);
        console.log(`   - 🔍 Advanced Filtering`);
        console.log(`   - 📊 Profit Tracking & Analytics`);
        console.log(`   - 👁️ Domain Monitoring`);
        console.log(`   - 💼 Portfolio Management`);
        console.log(`   - 💰 Sales History\n`);
    });
});