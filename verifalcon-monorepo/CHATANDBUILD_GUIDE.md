# ChatAndBuild (BAP-578) Non-Fungible Agents Guide

## What is ChatAndBuild?

**ChatAndBuild (BAP-578)** is a BNB Chain protocol for creating **Non-Fungible Agents** - AI agents represented as NFTs that can perform tasks through chat-based interactions.

### Key Concept: Non-Fungible Agents

Each AI agent is:
- ✅ An **ERC-721 NFT** (unique, ownable, tradeable)
- ✅ Has **on-chain memory** (system prompts stored on blockchain)
- ✅ Tracked **reputation score** (performance recorded on-chain)
- ✅ Performs **chat-based visual inspection** instantly
- ✅ Analyzes **stitching, logos, materials** for authenticity

## How VeriFalcon Uses ChatAndBuild

### Architecture

```
User Uploads Image
      ↓
ChatAndBuild Agent Receives Request
      ↓
Agent: "Hello! Let me inspect this item..."
      ↓
Visual Inspection via Chat:
  1. Stitching Analysis
  2. Logo Typography Check
  3. Material Texture Assessment
      ↓
Agent Returns JSON Results
      ↓
Reputation Updated On-Chain
```

### Agent Workflow

1. **Image Upload**: User submits luxury item photo
2. **Chat Request**: "Inspect this item's stitching and logos"
3. **Agent Analysis**: Non-Fungible Agent performs visual inspection
4. **Instant Response**: JSON results with score and anomalies
5. **Reputation Update**: Success/failure recorded on blockchain

## Implementation Details

### VeriBot Contract (BAP-578)

```solidity
contract VeriBot is ERC721, Ownable {
    struct AgentMemory {
        string systemPrompt;      // How agent should analyze
        uint256 reputationScore;  // Performance tracking
        uint256 successfulVerifications;
        uint256 failedVerifications;
        uint256 createdAt;
    }
    
    // Create a new agent NFT
    function createAgent(address to, string memory prompt) 
        external returns (uint256);
    
    // Update agent performance
    function updateReputation(uint256 agentId, bool success) 
        external;
}
```

### Agent System Prompt

The agent is programmed with:

```
You are a Non-Fungible Agent (BAP-578) specialized in visual inspection.

Analyze through chat:
1. Stitching - uniformity and quality
2. Logo - typography and placement  
3. Material - texture authenticity

Respond instantly with JSON assessment.
```

### Chat-Based Inspection

```typescript
// User initiates chat
const userMessage = `Hello Agent! I need you to visually inspect this luxury item.
Please analyze:
1. Stitching quality
2. Logo typography
3. Material texture

Give me your assessment.`;

// Agent responds
{
  "visual_score": 85,
  "brand_detected": "Gucci",
  "anomalies": ["Logo 'G' has slightly irregular spacing"],
  "confidence_tier": "medium",
  "reasoning": "Stitching appears uniform. Logo detected but spacing inconsistent with authentic Gucci specs."
}
```

## Benefits of Non-Fungible Agents

### 1. **Ownership & Tradability**
- Agents are NFTs - can be owned, transferred, sold
- High-reputation agents are more valuable
- Build marketplace for specialized agents

### 2. **On-Chain Reputation**
- All analysis results recorded on blockchain
- Reputation score updates automatically
- Transparent performance tracking

### 3. **Specialization**
- Different agents for different brands
- Agent #0: Gucci specialist (reputation: 150)
- Agent #1: Rolex specialist (reputation: 200)
- Agent #2: Louis Vuitton specialist (reputation: 180)

### 4. **Chat-Based Interface**
- Natural language interaction
- Instant visual inspection
- Conversational responses
- Easy to use

### 5. **Decentralized Intelligence**
- Agent logic stored on-chain
- No central authority
- Immutable analysis history
- Censorship resistant

## Setup Guide

### Step 1: Deploy VeriBot Contract

```bash
cd agent-service
npx hardhat run scripts/deploy.js --network bnbTestnet
```

### Step 2: Create Your First Agent

```javascript
const VeriBot = await ethers.getContractAt("VeriBot", VERIBOT_ADDRESS);

// Read system prompt
const systemPrompt = fs.readFileSync('./ai/system-prompt.md', 'utf8');

// Create agent NFT
const tx = await VeriBot.createAgent(OWNER_ADDRESS, systemPrompt);
const receipt = await tx.wait();

console.log("Non-Fungible Agent #0 created!");
```

### Step 3: Configure Environment

```bash
# In frontend/.env.local
NEXT_PUBLIC_VERIBOT_ADDRESS=0x...  # Your deployed VeriBot
OPENAI_API_KEY=sk-...               # For chat functionality
```

### Step 4: Test Agent

```bash
cd frontend
npm run dev

# Upload image → Agent performs chat-based inspection
```

## Agent Interaction Example

### User Request
```
POST /api/analyze
Image: luxury_bag.jpg
```

### Agent Chat
```
[ChatAndBuild] Non-Fungible Agent #0 starting visual inspection...

Agent: "Hello! Let me inspect this item for you."

Agent analyzing:
  ✓ Stitching uniformity
  ✓ Logo typography  
  ✓ Material texture

Agent: "Inspection complete. Here's my assessment..."
```

### Agent Response
```json
{
  "visual_score": 92,
  "brand_detected": "Gucci",
  "anomalies": [],
  "confidence_tier": "high",
  "reasoning": "Stitching shows professional craftsmanship. Logo 'GG' matches official Gucci specifications. Leather texture consistent with authentic materials.",
  "agent_id": 0,
  "agent_reputation": 150
}
```

## Agent Reputation System

### How Reputation Works

```typescript
// After successful verification
await VeriBot.updateReputation(agentId, true);
// reputation += 10
// successfulVerifications += 1

// After failed verification
await VeriBot.updateReputation(agentId, false);
// reputation -= 5
// failedVerifications += 1
```

### Reputation Tiers

- **0-50**: Novice Agent 🌱
- **51-100**: Trained Agent 📚
- **101-200**: Expert Agent ⭐
- **201-500**: Master Agent 👑
- **500+**: Legendary Agent 💎

### Agent Selection

```typescript
// Select agent with highest reputation
async function selectBestAgent() {
  const totalAgents = await VeriBot.getTotalAgents();
  
  let bestAgent = 0;
  let highestReputation = 0;
  
  for (let i = 0; i < totalAgents; i++) {
    const stats = await VeriBot.getAgentStats(i);
    if (stats.reputationScore > highestReputation) {
      highestReputation = stats.reputationScore;
      bestAgent = i;
    }
  }
  
  return bestAgent;
}
```

## Comparison: ChatAndBuild vs Traditional AI

| Feature | ChatAndBuild (BAP-578) | Traditional AI |
|---------|------------------------|----------------|
| **Ownership** | NFT (owned, tradeable) | Centralized |
| **Reputation** | On-chain, transparent | Off-chain/hidden |
| **Interface** | Chat-based, conversational | API calls |
| **Specialization** | Multiple agents per task | Single model |
| **Decentralization** | Blockchain-based | Cloud-based |
| **Inspection** | Instant via chat | Batch processing |
| **Trust** | Verifiable on-chain | Trust the provider |

## Advanced Features

### 1. Multi-Agent Consensus

```typescript
// Use multiple agents for higher confidence
const agents = [0, 1, 2]; // Top 3 agents
const results = await Promise.all(
  agents.map(id => analyzeWithAgent(id, image))
);

// Average scores
const consensusScore = results.reduce((sum, r) => sum + r.visual_score, 0) / results.length;
```

### 2. Agent Marketplace

```solidity
// List agent for sale
function listAgent(uint256 agentId, uint256 price) external;

// Buy high-reputation agent
function buyAgent(uint256 agentId) external payable;
```

### 3. Agent Training

```solidity
// Update agent's system prompt based on feedback
function trainAgent(uint256 agentId, string memory newPrompt) 
    external onlyOwner;
```

### 4. Agent Staking

```solidity
// Stake tokens to boost agent reputation
function stakeForAgent(uint256 agentId) external payable;
```

## Real-World Use Cases

### 1. **Luxury Authentication**
- Agents specialize in specific brands
- Chat-based inspection of stitching/logos
- Instant authenticity verification

### 2. **Art Verification**
- Agents trained on artistic styles
- Detect forgeries through visual analysis
- Chat with agent about artwork details

### 3. **Document Validation**
- Agents inspect official documents
- Detect tampering or forgery
- Instant verification results

### 4. **Product Quality Control**
- Manufacturing inspection agents
- Real-time defect detection
- Quality scoring and reporting

## Troubleshooting

### Agent Not Responding
```bash
# Check VeriBot contract address
echo $NEXT_PUBLIC_VERIBOT_ADDRESS

# Verify agent exists
cast call $VERIBOT_ADDRESS "getTotalAgents()"
```

### Low Reputation Agent
```typescript
// Create new agent with updated prompt
const newAgentId = await VeriBot.createAgent(owner, improvedPrompt);
```

### Chat Not Working
```bash
# Verify API key
echo $OPENAI_API_KEY

# Agent falls back to basic mode without API key
# Still functional but limited capability
```

## Resources

- **BAP-578 Specification**: [GitHub Discussions](https://github.com/binance-chain/BEPs/discussions/578)
- **VeriBot Contract**: `agent-service/contracts/VeriBot.sol`
- **Agent API**: `frontend/src/app/api/analyze/route.ts`
- **Agent Service**: `frontend/src/services/veriBot.ts`

## Summary

ChatAndBuild (BAP-578) enables **Non-Fungible Agents** - AI agents as NFTs that perform **instant visual inspection via chat**. The VeriFalcon platform uses these agents to analyze luxury items by inspecting:

- ✅ **Stitching** quality and uniformity
- ✅ **Logo** typography and placement
- ✅ **Material** texture and authenticity

All through natural **chat-based interaction** with **on-chain reputation** tracking!
