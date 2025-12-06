const hre = require("hardhat");

async function main() {
  const contractAddress = "0xAb8cE73B3D4284da4AB9abab14301F255954432f";
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(contractAddress);
  
  const isPaused = await registry.paused();
  console.log("Contract paused:", isPaused);
  
  const totalAgents = await registry.getTotalAgents();
  console.log("Total agents:", totalAgents.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
