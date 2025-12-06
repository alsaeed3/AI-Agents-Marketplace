const hre = require("hardhat");

async function main() {
    console.log("Testing registerAgent call...");
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer address:", signer.address);
    
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const ar = AgentRegistry.attach('0xAb8cE73B3D4284da4AB9abab14301F255954432f');
    
    // Try to simulate the exact call that failed
    const metadataURI = 'ipfs://bafkreicjspjxgubovioxawvooauj76ysmpsmn5dnarovut2yiahqdaqm4i';
    const apiEndpoint = 'https://crypto-agent-production-e710.up.railway.app';
    const category = 3; // Text category

    console.log("Arguments:");
    console.log("  metadataURI:", metadataURI);
    console.log("  apiEndpoint:", apiEndpoint);
    console.log("  category:", category);
    
    // Check URL validation - must start with https://
    console.log("\nURL starts with https://:", apiEndpoint.startsWith('https://'));
    console.log("URL length:", apiEndpoint.length);
    
    // Try static call first to see error without spending gas
    try {
        console.log("\nSimulating registerAgent...");
        const result = await ar.callStatic.registerAgent(metadataURI, apiEndpoint, category);
        console.log("Static call succeeded! Agent ID would be:", result.toString());
    } catch(e) {
        console.log("Static call failed:", e.message);
        if (e.reason) console.log("Reason:", e.reason);
        if (e.error) console.log("Error details:", e.error);
    }
    
    // Check gas estimate
    try {
        console.log("\nEstimating gas...");
        const gasEstimate = await ar.estimateGas.registerAgent(metadataURI, apiEndpoint, category);
        console.log("Gas estimate:", gasEstimate.toString());
    } catch(e) {
        console.log("Gas estimation failed:", e.message);
        if (e.reason) console.log("Reason:", e.reason);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
