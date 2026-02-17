# 🤖 LLM Setup Guide - Domain Hunter Pro

## Complete AI Integration Guide

This guide covers setting up local LLMs (Qwen2.5:3b, LLaMA, Mistral, Gemma) and cloud APIs (OpenAI, Claude, Grok) for AI-powered domain generation.

---

## 💻 Local LLM Setup (Recommended)

### Why Local LLM?

✅ **Free forever** - No API costs
✅ **Privacy** - Your data stays local
✅ **Fast** - No network latency
✅ **Offline** - Works without internet
✅ **Unlimited** - No rate limits

### Option 1: Ollama (Easiest - Recommended)

#### Step 1: Install Ollama

**Linux / macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from: https://ollama.com/download/windows

**Docker:**
```bash
docker run -d -p 11434:11434 --name ollama ollama/ollama
```

#### Step 2: Pull a Model

**Qwen2.5:3b (Recommended - Best for domain generation)**
```bash
ollama pull qwen2.5:3b
```

**Other Options:**
```bash
# LLaMA 2 7B (Meta)
ollama pull llama2:7b

# Mistral 7B (Mistral AI)
ollama pull mistral:7b

# Gemma 7B (Google)
ollama pull gemma:7b

# Phi-2 (Microsoft - Smaller, faster)
ollama pull phi

# TinyLlama (Ultra lightweight)
ollama pull tinyllama
```

#### Step 3: Start Ollama Server

```bash
# Start Ollama service
ollama serve
```

**Or run as systemd service (Linux):**
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

#### Step 4: Test the Model

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:3b",
  "prompt": "Generate 5 creative domain names for a tech startup",
  "stream": false
}'
```

#### Step 5: Configure in Domain Hunter Pro

1. Open **Settings** page
2. Select **Local (Ollama)** provider
3. Enable Local LLM
4. Select model: `qwen2.5:3b`
5. Endpoint: `http://localhost:11434/api/generate`
6. Click **Save Configuration**

---

### Option 2: LM Studio (GUI Alternative)

#### Step 1: Install LM Studio

Download from: https://lmstudio.ai/

#### Step 2: Download Model

1. Open LM Studio
2. Go to **Search** tab
3. Search for "Qwen2.5 3B"
4. Click **Download**

#### Step 3: Start Local Server

1. Go to **Local Server** tab
2. Select downloaded model
3. Click **Start Server**
4. Note the endpoint (usually `http://localhost:1234/v1`)

#### Step 4: Configure

- Provider: Local
- Endpoint: `http://localhost:1234/v1/chat/completions`

---

### Option 3: Text Generation WebUI

#### Step 1: Install

```bash
git clone https://github.com/oobabooga/text-generation-webui
cd text-generation-webui
./start_linux.sh  # or start_windows.bat, start_macos.sh
```

#### Step 2: Download Model

1. Open http://localhost:7860
2. Go to **Model** tab
3. Download "Qwen/Qwen2.5-3B-Instruct-GGUF"

#### Step 3: Enable API

1. Go to **Session** tab
2. Enable **API** extension
3. Restart server

#### Step 4: Configure

- Endpoint: `http://localhost:7860/v1/chat/completions`

---

## ☁️ Cloud API Setup

### Option 4: OpenAI (GPT)

#### Features
- Most powerful
- Excellent creativity
- Fast responses
- Pay per use

#### Setup

1. Sign up at: https://platform.openai.com/
2. Go to **API Keys**: https://platform.openai.com/api-keys
3. Click **Create new secret key**
4. Copy key (starts with `sk-`)

#### Configure in App

1. Settings → Provider: **OpenAI**
2. Enable OpenAI
3. API Key: `sk-...`
4. Model: `gpt-3.5-turbo` (cheap) or `gpt-4` (better)
5. Save

#### Pricing

- GPT-3.5-Turbo: $0.0010 / 1K tokens
- GPT-4: $0.03 / 1K tokens

---

### Option 5: Claude (Anthropic)

#### Features
- Very creative
- Long context
- Safe outputs

#### Setup

1. Sign up at: https://console.anthropic.com/
2. Go to **API Keys**
3. Create new key
4. Copy key (starts with `sk-ant-`)

#### Configure

1. Provider: **Claude**
2. Enable Claude
3. API Key: `sk-ant-...`
4. Model: `claude-3-haiku` (fast) or `claude-3-sonnet` (better)
5. Save

#### Pricing

- Haiku: $0.25 / 1M tokens
- Sonnet: $3 / 1M tokens

---

### Option 6: Grok (xAI)

#### Features
- Latest from Elon Musk's xAI
- Real-time data access
- Humorous responses

#### Setup

1. Sign up at: https://x.ai/
2. Get API access
3. Copy API key

#### Configure

1. Provider: **Grok**
2. Enable Grok
3. API Key: `xai-...`
4. Save

---

## 📊 Model Comparison

| Model | Size | Speed | Quality | Cost | Privacy |
|-------|------|-------|---------|------|----------|
| **Qwen2.5:3b** | 3B | ⚡⚡⚡ Fast | ⭐⭐⭐⭐ Good | 🆓 Free | 🔒 Local |
| **LLaMA 2 7B** | 7B | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ Great | 🆓 Free | 🔒 Local |
| **Mistral 7B** | 7B | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ Great | 🆓 Free | 🔒 Local |
| **Phi-2** | 2.7B | ⚡⚡⚡ Fast | ⭐⭐⭐ Good | 🆓 Free | 🔒 Local |
| **TinyLlama** | 1.1B | ⚡⚡⚡ Fast | ⭐⭐ OK | 🆓 Free | 🔒 Local |
| **GPT-3.5** | ? | ⚡⚡⚡ Fast | ⭐⭐⭐⭐ Good | 💰 Paid | ☁️ Cloud |
| **GPT-4** | ? | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ Excellent | 💰💰 Expensive | ☁️ Cloud |
| **Claude 3** | ? | ⚡⚡ Medium | ⭐⭐⭐⭐⭐ Excellent | 💰 Paid | ☁️ Cloud |

---

## 🔧 Advanced Configuration

### Custom Ollama Endpoint

If running Ollama on different port/host:

```bash
# Start on custom port
OLLAMA_HOST=0.0.0.0:8080 ollama serve
```

Configure endpoint:
```
http://localhost:8080/api/generate
```

### Multiple Models

Run multiple models simultaneously:

```bash
# Terminal 1
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# Terminal 2
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

### GPU Acceleration

Ollama automatically uses GPU if available:

**Check GPU usage:**
```bash
# NVIDIA
nvidia-smi

# AMD
radeontop

# Intel
intel_gpu_top
```

### Performance Tuning

**Increase context length:**
```bash
ollama run qwen2.5:3b --ctx-size 4096
```

**Set number of threads:**
```bash
ollama run qwen2.5:3b --threads 8
```

---

## 🐛 Troubleshooting

### Issue: "Connection refused"

**Solution:**
```bash
# Check if Ollama is running
ps aux | grep ollama

# Check port
netstat -tulpn | grep 11434

# Restart Ollama
killall ollama
ollama serve
```

### Issue: "Model not found"

**Solution:**
```bash
# List installed models
ollama list

# Pull model again
ollama pull qwen2.5:3b
```

### Issue: "Out of memory"

**Solution:**
- Use smaller model (phi, tinyllama)
- Close other applications
- Reduce context size
- Add more RAM/swap

### Issue: "Slow responses"

**Solution:**
- Use smaller model
- Enable GPU acceleration
- Increase thread count
- Use SSD storage

---

## 💻 Python Integration Example

For developers wanting to integrate directly:

```python
import requests
import json

def generate_domains(prompt, count=10):
    """
    Generate domains using Qwen2.5:3b
    """
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "qwen2.5:3b",
            "prompt": f"Generate {count} creative domain names for: {prompt}. List only domain names.",
            "stream": False,
            "temperature": 0.8,
            "top_p": 0.9
        }
    )
    
    result = response.json()
    domains = result["response"].strip().split("\n")
    return [d.strip() for d in domains if "." in d]

# Example usage
domains = generate_domains("tech startup AI", count=10)
for domain in domains:
    print(domain)
```

### FastAPI Integration

```python
from fastapi import FastAPI
from pydantic import BaseModel
import requests

app = FastAPI()

class DomainRequest(BaseModel):
    keywords: list[str]
    count: int = 10

@app.post("/generate")
def generate(req: DomainRequest):
    prompt = f"Generate {req.count} domain names for: {', '.join(req.keywords)}"
    
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": "qwen2.5:3b",
            "prompt": prompt,
            "stream": False
        }
    )
    
    return response.json()

# Run with: uvicorn main:app --reload
```

---

## 💡 Best Practices

### For Domain Generation

1. **Use specific prompts:**
   ```
   ❌ Bad: "Generate domains"
   ✅ Good: "Generate 10 short .com domains for tech startups focused on AI"
   ```

2. **Set temperature:**
   - Low (0.3-0.5): More focused, predictable
   - High (0.8-1.0): More creative, diverse

3. **Batch requests:**
   - Generate 20-50 domains at once
   - Filter duplicates
   - Check availability

### For Cost Optimization

1. **Use local LLM** for bulk generation
2. **Use cloud APIs** for high-quality, specific requests
3. **Cache results** to avoid repeated API calls
4. **Set rate limits** on cloud APIs

### For Quality Results

1. **Provide context:**
   - Industry/niche
   - Target audience
   - Desired keywords
   
2. **Test multiple models:**
   - Try different models
   - Compare results
   - Pick best performer

3. **Iterate prompts:**
   - Refine based on output
   - Add constraints
   - Use examples

---

## 📖 Resources

### Official Documentation
- Ollama: https://ollama.com/docs
- LM Studio: https://lmstudio.ai/docs
- OpenAI: https://platform.openai.com/docs
- Anthropic: https://docs.anthropic.com

### Model Cards
- Qwen2.5: https://huggingface.co/Qwen/Qwen2.5-3B-Instruct
- LLaMA 2: https://huggingface.co/meta-llama/Llama-2-7b
- Mistral: https://huggingface.co/mistralai/Mistral-7B-v0.1
- Gemma: https://huggingface.co/google/gemma-7b

### Community
- Ollama Discord: https://discord.gg/ollama
- r/LocalLLaMA: https://reddit.com/r/LocalLLaMA
- Hugging Face: https://huggingface.co/spaces

---

## ❓ FAQ

### Q: Which model should I use?
**A:** Start with **Qwen2.5:3b** - best balance of speed, quality, and size.

### Q: Do I need a GPU?
**A:** No, but it helps. CPU works fine for 3B-7B models.

### Q: How much RAM do I need?
**A:** 
- 3B models: 4-8 GB RAM
- 7B models: 8-16 GB RAM
- 13B+ models: 16+ GB RAM

### Q: Can I use multiple providers?
**A:** Yes! Switch between local and cloud as needed.

### Q: Is my data private with local LLM?
**A:** Yes! Everything stays on your computer.

### Q: Which is faster, local or cloud?
**A:** Local LLM is faster (no network latency), but cloud APIs have more powerful hardware.

---

## 🚀 Next Steps

1. ✅ Install Ollama
2. ✅ Pull Qwen2.5:3b model
3. ✅ Configure in Domain Hunter Pro
4. ✅ Generate your first domains!
5. ✅ Experiment with different prompts
6. ✅ Compare with cloud APIs
7. ✅ Find your perfect setup

---

**Need help?** Open an issue on GitHub: https://github.com/xcybermanx/domain-hunter-pro-enhanced/issues

**Happy domain hunting with AI! 🎯🤖**