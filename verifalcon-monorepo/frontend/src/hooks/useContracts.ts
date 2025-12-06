'use client';

import { useCallback, useState, useEffect } from 'react';
import { 
  useReadContract, 
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient,
  useWalletClient
} from 'wagmi';
import { parseEther, parseGwei, decodeEventLog, type Log } from 'viem';
import { Agent, Task, ContentCategory, getErrorMessage } from '@/types';

// AgentRegistered event ABI for parsing logs
const AGENT_REGISTERED_EVENT = {
  type: 'event',
  name: 'AgentRegistered',
  inputs: [
    { indexed: true, name: 'agentId', type: 'uint256' },
    { indexed: true, name: 'developer', type: 'address' },
    { indexed: false, name: 'category', type: 'uint8' },
    { indexed: false, name: 'timestamp', type: 'uint256' },
  ],
} as const;

// Contract ABIs (minimal required functions)
export const AGENT_REGISTRY_ABI = [
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
  AGENT_REGISTERED_EVENT,
  {
    name: 'getAgentInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'developer', type: 'address' },
          { name: 'metadataURI', type: 'string' },
          { name: 'apiEndpoint', type: 'string' },
          { name: 'category', type: 'uint8' },
          { name: 'reportCount', type: 'uint256' },
          { name: 'reputationScore', type: 'uint256' },
          { name: 'totalTasks', type: 'uint256' },
          { name: 'successfulTasks', type: 'uint256' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'isFlagged', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'getTotalAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'reportAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'isAgentAvailable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getAgentApiEndpoint',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
] as const;

export const PAYMENT_ROUTER_ABI = [
  {
    name: 'acceptTerms',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'hasAcceptedTerms',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'termsVersion',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'createTask',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'developer', type: 'address' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'completeTask',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'taskId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'refundTask',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'taskId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getTask',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'taskId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'agentId', type: 'uint256' },
          { name: 'client', type: 'address' },
          { name: 'developer', type: 'address' },
          { name: 'payment', type: 'uint256' },
          { name: 'platformFee', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'tosAccepted', type: 'bool' },
        ],
      },
    ],
  },
  {
    name: 'isRefundAvailable',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'taskId', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

// Contract addresses (loaded from environment or defaults)
export const getContractAddresses = () => {
  const agentRegistry = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}` | undefined;
  const paymentRouter = process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS as `0x${string}` | undefined;
  
  return {
    agentRegistry: agentRegistry || '0x0000000000000000000000000000000000000000' as `0x${string}`,
    paymentRouter: paymentRouter || '0x0000000000000000000000000000000000000000' as `0x${string}`,
  };
};

/**
 * Hook to interact with the AgentRegistry contract
 */
export function useAgentRegistry() {
  const { agentRegistry } = getContractAddresses();
  const { address, chainId } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();

  // Register a new agent - mints ERC721 NFT
  const registerAgent = useCallback(async (
    metadataURI: string,
    apiEndpoint: string,
    category: ContentCategory
  ): Promise<bigint | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    if (!publicClient) {
      setError('Network not available');
      return null;
    }

    if (!walletClient.data) {
      setError('Wallet client not available. Please reconnect your wallet.');
      return null;
    }

    // Validate chain ID - must be BSC Testnet (97)
    if (chainId !== 97) {
      setError(`Wrong network! Please switch to BSC Testnet. Current chain: ${chainId}`);
      console.error('Chain mismatch: Expected 97 (BSC Testnet), got:', chainId);
      return null;
    }

    // Try to add/switch to BSC Testnet with correct RPC
    // This helps fix MetaMask's broken default BSC Testnet RPC
    try {
      console.log('Ensuring BSC Testnet is configured with correct RPC...');
      await (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x61', // 97 in hex
          chainName: 'BNB Smart Chain Testnet',
          nativeCurrency: {
            name: 'tBNB',
            symbol: 'tBNB',
            decimals: 18,
          },
          rpcUrls: [
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://bsc-testnet-rpc.publicnode.com',
            'https://data-seed-prebsc-1-s1.binance.org:8545/',
            'https://data-seed-prebsc-2-s1.binance.org:8545/'
          ],
          blockExplorerUrls: ['https://testnet.bscscan.com'],
        }],
      });
      console.log('✅ BSC Testnet configured with reliable RPC');
    } catch (addChainError) {
      // Error 4902 means chain already exists, which is fine
      const err = addChainError as { code?: number };
      // If chain exists but might have bad RPC, try switching to it anyway
      // or prompt user to update it manually if needed
      if (err.code !== 4902) {
        console.warn('Could not update BSC Testnet RPC:', addChainError);
      }
    }

    console.log('=== Starting Agent Registration ===');
    console.log('Chain ID:', chainId);
    console.log('Wallet:', address);
    console.log('Contract:', agentRegistry);
    console.log('Args:', { metadataURI, apiEndpoint, category });

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Simulate the transaction using our reliable RPC
      console.log('Step 1: Simulating transaction...');
      let simulateResult;
      try {
        simulateResult = await publicClient.simulateContract({
          address: agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'registerAgent',
          args: [metadataURI, apiEndpoint, category],
          account: address,
        });
        console.log('✅ Simulation successful, would return agent ID:', simulateResult.result?.toString());
      } catch (simError) {
        console.error('❌ Simulation failed:', simError);
        // Extract more details from simulation error
        const simErrorMsg = simError instanceof Error ? simError.message : String(simError);
        if (simErrorMsg.includes('paused')) {
          setError('Contract is currently paused. Please try again later.');
        } else if (simErrorMsg.includes('https://')) {
          setError('API endpoint must use HTTPS.');
        } else {
          setError(`Transaction would fail: ${simErrorMsg.slice(0, 100)}`);
        }
        return null;
      }

      // Step 2: Get gas parameters from our reliable RPC
      // This bypasses potential issues with MetaMask's RPC estimation
      console.log('Step 2: Getting gas parameters from our RPC...');
      const gasPrice = await publicClient.getGasPrice();
      const adjustedGasPrice = (gasPrice * BigInt(120)) / BigInt(100); // 20% buffer
      
      // Enforce minimum gas price of 5 gwei to avoid "Internal JSON-RPC error"
      // BSC Testnet sometimes rejects transactions with very low gas price (e.g. 0.1 gwei)
      const minGasPrice = parseGwei('5');
      const safeGasPrice = adjustedGasPrice > minGasPrice ? adjustedGasPrice : minGasPrice;
      
      const gasLimit = simulateResult.request.gas 
        ? (simulateResult.request.gas * BigInt(200)) / BigInt(100) // 100% buffer (2x)
        : BigInt(1000000); // 1M gas fallback
      
      console.log('Gas params:', {
        gasPrice: gasPrice.toString(),
        adjustedGasPrice: adjustedGasPrice.toString(),
        minGasPrice: minGasPrice.toString(),
        finalGasPrice: safeGasPrice.toString(),
        gasLimit: gasLimit.toString(),
      });

      // Step 3: Send transaction using sendTransaction with encoded data
      // This is a simpler RPC call that may bypass MetaMask's broken BSC RPC
      console.log('Step 3: Encoding function data and sending transaction...');
      
      // Encode the function call data
      const { encodeFunctionData } = await import('viem');
      const callData = encodeFunctionData({
        abi: AGENT_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: [metadataURI, apiEndpoint, category],
      });
      
      console.log('Encoded calldata:', callData.slice(0, 66) + '...');
      
      let hash: `0x${string}`;
      try {
        // Use sendTransaction which is a simpler RPC call
        // This might work better with MetaMask's sometimes buggy BSC RPC
        hash = await walletClient.data!.sendTransaction({
          to: agentRegistry,
          data: callData,
          gas: gasLimit,
          gasPrice: safeGasPrice,
        });
        
        console.log('✅ Transaction sent:', hash);
      } catch (txError) {

        // Log the full raw error for debugging
        console.error('❌ RAW TRANSACTION ERROR:', txError);
        
        // Log all properties of the error for debugging
        const txErrorObj = txError as { 
          code?: number; 
          message?: string; 
          shortMessage?: string;
          cause?: unknown;
          details?: string;
          name?: string;
        };
        if (txErrorObj.code === 4001 || 
            txErrorObj.message?.includes('rejected') || 
            txErrorObj.message?.includes('denied') ||
            txErrorObj.shortMessage?.includes('rejected') ||
            txErrorObj.shortMessage?.includes('User rejected')) {
          setError('Transaction was rejected by user');
          return null;
        }
        
        // Check for insufficient funds
        if (txErrorObj.message?.includes('insufficient') || txErrorObj.shortMessage?.includes('insufficient')) {
          setError('Insufficient BNB for gas fees. Please add tBNB to your wallet.');
          return null;
        }
        
        // Check for method not supported (shouldn't happen now, but just in case)
        if (txErrorObj.message?.includes('not supported') || txErrorObj.shortMessage?.includes('not supported')) {
          setError('Wallet method not supported. Please try using MetaMask.');
          return null;
        }
        
        throw txError;
      }

      // Step 4: Wait for transaction confirmation using our RPC
      console.log('Step 4: Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 1,
        timeout: 120000, // 2 minute timeout
      });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain');
      }

      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);

      // Step 5: Parse the AgentRegistered event
      let agentId: bigint | null = null;
      
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: AGENT_REGISTRY_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          if (decoded.eventName === 'AgentRegistered') {
            agentId = (decoded.args as { agentId: bigint }).agentId;
            console.log('🎉 Agent NFT minted! ID:', agentId.toString());
            break;
          }
        } catch {
          continue;
        }
      }

      if (agentId === null) {
        console.log('Agent registered (event parsing skipped)');
        return BigInt(0);
      }

      return agentId;
    } catch (err) {
      // Log the full raw error for debugging
      console.error('❌ Catch Block Error:', err);
      
      // Try to extract more details
      const errObj = err as { code?: number; message?: string; data?: unknown; reason?: string };

      
      const message = getErrorMessage(err);
      setError(message);
      console.error('❌ Failed to register agent:', message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId, agentRegistry, publicClient, walletClient.data]);

  // Report an agent
  const reportAgent = useCallback(async (agentId: bigint): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    if (!walletClient.data) {
      setError('Wallet client not available');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await walletClient.data.writeContract({
        address: agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'reportAgent',
        args: [agentId],
      });
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, agentRegistry, walletClient.data]);

  return {
    registerAgent,
    reportAgent,
    isLoading,
    error,
    contractAddress: agentRegistry,
  };
}

/**
 * Hook to fetch all registered agents from the AgentRegistry
 */
export function useAllAgents() {
  const { agentRegistry } = getContractAddresses();
  const publicClient = usePublicClient();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch total agents count
  const { data: totalAgents, refetch: refetchCount } = useReadContract({
    address: agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getTotalAgents',
    query: {
      enabled: agentRegistry !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Fetch all agents when totalAgents changes
  const fetchAllAgents = useCallback(async () => {
    if (!publicClient || !totalAgents || totalAgents === BigInt(0)) {
      setAgents([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const agentPromises: Promise<Agent | null>[] = [];
      
      for (let i = 0; i < Number(totalAgents); i++) {
        const agentId = BigInt(i);
        
        agentPromises.push(
          publicClient.readContract({
            address: agentRegistry,
            abi: AGENT_REGISTRY_ABI,
            functionName: 'getAgentInfo',
            args: [agentId],
          }).then((data) => {
            if (!data) return null;
            return {
              id: agentId,
              developer: (data as { developer: `0x${string}` }).developer,
              metadataURI: (data as { metadataURI: string }).metadataURI,
              apiEndpoint: (data as { apiEndpoint: string }).apiEndpoint,
              category: (data as { category: number }).category as ContentCategory,
              reportCount: Number((data as { reportCount: bigint }).reportCount),
              reputationScore: Number((data as { reputationScore: bigint }).reputationScore),
              totalTasks: Number((data as { totalTasks: bigint }).totalTasks),
              successfulTasks: Number((data as { successfulTasks: bigint }).successfulTasks),
              registeredAt: Number((data as { registeredAt: bigint }).registeredAt),
              isActive: (data as { isActive: boolean }).isActive,
              isFlagged: (data as { isFlagged: boolean }).isFlagged,
            };
          }).catch(() => null)
        );
      }

      const results = await Promise.all(agentPromises);
      const validAgents = results.filter((a): a is Agent => a !== null);
      setAgents(validAgents);
    } catch (err) {
      setError(getErrorMessage(err));
      console.error('Failed to fetch agents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, totalAgents, agentRegistry]);

  // Auto-fetch when totalAgents changes
  useEffect(() => {
    if (totalAgents !== undefined) {
      fetchAllAgents();
    }
  }, [totalAgents, fetchAllAgents]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await refetchCount();
    await fetchAllAgents();
  }, [refetchCount, fetchAllAgents]);

  return {
    agents,
    totalAgents: totalAgents ? Number(totalAgents) : 0,
    isLoading,
    error,
    refetch,
    fetchAllAgents,
  };
}

/**
 * Hook to interact with the PaymentRouter contract
 */
export function usePaymentRouter() {
  const { paymentRouter, agentRegistry } = getContractAddresses();
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletClient = useWalletClient();

  // Check if user has accepted terms
  const { data: hasAcceptedTerms } = useReadContract({
    address: paymentRouter,
    abi: PAYMENT_ROUTER_ABI,
    functionName: 'hasAcceptedTerms',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && paymentRouter !== '0x0000000000000000000000000000000000000000',
    },
  });


  // Accept terms of service
  const acceptTerms = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    if (!walletClient.data) {
      setError('Wallet client not available');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await walletClient.data.writeContract({
        address: paymentRouter,
        abi: PAYMENT_ROUTER_ABI,
        functionName: 'acceptTerms',
      });
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, paymentRouter, walletClient.data]);

  // Create a new task with escrowed payment
  const createTask = useCallback(async (
    agentId: bigint,
    developerAddress: `0x${string}`,
    deadlineHours: number,
    paymentBNB: string
  ): Promise<bigint | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    if (!walletClient.data) {
      setError('Wallet client not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineHours * 3600);
      const paymentWei = parseEther(paymentBNB);

      const hash = await walletClient.data.writeContract({
        address: paymentRouter,
        abi: PAYMENT_ROUTER_ABI,
        functionName: 'createTask',
        args: [agentId, developerAddress, deadline],
        value: paymentWei,
      });

      console.log('Task creation tx:', hash);
      // Note: In production, parse taskId from transaction receipt logs
      return BigInt(Math.floor(Math.random() * 1000)); // Placeholder
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, paymentRouter, walletClient.data]);

  // Request a refund for a task
  const refundTask = useCallback(async (taskId: bigint): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    if (!walletClient.data) {
      setError('Wallet client not available');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await walletClient.data.writeContract({
        address: paymentRouter,
        abi: PAYMENT_ROUTER_ABI,
        functionName: 'refundTask',
        args: [taskId],
      });
      return true;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, paymentRouter, walletClient.data]);

  return {
    acceptTerms,
    createTask,
    refundTask,
    hasAcceptedTerms: !!hasAcceptedTerms,
    isLoading,
    error,
    contractAddress: paymentRouter,
  };
}

/**
 * Hook to fetch agent data from the registry
 */
export function useAgentData(agentId: bigint | null) {
  const { agentRegistry } = getContractAddresses();

  const { data, isLoading, error, refetch } = useReadContract({
    address: agentRegistry,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getAgentInfo',
    args: agentId !== null ? [agentId] : undefined,
    query: {
      enabled: agentId !== null && agentRegistry !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Transform contract data to Agent type
  const agent: Agent | null = data ? {
    id: agentId!,
    developer: data.developer as `0x${string}`,
    metadataURI: data.metadataURI,
    apiEndpoint: data.apiEndpoint,
    category: data.category as ContentCategory,
    reportCount: Number(data.reportCount),
    reputationScore: Number(data.reputationScore),
    totalTasks: Number(data.totalTasks),
    successfulTasks: Number(data.successfulTasks),
    registeredAt: Number(data.registeredAt),
    isActive: data.isActive,
    isFlagged: data.isFlagged,
  } : null;

  return {
    agent,
    isLoading,
    error: error ? getErrorMessage(error) : null,
    refetch,
  };
}

/**
 * Hook to fetch task data from PaymentRouter
 */
export function useTaskData(taskId: bigint | null) {
  const { paymentRouter } = getContractAddresses();

  const { data, isLoading, error, refetch } = useReadContract({
    address: paymentRouter,
    abi: PAYMENT_ROUTER_ABI,
    functionName: 'getTask',
    args: taskId !== null ? [taskId] : undefined,
    query: {
      enabled: taskId !== null && paymentRouter !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Check if refund is available
  const { data: isRefundAvailable } = useReadContract({
    address: paymentRouter,
    abi: PAYMENT_ROUTER_ABI,
    functionName: 'isRefundAvailable',
    args: taskId !== null ? [taskId] : undefined,
    query: {
      enabled: taskId !== null && paymentRouter !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Transform contract data to Task type
  const task: Task | null = data ? {
    id: taskId!,
    agentId: BigInt(data.agentId),
    client: data.client as `0x${string}`,
    developer: data.developer as `0x${string}`,
    payment: BigInt(data.payment),
    platformFee: BigInt(data.platformFee),
    deadline: Number(data.deadline),
    createdAt: Number(data.createdAt),
    status: data.status,
    tosAccepted: data.tosAccepted,
  } : null;

  return {
    task,
    isRefundAvailable: !!isRefundAvailable,
    isLoading,
    error: error ? getErrorMessage(error) : null,
    refetch,
  };
}
