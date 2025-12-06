const hre = require("hardhat");

async function main() {
    // Get the contract to deploy
    const VeriFalconCore = await hre.ethers.getContractFactory("VeriFalconCore");
    
    // Constructor parameters
    const minimumAIScore = 70; // Minimum AI score required (70%)
    const protocolFee = hre.ethers.utils.parseEther("0.000001"); // 0.000001 BNB protocol fee
    
    console.log("Deploying VeriFalconCore with parameters:");
    console.log("- Minimum AI Score:", minimumAIScore);
    console.log("- Protocol Fee:", hre.ethers.utils.formatEther(protocolFee), "BNB");
    
    const veriFalconCore = await VeriFalconCore.deploy(minimumAIScore, protocolFee);

    await veriFalconCore.deployed();

    console.log("VeriFalconCore deployed to:", veriFalconCore.address);
    console.log("\nUpdate your frontend .env.local file with:");
    console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=" + veriFalconCore.address);
}

// Run the main function and handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });