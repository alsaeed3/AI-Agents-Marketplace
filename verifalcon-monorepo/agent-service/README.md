# VeriFalcon Project

## Overview
The VeriFalcon project aims to provide a robust solution for authenticating luxury bags, specifically focusing on brands like Gucci and Rolex. This project utilizes a Solidity smart contract that implements a simplified BAP-578 interface on the BNB Chain, enabling secure and verifiable ownership of luxury items.

## Project Structure
The project consists of the following key components:

- **contracts/VeriBot.sol**: Contains the Solidity smart contract implementing the BAP-578 interface, inheriting from ERC-721. It defines an `AgentMemory` struct for storing the system prompt and includes a function to manage agent reputation.

- **scripts/deploy.js**: A deployment script for the VeriBot smart contract, utilizing Hardhat to deploy the contract to the BNB Chain with necessary configurations.

- **test/VeriBot.test.js**: A test suite for the VeriBot smart contract, featuring unit tests to ensure compliance with the ERC-721 standard and the functionality of the `updateReputation` method.

- **ai/system-prompt.md**: Contains the "System Prompt" for the Vision AI model, detailing the analysis of image stitching, logo typography, and material texture. It specifies a strict JSON output format for the AI's results.

- **hardhat.config.js**: Configuration file for Hardhat, outlining network settings, compiler options, and any plugins utilized in the project.

- **package.json**: npm configuration file listing the project's dependencies, including OpenZeppelin contracts, Hardhat, and testing libraries.

## Getting Started

### Prerequisites
- Node.js and npm installed on your machine.
- Hardhat installed globally.

### Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   cd verifalcon-project
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Deployment
To deploy the VeriBot smart contract to the BNB Chain, run the following command:
```
npx hardhat run scripts/deploy.js --network bnb
```

### Testing
To run the test suite for the VeriBot smart contract, execute:
```
npx hardhat test
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.