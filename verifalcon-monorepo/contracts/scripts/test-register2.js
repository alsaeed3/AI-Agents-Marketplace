const hre = require("hardhat");

async function main() {
    console.log("Testing with new metadata URI...");
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer address:", signer.address);
    
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const ar = AgentRegistry.attach('0xAb8cE73B3D4284da4AB9abab14301F255954432f');
    
    // Use exact same values from the NEW failed transaction
    const metadataURI = 'ipfs://bafkreibmrc24kuhf6irlllvrqra3ppd2it3i2hmrfdp6z7bg3g4t5m4whq';
    const apiEndpoint = 'https://crypto-agent-production-e710.up.railway.app';
    const category = 3;

    console.log("Arguments:");
    console.log("  metadataURI:", metadataURI);
    console.log("  apiEndpoint:", apiEndpoint);
    console.log("  category:", category);

    // Try static call first
    try {
        console.log("\nSimulating registerAgent...");
        const result = await ar.callStatic.registerAgent(metadataURI, apiEndpoint, category);
        console.log("Static call succeeded! Agent ID would be:", result.toString());
        
        // Actually execute it
        console.log("\nExecuting transaction...");
        const tx = await ar.registerAgent(metadataURI, apiEndpoint, category, {
            gasLimit: 600000
        });
        console.log("Transaction hash:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        
        for (const event of receipt.events || []) {
            if (event.event === 'AgentRegistered') {
                console.log("\n🎉 Agent registered! ID:", event.args.agentId.toString());
            }
        }
    } catch(e) {
        console.log("❌ Error:", e.message);
        if (e.reason) console.log("Reason:", e.reason);
    }
}

main().then(() => process.exit(0)).catch(console.error);
