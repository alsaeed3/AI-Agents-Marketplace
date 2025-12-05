'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Agent,
  ChatMessage,
  TerminalSession,
  PaymentStatus,
  getErrorMessage,
} from '@/types';

interface AgentTerminalProps {
  /** Current session state */
  session: TerminalSession;
  /** Update session state */
  onSessionUpdate: (updates: Partial<TerminalSession>) => void;
  /** Send message to agent */
  onSendMessage: (content: string) => Promise<void>;
  /** Request refund for current task */
  onRequestRefund: () => Promise<void>;
  /** Payment status for display */
  paymentStatus: PaymentStatus;
}

/**
 * Response timeout in seconds
 * If agent doesn't respond within this time, show refund button
 */
const RESPONSE_TIMEOUT = 30;

/**
 * AgentTerminal Component
 * 
 * Chat interface for interacting with hired AI agents.
 * 
 * Features:
 * - Real-time chat with agent
 * - 30-second response timeout with refund button
 * - Payment status display
 * - Human-readable error handling
 */
export function AgentTerminal({
  session,
  onSessionUpdate,
  onSendMessage,
  onRequestRefund,
  paymentStatus,
}: AgentTerminalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // Handle response timeout countdown
  useEffect(() => {
    if (session.isWaiting && session.timeoutSeconds > 0) {
      const interval = setInterval(() => {
        const newTimeout = session.timeoutSeconds - 1;
        onSessionUpdate({
          timeoutSeconds: newTimeout,
          showRefundButton: newTimeout <= 0,
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session.isWaiting, session.timeoutSeconds, onSessionUpdate]);

  // Handle message submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setError(null);
    setIsSending(true);

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };

    // Add loading message for agent
    const loadingMessage: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: 'agent',
      content: '',
      timestamp: Date.now(),
      isLoading: true,
    };

    onSessionUpdate({
      messages: [...session.messages, userMessage, loadingMessage],
      isWaiting: true,
      timeoutSeconds: RESPONSE_TIMEOUT,
      showRefundButton: false,
    });

    try {
      await onSendMessage(messageContent);
      // Success - the parent component should update messages
    } catch (err) {
      setError(getErrorMessage(err));
      
      // Remove loading message on error
      onSessionUpdate({
        messages: session.messages.filter((m) => !m.isLoading).concat(userMessage),
        isWaiting: false,
      });
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, session.messages, onSessionUpdate, onSendMessage]);

  // Handle refund request
  const handleRefund = useCallback(async () => {
    setIsRefunding(true);
    setError(null);

    try {
      await onRequestRefund();
      
      // Add system message about refund
      const refundMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'system',
        content: 'Refund has been processed. Your funds will be returned to your wallet.',
        timestamp: Date.now(),
      };

      onSessionUpdate({
        messages: [...session.messages.filter((m) => !m.isLoading), refundMessage],
        isWaiting: false,
        showRefundButton: false,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsRefunding(false);
    }
  }, [session.messages, onSessionUpdate, onRequestRefund]);

  // Get payment status display
  const getPaymentStatusDisplay = () => {
    switch (paymentStatus) {
      case PaymentStatus.Escrowed:
        return { label: 'Escrowed', color: '#f59e0b', icon: '🔒' };
      case PaymentStatus.Released:
        return { label: 'Released', color: '#10b981', icon: '✓' };
      case PaymentStatus.Refunded:
        return { label: 'Refunded', color: '#3b82f6', icon: '↩' };
      default:
        return { label: 'Unknown', color: '#6b7280', icon: '?' };
    }
  };

  const statusDisplay = getPaymentStatusDisplay();

  if (!session.agent) {
    return (
      <div className="terminal-empty">
        <span>💬</span>
        <h3>No Agent Selected</h3>
        <p>Select an agent from the marketplace to start a conversation.</p>
        <style jsx>{`
          .terminal-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            text-align: center;
            color: rgba(255, 255, 255, 0.6);
          }
          span { font-size: 4rem; margin-bottom: 1rem; }
          h3 { color: white; margin: 0 0 0.5rem; }
          p { margin: 0; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="terminal-container">
      {/* Header */}
      <div className="terminal-header">
        <div className="agent-info">
          <div className="agent-avatar">🤖</div>
          <div>
            <h3>Agent #{session.agent.id.toString()}</h3>
            <span className="reputation">
              Rep: {session.agent.reputationScore}
            </span>
          </div>
        </div>
        
        <div
          className="payment-status"
          style={{ borderColor: statusDisplay.color }}
        >
          <span>{statusDisplay.icon}</span>
          <span style={{ color: statusDisplay.color }}>{statusDisplay.label}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {session.messages.length === 0 ? (
          <div className="welcome-message">
            <p>Start a conversation with this agent.</p>
            <p className="hint">Tip: Be specific about your requirements for best results.</p>
          </div>
        ) : (
          session.messages.map((message) => (
            <div
              key={message.id}
              className={`message message-${message.role}`}
            >
              {message.isLoading ? (
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              ) : (
                <>
                  <div className="message-content">{message.content}</div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Timeout Warning */}
      {session.isWaiting && session.timeoutSeconds > 0 && (
        <div className="timeout-warning">
          <span>⏱️</span>
          Waiting for response... {session.timeoutSeconds}s remaining
        </div>
      )}

      {/* Refund Button */}
      {session.showRefundButton && (
        <div className="refund-section">
          <div className="refund-message">
            <span>⚠️</span>
            Agent did not respond within {RESPONSE_TIMEOUT} seconds.
          </div>
          <button
            className="refund-btn"
            onClick={handleRefund}
            disabled={isRefunding}
          >
            {isRefunding ? (
              <>
                <span className="spinner" />
                Processing Refund...
              </>
            ) : (
              <>
                <span>↩️</span>
                Request Refund
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="terminal-error">
          <span>❌</span>
          {error}
        </div>
      )}

      {/* Input Form */}
      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isSending || isRefunding}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isSending || isRefunding}
        >
          {isSending ? (
            <span className="spinner" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </form>

      <style jsx>{`
        .terminal-container {
          display: flex;
          flex-direction: column;
          height: 600px;
          background: linear-gradient(145deg, #0f172a, #1e293b);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          overflow: hidden;
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .agent-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .agent-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }

        .agent-info h3 {
          margin: 0;
          font-size: 1rem;
          color: white;
        }

        .reputation {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .payment-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 1px solid;
          border-radius: 20px;
          font-size: 0.875rem;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .welcome-message {
          text-align: center;
          padding: 2rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .welcome-message .hint {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .message {
          max-width: 80%;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message-user {
          align-self: flex-end;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
        }

        .message-agent {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .message-system {
          align-self: center;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
          font-size: 0.875rem;
        }

        .message-content {
          line-height: 1.5;
          white-space: pre-wrap;
        }

        .message-time {
          font-size: 0.6875rem;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
        }

        .loading-dots {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .timeout-warning {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(245, 158, 11, 0.1);
          border-top: 1px solid rgba(245, 158, 11, 0.3);
          color: #fbbf24;
          font-size: 0.875rem;
        }

        .refund-section {
          padding: 1rem 1.5rem;
          background: rgba(239, 68, 68, 0.1);
          border-top: 1px solid rgba(239, 68, 68, 0.3);
        }

        .refund-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f87171;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
        }

        .refund-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .refund-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
        }

        .refund-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .terminal-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          font-size: 0.875rem;
        }

        .input-form {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .input-form input {
          flex: 1;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 0.9375rem;
        }

        .input-form input:focus {
          outline: none;
          border-color: #60a5fa;
        }

        .input-form input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .input-form button {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          border: none;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .input-form button:hover:not(:disabled) {
          transform: scale(1.05);
        }

        .input-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-form button svg {
          width: 20px;
          height: 20px;
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
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AgentTerminal;
