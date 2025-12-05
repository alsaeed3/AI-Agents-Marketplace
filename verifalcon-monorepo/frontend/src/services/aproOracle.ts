import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { bscTestnet } from 'viem/chains';
import APRO_OracleABI from '@/abis/APRO_Oracle.json';

const ORACLE_ADDRESS = process.env.NEXT_PUBLIC_APRO_ORACLE_ADDRESS as `0x${string}`;

// Create a public client for reading from the blockchain
const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(),
});

export interface OracleVerificationResult {
  status: 'valid' | 'stolen' | 'fake' | 'unknown' | 'error';
  model?: string;
  requestId?: string;
}

/**
 * Calls the APRO Oracle to verify a serial number
 * This function interacts with the on-chain oracle contract
 */
export async function verifySerialWithOracle(
  serialNumber: string
): Promise<OracleVerificationResult> {
  try {
    if (!ORACLE_ADDRESS) {
      console.warn('APRO Oracle address not configured, falling back to mock data');
      return fallbackToMockVerification(serialNumber);
    }

    // Request verification from the oracle
    // Note: In a real implementation, this would be a write operation that requires a wallet
    // For now, we'll use the mock database as the oracle's data source
    // In production, the oracle would query an external API or database
    
    return await fallbackToMockVerification(serialNumber);
    
  } catch (error) {
    console.error('Error calling APRO Oracle:', error);
    return {
      status: 'error',
    };
  }
}

/**
 * Fallback to mock database verification
 * In production, this would be replaced by actual oracle contract calls
 */
async function fallbackToMockVerification(
  serialNumber: string
): Promise<OracleVerificationResult> {
  try {
    // Import the mock database
    const mockDatabase = await import('@/../../data/mock_database.json');
    const data = mockDatabase.default;
    
    const validSerials: { [key: string]: string } = data.valid_serials || {};
    const stolenSerials: string[] = data.stolen_serials || [];
    const fakeSerials: string[] = data.fake_serials || [];

    if (validSerials[serialNumber]) {
      return {
        status: 'valid',
        model: validSerials[serialNumber],
      };
    } else if (stolenSerials.includes(serialNumber)) {
      return {
        status: 'stolen',
      };
    } else if (fakeSerials.includes(serialNumber)) {
      return {
        status: 'fake',
      };
    } else {
      return {
        status: 'unknown',
      };
    }
  } catch (error) {
    console.error('Error in fallback verification:', error);
    return {
      status: 'error',
    };
  }
}

/**
 * Listen for oracle responses
 * This would be used to monitor when the oracle returns results
 */
export async function listenForOracleResponse(requestId: bigint): Promise<{
  isValid: boolean;
  isStolen: boolean;
}> {
  // In a real implementation, this would watch for the OracleResponse event
  // For now, return a placeholder
  return {
    isValid: false,
    isStolen: false,
  };
}
