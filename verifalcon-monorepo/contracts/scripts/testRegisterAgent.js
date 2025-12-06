const hre = require("hardhat");

async function main() {
  const contractAddress = "0xAb8cE73B3D4284da4AB9abab14301F255954432f";
  
  // The exact parameters from the error
  const metadataURI = "ipfs://bafkreibdi6ohc2cvpsbbsl74xyokuwm7ymfxj53uciljhdzuo63nocbgau";
  const apiEndpoint = "https://crypto-agent-production-e710.up.railway.app";
  const category = 2;
  
  console.log("Testing registerAgent with:");
  console.log("  metadataURI:", metadataURI);
  console.log("  apiEndpoint:", apiEndpoint);
  console.log("  category:", category);
  console.log("");
  
  // Get contract instance
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(contractAddress);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing from address:", deployer.address);
  console.log("");
  
  // Try static call first (simulation)
  try {
    console.log("Step 1: Estimating gas...");
    const gasEstimate = await registry.estimateGas.registerAgent(
      metadataURI,
      apiEndpoint,
      category
    );
    console.log("✅ Gas estimate:", gasEstimate.toString());
    
    console.log("\nStep 2: Sending actual transaction...");
    // Use the exact parameters from the frontend failure
    const tx = await registry.registerAgent(
      metadataURI,
      apiEndpoint,
      category,
      {
        gasLimit: 600000,
        gasPrice: hre.ethers.utils.parseUnits("3", "gwei")
      }
    );
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Find event
    const event = receipt.events.find(e => e.event === 'AgentRegistered');
    if (event) {
      console.log("🎉 Agent Registered! ID:", event.args.agentId.toString());
    }
    
  } catch (error) {
    console.error("\n❌ Error Details:");
    console.error("Full Error:", error);
    
    // Check for revert reason
    if (error.reason) {
      console.error("\nRevert Reason:", error.reason);
    }
    if (error.code) {
      console.error("Error Code:", error.code);
    }
    
    // Try to decode the error
    if (error.data) {
      console.error("Error Data:", error.data);
    }
    
    // Check for specific issues
    if (error.message) {
      if (error.message.includes("URL")) {
        console.error("\n⚠️ URL validation issue detected!");
      }
      if (error.message.includes("Pausable")) {
        console.error("\n⚠️ Contract is paused!");
      }
      if (error.message.includes("https://")) {
        console.error("\n⚠️ HTTPS validation failed!");
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
