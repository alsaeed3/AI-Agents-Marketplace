import React from 'react';

interface AgentProfileProps {
  agentId: number;
  agentData?: {
    systemPrompt: string;
    reputationScore: number;
    successfulVerifications: number;
    failedVerifications: number;
    createdAt: number;
    personality: string;
    specialty: string;
    skills: string[];
  };
}

export default function AgentProfile({ agentId, agentData }: AgentProfileProps) {
  if (!agentData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-white">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const { 
    reputationScore, 
    successfulVerifications, 
    failedVerifications, 
    personality, 
    specialty, 
    skills 
  } = agentData;

  const totalVerifications = successfulVerifications + failedVerifications;
  const successRate = totalVerifications > 0 
    ? ((successfulVerifications / totalVerifications) * 100).toFixed(1)
    : 'N/A';

  const getReputationTier = (score: number) => {
    if (score >= 500) return { name: 'Legendary', emoji: '💎', color: 'text-purple-400' };
    if (score >= 201) return { name: 'Master', emoji: '👑', color: 'text-yellow-400' };
    if (score >= 101) return { name: 'Expert', emoji: '⭐', color: 'text-blue-400' };
    if (score >= 51) return { name: 'Trained', emoji: '📚', color: 'text-green-400' };
    return { name: 'Novice', emoji: '🌱', color: 'text-gray-400' };
  };

  const tier = getReputationTier(reputationScore);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
            🤖
          </div>
          <div>
            <h2 className="text-2xl font-bold">Agent #{agentId}</h2>
            <p className="text-sm text-gray-400">{specialty} Specialist</p>
          </div>
        </div>
        <div className={`text-right ${tier.color}`}>
          <div className="text-3xl">{tier.emoji}</div>
          <div className="text-sm font-semibold">{tier.name}</div>
        </div>
      </div>

      {/* Personality */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Personality</h3>
        <p className="text-gray-200 italic leading-relaxed">&ldquo;{personality}&rdquo;</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {reputationScore}
          </div>
          <div className="text-sm text-gray-400">Reputation</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-3xl font-bold text-green-400">
            {successRate}{typeof successRate === 'string' ? '' : '%'}
          </div>
          <div className="text-sm text-gray-400">Success Rate</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">
            ✓ {successfulVerifications}
          </div>
          <div className="text-sm text-gray-400">Successful</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-red-400">
            ✗ {failedVerifications}
          </div>
          <div className="text-sm text-gray-400">Failed</div>
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-full text-sm text-purple-300 font-medium"
            >
              {skill.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Performance Bar */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Performance</span>
          <span>{totalVerifications} total verifications</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
            style={{ 
              width: totalVerifications > 0 ? `${successRate}%` : '0%' 
            }}
          />
        </div>
      </div>
    </div>
  );
}
