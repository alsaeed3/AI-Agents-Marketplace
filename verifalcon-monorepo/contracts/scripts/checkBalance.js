
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const address = deployer.address;
  console.log("Checking balance for:", address);
  
  const balance = await deployer.getBalance();
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "BNB");
  
  // Also check if enough for fees
  // 600,000 gas * 3 gwei = 1,800,000 gwei = 0.0018 BNB
  const required = hre.ethers.utils.parseEther("0.002");
  if (balance.lt(required)) {
    console.log("❌ WARNING: Balance might be too low!");
  } else {
    console.log("✅ Balance sufficient for fees.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
