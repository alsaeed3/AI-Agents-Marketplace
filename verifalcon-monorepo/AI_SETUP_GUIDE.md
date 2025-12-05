# AI Vision Setup Guide

## Why Real AI is Needed

The previous implementation was using **randomized/simulated results** which don't actually analyze the uploaded images. To get real, intelligent analysis of luxury products, you need to integrate with an actual AI vision model.

## Problem with Simulated Analysis

```typescript
// ❌ Old approach - Random values
const visual_score = Math.floor(Math.random() * 30) + 70;
const brands = ['Gucci', 'Rolex', 'Louis Vuitton', 'Hermès'];
const brand_detected = brands[Math.floor(Math.random() * brands.length)];
```

**Issues:**
- Doesn't actually look at the image
- Random brand detection
- No real anomaly detection
- Same results for different images

## Solution: Google Gemini 1.5 Pro

Now the system uses **Google Gemini 1.5 Pro** which can:
- ✅ Actually analyze the uploaded image
- ✅ Detect real brands in photos
- ✅ Identify authentic vs counterfeit features
- ✅ Provide detailed reasoning
- ✅ Detect anomalies in logos, textures, stitching
- ✅ **Free tier**: 15 requests/min, 1,500 requests/day
- ✅ Trained on luxury brands and fashion

## Setup Instructions

### 1. Get Google AI API Key

```bash
# Visit Google AI Studio
https://aistudio.google.com/

# Create account or login with Google
# Click: "Get API key"
# Click: "Create API key in new project"
# Copy the key (starts with AI...)
```

### 2. Add to Environment

Edit `frontend/.env.local`:

```bash
GOOGLE_AI_API_KEY=your-actual-key-here
```

### 3. Restart Server

```bash
cd frontend
npm run dev
```

### 4. Test with Real Image

Upload an actual product photo and see real AI analysis!


## How It Works Now

```
1. User uploads luxury bag photo
2. Image converted to base64
3. Sent to Google Gemini 1.5 Pro API
4. AI analyzes:
   - Logo authenticity
   - Material texture
   - Stitching quality
   - Brand detection
5. Returns real analysis:
   {
     "visual_score": 78,
     "brand_detected": "Gucci",
     "anomalies": [
       "Logo 'G' has slightly irregular spacing",
       "Leather texture appears synthetic"
     ],
     "confidence_tier": "medium"
   }
```

## System Prompt

The AI uses this specialized prompt:

```
You are a Vision AI model specialized in authenticating luxury bags, 
specifically brands like Gucci, Rolex, Louis Vuitton, and Hermès.

Analyze:
1. Image Stitching - Quality and seamlessness
2. Logo Typography - Font, spacing, alignment
3. Material Texture - Authentic material comparison

Return JSON with:
- visual_score (0-100)
- brand_detected
- anomalies (array)
- confidence_tier (high/medium/low)
```

## Cost Considerations

**Google Gemini 1.5 Pro Pricing:**
- **FREE**: 15 requests per minute, 1,500 requests per day
- Perfect for demo and testing
- Very accurate results
- No credit card required

**Paid Tier** (if you exceed free limits):
- ~$0.00125 per image (much cheaper than OpenAI)
- High resolution detail level
- Very accurate results

**Alternatives:**
1. **Fallback Mode** (current if no API key)
   - Uses basic image metrics
   - Lower accuracy
   - No cost

## Testing Without API Key

If you don't have an API key yet, the system will:
1. Use **fallback analysis mode**
2. Score based on image size/quality
3. Show warning: "AI model not available"
4. Still allow testing the full pipeline

But you'll get messages like:
```
Brand Detected: Unknown - AI model not available
Reasoning: Fallback analysis: AI vision model unavailable...
```


## Expected Results with Real AI

### Example 1: Authentic Gucci Bag
```json
{
  "visual_score": 92,
  "brand_detected": "Gucci",
  "anomalies": [],
  "confidence_tier": "high",
  "reasoning": "Logo typography matches official Gucci specifications. 
                Material texture consistent with genuine leather.
                Stitching quality is uniform and professional."
}
```

### Example 2: Suspected Counterfeit
```json
{
  "visual_score": 45,
  "brand_detected": "Louis Vuitton",
  "anomalies": [
    "Logo 'LV' monogram pattern irregular",
    "Canvas texture appears printed rather than woven",
    "Stitching shows inconsistent thread tension",
    "Hardware finish lacks proper patina"
  ],
  "confidence_tier": "low",
  "reasoning": "Multiple indicators suggest non-authentic item..."
}
```

### Example 3: Certificate (Your Test)
```json
{
  "visual_score": 65,
  "brand_detected": "Unknown",
  "anomalies": [
    "No luxury brand logo detected",
    "Document/certificate format - not a product photo",
    "Cannot assess material texture from certificate"
  ],
  "confidence_tier": "low",
  "reasoning": "Image appears to be a certificate or document, 
                not a luxury product photo."
}
```

## Alternative: Google Cloud Vision

If you prefer a different Google AI service:

```bash
npm install @google-cloud/vision
```

```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: './google-credentials.json'
});

const [result] = await client.annotateImage({
  image: { content: imageBuffer },
  features: [
    { type: 'LOGO_DETECTION' },
    { type: 'TEXT_DETECTION' },
    { type: 'LABEL_DETECTION' },
  ],
});
```

## Training Custom Models

For even better accuracy, you could:

1. **Fine-tune Gemini**
   - Collect dataset of authentic/fake items
   - Fine-tune on specific brands
   - Higher accuracy for your use case

2. **Train Custom CNN**
   - Use TensorFlow/PyTorch
   - Train on luxury product dataset
   - Self-hosted inference

3. **Use Galadriel (On-Chain AI)**
   - Truly decentralized
   - AI inference on blockchain
   - Store training data on-chain

## Troubleshooting

### "AI model not available" message
- Check if `GOOGLE_AI_API_KEY` is set in `.env.local`
- Verify key is correct (starts with `AI`)
- Restart the dev server

### "Google AI API failed: 401"
- Invalid API key
- Generate new key at aistudio.google.com
- Check for extra spaces in .env.local

### "Google AI API failed: 429"
- Rate limit exceeded (free tier: 15/min, 1,500/day)
- Wait a moment before retrying
- Consider upgrading to paid tier

### Image too large
- Resize images before upload
- Recommended: < 5MB
- API handles base64 encoding

## Next Steps

1. ✅ Get Google AI API key from https://aistudio.google.com/
2. ✅ Add to .env.local
3. ✅ Restart server
4. ✅ Test with real luxury item photos
5. ✅ Compare results with certificates vs actual products
6. 📊 Monitor accuracy and adjust system prompt
7. 🎯 Consider fine-tuning for your specific brands

## Summary

The AI is now **real and functional** using Google Gemini 1.5 Pro - it will actually analyze your images using state-of-the-art multimodal vision models. The free tier is perfect for demo and testing with 1,500 requests per day. No more random results! Just add your Google AI API key to get started.

