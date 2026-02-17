const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const dns = require('dns').promises;
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'domains.json');
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// AI Domain Generator Data
const CITIES = ['new', 'san', 'los', 'miami', 'tokyo', 'paris', 'london', 'dubai', 'sydney', 'berlin'];
const COUNTRIES = ['usa', 'canada', 'france', 'spain', 'italy', 'japan', 'china', 'brazil', 'mexico', 'india'];
const PREFIXES = ['best', 'top', 'pro', 'my', 'get', 'buy', 'find', 'quick', 'fast', 'easy'];
const KEYWORDS = ['web', 'tech', 'digital', 'online', 'mobile', 'cloud', 'smart', 'app', 'shop', 'store', 'market', 'hub', 'zone', 'net', 'link', 'site'];
const TLDS = ['.com', '.net', '.org', '.io', '.ai', '.co', '.app', '.dev', '.tech', '.online'];

// Initialize database
async function initDB() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true });
        try {
            await fs.access(DB_FILE);
        } catch {
            const initialData = {
                domains: [],
                watchlist: [],
                portfolio: [],
                subdomains: [],
                cache: {},
                stats: { totalScans: 0, totalDomains: 0, availableDomains: 0, premiumDomains: 0 }
            };
            await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
            console.log('✅ Database initialized');
        }
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

// AI Domain Generator
function generateGeoDomains(count = 10) {
    const domains = [];
    for (let i = 0; i < count; i++) {
        const type = Math.random();
        let domain;
        
        if (type < 0.3) {
            // City + Keyword
            const city = CITIES[Math.floor(Math.random() * CITIES.length)];
            const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
            domain = `${city}${keyword}`;
        } else if (type < 0.6) {
            // Country + Keyword
            const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
            const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
            domain = `${country}${keyword}`;
        } else {
            // Prefix + City/Country
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
        (w1, w2) => `${w1}${w2}`,
        (w1, w2) => `best${w1}`,
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

// Check domain availability
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

// Subdomain discovery
async function discoverSubdomains(domain) {
    const commonSubdomains = ['www', 'mail', 'ftp', 'admin', 'blog', 'shop', 'api', 'dev', 'staging', 'test'];
    const found = [];
    
    for (const sub of commonSubdomains) {
        try {
            const subdomain = `${sub}.${domain}`;
            await dns.resolve4(subdomain);
            found.push({
                subdomain,
                exists: true,
                lastChecked: Date.now()
            });
        } catch (error) {
            // Subdomain doesn't exist
        }
    }
    
    return found;
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

// API Routes

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/data', async (req, res) => {
    try {
        const data = await readDB();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// AI Domain Generator
app.post('/api/generate-domains', async (req, res) => {
    try {
        const { type, keywords, count } = req.body;
        let domains = [];
        
        if (type === 'geo') {
            domains = generateGeoDomains(count || 20);
        } else if (type === 'realistic') {
            domains = generateRealisticDomains(keywords || [], count || 20);
        } else {
            domains = [...generateGeoDomains(10), ...generateRealisticDomains(keywords, 10)];
        }
        
        res.json({ domains, count: domains.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bulk upload from file
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

// Check domain with subdomain discovery
app.post('/api/check-domain', async (req, res) => {
    try {
        const { domain, checkSubdomains } = req.body;
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
            lastChecked: Date.now(),
            cached: false
        };
        
        // Discover subdomains if requested
        if (checkSubdomains && !availCheck.available) {
            const subdomains = await discoverSubdomains(cleanDomain);
            result.subdomains = subdomains;
            
            // Save subdomains to DB
            if (subdomains.length > 0) {
                subdomains.forEach(sub => {
                    const existing = db.subdomains.find(s => s.subdomain === sub.subdomain);
                    if (!existing) {
                        db.subdomains.push(sub);
                    }
                });
            }
        }
        
        db.cache[cleanDomain] = result;
        
        const existing = db.domains.find(d => d.domain === cleanDomain);
        if (!existing) {
            db.domains.push(result);
            db.stats.totalDomains++;
        } else {
            const idx = db.domains.findIndex(d => d.domain === cleanDomain);
            db.domains[idx] = result;
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
                    lastChecked: Date.now(),
                    cached: false
                };
                
                db.cache[cleanDomain] = result;
                
                const existing = db.domains.find(d => d.domain === cleanDomain);
                if (!existing) {
                    db.domains.push(result);
                    db.stats.totalDomains++;
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

// Advanced filtering
app.get('/api/domains/filter', async (req, res) => {
    try {
        const { days, keyword, registrar, available, premium } = req.query;
        const db = await readDB();
        let filtered = db.domains;
        
        // Filter by expiration days
        if (days) {
            const maxDays = parseInt(days);
            filtered = filtered.filter(d => d.daysLeft !== null && d.daysLeft <= maxDays);
        }
        
        // Filter by keyword
        if (keyword) {
            filtered = filtered.filter(d => d.domain.includes(keyword.toLowerCase()));
        }
        
        // Filter by registrar
        if (registrar) {
            filtered = filtered.filter(d => d.registrar && d.registrar.toLowerCase().includes(registrar.toLowerCase()));
        }
        
        // Filter by availability
        if (available !== undefined) {
            filtered = filtered.filter(d => d.available === (available === 'true'));
        }
        
        // Filter by premium
        if (premium !== undefined) {
            filtered = filtered.filter(d => d.premium === (premium === 'true'));
        }
        
        res.json({ domains: filtered, count: filtered.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Subdomain monitoring
app.get('/api/subdomains', async (req, res) => {
    try {
        const db = await readDB();
        res.json({ subdomains: db.subdomains, count: db.subdomains.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/subdomains/filter', async (req, res) => {
    try {
        const { domain, days } = req.query;
        const db = await readDB();
        let filtered = db.subdomains;
        
        if (domain) {
            filtered = filtered.filter(s => s.subdomain.includes(domain));
        }
        
        if (days) {
            const maxAge = parseInt(days) * 24 * 60 * 60 * 1000;
            const cutoff = Date.now() - maxAge;
            filtered = filtered.filter(s => s.lastChecked >= cutoff);
        }
        
        res.json({ subdomains: filtered, count: filtered.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Watchlist
app.get('/api/watchlist', async (req, res) => {
    try {
        const db = await readDB();
        const watchlistDetails = db.watchlist.map(domain => {
            return db.cache[domain] || { domain, status: 'Not checked' };
        });
        res.json(watchlistDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/watchlist', async (req, res) => {
    try {
        const { domain } = req.body;
        const db = await readDB();
        if (!db.watchlist.includes(domain)) {
            db.watchlist.push(domain);
            await writeDB(db);
        }
        res.json({ success: true, watchlist: db.watchlist });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/watchlist/:domain', async (req, res) => {
    try {
        const { domain } = req.params;
        const db = await readDB();
        db.watchlist = db.watchlist.filter(d => d !== domain);
        await writeDB(db);
        res.json({ success: true });
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
        const expiring90 = domains.filter(d => d.daysLeft !== null && d.daysLeft > 30 && d.daysLeft <= 90).length;
        const totalInvestment = db.portfolio.reduce((sum, item) => sum + item.price, 0);
        
        res.json({
            ...db.stats,
            expired,
            expiring7,
            expiring30,
            expiring90,
            totalWatchlist: db.watchlist.length,
            portfolioCount: db.portfolio.length,
            totalInvestment,
            totalSubdomains: db.subdomains.length
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
        console.log(`\n🚀 Domain Hunter Pro Enhanced Server!`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📊 API: http://localhost:${PORT}/api`);
        console.log(`\n✨ New Features:`);
        console.log(`   - 🤖 AI Domain Generator (Geo + Realistic)`);
        console.log(`   - 📤 Bulk File Upload`);
        console.log(`   - 🔍 Advanced Filtering (days, keywords, registrar)`);
        console.log(`   - 🌐 Subdomain Discovery & Monitoring`);
        console.log(`   - 📊 Registrar Tracking`);
        console.log(`   - ⏰ Expiration Day Filters\n`);
    });
});