
const { ethers } = require("ethers");

async function checkRPC(url) {
  console.log(`Testing RPC: ${url}`);
  try {
    const provider = new ethers.providers.JsonRpcProvider(url);
    const network = await provider.getNetwork();
    console.log(`  Connected to chain ID: ${network.chainId}`);
    
    const gasPrice = await provider.getGasPrice();
    console.log(`  Gas Price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);
    
    const block = await provider.getBlockNumber();
    console.log(`  Current Block: ${block}`);
    console.log("  ✅ RPC works");
  } catch (error) {
    console.log(`  ❌ RPC failed: ${error.message}`);
  }
  console.log("");
}

async function main() {
  await checkRPC("https://data-seed-prebsc-1-s1.binance.org:8545/");
  await checkRPC("https://data-seed-prebsc-1-s1.binance.org:8545/");
}

main();
