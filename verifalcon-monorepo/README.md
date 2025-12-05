# VeriFalcon Monorepo

Complete decentralized product authentication platform combining AI Intelligence and Oracle verification.

## 🎯 Overview

VeriFalcon provides **two-layer verification** for luxury products:

1. **Module 1: AI Intelligence** (ChatAndBuild / BAP-578) - Vision-based authenticity analysis
2. **Module 2: APRO Oracle** - Decentralized serial number verification

Both modules work together to provide comprehensive authentication on BNB Chain.

## ✨ Features

### Module 1: AI Intelligence
- 🤖 Vision AI analysis of product images
- 📊 Visual score calculation (0-100)
- 🔍 Anomaly detection (logo, texture, stitching)
- 🎯 Confidence tier assessment (high/medium/low)
- ⛓️ On-chain agent reputation (BAP-578)

### Module 2: APRO Oracle
- 🔐 Serial number verification
- 🚫 Stolen item detection
- ⚠️ Counterfeit identification
- 📦 Product registry validation

## 🏗️ Architecture

```
Frontend (Next.js + TypeScript)
├── /api/analyze      → Module 1: AI Analysis
├── /api/verify       → Module 2: APRO Oracle
└── Components        → User Interface

Smart Contracts
├── VeriBot.sol       → AI Agent Intelligence (BAP-578)
├── VeriFalconCore.sol → Verification Recording
└── APRO_Oracle.sol   → Oracle Interface (optional)

Agent Service
├── System Prompt     → AI Analysis Criteria
└── Deployment Scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet
- BNB Testnet tokens

### Installation

```bash
# Clone repository
git clone <repo-url>
cd verifalcon-monorepo

# Install all dependencies
cd frontend && npm install
cd ../agent-service && npm install
cd ../contracts && npm install
```

### Environment Setup

Create `frontend/.env.local`:

```bash
# Core Contract (Already Deployed)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3505542ef1Fef3448387FFa1910FbDe352AD811d

# VeriBot Contract (Deploy first)
NEXT_PUBLIC_VERIBOT_ADDRESS=0x...

# Optional: Real AI APIs
OPENAI_API_KEY=sk-...
```

### Deploy Contracts

```bash
# Deploy VeriBot (Module 1)
cd agent-service
npx hardhat run scripts/deploy.js --network bnbTestnet

# Copy the deployed address to .env.local
```

### Run Application

```bash
cd frontend
npm run dev

# Open http://localhost:3000
```

## 📖 Documentation

- **[Complete Integration Guide](./INTEGRATION_GUIDE.md)** - Full setup and deployment
- **[Module 1: AI Intelligence](./MODULE_1_AI_INTELLIGENCE.md)** - ChatAndBuild details
- **[Module 2: APRO Oracle](./frontend/APRO_ORACLE_INTEGRATION.md)** - Oracle verification
- **[Agent Service](./agent-service/README.md)** - VeriBot contract
- **[Core Contracts](./contracts/README.md)** - VeriFalconCore

## 🎮 Usage

### Verify a Product

1. **Upload Product Image**
   - Take clear photo of product
   - Include logo and key features
   - Minimum 100KB recommended

2. **Enter Serial Number**
   - Product serial number
   - Format: Alphanumeric (e.g., `8286E72`)

3. **Start Verification**
   - AI analyzes image (2-3s)
   - Oracle checks serial (2s)
   - Blockchain records result

### Test Serial Numbers

Valid serials (in mock database):
- `8286E72` - Model A
- `1234ABCD` - Model B

Invalid serials:
- `1111AAAA` - Stolen
- `9999FFFF` - Fake
- `UNKNOWN` - Not found

## 🧪 Testing

### Test AI Analysis
```bash
curl -X POST http://localhost:3000/api/analyze \
  -F "image=@./test-product.jpg"
```

### Test Oracle
```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"serialNumber":"8286E72"}'
```

## 📁 Project Structure

```
verifalcon-monorepo/
├── agent-service/           # Module 1: AI Intelligence
│   ├── contracts/
│   │   └── VeriBot.sol     # BAP-578 implementation
│   ├── ai/
│   │   └── system-prompt.md # AI criteria
│   └── scripts/
│       └── deploy.js
│
├── contracts/              # Core contracts
│   ├── contracts/
│   │   └── VeriFalconCore.sol
│   └── scripts/
│       └── deploy.js
│
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── analyze/   # Module 1 API
│   │   │   │   └── verify/    # Module 2 API
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   └── VerificationExample.tsx
│   │   ├── hooks/
│   │   │   └── useVeriFalcon.ts
│   │   ├── services/
│   │   │   ├── veriBot.ts     # Module 1 service
│   │   │   └── aproOracle.ts  # Module 2 service
│   │   └── abis/
│   └── data/
│       └── mock_database.json
│
├── INTEGRATION_GUIDE.md    # Complete guide
└── MODULE_1_AI_INTELLIGENCE.md
```

## 🔧 Configuration

### Smart Contracts

**VeriBot (Module 1)**
- Network: BNB Testnet
- Function: AI agent intelligence
- Standard: BAP-578

**VeriFalconCore (Module 2)**
- Address: `0x3505542ef1Fef3448387FFa1910FbDe352AD811d`
- Network: BNB Testnet
- Function: Verification recording

### API Endpoints

**POST /api/analyze**
- Input: Product image (multipart/form-data)
- Output: AI analysis result
- Processing: 2-3 seconds

**POST /api/verify**
- Input: `{ serialNumber: string }`
- Output: Verification status
- Processing: ~2 seconds

## 🌟 Key Features

### ✅ Current Status

- [x] Module 1: AI Intelligence - FUNCTIONAL
- [x] Module 2: APRO Oracle - FUNCTIONAL
- [x] Smart contracts deployed
- [x] Frontend integration complete
- [x] UI with detailed results
- [x] Full pipeline working

### 🚧 Future Enhancements

- [ ] Real AI model integration (OpenAI/Google)
- [ ] On-chain APRO Oracle deployment
- [ ] Agent reputation system
- [ ] Multi-agent support
- [ ] Mobile application
- [ ] Cross-chain verification

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, wagmi
- **Smart Contracts**: Solidity 0.8.0, Hardhat, OpenZeppelin
- **Blockchain**: BNB Chain (Testnet)
- **AI**: Vision analysis (extendable to OpenAI/Google)
- **Oracle**: APRO pattern (mock + on-chain ready)

## 📊 Verification Pipeline

```
User Input → AI Analysis → Oracle Check → Blockchain Recording
   ↓            ↓              ↓                ↓
 Image +     Score 70+     Status Valid    Transaction Hash
 Serial      Confidence    No Stolen/Fake   Immutable Proof
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- **BNB Chain**: [https://www.bnbchain.org](https://www.bnbchain.org)
- **BSCScan Testnet**: [https://testnet.bscscan.com](https://testnet.bscscan.com)
- **BAP-578**: [https://github.com/binance-chain/BEPs/discussions/578](https://github.com/binance-chain/BEPs/discussions/578)

## 📞 Support

For questions or issues:
1. Check documentation in respective directories
2. Review INTEGRATION_GUIDE.md
3. Open an issue on GitHub

---

**Built for BNB Chain Hackathon** 🏆
