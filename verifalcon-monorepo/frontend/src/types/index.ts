/**
 * @file TypeScript Type Definitions for Decentralized AI Agent Marketplace
 * @description Strict type definitions for Agent, Task, and PaymentStatus
 * @notice NO `any` types allowed - TypeScript strict mode enforced
 */

// ============ ENUMS ============

/**
 * Content categories for AI agents (mirrors Solidity enum)
 * Used for legal compliance - all agents must be categorized
 */
export enum ContentCategory {
  Code = 0,
  Image = 1,
  Data = 2,
  Text = 3,
  Audio = 4,
}

/**
 * Human-readable content category labels
 */
export const ContentCategoryLabels: Record<ContentCategory, string> = {
  [ContentCategory.Code]: 'Code Generation',
  [ContentCategory.Image]: 'Image Analysis',
  [ContentCategory.Data]: 'Data Processing',
  [ContentCategory.Text]: 'Text Generation',
  [ContentCategory.Audio]: 'Audio Processing',
};

/**
 * Task status (mirrors Solidity enum in PaymentRouter)
 */
export enum TaskStatus {
  Pending = 0,
  InProgress = 1,
  Completed = 2,
  Refunded = 3,
  Disputed = 4,
}

/**
 * Human-readable task status labels
 */
export const TaskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.Pending]: 'Pending',
  [TaskStatus.InProgress]: 'In Progress',
  [TaskStatus.Completed]: 'Completed',
  [TaskStatus.Refunded]: 'Refunded',
  [TaskStatus.Disputed]: 'Disputed',
};

/**
 * Payment status for UI display
 */
export enum PaymentStatus {
  Unpaid = 'unpaid',
  Escrowed = 'escrowed',
  Released = 'released',
  Refunded = 'refunded',
}

// ============ CORE INTERFACES ============

/**
 * Ethereum address type (0x-prefixed hex string)
 */
export type Address = `0x${string}`;

/**
 * AI Agent registered in the marketplace
 * Corresponds to AgentInfo struct in AgentRegistry.sol
 */
export interface Agent {
  /** Unique identifier (ERC721 tokenId) */
  id: bigint;
  /** Address of the developer who registered the agent */
  developer: Address;
  /** IPFS/HTTP URI pointing to agent metadata */
  metadataURI: string;
  /** Content category for legal compliance */
  category: ContentCategory;
  /** Number of community reports */
  reportCount: number;
  /** Reputation score (starts at 100) */
  reputationScore: number;
  /** Total tasks completed */
  totalTasks: number;
  /** Successfully completed tasks */
  successfulTasks: number;
  /** Unix timestamp of registration */
  registeredAt: number;
  /** Whether agent can accept new tasks */
  isActive: boolean;
  /** Whether agent has been flagged by moderators */
  isFlagged: boolean;
}

/**
 * Extended agent metadata (stored off-chain, e.g., IPFS)
 */
export interface AgentMetadata {
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Avatar/icon URL */
  imageUrl: string;
  /** Detailed capabilities */
  capabilities: string[];
  /** Supported input types */
  inputTypes: string[];
  /** Expected output format */
  outputType: string;
  /** Pricing info */
  pricing: {
    baseRate: string;
    currency: 'BNB' | 'ETH';
  };
  /** Version string */
  version: string;
}

/**
 * Task created in the payment router
 * Corresponds to Task struct in PaymentRouter.sol
 */
export interface Task {
  /** Unique task identifier */
  id: bigint;
  /** Agent ID being used */
  agentId: bigint;
  /** Client who created the task */
  client: Address;
  /** Developer receiving payment */
  developer: Address;
  /** Payment amount in wei */
  payment: bigint;
  /** Platform fee in wei */
  platformFee: bigint;
  /** Task deadline (Unix timestamp) */
  deadline: number;
  /** Task creation timestamp */
  createdAt: number;
  /** Current task status */
  status: TaskStatus;
  /** Whether ToS was accepted */
  tosAccepted: boolean;
}

/**
 * Task with computed properties for UI display
 */
export interface TaskWithAgent extends Task {
  /** Associated agent data */
  agent: Agent;
  /** Computed payment status */
  paymentStatus: PaymentStatus;
  /** Time remaining until deadline (seconds) */
  timeRemaining: number;
  /** Whether refund is available */
  canRefund: boolean;
}

// ============ CONTRACT INTERACTION TYPES ============

/**
 * Parameters for registering a new agent
 */
export interface RegisterAgentParams {
  metadataURI: string;
  category: ContentCategory;
}

/**
 * Parameters for creating a new task
 */
export interface CreateTaskParams {
  agentId: bigint;
  developer: Address;
  deadline: number;
  paymentAmount: bigint;
}

/**
 * Contract transaction result
 */
export interface TransactionResult {
  hash: Address;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: number;
  error?: string;
}

// ============ UI STATE TYPES ============

/**
 * Error state for contract interactions
 */
export interface ContractError {
  /** Error code from contract */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Original error for debugging */
  originalError?: unknown;
}

/**
 * Terms of Service acceptance state
 */
export interface TermsAcceptance {
  /** Version that was accepted */
  version: string;
  /** Whether currently accepted */
  accepted: boolean;
  /** Timestamp of acceptance */
  acceptedAt?: number;
}

/**
 * Chat message in agent terminal
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Message sender role */
  role: 'user' | 'agent' | 'system';
  /** Message content */
  content: string;
  /** Timestamp */
  timestamp: number;
  /** Whether message is still loading */
  isLoading?: boolean;
}

/**
 * Agent terminal session state
 */
export interface TerminalSession {
  /** Current task ID */
  taskId: bigint | null;
  /** Agent being used */
  agent: Agent | null;
  /** Chat history */
  messages: ChatMessage[];
  /** Whether waiting for agent response */
  isWaiting: boolean;
  /** Response timeout timer */
  timeoutSeconds: number;
  /** Whether refund button should show */
  showRefundButton: boolean;
}

// ============ FILTER & SORT TYPES ============

/**
 * Marketplace filter options
 */
export interface MarketplaceFilters {
  category?: ContentCategory;
  minReputation?: number;
  showFlagged?: boolean;
  showInactive?: boolean;
  searchQuery?: string;
}

/**
 * Sort options for marketplace
 */
export type MarketplaceSortBy = 
  | 'reputation-desc'
  | 'reputation-asc'
  | 'tasks-desc'
  | 'newest'
  | 'oldest';

// ============ HELPER FUNCTIONS ============

/**
 * Convert wei to display amount
 */
export function formatWei(wei: bigint, decimals = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = wei / divisor;
  const fraction = wei % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fractionStr}`;
}

/**
 * Get human-readable error message from contract error
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    
    // Check for common error patterns
    if (err.reason && typeof err.reason === 'string') {
      return mapContractError(err.reason);
    }
    if (err.message && typeof err.message === 'string') {
      return mapContractError(err.message);
    }
    if (err.shortMessage && typeof err.shortMessage === 'string') {
      return err.shortMessage;
    }
  }
  
  return 'An unexpected error occurred';
}

/**
 * Map contract error codes to human-readable messages
 */
function mapContractError(message: string): string {
  const errorMap: Record<string, string> = {
    'Must accept current Terms of Service': 'Please accept the Terms of Service before proceeding',
    'Payment required': 'Payment amount is required',
    'Invalid developer address': 'Invalid agent developer address',
    'Deadline must be in future': 'Please select a future deadline',
    'Task does not exist': 'This task could not be found',
    'Task not pending': 'This task has already been started',
    'Task not refundable': 'This task cannot be refunded',
    'Refund not yet available': 'Refund is not available yet. Please wait for the timeout.',
    'Agent does not exist': 'This agent could not be found',
    'Cannot report own agent': 'You cannot report your own agent',
    'Agent is not flagged': 'This agent is not currently flagged',
    'Cannot activate flagged agent': 'Flagged agents cannot be activated',
    'Payout transfer failed': 'Payment transfer failed. Please try again.',
    'Refund transfer failed': 'Refund transfer failed. Please try again.',
    'insufficient funds': 'Insufficient wallet balance',
    'user rejected': 'Transaction was rejected',
  };
  
  for (const [key, value] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return message;
}

/**
 * Compute payment status from task
 */
export function computePaymentStatus(task: Task): PaymentStatus {
  switch (task.status) {
    case TaskStatus.Refunded:
      return PaymentStatus.Refunded;
    case TaskStatus.Completed:
      return PaymentStatus.Released;
    case TaskStatus.Pending:
    case TaskStatus.InProgress:
    case TaskStatus.Disputed:
      return PaymentStatus.Escrowed;
    default:
      return PaymentStatus.Unpaid;
  }
}
