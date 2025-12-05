const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0x3505542ef1Fef3448387FFa1910FbDe352AD811d";
    
    // The serial number from the error
    const SERIAL = process.argv[2] || "8286E72"; // Default or pass as argument
    const AI_SCORE = process.argv[3] || "85"; // Default score or pass as argument
    
    console.log("🔧 Setting up VeriFalcon Listing");
    console.log("=" .repeat(60));
    console.log(`Serial Number: ${SERIAL}`);
    console.log(`AI Score: ${AI_SCORE}`);
    console.log("");
    
    const [owner] = await ethers.getSigners();
    console.log("Owner account:", owner.address);
    
    const VeriFalconCore = await ethers.getContractFactory("VeriFalconCore");
    const contract = VeriFalconCore.attach(CONTRACT_ADDRESS);
    
    // Convert serial to itemId (same logic as frontend)
    const encoder = new TextEncoder();
    const data = encoder.encode(SERIAL);
    let hash = BigInt(0);
    for (let i = 0; i < data.length; i++) {
        hash = (hash << BigInt(8)) | BigInt(data[i]);
    }
    const itemId = hash;
    
    console.log(`Item ID: ${itemId.toString()}\n`);
    
    // Step 1: Check if listing exists
    console.log("Step 1: Checking if listing exists...");
    const listing = await contract.listings(itemId);
    
    if (listing.seller === "0x0000000000000000000000000000000000000000") {
        console.log("❌ Listing does NOT exist. Creating it...");
        
        const tx1 = await contract.listItem(itemId, 1); // Price 1 wei (minimum required)
        await tx1.wait();
        console.log("✅ Listing created!");
    } else {
        console.log("✅ Listing already exists");
        console.log(`   Seller: ${listing.seller}`);
        console.log(`   Active: ${listing.isActive}`);
    }
    
    // Step 2: Check and submit AI score
    console.log("\nStep 2: Checking AI score...");
    const updatedListing = await contract.listings(itemId);
    const currentScore = updatedListing.aiScore.toString();
    
    console.log(`Current AI Score: ${currentScore}`);
    
    if (currentScore === "0") {
        console.log("❌ AI score not submitted. Submitting...");
        
        // Check if owner is authorized oracle
        const isOracle = await contract.authorizedOracles(owner.address);
        if (!isOracle) {
            console.log("⚠️  Owner is not an authorized oracle. Authorizing...");
            const authTx = await contract.authorizeOracle(owner.address);
            await authTx.wait();
            console.log("✅ Owner authorized as oracle");
        }
        
        const tx2 = await contract.submitResults(itemId, AI_SCORE);
        await tx2.wait();
        console.log(`✅ AI score ${AI_SCORE} submitted!`);
    } else {
        console.log(`✅ AI score already submitted: ${currentScore}`);
    }
    
    // Final status
    console.log("\n" + "=".repeat(60));
    console.log("📊 Final Listing Status:");
    console.log("=".repeat(60));
    
    const finalListing = await contract.listings(itemId);
    console.log(`Item ID: ${itemId.toString()}`);
    console.log(`Seller: ${finalListing.seller}`);
    console.log(`AI Score: ${finalListing.aiScore.toString()}`);
    console.log(`Is Active: ${finalListing.isActive}`);
    console.log(`Price: ${ethers.utils.formatEther(finalListing.price)} BNB`);
    
    const minScore = await contract.minimumAIScore();
    console.log(`\nMinimum AI Score Required: ${minScore.toString()}`);
    
    if (finalListing.aiScore >= minScore && finalListing.isActive) {
        console.log("\n✅ Ready for finalization!");
        console.log("You can now run finalizeTransaction from the frontend.");
    } else {
        console.log("\n⚠️  Not ready for finalization");
        if (finalListing.aiScore < minScore) {
            console.log(`   - AI score ${finalListing.aiScore} is below minimum ${minScore}`);
        }
        if (!finalListing.isActive) {
            console.log("   - Listing is not active");
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
