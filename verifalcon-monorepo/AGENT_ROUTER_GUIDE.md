# Agent Router Integration Guide

## What is Agent Router?

**Agent Router** is a unified API gateway that provides access to multiple AI models through a single endpoint. Instead of managing separate API keys for OpenAI, Anthropic, Google, etc., you can use one Agent Router API key to access all of them.

### Benefits
- ✅ **Single API Key**: Access multiple AI providers with one key
- ✅ **Cost Optimization**: Automatically route to cheapest available model
- ✅ **Fallback Support**: If one provider is down, automatically use another
- ✅ **Rate Limit Management**: Built-in rate limiting across providers
- ✅ **Analytics Dashboard**: Track usage and costs across all models

---

## VeriFalcon Integration

Your ChatAndBuild (BAP-578) module now supports **Agent Router** as an alternative to OpenAI!

### Configuration

Add to `frontend/.env.local`:

```env
# Option 1: Agent Router (Recommended)
AGENT_ROUTER_API_KEY=your-agent-router-api-key
AGENT_ROUTER_ENDPOINT=https://api.agentrouter.ai/v1/chat/completions

# Option 2: OpenAI Direct (Alternative)
# OPENAI_API_KEY=sk-proj-your-openai-key

# Note: If both are set, Agent Router takes priority
```

### How It Works

The system automatically detects which API to use:

```typescript
// Priority order:
1. AGENT_ROUTER_API_KEY → Use Agent Router
2. OPENAI_API_KEY → Use OpenAI directly
3. Neither → Use fallback mode (basic analysis)
```

### API Endpoints

**Agent Router Endpoint**:
```
https://api.agentrouter.ai/v1/chat/completions
```

**OpenAI Endpoint** (default):
```
https://api.openai.com/v1/chat/completions
```

---

## Setup Steps

### 1. Get Agent Router API Key

```bash
# Visit your Agent Router dashboard
# Copy your API key (format varies by provider)
```

### 2. Configure Environment

```bash
cd frontend

# Edit .env.local
nano .env.local

# Add these lines:
AGENT_ROUTER_API_KEY=your-key-here
AGENT_ROUTER_ENDPOINT=https://api.agentrouter.ai/v1/chat/completions
```

### 3. Test the Integration

```bash
npm run dev

# Upload an image to test
# Check console logs for: "[ChatAndBuild] Using Agent Router - Non-Fungible Agent starting..."
```

---

## Supported Models

Agent Router typically supports:

- **OpenAI**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google**: Gemini Pro, Gemini Pro Vision
- **Others**: Depends on your Agent Router configuration

### Model Selection

You can specify which model to use in the API call:

```typescript
// In route.ts, modify the model field:
body: JSON.stringify({
  model: 'gpt-4o',  // or 'claude-3-opus', 'gemini-pro-vision', etc.
  messages: [...],
  // ...
})
```

---

## Advantages for VeriFalcon

### 1. **Cost Optimization**
Agent Router can automatically route to the most cost-effective model:
- OpenAI GPT-4o: ~$0.01 per image
- Claude 3 Haiku: ~$0.004 per image
- Gemini Pro Vision: ~$0.002 per image

### 2. **Higher Availability**
If OpenAI is down, Agent Router fails over to Anthropic or Google automatically.

### 3. **Better Rate Limits**
Distribute requests across multiple providers to avoid hitting rate limits.

### 4. **Unified Billing**
Single invoice for all AI usage across providers.

---

## Comparison: Agent Router vs OpenAI Direct

| Feature | Agent Router | OpenAI Direct |
|---------|--------------|---------------|
| **Setup** | One API key | One API key |
| **Models** | Multiple providers | OpenAI only |
| **Cost** | Often cheaper | Standard pricing |
| **Reliability** | Auto-failover | Single provider |
| **Rate Limits** | Distributed | OpenAI limits |
| **Analytics** | Unified dashboard | OpenAI dashboard |
| **Latency** | +10-50ms overhead | Direct connection |

---

## Example API Call

### With Agent Router

```bash
curl https://api.agentrouter.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT_ROUTER_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "Analyze this luxury item"},
          {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
        ]
      }
    ]
  }'
```

### With OpenAI Direct

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [...]
  }'
```

**Response format is identical** - both return OpenAI-compatible JSON!

---

## Troubleshooting

### Error: "Agent Router API failed: 401"
❌ **Problem**: Invalid API key  
✅ **Solution**: Check your Agent Router API key in dashboard

### Error: "Agent Router API failed: 429"
❌ **Problem**: Rate limit exceeded  
✅ **Solution**: Wait or upgrade your Agent Router plan

### Agent Router not being used
❌ **Problem**: Environment variable not loaded  
✅ **Solution**: 
```bash
# Restart dev server after changing .env.local
npm run dev

# Check if variable is set
console.log(process.env.AGENT_ROUTER_API_KEY ? "Set" : "Not set")
```

### Slow responses
❌ **Problem**: Agent Router adds routing overhead  
✅ **Solution**: This is normal (~10-50ms). For critical speed, use OpenAI direct

---

## Cost Comparison Example

**1000 luxury item analyses:**

| Provider | Cost per Image | Total Cost |
|----------|---------------|------------|
| **Agent Router** (auto-optimized) | $0.004 | **$4.00** |
| OpenAI GPT-4o (direct) | $0.01 | $10.00 |
| OpenAI GPT-4 Turbo (direct) | $0.015 | $15.00 |

*Agent Router can save ~60% by intelligently routing to cheaper models!*

---

## Advanced Configuration

### Custom Model Routing

```typescript
// In route.ts, add model selection logic:
const model = agentReputation > 150 ? 'gpt-4o' : 'claude-3-haiku';

body: JSON.stringify({
  model: model,  // Higher reputation agents use better models
  messages: [...],
})
```

### Fallback Chain

```typescript
// Try Agent Router → OpenAI → Fallback
const apiKey = process.env.AGENT_ROUTER_API_KEY;
const fallbackKey = process.env.OPENAI_API_KEY;

if (!apiKey && !fallbackKey) {
  return fallbackAgentAnalysis();
}

try {
  return await analyzeWithAPI(apiKey || fallbackKey);
} catch (error) {
  if (apiKey && fallbackKey) {
    console.log('Retrying with OpenAI fallback...');
    return await analyzeWithAPI(fallbackKey);
  }
  throw error;
}
```

---

## Migration Guide

### From OpenAI to Agent Router

**Before:**
```env
OPENAI_API_KEY=sk-proj-abc123...
```

**After:**
```env
# Keep OpenAI as fallback
OPENAI_API_KEY=sk-proj-abc123...

# Add Agent Router as primary
AGENT_ROUTER_API_KEY=your-agent-router-key
AGENT_ROUTER_ENDPOINT=https://api.agentrouter.ai/v1/chat/completions
```

**No code changes needed!** The system automatically uses Agent Router when available.

---

## Summary

✅ **Agent Router is now supported** in your ChatAndBuild module!  
✅ **No code changes required** - just add environment variables  
✅ **Better cost & reliability** through multi-provider routing  
✅ **OpenAI still works** as fallback or primary option  

**Get Started:**
1. Add `AGENT_ROUTER_API_KEY` to `frontend/.env.local`
2. Add `AGENT_ROUTER_ENDPOINT` if using custom endpoint
3. Restart: `npm run dev`
4. Test by uploading an image!

Your Non-Fungible Agents will now use Agent Router for visual inspection! 🚀
