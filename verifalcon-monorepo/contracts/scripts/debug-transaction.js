const { ethers } = require("hardhat");

async function main() {
    // Configuration
    const CONTRACT_ADDRESS = "0x3505542ef1Fef3448387FFa1910FbDe352AD811d";
    const ITEM_ID = "15817815705859890"; // The itemId from the error
    const WALLET_ADDRESS = "0xB63B6E2f749cC4D3ed45e7A0b3744762EEC35836"; // The wallet trying to call
    
    console.log("🔍 Debugging VeriFalconCore Transaction Revert");
    console.log("=" .repeat(60));
    
    // Connect to the contract
    const VeriFalconCore = await ethers.getContractFactory("VeriFalconCore");
    const contract = VeriFalconCore.attach(CONTRACT_ADDRESS);
    
    console.log("\n📋 Contract Information:");
    console.log(`Contract Address: ${CONTRACT_ADDRESS}`);
    console.log(`Item ID: ${ITEM_ID}`);
    console.log(`Caller Wallet: ${WALLET_ADDRESS}`);
    
    // Check 1: Is the wallet an authorized agent?
    console.log("\n✅ Check 1: Authorized Agent Status");
    const isAuthorized = await contract.authorizedAgents(WALLET_ADDRESS);
    console.log(`Is ${WALLET_ADDRESS} authorized? ${isAuthorized}`);
    if (!isAuthorized) {
        console.log("❌ ISSUE FOUND: Wallet is NOT an authorized agent!");
    }
    
    // Check 2: Does the listing exist and is it active?
    console.log("\n✅ Check 2: Listing Status");
    try {
        const listing = await contract.listings(ITEM_ID);
        console.log(`Listing details for Item ID ${ITEM_ID}:`);
        console.log(`  - Seller: ${listing.seller}`);
        console.log(`  - Price: ${ethers.utils.formatEther(listing.price)} BNB`);
        console.log(`  - AI Score: ${listing.aiScore.toString()}`);
        console.log(`  - Is Active: ${listing.isActive}`);
        
        if (listing.seller === "0x0000000000000000000000000000000000000000") {
            console.log("❌ ISSUE FOUND: Listing does NOT exist (seller is zero address)!");
        } else if (!listing.isActive) {
            console.log("❌ ISSUE FOUND: Listing is NOT active!");
        }
        
        // Check 3: Does the AI score meet the minimum?
        console.log("\n✅ Check 3: AI Score Requirement");
        const minimumScore = await contract.minimumAIScore();
        console.log(`Minimum AI Score Required: ${minimumScore.toString()}`);
        console.log(`Current AI Score: ${listing.aiScore.toString()}`);
        
        if (listing.aiScore < minimumScore) {
            console.log(`❌ ISSUE FOUND: AI score (${listing.aiScore}) is below minimum (${minimumScore})!`);
        }
    } catch (error) {
        console.log("❌ ERROR: Could not fetch listing details");
        console.log(error.message);
    }
    
    // Additional Info
    console.log("\n📊 Additional Contract Information:");
    const owner = await contract.owner();
    console.log(`Contract Owner: ${owner}`);
    
    const protocolFee = await contract.protocolFee();
    console.log(`Protocol Fee: ${ethers.utils.formatEther(protocolFee)} BNB`);
    
    console.log("\n" + "=".repeat(60));
    console.log("🔧 Recommendations:");
    console.log("=".repeat(60));
    
    if (!isAuthorized) {
        console.log("\n1. AUTHORIZE YOUR WALLET AS AN AGENT:");
        console.log(`   Run: npx hardhat run scripts/authorize-agent.js --network bscTestnet`);
        console.log(`   Or call: contract.authorizeAgent("${WALLET_ADDRESS}")`);
    }
    
    try {
        const listing = await contract.listings(ITEM_ID);
        if (listing.seller === "0x0000000000000000000000000000000000000000") {
            console.log("\n2. CREATE THE LISTING FIRST:");
            console.log(`   The item with ID ${ITEM_ID} doesn't exist yet.`);
            console.log(`   You need to call listItem() before finalizing.`);
        }
        
        if (listing.aiScore === 0n) {
            console.log("\n3. SUBMIT AI RESULTS:");
            console.log(`   The AI score hasn't been submitted yet.`);
            console.log(`   Call submitResults() from an authorized oracle.`);
        }
    } catch (e) {
        // Ignore if listing check fails
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
