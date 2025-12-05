'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Agent,
  ContentCategory,
  ContentCategoryLabels,
  MarketplaceFilters,
  MarketplaceSortBy,
  AgentMetadata,
  getErrorMessage,
} from '@/types';
import { useAllAgents } from '@/hooks/useContracts';

// Agent names for demo display (fallback when no metadata)
const AGENT_NAMES: Record<string, string> = {
  '0': 'CodeMaster Pro',
  '1': 'TextGenius AI',
  '2': 'PixelPerfect Vision',
  '3': 'DataCrunch Analytics',
  '4': 'AudioWave Studio',
  '5': 'CodeReview Expert',
  '6': 'ContentWriter GPT',
  '7': 'ImageEnhancer Plus',
  '8': 'SmartContract Auditor',
};

// Mock agents for demo (used when no blockchain agents exist)
const MOCK_AGENTS: Agent[] = [
  {
    id: BigInt(0),
    developer: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    metadataURI: 'ipfs://QmAgent0',
    apiEndpoint: 'https://api.example.com/agent/0',
    category: ContentCategory.Code,
    reportCount: 0,
    reputationScore: 185,
    totalTasks: 127,
    successfulTasks: 124,
    registeredAt: Date.now() / 1000 - 86400 * 90,
    isActive: true,
    isFlagged: false,
  },
  {
    id: BigInt(1),
    developer: '0x2345678901234567890123456789012345678901' as `0x${string}`,
    metadataURI: 'ipfs://QmAgent1',
    apiEndpoint: 'https://api.example.com/agent/1',
    category: ContentCategory.Text,
    reportCount: 0,
    reputationScore: 165,
    totalTasks: 89,
    successfulTasks: 86,
    registeredAt: Date.now() / 1000 - 86400 * 60,
    isActive: true,
    isFlagged: false,
  },
  {
    id: BigInt(2),
    developer: '0x3456789012345678901234567890123456789012' as `0x${string}`,
    metadataURI: 'ipfs://QmAgent2',
    apiEndpoint: 'https://api.example.com/agent/2',
    category: ContentCategory.Image,
    reportCount: 0,
    reputationScore: 142,
    totalTasks: 56,
    successfulTasks: 53,
    registeredAt: Date.now() / 1000 - 86400 * 45,
    isActive: true,
    isFlagged: false,
  },
  {
    id: BigInt(3),
    developer: '0x4567890123456789012345678901234567890123' as `0x${string}`,
    metadataURI: 'ipfs://QmAgent3',
    apiEndpoint: 'https://api.example.com/agent/3',
    category: ContentCategory.Data,
    reportCount: 1,
    reputationScore: 118,
    totalTasks: 34,
    successfulTasks: 31,
    registeredAt: Date.now() / 1000 - 86400 * 30,
    isActive: true,
    isFlagged: false,
  },
  {
    id: BigInt(4),
    developer: '0x5678901234567890123456789012345678901234' as `0x${string}`,
    metadataURI: 'ipfs://QmAgent4',
    apiEndpoint: 'https://api.example.com/agent/4',
    category: ContentCategory.Audio,
    reportCount: 0,
    reputationScore: 105,
    totalTasks: 19,
    successfulTasks: 17,
    registeredAt: Date.now() / 1000 - 86400 * 21,
    isActive: true,
    isFlagged: false,
  },
];

// Cache for agent metadata
const metadataCache: Record<string, AgentMetadata | null> = {};

// Parse metadata from URI (handles data URIs and IPFS)
async function fetchAgentMetadata(metadataURI: string): Promise<AgentMetadata | null> {
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
      // Fetch from IPFS gateway
      const ipfsHash = metadataURI.replace('ipfs://', '');
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      if (!response.ok) throw new Error('IPFS fetch failed');
      jsonData = await response.text();
    } else if (metadataURI.startsWith('http')) {
      // Fetch from HTTP URL
      const response = await fetch(metadataURI);
      if (!response.ok) throw new Error('HTTP fetch failed');
      jsonData = await response.text();
    } else {
      return null;
    }

    const metadata = JSON.parse(jsonData) as AgentMetadata;
    metadataCache[metadataURI] = metadata;
    return metadata;
  } catch (err) {
    console.error('Failed to fetch metadata:', err);
    metadataCache[metadataURI] = null;
    return null;
  }
}

interface MarketplaceGridProps {
  /** Callback when agent is hired */
  onHireAgent: (agent: Agent) => void;
  /** Callback when agent is reported */
  onReportAgent?: (agentId: bigint) => void;
}

/**
 * MarketplaceGrid Component
 * 
 * Displays a grid of registered AI agents with:
 * - Real blockchain data fetching via useAllAgents hook
 * - Verified/Flagged status badges
 * - Reputation scores
 * - Category filters
 * - Human-readable error handling
 */
export function MarketplaceGrid({
  onHireAgent,
  onReportAgent,
}: MarketplaceGridProps) {
  // Fetch real agents from blockchain
  const { agents: blockchainAgents, isLoading: isFetchingAgents, error: fetchError, totalAgents, refetch } = useAllAgents();
  
  // Use blockchain agents if available, otherwise fall back to mock data
  const agents = blockchainAgents.length > 0 ? blockchainAgents : MOCK_AGENTS;
  const isLoading = isFetchingAgents;
  const error = fetchError;
  
  // Track which agents are from blockchain vs mock
  const isShowingRealData = blockchainAgents.length > 0;
  
  // Agent metadata cache state
  const [agentMetadata, setAgentMetadata] = useState<Record<string, AgentMetadata | null>>({});
  
  // Filter states
  const [filters, setFilters] = useState<MarketplaceFilters>({
    showFlagged: false,
    showInactive: false,
  });
  const [sortBy, setSortBy] = useState<MarketplaceSortBy>('reputation-desc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch metadata for all agents
  useEffect(() => {
    const fetchAllMetadata = async () => {
      const newMetadata: Record<string, AgentMetadata | null> = {};
      
      for (const agent of agents) {
        if (agent.metadataURI && !agentMetadata[agent.metadataURI]) {
          const metadata = await fetchAgentMetadata(agent.metadataURI);
          if (metadata) {
            newMetadata[agent.metadataURI] = metadata;
          }
        }
      }
      
      if (Object.keys(newMetadata).length > 0) {
        setAgentMetadata(prev => ({ ...prev, ...newMetadata }));
      }
    };
    
    fetchAllMetadata();
  }, [agents]);
  
  // Get agent display name from metadata or fallback
  const getAgentName = (agent: Agent): string => {
    const metadata = agentMetadata[agent.metadataURI];
    if (metadata?.name) return metadata.name;
    return AGENT_NAMES[agent.id.toString()] || `Agent #${agent.id.toString()}`;
  };

  // Filter and sort agents
  const displayedAgents = useMemo(() => {
    let filtered = agents.filter((agent) => {
      // Filter by flags/inactive status
      if (!filters.showFlagged && agent.isFlagged) return false;
      if (!filters.showInactive && !agent.isActive) return false;

      // Filter by category
      if (filters.category !== undefined && agent.category !== filters.category) {
        return false;
      }

      // Filter by minimum reputation
      if (filters.minReputation && agent.reputationScore < filters.minReputation) {
        return false;
      }

      // Search query (searches name from metadata)
      if (searchQuery) {
        const name = getAgentName(agent).toLowerCase();
        if (!name.includes(searchQuery.toLowerCase()) && !agent.id.toString().includes(searchQuery)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'reputation-desc':
          return b.reputationScore - a.reputationScore;
        case 'reputation-asc':
          return a.reputationScore - b.reputationScore;
        case 'tasks-desc':
          return b.totalTasks - a.totalTasks;
        case 'newest':
          return b.registeredAt - a.registeredAt;
        case 'oldest':
          return a.registeredAt - b.registeredAt;
        default:
          return 0;
      }
    });

    return filtered;
  }, [agents, filters, sortBy, searchQuery, agentMetadata]);

  // Get reputation badge color
  const getReputationColor = (score: number): string => {
    if (score >= 150) return '#10b981'; // Excellent - green
    if (score >= 100) return '#3b82f6'; // Good - blue
    if (score >= 70) return '#f59e0b';  // Warning - yellow
    return '#ef4444';                    // Poor - red
  };

  // Get status badge
  const getStatusBadge = (agent: Agent) => {
    if (agent.isFlagged) {
      return { label: 'Flagged', color: '#ef4444', icon: '⚠️' };
    }
    if (!agent.isActive) {
      return { label: 'Inactive', color: '#6b7280', icon: '⏸️' };
    }
    if (agent.reputationScore >= 150) {
      return { label: 'Verified', color: '#10b981', icon: '✓' };
    }
    if (agent.reputationScore >= 100) {
      return { label: 'Active', color: '#3b82f6', icon: '●' };
    }
    return { label: 'New', color: '#8b5cf6', icon: '★' };
  };

  if (isLoading) {
    return (
      <div className="marketplace-loading">
        <div className="spinner-large" />
        <p>Loading agents from blockchain...</p>
        <style jsx>{`
          .marketplace-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            color: rgba(255, 255, 255, 0.7);
          }
          .spinner-large {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #60a5fa;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="marketplace-error">
        <span className="error-icon">❌</span>
        <h3>Failed to load agents</h3>
        <p>{getErrorMessage(error)}</p>
        <button onClick={() => refetch()} className="retry-btn">
          🔄 Retry
        </button>
        <style jsx>{`
          .marketplace-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 4rem 2rem;
            text-align: center;
          }
          .error-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          h3 {
            color: #ef4444;
            margin: 0 0 0.5rem;
          }
          p {
            color: rgba(255, 255, 255, 0.6);
            margin: 0 0 1rem;
          }
          .retry-btn {
            padding: 0.75rem 1.5rem;
            background: rgba(96, 165, 250, 0.2);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 8px;
            color: #60a5fa;
            cursor: pointer;
          }
          .retry-btn:hover {
            background: rgba(96, 165, 250, 0.3);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="marketplace-container">
      {/* Data Source Badge */}
      <div className="data-source-badge">
        {isShowingRealData ? (
          <span className="badge live">🔗 Live Blockchain Data ({totalAgents} agents)</span>
        ) : (
          <span className="badge demo">📋 Demo Data (Connect wallet & register agents)</span>
        )}
      </div>
      
      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={filters.category ?? ''}
            onChange={(e) => setFilters({
              ...filters,
              category: e.target.value ? Number(e.target.value) as ContentCategory : undefined,
            })}
          >
            <option value="">All Categories</option>
            {Object.entries(ContentCategoryLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MarketplaceSortBy)}
          >
            <option value="reputation-desc">Highest Reputation</option>
            <option value="reputation-asc">Lowest Reputation</option>
            <option value="tasks-desc">Most Tasks</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>

          <label className="checkbox-filter">
            <input
              type="checkbox"
              checked={filters.showInactive}
              onChange={(e) => setFilters({ ...filters, showInactive: e.target.checked })}
            />
            Show Inactive
          </label>
          
          <button className="refresh-btn" onClick={() => refetch()} title="Refresh agents">
            🔄
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-count">
        Showing {displayedAgents.length} of {agents.length} agents
      </div>

      {/* Agent Grid */}
      {displayedAgents.length === 0 ? (
        <div className="no-results">
          <span>🤖</span>
          <p>No agents found matching your criteria</p>
        </div>
      ) : (
        <div className="agents-grid">
          {displayedAgents.map((agent) => {
            const status = getStatusBadge(agent);
            const repColor = getReputationColor(agent.reputationScore);

            return (
              <div
                key={agent.id.toString()}
                className={`agent-card ${agent.isFlagged ? 'flagged' : ''}`}
                onClick={() => !agent.isFlagged && onHireAgent(agent)}
              >
                {/* Status Badge */}
                <div
                  className="status-badge"
                  style={{ background: status.color }}
                >
                  <span>{status.icon}</span>
                  <span>{status.label}</span>
                </div>

                {/* Agent Avatar */}
                <div className="agent-avatar">
                  <span>🤖</span>
                </div>

                {/* Agent Info */}
                <div className="agent-info">
                  <h3>{getAgentName(agent)}</h3>
                  <div className="agent-meta">
                    <span className="agent-id">#{agent.id.toString()}</span>
                    <span className="category-tag">
                      {ContentCategoryLabels[agent.category]}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="agent-stats">
                  <div className="stat">
                    <span className="stat-label">Reputation</span>
                    <span
                      className="stat-value"
                      style={{ color: repColor }}
                    >
                      {agent.reputationScore}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Tasks</span>
                    <span className="stat-value">{agent.totalTasks}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Success</span>
                    <span className="stat-value">
                      {agent.totalTasks > 0
                        ? Math.round((agent.successfulTasks / agent.totalTasks) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>

                {/* Report Button */}
                {onReportAgent && !agent.isFlagged && (
                  <button
                    className="report-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReportAgent(agent.id);
                    }}
                  >
                    🚩 Report
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .marketplace-container {
          padding: 1.5rem;
        }
        
        .data-source-badge {
          margin-bottom: 1rem;
        }
        
        .badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .badge.live {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #10b981;
        }
        
        .badge.demo {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        }

        .filters-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: rgba(255, 255, 255, 0.4);
        }

        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 0.9375rem;
        }

        .search-box input:focus {
          outline: none;
          border-color: #60a5fa;
        }

        .filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .filter-group select {
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .checkbox-filter {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          cursor: pointer;
        }

        .checkbox-filter input {
          accent-color: #60a5fa;
        }
        
        .refresh-btn {
          padding: 0.75rem;
          background: rgba(96, 165, 250, 0.1);
          border: 1px solid rgba(96, 165, 250, 0.3);
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .refresh-btn:hover {
          background: rgba(96, 165, 250, 0.2);
        }

        .results-count {
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .agents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .agent-card {
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .agent-card:hover:not(.flagged) {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          border-color: rgba(96, 165, 250, 0.3);
        }

        .agent-card.flagged {
          opacity: 0.6;
          cursor: not-allowed;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .status-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .agent-avatar {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .agent-info h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: white;
          margin: 0 0 0.5rem;
        }

        .category-tag {
          display: inline-block;
          padding: 4px 10px;
          background: rgba(139, 92, 246, 0.2);
          border-radius: 20px;
          font-size: 0.75rem;
          color: #c4b5fd;
        }

        .agent-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .agent-id {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
        }

        .agent-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.6875rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 2px;
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 600;
          color: white;
        }

        .report-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
          padding: 6px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: #f87171;
          font-size: 0.75rem;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .agent-card:hover .report-btn {
          opacity: 1;
        }

        .report-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }

        .no-results {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .no-results span {
          font-size: 4rem;
          display: block;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}

export default MarketplaceGrid;
