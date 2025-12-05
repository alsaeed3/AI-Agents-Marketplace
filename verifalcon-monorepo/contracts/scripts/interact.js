const { ethers } = require("hardhat");

async function main() {
    const [owner] = await ethers.getSigners();

    const VeriFalconCore = await ethers.getContractFactory("VeriFalconCore");
    const veriFalconCore = await VeriFalconCore.deploy();

    await veriFalconCore.deployed();

    console.log("VeriFalconCore deployed to:", veriFalconCore.address);
}

async function listItem(itemId, price) {
    const veriFalconCore = await ethers.getContractAt("VeriFalconCore", "<contract_address>");
    const tx = await veriFalconCore.listItem(itemId, price);
    await tx.wait();
    console.log(`Item ${itemId} listed for ${price} wei.`);
}

async function submitResult(itemId, aiScore) {
    const veriFalconCore = await ethers.getContractAt("VeriFalconCore", "<contract_address>");
    const tx = await veriFalconCore.submitResult(itemId, aiScore);
    await tx.wait();
    console.log(`Result submitted for item ${itemId} with AI score ${aiScore}.`);
}

async function purchaseItem(itemId) {
    const veriFalconCore = await ethers.getContractAt("VeriFalconCore", "<contract_address>");
    const tx = await veriFalconCore.purchaseItem(itemId, { value: ethers.utils.parseEther("0.1") }); // Example price
    await tx.wait();
    console.log(`Item ${itemId} purchased.`);
}

async function finalizeTransaction(itemId) {
    const veriFalconCore = await ethers.getContractAt("VeriFalconCore", "<contract_address>");
    const tx = await veriFalconCore.finalizeTransaction(itemId);
    await tx.wait();
    console.log(`Transaction for item ${itemId} finalized.`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = {
    listItem,
    submitResult,
    purchaseItem,
    finalizeTransaction,
};