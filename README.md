# 🤖 Domain Hunter Pro Enhanced - AI Edition

[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-orange)](package.json)
[![AI Powered](https://img.shields.io/badge/AI-Powered-red)](README.md)

A professional AI-powered domain research platform with intelligent domain generation, real-time monitoring, subdomain discovery, and advanced filtering.

## 🌟 New Features (v2.0)

### 🤖 AI Domain Generator
- **Geo-Domain Generation**: Intelligent city + country combinations
- **Realistic Business Names**: AI-powered realistic domain suggestions
- **Custom Keywords**: Generate domains based on your keywords
- **Bulk Generation**: Create 5-100 domains instantly

### 📤 Bulk File Upload
- Upload CSV/TXT files with domain lists
- Automatic parsing and validation
- Support for multiple formats

### 🔍 Advanced Filtering
- **Filter by expiration days**: 7, 30, 90, 180 days
- **Keyword search**: Find domains containing specific words
- **Registrar filter**: Filter by GoDaddy, Namecheap, etc.
- **Availability filter**: Available or taken domains
- **Premium filter**: Premium domains only

### 🌐 Subdomain Monitoring
- Automatic subdomain discovery
- Track all found subdomains
- Filter by parent domain
- Monitor last check dates

### 💼 Enhanced Portfolio
- Registrar tracking
- Custom notes per domain
- Investment tracking
- Purchase date logging

## ✨ Core Features

### Backend (Node.js + Express)
- ✅ Real DNS Resolution
- ✅ JSON Database with auto-creation
- ✅ Smart 24-hour caching
- ✅ RESTful API architecture
- ✅ Bulk operations support
- ✅ File upload handling (multer)

### Frontend (Modern Interactive UI)
- ✅ 6 specialized tabs
- ✅ Live statistics dashboard
- ✅ Real-time updates
- ✅ Responsive design
- ✅ Professional animations

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

## 📊 Dashboard Statistics

- **Total Scans**: Number of domains checked
- **Available Domains**: Domains ready to register
- **Expiring (7d)**: Domains expiring within 7 days
- **Premium Domains**: High-value domains detected
- **Total Subdomains**: Discovered subdomains
- **Total Investment**: Portfolio value

## 🛠️ API Documentation

### AI Domain Generator
```http
POST /api/generate-domains
Content-Type: application/json

{
  "type": "geo",           // "geo", "realistic", "mixed"
  "keywords": ["tech", "shop"],
  "count": 20
}
```

**Response:**
```json
{
  "domains": ["newyorktech.com", "parisshop.io", ...],
  "count": 20
}
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

### Advanced Filtering
```http
GET /api/domains/filter?days=30&keyword=tech&registrar=godaddy&available=true&premium=false
```

**Response:**
```json
{
  "domains": [...],
  "count": 15
}
```

### Subdomain Discovery
```http
GET /api/subdomains?domain=example.com&days=7
```

**Response:**
```json
{
  "subdomains": [
    {
      "subdomain": "www.example.com",
      "exists": true,
      "lastChecked": 1708176000000
    }
  ],
  "count": 1
}
```

### Enhanced Portfolio
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

## 🎨 Features Guide

### 1. AI Domain Generator

**Geo-Domains:**
- Combines cities with keywords
- Country + business terms
- Location-based domains

Examples:
- `newyorktech.com`
- `parisshop.io`
- `tokyohub.app`

**Realistic Domains:**
- Business-ready names
- Professional combinations
- Market-tested patterns

Examples:
- `getmarketpro.com`
- `cloudtechonline.io`
- `bestshophub.com`

### 2. Bulk Domain Scanner

1. Enter domains (one per line)
2. Enable "Discover Subdomains" for deep scan
3. Click "Check Domains"
4. View results with:
   - Availability status
   - Registrar information
   - Expiration dates
   - Days left
   - Premium indicators

### 3. Bulk File Upload

**Supported Formats:**
- Plain text (.txt)
- CSV files (.csv)
- One domain per line
- Comma, semicolon, or tab separated

**Example File:**
```
example.com
test.com
awesome-domain.io
```

### 4. Advanced Filtering

**Filter Combinations:**

```
Expiring in 30 days + Available + Premium
→ Find premium domains about to expire

Keyword "tech" + Registrar "GoDaddy"
→ Find tech domains at specific registrar

Expiring in 7 days + Not Premium
→ Find affordable expiring domains
```

### 5. Subdomain Monitor

**Automatic Discovery:**
When checking domains with "Discover Subdomains" enabled, the system checks:
- www
- mail
- ftp
- admin
- blog
- shop
- api
- dev
- staging
- test

**Tracking:**
- All found subdomains stored
- Last check timestamp
- Filter by parent domain
- Filter by check date

### 6. Enhanced Portfolio

**Track:**
- Domain names
- Purchase prices
- Registrar information
- Custom notes
- Purchase dates
- Total investment value

## 💾 Database Structure

```json
{
  "domains": [
    {
      "domain": "example.com",
      "available": false,
      "hasDNS": true,
      "expirationDate": "2025-12-31T00:00:00.000Z",
      "creationDate": "2020-01-01T00:00:00.000Z",
      "daysLeft": 365,
      "registrar": "GoDaddy",
      "nameServers": ["ns1.example.com"],
      "premium": false,
      "lastChecked": 1708176000000,
      "subdomains": [
        {
          "subdomain": "www.example.com",
          "exists": true,
          "lastChecked": 1708176000000
        }
      ]
    }
  ],
  "watchlist": ["example.com"],
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
  "subdomains": [
    {
      "subdomain": "www.example.com",
      "exists": true,
      "lastChecked": 1708176000000
    }
  ],
  "cache": {},
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
1. Generate 50 geo-domains with AI
2. Filter by "Available" + "Premium"
3. Check expiration dates
4. Add valuable finds to portfolio
5. Track investment with registrar info
```

### 2. SEO Professional
```
1. Upload client domain list
2. Enable subdomain discovery
3. Monitor all subdomains
4. Filter by expiring in 30 days
5. Plan renewal strategy
```

### 3. Business Owner
```
1. Generate realistic business names
2. Filter by keyword (your industry)
3. Check availability
4. Compare registrar pricing
5. Add chosen domain to portfolio
```

### 4. Domain Researcher
```
1. Use advanced filters
2. Find domains expiring soon
3. Filter by specific registrars
4. Discover premium opportunities
5. Track trends over time
```

## ⚙️ Configuration

### AI Generator Customization

Edit `server.js` to customize AI patterns:

```javascript
const CITIES = ['new', 'san', 'los', 'miami', 'tokyo', ...];
const COUNTRIES = ['usa', 'canada', 'france', ...];
const PREFIXES = ['best', 'top', 'pro', 'my', ...];
const KEYWORDS = ['web', 'tech', 'digital', ...];
const TLDS = ['.com', '.net', '.org', '.io', ...];
```

### Subdomain Discovery

Add custom subdomains to check:

```javascript
const commonSubdomains = [
    'www', 'mail', 'ftp', 'admin', 'blog',
    'shop', 'api', 'dev', 'staging', 'test',
    // Add your custom subdomains here
    'app', 'cdn', 'media', 'static'
];
```

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
4. **Input Sanitization** - Already basic validation
5. **HTTPS** - Always use SSL in production

## 📊 Performance Tips

1. **Cache Management**: 24-hour auto-cache
2. **Bulk Operations**: Process 50+ domains efficiently
3. **File Upload Limits**: Configure max file size
4. **Database Optimization**: Consider MongoDB for 10k+ domains
5. **CDN Integration**: Serve static files faster

## 🐛 Troubleshooting

### "Cannot upload file"
```bash
# Create uploads directory
mkdir uploads
chmod 755 uploads
```

### "AI generator not working"
```bash
# Check server logs
npm start
# Look for error messages
```

### "Subdomain discovery fails"
- Check DNS resolution
- Verify internet connection
- Some domains may block subdomain enumeration

## 🚀 Future Enhancements

- [ ] Real WHOIS API integration
- [ ] Machine learning domain valuation
- [ ] Email alerts for expiring domains
- [ ] Scheduled automated checking
- [ ] Domain auction monitoring
- [ ] Price history tracking
- [ ] Competitor analysis
- [ ] Chrome extension
- [ ] Mobile app (React Native)
- [ ] Multi-user support with authentication
- [ ] Advanced AI with GPT integration
- [ ] Backlink analysis
- [ ] SEO metrics integration

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

### v2.0.0 (Latest)
- ✨ Added AI domain generator (geo + realistic)
- 📤 Added bulk file upload support
- 🔍 Added advanced filtering system
- 🌐 Added subdomain discovery & monitoring
- 💼 Enhanced portfolio with registrar tracking
- ⏰ Added expiration day filters
- 📊 Added comprehensive statistics

### v1.0.0
- ✅ Initial release
- ✅ Basic domain checking
- ✅ Simple watchlist
- ✅ Portfolio management