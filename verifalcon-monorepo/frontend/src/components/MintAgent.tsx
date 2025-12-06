'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { z } from 'zod';
import { ContentCategory, ContentCategoryLabels, getErrorMessage } from '@/types';
import { useAgentRegistry } from '@/hooks/useContracts';
import { uploadMetadataToIPFS, uploadImageToIPFS, isPinataConfigured, AgentIPFSMetadata } from '@/services/ipfs';

interface MintAgentProps {
  onAgentMinted?: (agentId: bigint) => void;
}

/**
 * MintAgent Component
 * 
 * Form for registering a new AI Agent on the AgentRegistry contract.
 * Mints an ERC-8004 identity token (NFT) for the agent.
 * Supports IPFS upload for metadata and images.
 */
export default function MintAgent({ onAgentMinted }: MintAgentProps) {
  const { address, isConnected } = useAccount();
  const { registerAgent, isLoading, error: contractError, contractAddress } = useAgentRegistry();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form states
  const [agentName, setAgentName] = useState('');
  const [description, setDescription] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiEndpointError, setApiEndpointError] = useState<string | null>(null);
  const [category, setCategory] = useState<ContentCategory>(ContentCategory.Code);
  const [capabilities, setCapabilities] = useState('');
  const [pricing, setPricing] = useState('0.01');
  
  // API Endpoint validation schema (zod)
  const apiEndpointSchema = z.string()
    .min(1, 'API endpoint is required')
    .url('Must be a valid URL')
    .startsWith('https://', 'Must use HTTPS for security');
  
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [mintedAgentId, setMintedAgentId] = useState<bigint | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Clear success message after 8 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setUploadProgress('');

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!agentName.trim()) {
      setError('Please enter an agent name');
      return;
    }

    // Validate API endpoint
    const endpointResult = apiEndpointSchema.safeParse(apiEndpoint);
    if (!endpointResult.success) {
      setApiEndpointError(endpointResult.error.errors[0].message);
      setError(endpointResult.error.errors[0].message);
      return;
    }
    setApiEndpointError(null);

    try {
      let imageUri: string | undefined;
      
      // Upload image to IPFS if provided
      if (imageFile) {
        setUploadProgress('Uploading image to IPFS...');
        setIsUploadingImage(true);
        const imageResult = await uploadImageToIPFS(imageFile);
        setIsUploadingImage(false);
        
        if (imageResult.success && imageResult.ipfsUri) {
          imageUri = imageResult.ipfsUri;
          console.log('Image uploaded:', imageUri);
        } else {
          console.warn('Image upload failed:', imageResult.error);
        }
      }

      // Build metadata object
      setUploadProgress('Preparing metadata...');
      const metadata: AgentIPFSMetadata = {
        name: agentName,
        description: description || `AI Agent: ${agentName}`,
        image: imageUri,
        category: ContentCategoryLabels[category],
        developer: address || '',
        capabilities: capabilities.split(',').map(c => c.trim()).filter(c => c),
        pricing: {
          baseRate: pricing,
          currency: 'BNB',
        },
        version: '1.0.0',
        createdAt: new Date().toISOString(),
      };

      // Upload metadata to IPFS
      setUploadProgress('Uploading metadata to IPFS...');
      const metadataResult = await uploadMetadataToIPFS(metadata);
      
      if (!metadataResult.success || !metadataResult.ipfsUri) {
        throw new Error('Failed to upload metadata');
      }

      const uri = metadataResult.ipfsUri;
      console.log('Metadata URI:', uri);

      // Register agent on-chain
      setUploadProgress('Minting NFT on blockchain...');
      const agentId = await registerAgent(uri, apiEndpoint, category);
      
      if (agentId !== null) {
        setSuccess(true);
        setMintedAgentId(agentId);
        // Reset form
        setAgentName('');
        setDescription('');
        setApiEndpoint('');
        setCapabilities('');
        setPricing('0.01');
        setImageFile(null);
        setImagePreview(null);
        setUploadProgress('');
        onAgentMinted?.(agentId);
      } else {
        setError(contractError || 'Failed to register agent');
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setUploadProgress('');
    }
  };

  const isContractReady = contractAddress !== '0x0000000000000000000000000000000000000000';
  const hasPinata = isPinataConfigured();

  return (
    <div className="agent-mint-container">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="header-toggle"
      >
        <div className="header-content">
          <span className="icon">🤖</span>
          <div>
            <h3>Register New AI Agent</h3>
            <p>Mint an ERC-8004 identity NFT</p>
          </div>
        </div>
        <svg
          className={`chevron ${isExpanded ? 'expanded' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="form-content">
          {!isContractReady && (
            <div className="warning-message">
              <span>⚠️</span>
              <div>
                <p className="font-semibold">Contract Not Deployed</p>
                <p>Set NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS in your .env.local</p>
              </div>
            </div>
          )}

          {/* IPFS Status */}
          <div className={`ipfs-status ${hasPinata ? 'configured' : 'fallback'}`}>
            <span>{hasPinata ? '🔗' : '📋'}</span>
            <span>
              {hasPinata 
                ? 'IPFS via Pinata configured' 
                : 'Using data URI (set NEXT_PUBLIC_PINATA_JWT for IPFS)'}
            </span>
          </div>

          {/* Image Upload */}
          <div className="form-group">
            <label>Agent Avatar</label>
            <div 
              className="image-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button 
                    type="button"
                    className="remove-image"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">📷</span>
                  <p>Click to upload agent avatar</p>
                  <p className="upload-hint">PNG, JPG up to 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
          </div>

          {/* Agent Name */}
          <div className="form-group">
            <label>Agent Name *</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g., CodeAssist Pro"
              disabled={isLoading || isUploadingImage}
              required
            />
          </div>

          {/* API Endpoint (BYOA) */}
          <div className="form-group">
            <label>API Endpoint * (BYOA)</label>
            <input
              type="url"
              value={apiEndpoint}
              onChange={(e) => {
                setApiEndpoint(e.target.value);
                setApiEndpointError(null);
              }}
              placeholder="https://your-agent.com/api/run"
              disabled={isLoading || isUploadingImage}
              required
              className={apiEndpointError ? 'input-error' : ''}
            />
            {apiEndpointError && (
              <p className="error-hint">{apiEndpointError}</p>
            )}
            <p className="hint">
              External API that clients will call after payment. Must use HTTPS.
            </p>
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Content Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(Number(e.target.value) as ContentCategory)}
              disabled={isLoading || isUploadingImage}
            >
              {Object.entries(ContentCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="hint">
              Categorize the type of content your agent produces
            </p>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your AI agent does..."
              rows={3}
              disabled={isLoading || isUploadingImage}
            />
          </div>

          {/* Capabilities */}
          <div className="form-group">
            <label>Capabilities (comma-separated)</label>
            <input
              type="text"
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              placeholder="e.g., Code Review, Bug Fixing, Documentation"
              disabled={isLoading || isUploadingImage}
            />
          </div>

          {/* Pricing */}
          <div className="form-group">
            <label>Base Rate (BNB)</label>
            <input
              type="number"
              step="0.000001"
              min="0"
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
              placeholder="0.01"
              disabled={isLoading || isUploadingImage}
            />
            <p className="hint">Suggested price per task in BNB</p>
          </div>

          {/* Progress */}
          {uploadProgress && (
            <div className="progress-message">
              <div className="spinner" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Error */}
          {(error || contractError) && (
            <div className="error-message">
              <span>❌</span>
              <span>{error || contractError}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="success-message">
              <span>✅</span>
              <div>
                <p className="font-semibold">🎉 Agent NFT Minted Successfully!</p>
                <p>Token ID: #{mintedAgentId?.toString() || '0'}</p>
                <p className="token-info">Your AI agent is now registered on-chain and available in the marketplace.</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || isUploadingImage || !isConnected || !isContractReady}
            className="submit-button"
          >
            {(isLoading || isUploadingImage) && '⏳ Processing...'}
            {!(isLoading || isUploadingImage) && !isConnected && '🔗 Connect Wallet First'}
            {!(isLoading || isUploadingImage) && isConnected && !isContractReady && '⚠️ Contract Not Ready'}
            {!(isLoading || isUploadingImage) && isConnected && isContractReady && '🚀 Register Agent as NFT'}
          </button>

          <p className="footer-note">
            Registration is free (gas only). Your wallet address will be recorded as the agent developer.
          </p>
        </form>
      )}

      <style jsx>{`
        .agent-mint-container {
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          overflow: hidden;
        }

        .header-toggle {
          width: 100%;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
          transition: background 0.2s;
        }

        .header-toggle:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .icon {
          font-size: 2rem;
        }

        .header-content h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
        }

        .header-content p {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0.25rem 0 0;
        }

        .chevron {
          width: 24px;
          height: 24px;
          transition: transform 0.2s;
        }

        .chevron.expanded {
          transform: rotate(180deg);
        }

        .form-content {
          padding: 0 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .ipfs-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
        }
        
        .ipfs-status.configured {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        
        .ipfs-status.fallback {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }
        
        .image-upload-area {
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .image-upload-area:hover {
          border-color: #8b5cf6;
          background: rgba(139, 92, 246, 0.05);
        }
        
        .upload-placeholder {
          color: rgba(255, 255, 255, 0.5);
        }
        
        .upload-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }
        
        .upload-placeholder p {
          margin: 0;
        }
        
        .upload-hint {
          font-size: 0.75rem;
          opacity: 0.7;
          margin-top: 0.25rem !important;
        }
        
        .image-preview {
          position: relative;
          display: inline-block;
        }
        
        .image-preview img {
          max-width: 150px;
          max-height: 150px;
          border-radius: 12px;
          object-fit: cover;
        }
        
        .remove-image {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: none;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.9375rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .form-group input:disabled,
        .form-group textarea:disabled,
        .form-group select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .hint {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }

        .input-error {
          border-color: #ef4444 !important;
        }

        .error-hint {
          font-size: 0.75rem;
          color: #ef4444;
          margin: 0;
        }

        .warning-message {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 12px;
          color: #fbbf24;
          font-size: 0.875rem;
        }

        .warning-message p {
          margin: 0;
        }

        .warning-message p:last-child {
          font-size: 0.75rem;
          opacity: 0.8;
        }
        
        .progress-message {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(96, 165, 250, 0.1);
          border: 1px solid rgba(96, 165, 250, 0.3);
          border-radius: 12px;
          color: #60a5fa;
          font-size: 0.875rem;
        }
        
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(96, 165, 250, 0.3);
          border-top-color: #60a5fa;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #f87171;
          font-size: 0.875rem;
        }

        .success-message {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          color: #34d399;
          font-size: 0.875rem;
        }

        .success-message p {
          margin: 0;
        }

        .success-message p:last-child {
          font-size: 0.75rem;
          opacity: 0.8;
        }
        
        .token-info {
          margin-top: 0.25rem !important;
        }

        .submit-button {
          padding: 1rem;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .footer-note {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }
      `}</style>
    </div>
  );
}
