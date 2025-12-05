const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0x3505542ef1Fef3448387FFa1910FbDe352AD811d";
    const BACKEND_WALLET = "0xB63B6E2f749cC4D3ed45e7A0b3744762EEC35836";
    
    const [owner] = await ethers.getSigners();
    console.log("Owner account:", owner.address);
    
    const VeriFalconCore = await ethers.getContractFactory("VeriFalconCore");
    const contract = VeriFalconCore.attach(CONTRACT_ADDRESS);
    
    console.log(`\n🔧 Authorizing backend wallet for Module 3...`);
    console.log(`Backend wallet: ${BACKEND_WALLET}`);
    
    // Check current status
    const isAgent = await contract.authorizedAgents(BACKEND_WALLET);
    const isOracle = await contract.authorizedOracles(BACKEND_WALLET);
    
    console.log(`\nCurrent status:`);
    console.log(`  - Agent: ${isAgent}`);
    console.log(`  - Oracle: ${isOracle}`);
    
    // Authorize as agent if needed
    if (!isAgent) {
        console.log(`\n→ Authorizing as agent...`);
        const tx1 = await contract.authorizeAgent(BACKEND_WALLET);
        await tx1.wait();
        console.log(`  ✅ Agent authorized`);
    } else {
        console.log(`  ✅ Already authorized as agent`);
    }
    
    // Authorize as oracle if needed
    if (!isOracle) {
        console.log(`\n→ Authorizing as oracle...`);
        const tx2 = await contract.authorizeOracle(BACKEND_WALLET);
        await tx2.wait();
        console.log(`  ✅ Oracle authorized`);
    } else {
        console.log(`  ✅ Already authorized as oracle`);
    }
    
    // Verify final status
    const finalAgent = await contract.authorizedAgents(BACKEND_WALLET);
    const finalOracle = await contract.authorizedOracles(BACKEND_WALLET);
    
    console.log(`\n✅ Final status:`);
    console.log(`  - Agent: ${finalAgent}`);
    console.log(`  - Oracle: ${finalOracle}`);
    
    if (finalAgent && finalOracle) {
        console.log(`\n🎉 Backend wallet is fully authorized!`);
        console.log(`You can now use the verification API.`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
