'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ContentCategory, ContentCategoryLabels, getErrorMessage } from '@/types';
import { useAgentRegistry } from '@/hooks/useContracts';

interface MintAgentProps {
  onAgentMinted?: (agentId: bigint) => void;
}

/**
 * MintAgent Component
 * 
 * Form for registering a new AI Agent on the AgentRegistry contract.
 * Mints an ERC-8004 identity token (NFT) for the agent.
 */
export default function MintAgent({ onAgentMinted }: MintAgentProps) {
  const { address, isConnected } = useAccount();
  const { registerAgent, isLoading, error: contractError, contractAddress } = useAgentRegistry();
  
  const [metadataURI, setMetadataURI] = useState('');
  const [agentName, setAgentName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ContentCategory>(ContentCategory.Code);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [mintedAgentId, setMintedAgentId] = useState<bigint | null>(null);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!agentName.trim()) {
      setError('Please enter an agent name');
      return;
    }

    // Generate metadata URI (in production, this would upload to IPFS)
    const metadata = {
      name: agentName,
      description: description || `AI Agent: ${agentName}`,
      category: ContentCategoryLabels[category],
      developer: address,
      createdAt: new Date().toISOString(),
    };
    
    // For demo, using a data URI. In production, upload to IPFS
    const uri = metadataURI || `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

    try {
      const agentId = await registerAgent(uri, category);
      
      if (agentId !== null) {
        setSuccess(true);
        setMintedAgentId(agentId);
        setAgentName('');
        setDescription('');
        setMetadataURI('');
        onAgentMinted?.(agentId);
      } else {
        setError(contractError || 'Failed to register agent');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const isContractReady = contractAddress !== '0x0000000000000000000000000000000000000000';

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
            <p>Mint an ERC-8004 identity token</p>
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
                <p>Deploy AgentRegistry contract and set NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS</p>
              </div>
            </div>
          )}

          {/* Agent Name */}
          <div className="form-group">
            <label>Agent Name *</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g., CodeAssist Pro"
              disabled={isLoading}
              required
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label>Content Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(Number(e.target.value) as ContentCategory)}
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          {/* Metadata URI (Advanced) */}
          <div className="form-group">
            <label>Metadata URI (Optional)</label>
            <input
              type="text"
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
              placeholder="ipfs://... or leave empty for auto-generation"
              disabled={isLoading}
            />
            <p className="hint">
              IPFS URI containing agent metadata. Leave blank to auto-generate.
            </p>
          </div>

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
            disabled={isLoading || !isConnected || !isContractReady}
            className="submit-button"
          >
            {isLoading && '⏳ Registering...'}
            {!isLoading && !isConnected && '🔗 Connect Wallet First'}
            {!isLoading && isConnected && !isContractReady && '⚠️ Contract Not Ready'}
            {!isLoading && isConnected && isContractReady && '🚀 Register Agent'}
          </button>

          <p className="footer-note">
            Registration is free. Your wallet address will be recorded as the agent developer.
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
