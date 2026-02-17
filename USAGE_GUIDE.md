# 📖 Domain Hunter Pro - Usage Guide

## Quick Start Guide

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/xcybermanx/domain-hunter-pro-enhanced.git
cd domain-hunter-pro-enhanced

# Install dependencies
npm install

# Start the server
npm start
```

### 2. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 🤖 AI Domain Generator

### How to Use

1. **Click on "AI Generator" tab**
2. **Choose generation type:**
   - **Geo Domains**: City/Country + Keyword combinations
   - **Realistic Names**: Business-ready domain names
   - **Mixed**: Combination of both

3. **Optional: Add custom keywords**
   ```
   tech, shop, market, hub, store
   ```

4. **Set number of domains** (5-100)

5. **Click "Generate Domains"**

6. Domains automatically populate in the Scanner tab

### Examples

**Geo-Domains Generated:**
- newyorktech.com
- parisshop.io
- tokyohub.app
- londonmarket.co
- dubaionline.com

**Realistic Domains Generated:**
- getmarketpro.com
- cloudtechonline.io
- bestshophub.com
- smartappcenter.com
- quickwebzone.net

### Custom Keywords Example

Input: `fitness, yoga, health`

Generated:
- getfitness.com
- yogahub.io
- healthpro.com
- myfitnesszone.com
- bestfitnessonline.com

## 🔍 Domain Scanner

### Basic Scanning

1. Go to **Scanner** tab
2. Enter domains (one per line):
   ```
   example.com
   test.io
   awesome-domain.app
   ```
3. Click **"Check Domains"**

### Subdomain Discovery

1. Enter domain(s)
2. **Check "Discover Subdomains" box**
3. Click **"Check Domains"**

The system will check:
- www.yourdomain.com
- mail.yourdomain.com
- ftp.yourdomain.com
- admin.yourdomain.com
- blog.yourdomain.com
- shop.yourdomain.com
- api.yourdomain.com
- dev.yourdomain.com
- staging.yourdomain.com
- test.yourdomain.com

### Understanding Results

| Column | Description |
|--------|-------------|
| Domain | Domain name with premium badge if applicable |
| Status | Available (green) or Taken (red) |
| Registrar | Domain registrar (GoDaddy, Namecheap, etc.) |
| Expiration | Expiration date |
| Days Left | Days until expiration |

**Status Badges:**
- 🟢 **Available**: Domain ready to register
- 🔴 **Taken**: Domain already registered
- 🟡 **PREMIUM**: High-value domain (short or premium TLD)

## 📤 Bulk File Upload

### Preparing Your File

**Supported Formats:**
- `.txt` - Plain text
- `.csv` - Comma-separated values

**Format Options:**

**Option 1: One per line**
```
example.com
test.com
awesome-domain.io
```

**Option 2: Comma-separated**
```
example.com, test.com, awesome-domain.io
```

**Option 3: Semicolon-separated**
```
example.com; test.com; awesome-domain.io
```

### Upload Process

1. Click **"Bulk Upload" tab**
2. Click upload area or drag & drop file
3. System parses domains automatically
4. Redirects to Scanner with loaded domains
5. Click "Check Domains" to scan

## 🔍 Advanced Filtering

### Filter Options

#### 1. Expiring in Days
Find domains expiring soon:
- **7 days**: Critical - renew immediately
- **30 days**: High priority
- **90 days**: Medium priority
- **180 days**: Plan ahead

#### 2. Keyword Search
Find domains containing specific words:
```
Search: "tech" → finds: mytech.com, techshop.io, gettech.net
```

#### 3. Registrar Filter
Filter by domain registrar:
```
GoDaddy, Namecheap, Google Domains, CloudFlare
```

#### 4. Availability
- **All**: Show all domains
- **Available**: Only unregistered domains
- **Taken**: Only registered domains

#### 5. Premium Filter
- **All**: All domains
- **Premium Only**: High-value domains
- **Regular**: Exclude premium

### Filter Combinations

**Example 1: Find Valuable Expiring Domains**
```
Expiring in: 30 days
Availability: (empty - show all)
Premium: Premium Only

Result: Premium domains expiring in 30 days
```

**Example 2: Find Affordable Tech Domains**
```
Keyword: tech
Premium: Regular
Availability: Available

Result: Available non-premium domains with "tech"
```

**Example 3: Monitor GoDaddy Domains**
```
Registrar: GoDaddy
Expiring in: 90 days

Result: All GoDaddy domains expiring in 90 days
```

## 🌐 Subdomain Monitor

### Viewing Discovered Subdomains

1. Click **"Subdomains" tab**
2. View all discovered subdomains
3. Filter by parent domain
4. Click **"Refresh"** to reload

### Filtering Subdomains

**By Parent Domain:**
```
Filter: example.com

Results:
- www.example.com
- mail.example.com
- api.example.com
```

### Use Cases

**1. SEO Analysis**
- Discover all subdomains of competitor
- Analyze subdomain structure
- Find hidden resources

**2. Security Audit**
- Find forgotten subdomains
- Check for exposed dev/staging environments
- Monitor for unauthorized subdomains

**3. Infrastructure Mapping**
- Map entire domain infrastructure
- Track all services and applications
- Document subdomain usage

## 💼 Portfolio Manager

### Adding Domains

1. Click **"Portfolio" tab**
2. Fill in details:
   - **Domain**: Domain name (required)
   - **Price**: Purchase price in USD (required)
   - **Registrar**: Where domain is registered
   - **Notes**: Any additional information
3. Click **"Add to Portfolio"**

### Portfolio Features

**Track:**
- Domain names
- Purchase prices
- Total investment (auto-calculated)
- Registrar information
- Purchase dates
- Custom notes

**Example Entry:**
```
Domain: awesome-tech.com
Price: $500
Registrar: GoDaddy
Notes: Purchased for tech startup project
Date: 2024-02-17
```

### Investment Tracking

The dashboard automatically calculates:
- Total number of domains
- Total investment amount
- Portfolio value

## 📊 Dashboard Statistics

### Understanding Metrics

| Metric | Description |
|--------|-------------|
| Total Scans | Number of domain checks performed |
| Available | Domains ready to register |
| Expiring (7d) | Domains expiring within 7 days |
| Premium | High-value domains identified |
| Subdomains | Total discovered subdomains |
| Investment | Total portfolio value |

### Real-time Updates

Statistics update automatically when you:
- Check new domains
- Add to portfolio
- Discover subdomains
- Apply filters

## 💾 Data Management

### Export Data

1. Use browser to navigate: `/api/export`
2. Downloads complete database as JSON
3. Includes:
   - All domains
   - Watchlist
   - Portfolio
   - Subdomains
   - Cache
   - Statistics

### Import Data

Use API endpoint:
```bash
curl -X POST http://localhost:3000/api/import \
  -H "Content-Type: application/json" \
  -d @backup.json
```

### Clear Cache

To force re-check of all domains:
```bash
curl -X DELETE http://localhost:3000/api/cache
```

## 🛠️ Tips & Best Practices

### 1. Efficient Domain Research

**Start with AI Generator:**
```
1. Generate 50 geo-domains
2. Generate 50 realistic domains
3. Bulk check all 100 domains
4. Filter by "Available" + "Premium"
5. Add best finds to portfolio
```

### 2. Monitoring Expiring Domains

**Daily Routine:**
```
1. Go to Advanced Filter
2. Set "Expiring in: 7 days"
3. Review critical domains
4. Set "Expiring in: 30 days"
5. Plan renewals
```

### 3. Portfolio Management

**Track Everything:**
```
1. Add purchase price immediately
2. Note the registrar
3. Add acquisition notes
4. Review monthly investment
5. Update valuations
```

### 4. Bulk Operations

**Optimize Workflow:**
```
1. Collect domains throughout week
2. Save to text file
3. Upload file on Friday
4. Bulk check all at once
5. Review and filter results
```

### 5. Subdomain Research

**Competitor Analysis:**
```
1. Enter competitor domain
2. Enable subdomain discovery
3. Check domain
4. Review subdomain monitor
5. Analyze their infrastructure
```

## ⚠️ Troubleshooting

### Issue: "Cannot upload file"

**Solution:**
```bash
mkdir uploads
chmod 755 uploads
```

### Issue: "Domain check fails"

**Possible causes:**
- No internet connection
- DNS server issues
- Domain doesn't exist
- Rate limiting

**Solution:**
- Check internet connection
- Try again in a few minutes
- Verify domain spelling

### Issue: "Subdomains not found"

**Explanation:**
- Not all domains have subdomains
- Some domains block subdomain enumeration
- This is normal behavior

### Issue: "Generator creates similar domains"

**Solution:**
- Add custom keywords
- Generate smaller batches
- Mix generation types
- Try different keyword combinations

## 📚 API Usage Examples

### Example: Automated Daily Check

```bash
#!/bin/bash
# daily-check.sh

curl -X POST http://localhost:3000/api/check-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "domains": [
      "mydomain1.com",
      "mydomain2.com",
      "mydomain3.com"
    ]
  }'
```

### Example: Generate and Check

```javascript
// generate-and-check.js
const axios = require('axios');

async function generateAndCheck() {
  // Generate domains
  const gen = await axios.post('http://localhost:3000/api/generate-domains', {
    type: 'geo',
    count: 20
  });
  
  // Check generated domains
  const check = await axios.post('http://localhost:3000/api/check-bulk', {
    domains: gen.data.domains
  });
  
  // Filter available domains
  const available = check.data.results.filter(d => d.available);
  console.log(`Found ${available.length} available domains`);
}

generateAndCheck();
```

## 🎯 Next Steps

1. **Start with AI Generator** - Generate your first batch
2. **Check domains** - See what's available
3. **Use filters** - Find the best opportunities
4. **Build portfolio** - Track your investments
5. **Monitor subdomains** - Deep dive into domains
6. **Export data** - Backup regularly

## 📞 Support

Need help?
- Check documentation
- Review examples
- Open GitHub issue
- Review API endpoints

---

**Happy Domain Hunting! 🎯**