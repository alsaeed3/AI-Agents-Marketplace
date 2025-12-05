'use client';

import { useCallback, useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import {
  Agent,
  RemoteTaskResult,
  ExternalAgentResponse,
  getErrorMessage,
} from '@/types';
import {
  AGENT_REGISTRY_ABI,
  PAYMENT_ROUTER_ABI,
  getContractAddresses,
} from './useContracts';

/**
 * useAgentInteraction Hook
 * 
 * Implements the atomic "Pay-for-API" pattern for BYOA (Bring Your Own Agent):
 * 1. Pre-flight validation (agent active, not flagged)
 * 2. Payment via PaymentRouter (x402 escrow)
 * 3. API call with payment headers (X-Payment-Tx, X-Client-Address)
 * 4. Reputation update on success (ERC-8004)
 * 
 * @author VeriFalcon Team
 */
export function useAgentInteraction() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { agentRegistry, paymentRouter } = getContractAddresses();

  /**
   * Validate that an agent is available for tasks
   */
  const validateAgent = useCallback(async (agentId: bigint): Promise<{
    isValid: boolean;
    agent?: Agent;
    error?: string;
  }> => {
    if (!publicClient) {
      return { isValid: false, error: 'Network not available' };
    }

    try {
      // Check if agent is available (active and not flagged)
      const isAvailable = await publicClient.readContract({
        address: agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'isAgentAvailable',
        args: [agentId],
      });

      if (!isAvailable) {
        return { isValid: false, error: 'Agent is not available (inactive or flagged)' };
      }

      // Get agent info for API endpoint
      const data = await publicClient.readContract({
        address: agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: 'getAgentInfo',
        args: [agentId],
      }) as {
        developer: `0x${string}`;
        metadataURI: string;
        apiEndpoint: string;
        category: number;
        reportCount: bigint;
        reputationScore: bigint;
        totalTasks: bigint;
        successfulTasks: bigint;
        registeredAt: bigint;
        isActive: boolean;
        isFlagged: boolean;
      };

      if (!data.apiEndpoint || !data.apiEndpoint.startsWith('https://')) {
        return { isValid: false, error: 'Agent does not have a valid API endpoint' };
      }

      const agent: Agent = {
        id: agentId,
        developer: data.developer,
        metadataURI: data.metadataURI,
        apiEndpoint: data.apiEndpoint,
        category: data.category,
        reportCount: Number(data.reportCount),
        reputationScore: Number(data.reputationScore),
        totalTasks: Number(data.totalTasks),
        successfulTasks: Number(data.successfulTasks),
        registeredAt: Number(data.registeredAt),
        isActive: data.isActive,
        isFlagged: data.isFlagged,
      };

      return { isValid: true, agent };
    } catch (err) {
      return { isValid: false, error: getErrorMessage(err) };
    }
  }, [publicClient, agentRegistry]);

  /**
   * Execute a secure fetch to external agent API with payment headers
   */
  const secureFetch = async (
    apiEndpoint: string,
    txHash: `0x${string}`,
    clientAddress: `0x${string}`,
    inputData: unknown
  ): Promise<ExternalAgentResponse> => {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Tx': txHash,
        'X-Client-Address': clientAddress,
      },
      body: JSON.stringify(inputData),
    });

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 404) {
        throw new Error('Agent API endpoint not found (404). Consider requesting a refund.');
      } else if (response.status >= 500) {
        throw new Error(`Agent API server error (${response.status}). Consider requesting a refund.`);
      } else {
        throw new Error(`Agent API request failed with status ${response.status}`);
      }
    }

    const data = await response.json();
    return data as ExternalAgentResponse;
  };

  /**
   * Execute a remote task atomically:
   * 1. Pre-flight validation
   * 2. On-chain payment (escrow)
   * 3. External API call with payment proof headers
   * 4. Reputation update on success
   */
  const executeRemoteTask = useCallback(async (
    agentId: bigint,
    inputData: unknown,
    paymentBNB: string = '0.01',
    deadlineHours: number = 1
  ): Promise<RemoteTaskResult> => {
    if (!address) {
      return { success: false, txHash: '0x0', taskId: BigInt(0), error: 'Wallet not connected' };
    }

    if (!publicClient) {
      return { success: false, txHash: '0x0', taskId: BigInt(0), error: 'Network not available' };
    }

    setIsLoading(true);
    setError(null);

    try {
      // ========== STEP 1: PRE-FLIGHT VALIDATION ==========
      console.log('[BYOA] Step 1: Validating agent...');
      const validation = await validateAgent(agentId);
      
      if (!validation.isValid || !validation.agent) {
        throw new Error(validation.error || 'Agent validation failed');
      }

      const agent = validation.agent;
      console.log('[BYOA] Agent validated:', agent.apiEndpoint);

      // ========== STEP 2: ON-CHAIN PAYMENT ==========
      console.log('[BYOA] Step 2: Creating payment escrow...');
      const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineHours * 3600);
      const paymentWei = parseEther(paymentBNB);

      const txHash = await writeContractAsync({
        address: paymentRouter,
        abi: PAYMENT_ROUTER_ABI,
        functionName: 'createTask',
        args: [agentId, agent.developer, deadline],
        value: paymentWei,
      });

      console.log('[BYOA] Payment tx submitted:', txHash);

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      console.log('[BYOA] Payment confirmed in block:', receipt.blockNumber);

      // Parse task ID from logs (simplified - in production parse TaskCreated event)
      const taskId = BigInt(0); // Placeholder - should parse from receipt.logs

      // ========== STEP 3: EXTERNAL API CALL ==========
      console.log('[BYOA] Step 3: Calling external API with payment proof...');
      
      const apiResponse = await secureFetch(
        agent.apiEndpoint,
        txHash,
        address,
        inputData
      );

      console.log('[BYOA] API response received:', apiResponse.success);

      // ========== STEP 4: SUCCESS - Could trigger reputation update here ==========
      // Note: In production, the operator/backend would call completeTask
      // which triggers reputation update. This is handled server-side.
      console.log('[BYOA] Task completed successfully!');

      return {
        success: true,
        txHash,
        taskId,
        apiResponse,
      };

    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('[BYOA] Error:', errorMessage);
      
      return {
        success: false,
        txHash: '0x0',
        taskId: BigInt(0),
        error: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, writeContractAsync, paymentRouter, validateAgent]);

  /**
   * Check if a refund is available for a task
   */
  const checkRefundAvailable = useCallback(async (taskId: bigint): Promise<boolean> => {
    if (!publicClient) return false;

    try {
      const isAvailable = await publicClient.readContract({
        address: paymentRouter,
        abi: PAYMENT_ROUTER_ABI,
        functionName: 'isRefundAvailable',
        args: [taskId],
      });
      return Boolean(isAvailable);
    } catch {
      return false;
    }
  }, [publicClient, paymentRouter]);

  /**
   * Request a refund for a failed task
   */
  const requestRefund = useCallback(async (taskId: bigint): Promise<boolean> => {
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
      setError(getErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, writeContractAsync, paymentRouter]);

  return {
    executeRemoteTask,
    validateAgent,
    checkRefundAvailable,
    requestRefund,
    isLoading,
    error,
  };
}

export default useAgentInteraction;
