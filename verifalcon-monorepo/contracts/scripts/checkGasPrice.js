
const { ethers } = require("hardhat");

async function main() {
  const provider = ethers.provider;
  const feeData = await provider.getFeeData();
  
  console.log("Gas Price:", ethers.utils.formatUnits(feeData.gasPrice, "gwei"), "gwei");
  if (feeData.maxFeePerGas) {
    console.log("Max Fee Per Gas:", ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
  }
  if (feeData.maxPriorityFeePerGas) {
    console.log("Max Priority Fee Per Gas:", ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
