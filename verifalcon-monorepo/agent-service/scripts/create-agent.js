const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const VERIBOT_ADDRESS = process.env.VERIBOT_ADDRESS;
    
    if (!VERIBOT_ADDRESS) {
        console.error("❌ Please set VERIBOT_ADDRESS in .env");
        console.error("   Example: VERIBOT_ADDRESS=0xAbC123... npm run create-agent");
        process.exit(1);
    }

    console.log("🤖 Creating Non-Fungible Agent (BAP-578)...\n");

    // Get contract instance
    const VeriBot = await hre.ethers.getContractFactory("VeriBot");
    const veribot = VeriBot.attach(VERIBOT_ADDRESS);

    // Read system prompt
    const promptPath = path.join(__dirname, "../ai/system-prompt.md");
    const systemPrompt = fs.readFileSync(promptPath, "utf8");

    // Get deployer address
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Creating agent for:", deployer.address);
    console.log("📋 System prompt loaded:", promptPath);
    console.log("📦 VeriBot contract:", VERIBOT_ADDRESS);
    console.log("");

    try {
        // Create agent
        console.log("⏳ Minting agent NFT...");
        const tx = await veribot.createAgent(deployer.address, systemPrompt);
        
        console.log("⏳ Waiting for transaction confirmation...");
        const receipt = await tx.wait();

        console.log("\n✅ Non-Fungible Agent created successfully!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📊 Transaction Details:");
        console.log("   Hash:", receipt.transactionHash);
        console.log("   Block:", receipt.blockNumber);
        
        // Get agent ID from event
        const event = receipt.events?.find(e => e.event === "AgentCreated");
        if (event) {
            const agentId = event.args.agentId.toString();
            const timestamp = event.args.timestamp.toString();
            
            console.log("\n🤖 Agent Information:");
            console.log("   ID:", agentId);
            console.log("   Initial Reputation: 100");
            console.log("   Created At:", new Date(timestamp * 1000).toISOString());
            console.log("   Owner:", deployer.address);
            
            console.log("\n📝 Next Steps:");
            console.log("   1. Update frontend/.env.local:");
            console.log("      NEXT_PUBLIC_VERIBOT_ADDRESS=" + VERIBOT_ADDRESS);
            console.log("   2. Start frontend: cd ../frontend && npm run dev");
            console.log("   3. Upload image to test agent analysis!");
        } else {
            console.log("\n⚠️  Agent created but couldn't read event details");
            console.log("   Check transaction on BSCScan:");
            console.log("   https://testnet.bscscan.com/tx/" + receipt.transactionHash);
        }
        
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
        
    } catch (error) {
        console.error("\n❌ Failed to create agent:");
        console.error(error.message);
        
        if (error.message.includes("insufficient funds")) {
            console.error("\n💡 Solution: Get testnet BNB from https://testnet.bnbchain.org/faucet-smart");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
