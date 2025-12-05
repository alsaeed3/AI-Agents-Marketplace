# Agent Router Debugging Guide

## Current Issue

Your Agent Router API key is configured, but the system is falling back to offline mode:
```
[ChatAndBuild] Agent #0 performing offline analysis (Reputation: 100)
brand: 'Unknown - Agent needs API access'
```

This means the API call is silently failing and using the fallback function.

---

## 🔍 Troubleshooting Steps

### Step 1: Check Console Logs (Most Important!)

After restarting the dev server and uploading an image, check the **browser console** (F12) for detailed logs:

```
[ChatAndBuild] Using Agent Router - Non-Fungible Agent starting visual inspection...
[ChatAndBuild] API Endpoint: https://...
[ChatAndBuild] API Key present: Yes (length: XX)
[ChatAndBuild] Agent Router response status: XXX
```

**Look for:**
- ❌ Error messages with status codes (401, 403, 404, 429, 500)
- ❌ Network errors (CORS, connection timeout, DNS)
- ❌ "Agent Router API error: [error details]"

### Step 2: Verify Environment Variables Loaded

Add this temporarily to check if vars are loaded:

```bash
# In your browser console after the page loads:
# The frontend can't directly access process.env, but the API logs will show

# Or check the terminal where npm run dev is running
# You should see the logs there
```

### Step 3: Test Different Endpoints

Agent Router might use a different endpoint. Try these in `.env.local`:

```env
# Option 1 (current):
AGENT_ROUTER_ENDPOINT=https://agentrouter.ai/api/v1/chat/completions

# Option 2 (OpenAI-compatible format):
AGENT_ROUTER_ENDPOINT=https://api.agentrouter.ai/v1/chat/completions

# Option 3 (Alternative domain):
AGENT_ROUTER_ENDPOINT=https://api.agentrouter.com/v1/chat/completions

# Option 4 (Direct path):
AGENT_ROUTER_ENDPOINT=https://agentrouter.ai/v1/chat/completions
```

**After each change:**
```bash
# Stop server (Ctrl+C)
npm run dev
# Upload image and check logs
```

### Step 4: Verify API Key Format

Agent Router keys typically look like:
- `sk-` prefix (like yours: `sk-KSDztop2M6FF2oIvFyZKsvlHVYwfZuMuUYIVPnRQZsNyP2Gf`)
- Or custom format depending on provider

**Check:**
1. No extra spaces before/after the key
2. No quotes around the key
3. Complete key copied (not truncated)

### Step 5: Test API Key Manually

Test your Agent Router key directly:

```bash
# Replace with your actual endpoint
curl https://agentrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-KSDztop2M6FF2oIvFyZKsvlHVYwfZuMuUYIVPnRQZsNyP2Gf" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "test"}]
  }'
```

**Expected responses:**
- ✅ **200 OK**: Key works! Check endpoint in .env.local
- ❌ **401 Unauthorized**: Invalid API key
- ❌ **403 Forbidden**: API key valid but lacks permissions
- ❌ **404 Not Found**: Wrong endpoint URL
- ❌ **429 Too Many Requests**: Rate limit hit

---

## 🎯 Common Issues & Solutions

### Issue 1: Wrong Endpoint
**Symptoms**: 404 error, "Agent Router API failed: 404"

**Solution**: 
```env
# Try the correct Agent Router endpoint
# Check your Agent Router dashboard for the exact endpoint
AGENT_ROUTER_ENDPOINT=https://[correct-endpoint-here]/v1/chat/completions
```

### Issue 2: API Key Not Loaded
**Symptoms**: "No API key, using fallback agent analysis"

**Solution**:
```bash
# Make sure .env.local is in the correct location
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/frontend
ls -la .env.local  # Should exist

# Restart dev server
npm run dev
```

### Issue 3: CORS Error
**Symptoms**: "CORS policy blocked", "Access-Control-Allow-Origin"

**Solution**: CORS errors happen in browser. This shouldn't occur since we're calling from Next.js API route (server-side).

### Issue 4: Invalid Model Name
**Symptoms**: "Model not found", 400 error

**Solution**:
```typescript
// In route.ts, change model name:
model: 'gpt-4o',  // Try: 'gpt-4', 'claude-3-opus', etc.
```

### Issue 5: Agent Router Requires Different Auth Header
**Symptoms**: 401 error with correct key

**Solution**: Some services use different headers:
```typescript
// Try in route.ts:
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': `${apiKey}`,  // Instead of Authorization: Bearer
},
```

---

## 🔧 Debug Mode

I've added detailed logging to the code. After restart, you'll see:

```
[ChatAndBuild] Using Agent Router - Non-Fungible Agent starting visual inspection...
[ChatAndBuild] API Endpoint: https://agentrouter.ai/api/v1/chat/completions
[ChatAndBuild] API Key present: Yes (length: 50)
[ChatAndBuild] Agent Router response status: 200
```

Or if it fails:
```
[ChatAndBuild] Agent Router API error: {"error": "invalid_api_key"}
[ChatAndBuild] Agent error: Error: Agent Router API failed: 401
[ChatAndBuild] Agent #0 performing offline analysis (Reputation: 100)
```

---

## 📝 Quick Checklist

Before asking for more help, verify:

- [ ] `.env.local` is in `frontend/` directory
- [ ] `AGENT_ROUTER_API_KEY` is set correctly (no quotes, no spaces)
- [ ] `AGENT_ROUTER_ENDPOINT` matches your provider's URL
- [ ] Dev server restarted after changing `.env.local`
- [ ] Checked browser console (F12) for error details
- [ ] Checked terminal console for server-side errors
- [ ] Tested API key with `curl` command

---

## 🎓 Understanding the Flow

```
1. User uploads image
   ↓
2. Frontend sends to /api/analyze
   ↓
3. API route checks for AGENT_ROUTER_API_KEY
   ✅ Found → Use Agent Router
   ❌ Not found → Check OPENAI_API_KEY
   ↓
4. Make API call to Agent Router endpoint
   ✅ Success (200) → Parse and return results
   ❌ Failure (4xx/5xx) → Fall back to offline analysis
   ↓
5. Return results to frontend
```

Currently stuck at step 4 (API call failing).

---

## 🚀 Next Steps

1. **Restart dev server** with the new logging:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Upload an image** and check **both**:
   - Browser console (F12 → Console tab)
   - Terminal where `npm run dev` is running

3. **Share the error logs** you see, especially:
   - `[ChatAndBuild] Agent Router response status: XXX`
   - `[ChatAndBuild] Agent Router API error: [details]`

4. **Try manual curl test** to verify your API key works

---

## 📞 What to Report

If still not working, provide:

1. **Console error logs** (copy-paste exact errors)
2. **Agent Router endpoint** you're using
3. **Result of curl test** (status code and error message)
4. **Agent Router provider** (which service provides your key?)

This will help diagnose the exact issue! 🔍
