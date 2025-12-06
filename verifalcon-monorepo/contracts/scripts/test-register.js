const hre = require("hardhat");

async function main() {
    console.log("Actually executing registerAgent...");
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Signer address:", signer.address);
    
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const ar = AgentRegistry.attach('0xAb8cE73B3D4284da4AB9abab14301F255954432f');
    
    // Use exact same values from the failed transaction
    const metadataURI = 'ipfs://bafkreicjspjxgubovioxawvooauj76ysmpsmn5dnarovut2yiahqdaqm4i';
    const apiEndpoint = 'https://crypto-agent-production-e710.up.railway.app';
    const category = 3; // Text category

    console.log("\nExecuting transaction...");
    
    try {
        const tx = await ar.registerAgent(metadataURI, apiEndpoint, category, {
            gasLimit: 600000 // Explicitly set gas limit
        });
        console.log("Transaction hash:", tx.hash);
        
        console.log("Waiting for confirmation...");
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Get the agent ID from events
        for (const event of receipt.events || []) {
            if (event.event === 'AgentRegistered') {
                console.log("\n🎉 Agent registered successfully!");
                console.log("Agent ID:", event.args.agentId.toString());
                console.log("Developer:", event.args.developer);
                console.log("Category:", event.args.category);
            }
        }
    } catch(e) {
        console.log("❌ Transaction failed!");
        console.log("Error:", e.message);
        if (e.reason) console.log("Reason:", e.reason);
        if (e.error) console.log("Error details:", JSON.stringify(e.error, null, 2));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
