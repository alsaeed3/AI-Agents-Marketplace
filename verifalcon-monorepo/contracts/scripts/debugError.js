const hre = require("hardhat");

async function main() {
  const contractAddress = "0xAb8cE73B3D4284da4AB9abab14301F255954432f";
  
  // Exact parameters from the failing transaction
  const metadataURI = "ipfs://bafkreicp3wsc37a344ikkbuzh34vxqgc22knrrga6jmgqcg5dkpbznjpqm";
  const apiEndpoint = "https://crypto-agent-production-e710.up.railway.app";
  const category = 3; // Text
  
  console.log("Debugging transaction with exact parameters:");
  console.log("  metadataURI:", metadataURI);
  console.log("  apiEndpoint:", apiEndpoint);
  console.log("  category:", category);
  
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(contractAddress);
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("\nCaller:", deployer.address);

  try {
    // 1. Check if contract exists and is accessible
    const code = await hre.ethers.provider.getCode(contractAddress);
    if (code === "0x") {
        console.error("❌ Contract does not exist at this address!");
        return;
    }

    // 2. Check Paused state if applicable (assuming Ownable/Pausable)
    try {
        const isPaused = await registry.paused();
        console.log("Contract Paused State:", isPaused);
    } catch (e) {
        console.log("Could not check paused state (function might not exist)");
    }

    // 3. Simulate with callStatic to get revert reason
    console.log("\nAttempting static call (simulation)...");
    await registry.callStatic.registerAgent(metadataURI, apiEndpoint, category, {
        from: deployer.address
    });
    console.log("✅ Simulation successful! transaction SHOULD succeed.");

  } catch (error) {
    console.error("\n❌ SIMULATION FAILED:");
    
    if (error.reason) console.error("Revert Reason:", error.reason);
    else if (error.message) console.error("Error Message:", error.message);
    
    if (error.error && error.error.data) {
        console.error("Error Data:", error.error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
