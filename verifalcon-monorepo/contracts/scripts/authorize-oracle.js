const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0x3505542ef1Fef3448387FFa1910FbDe352AD811d";
    const ORACLE_WALLET = "0xB63B6E2f749cC4D3ed45e7A0b3744762EEC35836";
    
    const [deployer] = await ethers.getSigners();
    console.log("Authorizing oracle with account:", deployer.address);
    
    const VeriFalconCore = await ethers.getContractFactory("VeriFalconCore");
    const contract = VeriFalconCore.attach(CONTRACT_ADDRESS);
    
    console.log(`\nAuthorizing ${ORACLE_WALLET} as an oracle...`);
    const tx = await contract.authorizeOracle(ORACLE_WALLET);
    await tx.wait();
    
    console.log("✅ Oracle authorized successfully!");
    
    // Verify
    const isAuthorized = await contract.authorizedOracles(ORACLE_WALLET);
    console.log(`\nVerification: Is ${ORACLE_WALLET} authorized as oracle? ${isAuthorized}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
