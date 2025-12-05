'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getErrorMessage } from '@/types';

/**
 * AI Risk Disclaimer Terms (Required for legal compliance)
 */
const AI_RISK_DISCLAIMERS = [
  'AI-generated outputs may contain errors, inaccuracies, or biases.',
  'AI Agents are autonomous software and may produce unexpected results.',
  'You are solely responsible for verifying and validating all AI outputs.',
  'AI outputs should not be used for medical, legal, or financial decisions without professional review.',
  'The marketplace and agent developers are not liable for any damages resulting from AI outputs.',
  'Payment is based on task completion, not output quality or accuracy.',
  'You are interacting with 3rd-party APIs. The Platform is not responsible for external agent downtime or data handling.',
];

/**
 * Terms of Service version (should match PaymentRouter.termsVersion)
 */
const TERMS_VERSION = 'v1.0.0';

interface TermsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when terms are accepted (includes tx completion) */
  onAccepted: () => void;
  /** PaymentRouter contract address */
  paymentRouterAddress: `0x${string}`;
  /** PaymentRouter ABI for contract interaction */
  paymentRouterAbi: readonly unknown[];
}

/**
 * TermsModal Component
 * 
 * Legal compliance component that requires users to accept AI Risk Disclaimers
 * before interacting with any marketplace contracts.
 * 
 * Features:
 * - Displays clear AI risk warnings
 * - Requires checkbox acknowledgment
 * - Calls acceptTerms() on PaymentRouter contract
 * - Stores acceptance in localStorage + blockchain
 * - Human-readable error handling
 */
export function TermsModal({
  isOpen,
  onClose,
  onAccepted,
  paymentRouterAddress,
  paymentRouterAbi,
}: TermsModalProps) {
  const { address, isConnected } = useAccount();
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contract write hook
  const { writeContract, data: txHash, error: writeError, isPending } = useWriteContract();
  
  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Check localStorage for previous acceptance
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`terms_${address}_${TERMS_VERSION}`);
      if (stored === 'accepted') {
        onAccepted();
        onClose();
      }
    }
  }, [address, onAccepted, onClose]);

  // Handle write errors with human-readable messages
  useEffect(() => {
    if (writeError) {
      setError(getErrorMessage(writeError));
      setIsAccepting(false);
    }
  }, [writeError]);

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed && address) {
      // Store in localStorage for quick checks
      localStorage.setItem(`terms_${address}_${TERMS_VERSION}`, 'accepted');
      setIsAccepting(false);
      onAccepted();
      onClose();
    }
  }, [isConfirmed, address, onAccepted, onClose]);

  const handleAcceptTerms = useCallback(async () => {
    if (!isConnected || !hasAcknowledged) return;
    
    setError(null);
    setIsAccepting(true);

    try {
      writeContract({
        address: paymentRouterAddress,
        abi: paymentRouterAbi,
        functionName: 'acceptTerms',
      });
    } catch (err) {
      setError(getErrorMessage(err));
      setIsAccepting(false);
    }
  }, [isConnected, hasAcknowledged, writeContract, paymentRouterAddress, paymentRouterAbi]);

  if (!isOpen) return null;

  const isLoading = isPending || isConfirming || isAccepting;

  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal">
        {/* Header */}
        <div className="terms-modal-header">
          <div className="terms-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2>AI Risk Acknowledgment Required</h2>
          <p className="terms-version">Terms Version: {TERMS_VERSION}</p>
        </div>

        {/* Disclaimers List */}
        <div className="terms-content">
          <p className="terms-intro">
            Before interacting with AI Agents on this marketplace, you must acknowledge
            and accept the following important disclaimers:
          </p>

          <ul className="disclaimers-list">
            {AI_RISK_DISCLAIMERS.map((disclaimer, index) => (
              <li key={index} className="disclaimer-item">
                <span className="disclaimer-icon">⚠️</span>
                <span>{disclaimer}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Acknowledgment Checkbox */}
        <div className="terms-acknowledgment">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              disabled={isLoading}
            />
            <span>
              I have read, understand, and accept these AI Risk Disclaimers and the
              Terms of Service ({TERMS_VERSION}).
            </span>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="terms-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="terms-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleAcceptTerms}
            disabled={!hasAcknowledged || !isConnected || isLoading}
          >
            {!isConnected ? (
              'Connect Wallet First'
            ) : isLoading ? (
              <>
                <span className="spinner" />
                {isPending ? 'Confirm in Wallet...' : 'Processing...'}
              </>
            ) : (
              'Accept & Continue'
            )}
          </button>
        </div>

        {/* Transaction Status */}
        {txHash && (
          <div className="terms-tx-status">
            <span>Transaction: </span>
            <a
              href={`https://testnet.bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .terms-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .terms-modal {
          background: linear-gradient(145deg, #1a1a2e, #16213e);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .terms-modal-header {
          text-align: center;
          padding: 2rem 2rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .terms-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #ff6b6b, #ffa500);
          border-radius: 50%;
          margin-bottom: 1rem;
          color: white;
        }

        .terms-icon svg {
          width: 32px;
          height: 32px;
        }

        .terms-modal-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 0.5rem;
        }

        .terms-version {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }

        .terms-content {
          padding: 1.5rem 2rem;
        }

        .terms-intro {
          color: rgba(255, 255, 255, 0.8);
          margin: 0 0 1.5rem;
          line-height: 1.6;
        }

        .disclaimers-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .disclaimer-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.2);
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .disclaimer-icon {
          flex-shrink: 0;
          font-size: 1rem;
        }

        .terms-acknowledgment {
          padding: 1rem 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.2);
        }

        .checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          cursor: pointer;
        }

        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          accent-color: #10b981;
          cursor: pointer;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .checkbox-label span {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .terms-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 2rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #ef4444;
          font-size: 0.875rem;
        }

        .terms-error svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .terms-actions {
          display: flex;
          gap: 1rem;
          padding: 1.5rem 2rem;
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .terms-tx-status {
          padding: 0.75rem 2rem 1.5rem;
          text-align: center;
          font-size: 0.8125rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .terms-tx-status a {
          color: #60a5fa;
          text-decoration: none;
        }

        .terms-tx-status a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default TermsModal;
