# Using Your Agent Router API Key - Quick Setup

## ✅ Yes, You Can Use Agent Router!

Your ChatAndBuild module now supports **Agent Router API** as a replacement for OpenAI.

---

## 🚀 Quick Setup (2 minutes)

### 1. Add Your Agent Router Key

```bash
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/frontend
nano .env.local
```

### 2. Add These Lines

```env
# Agent Router Configuration
AGENT_ROUTER_API_KEY=your-agent-router-api-key-here
AGENT_ROUTER_ENDPOINT=https://api.agentrouter.ai/v1/chat/completions
```

**Replace** `your-agent-router-api-key-here` with your actual Agent Router API key!

### 3. Restart Dev Server

```bash
# Stop current server (Ctrl+C if running)
npm run dev
```

### 4. Test It!

- Open http://localhost:3000
- Upload a luxury item image
- Check console for: `[ChatAndBuild] Using Agent Router - Non-Fungible Agent starting...`

---

## 🎯 What Happens Now?

✅ **System uses Agent Router** instead of OpenAI  
✅ **Same ChatAndBuild functionality** - no changes needed  
✅ **Same API format** - OpenAI-compatible responses  
✅ **Better cost optimization** - automatic model selection  
✅ **Higher reliability** - multi-provider fallback  

---

## 📋 Complete .env.local Example

```env
# VeriFalcon Core Contract (already deployed)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3505542ef1Fef3448387FFa1910FbDe352AD811d

# VeriBot Contract (deploy and add address)
NEXT_PUBLIC_VERIBOT_ADDRESS=0xYourVeriBotAddress

# Agent Router API (your key goes here)
AGENT_ROUTER_API_KEY=your-actual-key-here
AGENT_ROUTER_ENDPOINT=https://api.agentrouter.ai/v1/chat/completions
```

---

## 🔍 How to Verify It's Working

### 1. Check Console Logs

Upload an image and look for:
```
[ChatAndBuild] Using Agent Router - Non-Fungible Agent starting visual inspection...
```

If you see "Using OpenAI" instead, the Agent Router key isn't being detected.

### 2. Check Results

You should see:
- ✅ Visual score (not random!)
- ✅ Brand detected correctly
- ✅ Specific anomalies found (stitching, logos, materials)
- ✅ Agent ID and reputation displayed

### 3. Check Errors

If something's wrong:
```
[ChatAndBuild] Agent Router API error: [error details]
```

---

## ⚙️ Configuration Priority

The system checks in this order:

1. **AGENT_ROUTER_API_KEY** → Use Agent Router ✅ (Your choice!)
2. **OPENAI_API_KEY** → Use OpenAI directly
3. **Neither** → Use fallback mode (limited functionality)

---

## 🆘 Troubleshooting

### Error: "No API key"
```bash
# Make sure you added the key:
cd frontend
cat .env.local | grep AGENT_ROUTER

# Should output:
# AGENT_ROUTER_API_KEY=your-key-here
```

### Error: "API failed: 401"
- **Cause**: Invalid API key
- **Fix**: Double-check your Agent Router key is correct

### Error: "API failed: 429"
- **Cause**: Rate limit exceeded
- **Fix**: Wait a moment or check your Agent Router plan limits

### Still seeing "Using OpenAI"
```bash
# Restart dev server:
npm run dev

# Check environment variable is loaded:
# Add this temporarily to route.ts:
console.log("Agent Router Key:", process.env.AGENT_ROUTER_API_KEY ? "Found" : "Not found");
```

---

## 💰 Cost Benefits

Agent Router can be **cheaper** than OpenAI direct:

| Provider | Cost per Analysis |
|----------|------------------|
| Agent Router (optimized) | ~$0.004 |
| OpenAI GPT-4o (direct) | ~$0.01 |

**Savings**: ~60% through intelligent model routing!

---

## 📚 More Information

See `AGENT_ROUTER_GUIDE.md` for:
- Detailed integration guide
- Model selection options
- Advanced configuration
- Cost comparison
- Troubleshooting

---

## ✨ Summary

**You're all set!** Just add your Agent Router API key to `.env.local` and restart the dev server.

```bash
# 1. Add key to .env.local
AGENT_ROUTER_API_KEY=your-key

# 2. Restart
npm run dev

# 3. Test
# Upload image → See Agent Router in action!
```

Your Non-Fungible Agents will now use Agent Router for visual inspection! 🎉
