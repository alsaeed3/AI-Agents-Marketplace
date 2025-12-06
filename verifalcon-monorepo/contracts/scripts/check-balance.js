const hre = require("hardhat");

async function main() {
    console.log("Checking wallet balance for 0xB63B6E2f749cC4D3ed45e7A0b3744762EEC35836...");
    
    const balance = await hre.ethers.provider.getBalance('0xB63B6E2f749cC4D3ed45e7A0b3744762EEC35836');
    console.log('Balance:', hre.ethers.utils.formatEther(balance), 'tBNB');
    
    // Estimate required gas 
    const gasPrice = await hre.ethers.provider.getGasPrice();
    console.log('Current gas price:', hre.ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
    
    const estimatedGas = 480000; // From our earlier test
    const estimatedCost = gasPrice.mul(estimatedGas);
    console.log('Estimated gas cost:', hre.ethers.utils.formatEther(estimatedCost), 'tBNB');
    
    if (balance.lt(estimatedCost)) {
        console.log('\n⚠️  INSUFFICIENT BALANCE! Need more tBNB for gas.');
        console.log('Get free tBNB from: https://testnet.bnbchain.org/faucet-smart');
    } else {
        console.log('\n✅ Balance is sufficient for transaction');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
