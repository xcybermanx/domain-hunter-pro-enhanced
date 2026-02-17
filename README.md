# 🎯 Domain Hunter Pro Enhanced - Professional Edition

[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-orange)](package.json)

A professional Node.js-based domain research platform with real-time DNS checking, JSON database storage, and interactive management dashboard.

![Domain Hunter Pro](https://via.placeholder.com/800x400/667eea/ffffff?text=Domain+Hunter+Pro+Enhanced)

## ✨ Key Features

### Backend (Node.js + Express)
- ✅ **Real DNS Resolution**: Actual domain availability checking
- ✅ **JSON Database**: Persistent storage with auto-creation
- ✅ **Smart Caching**: 24-hour cache to reduce API calls
- ✅ **RESTful API**: Clean endpoints for all operations
- ✅ **Bulk Operations**: Check multiple domains simultaneously
- ✅ **Auto-Save**: All scans automatically stored

### Frontend (Modern Interactive UI)
- ✅ **Live Dashboard**: Real-time statistics
- ✅ **Bulk Scanner**: Check multiple domains at once
- ✅ **Watchlist Manager**: Track domains automatically
- ✅ **Portfolio Tracker**: Manage investments
- ✅ **Export/Import**: Full data backup
- ✅ **Responsive Design**: Works on all devices

### Core Capabilities
- 🔍 **Domain Scanning**: DNS-based availability checking
- 📅 **Expiration Tracking**: Auto-calculate days until expiration
- 💎 **Premium Detection**: Identify valuable domains
- 📊 **Statistics Dashboard**: Track all metrics
- 💾 **Data Persistence**: JSON file storage

## 🚀 Quick Start

### Prerequisites
```bash
Node.js >= 16.0.0
npm or yarn
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/xcybermanx/domain-hunter-pro-enhanced.git
cd domain-hunter-pro-enhanced
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the server**
```bash
npm start
```

4. **Open your browser**
```
http://localhost:3000
```

That's it! The application will automatically:
- Create the `data` folder
- Initialize `domains.json` database
- Start the Express server
- Serve the frontend

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

## 📁 Project Structure

```
domain-hunter-pro-enhanced/
├── server.js              # Node.js backend server
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
├── .gitignore            # Git exclusions
├── README.md             # This file
├── public/
│   └── index.html        # Frontend application
└── data/
    └── domains.json      # JSON database (auto-created)
```

## 🔌 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Health Check
```http
GET /api/health
```
Returns server status and timestamp.

#### Check Single Domain
```http
POST /api/check-domain
Content-Type: application/json

{
  "domain": "example.com"
}
```

#### Check Multiple Domains
```http
POST /api/check-bulk
Content-Type: application/json

{
  "domains": ["example.com", "test.com", "awesome.io"]
}
```

#### Get Watchlist
```http
GET /api/watchlist
```

#### Add to Watchlist
```http
POST /api/watchlist
Content-Type: application/json

{
  "domain": "example.com"
}
```

#### Remove from Watchlist
```http
DELETE /api/watchlist/:domain
```

#### Get Portfolio
```http
GET /api/portfolio
```

#### Add to Portfolio
```http
POST /api/portfolio
Content-Type: application/json

{
  "domain": "example.com",
  "price": 100,
  "notes": "Great investment"
}
```

#### Get Statistics
```http
GET /api/stats
```

#### Export Data
```http
GET /api/export
```
Downloads complete database as JSON file.

#### Import Data
```http
POST /api/import
Content-Type: application/json

{ /* complete database object */ }
```

## 💾 Database Structure

The application uses `data/domains.json`:

```json
{
  "domains": [
    {
      "domain": "example.com",
      "available": false,
      "hasDNS": true,
      "expirationDate": "2025-12-31T00:00:00.000Z",
      "daysLeft": 365,
      "registrar": "GoDaddy",
      "nameServers": ["ns1.example.com"],
      "premium": false,
      "lastChecked": 1708176000000
    }
  ],
  "watchlist": ["example.com"],
  "portfolio": [
    {
      "id": "1708176000000",
      "domain": "mydomain.com",
      "price": 100,
      "notes": "Investment",
      "dateAdded": "2024-02-17T00:00:00.000Z"
    }
  ],
  "cache": {
    "example.com": { /* domain data */ }
  },
  "stats": {
    "totalScans": 150,
    "totalDomains": 45,
    "availableDomains": 12,
    "premiumDomains": 3
  }
}
```

## 🎨 Features In Detail

### Domain Scanner
- Enter multiple domains (one per line)
- Real-time DNS checking
- Automatic cache lookup
- Premium domain detection
- Expiration date calculation
- Results table with all details

### Watchlist
- Auto-add all scanned domains
- View status of tracked domains
- Remove unwanted domains
- Bulk refresh functionality

### Portfolio Manager
- Add purchased domains
- Track investment amounts
- Add notes for each domain
- Calculate total investment
- View purchase dates

### Statistics Dashboard
- Total scans performed
- Available domains count
- Premium domains count
- Total investment value

## ⚙️ Configuration

### Port Configuration
Change port in `server.js` or use environment variable:
```javascript
const PORT = process.env.PORT || 3000;
```

Or create `.env` file:
```
PORT=8080
```

### Cache Duration
Modify cache expiration (default 24 hours):
```javascript
if (cacheAge < 86400000) { // 24 hours in milliseconds
```

### Premium Detection Rules
Customize in `server.js`:
```javascript
function isPremiumDomain(domain) {
    const indicators = [
        domain.length <= 4,              // Short domains
        /^[a-z]{3}\.(com|net|org)$/.test(domain),  // 3-letter
        /\.(io|ai|app|tech|dev)$/.test(domain)      // Premium TLDs
    ];
    return indicators.some(i => i);
}
```

## 🚢 Deployment

### Heroku
```bash
heroku login
heroku create your-app-name
git push heroku main
```

### Vercel
```bash
npm i -g vercel
vercel
```

### DigitalOcean / AWS / VPS
```bash
# Upload files
npm install --production

# Using PM2
npm install -g pm2
pm2 start server.js --name domain-hunter
pm2 save
pm2 startup
```

### Docker (Optional)
Create `Dockerfile`:
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
docker run -p 3000:3000 domain-hunter
```

## 🔐 Security Best Practices

1. **Rate Limiting**: Add express-rate-limit
2. **Authentication**: Implement user auth for production
3. **HTTPS**: Always use SSL in production
4. **Input Validation**: Already implemented basic validation
5. **CORS**: Configure for specific domains

### Example Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use('/api/', limiter);
```

## 🔧 Advanced Usage

### Using Real WHOIS API
Replace simulated WHOIS with real API:

```javascript
// Install whois package
npm install whois-json

const whois = require('whois-json');

async function getWhoisInfo(domain) {
    const result = await whois(domain);
    return {
        expirationDate: result['Registry Expiry Date'],
        registrar: result['Registrar'],
        nameServers: result['Name Server'],
        status: result['Domain Status']
    };
}
```

### Adding Email Notifications
```bash
npm install nodemailer
```

### MongoDB Integration
```bash
npm install mongoose
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=8080 npm start
```

### Database Not Created
Ensure write permissions:
```bash
chmod 755 .
mkdir data
```

### DNS Lookup Fails
- Check internet connection
- Some domains may not resolve
- Use fallback WHOIS API for production

## 📈 Future Enhancements

- [ ] User authentication system
- [ ] MongoDB integration
- [ ] Real WHOIS API integration
- [ ] Email notifications for expiring domains
- [ ] Scheduled monitoring
- [ ] Domain valuation API
- [ ] GoDaddy/Namecheap API integration
- [ ] Mobile app version
- [ ] Advanced analytics
- [ ] Multi-user support

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**xcybermanx**
- GitHub: [@xcybermanx](https://github.com/xcybermanx)

## 🙏 Acknowledgments

- Express.js for the backend framework
- Font Awesome for beautiful icons
- Node.js community

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Read the documentation carefully

---

**⭐ Star this repository if you find it helpful!**

**Made with ❤️ for domain hunters and investors**