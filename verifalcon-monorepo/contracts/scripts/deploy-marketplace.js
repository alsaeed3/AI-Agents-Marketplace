const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @title Marketplace Deployment Script
 * @notice Deploys AgentRegistry and PaymentRouter contracts
 * @dev Outputs contract addresses to frontend/src/abis/contract-address.json
 */
async function main() {
    const signers = await hre.ethers.getSigners();
    
    console.log("=".repeat(60));
    console.log("Decentralized AI Agent Marketplace - Deployment");
    console.log("=".repeat(60));
    
    // Check if we have a signer (wallet with private key)
    if (signers.length === 0) {
        console.log("\n❌ ERROR: No wallet configured!");
        console.log("-".repeat(60));
        console.log("Please set up your PRIVATE_KEY in the .env file:");
        console.log("");
        console.log("1. Create/edit the file: verifalcon-monorepo/.env");
        console.log("2. Add your private key:");
        console.log("   PRIVATE_KEY=your_private_key_here");
        console.log("");
        console.log("⚠️  NEVER commit your .env file to git!");
        console.log("=".repeat(60));
        throw new Error("PRIVATE_KEY not configured in .env file");
    }
    
    const [deployer] = signers;
    console.log("Deployer address:", deployer.address);
    console.log("Network:", hre.network.name);
    console.log("-".repeat(60));
    
    // Deploy AgentRegistry
    console.log("\n[1/2] Deploying AgentRegistry (ERC-8004 Identity)...");
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.deployed();
    console.log("✓ AgentRegistry deployed to:", agentRegistry.address);
    
    // Deploy PaymentRouter
    console.log("\n[2/2] Deploying PaymentRouter (x402 Micro-payments)...");
    const termsVersion = "v1.0.0"; // Initial Terms of Service version
    const PaymentRouter = await hre.ethers.getContractFactory("PaymentRouter");
    const paymentRouter = await PaymentRouter.deploy(termsVersion);
    await paymentRouter.deployed();
    console.log("✓ PaymentRouter deployed to:", paymentRouter.address);
    
    // Link contracts
    console.log("\n[3/3] Linking contracts...");
    await paymentRouter.setAgentRegistry(agentRegistry.address);
    console.log("✓ AgentRegistry linked to PaymentRouter");
    
    // Grant PaymentRouter the ADMIN_ROLE on AgentRegistry for reputation updates
    const ADMIN_ROLE = await agentRegistry.ADMIN_ROLE();
    await agentRegistry.grantRole(ADMIN_ROLE, paymentRouter.address);
    console.log("✓ PaymentRouter granted ADMIN_ROLE on AgentRegistry");
    
    console.log("\n" + "=".repeat(60));
    console.log("Deployment Complete!");
    console.log("=".repeat(60));
    
    // Prepare contract addresses JSON
    const contractAddresses = {
        network: hre.network.name,
        chainId: hre.network.config.chainId || 31337, // Default to Hardhat network
        AgentRegistry: agentRegistry.address,
        PaymentRouter: paymentRouter.address,
        termsVersion: termsVersion,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address
    };
    
    // Create frontend abis directory if it doesn't exist
    const frontendAbisPath = path.join(__dirname, "../../frontend/src/abis");
    if (!fs.existsSync(frontendAbisPath)) {
        fs.mkdirSync(frontendAbisPath, { recursive: true });
        console.log("\n✓ Created frontend/src/abis directory");
    }
    
    // Write contract addresses to JSON file
    const addressFilePath = path.join(frontendAbisPath, "contract-address.json");
    fs.writeFileSync(addressFilePath, JSON.stringify(contractAddresses, null, 2));
    console.log("✓ Contract addresses written to:", addressFilePath);
    
    // Copy ABIs to frontend
    const artifactsPath = path.join(__dirname, "../artifacts/contracts");
    
    // AgentRegistry ABI
    const agentRegistryArtifact = require(path.join(artifactsPath, "AgentRegistry.sol/AgentRegistry.json"));
    fs.writeFileSync(
        path.join(frontendAbisPath, "AgentRegistry.json"),
        JSON.stringify(agentRegistryArtifact.abi, null, 2)
    );
    console.log("✓ AgentRegistry ABI copied to frontend");
    
    // PaymentRouter ABI
    const paymentRouterArtifact = require(path.join(artifactsPath, "PaymentRouter.sol/PaymentRouter.json"));
    fs.writeFileSync(
        path.join(frontendAbisPath, "PaymentRouter.json"),
        JSON.stringify(paymentRouterArtifact.abi, null, 2)
    );
    console.log("✓ PaymentRouter ABI copied to frontend");
    
    console.log("\n" + "-".repeat(60));
    console.log("Frontend Configuration:");
    console.log("-".repeat(60));
    console.log(JSON.stringify(contractAddresses, null, 2));
    console.log("\n" + "=".repeat(60));
    console.log("✅ All done! Update your frontend .env.local with:");
    console.log(`NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${agentRegistry.address}`);
    console.log(`NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS=${paymentRouter.address}`);
    console.log("=".repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
