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

// Database file
const DB_FILE = path.join(__dirname, 'data', 'domains.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize database
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            domains: [],
            watchlist: [],
            portfolio: [],
            sales: [],
            cache: {},
            stats: {
                totalScans: 0,
                totalDomains: 0,
                availableDomains: 0,
                premiumDomains: 0
            }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

initDB();

// Read/Write DB helpers
function readDB() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { domains: [], watchlist: [], portfolio: [], sales: [], cache: {}, stats: {} };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing database:', error);
    }
}

// ============================================
// RDAP + WHOIS IMPLEMENTATION (From Python)
// ============================================

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
    'br': 'https://rdap.registro.br/domain/',
    'au': 'https://rdap.auda.org.au/domain/',
    'fr': 'https://rdap.nic.fr/v1/domain/',
    'xyz': 'https://rdap.nic.xyz/v1/domain/',
    'club': 'https://rdap.nic.club/v1/domain/',
    'info': 'https://rdap.afilias.net/v1/domain/',
    'biz': 'https://rdap.nic.biz/v1/domain/',
    'ai': 'https://rdap.nic.ai/v1/domain/',
};

function getTLD(domain) {
    const parts = domain.split('.');
    return parts.length >= 2 ? parts[parts.length - 1] : '';
}

async function fetchViaRDAP(domain) {
    const tld = getTLD(domain);
    
    // Try TLD-specific RDAP
    if (RDAP_SERVERS[tld]) {
        try {
            const url = `${RDAP_SERVERS[tld]}${domain}`;
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            });
            
            if (response.status === 200) {
                const data = response.data;
                
                // Find expiration date in events
                if (data.events) {
                    for (const event of data.events) {
                        if (event.eventAction === 'expiration' || event.eventAction === 'expiry') {
                            if (event.eventDate) {
                                return {
                                    expirationDate: new Date(event.eventDate),
                                    registrar: extractRegistrar(data),
                                    method: 'rdap'
                                };
                            }
                        }
                    }
                }
                
                // Check direct expirationDate field
                if (data.expirationDate) {
                    return {
                        expirationDate: new Date(data.expirationDate),
                        registrar: extractRegistrar(data),
                        method: 'rdap'
                    };
                }
            }
        } catch (error) {
            // RDAP failed, will try WHOIS
        }
    }
    
    // Try generic RDAP
    try {
        const response = await axios.get(`https://rdap.org/domain/${domain}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        
        if (response.status === 200 && response.data.events) {
            for (const event of response.data.events) {
                if (event.eventAction === 'expiration') {
                    return {
                        expirationDate: new Date(event.eventDate),
                        registrar: extractRegistrar(response.data),
                        method: 'rdap'
                    };
                }
            }
        }
    } catch (error) {
        // Will try WHOIS
    }
    
    return null;
}

function extractRegistrar(rdapData) {
    // Extract registrar from RDAP data
    if (rdapData.entities) {
        for (const entity of rdapData.entities) {
            if (entity.roles && entity.roles.includes('registrar')) {
                if (entity.vcardArray && entity.vcardArray[1]) {
                    for (const field of entity.vcardArray[1]) {
                        if (field[0] === 'fn') {
                            return field[3];
                        }
                    }
                }
            }
        }
    }
    return 'Unknown';
}

async function fetchViaWHOIS(domain) {
    // Using external WHOIS API as Node.js doesn't have built-in WHOIS
    try {
        // Try multiple WHOIS APIs
        const apis = [
            `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=at_FREE&domainName=${domain}&outputFormat=JSON`,
            `https://jsonwhoisapi.com/api/v1/whois?identifier=${domain}`
        ];
        
        for (const apiUrl of apis) {
            try {
                const response = await axios.get(apiUrl, { timeout: 10000 });
                
                if (response.data) {
                    const data = response.data;
                    
                    // Parse different API response formats
                    let expirationDate = null;
                    let registrar = 'Unknown';
                    
                    // WhoisXML format
                    if (data.WhoisRecord) {
                        expirationDate = data.WhoisRecord.expiresDate || data.WhoisRecord.registryData?.expiresDate;
                        registrar = data.WhoisRecord.registrarName || 'Unknown';
                    }
                    // JSONWhois format
                    else if (data.expiry_date) {
                        expirationDate = data.expiry_date;
                        registrar = data.registrar || 'Unknown';
                    }
                    
                    if (expirationDate) {
                        return {
                            expirationDate: new Date(expirationDate),
                            registrar: registrar,
                            method: 'whois'
                        };
                    }
                }
            } catch (err) {
                continue;
            }
        }
    } catch (error) {
        console.error(`WHOIS failed for ${domain}:`, error.message);
    }
    
    return null;
}

async function checkDomainInfo(domain) {
    try {
        // Try RDAP first (faster and more reliable)
        let result = await fetchViaRDAP(domain);
        
        // If RDAP fails, try WHOIS
        if (!result) {
            result = await fetchViaWHOIS(domain);
        }
        
        // Check DNS to see if domain is registered
        let hasDNS = false;
        try {
            await dns.resolve(domain);
            hasDNS = true;
        } catch (e) {
            hasDNS = false;
        }
        
        if (result && result.expirationDate) {
            const now = new Date();
            const daysLeft = Math.ceil((result.expirationDate - now) / (1000 * 60 * 60 * 24));
            
            return {
                domain: domain,
                available: false,
                hasDNS: hasDNS,
                expirationDate: result.expirationDate.toISOString(),
                daysLeft: daysLeft,
                registrar: result.registrar,
                method: result.method,
                lastChecked: Date.now()
            };
        } else {
            // No expiration data found, check if available
            return {
                domain: domain,
                available: !hasDNS,
                hasDNS: hasDNS,
                expirationDate: null,
                daysLeft: null,
                registrar: hasDNS ? 'Unknown' : null,
                method: 'dns',
                lastChecked: Date.now()
            };
        }
    } catch (error) {
        console.error(`Error checking ${domain}:`, error.message);
        return {
            domain: domain,
            available: null,
            hasDNS: false,
            expirationDate: null,
            daysLeft: null,
            registrar: 'Unknown',
            method: 'error',
            lastChecked: Date.now()
        };
    }
}

// ============================================
// API ROUTES
// ============================================

// Check single domain
app.post('/api/check-domain', async (req, res) => {
    const { domain } = req.body;
    
    if (!domain) {
        return res.status(400).json({ error: 'Domain required' });
    }
    
    const db = readDB();
    const cacheKey = domain.toLowerCase();
    
    // Check cache (24 hours)
    if (db.cache[cacheKey] && (Date.now() - db.cache[cacheKey].lastChecked < 24 * 60 * 60 * 1000)) {
        return res.json(db.cache[cacheKey]);
    }
    
    const result = await checkDomainInfo(domain);
    
    // Update cache
    db.cache[cacheKey] = result;
    
    // Update stats
    db.stats.totalScans++;
    
    writeDB(db);
    res.json(result);
});

// Check multiple domains
app.post('/api/check-domains', async (req, res) => {
    const { domains } = req.body;
    
    if (!domains || !Array.isArray(domains)) {
        return res.status(400).json({ error: 'Domains array required' });
    }
    
    const results = [];
    const db = readDB();
    
    for (const domain of domains) {
        const cacheKey = domain.toLowerCase();
        
        // Check cache
        if (db.cache[cacheKey] && (Date.now() - db.cache[cacheKey].lastChecked < 24 * 60 * 60 * 1000)) {
            results.push(db.cache[cacheKey]);
        } else {
            const result = await checkDomainInfo(domain);
            db.cache[cacheKey] = result;
            results.push(result);
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    db.stats.totalScans += domains.length;
    writeDB(db);
    
    res.json({ results });
});

// AI Domain Generator
const CITIES = ['new', 'san', 'los', 'miami', 'tokyo', 'paris', 'london', 'berlin', 'madrid', 'rome'];
const COUNTRIES = ['usa', 'uk', 'japan', 'france', 'spain', 'italy', 'canada', 'germany'];
const PREFIXES = ['best', 'top', 'pro', 'my', 'get', 'go', 'the'];
const KEYWORDS = ['web', 'tech', 'digital', 'shop', 'market', 'hub', 'zone', 'app', 'cloud', 'online'];

app.post('/api/generate-domains', (req, res) => {
    const { type, keywords, count, tlds } = req.body;
    const targetCount = Math.min(count || 20, 100);
    const selectedTLDs = tlds && tlds.length > 0 ? tlds : ['.com', '.net', '.org', '.io'];
    const customKeywords = keywords ? keywords.split(',').map(k => k.trim().toLowerCase()) : [];
    
    const allKeywords = [...KEYWORDS, ...customKeywords];
    const domains = new Set();
    
    while (domains.size < targetCount) {
        let domain = '';
        
        if (type === 'geo' || (type === 'mixed' && Math.random() > 0.5)) {
            // Geographic domains
            const city = CITIES[Math.floor(Math.random() * CITIES.length)];
            const keyword = allKeywords[Math.floor(Math.random() * allKeywords.length)];
            domain = `${city}${keyword}`;
        } else {
            // Realistic business names
            const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
            const keyword1 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
            const keyword2 = allKeywords[Math.floor(Math.random() * allKeywords.length)];
            domain = `${prefix}${keyword1}${keyword2}`;
        }
        
        // Add TLD
        const tld = selectedTLDs[Math.floor(Math.random() * selectedTLDs.length)];
        domains.add(domain + tld);
    }
    
    res.json({ domains: Array.from(domains), count: domains.size });
});

// Upload file
app.post('/api/upload-domains', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    const domains = content.split(/[\r\n,;\t]+/)
        .map(d => d.trim().toLowerCase())
        .filter(d => d && /^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(d));
    
    // Clean up
    fs.unlinkSync(filePath);
    
    res.json({ domains, count: domains.length });
});

// Get stats
app.get('/api/stats', (req, res) => {
    const db = readDB();
    res.json(db.stats);
});

// Portfolio management
app.post('/api/portfolio', (req, res) => {
    const db = readDB();
    const item = {
        id: Date.now().toString(),
        ...req.body,
        dateAdded: new Date().toISOString()
    };
    db.portfolio.push(item);
    writeDB(db);
    res.json(item);
});

app.get('/api/portfolio', (req, res) => {
    const db = readDB();
    res.json(db.portfolio);
});

// Sales management
app.post('/api/sales', (req, res) => {
    const db = readDB();
    const sale = {
        id: Date.now().toString(),
        ...req.body,
        dateAdded: new Date().toISOString()
    };
    db.sales.push(sale);
    writeDB(db);
    res.json(sale);
});

app.get('/api/sales', (req, res) => {
    const db = readDB();
    res.json(db.sales || []);
});

app.listen(PORT, () => {
    console.log(`🚀 Domain Hunter Pro running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${DB_FILE}`);
});