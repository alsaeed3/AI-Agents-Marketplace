// This script mimics what the frontend does to help debug the issue
const { createPublicClient, http, encodeFunctionData } = require('viem');
const { bscTestnet } = require('viem/chains');

const AGENT_REGISTRY_ABI = [
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'metadataURI', type: 'string' },
      { name: 'apiEndpoint', type: 'string' },
      { name: 'category', type: 'uint8' },
    ],
    outputs: [{ type: 'uint256' }],
  },
];

async function testWithViem() {
  console.log('Testing with viem (same as frontend)...\n');
  
  const CONTRACT_ADDRESS = '0xAb8cE73B3D4284da4AB9abab14301F255954432f';
  const SENDER = '0xB63B6E2f749cC4D3ed45e7A0b3744762EEC35836';
  
  // Test with multiple RPCs
  const rpcs = [
    'https://https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
    'https://data-seed-prebsc-1-s1.binance.org:8545/',
  ];
  
  for (const rpcUrl of rpcs) {
    console.log(`\n--- Testing RPC: ${rpcUrl} ---`);
    
    const client = createPublicClient({
      chain: bscTestnet,
      transport: http(rpcUrl),
    });
    
    try {
      // Test 1: Check if we can read from the contract
      const code = await client.getBytecode({ address: CONTRACT_ADDRESS });
      console.log('Contract exists:', code && code.length > 2 ? 'YES' : 'NO');
      
      // Test 2: Try to simulate the call (this is what wagmi does before sending)
      const result = await client.simulateContract({
        address: CONTRACT_ADDRESS,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: ['ipfs://test', 'https://test.com', 3],
        account: SENDER,
      });
      console.log('Simulation SUCCESS! Would return:', result.result.toString());
      
    } catch (err) {
      console.log('ERROR:', err.message);
      if (err.cause) {
        console.log('Cause:', err.cause.message || err.cause);
      }
    }
  }
}

testWithViem().catch(console.error);
