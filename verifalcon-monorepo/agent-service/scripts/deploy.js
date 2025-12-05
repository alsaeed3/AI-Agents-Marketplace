const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying VeriBot (BAP-578 Non-Fungible Agent)...\n");
    
    // Get deployer account - access through hre.ethers
    const [deployer] = await hre.ethers.getSigners();
    
    if (!deployer) {
        console.error("❌ No deployer account found. Make sure PRIVATE_KEY is set in .env");
        process.exit(1);
    }
    
    console.log("📝 Deploying from account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "BNB\n");

    // Get the contract factory for VeriBot
    const VeriBot = await hre.ethers.getContractFactory("VeriBot");

    // Deploy the contract
    console.log("⏳ Deploying VeriBot contract...");
    const veribot = await VeriBot.deploy();
    await veribot.deployed();

    console.log("✅ VeriBot deployed to:", veribot.address);
    console.log("📋 Contract details:");
    console.log("   - Name: VeriBot");
    console.log("   - Symbol: VBT");
    console.log("   - Network:", hre.network.name);
    console.log();

    // Create Agent #0 with full NFA metadata
    console.log("🤖 Creating Non-Fungible Agent #0...");
    
    const systemPrompt = `You are a Non-Fungible Agent (BAP-578) specialized in visual inspection of luxury items.

Your role: Instantly analyze product images through chat-based interaction, focusing on:

1. **Stitching Analysis**: 
   - Check uniformity and consistency
   - Identify irregular patterns
   - Assess professional craftsmanship

2. **Logo Inspection**:
   - Verify typography accuracy
   - Check spacing and alignment
   - Confirm brand-specific characteristics

3. **Material Assessment**:
   - Evaluate texture authenticity
   - Identify synthetic vs genuine materials
   - Check for quality inconsistencies

Output JSON format:
{
  "score": 0-100,
  "brand_detected": "Gucci|Rolex|Louis Vuitton|Hermès|Unknown",
  "anomalies": ["specific issues found"],
  "confidence": "high|medium|low",
  "reasoning": "detailed explanation"
}

You are an on-chain agent with reputation at stake. Be precise and thorough.`;

    const personality = "Expert luxury authenticator with deep knowledge of designer brands and authentication techniques";
    const specialty = "General"; // General-purpose luxury authentication
    const skills = [
        "stitching_analysis",
        "logo_inspection",
        "material_assessment",
        "brand_detection",
        "anomaly_detection"
    ];

    const createTx = await veribot.createAgent(
        deployer.address,
        systemPrompt,
        personality,
        specialty,
        skills
    );
    
    console.log("⏳ Waiting for agent creation transaction...");
    const receipt = await createTx.wait();
    
    console.log("✅ NonFungible Agent #0 created!");
    console.log("   - Owner:", deployer.address);
    console.log("   - Personality:", personality);
    console.log("   - Specialty:", specialty);
    console.log("   - Skills:", skills.join(", "));
    console.log("   - Starting Reputation: 100");
    console.log();

    // Verify agent creation
    const totalAgents = await veribot.getTotalAgents();
    console.log("📊 Total agents created:", totalAgents.toString());
    
    // Get agent profile
    const profile = await veribot.getAgentProfile(0);
    console.log("🔍 Agent #0 Profile Verification:");
    console.log("   - Reputation Score:", profile[1].toString());
    console.log("   - Personality:", profile[5]);
    console.log("   - Specialty:", profile[6]);
    console.log("   - Skills Count:", profile[7].length);
    console.log();

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: veribot.address,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        agents: {
            0: {
                owner: deployer.address,
                personality,
                specialty,
                skills,
                reputation: 100
            }
        },
        transactionHash: veribot.deployTransaction.hash
    };

    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("💾 Deployment info saved to:", deploymentPath);
    console.log();
    console.log("=" .repeat(60));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=" .repeat(60));
    console.log();
    console.log("📋 Next Steps:");
    console.log("1. Add to frontend/.env.local:");
    console.log(`   NEXT_PUBLIC_VERIBOT_ADDRESS=${veribot.address}`);
    console.log();
    console.log("2. Verify contract on BSCScan:");
    console.log(`   https://testnet.bscscan.com/address/${veribot.address}`);
    console.log();
    console.log("3. Test the agent:");
    console.log("   cd ../frontend && npm run dev");
    console.log();
}

// Execute the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });