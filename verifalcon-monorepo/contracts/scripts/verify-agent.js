const hre = require("hardhat");

async function main() {
    console.log("Verifying registered agent...");
    
    const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
    const ar = AgentRegistry.attach('0xAb8cE73B3D4284da4AB9abab14301F255954432f');
    
    const totalAgents = await ar.getTotalAgents();
    console.log("Total agents registered:", totalAgents.toString());
    
    // Get info for agent 0
    if (totalAgents.gt(0)) {
        const agentInfo = await ar.getAgentInfo(0);
        console.log("\n📋 Agent #0 Info:");
        console.log("  Developer:", agentInfo.developer);
        console.log("  Metadata URI:", agentInfo.metadataURI);
        console.log("  API Endpoint:", agentInfo.apiEndpoint);
        console.log("  Category:", agentInfo.category);
        console.log("  Reputation:", agentInfo.reputationScore.toString());
        console.log("  Is Active:", agentInfo.isActive);
        console.log("  Is Flagged:", agentInfo.isFlagged);
        console.log("  Registered At:", new Date(agentInfo.registeredAt.toNumber() * 1000).toISOString());
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
