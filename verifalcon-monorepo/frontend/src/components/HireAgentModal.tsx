'use client';

import React, { useState, useCallback } from 'react';
import { Agent, ContentCategoryLabels, getErrorMessage } from '@/types';
import { usePaymentRouter } from '@/hooks/useContracts';

interface HireAgentModalProps {
  /** Agent being hired */
  agent: Agent;
  /** Whether modal is open */
  isOpen: boolean;
  /** Close modal callback */
  onClose: () => void;
  /** Success callback - called when hiring is complete */
  onHireSuccess: (taskId: bigint) => void;
  /** Whether user has accepted terms */
  hasAcceptedTerms: boolean;
  /** Callback to open terms modal */
  onOpenTerms: () => void;
}

/**
 * HireAgentModal Component
 * 
 * Modal for hiring an AI agent with:
 * - Payment amount input
 * - Deadline selection
 * - Task description
 * - Terms verification
 * - Escrow payment confirmation
 */
export function HireAgentModal({
  agent,
  isOpen,
  onClose,
  onHireSuccess,
  hasAcceptedTerms,
  onOpenTerms,
}: HireAgentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('0.01');
  const [deadline, setDeadline] = useState(24); // Hours from now
  const [taskDescription, setTaskDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'confirm' | 'processing'>('details');

  // Contract hook
  const { createTask, isLoading: isSubmitting, error: contractError } = usePaymentRouter();

  // Calculate platform fee (5%)
  const platformFee = parseFloat(paymentAmount) * 0.05;
  const developerPayout = parseFloat(paymentAmount) - platformFee;

  const handleSubmit = useCallback(async () => {
    if (!hasAcceptedTerms) {
      onOpenTerms();
      return;
    }

    if (!taskDescription.trim()) {
      setError('Please describe your task');
      return;
    }

    if (parseFloat(paymentAmount) <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    setStep('confirm');
  }, [hasAcceptedTerms, onOpenTerms, taskDescription, paymentAmount]);

  const handleConfirm = useCallback(async () => {
    setError(null);
    setStep('processing');

    try {
      // Call the real contract
      const taskId = await createTask(
        agent.id,
        agent.developer,
        deadline,
        paymentAmount
      );
      
      if (taskId !== null) {
        onHireSuccess(taskId);
        onClose();
      } else {
        setError(contractError || 'Failed to create task');
        setStep('confirm');
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setStep('confirm');
    }
  }, [agent.id, agent.developer, deadline, paymentAmount, createTask, contractError, onHireSuccess, onClose]);

  const resetModal = () => {
    setStep('details');
    setError(null);
    setTaskDescription('');
    setPaymentAmount('0.01');
    setDeadline(24);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="agent-preview">
            <div className="agent-avatar">🤖</div>
            <div>
              <h2>Hire Agent #{agent.id.toString()}</h2>
              <span className="category-badge">
                {ContentCategoryLabels[agent.category]}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {step === 'details' && (
            <>
              {/* Agent Stats */}
              <div className="agent-stats">
                <div className="stat">
                  <span className="label">Reputation</span>
                  <span className="value">{agent.reputationScore}</span>
                </div>
                <div className="stat">
                  <span className="label">Tasks Completed</span>
                  <span className="value">{agent.totalTasks}</span>
                </div>
                <div className="stat">
                  <span className="label">Success Rate</span>
                  <span className="value">
                    {agent.totalTasks > 0
                      ? Math.round((agent.successfulTasks / agent.totalTasks) * 100)
                      : 0}%
                  </span>
                </div>
              </div>

              {/* Task Description */}
              <div className="form-group">
                <label>Task Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Describe what you need the AI agent to do..."
                  rows={4}
                />
              </div>

              {/* Payment Amount */}
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Amount (BNB)</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Deadline (hours)</label>
                  <select
                    value={deadline}
                    onChange={(e) => setDeadline(Number(e.target.value))}
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                    <option value={72}>72 hours</option>
                  </select>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="fee-breakdown">
                <div className="fee-row">
                  <span>Payment Amount</span>
                  <span>{parseFloat(paymentAmount).toFixed(4)} BNB</span>
                </div>
                <div className="fee-row">
                  <span>Platform Fee (5%)</span>
                  <span>-{platformFee.toFixed(4)} BNB</span>
                </div>
                <div className="fee-row total">
                  <span>Developer Receives</span>
                  <span>{developerPayout.toFixed(4)} BNB</span>
                </div>
              </div>

              {/* Terms Check */}
              {!hasAcceptedTerms && (
                <div className="terms-warning">
                  <span>⚠️</span>
                  <span>You must accept the AI Risk Disclaimer before hiring</span>
                </div>
              )}
            </>
          )}

          {step === 'confirm' && (
            <div className="confirm-step">
              <div className="confirm-icon">💰</div>
              <h3>Confirm Payment</h3>
              <p>
                You are about to escrow <strong>{paymentAmount} BNB</strong> for this task.
                The payment will be held securely until:
              </p>
              <ul>
                <li>✓ Task is completed successfully</li>
                <li>✓ Or deadline passes (refund available)</li>
                <li>✓ Or agent fails to respond in 30s (refund available)</li>
              </ul>
              <div className="confirm-details">
                <p><strong>Agent:</strong> #{agent.id.toString()}</p>
                <p><strong>Deadline:</strong> {deadline} hours from now</p>
                <p><strong>Task:</strong> {taskDescription.slice(0, 100)}...</p>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="processing-step">
              <div className="spinner-large"></div>
              <h3>Processing Transaction</h3>
              <p>Please confirm in your wallet...</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="error-message">
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step === 'details' && (
            <>
              <button className="btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!taskDescription.trim()}
              >
                {hasAcceptedTerms ? 'Continue to Payment' : 'Accept Terms First'}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <button
                className="btn-secondary"
                onClick={() => setStep('details')}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Pay ${paymentAmount} BNB`}
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
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

        .modal-container {
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .agent-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .agent-avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
        }

        .agent-preview h2 {
          color: white;
          font-size: 1.25rem;
          margin: 0 0 0.25rem;
        }

        .category-badge {
          font-size: 0.75rem;
          padding: 4px 10px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 20px;
          color: #c4b5fd;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.6);
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .close-btn svg {
          width: 20px;
          height: 20px;
        }

        .modal-content {
          padding: 1.5rem;
        }

        .agent-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat {
          text-align: center;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .stat .label {
          display: block;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 4px;
        }

        .stat .value {
          font-size: 1.25rem;
          font-weight: 600;
          color: white;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 0.5rem;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.9375rem;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 100px;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: #8b5cf6;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .fee-breakdown {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .fee-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .fee-row.total {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          font-weight: 600;
          color: #10b981;
        }

        .terms-warning {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 10px;
          color: #fbbf24;
          font-size: 0.875rem;
        }

        .confirm-step {
          text-align: center;
          padding: 1rem 0;
        }

        .confirm-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .confirm-step h3 {
          color: white;
          margin: 0 0 1rem;
        }

        .confirm-step p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 1rem;
        }

        .confirm-step ul {
          text-align: left;
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
        }

        .confirm-step ul li {
          padding: 0.5rem 0;
          color: #10b981;
          font-size: 0.875rem;
        }

        .confirm-details {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          text-align: left;
        }

        .confirm-details p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
        }

        .processing-step {
          text-align: center;
          padding: 3rem 1rem;
        }

        .spinner-large {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(139, 92, 246, 0.2);
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1.5rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .processing-step h3 {
          color: white;
          margin: 0 0 0.5rem;
        }

        .processing-step p {
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
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
          margin-top: 1rem;
        }

        .modal-footer {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-primary,
        .btn-secondary {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #3b82f6);
          color: white;
          border: none;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(139, 92, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}

export default HireAgentModal;
