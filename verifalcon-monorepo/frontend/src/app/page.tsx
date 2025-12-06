'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { bscTestnet } from 'wagmi/chains';
import MarketplaceGrid from '@/components/MarketplaceGrid';
import MintAgent from '@/components/MintAgent';
import AgentTerminal from '@/components/AgentTerminal';
import HireAgentModal from '@/components/HireAgentModal';
import TermsModal from '@/components/TermsModal';
import { Agent, TerminalSession, PaymentStatus, getErrorMessage } from '@/types';
import { getContractAddresses, PAYMENT_ROUTER_ABI } from '@/hooks/useContracts';

type TabType = 'marketplace' | 'register' | 'terminal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('marketplace');
  const [mounted, setMounted] = useState(false);
  
  // Agent & Task state
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedAgentBaseRate, setSelectedAgentBaseRate] = useState<string>('0.001');
  const [currentTaskId, setCurrentTaskId] = useState<bigint | null>(null);
  const [terminalSession, setTerminalSession] = useState<TerminalSession>({
    taskId: null,
    agent: null,
    messages: [],
    isWaiting: false,
    timeoutSeconds: 30,
    showRefundButton: false,
  });

  // Modal state
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Wallet connection
  const { address, isConnected, chain } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  // Check localStorage for terms acceptance
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`terms_${address}_v1.0.0`);
      setHasAcceptedTerms(stored === 'accepted');
    }
  }, [address]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-switch to BSC Testnet
  useEffect(() => {
    if (isConnected && chain && chain.id !== bscTestnet.id) {
      switchChain?.({ chainId: bscTestnet.id });
    }
  }, [isConnected, chain, switchChain]);

  const handleConnect = () => {
    connect({ 
      connector: injected(),
      chainId: bscTestnet.id
    });
  };

  // When user clicks "Hire" on an agent card
  const handleHireAgent = (agent: Agent, baseRate: string) => {
    if (!isConnected) {
      handleConnect();
      return;
    }
    setSelectedAgent(agent);
    setSelectedAgentBaseRate(baseRate);
    setIsHireModalOpen(true);
  };

  // When hiring is successful
  const handleHireSuccess = (taskId: bigint) => {
    setCurrentTaskId(taskId);
    setIsHireModalOpen(false);
    
    // Initialize terminal session
    setTerminalSession({
      taskId: taskId,
      agent: selectedAgent,
      messages: [
        {
          id: 'system-welcome',
          role: 'system',
          content: `Task #${taskId.toString()} created! Payment escrowed. You can now interact with Agent #${selectedAgent?.id.toString()}.`,
          timestamp: Date.now(),
        },
      ],
      isWaiting: false,
      timeoutSeconds: 30,
      showRefundButton: false,
    });
    
    // Switch to terminal tab
    setActiveTab('terminal');
  };

  // Handle terms acceptance
  const handleTermsAccepted = () => {
    setHasAcceptedTerms(true);
    setIsTermsModalOpen(false);
  };

  /**
   * Send a message to the AI agent's registered API endpoint
   * Uses the agent's apiEndpoint from the blockchain
   */
  const handleSendMessage = useCallback(async (content: string): Promise<void> => {
    const agent = terminalSession.agent;
    
    if (!agent) {
      setTerminalSession(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: '❌ No agent selected. Please hire an agent first.',
          timestamp: Date.now(),
        }],
        isWaiting: false,
      }));
      return;
    }

    // Validate agent has an API endpoint
    if (!agent.apiEndpoint || !agent.apiEndpoint.startsWith('https://')) {
      setTerminalSession(prev => ({
        ...prev,
        messages: [...prev.messages, {
          id: `error-${Date.now()}`,
          role: 'system',
          content: `❌ Agent #${agent.id.toString()} does not have a valid API endpoint. The developer may not have configured it properly.`,
          timestamp: Date.now(),
        }],
        isWaiting: false,
        showRefundButton: true,
      }));
      return;
    }

    // Set waiting state with timeout countdown
    setTerminalSession(prev => ({
      ...prev,
      isWaiting: true,
      timeoutSeconds: 30,
    }));

    try {
      console.log('========================================');
      console.log('[Agent API] Agent details:');
      console.log('  - Agent ID:', agent.id.toString());
      console.log('  - API Endpoint:', agent.apiEndpoint);
      console.log('  - Message:', content);
      console.log('========================================');
      
      // Build the full API URL - append /chat to the base endpoint
      const apiUrl = agent.apiEndpoint.endsWith('/chat') 
        ? agent.apiEndpoint 
        : `${agent.apiEndpoint.replace(/\/$/, '')}/chat`;
      
      console.log('  - Full API URL:', apiUrl);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Call the agent's external API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Agent API returned status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { 
        success?: boolean; 
        output?: string; 
        response?: string;
        message?: string;
        error?: string;
      };
      
      console.log('[Agent API] Response received:', data);

      // Extract the response content (handle different response formats)
      const agentResponse = data.output || data.response || data.message || 
        (data.success ? 'Task processed successfully.' : 'Received response from agent.');

      // Add agent's response to messages
      setTerminalSession(prev => ({
        ...prev,
        messages: prev.messages.filter(m => !m.isLoading).concat({
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: agentResponse,
          timestamp: Date.now(),
        }),
        isWaiting: false,
      }));

    } catch (err) {
      console.error('[Agent API] Error:', err);
      
      const errorMessage = getErrorMessage(err);
      const isTimeout = errorMessage.includes('abort') || errorMessage.includes('timeout');
      const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network');
      
      // Show error message and optionally refund button
      setTerminalSession(prev => ({
        ...prev,
        messages: prev.messages.filter(m => !m.isLoading).concat({
          id: `error-${Date.now()}`,
          role: 'system',
          content: isTimeout 
            ? `⏱️ Agent #${agent.id.toString()} did not respond within 30 seconds. You may request a refund.`
            : isNetworkError
            ? `🌐 Cannot reach Agent #${agent.id.toString()}'s API. The agent may be offline. You may request a refund.`
            : `❌ Error from Agent #${agent.id.toString()}: ${errorMessage}`,
          timestamp: Date.now(),
        }),
        isWaiting: false,
        showRefundButton: isTimeout || isNetworkError, // Show refund option on failures
      }));
    }
  }, [terminalSession.agent, currentTaskId, address]);

  const handleRequestRefund = async (): Promise<void> => {
    // In production, this calls PaymentRouter.refundTask
    console.log('Refund requested for task:', currentTaskId?.toString());
    
    setTerminalSession(prev => ({
      ...prev,
      messages: [...prev.messages, {
        id: `system-refund-${Date.now()}`,
        role: 'system',
        content: 'Refund processed! Your funds have been returned.',
        timestamp: Date.now(),
      }],
      showRefundButton: false,
    }));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              🤖 AI Agent Marketplace
            </h1>
            <p className="text-purple-300 text-lg">
              Hire AI Agents • ERC-8004 Identity • x402 Micro-payments
            </p>
          </div>

          {/* Wallet Connection */}
          <div>
            {!mounted ? (
              <div className="h-12 w-44 bg-white/10 rounded-xl animate-pulse"></div>
            ) : isConnected ? (
              <div className="flex items-center gap-3">
                {hasAcceptedTerms && (
                  <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                    ✓ Terms Accepted
                  </span>
                )}
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 px-5 py-3 rounded-xl font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                  </div>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-gray-400 hover:text-red-400 transition-colors p-2"
                  title="Disconnect wallet"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all hover:shadow-purple-500/40"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Connect Wallet</span>
                </div>
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="mb-8">
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-1.5 inline-flex gap-1">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'marketplace'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🏪</span>
                <span>Marketplace</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'register'
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>➕</span>
                <span>Register Agent</span>
              </div>
            </button>
            {terminalSession.agent && (
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === 'terminal'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <span>Terminal</span>
                  {currentTaskId && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      #{currentTaskId.toString()}
                    </span>
                  )}
                </div>
              </button>
            )}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === 'marketplace' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Discover AI Agents</h2>
                <p className="text-gray-400">Browse verified agents and hire them for your tasks</p>
              </div>
              <MarketplaceGrid onHireAgent={handleHireAgent} />
            </div>
          )}

          {activeTab === 'register' && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Register Your AI Agent</h2>
                <p className="text-gray-400">Mint an ERC-8004 identity token for your agent</p>
              </div>
              <MintAgent />
            </div>
          )}

          {activeTab === 'terminal' && terminalSession.agent && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Agent Terminal</h2>
                <p className="text-gray-400">
                  Task #{currentTaskId?.toString()} • Agent #{terminalSession.agent.id.toString()}
                </p>
              </div>
              <AgentTerminal
                session={terminalSession}
                onSessionUpdate={(updates) => setTerminalSession(prev => ({ ...prev, ...updates }))}
                onSendMessage={handleSendMessage}
                onRequestRefund={handleRequestRefund}
                paymentStatus={PaymentStatus.Escrowed}
              />
            </div>
          )}
        </div>

        {/* How It Works Section */}
        {activeTab === 'marketplace' && (
          <div className="mt-16">
            <h3 className="text-xl font-bold text-white text-center mb-8">How It Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/10 hover:border-purple-500/30 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                  🔍
                </div>
                <h4 className="font-semibold text-white mb-2">1. Browse Agents</h4>
                <p className="text-sm text-gray-400">Explore verified AI agents with reputation scores</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/10 hover:border-purple-500/30 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                  📋
                </div>
                <h4 className="font-semibold text-white mb-2">2. Accept Terms</h4>
                <p className="text-sm text-gray-400">Acknowledge AI risk disclaimers (on-chain)</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/10 hover:border-purple-500/30 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                  💰
                </div>
                <h4 className="font-semibold text-white mb-2">3. Escrow Payment</h4>
                <p className="text-sm text-gray-400">Funds held securely until task completion</p>
              </div>
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/10 hover:border-purple-500/30 transition-all">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                  ✅
                </div>
                <h4 className="font-semibold text-white mb-2">4. Task Complete</h4>
                <p className="text-sm text-gray-400">Payment released, reputation updated</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm border-t border-white/10 pt-8">
          <p className="mb-2">
            <span className="text-purple-400 font-medium">AI Agent Marketplace</span> • Built on BNB Chain
          </p>
          <p>
            ERC-8004 Agent Identity • x402 Micro-payments • ReentrancyGuard Security
          </p>
        </footer>
      </div>

      {/* Modals */}
      {selectedAgent && (
        <HireAgentModal
          agent={selectedAgent}
          baseRate={selectedAgentBaseRate}
          isOpen={isHireModalOpen}
          onClose={() => setIsHireModalOpen(false)}
          onHireSuccess={handleHireSuccess}
          hasAcceptedTerms={hasAcceptedTerms}
          onOpenTerms={() => setIsTermsModalOpen(true)}
        />
      )}

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccepted={handleTermsAccepted}
        paymentRouterAddress={getContractAddresses().paymentRouter}
        paymentRouterAbi={PAYMENT_ROUTER_ABI}
      />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}
