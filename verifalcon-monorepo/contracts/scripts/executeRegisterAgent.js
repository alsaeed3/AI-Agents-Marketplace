const hre = require("hardhat");

async function main() {
  const contractAddress = "0xAb8cE73B3D4284da4AB9abab14301F255954432f";
  
  // The exact parameters from the frontend error
  const metadataURI = "ipfs://bafkreibdi6ohc2cvpsbbsl74xyokuwm7ymfxj53uciljhdzuo63nocbgau";
  const apiEndpoint = "https://crypto-agent-production-e710.up.railway.app";
  const category = 2;
  
  console.log("=================================");
  console.log("EXECUTING REAL AGENT REGISTRATION");
  console.log("=================================");
  console.log("");
  console.log("Parameters:");
  console.log("  metadataURI:", metadataURI);
  console.log("  apiEndpoint:", apiEndpoint);
  console.log("  category:", category);
  console.log("");
  
  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer address:", signer.address);
  
  // Check balance
  const balance = await signer.getBalance();
  console.log("Balance:", hre.ethers.utils.formatEther(balance), "tBNB");
  console.log("");
  
  // Get contract instance
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(contractAddress);
  
  // Check current total before
  const totalBefore = await registry.getTotalAgents();
  console.log("Total agents before:", totalBefore.toString());
  console.log("");
  
  console.log("Sending transaction...");
  console.log("");
  
  try {
    // Actually execute the transaction
    const tx = await registry.registerAgent(metadataURI, apiEndpoint, category);
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("");
    console.log("✅ TRANSACTION CONFIRMED!");
    console.log("Block number:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Parse the AgentRegistered event
    const event = receipt.events?.find(e => e.event === "AgentRegistered");
    if (event) {
      console.log("");
      console.log("🎉 AGENT REGISTERED SUCCESSFULLY!");
      console.log("   Agent ID:", event.args.agentId.toString());
      console.log("   Developer:", event.args.developer);
      console.log("   Category:", event.args.category);
    }
    
    // Verify by checking total
    const totalAfter = await registry.getTotalAgents();
    console.log("");
    console.log("Total agents after:", totalAfter.toString());
    
  } catch (error) {
    console.error("❌ TRANSACTION FAILED!");
    console.error("Error:", error.message);
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
