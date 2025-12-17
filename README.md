# AgentOS

**On-Chain AI Agents Marketplace** built on BNB Chain

## 🎯 Overview

AgentOS is a decentralized marketplace for AI agents on BNB Chain. The platform enables users to discover, interact with, and deploy AI agents with blockchain-verified credentials and on-chain reputation. The marketplace currently features intelligent agents for product authentication and crypto assistance.

## ✨ Key Features

- 🤖 **AI Agent Marketplace** - Discover and interact with specialized AI agents
- ⛓️ **On-Chain Reputation** - BAP-578 compliant agent verification
- 🔐 **Product Authentication** - VeriFalcon module for luxury goods verification
- 💰 **Crypto Intelligence** - Blockchain assistant for Web3 interactions
- 🌐 **BNB Chain Integration** - Smart contracts deployed on BSC Testnet
- 🎨 **Modern UI** - Next.js 14 with TypeScript and TailwindCSS

## 🏗️ Architecture

```
AgentOS/
├── verifalcon-monorepo/     # Product Authentication Module
│   ├── frontend/            # Next.js marketplace UI
│   ├── agent-service/       # AI agent smart contracts
│   └── contracts/           # Core verification contracts
│
└── Crypto-agent/            # Blockchain Assistant Agent
    └── blockchain_assistant/ # Crypto intelligence module
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MetaMask wallet
- BNB Testnet tokens ([Get from faucet](https://testnet.bnbchain.org/faucet-smart))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd AI-Agents-Marketplace

# Install frontend dependencies
cd verifalcon-monorepo/frontend
npm install

# Install agent service dependencies
cd ../agent-service
npm install

# Install contracts dependencies
cd ../contracts
npm install
```

### Environment Setup

Create `verifalcon-monorepo/frontend/.env.local`:

```bash
# Core Contract (Already Deployed)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3505542ef1Fef3448387FFa1910FbDe352AD811d

# VeriBot Contract
NEXT_PUBLIC_VERIBOT_ADDRESS=<your-deployed-address>

# Optional: AI API Keys
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

Create `verifalcon-monorepo/.env`:

```bash
# See .env.example for all required variables
PRIVATE_KEY=<your-wallet-private-key>
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### Run the Application

```bash
cd verifalcon-monorepo/frontend
npm run dev

# Open http://localhost:3000
```

## 📦 Modules

### VeriFalcon - Product Authentication

Two-layer verification system for luxury products:

1. **AI Intelligence** - Vision-based authenticity analysis
   - Visual score calculation (0-100)
   - Anomaly detection (logo, texture, stitching)
   - Confidence tier assessment

2. **APRO Oracle** - Decentralized serial verification
   - Serial number validation
   - Stolen item detection
   - Counterfeit identification

**Learn more**: See [verifalcon-monorepo/README.md](./verifalcon-monorepo/README.md)

### Crypto-agent - Blockchain Assistant

AI-powered blockchain intelligence agent:
- Smart contract interactions
- Transaction analysis
- Web3 guidance

**Learn more**: See [Crypto-agent/README.md](./Crypto-agent/README.md)

## 🔧 Development

### Deploy Smart Contracts

```bash
cd verifalcon-monorepo/agent-service
npx hardhat run scripts/deploy.js --network bnbTestnet
```

### Run with Docker

```bash
cd verifalcon-monorepo
docker-compose up
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Testing
npm run lint         # Run ESLint
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS
- **Blockchain**: Solidity, Hardhat, ethers.js, viem, wagmi
- **Smart Contracts**: OpenZeppelin, BAP-578
- **Network**: BNB Chain (Testnet)
- **AI**: Vision analysis, LLM integration ready

## 📁 Project Structure

```
AgentOS/
├── verifalcon-monorepo/
│   ├── frontend/               # Next.js marketplace
│   │   ├── src/app/
│   │   │   ├── api/           # API routes
│   │   │   │   ├── analyze/   # AI analysis endpoint
│   │   │   │   └── verify/    # Oracle verification
│   │   │   └── page.tsx       # Main UI
│   │   └── data/
│   │       └── mock_database.json
│   │
│   ├── agent-service/          # Agent contracts
│   │   ├── contracts/
│   │   │   └── VeriBot.sol    # BAP-578 agent
│   │   └── scripts/
│   │
│   ├── contracts/              # Core contracts
│   │   └── contracts/
│   │       └── VeriFalconCore.sol
│   │
│   └── docker-compose.yml      # Docker setup
│
├── Crypto-agent/               # Blockchain assistant
│   ├── app.py                 # Agent server
│   ├── blockchain_assistant/   # Intelligence module
│   └── Dockerfile
│
└── README.md                   # This file
```

## 🎮 Usage

### Verify a Product (VeriFalcon)

1. Visit the marketplace at `http://localhost:3000`
2. Upload a product image (clear, well-lit)
3. Enter the serial number
4. Click "Verify" to start dual verification
5. View AI analysis + Oracle results
6. Transaction recorded on-chain

### Test Serial Numbers

Valid serials:
- `8286E72` - Model A
- `1234ABCD` - Model B

Invalid serials:
- `1111AAAA` - Stolen
- `9999FFFF` - Fake
- `UNKNOWN` - Not found

## 🔗 Smart Contracts

**VeriFalconCore** (Already Deployed)
- Address: `0x3505542ef1Fef3448387FFa1910FbDe352AD811d`
- Network: BNB Testnet
- [View on BSCScan](https://testnet.bscscan.com/address/0x3505542ef1Fef3448387FFa1910FbDe352AD811d)

**VeriBot** (Deploy your own)
- Standard: BAP-578
- Function: AI agent intelligence
- Deploy: See [agent-service/README.md](./verifalcon-monorepo/agent-service/README.md)

## 🌟 Roadmap

- [x] Product authentication (VeriFalcon)
- [x] APRO Oracle integration
- [x] BAP-578 agent standard
- [x] BNB Chain deployment
- [x] Agent NFT marketplace
- [ ] Multi-agent orchestration
- [ ] Cross-chain support
- [ ] Mobile application
- [ ] Agent reputation DAOs

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-agent`)
3. Commit your changes (`git commit -m 'Add amazing agent'`)
4. Push to the branch (`git push origin feature/amazing-agent`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 🔗 Resources

- **BNB Chain**: [https://www.bnbchain.org](https://www.bnbchain.org)
- **BSCScan Testnet**: [https://testnet.bscscan.com](https://testnet.bscscan.com)
- **BAP-578 Standard**: [BEPs Discussion #578](https://github.com/binance-chain/BEPs/discussions/578)
- **Faucet**: [https://testnet.bnbchain.org/faucet-smart](https://testnet.bnbchain.org/faucet-smart)

## 📞 Support

For questions or issues:
1. Check module-specific READMEs
2. Review documentation in respective directories
3. Open an issue on GitHub

---

**Built for BNB Chain** 🏆 | **Powered by AgentOS** 🤖
