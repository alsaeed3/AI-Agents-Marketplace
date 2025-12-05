// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeriBot
 * @dev BAP-578 Implementation for AI Agent Intelligence
 * Stores system prompts and manages reputation scoring for vision AI agents
 */
contract VeriBot is ERC721, Ownable {
    struct AgentMemory {
        string systemPrompt;
        uint256 reputationScore;
        uint256 successfulVerifications;
        uint256 failedVerifications;
        uint256 createdAt;
        // Enhanced NFA metadata
        string personality;     // e.g., "Expert luxury authenticator"
        string specialty;       // e.g., "Gucci", "Rolex", "General"
        string[] skills;        // e.g., ["stitching_analysis", "logo_inspection"]
    }

    mapping(uint256 => AgentMemory) private agentMemories;
    uint256 private _tokenIdCounter;

    event AgentCreated(uint256 indexed agentId, address indexed owner, uint256 timestamp);
    event ReputationUpdated(uint256 indexed agentId, uint256 newScore, bool success);
    event SystemPromptUpdated(uint256 indexed agentId, string newPrompt);
    event PersonalityUpdated(uint256 indexed agentId, string personality, string specialty);
    event SkillsUpdated(uint256 indexed agentId, string[] skills);

    constructor() ERC721("VeriBot", "VBT") {}

    /**
     * @dev Mints a new AI agent NFT
     * @param to Address to mint the agent to
     * @param tokenId Token ID for the new agent
     */
    function safeMint(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
        agentMemories[tokenId].createdAt = block.timestamp;
        agentMemories[tokenId].reputationScore = 100; // Start with base reputation
        emit AgentCreated(tokenId, to, block.timestamp);
    }

    /**
     * @dev Creates a new agent with auto-incremented ID and full metadata
     * @param to Address to mint the agent to
     * @param initialPrompt Initial system prompt for the agent
     * @param personality Agent's personality description
     * @param specialty Agent's specialty (e.g., "Gucci", "General")
     * @param skills Array of skills the agent possesses
     */
    function createAgent(
        address to, 
        string memory initialPrompt,
        string memory personality,
        string memory specialty,
        string[] memory skills
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        agentMemories[tokenId].systemPrompt = initialPrompt;
        agentMemories[tokenId].createdAt = block.timestamp;
        agentMemories[tokenId].reputationScore = 100;
        agentMemories[tokenId].personality = personality;
        agentMemories[tokenId].specialty = specialty;
        agentMemories[tokenId].skills = skills;
        
        emit AgentCreated(tokenId, to, block.timestamp);
        emit SystemPromptUpdated(tokenId, initialPrompt);
        emit PersonalityUpdated(tokenId, personality, specialty);
        emit SkillsUpdated(tokenId, skills);
        
        return tokenId;
    }

    /**
     * @dev Updates agent reputation based on verification success
     * @param agentId Agent token ID
     * @param success Whether the verification was successful
     */
    function updateReputation(uint256 agentId, bool success) external onlyOwner {
        require(_exists(agentId), "Agent does not exist");
        
        if (success) {
            agentMemories[agentId].reputationScore += 10;
            agentMemories[agentId].successfulVerifications += 1;
        } else {
            // Prevent underflow
            if (agentMemories[agentId].reputationScore >= 5) {
                agentMemories[agentId].reputationScore -= 5;
            }
            agentMemories[agentId].failedVerifications += 1;
        }
        
        emit ReputationUpdated(agentId, agentMemories[agentId].reputationScore, success);
    }

    /**
     * @dev Updates the system prompt for an agent
     * @param agentId Agent token ID
     * @param prompt New system prompt
     */
    function setSystemPrompt(uint256 agentId, string memory prompt) external onlyOwner {
        require(_exists(agentId), "Agent does not exist");
        agentMemories[agentId].systemPrompt = prompt;
        emit SystemPromptUpdated(agentId, prompt);
    }

    /**
     * @dev Gets agent memory and statistics
     * @param agentId Agent token ID
     * @return systemPrompt The agent's system prompt
     * @return reputationScore Current reputation score
     */
    function getAgentMemory(uint256 agentId) external view returns (string memory, uint256) {
        require(_exists(agentId), "Agent does not exist");
        return (agentMemories[agentId].systemPrompt, agentMemories[agentId].reputationScore);
    }

    /**
     * @dev Gets detailed agent statistics
     * @param agentId Agent token ID
     */
    function getAgentStats(uint256 agentId) external view returns (
        string memory systemPrompt,
        uint256 reputationScore,
        uint256 successfulVerifications,
        uint256 failedVerifications,
        uint256 createdAt
    ) {
        require(_exists(agentId), "Agent does not exist");
        AgentMemory memory memory_ = agentMemories[agentId];
        return (
            memory_.systemPrompt,
            memory_.reputationScore,
            memory_.successfulVerifications,
            memory_.failedVerifications,
            memory_.createdAt
        );
    }

    /**
     * @dev Gets the total number of agents created
     */
    function getTotalAgents() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Gets agent personality and specialty
     * @param agentId Agent token ID
     * @return personality Agent's personality description
     * @return specialty Agent's specialty area
     */
    function getAgentPersonality(uint256 agentId) external view returns (
        string memory personality,
        string memory specialty
    ) {
        require(_exists(agentId), "Agent does not exist");
        return (agentMemories[agentId].personality, agentMemories[agentId].specialty);
    }

    /**
     * @dev Gets agent skills
     * @param agentId Agent token ID
     * @return skills Array of agent skills
     */
    function getAgentSkills(uint256 agentId) external view returns (string[] memory) {
        require(_exists(agentId), "Agent does not exist");
        return agentMemories[agentId].skills;
    }

    /**
     * @dev Updates agent personality and specialty
     * @param agentId Agent token ID
     * @param personality New personality description
     * @param specialty New specialty area
     */
    function setAgentPersonality(
        uint256 agentId, 
        string memory personality,
        string memory specialty
    ) external onlyOwner {
        require(_exists(agentId), "Agent does not exist");
        agentMemories[agentId].personality = personality;
        agentMemories[agentId].specialty = specialty;
        emit PersonalityUpdated(agentId, personality, specialty);
    }

    /**
     * @dev Updates agent skills
     * @param agentId Agent token ID
     * @param skills New skills array
     */
    function setAgentSkills(uint256 agentId, string[] memory skills) external onlyOwner {
        require(_exists(agentId), "Agent does not exist");
        agentMemories[agentId].skills = skills;
        emit SkillsUpdated(agentId, skills);
    }

    /**
     * @dev Gets complete agent profile (all metadata)
     * @param agentId Agent token ID
     */
    function getAgentProfile(uint256 agentId) external view returns (
        string memory systemPrompt,
        uint256 reputationScore,
        uint256 successfulVerifications,
        uint256 failedVerifications,
        uint256 createdAt,
        string memory personality,
        string memory specialty,
        string[] memory skills
    ) {
        require(_exists(agentId), "Agent does not exist");
        AgentMemory memory memory_ = agentMemories[agentId];
        return (
            memory_.systemPrompt,
            memory_.reputationScore,
            memory_.successfulVerifications,
            memory_.failedVerifications,
            memory_.createdAt,
            memory_.personality,
            memory_.specialty,
            memory_.skills
        );
    }
}