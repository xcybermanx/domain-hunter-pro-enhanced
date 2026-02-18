# 🌐 Domain Hunter Pro Enhanced v3.0

> **AI-Powered Domain Research Tool with Multi-User Authentication, Automated Scheduling, Webhook Notifications & SEO Analytics**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com)

## 🚀 What's New in v3.0

### 🔐 Multi-User Authentication
- **User Registration & Login** - Secure JWT-based authentication
- **Password Hashing** - bcrypt encryption for user passwords
- **User-Specific Data** - Each user has their own portfolio and sales tracking
- **Session Management** - 7-day JWT tokens with httpOnly cookies

### 📅 Automated Scheduler
- **Cron-Based Scheduling** - Set up automatic domain checks (daily, weekly, etc.)
- **Flexible Timing** - Use cron expressions like `0 9 * * *` (daily at 9 AM)
- **Batch Monitoring** - Check multiple domains in one scheduled job
- **Background Processing** - Jobs run in the background without user interaction

### 🔔 Webhook Notifications
- **Real-Time Alerts** - Get notified when domains become available or are expiring
- **Custom Endpoints** - Configure webhooks to Slack, Discord, or custom URLs
- **Event Types**:
  - `domain.available` - Domain becomes available
  - `domain.expiring` - Domain expiring soon (≤7 days)
  - `domain.registered` - New domain registered
- **Test Webhooks** - Test your webhook configuration before going live

### 📊 SEO Analytics (NEW!)
- **Domain Authority (DA)** - Check Moz Domain Authority
- **Page Authority (PA)** - Analyze page-level authority
- **Backlink Analysis** - View backlink count and referring domains
- **Competitor Analysis** - Compare multiple domains side-by-side
- **API Integration** - Supports Moz and Ahrefs APIs

### 🎯 AI Generator Updates
- **Removed Geo-Domains** - Streamlined to focus on business domains
- **Two Generation Types**:
  - **Business Names** - Brandable keyword combinations (e.g., `madridpro.io`)
  - **Mixed** - Combination of creative and industry-focused names
- **Enhanced Keyword Focus** - Smarter keyword-based domain generation

---

## ✨ Core Features

### 🤖 AI-Powered Domain Generator
- **5 LLM Providers Supported**:
  - 🏠 **Local (Ollama)** - FREE & PRIVATE (Qwen2.5, Phi3, Mistral, LLaMA 2)
  - 🤖 **OpenAI (GPT)** - GPT-3.5, GPT-4
  - 🧠 **Claude (Anthropic)** - Claude 3 Haiku, Sonnet
  - ⚡ **Perplexity API** - Sonar, Sonar Pro
  - 🚀 **Grok (xAI)** - Grok Beta
- **Smart Fallback** - Uses keyword-based generator if LLM fails
- **Customizable Length** - Set min/max domain name length
- **TLD Selection** - Choose from 12+ popular extensions (.com, .io, .ai, etc.)
- **Numbers & Hyphens** - Toggle numeric and hyphenated domains

### 🔍 Domain Scanner
- **Bulk Checking** - Check up to 100 domains at once
- **File Upload** - Import domains from .txt or .csv files
- **Multi-Method Verification**:
  - RDAP (Registry Data Access Protocol) - Fast & official
  - WHOIS API - Fallback for unsupported TLDs
  - DNS Lookup - Basic availability check
- **Detailed Results**:
  - ✅ Availability status
  - 📅 Expiration date
  - 🏢 Registrar information
  - ⏰ Days until expiration
  - 🔍 Verification method used

### 👁️ Domain Monitoring
- **Automatic Tracking** - All scanned domains automatically saved
- **Advanced Filters** - Search by keyword, availability, or registrar
- **Batch Actions** - Remove all or individual domains
- **Expiration Alerts** - See domains expiring in 7, 14, 30, 60, or 90 days
- **Real-Time Updates** - Auto-refresh every 30 seconds

### 💼 Portfolio Management (User-Specific)
- **Domain Inventory** - Track all your owned domains
- **Purchase Records** - Log buy price, registrar, and notes
- **Investment Tracking** - See total portfolio value
- **Export Ready** - View all domains in organized tables

### 💰 Profit Tracker (User-Specific)
- **Sales Recording** - Log domain sales with buy/sell prices
- **Automatic Calculations**:
  - 💵 Total Profit
  - 📈 Average Profit per Sale
  - 📊 ROI (Return on Investment)
  - 💸 Total Revenue
- **Time-Based Analytics** - Filter by week, month, or year
- **Historical Records** - View complete sales history

### ⚙️ Configuration
- **LLM Settings** - Configure AI providers and API keys
- **SEO API Keys** - Add Moz and Ahrefs credentials
- **Model Selection** - Choose specific models for each provider
- **Connection Testing** - Test LLM/SEO API connections before saving

---

## 🛠️ Installation

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org))
- **npm** (comes with Node.js)
- **(Optional) Ollama** for local LLM ([Download](https://ollama.ai))

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/xcybermanx/domain-hunter-pro-enhanced.git
cd domain-hunter-pro-enhanced

# 2. Install dependencies
npm install

# 3. Start the server
node server.js

# 4. Open your browser
# Navigate to: http://localhost:3000
```

### Environment Variables (Optional)

```bash
# Create a .env file
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

---

## 📖 Usage Guide

### 1️⃣ **Register/Login**
- First time? Click **Register** and create an account
- Already have an account? Click **Login**
- Your data is isolated per user (portfolio, sales, etc.)

### 2️⃣ **Configure LLM (Optional)**
Go to **Settings** → **LLM Configuration**

#### For Local LLM (Recommended - FREE):
```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull a model (choose one):
ollama pull qwen2.5:3b      # ⭐ Recommended - Fast & Smart
ollama pull phi3:mini        # ⚡ Ultra Fast
ollama pull mistral:7b       # 🧠 High Quality
```

Then in Settings:
- ✅ Enable Local LLM
- Select Model: `qwen2.5:3b`
- Endpoint: `http://localhost:11434/api/generate`
- Click **Test Connection**

#### For Cloud LLMs:
- **OpenAI**: Get API key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Claude**: Get API key from [console.anthropic.com](https://console.anthropic.com/)
- **Perplexity**: Get API key from [perplexity.ai](https://www.perplexity.ai/)
- **Grok**: Get API key from [x.ai](https://x.ai/)

### 3️⃣ **Generate Domains**
1. Go to **AI Generator**
2. Choose generation type:
   - **Business Names** - Brandable combinations
   - **Mixed** - Creative + industry-focused
3. Enter keywords (e.g., `tech, digital, agency`)
4. Select TLDs (.com, .io, .ai, etc.)
5. ✅ Check "Use AI/LLM" for smarter results
6. Click **Generate Domains**

### 4️⃣ **Scan Domains**
- After generation, you'll auto-switch to **Scanner**
- Or manually enter domains (one per line)
- Or upload a .txt/.csv file
- Click **Check Domains**
- View results: availability, expiration, registrar

### 5️⃣ **Monitor Domains**
- Click "Monitor" on any scanned domain
- View all in **Monitoring** page
- Filter by keyword, availability, or registrar
- Set up automated checks in **Scheduler**

### 6️⃣ **Set Up Scheduler**
Go to **Scheduler** page:
1. Create a schedule:
   - Name: "Daily Check"
   - Cron: `0 9 * * *` (daily at 9 AM)
   - Domains: Enter domains to monitor
2. Click **Create Schedule**
3. Toggle active/paused as needed

**Common Cron Patterns:**
- `0 9 * * *` - Daily at 9 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 1` - Every Monday at midnight
- `0 12 * * 1-5` - Weekdays at noon

### 7️⃣ **Configure Webhooks**
Go to **Webhooks** page:
1. Create a webhook:
   - Name: "Slack Notifications"
   - URL: Your Slack/Discord webhook URL
   - Events: Select trigger events
2. Click **Test Webhook** to verify
3. Active webhooks will send notifications automatically

**Slack Webhook Setup:**
1. Go to Slack → Settings → Incoming Webhooks
2. Create new webhook
3. Copy URL (e.g., `https://hooks.slack.com/services/...`)
4. Paste in Domain Hunter Pro

### 8️⃣ **SEO Analytics**
Go to **SEO Analytics** page:

**Single Domain:**
1. Enter domain name
2. Click **Analyze**
3. View DA, PA, backlinks, referring domains

**Competitor Analysis:**
1. Enter multiple domains (one per line)
2. Click **Analyze Competitors**
3. View comparison table

**Note:** Requires Moz or Ahrefs API keys in Settings

### 9️⃣ **Track Portfolio**
1. Go to **Portfolio** page
2. Add domains you own
3. Enter purchase price, registrar, notes
4. View total investment on Dashboard

### 🔟 **Log Sales**
1. Go to **Profit Tracker** page
2. Add a sale:
   - Domain name
   - Buy price
   - Sell price
   - Dates
3. View automatic profit, ROI calculations
4. Filter analytics by week/month/year

---

## 🏗️ Architecture

### Backend (`server.js`)
- **Express.js** - Web server
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **node-cron** - Scheduled jobs
- **axios** - HTTP requests (RDAP/WHOIS/LLM APIs)
- **multer** - File uploads
- **JSON files** - Simple database (users, domains, schedules, webhooks)

### Frontend (`public/`)
- **Vanilla JS** - No frameworks, fast & lightweight
- **CSS3** - Modern gradients, animations, responsive design
- **FontAwesome** - Icons
- **Google Fonts** - Inter typeface

### Data Storage
All data stored in `data/` folder:
- `users.json` - User accounts (hashed passwords)
- `domains.json` - Scanned domains cache
- `schedules.json` - Automated check schedules
- `webhooks.json` - Webhook configurations
- `config.json` - LLM and SEO API settings

---

## 🔒 Security Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Password Hashing** - bcrypt with salt rounds
- ✅ **httpOnly Cookies** - Prevents XSS attacks
- ✅ **Rate Limiting** - Prevents brute force attacks:
  - Auth endpoints: 5 requests / 15 minutes
  - API endpoints: 60 requests / minute
- ✅ **User Isolation** - Each user's data is separate
- ✅ **Input Validation** - Server-side validation on all inputs

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Domain Operations
- `POST /api/check-domain` - Check single domain
- `POST /api/check-domains` - Check multiple domains
- `POST /api/generate-domains` - AI domain generation
- `POST /api/upload-domains` - Upload domain list file

### Monitoring
- `GET /api/monitoring/filter` - Get monitored domains (with filters)
- `POST /api/monitoring` - Add domain to monitoring
- `DELETE /api/monitoring/:domain` - Remove specific domain
- `DELETE /api/monitoring` - Remove all domains

### Expiring Domains
- `GET /api/expiring?maxDays=30` - Get expiring domains

### Scheduler
- `GET /api/schedules` - List all schedules
- `POST /api/schedules` - Create schedule
- `PATCH /api/schedules/:id/toggle` - Toggle active/paused
- `DELETE /api/schedules/:id` - Delete schedule

### Webhooks
- `GET /api/webhooks` - List all webhooks
- `POST /api/webhooks` - Create webhook
- `POST /api/webhooks/:id/test` - Test webhook
- `DELETE /api/webhooks/:id` - Delete webhook

### SEO Analytics
- `GET /api/seo/metrics/:domain` - Get SEO metrics for domain
- `POST /api/seo/competitor-analysis` - Analyze multiple domains

### Portfolio (User-Specific)
- `GET /api/portfolio` - Get user's portfolio
- `POST /api/portfolio` - Add domain to portfolio
- `DELETE /api/portfolio/:id` - Remove from portfolio

### Sales/Profit (User-Specific)
- `GET /api/sales` - Get user's sales
- `POST /api/sales` - Add sale
- `GET /api/analytics/profit?period=month` - Get profit analytics

### Configuration
- `GET /api/config` - Get current config
- `POST /api/config` - Save config
- `POST /api/test-llm-connection` - Test LLM connection

### Statistics
- `GET /api/stats` - Dashboard statistics

---

## 🎨 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x450/6366f1/ffffff?text=Dashboard+-+Stats+%26+Analytics)

### AI Generator
![Generator](https://via.placeholder.com/800x450/10b981/ffffff?text=AI+Domain+Generator)

### Scanner Results
![Scanner](https://via.placeholder.com/800x450/8b5cf6/ffffff?text=Domain+Scanner+Results)

### Scheduler
![Scheduler](https://via.placeholder.com/800x450/f59e0b/ffffff?text=Automated+Scheduler)

---

## 🧪 Testing

### Test LLM Connection
```bash
# Using curl
curl -X POST http://localhost:3000/api/test-llm-connection \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "local",
    "endpoint": "http://localhost:11434/api/generate",
    "model": "qwen2.5:3b"
  }'
```

### Test Webhook
```bash
curl -X POST http://localhost:3000/api/webhooks/YOUR_WEBHOOK_ID/test \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 Changelog

### v3.0.0 (2026-02-18)
- ✅ **NEW:** Multi-user authentication system
- ✅ **NEW:** Automated scheduler with cron jobs
- ✅ **NEW:** Webhook notification system
- ✅ **NEW:** SEO analytics (DA, PA, backlinks)
- ✅ **NEW:** Competitor analysis
- ✅ **UPDATED:** AI Generator (removed Geo, kept Business + Mixed)
- ✅ **UPDATED:** User-specific portfolio and sales tracking
- ✅ **IMPROVED:** Security with rate limiting
- ✅ **IMPROVED:** Dashboard with profit analytics

### v2.0.0 (Previous)
- AI-powered domain generation
- Multi-LLM support (5 providers)
- Portfolio management
- Profit tracking
- RDAP/WHOIS integration

---

## 🐛 Known Issues

- SEO metrics show placeholder data (requires actual Moz/Ahrefs API integration)
- Large domain lists (>100) may timeout
- Some TLDs not supported by RDAP (fallback to WHOIS)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 👤 Author

**xcybermanx**
- GitHub: [@xcybermanx](https://github.com/xcybermanx)
- Email: jawad@live.fr

---

## 🙏 Acknowledgments

- **Ollama** - Local LLM runtime
- **OpenAI** - GPT models
- **Anthropic** - Claude models
- **Perplexity** - Sonar API
- **xAI** - Grok API
- **Moz** - Domain authority metrics
- **Ahrefs** - Backlink data
- **RDAP** - Domain registry data

---

## ⭐ Star History

If you find this project useful, please consider giving it a star on GitHub!

---

## 📧 Support

Need help? Have questions?
- 📝 [Open an Issue](https://github.com/xcybermanx/domain-hunter-pro-enhanced/issues)
- 💬 [Discussions](https://github.com/xcybermanx/domain-hunter-pro-enhanced/discussions)

---

<div align="center">

**🚀 Happy Domain Hunting! 🌐**

Made with ❤️ by [xcybermanx](https://github.com/xcybermanx)

</div>
