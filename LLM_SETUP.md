# 🤖 LLM Setup Guide for Domain Hunter Pro

## Overview

Domain Hunter Pro supports multiple LLM providers for AI-powered domain generation:

- **Local LLMs** (Ollama: LLaMA, Mistral, Qwen, Gemma, etc.)
- **OpenAI** (GPT-3.5, GPT-4)
- **Claude** (Claude 3 Sonnet/Opus)
- **Grok** (xAI)
- **Custom APIs**

---

## 🏠 Local LLM Setup (Ollama)

### Prerequisites
- 8GB+ RAM (16GB+ recommended)
- GPU (optional, but recommended)
- 10GB+ free disk space

### 1. Install Ollama

**Linux & macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com/download](https://ollama.com/download)

**Verify Installation:**
```bash
ollama --version
```

### 2. Download Models

#### Recommended Models:

**Small & Fast (4GB RAM):**
```bash
# Gemma 2B - Google's tiny model
ollama pull gemma:2b

# TinyLlama 1.1B - Ultra-fast
ollama pull tinyllama

# Phi-2 2.7B - Microsoft's efficient model
ollama pull phi
```

**Medium (8GB RAM):**
```bash
# Mistral 7B - Excellent balance
ollama pull mistral:7b

# LLaMA 2 7B - Meta's model
ollama pull llama2:7b

# Qwen 7B - Alibaba's multilingual model
ollama pull qwen:7b

# Gemma 7B - Google's optimized model
ollama pull gemma:7b
```

**Large (16GB+ RAM):**
```bash
# Mixtral 8x7B - Mixture of experts
ollama pull mixtral:8x7b

# LLaMA 2 13B
ollama pull llama2:13b

# CodeLlama 13B - For tech domains
ollama pull codellama:13b
```

### 3. Test Your Model

```bash
# Interactive chat
ollama run qwen:7b

# Single prompt
ollama run qwen:7b "Generate 5 creative domain names for a tech startup"
```

### 4. Start Ollama Server

```bash
# Runs on http://localhost:11434
ollama serve
```

### 5. Configure in Domain Hunter Pro

**Method 1: Via Web Interface**
1. Open Domain Hunter Pro
2. Go to **Settings** tab
3. Select **LLM Configuration**
4. Choose **Local (Ollama)**
5. Set endpoint: `http://localhost:11434/api/generate`
6. Select your model (e.g., `qwen:7b`)
7. Click **Save**

**Method 2: Edit Config File**
```bash
nano data/config.json
```

```json
{
  "llm": {
    "provider": "local",
    "local": {
      "enabled": true,
      "model": "qwen:7b",
      "endpoint": "http://localhost:11434/api/generate"
    }
  }
}
```

### 6. Test AI Generation

```bash
curl -X POST http://localhost:3000/api/generate-domains \
  -H "Content-Type: application/json" \
  -d '{
    "type": "realistic",
    "keywords": ["tech", "ai"],
    "count": 10,
    "useLLM": true
  }'
```

---

## 🌐 OpenAI Setup (GPT)

### 1. Get API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Create new secret key
5. Copy the key (starts with `sk-`)

### 2. Configure Domain Hunter Pro

**Via Web Interface:**
1. Go to **Settings** → **LLM Configuration**
2. Select **OpenAI**
3. Enter API Key
4. Choose model:
   - `gpt-3.5-turbo` (Fast & Cheap)
   - `gpt-4` (Most capable)
   - `gpt-4-turbo` (Balanced)
5. Save

**Via Config File:**
```json
{
  "llm": {
    "provider": "openai",
    "openai": {
      "enabled": true,
      "apiKey": "sk-your-key-here",
      "model": "gpt-3.5-turbo"
    }
  }
}
```

### 3. Pricing (as of 2024)

| Model | Input | Output | Best For |
|-------|--------|---------|----------|
| GPT-3.5 Turbo | $0.50/1M | $1.50/1M | High volume |
| GPT-4 Turbo | $10/1M | $30/1M | Quality |
| GPT-4 | $30/1M | $60/1M | Complex tasks |

---

## 🎭 Claude Setup (Anthropic)

### 1. Get API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create account
3. Go to **API Keys**
4. Generate new key
5. Copy key

### 2. Configure

```json
{
  "llm": {
    "provider": "claude",
    "claude": {
      "enabled": true,
      "apiKey": "sk-ant-your-key-here",
      "model": "claude-3-sonnet-20240229"
    }
  }
}
```

### 3. Models

- `claude-3-opus` - Most capable
- `claude-3-sonnet` - Balanced (recommended)
- `claude-3-haiku` - Fast & affordable

---

## 🚀 Grok Setup (xAI)

### 1. Get API Key

1. Go to [x.ai/api](https://x.ai/api)
2. Sign up for API access
3. Generate API key

### 2. Configure

```json
{
  "llm": {
    "provider": "grok",
    "grok": {
      "enabled": true,
      "apiKey": "your-grok-key",
      "model": "grok-1"
    }
  }
}
```

---

## 🐍 Python Integration Examples

### Ollama (Local)

```python
import requests

def ask_ollama(prompt, model="qwen:7b"):
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False
        }
    )
    return response.json()["response"]

# Generate domain names
prompt = "Generate 10 creative domain names for a tech startup focused on AI"
result = ask_ollama(prompt)
print(result)
```

### OpenAI

```python
import openai

openai.api_key = "sk-your-key"

def generate_domains_openai(keywords):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", 
             "content": f"Generate 10 domain names for: {', '.join(keywords)}"}
        ]
    )
    return response.choices[0].message.content

domains = generate_domains_openai(["tech", "ai", "startup"])
print(domains)
```

### Claude

```python
import anthropic

client = anthropic.Anthropic(api_key="sk-ant-your-key")

def generate_domains_claude(keywords):
    message = client.messages.create(
        model="claude-3-sonnet-20240229",
        max_tokens=1024,
        messages=[
            {"role": "user", 
             "content": f"Generate 10 domain names for: {', '.join(keywords)}"}
        ]
    )
    return message.content[0].text

domains = generate_domains_claude(["health", "fitness"])
print(domains)
```

---

## 🔧 Advanced Ollama Configuration

### Custom Model Parameters

```bash
# Create custom model with specific parameters
ollama create mydomain-generator -f Modelfile
```

**Modelfile:**
```
FROM qwen:7b

PARAMETER temperature 0.9
PARAMETER top_p 0.9
PARAMETER top_k 50

SYSTEM """
You are a creative domain name generator. Generate only domain names,
one per line, without explanations. Focus on:
- Short, memorable names
- Easy to spell
- Brandable
- Available TLDs (.com, .io, .ai, .app)
"""
```

### GPU Acceleration

**NVIDIA GPU (CUDA):**
```bash
# Install CUDA toolkit
sudo apt install nvidia-cuda-toolkit

# Ollama automatically uses GPU if available
ollama run qwen:7b
```

**AMD GPU (ROCm):**
```bash
export HSA_OVERRIDE_GFX_VERSION=10.3.0
ollama serve
```

**Apple Silicon (Metal):**
```bash
# Automatically enabled on M1/M2/M3 Macs
ollama run qwen:7b
```

### Performance Tuning

```bash
# Increase context window
ollama run qwen:7b --ctx-size 4096

# Adjust threads
ollama run qwen:7b --threads 8

# Enable GPU layers
ollama run qwen:7b --gpu-layers 35
```

---

## 📊 Model Comparison

### Local Models (Ollama)

| Model | Size | Speed | Quality | RAM | Best For |
|-------|------|-------|---------|-----|----------|
| TinyLlama | 1.1B | ⚡⚡⚡⚡⚡ | ⭐⭐ | 4GB | Quick tests |
| Gemma 2B | 2B | ⚡⚡⚡⚡ | ⭐⭐⭐ | 4GB | Budget |
| Phi-2 | 2.7B | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | 4GB | Efficient |
| Mistral 7B | 7B | ⚡⚡⚡ | ⭐⭐⭐⭐ | 8GB | **Recommended** |
| Qwen 7B | 7B | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | 8GB | Multilingual |
| LLaMA 2 7B | 7B | ⚡⚡⚡ | ⭐⭐⭐⭐ | 8GB | General |
| Mixtral 8x7B | 47B | ⚡⚡ | ⭐⭐⭐⭐⭐ | 16GB | High quality |

### Cloud Models

| Provider | Model | Speed | Quality | Cost | Best For |
|----------|-------|-------|---------|------|----------|
| OpenAI | GPT-3.5 | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | $ | High volume |
| OpenAI | GPT-4 | ⚡⚡ | ⭐⭐⭐⭐⭐ | $$$ | Quality |
| Claude | Haiku | ⚡⚡⚡⚡ | ⭐⭐⭐ | $ | Fast |
| Claude | Sonnet | ⚡⚡⚡ | ⭐⭐⭐⭐ | $$ | **Recommended** |
| Claude | Opus | ⚡⚡ | ⭐⭐⭐⭐⭐ | $$$ | Complex |

---

## 🎯 Prompt Engineering for Domains

### Basic Prompt
```
Generate 10 creative domain names for a tech startup
```

### Advanced Prompt
```
You are a domain name expert. Generate 10 highly brandable domain names for:

Industry: Technology / AI
Keywords: smart, tech, ai, cloud
Requirements:
- 5-10 characters
- Easy to spell
- Memorable
- Available .com or .io
- No hyphens or numbers

Return only domain names, one per line.
```

### Geo-Domain Prompt
```
Generate 10 geo-location based domain names combining:
- Major cities (New York, Tokyo, Paris, Dubai)
- Business keywords (tech, market, shop, hub)
- Premium TLDs (.com, .io, .app)

Format: cityname + keyword + tld
Example: newyorktech.com
```

### Premium Domain Prompt
```
Generate 10 premium, short domain names:
- 3-5 characters only
- Real words or brandable combinations
- Focus on .com, .ai, .io
- Must sound professional
```

---

## 🚨 Troubleshooting

### Ollama Issues

**Problem: "Connection refused"**
```bash
# Start Ollama server
ollama serve

# Check if running
curl http://localhost:11434/api/tags
```

**Problem: "Model not found"**
```bash
# List installed models
ollama list

# Pull missing model
ollama pull qwen:7b
```

**Problem: "Out of memory"**
```bash
# Use smaller model
ollama pull gemma:2b

# Or reduce context
ollama run qwen:7b --ctx-size 2048
```

### OpenAI Issues

**Problem: "Invalid API key"**
- Verify key starts with `sk-`
- Check key hasn't expired
- Ensure billing is set up

**Problem: "Rate limit exceeded"**
- Reduce frequency of requests
- Upgrade plan
- Use caching

### Claude Issues

**Problem: "Authentication failed"**
- Verify API key format
- Check account status
- Ensure API access is enabled

---

## 💡 Best Practices

### 1. Choose Right Model

**High Volume (1000+ requests/day):**
- Use local Ollama models
- Save costs
- Fast response

**Quality First:**
- GPT-4 or Claude Opus
- Better creativity
- More accurate

**Balanced:**
- Mistral 7B (local)
- GPT-3.5 Turbo (cloud)
- Claude Sonnet (cloud)

### 2. Optimize Prompts

```javascript
// Bad
"generate domains"

// Good
"Generate 10 short, brandable .com domain names for a fintech startup"

// Best
"You are a domain expert. Generate 10 domain names for:
Industry: Fintech
Target: Small businesses
Style: Professional, trustworthy
Length: 6-10 characters
TLD: .com only
Return format: domain.com (one per line)"
```

### 3. Cache Results

- Domain Hunter Pro automatically caches LLM responses
- Reduces API costs
- Faster repeated requests

### 4. Monitor Usage

**OpenAI:**
```bash
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Local:**
```bash
# Monitor GPU usage
nvidia-smi

# Monitor RAM
htop
```

---

## 🔄 Switching Between Providers

### Quick Switch via API

```bash
# Switch to local
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"llm": {"provider": "local"}}'

# Switch to OpenAI
curl -X POST http://localhost:3000/api/config \
  -H "Content-Type: application/json" \
  -d '{"llm": {"provider": "openai"}}'
```

### Fallback Configuration

```json
{
  "llm": {
    "provider": "local",
    "fallback": "openai",
    "local": {
      "enabled": true,
      "model": "qwen:7b",
      "timeout": 30000
    },
    "openai": {
      "enabled": true,
      "apiKey": "sk-...",
      "model": "gpt-3.5-turbo"
    }
  }
}
```

---

## 📚 Additional Resources

### Documentation
- [Ollama Docs](https://github.com/ollama/ollama)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Claude API Docs](https://docs.anthropic.com)

### Model Cards
- [Mistral AI](https://mistral.ai/technology/)
- [LLaMA 2](https://ai.meta.com/llama/)
- [Qwen](https://github.com/QwenLM/Qwen)
- [Gemma](https://ai.google.dev/gemma)

### Communities
- [Ollama Discord](https://discord.gg/ollama)
- [r/LocalLLaMA](https://reddit.com/r/LocalLLaMA)
- [OpenAI Community](https://community.openai.com)

---

## 🎓 Quick Start Examples

### Example 1: Local Setup (5 minutes)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Download fast model
ollama pull mistral:7b

# Start server
ollama serve &

# Configure Domain Hunter Pro
echo '{
  "llm": {
    "provider": "local",
    "local": {
      "enabled": true,
      "model": "mistral:7b",
      "endpoint": "http://localhost:11434/api/generate"
    }
  }
}' > data/config.json

# Start app
npm start
```

### Example 2: OpenAI Setup (2 minutes)

```bash
# Get API key from platform.openai.com

# Configure
echo '{
  "llm": {
    "provider": "openai",
    "openai": {
      "enabled": true,
      "apiKey": "sk-your-key-here",
      "model": "gpt-3.5-turbo"
    }
  }
}' > data/config.json

# Start app
npm start
```

---

**Ready to generate AI-powered domain names! 🚀**