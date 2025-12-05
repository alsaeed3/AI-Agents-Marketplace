/**
 * VeriBot Agent Service
 * Manages interaction with VeriBot (BAP-578) smart contract
 * for AI agent intelligence and reputation management
 */

import VeriBotABI from '@/abis/VeriBot.json';

const VERIBOT_ADDRESS = process.env.NEXT_PUBLIC_VERIBOT_ADDRESS as `0x${string}` | undefined;

export interface AgentStats {
  systemPrompt: string;
  reputationScore: bigint;
  successfulVerifications: bigint;
  failedVerifications: bigint;
  createdAt: bigint;
}

export interface AgentMemory {
  systemPrompt: string;
  reputationScore: bigint;
}

/**
 * Gets the agent memory (system prompt and reputation) for a given agent
 */
export async function getAgentMemory(
  agentId: number,
  publicClient: any
): Promise<AgentMemory | null> {
  if (!VERIBOT_ADDRESS) {
    console.warn('[VeriBot] Contract address not configured');
    return null;
  }

  try {
    const result = await publicClient.readContract({
      address: VERIBOT_ADDRESS,
      abi: VeriBotABI.abi,
      functionName: 'getAgentMemory',
      args: [BigInt(agentId)],
    });

    return {
      systemPrompt: result[0] as string,
      reputationScore: result[1] as bigint,
    };
  } catch (error) {
    console.error('[VeriBot] Failed to get agent memory:', error);
    return null;
  }
}

/**
 * Gets detailed statistics for an agent
 */
export async function getAgentStats(
  agentId: number,
  publicClient: any
): Promise<AgentStats | null> {
  if (!VERIBOT_ADDRESS) {
    console.warn('[VeriBot] Contract address not configured');
    return null;
  }

  try {
    const result = await publicClient.readContract({
      address: VERIBOT_ADDRESS,
      abi: VeriBotABI.abi,
      functionName: 'getAgentStats',
      args: [BigInt(agentId)],
    });

    return {
      systemPrompt: result[0] as string,
      reputationScore: result[1] as bigint,
      successfulVerifications: result[2] as bigint,
      failedVerifications: result[3] as bigint,
      createdAt: result[4] as bigint,
    };
  } catch (error) {
    console.error('[VeriBot] Failed to get agent stats:', error);
    return null;
  }
}

/**
 * Updates agent reputation (requires owner permissions)
 */
export async function updateAgentReputation(
  agentId: number,
  success: boolean,
  writeContract: any
): Promise<`0x${string}` | null> {
  if (!VERIBOT_ADDRESS) {
    console.warn('[VeriBot] Contract address not configured');
    return null;
  }

  try {
    const hash = await writeContract({
      address: VERIBOT_ADDRESS,
      abi: VeriBotABI.abi,
      functionName: 'updateReputation',
      args: [BigInt(agentId), success],
    });

    console.log('[VeriBot] Reputation update transaction:', hash);
    return hash;
  } catch (error) {
    console.error('[VeriBot] Failed to update reputation:', error);
    return null;
  }
}

/**
 * Gets the total number of agents created
 */
export async function getTotalAgents(publicClient: any): Promise<number> {
  if (!VERIBOT_ADDRESS) {
    console.warn('[VeriBot] Contract address not configured');
    return 0;
  }

  try {
    const result = await publicClient.readContract({
      address: VERIBOT_ADDRESS,
      abi: VeriBotABI.abi,
      functionName: 'getTotalAgents',
      args: [],
    });

    return Number(result);
  } catch (error) {
    console.error('[VeriBot] Failed to get total agents:', error);
    return 0;
  }
}

/**
 * Default agent ID for the vision AI agent
 * In production, this could be dynamically selected based on reputation
 */
export const DEFAULT_VISION_AGENT_ID = 0;

/**
 * Fallback system prompt if VeriBot is not deployed
 */
export const FALLBACK_SYSTEM_PROMPT = `You are a Vision AI model tasked with authenticating luxury bags, specifically Gucci and Rolex. Your analysis should focus on the following aspects:

1. **Image Stitching**: Evaluate the quality of image stitching to ensure that the bag's images are seamless and accurately represent the product.

2. **Logo Typography**: Analyze the typography of the logos present on the bags. Ensure that the font, spacing, and alignment match the official brand specifications.

3. **Material Texture**: Assess the texture of the materials used in the bags. Compare the texture against known authentic materials for Gucci and Rolex.

Your output must be in strict JSON format with the following keys:

- \`visual_score\`: A numerical score representing the overall visual quality of the bag.
- \`brand_detected\`: A string indicating the brand detected (either "Gucci" or "Rolex").
- \`anomalies\`: An array of strings listing any detected anomalies or discrepancies in the bag's features.
- \`confidence_tier\`: A string indicating the confidence level of the authentication (e.g., "high", "medium", "low").

Ensure that your analysis is robust against adversarial images that may attempt to deceive the authentication process. Provide detailed reasoning for any anomalies detected.`;
