const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const dns = require('dns').promises;

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'domains.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize database
async function initDB() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        try {
            await fs.access(DB_FILE);
        } catch {
            const initialData = {
                domains: [],
                watchlist: [],
                portfolio: [],
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

// Database operations
async function readDB() {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
}

async function writeDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Check domain availability via DNS
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

// Simple WHOIS simulation (replace with real API)
async function getWhoisInfo(domain) {
    // Simulate expiration date (30-365 days from now)
    const daysUntil = Math.floor(Math.random() * 335) + 30;
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + daysUntil);
    
    return {
        expirationDate: expDate.toISOString(),
        registrar: 'Simulated Registrar',
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
        domain.length <= 4,
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

app.post('/api/check-domain', async (req, res) => {
    try {
        const { domain } = req.body;
        if (!domain) return res.status(400).json({ error: 'Domain required' });
        
        const cleanDomain = domain.toLowerCase().trim();
        const db = await readDB();
        
        // Check cache (24 hours)
        if (db.cache[cleanDomain]) {
            const cacheAge = Date.now() - db.cache[cleanDomain].lastChecked;
            if (cacheAge < 86400000) {
                return res.json({ ...db.cache[cleanDomain], cached: true });
            }
        }
        
        const availCheck = await checkDomainAvailability(cleanDomain);
        const whoisInfo = await getWhoisInfo(cleanDomain);
        
        const result = {
            domain: cleanDomain,
            available: availCheck.available,
            hasDNS: availCheck.hasDNS,
            whois: whoisInfo,
            expirationDate: whoisInfo.expirationDate,
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
                const whoisInfo = await getWhoisInfo(cleanDomain);
                
                const result = {
                    domain: cleanDomain,
                    available: availCheck.available,
                    hasDNS: availCheck.hasDNS,
                    whois: whoisInfo,
                    expirationDate: whoisInfo.expirationDate,
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
        const { domain, price, notes } = req.body;
        const db = await readDB();
        const item = {
            domain,
            price: parseFloat(price),
            notes: notes || '',
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
        const expiring30 = domains.filter(d => d.daysLeft !== null && d.daysLeft > 0 && d.daysLeft <= 30).length;
        const expiring90 = domains.filter(d => d.daysLeft !== null && d.daysLeft > 30 && d.daysLeft <= 90).length;
        const totalInvestment = db.portfolio.reduce((sum, item) => sum + item.price, 0);
        
        res.json({
            ...db.stats,
            expired,
            expiring30,
            expiring90,
            totalWatchlist: db.watchlist.length,
            portfolioCount: db.portfolio.length,
            totalInvestment
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
        console.log(`\n🚀 Domain Hunter Pro Server running!`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`📊 API: http://localhost:${PORT}/api`);
        console.log(`\n✨ Features:`);
        console.log(`   - Real DNS checking`);
        console.log(`   - Auto-save to JSON database`);
        console.log(`   - 24-hour caching system`);
        console.log(`   - Watchlist & Portfolio management`);
        console.log(`   - Export/Import functionality\n`);
    });
});