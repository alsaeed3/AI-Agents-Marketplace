'use client';

import { useCallback, useState, useEffect } from 'react';
import { 
  useWriteContract, 
  useReadContract, 
  useWaitForTransactionReceipt,
  useAccount,
  usePublicClient
} from 'wagmi';
import { parseEther, decodeEventLog, type Log } from 'viem';
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
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  const { writeContractAsync } = useWriteContract();

  // Register a new agent - mints ERC721 NFT
  const registerAgent = useCallback(async (
    metadataURI: string,
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

    setIsLoading(true);
    setError(null);

    try {
      // Send the transaction to register agent (mints NFT)
      const hash = await writeContractAsync({
        address: agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'registerAgent',
        args: [metadataURI, category],
      });

      console.log('Agent registration tx submitted:', hash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash,
        confirmations: 1,
      });

      console.log('Transaction confirmed:', receipt);

      // Find the AgentRegistered event in the logs
      let agentId: bigint | null = null;
      
      for (const log of receipt.logs) {
        try {
          // Try to decode as AgentRegistered event
          const decoded = decodeEventLog({
            abi: AGENT_REGISTRY_ABI,
            data: log.data,
            topics: log.topics,
          });
          
          if (decoded.eventName === 'AgentRegistered') {
            agentId = (decoded.args as { agentId: bigint }).agentId;
            console.log('Agent NFT minted successfully! Agent ID:', agentId.toString());
            break;
          }
        } catch {
          // Not an AgentRegistered event, continue
          continue;
        }
      }

      if (agentId === null) {
        // Fallback: if we can't parse the event, the tx was still successful
        // Return a success indicator - the UI can refetch agents list
        console.log('Agent registered successfully (could not parse event log)');
        return BigInt(0);
      }

      return agentId;
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      console.error('Failed to register agent:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, agentRegistry, writeContractAsync, publicClient]);

  // Report an agent
  const reportAgent = useCallback(async (agentId: bigint): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await writeContractAsync({
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
  }, [address, agentRegistry, writeContractAsync]);

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

  const { writeContractAsync } = useWriteContract();

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

    setIsLoading(true);
    setError(null);

    try {
      await writeContractAsync({
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
  }, [address, paymentRouter, writeContractAsync]);

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

    setIsLoading(true);
    setError(null);

    try {
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineHours * 3600);
      const paymentWei = parseEther(paymentBNB);

      const hash = await writeContractAsync({
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
  }, [address, paymentRouter, writeContractAsync]);

  // Request a refund for a task
  const refundTask = useCallback(async (taskId: bigint): Promise<boolean> => {
    if (!address) {
      setError('Wallet not connected');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await writeContractAsync({
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
  }, [address, paymentRouter, writeContractAsync]);

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
