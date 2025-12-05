# ChatAndBuild (BAP-578) Intelligence Module - Deployment Checklist

## ✅ Current Status

### Already Completed ✓
- [x] ChatAndBuild (BAP-578) implementation in `/frontend/src/app/api/analyze/route.ts`
- [x] Non-Fungible Agent pattern with chat-based inspection
- [x] VeriBot contract written and ready (`/agent-service/contracts/VeriBot.sol`)
- [x] Agent UI components (reputation bar, agent ID badge)
- [x] System prompt for visual inspection (`/agent-service/ai/system-prompt.md`)
- [x] Fallback mode for when API unavailable

---

## 🚀 Required Steps to Make Module Fully Functional

### **Step 1: Get OpenAI API Key** ⚡ **CRITICAL**

**Why needed**: Powers the chat-based visual inspection by Non-Fungible Agents

**Action**:
```bash
# 1. Go to https://platform.openai.com/api-keys
# 2. Sign in or create account
# 3. Click "Create new secret key"
# 4. Copy the key (starts with sk-...)

# 5. Add to your .env.local file:
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/frontend
nano .env.local

# Replace this line:
# OPENAI_API_KEY=your-openai-api-key-here

# With your actual key:
# OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

**Cost**: ~$5-10 for testing (GPT-4o Vision is ~$0.01 per image)

**Alternative**: Use fallback mode (limited functionality, no real AI analysis)

---

### **Step 2: Deploy VeriBot Contract to BNB Testnet** ⚡ **REQUIRED**

**Why needed**: Stores agent prompts and reputation on-chain (BAP-578 requirement)

**Action**:

#### 2a. Get BNB Testnet Tokens
```bash
# 1. Go to https://testnet.bnbchain.org/faucet-smart
# 2. Enter your wallet address
# 3. Request tBNB (test tokens)
```

#### 2b. Configure Private Key
```bash
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/agent-service

# Create .env file
echo "PRIVATE_KEY=your_private_key_here" > .env

# ⚠️ SECURITY: Never commit this file!
```

#### 2c. Install Dependencies
```bash
npm install
```

#### 2d. Deploy Contract
```bash
# Deploy to BNB Testnet
npx hardhat run scripts/deploy.js --network bnbTestnet

# Expected output:
# VeriBot deployed to: 0xAbC123...
```

#### 2e. Save Contract Address
```bash
# Copy the deployed address and add to frontend/.env.local:
cd ../frontend
nano .env.local

# Update this line:
# NEXT_PUBLIC_VERIBOT_ADDRESS=0xYourDeployedVeriBot123...
```

**Cost**: Free (using testnet)

---

### **Step 3: Create Initial Non-Fungible Agent** ⚡ **REQUIRED**

**Why needed**: Need at least one agent NFT to perform analysis

**Action**:

Create a script to mint your first agent:

```bash
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/agent-service
```

Create `scripts/create-agent.js`:
```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const VERIBOT_ADDRESS = process.env.VERIBOT_ADDRESS;
    
    if (!VERIBOT_ADDRESS) {
        console.error("❌ Please set VERIBOT_ADDRESS in .env");
        process.exit(1);
    }

    // Get contract instance
    const VeriBot = await hre.ethers.getContractFactory("VeriBot");
    const veribot = VeriBot.attach(VERIBOT_ADDRESS);

    // Read system prompt
    const promptPath = path.join(__dirname, "../ai/system-prompt.md");
    const systemPrompt = fs.readFileSync(promptPath, "utf8");

    // Get deployer address
    const [deployer] = await hre.ethers.getSigners();
    console.log("Creating agent for:", deployer.address);

    // Create agent
    console.log("Creating Non-Fungible Agent...");
    const tx = await veribot.createAgent(deployer.address, systemPrompt);
    const receipt = await tx.wait();

    console.log("✅ Agent created successfully!");
    console.log("Transaction hash:", receipt.transactionHash);
    
    // Get agent ID from event
    const event = receipt.events?.find(e => e.event === "AgentCreated");
    const agentId = event?.args?.agentId?.toString();
    
    console.log("🤖 Agent ID:", agentId);
    console.log("📊 Initial Reputation: 100");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

Run it:
```bash
# Add VeriBot address to .env
echo "VERIBOT_ADDRESS=0xYourDeployedVeriBot123..." >> .env

# Run script
npx hardhat run scripts/create-agent.js --network bnbTestnet

# Expected output:
# ✅ Agent created successfully!
# 🤖 Agent ID: 0
# 📊 Initial Reputation: 100
```

**Cost**: Free (testnet gas)

---

### **Step 4: Update Frontend Configuration** ⚡ **REQUIRED**

**Action**:

Check your `/frontend/.env.local` has all values:

```bash
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/frontend
cat .env.local
```

Should look like:
```env
# VeriFalconCore (already deployed)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3505542ef1Fef3448387FFa1910FbDe352AD811d

# VeriBot contract (YOU NEED TO ADD THIS)
NEXT_PUBLIC_VERIBOT_ADDRESS=0xYourDeployedVeriBot123...

# OpenAI API (YOU NEED TO ADD THIS)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

---

### **Step 5: Test the Module** ⚡ **CRITICAL**

**Action**:

```bash
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/frontend

# Start development server
npm run dev
```

#### Test Scenarios:

1. **Upload a luxury item image**
   - Go to http://localhost:3000
   - Upload image of handbag/watch
   - Wait for agent analysis

2. **Check agent response**:
   ```
   Expected Output:
   ✓ Agent ID displayed (e.g., "Agent #0")
   ✓ Reputation score shown (e.g., 100/100)
   ✓ Visual score (0-100)
   ✓ Brand detected
   ✓ Anomalies listed
   ✓ Confidence tier (high/medium/low)
   ```

3. **Verify chat-based inspection**:
   - Check browser console (F12)
   - Should see: "[ChatAndBuild] Using Non-Fungible Agent..."
   - Agent analyzes stitching, logos, materials

---

## 📋 Quick Start Commands

### Complete Setup (Copy-Paste Ready)

```bash
# ============================================
# STEP 1: Deploy VeriBot Contract
# ============================================
cd /home/alsaeed/Hackathons/BNB_HACKATHON/verifalcon-monorepo/agent-service

# Install dependencies
npm install

# Create .env with your private key
echo "PRIVATE_KEY=your_wallet_private_key" > .env

# Deploy to BNB Testnet
npx hardhat run scripts/deploy.js --network bnbTestnet

# Save the deployed address (shown in output)

# ============================================
# STEP 2: Create Initial Agent
# ============================================

# Add VeriBot address to .env
echo "VERIBOT_ADDRESS=0xYourDeployedAddress" >> .env

# Create the agent (after creating create-agent.js script above)
npx hardhat run scripts/create-agent.js --network bnbTestnet

# ============================================
# STEP 3: Configure Frontend
# ============================================
cd ../frontend

# Edit .env.local and add:
# NEXT_PUBLIC_VERIBOT_ADDRESS=0xYourDeployedAddress
# OPENAI_API_KEY=sk-proj-your-key

# ============================================
# STEP 4: Test
# ============================================
npm run dev

# Open http://localhost:3000
# Upload an image and test!
```

---

## ⚠️ Important Notes

### Security
- ✅ Never commit `.env` files with private keys
- ✅ Use testnet for development
- ✅ Keep API keys secure

### Testing
- ✅ Test with various luxury item images
- ✅ Check agent reputation updates
- ✅ Verify JSON response format
- ✅ Test fallback mode (without API key)

### Troubleshooting

#### Error: "VeriBot contract not found"
```bash
# Check address is correct
echo $NEXT_PUBLIC_VERIBOT_ADDRESS

# Verify contract exists on testnet
# https://testnet.bscscan.com/address/YOUR_ADDRESS
```

#### Error: "Agent does not exist"
```bash
# Check agent was created
# Run create-agent.js script again
```

#### Error: "OpenAI API key invalid"
```bash
# Verify key in .env.local
cat frontend/.env.local | grep OPENAI

# Test key:
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## 🎯 Success Criteria

Your ChatAndBuild Intelligence Module is **fully functional** when:

- ✅ Upload image → Agent analyzes within 3-5 seconds
- ✅ Visual score calculated (not random!)
- ✅ Brand detection works correctly
- ✅ Stitching/logo/material anomalies identified
- ✅ Agent ID and reputation displayed
- ✅ Chat-based inspection logs visible in console
- ✅ Results make logical sense for uploaded images

---

## 📊 Timeline Estimate

| Task | Time | Difficulty |
|------|------|-----------|
| Get OpenAI API Key | 5 min | Easy |
| Get BNB Testnet Tokens | 5 min | Easy |
| Deploy VeriBot Contract | 10 min | Medium |
| Create Initial Agent | 15 min | Medium |
| Configure Frontend | 5 min | Easy |
| Test Module | 15 min | Easy |
| **TOTAL** | **~1 hour** | **Medium** |

---

## 🆘 Need Help?

### Resources
- **ChatAndBuild Guide**: `/CHATANDBUILD_GUIDE.md`
- **OpenAI API**: https://platform.openai.com/docs
- **BNB Testnet**: https://testnet.bnbchain.org
- **Hardhat Docs**: https://hardhat.org/docs

### Common Issues
1. **"Module not working"** → Check all 3 env vars are set correctly
2. **"Random results"** → OpenAI API key not configured
3. **"Agent not found"** → VeriBot contract not deployed or agent not created
4. **"Low confidence"** → Expected - AI makes probabilistic assessments

---

## ✨ Next Steps After Module Works

Once basic functionality works, you can:

1. **Create specialized agents** for different brands
2. **Implement reputation updates** after verifications
3. **Add multi-agent consensus** for higher accuracy
4. **Build agent marketplace** for trading high-reputation agents
5. **Integrate with verification workflow** (store results on-chain)

---

## 🎉 You're Almost There!

The hardest part (implementation) is **done**. Now you just need to:
1. Get API key (5 min)
2. Deploy contract (15 min)
3. Create agent (15 min)
4. Test (15 min)

**Total: ~1 hour to full functionality!** 🚀
