const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0x3505542ef1Fef3448387FFa1910FbDe352AD811d";
    const AGENT_WALLET = "0xB63B6E2f749cC4D3ed45e7A0b3744762EEC35836";
    
    const [deployer] = await ethers.getSigners();
    console.log("Authorizing agent with account:", deployer.address);
    
    const VeriFalconCore = await ethers.getContractFactory("VeriFalconCore");
    const contract = VeriFalconCore.attach(CONTRACT_ADDRESS);
    
    console.log(`\nAuthorizing ${AGENT_WALLET} as an agent...`);
    const tx = await contract.authorizeAgent(AGENT_WALLET);
    await tx.wait();
    
    console.log("✅ Agent authorized successfully!");
    
    // Verify
    const isAuthorized = await contract.authorizedAgents(AGENT_WALLET);
    console.log(`\nVerification: Is ${AGENT_WALLET} authorized? ${isAuthorized}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
