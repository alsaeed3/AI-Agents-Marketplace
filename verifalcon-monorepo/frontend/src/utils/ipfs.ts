import { AgentMetadata } from '@/types';

// Cache for agent metadata
const metadataCache: Record<string, AgentMetadata | null> = {};

// IPFS gateways to try (in order of preference)
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

// Check if an IPFS hash looks like a valid CID (not a placeholder)
export function isValidIpfsHash(hash: string): boolean {
  // Valid CIDs are typically 46+ characters starting with Qm (v0) or ba (v1)
  // Placeholder hashes like 'QmAgent0' are too short
  if (hash.length < 20) return false;
  if (hash.startsWith('Qm') && hash.length >= 46) return true;
  if (hash.startsWith('ba') && hash.length >= 59) return true;
  return false;
}

// Fetch with timeout helper
async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Parse metadata from URI (handles data URIs and IPFS)
export async function fetchAgentMetadata(metadataURI: string): Promise<AgentMetadata | null> {
  if (!metadataURI) return null;

  // Check cache first
  if (metadataCache[metadataURI] !== undefined) {
    return metadataCache[metadataURI];
  }

  try {
    let jsonData: string;

    if (metadataURI.startsWith('data:application/json;base64,')) {
      // Decode base64 data URI
      const base64 = metadataURI.replace('data:application/json;base64,', '');
      jsonData = atob(base64);
    } else if (metadataURI.startsWith('ipfs://')) {
      // Fetch from IPFS gateway with fallbacks
      const ipfsHash = metadataURI.replace('ipfs://', '');
      
      // Skip placeholder/invalid IPFS hashes silently
      if (!isValidIpfsHash(ipfsHash)) {
        metadataCache[metadataURI] = null;
        return null;
      }
      
      // Try multiple gateways
      let lastError: Error | null = null;
      let success = false;
      
      for (const gateway of IPFS_GATEWAYS) {
        try {
          const response = await fetchWithTimeout(`${gateway}${ipfsHash}`, 5000);
          if (response.ok) {
            jsonData = await response.text();
            success = true;
            break;
          }
        } catch (err) {
          lastError = err as Error;
          // Continue to next gateway
        }
      }
      
      // If no gateway succeeded, throw
      if (!success) {
        throw lastError || new Error('All IPFS gateways failed');
      }
    } else if (metadataURI.startsWith('http')) {
      // Fetch from HTTP URL with timeout
      const response = await fetchWithTimeout(metadataURI, 5000);
      if (!response.ok) throw new Error('HTTP fetch failed');
      jsonData = await response.text();
    } else {
      return null;
    }

    const metadata = JSON.parse(jsonData!) as AgentMetadata;
    metadataCache[metadataURI] = metadata;
    return metadata;
  } catch (err) {
    // Only log real errors, not expected failures for mock data
    if (err instanceof Error && !err.message.includes('abort')) {
      console.warn('Failed to fetch metadata for', metadataURI.substring(0, 30) + '...');
    }
    metadataCache[metadataURI] = null;
    return null;
  }
}
