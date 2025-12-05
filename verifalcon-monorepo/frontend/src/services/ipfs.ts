/**
 * IPFS Service for Agent Metadata Upload
 * 
 * Uses Pinata as the IPFS pinning service.
 * Supports uploading JSON metadata and images.
 */

// Pinata API configuration
const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || '';
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || '';
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

// IPFS gateway for fetching
export const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export interface AgentIPFSMetadata {
  name: string;
  description: string;
  image?: string; // IPFS URI or data URL
  category: string;
  developer: string;
  capabilities?: string[];
  pricing?: {
    baseRate: string;
    currency: 'BNB' | 'ETH';
  };
  version?: string;
  createdAt: string;
}

/**
 * Check if Pinata is configured
 */
export function isPinataConfigured(): boolean {
  return !!(PINATA_JWT || (PINATA_API_KEY && PINATA_SECRET_KEY));
}

/**
 * Upload JSON metadata to IPFS via Pinata
 */
export async function uploadMetadataToIPFS(
  metadata: AgentIPFSMetadata
): Promise<{ success: boolean; ipfsHash?: string; ipfsUri?: string; error?: string }> {
  if (!isPinataConfigured()) {
    // Fallback to data URI if Pinata is not configured
    console.log('Pinata not configured, using data URI fallback');
    const dataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
    return { success: true, ipfsUri: dataUri };
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PINATA_JWT
          ? { Authorization: `Bearer ${PINATA_JWT}` }
          : {
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_SECRET_KEY,
            }),
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `AI Agent: ${metadata.name}`,
          keyvalues: {
            type: 'ai-agent-metadata',
            category: metadata.category,
            developer: metadata.developer,
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.details || 'Failed to upload to IPFS');
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    const ipfsUri = `ipfs://${ipfsHash}`;

    console.log('Metadata uploaded to IPFS:', ipfsUri);
    return { success: true, ipfsHash, ipfsUri };
  } catch (error) {
    console.error('IPFS upload failed:', error);
    // Fallback to data URI
    const dataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;
    return { success: true, ipfsUri: dataUri, error: 'IPFS failed, using data URI' };
  }
}

/**
 * Upload an image file to IPFS
 */
export async function uploadImageToIPFS(
  file: File
): Promise<{ success: boolean; ipfsHash?: string; ipfsUri?: string; error?: string }> {
  if (!isPinataConfigured()) {
    // Fallback to data URL if Pinata is not configured
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ success: true, ipfsUri: reader.result as string });
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };
      reader.readAsDataURL(file);
    });
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'pinataMetadata',
      JSON.stringify({
        name: `AI Agent Avatar: ${file.name}`,
        keyvalues: {
          type: 'ai-agent-avatar',
        },
      })
    );
    formData.append(
      'pinataOptions',
      JSON.stringify({
        cidVersion: 1,
      })
    );

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        ...(PINATA_JWT
          ? { Authorization: `Bearer ${PINATA_JWT}` }
          : {
              pinata_api_key: PINATA_API_KEY,
              pinata_secret_api_key: PINATA_SECRET_KEY,
            }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.details || 'Failed to upload image to IPFS');
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    const ipfsUri = `ipfs://${ipfsHash}`;

    console.log('Image uploaded to IPFS:', ipfsUri);
    return { success: true, ipfsHash, ipfsUri };
  } catch (error) {
    console.error('Image upload to IPFS failed:', error);
    // Fallback to data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ success: true, ipfsUri: reader.result as string, error: 'IPFS failed, using data URL' });
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Fetch metadata from IPFS
 */
export async function fetchMetadataFromIPFS(
  ipfsUri: string
): Promise<AgentIPFSMetadata | null> {
  try {
    let url: string;

    if (ipfsUri.startsWith('data:application/json;base64,')) {
      // Decode data URI
      const base64 = ipfsUri.replace('data:application/json;base64,', '');
      const json = atob(base64);
      return JSON.parse(json);
    } else if (ipfsUri.startsWith('ipfs://')) {
      // Convert IPFS URI to gateway URL
      const hash = ipfsUri.replace('ipfs://', '');
      url = `${IPFS_GATEWAY}${hash}`;
    } else if (ipfsUri.startsWith('http')) {
      url = ipfsUri;
    } else {
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch from IPFS');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch metadata from IPFS:', error);
    return null;
  }
}

/**
 * Get gateway URL for IPFS image
 */
export function getIPFSImageUrl(ipfsUri: string): string {
  if (ipfsUri.startsWith('ipfs://')) {
    const hash = ipfsUri.replace('ipfs://', '');
    return `${IPFS_GATEWAY}${hash}`;
  }
  return ipfsUri; // Already a URL or data URI
}
