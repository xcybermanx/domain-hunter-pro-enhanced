from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import uvicorn
from typing import Optional, List
import json

app = FastAPI(title="Domain Hunter LLM Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DomainGenerationRequest(BaseModel):
    keywords: List[str]
    count: int = 20
    model: str = "qwen2.5:3b"
    temperature: float = 0.7

class ChatRequest(BaseModel):
    prompt: str
    model: str = "qwen2.5:3b"
    temperature: float = 0.7
    stream: bool = False

class OllamaConfig:
    """Configuration for Ollama API"""
    BASE_URL = "http://localhost:11434"
    AVAILABLE_MODELS = [
        "qwen2.5:3b",
        "qwen:7b",
        "llama3.2:3b",
        "llama3.1:8b",
        "mistral:7b",
        "gemma:2b",
        "phi3:mini",
        "tinyllama:1.1b"
    ]

def ask_ollama(prompt: str, model: str = "qwen2.5:3b", temperature: float = 0.7) -> str:
    """Send request to Ollama API"""
    try:
        response = requests.post(
            f"{OllamaConfig.BASE_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature
                }
            },
            timeout=60
        )
        
        if response.status_code == 200:
            return response.json()["response"]
        else:
            raise HTTPException(status_code=response.status_code, detail="Ollama API error")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

def generate_domains_with_llm(keywords: List[str], count: int, model: str, temperature: float) -> List[str]:
    """Generate domain names using LLM"""
    keyword_str = ", ".join(keywords)
    
    prompt = f"""Generate {count} creative and brandable domain name suggestions based on these keywords: {keyword_str}

Rules:
1. Each domain should be short (5-15 characters)
2. Easy to remember and pronounce
3. Use popular TLDs (.com, .io, .ai, .app, .tech, .net)
4. Mix keywords creatively
5. Include prefixes like 'get', 'my', 'the', 'best' when appropriate
6. Make them business-ready
7. Return ONLY domain names, one per line
8. No explanations or numbering

Examples:
getshop.com
mytech.io
bestweb.app
smarthub.ai

Now generate {count} unique domain names:"""

    response = ask_ollama(prompt, model, temperature)
    
    # Parse response to extract domain names
    lines = response.strip().split('\n')
    domains = []
    
    for line in lines:
        line = line.strip()
        # Remove numbering, bullets, or extra text
        line = line.lstrip('0123456789.-) ')
        # Check if it looks like a domain
        if '.' in line and len(line) < 50:
            # Extract just the domain name
            parts = line.split()
            for part in parts:
                if '.' in part:
                    domain = part.strip('.,;:()[]{}"\'')
                    if domain and not domain.startswith('http'):
                        domains.append(domain.lower())
                    break
    
    # Return unique domains up to count
    return list(dict.fromkeys(domains))[:count]

@app.get("/")
async def root():
    return {
        "service": "Domain Hunter LLM Service",
        "version": "1.0.0",
        "status": "running",
        "available_models": OllamaConfig.AVAILABLE_MODELS
    }

@app.get("/health")
async def health_check():
    """Check if Ollama is running"""
    try:
        response = requests.get(f"{OllamaConfig.BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            installed_models = [model["name"] for model in response.json().get("models", [])]
            return {
                "status": "healthy",
                "ollama_running": True,
                "installed_models": installed_models
            }
    except:
        return {
            "status": "unhealthy",
            "ollama_running": False,
            "message": "Ollama is not running. Start it with: ollama serve"
        }

@app.get("/models")
async def list_models():
    """List available models"""
    try:
        response = requests.get(f"{OllamaConfig.BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            return {
                "installed_models": [m["name"] for m in models],
                "recommended_models": OllamaConfig.AVAILABLE_MODELS
            }
    except:
        return {
            "error": "Cannot connect to Ollama",
            "recommended_models": OllamaConfig.AVAILABLE_MODELS
        }

@app.post("/generate-domains")
async def generate_domains(request: DomainGenerationRequest):
    """Generate domain names using AI"""
    try:
        domains = generate_domains_with_llm(
            keywords=request.keywords,
            count=request.count,
            model=request.model,
            temperature=request.temperature
        )
        
        return {
            "success": True,
            "domains": domains,
            "count": len(domains),
            "model_used": request.model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    """General chat endpoint for AI assistance"""
    try:
        response = ask_ollama(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature
        )
        
        return {
            "success": True,
            "response": response,
            "model_used": request.model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-domain")
async def analyze_domain(domain: str, model: str = "qwen2.5:3b"):
    """Analyze domain quality and potential"""
    prompt = f"""Analyze this domain name: {domain}

Provide a brief analysis covering:
1. Brandability (1-10)
2. Memorability (1-10)
3. SEO Potential (1-10)
4. Estimated Value Range
5. Best Use Cases
6. Pros and Cons

Keep it concise and professional."""

    try:
        response = ask_ollama(prompt, model)
        return {
            "success": True,
            "domain": domain,
            "analysis": response,
            "model_used": model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/suggest-price")
async def suggest_price(domain: str, model: str = "qwen2.5:3b"):
    """Suggest pricing for a domain"""
    prompt = f"""As a domain pricing expert, suggest a fair market price for: {domain}

Consider:
- Domain length
- TLD quality
- Keywords
- Brandability
- Market trends

Provide:
1. Minimum price
2. Fair market price
3. Premium price
4. Brief justification

Be realistic and concise."""

    try:
        response = ask_ollama(prompt, model)
        return {
            "success": True,
            "domain": domain,
            "pricing_suggestion": response,
            "model_used": model
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("""\n🚀 Domain Hunter LLM Service Starting...\n
📋 Setup Instructions:
1. Install Ollama: https://ollama.ai
2. Pull a model: ollama pull qwen2.5:3b
3. Start Ollama: ollama serve
4. This service will connect automatically

🤖 Recommended Models:
   - qwen2.5:3b (Fast, efficient, great for domains)
   - llama3.2:3b (Balanced performance)
   - mistral:7b (High quality responses)
   - gemma:2b (Very fast, lightweight)

🌐 Service will run on: http://localhost:8001\n""")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)