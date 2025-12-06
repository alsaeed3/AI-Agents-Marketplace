const hre = require("hardhat");

async function main() {
  const contractAddress = "0xAb8cE73B3D4284da4AB9abab14301F255954432f";
  
  console.log("Checking contract at:", contractAddress);
  
  // Get contract instance
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(contractAddress);
  
  try {
    // Check basic state
    const paused = await registry.paused();
    console.log("Contract Paused:", paused);
    
    const totalAgents = await registry.getTotalAgents();
    console.log("Total Agents:", totalAgents.toString());
    
    // Try to get the name to confirm it's the right contract
    const name = await registry.name();
    console.log("Contract Name:", name);
    
    // Check report threshold
    const threshold = await registry.reportThreshold();
    console.log("Report Threshold:", threshold.toString());
    
    console.log("\n✅ Contract is accessible and responding!");
    
  } catch (error) {
    console.error("Error checking contract:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
