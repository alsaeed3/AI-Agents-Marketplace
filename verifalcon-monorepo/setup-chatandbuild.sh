#!/bin/bash

# ChatAndBuild (BAP-578) Quick Setup Script
# This script guides you through setting up the Non-Fungible Agent module

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ChatAndBuild (BAP-578) Intelligence Module Setup           ║"
echo "║  Non-Fungible Agents for Luxury Item Authentication         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

if ! command_exists node; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "   Install from: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}✅ Node.js installed:${NC} $(node --version)"

if ! command_exists npm; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm installed:${NC} $(npm --version)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: OpenAI API Key
echo "📝 Step 1/4: OpenAI API Key Configuration"
echo ""
echo "The ChatAndBuild agent needs OpenAI API for visual inspection."
echo ""
echo "Options:"
echo "  1. Get API key from: https://platform.openai.com/api-keys"
echo "  2. Skip for now (agent will use fallback mode)"
echo ""
read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY

if [ -n "$OPENAI_KEY" ]; then
    # Update frontend .env.local
    cd frontend
    if grep -q "OPENAI_API_KEY=" .env.local 2>/dev/null; then
        sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env.local
        echo -e "${GREEN}✅ API key updated in frontend/.env.local${NC}"
    else
        echo "OPENAI_API_KEY=$OPENAI_KEY" >> .env.local
        echo -e "${GREEN}✅ API key added to frontend/.env.local${NC}"
    fi
    cd ..
else
    echo -e "${YELLOW}⚠️  Skipped - Agent will use fallback mode (limited functionality)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 2: Install Dependencies
echo "📦 Step 2/4: Installing Dependencies"
echo ""

cd agent-service
echo "Installing agent-service dependencies..."
npm install --silent
echo -e "${GREEN}✅ agent-service dependencies installed${NC}"
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Deploy VeriBot Contract
echo "🚀 Step 3/4: Deploy VeriBot Contract"
echo ""
echo "To deploy the contract, you need:"
echo "  1. BNB Testnet tokens (free from faucet)"
echo "  2. Your wallet private key"
echo ""
read -p "Do you want to deploy now? (y/n): " DEPLOY_NOW

if [ "$DEPLOY_NOW" = "y" ] || [ "$DEPLOY_NOW" = "Y" ]; then
    echo ""
    read -p "Enter your private key (from MetaMask): " PRIVATE_KEY
    
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}❌ Private key required for deployment${NC}"
        echo "   You can deploy later with: cd agent-service && npm run deploy:testnet"
    else
        cd agent-service
        echo "PRIVATE_KEY=$PRIVATE_KEY" > .env
        echo ""
        echo "Deploying VeriBot contract to BNB Testnet..."
        
        if npm run deploy:testnet; then
            echo ""
            echo -e "${GREEN}✅ VeriBot contract deployed!${NC}"
            echo ""
            read -p "Enter the deployed contract address: " VERIBOT_ADDRESS
            
            if [ -n "$VERIBOT_ADDRESS" ]; then
                echo "VERIBOT_ADDRESS=$VERIBOT_ADDRESS" >> .env
                
                # Update frontend .env.local
                cd ../frontend
                if grep -q "NEXT_PUBLIC_VERIBOT_ADDRESS=" .env.local 2>/dev/null; then
                    sed -i.bak "s|NEXT_PUBLIC_VERIBOT_ADDRESS=.*|NEXT_PUBLIC_VERIBOT_ADDRESS=$VERIBOT_ADDRESS|" .env.local
                else
                    echo "NEXT_PUBLIC_VERIBOT_ADDRESS=$VERIBOT_ADDRESS" >> .env.local
                fi
                echo -e "${GREEN}✅ VeriBot address configured${NC}"
                cd ..
                
                DEPLOYED=true
            fi
        else
            echo -e "${RED}❌ Deployment failed${NC}"
            echo "   Manual deployment: cd agent-service && npm run deploy:testnet"
            cd ..
            DEPLOYED=false
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Skipped - Deploy later with: cd agent-service && npm run deploy:testnet${NC}"
    DEPLOYED=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 4: Create Initial Agent
if [ "$DEPLOYED" = true ]; then
    echo "🤖 Step 4/4: Create Initial Non-Fungible Agent"
    echo ""
    read -p "Create your first agent NFT now? (y/n): " CREATE_AGENT
    
    if [ "$CREATE_AGENT" = "y" ] || [ "$CREATE_AGENT" = "Y" ]; then
        cd agent-service
        echo ""
        echo "Creating Non-Fungible Agent (BAP-578)..."
        
        if npm run create-agent; then
            echo ""
            echo -e "${GREEN}✅ Agent created successfully!${NC}"
        else
            echo -e "${RED}❌ Agent creation failed${NC}"
            echo "   Try manually: cd agent-service && npm run create-agent"
        fi
        cd ..
    else
        echo -e "${YELLOW}⚠️  Skipped - Create later with: cd agent-service && npm run create-agent${NC}"
    fi
else
    echo "🤖 Step 4/4: Create Initial Non-Fungible Agent"
    echo ""
    echo -e "${YELLOW}⚠️  Skipped - Deploy contract first${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 Setup Complete!                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Summary:"
echo ""

if [ -n "$OPENAI_KEY" ]; then
    echo -e "   ${GREEN}✅ OpenAI API configured${NC}"
else
    echo -e "   ${YELLOW}⚠️  OpenAI API not configured (fallback mode)${NC}"
fi

if [ "$DEPLOYED" = true ]; then
    echo -e "   ${GREEN}✅ VeriBot contract deployed${NC}"
    echo -e "   ${GREEN}✅ Agent created${NC}"
else
    echo -e "   ${YELLOW}⚠️  VeriBot contract not deployed${NC}"
    echo -e "   ${YELLOW}⚠️  Agent not created${NC}"
fi

echo ""
echo "🚀 Next Steps:"
echo ""

if [ "$DEPLOYED" = true ]; then
    echo "   1. Start the frontend:"
    echo "      cd frontend && npm run dev"
    echo ""
    echo "   2. Open http://localhost:3000"
    echo ""
    echo "   3. Upload a luxury item image to test the agent!"
else
    echo "   1. Get testnet BNB: https://testnet.bnbchain.org/faucet-smart"
    echo ""
    echo "   2. Deploy VeriBot contract:"
    echo "      cd agent-service"
    echo "      echo 'PRIVATE_KEY=your_key' > .env"
    echo "      npm run deploy:testnet"
    echo ""
    echo "   3. Create agent:"
    echo "      echo 'VERIBOT_ADDRESS=0x...' >> .env"
    echo "      npm run create-agent"
    echo ""
    echo "   4. Update frontend/.env.local with NEXT_PUBLIC_VERIBOT_ADDRESS"
    echo ""
    echo "   5. Start frontend: cd frontend && npm run dev"
fi

echo ""
echo "📚 Documentation:"
echo "   - Full guide: CHATANDBUILD_GUIDE.md"
echo "   - Deployment checklist: DEPLOYMENT_CHECKLIST.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
