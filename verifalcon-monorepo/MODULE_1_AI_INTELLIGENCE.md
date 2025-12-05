# Module 1: AI Intelligence Integration (ChatAndBuild / BAP-578)

## Overview

Module 1 implements the **AI Intelligence layer** using the **ChatAndBuild (BAP-578)** standard. This module provides vision-based authentication for luxury items using AI agent intelligence stored on-chain.

## Architecture

```
Product Image Upload
       ↓
Vision AI Analysis (/api/analyze)
   - Image quality assessment
   - Logo typography verification
   - Material texture analysis
       ↓
AI Results (JSON)
   - visual_score (0-100)
   - brand_detected
   - anomalies[]
   - confidence_tier
       ↓
VeriBot Contract (BAP-578)
   - Stores system prompt
   - Manages agent reputation
   - Tracks success/failure stats
```

## Components

### 1. VeriBot Smart Contract (`agent-service/contracts/VeriBot.sol`)

**BAP-578 Implementation** - AI Agent Intelligence Contract

Key Features:
- **Agent NFTs**: Each AI agent is an ERC-721 token
- **Agent Memory**: Stores system prompts on-chain
- **Reputation System**: Tracks success/failure rates
- **Statistics**: Monitors agent performance over time

Functions:
```solidity
// Create new AI agent
function createAgent(address to, string memory initialPrompt) returns (uint256)

// Update reputation based on verification results
function updateReputation(uint256 agentId, bool success)

// Update system prompt
function setSystemPrompt(uint256 agentId, string memory prompt)

// Get agent memory
function getAgentMemory(uint256 agentId) returns (string, uint256)

// Get detailed statistics
function getAgentStats(uint256 agentId) returns (
    string systemPrompt,
    uint256 reputationScore,
    uint256 successfulVerifications,
    uint256 failedVerifications,
    uint256 createdAt
)
```

### 2. Vision AI API (`frontend/src/app/api/analyze/route.ts`)

**AI Analysis Endpoint** - Processes product images

Request:
```typescript
POST /api/analyze
Content-Type: multipart/form-data

{
  image: File
}
```

Response:
```typescript
{
  visual_score: number,        // 0-100
  brand_detected: string,      // "Gucci", "Rolex", etc.
  anomalies: string[],         // List of detected issues
  confidence_tier: "high" | "medium" | "low",
  timestamp: string,
  reasoning?: string
}
```

### 3. System Prompt (`agent-service/ai/system-prompt.md`)

Defines the AI's analysis criteria:
- **Image Stitching**: Seamless image quality
- **Logo Typography**: Font, spacing, alignment
- **Material Texture**: Authentic material comparison

### 4. VeriBot Service (`frontend/src/services/veriBot.ts`)

TypeScript service layer for contract interaction:
```typescript
// Get agent memory
await getAgentMemory(agentId, publicClient)

// Get detailed stats
await getAgentStats(agentId, publicClient)

// Update reputation (owner only)
await updateAgentReputation(agentId, success, writeContract)
```

## Integration with VeriFalcon Pipeline

The AI module integrates seamlessly with the full verification pipeline:

```
1. MODULE 1: AI Intelligence (ChatAndBuild)
   - User uploads product image
   - POST /api/analyze processes image
   - Returns AI analysis with visual_score
   - Minimum score: 70/100 required

2. MODULE 2: APRO Oracle Verification
   - Validates serial number
   - Checks stolen/fake databases
   - Returns verification status

3. MODULE 3: Blockchain Recording
   - Records verification on-chain
   - Calls VeriFalconCore.finalizeTransaction()
```

## Deployment

### Deploy VeriBot Contract

```bash
cd agent-service
npm install
npx hardhat run scripts/deploy.js --network bnbTestnet
```

### Create Initial AI Agent

After deployment, create an agent with the system prompt:

```javascript
const VeriBot = await ethers.getContractAt("VeriBot", VERIBOT_ADDRESS);

// Read system prompt from file
const systemPrompt = fs.readFileSync('./ai/system-prompt.md', 'utf8');

// Create agent
const tx = await VeriBot.createAgent(OWNER_ADDRESS, systemPrompt);
const receipt = await tx.wait();

console.log("Agent ID 0 created with system prompt");
```

### Configure Frontend

Update `.env.local`:
```bash
NEXT_PUBLIC_VERIBOT_ADDRESS=0x...
```

## Testing

### Test AI Analysis Endpoint

```bash
# Test with a product image
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@./test-image.jpg"

# Expected response:
{
  "visual_score": 85,
  "brand_detected": "Gucci",
  "anomalies": [],
  "confidence_tier": "high",
  "timestamp": "2024-12-03T...",
  "reasoning": "Analysis based on 245KB image data..."
}
```

### Test Full Verification Flow

1. Start frontend: `npm run dev`
2. Open http://localhost:3000
3. Upload product image
4. Enter serial number
5. Click "Start Verification"
6. Observe:
   - ✅ AI Analysis (Module 1)
   - ✅ Oracle Verification (Module 2)
   - ✅ Blockchain Recording (Module 3)

## Production Integration Options

### Option 1: Google Gemini 1.5 Pro (Current Implementation)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

async function analyzeImage(base64Image: string, mimeType: string) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    systemInstruction: SYSTEM_PROMPT // From VeriBot contract
  });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType
    }
  };

  const result = await model.generateContent([
    "Analyze this product for authenticity...",
    imagePart
  ]);

  const response = await result.response;
  return JSON.parse(response.text());
}
```

### Option 2: OpenAI GPT-4 Vision

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeImage(base64Image: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT // From VeriBot contract
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this product for authenticity" },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    max_tokens: 500,
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### Option 3: Google Cloud Vision AI


```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient();

async function analyzeImage(imageBuffer: Buffer) {
  const [result] = await client.annotateImage({
    image: { content: imageBuffer },
    features: [
      { type: 'LOGO_DETECTION' },
      { type: 'TEXT_DETECTION' },
      { type: 'IMAGE_PROPERTIES' },
    ],
  });

  // Process result and format according to system prompt
  return formatAnalysis(result);
}
```

### Option 3: Galadriel (On-Chain AI)

```solidity
// Deploy AI agent on Galadriel network
contract VeriBotGaladriel {
    function analyzeImage(string memory imageUrl) external returns (uint256 requestId) {
        // Call Galadriel oracle for on-chain AI inference
        return galadrielOracle.requestInference(imageUrl, systemPrompt);
    }
}
```

## AI Agent Reputation System

The VeriBot contract tracks agent performance:

```typescript
// After successful verification
await VeriBot.updateReputation(agentId, true);
// reputationScore += 10
// successfulVerifications += 1

// After failed verification
await VeriBot.updateReputation(agentId, false);
// reputationScore -= 5
// failedVerifications += 1
```

### Agent Selection Strategy

In production, select agents based on reputation:

```typescript
async function selectBestAgent(publicClient: any): Promise<number> {
  const totalAgents = await getTotalAgents(publicClient);
  
  let bestAgent = 0;
  let bestScore = 0n;
  
  for (let i = 0; i < totalAgents; i++) {
    const stats = await getAgentStats(i, publicClient);
    if (stats && stats.reputationScore > bestScore) {
      bestScore = stats.reputationScore;
      bestAgent = i;
    }
  }
  
  return bestAgent;
}
```

## Benefits

1. **Decentralized Intelligence**: AI prompts stored on-chain
2. **Reputation-Based**: Track and reward accurate agents
3. **Transparent**: All agent actions recorded on blockchain
4. **Upgradeable**: Update system prompts without redeploying
5. **Multi-Agent**: Support multiple AI agents with specializations

## Future Enhancements

1. **Multi-Model Ensemble**: Combine multiple AI models
2. **Agent Staking**: Require stake for agent creation
3. **Dispute Mechanism**: Challenge incorrect AI assessments
4. **Training Feedback**: Use blockchain data to improve models
5. **Specialized Agents**: Different agents for different brands

## Troubleshooting

### AI Analysis Returns Low Score

- Check image quality (minimum 100KB recommended)
- Ensure good lighting in product photos
- Upload multiple angles for better analysis

### VeriBot Contract Not Found

- Verify `NEXT_PUBLIC_VERIBOT_ADDRESS` is set
- Check contract is deployed on correct network
- Fallback to local system prompt if contract unavailable

### Analysis Takes Too Long

- Current implementation simulates 2s delay
- Production AI services may take 3-10 seconds
- Consider showing progress indicators

## References

- [BAP-578 Standard](https://github.com/binance-chain/BEPs/discussions/578)
- [OpenAI Vision API](https://platform.openai.com/docs/guides/vision)
- [Google Cloud Vision](https://cloud.google.com/vision/docs)
- [Galadriel Network](https://galadriel.com/)
