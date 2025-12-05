# APRO Oracle Integration

## Overview

The VeriFalcon application now integrates with the **APRO (Autonomous Product Registry Oracle)** pattern for decentralized serial number verification. This implementation provides a bridge between off-chain product databases and on-chain verification.

## Architecture

### Current Implementation

```
User Input (Serial Number + Image)
         ↓
    AI Analysis (2s)
         ↓
   APRO Oracle Verification (/api/verify)
    - Queries product registry
    - Checks valid/stolen/fake status
         ↓
   Blockchain Transaction (VeriFalconCore)
    - Records verification on-chain
    - Finalizes transaction
```

### Components

1. **APRO Oracle Interface** (`src/contracts/IAPRO_Oracle.sol`)
   - Solidity interface defining oracle functions
   - `requestSerialCheck()`: Submit serial for verification
   - `OracleResponse` event: Oracle result notification

2. **Oracle ABI** (`src/abis/APRO_Oracle.json`)
   - JSON ABI for frontend contract interaction
   - Enables type-safe calls to oracle contract

3. **Oracle Service** (`src/services/aproOracle.ts`)
   - TypeScript service layer for oracle interaction
   - Handles contract calls and event listening
   - Fallback to mock data when oracle not deployed

4. **API Route** (`src/app/api/verify/route.ts`)
   - Acts as the APRO Oracle endpoint
   - Currently uses mock database (simulates oracle behavior)
   - Returns structured verification results with oracle metadata

## Data Flow

### Verification Request
```typescript
{
  serialNumber: "8286E72"
}
```

### APRO Oracle Response
```typescript
{
  status: "valid" | "stolen" | "fake" | "unknown" | "error",
  model?: string,           // Product model (if valid)
  oracle: "APRO",          // Oracle identifier
  timestamp: "ISO-8601"    // Verification timestamp
}
```

## Status Types

- **valid**: Serial number is registered and legitimate
- **stolen**: Serial number flagged as stolen product
- **fake**: Serial number identified as counterfeit
- **unknown**: Serial number not found in registry
- **error**: Oracle service error occurred

## Mock Database Structure

Located at `data/mock_database.json`:

```json
{
  "valid_serials": {
    "8286E72": "Model A",
    "1234ABCD": "Model B"
  },
  "stolen_serials": ["1111AAAA", "2222BBBB"],
  "fake_serials": ["9999FFFF", "8888GGGG"]
}
```

## Configuration

### Environment Variables

```bash
# VeriFalconCore contract (deployed)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3505542ef1Fef3448387FFa1910FbDe352AD811d

# APRO Oracle contract (to be deployed)
NEXT_PUBLIC_APRO_ORACLE_ADDRESS=0x...
```

## Deployment Guide

### Step 1: Deploy APRO Oracle Contract

Create `contracts/contracts/APRO_Oracle.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IAPRO_Oracle.sol";

contract APRO_Oracle is IAPRO_Oracle {
    uint256 private requestCounter;
    
    mapping(uint256 => string) public requests;
    mapping(string => bool) public validSerials;
    mapping(string => bool) public stolenSerials;
    
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function requestSerialCheck(string calldata serialNumber) 
        external 
        override 
        returns (uint256 requestId) 
    {
        requestId = ++requestCounter;
        requests[requestId] = serialNumber;
        
        // Simulate oracle processing
        bool isValid = validSerials[serialNumber];
        bool isStolen = stolenSerials[serialNumber];
        
        emit OracleResponse(requestId, isValid, isStolen);
        return requestId;
    }
    
    function addValidSerial(string calldata serial) external onlyOwner {
        validSerials[serial] = true;
    }
    
    function addStolenSerial(string calldata serial) external onlyOwner {
        stolenSerials[serial] = true;
    }
}
```

Deploy script (`contracts/scripts/deploy-oracle.js`):

```javascript
async function main() {
  const APRO_Oracle = await ethers.getContractFactory("APRO_Oracle");
  const oracle = await APRO_Oracle.deploy();
  await oracle.deployed();
  
  console.log("APRO Oracle deployed to:", oracle.address);
  
  // Add valid serials from mock database
  await oracle.addValidSerial("8286E72");
  await oracle.addValidSerial("1234ABCD");
  // ... add more serials
}

main();
```

### Step 2: Update Frontend Configuration

After deployment, update `.env.local`:

```bash
NEXT_PUBLIC_APRO_ORACLE_ADDRESS=<deployed_oracle_address>
```

### Step 3: Switch to On-Chain Oracle

Update `src/services/aproOracle.ts` to make actual contract calls:

```typescript
export async function verifySerialWithOracle(
  serialNumber: string
): Promise<OracleVerificationResult> {
  if (!ORACLE_ADDRESS) {
    return fallbackToMockVerification(serialNumber);
  }

  // Make actual contract call
  const requestId = await publicClient.writeContract({
    address: ORACLE_ADDRESS,
    abi: APRO_OracleABI.abi,
    functionName: 'requestSerialCheck',
    args: [serialNumber],
  });

  // Listen for OracleResponse event
  // ... implement event listening logic
}
```

## Testing

### Current Setup (Mock Mode)
```bash
# Serial numbers are verified against mock_database.json
npm run dev

# Test with valid serial
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"serialNumber":"8286E72"}'

# Response: {"status":"valid","model":"Model A","oracle":"APRO",...}
```

### With Deployed Oracle
1. Deploy APRO Oracle contract
2. Configure environment variable
3. Update oracle service to use on-chain calls
4. Test verification flow end-to-end

## Benefits of APRO Oracle

1. **Decentralization**: Product verification is not controlled by a single entity
2. **Transparency**: All verifications are recorded on-chain
3. **Trust**: Blockchain provides immutable verification history
4. **Flexibility**: Oracle can integrate with multiple data sources
5. **Scalability**: Off-chain computation, on-chain verification

## Future Enhancements

1. **Multi-Oracle Support**: Aggregate results from multiple oracles
2. **Staking Mechanism**: Oracle operators stake tokens for reputation
3. **Dispute Resolution**: Challenge mechanism for incorrect verifications
4. **Real-time Updates**: WebSocket events for instant verification results
5. **Cross-chain Support**: Verify products across multiple blockchains

## Troubleshooting

### Serial Number Not Found
- Check if serial exists in `mock_database.json`
- Verify serial format (case-sensitive, exact match required)
- Check oracle logs: `[APRO Oracle] Serial NOT FOUND: ...`

### Oracle Request Failed
- Ensure backend is running: `npm run dev`
- Check network connectivity
- Verify API endpoint: `http://localhost:3000/api/verify`

### Contract Not Deployed
- Oracle defaults to mock mode when `NEXT_PUBLIC_APRO_ORACLE_ADDRESS` not set
- Deploy oracle contract using deployment guide above
- Update environment variables and restart server

## References

- [APRO Oracle Pattern](https://docs.chain.link/architecture-overview/architecture-decentralized-model)
- [BSC Testnet Explorer](https://testnet.bscscan.com/)
- [VeriFalconCore Contract](https://testnet.bscscan.com/address/0x3505542ef1Fef3448387FFa1910FbDe352AD811d)
