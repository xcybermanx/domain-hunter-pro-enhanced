# 🤖 Domain Hunter Pro Enhanced - AI Edition

[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-orange)](package.json)
[![AI Powered](https://img.shields.io/badge/AI-Powered-red)](README.md)

A professional AI-powered domain research platform with intelligent domain generation, real-time monitoring, GeoNames location integration, and advanced filtering.

## 🌟 New Features (v3.0)

### 🤖 AI Domain Generator with LLM Support
- **Multi-LLM Support**: Local (Ollama), OpenAI, Claude, Perplexity, Grok
- **Geo-Domain Generation**: Intelligent city + country combinations
- **GeoNames Integration**: Real location data for 250+ countries
- **Custom Keywords**: Generate domains based on your keywords
- **Bulk Generation**: Create 5-100 domains instantly
- **Smart Fallback**: Works without LLM configuration

### 🌍 GeoNames Location Integration
- Browse all countries sorted by population
- Search cities with population filtering (100k+, 500k+, 1M+)
- Click country → view major cities
- Select location → generate geo-targeted domains
- Real-time location search with autocomplete

### 📤 Bulk File Upload
- Upload CSV/TXT files with domain lists
- Automatic parsing and validation
- Support for multiple formats

### 🔍 Advanced Filtering
- **Filter by expiration days**: 7, 30, 90, 180 days or custom
- **Keyword search**: Find domains containing specific words
- **Registrar filter**: Filter by GoDaddy, Namecheap, etc.
- **Availability filter**: Available or taken domains
- **Remove All**: Clear all monitored domains at once

### 💼 Enhanced Portfolio & Profit Tracker
- Registrar tracking
- Custom notes per domain
- Investment tracking
- Sales history with ROI calculation
- Profit analytics by period

## ✨ Core Features

### Backend (Node.js + Express)
- ✅ Real DNS Resolution
- ✅ RDAP/WHOIS Integration
- ✅ JSON Database with auto-creation
- ✅ Smart 24-hour caching
- ✅ RESTful API architecture
- ✅ Bulk operations support
- ✅ File upload handling (multer)
- ✅ GeoNames API integration

### Frontend (Modern Interactive UI)
- ✅ 8 specialized tabs
- ✅ Live statistics dashboard
- ✅ Real-time updates
- ✅ Responsive design
- ✅ Professional animations
- ✅ Clickable dashboard cards

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/xcybermanx/domain-hunter-pro-enhanced.git
cd domain-hunter-pro-enhanced

# Install dependencies
npm install

# Start server
npm start
```

### Access Application
```
http://localhost:3000
```

### Optional: Set Up Local LLM (Recommended)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended model
ollama pull qwen2.5:3b

# Start Ollama server
ollama serve
```

Then go to **Settings** in the app and enable Local LLM.

## 📊 Dashboard Statistics

- **Total Scans**: Number of domains checked
- **Available Domains**: Domains ready to register
- **Expiring (7d)**: Domains expiring within 7 days
- **Premium Domains**: High-value domains detected
- **Total Monitored**: Domains in monitoring
- **Total Profit**: Revenue from sales
- **Total Revenue**: Total sales value
- **Total Invested**: Portfolio investment value
- **ROI**: Return on investment percentage

## 🛠️ API Documentation

### AI Domain Generator
```http
POST /api/generate-domains
Content-Type: application/json

{
  "type": "geo",              // "geo", "business", "mixed"
  "keywords": "loyer,invest", // comma-separated keywords
  "count": 20,                // 5-100
  "useLLM": true,             // use AI for generation
  "tlds": [".com", ".fr"],   // selected TLDs
  "minLength": 4,             // min domain name length
  "maxLength": 30,            // max domain name length
  "allowNumbers": true,
  "allowHyphens": true,
  "geoLocation": {            // optional location
    "name": "Paris",
    "country": "France"
  }
}
```

**Response:**
```json
{
  "domains": ["loyerparis.com", "paris-loyer.fr", ...],
  "count": 20,
  "usedLLM": true
}
```

### GeoNames API

**Search Locations:**
```http
GET /api/geonames/search?q=Paris&type=cities
```

**Get All Countries:**
```http
GET /api/geonames/countries
```

**Get Cities by Country:**
```http
GET /api/geonames/cities/FR?limit=50
```

### Bulk File Upload
```http
POST /api/upload-domains
Content-Type: multipart/form-data

file: domains.txt
```

**Response:**
```json
{
  "domains": ["example.com", "test.com", ...],
  "count": 150
}
```

### Domain Monitoring

**Add to Monitoring:**
```http
POST /api/monitoring
Content-Type: application/json

{
  "domain": "example.com"
}
```

**Remove from Monitoring:**
```http
DELETE /api/monitoring/example.com
```

**Remove All Monitored Domains:**
```http
DELETE /api/monitoring
```

**Filter Monitoring:**
```http
GET /api/monitoring/filter?keyword=tech&available=true&registrar=godaddy
```

### Expiring Domains
```http
GET /api/expiring?maxDays=30
```

**Response:**
```json
{
  "expiring": [
    {
      "domain": "example.com",
      "daysLeft": 15,
      "expirationDate": "2026-03-05T00:00:00.000Z",
      "registrar": "GoDaddy"
    }
  ],
  "count": 1
}
```

### Portfolio Management
```http
POST /api/portfolio
Content-Type: application/json

{
  "domain": "example.com",
  "price": 100,
  "registrar": "GoDaddy",
  "notes": "Investment domain"
}
```

### Sales & Profit Tracking
```http
POST /api/sales
Content-Type: application/json

{
  "domain": "example.com",
  "buyPrice": 10,
  "sellPrice": 100,
  "buyDate": "2025-01-01",
  "sellDate": "2026-02-18",
  "notes": "Quick flip"
}
```

**Get Profit Analytics:**
```http
GET /api/analytics/profit?period=month  // week, month, year
```

## 🎨 Features Guide

### 1. AI Domain Generator

**Geo-Domains with GeoNames:**
1. Enter keyword: `loyer` (rent)
2. Click "Browse All Countries"
3. Select "France" → Choose "Paris"
4. Select TLDs: `.com`, `.fr`
5. Click "Generate Domains"

**Results:**
- `loyerparis.com`
- `paris-loyer.fr`
- `parloyer.io`
- `locationparis.com`

**Business Domains:**
- Professional combinations
- Market-tested patterns
- Brandable names

Examples:
- `getmarketpro.com`
- `cloudtechonline.io`
- `bestshophub.com`

### 2. Bulk Domain Scanner

1. Enter domains (one per line) or upload file
2. Click "Check Domains"
3. View results with:
   - Availability status
   - Registrar information
   - Expiration dates
   - Days left
   - RDAP/WHOIS method

### 3. Domain Monitoring

**Features:**
- Automatically stores all scanned domains
- Filter by keyword, availability, registrar
- Track expiration dates
- Last checked timestamps
- Remove individual or all domains

**Filters:**
- **Keyword**: Search domain names
- **Status**: Available/Taken
- **Registrar**: Filter by specific registrar
- **Remove All**: Clear all monitored domains

### 4. Expiring Domains

**Quick Filters:**
- ≤ 7 days (critical)
- ≤ 14 days (urgent)
- ≤ 30 days (important)
- ≤ 60 days
- ≤ 90 days
- Custom days

**Use Cases:**
- Find dropping domains
- Plan renewals
- Investment opportunities
- Expired domain research

### 5. Portfolio Management

**Track:**
- Domain names
- Purchase prices
- Registrar information
- Custom notes
- Purchase dates
- Total investment value

**Features:**
- Add/Remove domains
- View total investment
- Track by registrar
- Export capability

### 6. Profit Tracker

**Record Sales:**
- Buy price
- Sell price
- Buy/Sell dates
- Notes

**Analytics:**
- Total sales count
- Total profit
- Average profit per sale
- Average ROI percentage
- Period filters (week/month/year)

**Automatic Calculations:**
- Profit per sale
- ROI percentage
- Total revenue
- Total costs

## 💾 Database Structure

```json
{
  "domains": [],
  "watchlist": [],
  "portfolio": [
    {
      "id": "1708176000000",
      "domain": "mydomain.com",
      "price": 100,
      "registrar": "Namecheap",
      "notes": "Investment",
      "dateAdded": "2024-02-17T00:00:00.000Z"
    }
  ],
  "sales": [
    {
      "id": "1708176000000",
      "domain": "sold.com",
      "buyPrice": 10,
      "sellPrice": 100,
      "profit": 90,
      "profitPercent": "900.0",
      "buyDate": "2025-01-01",
      "sellDate": "2026-02-18",
      "notes": "Quick flip"
    }
  ],
  "cache": {
    "example.com": {
      "domain": "example.com",
      "available": false,
      "hasDNS": true,
      "expirationDate": "2025-12-31T00:00:00.000Z",
      "daysLeft": 365,
      "registrar": "GoDaddy",
      "method": "rdap",
      "lastChecked": 1708176000000
    }
  },
  "stats": {
    "totalScans": 150,
    "totalDomains": 45,
    "availableDomains": 12,
    "premiumDomains": 3
  }
}
```

## 🎯 Use Cases

### 1. Domain Investor
```
1. Generate 50 geo-domains with AI + GeoNames
2. Select location: Paris, France
3. Keywords: "invest", "capital"
4. Filter by "Available"
5. Check expiration dates
6. Add valuable finds to portfolio
7. Track sales and ROI
```

### 2. International Business
```
1. Use GeoNames to browse target countries
2. Select cities in each country
3. Generate localized domains
4. Check availability across TLDs
5. Build international portfolio
```

### 3. Domain Flipper
```
1. Monitor expiring domains (7-30 days)
2. Filter by availability
3. Add to watchlist
4. Purchase when available
5. Record buy price in portfolio
6. Record sale in profit tracker
7. Analyze ROI by period
```

### 4. SEO Professional
```
1. Upload client domain list
2. Monitor expiration dates
3. Set up renewal reminders
4. Track registrar information
5. Filter by days until expiration
```

## ⚙️ Configuration

### LLM Configuration (Settings Page)

**Local LLM (Ollama) - FREE & RECOMMENDED:**
```
Provider: Local (Ollama)
Model: qwen2.5:3b (recommended)
Endpoint: http://localhost:11434/api/generate
```

**OpenAI:**
```
Provider: OpenAI
API Key: sk-...
Model: gpt-3.5-turbo
```

**Claude (Anthropic):**
```
Provider: Claude
API Key: sk-ant-...
Model: claude-3-haiku-20240307
```

**Perplexity:**
```
Provider: Perplexity
API Key: pplx-...
Model: sonar (or sonar-pro for advanced features)
```

> **Note**: Perplexity API uses simplified model names in 2026:
> - `sonar` - Fast search-grounded responses (default)
> - `sonar-pro` - Deeper retrieval with more sources
> - `sonar-reasoning` - Multi-step reasoning with search
> - Old model names like `llama-3.1-sonar-small-128k-online` are deprecated

**Grok (xAI):**
```
Provider: Grok
API Key: xai-...
Model: grok-beta
```

### GeoNames Configuration

Update `GEONAMES_USERNAME` in `server.js`:
```javascript
const GEONAMES_USERNAME = 'your_username';
```

Get free username at: http://www.geonames.org/login

### Custom TLDs

In the AI Generator page:
1. Scroll to "Add custom TLD extension"
2. Enter TLD (e.g., `.madrid`, `.realty`, `.global`)
3. Click "Add TLD"
4. TLD will be included in generation

## 🚢 Deployment

### Heroku
```bash
heroku create domain-hunter-pro
git push heroku main
```

### Vercel
```bash
vercel --prod
```

### Docker
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t domain-hunter .
docker run -p 3000:3000 -v $(pwd)/data:/app/data domain-hunter
```

## 🔐 Security Best Practices

1. **Rate Limiting** - Implement for production
2. **API Authentication** - Add JWT tokens
3. **File Upload Validation** - Strict file type checking
4. **Input Sanitization** - Already includes basic validation
5. **HTTPS** - Always use SSL in production
6. **Environment Variables** - Store API keys securely

## 📊 Performance Tips

1. **Cache Management**: 24-hour auto-cache for domain checks
2. **Bulk Operations**: Process 50+ domains efficiently
3. **File Upload Limits**: Configure max file size in multer
4. **Database Optimization**: Consider MongoDB for 10k+ domains
5. **CDN Integration**: Serve static files faster
6. **LLM Timeout**: Configured to 60s for large generations

## 🐛 Troubleshooting

### "Cannot upload file"
```bash
# Create uploads directory
mkdir uploads
chmod 755 uploads
```

### "AI generator not working"
```bash
# Check if Ollama is running
curl http://localhost:11434/api/generate

# Pull the model
ollama pull qwen2.5:3b

# Check server logs
npm start
```

### "GeoNames API error"
- Verify username is correct
- Check daily API limit (free tier: 20,000 requests/day)
- Ensure internet connection

### "Perplexity API: Invalid model error"
- Use current model names: `sonar`, `sonar-pro`, `sonar-reasoning`
- Old model names (e.g., `llama-3.1-sonar-small-128k-online`) are no longer supported
- Check [Perplexity API documentation](https://docs.perplexity.ai/docs/getting-started/models) for latest models
- Verify API key is valid and has credits

### "OpenAI/Claude API failed"
- Verify API key is correct
- Check API balance/credits
- Ensure model name is valid for your account tier

## 🚀 Future Enhancements

### Completed Features ✅
- ✅ Multi-user support with authentication (Portfolio & Sales tracking)
- ✅ Price history tracking (Sales history with dates)
- ✅ Historical data tracking (Cache with timestamps)

### Planned Features
- [ ] Email alerts for expiring domains
- [ ] Scheduled automated checking (cron jobs)
- [ ] Domain auction monitoring (NameJet, GoDaddy Auctions)
- [ ] Competitor analysis (track competitor domains)
- [ ] Chrome extension (quick domain check)
- [ ] Mobile app (React Native)
- [ ] Backlink analysis (Ahrefs/Moz integration)
- [ ] SEO metrics integration (DA, PA, traffic estimates)
- [ ] Domain appraisal with ML (price prediction)
- [ ] Bulk WHOIS enrichment (batch processing)
- [ ] Export to CSV/Excel
- [ ] API rate limiting and quotas
- [ ] Webhook notifications
- [ ] Integration with domain registrars (auto-purchase)

## 🤝 Contributing

Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

MIT License - See LICENSE file

## 👨‍💻 Author

**xcybermanx**
- GitHub: [@xcybermanx](https://github.com/xcybermanx)
- Repository: [domain-hunter-pro-enhanced](https://github.com/xcybermanx/domain-hunter-pro-enhanced)

## 🙏 Acknowledgments

- Express.js for backend framework
- Multer for file uploads
- Font Awesome for beautiful icons
- Node.js DNS module
- GeoNames for location data
- Ollama for local LLM support
- Perplexity AI for search-grounded generation
- Open source community

## 💬 Support

For issues or questions:
- Open GitHub issue
- Check documentation
- Review existing issues

---

**⭐ Star this repository if you find it helpful!**

**Made with ❤️ and 🤖 AI for domain hunters worldwide**

## 📝 Changelog

### v3.0.1 (Current)
- 🔧 Fixed Perplexity API model name (now uses `sonar` instead of deprecated model)
- 📝 Updated documentation with current Perplexity model names
- ✅ Marked completed future enhancements
- 🐛 Fixed model validation issues

### v3.0.0
- ✨ Added multi-LLM support (Local, OpenAI, Claude, Perplexity, Grok)
- 🌍 Added GeoNames integration with 250+ countries
- 🗺️ Added location-based domain generation
- 👥 Added population filtering for cities
- 🔧 Fixed TLD selection to only use selected TLDs
- 🗑️ Added "Remove All" button for monitoring
- 🖱️ Made dashboard expiring domains clickable
- 📊 Enhanced profit tracking with ROI analytics
- 💰 Added sales history management

### v2.0.0
- ✨ Added AI domain generator (geo + realistic)
- 📤 Added bulk file upload support
- 🔍 Added advanced filtering system
- 💼 Enhanced portfolio with registrar tracking
- ⏰ Added expiration day filters
- 📊 Added comprehensive statistics

### v1.0.0
- ✅ Initial release
- ✅ Basic domain checking
- ✅ Simple watchlist
- ✅ Portfolio management