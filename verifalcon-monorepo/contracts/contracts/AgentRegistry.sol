// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @author VeriFalcon Team
 * @notice ERC-8004 Implementation for AI Agent Identity in the Decentralized AI Agent Marketplace
 * @dev Implements agent registration, moderation, and reputation management with security features
 * 
 * SECURITY FEATURES:
 * - AccessControl: Role-based permissions for admin and moderator actions
 * - Pausable: Emergency stop mechanism to halt malicious activity
 * - Community flagging: reportAgent() allows users to flag bad actors
 * 
 * LEGAL COMPLIANCE:
 * - ContentCategory enum: Mandatory categorization to prevent illegal content
 */
contract AgentRegistry is ERC721, ERC721URIStorage, AccessControl, Pausable, ReentrancyGuard {
    
    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    
    // ============ ENUMS ============
    /**
     * @notice Content categories for legal compliance
     * @dev Mandatory field to categorize AI agent output types
     */
    enum ContentCategory {
        Code,       // 0: Code generation agents
        Image,      // 1: Image generation/analysis agents
        Data,       // 2: Data processing agents
        Text,       // 3: Text generation agents
        Audio       // 4: Audio processing agents
    }
    
    // ============ STRUCTS ============
    /**
     * @notice Core information for each registered AI agent
     * @dev Maps to agentId (tokenId) in the ERC721 base
     */
    struct AgentInfo {
        address developer;          // Address of the agent developer
        string metadataURI;         // IPFS/HTTP URI for extended metadata
        ContentCategory category;   // Legal: mandatory content type classification
        uint256 reportCount;        // Community flagging counter
        uint256 reputationScore;    // Starts at 100, modified by performance
        uint256 totalTasks;         // Number of tasks completed
        uint256 successfulTasks;    // Tasks completed successfully
        uint256 registeredAt;       // Timestamp of registration
        bool isActive;              // Can accept new tasks
        bool isFlagged;             // Flagged by moderators
    }
    
    // ============ STATE VARIABLES ============
    mapping(uint256 => AgentInfo) public agents;
    uint256 private _agentIdCounter;
    
    // Configuration
    uint256 public reportThreshold = 5;      // Reports needed to auto-flag
    uint256 public minReputationScore = 50;  // Below this, agent is deactivated
    
    // ============ EVENTS ============
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed developer,
        ContentCategory category,
        uint256 timestamp
    );
    
    event AgentReported(
        uint256 indexed agentId,
        address indexed reporter,
        uint256 totalReports
    );
    
    event AgentFlagged(
        uint256 indexed agentId,
        address indexed moderator,
        string reason
    );
    
    event AgentUnflagged(
        uint256 indexed agentId,
        address indexed moderator
    );
    
    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 oldScore,
        uint256 newScore,
        bool isPositive
    );
    
    event AgentDeactivated(
        uint256 indexed agentId,
        string reason
    );
    
    event AgentReactivated(
        uint256 indexed agentId
    );
    
    // ============ CONSTRUCTOR ============
    constructor() ERC721("AI Agent Registry", "AIAR") {
        // Grant deployer all roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MODERATOR_ROLE, msg.sender);
    }
    
    // ============ REGISTRATION FUNCTIONS ============
    
    /**
     * @notice Register a new AI agent in the marketplace
     * @param metadataURI URI pointing to agent metadata (IPFS recommended)
     * @param category Content category for legal compliance
     * @return agentId The unique identifier for the registered agent
     * 
     * @dev Creates an ERC721 token representing the agent identity
     * Emits {AgentRegistered} event
     */
    function registerAgent(
        string calldata metadataURI,
        ContentCategory category
    ) external whenNotPaused nonReentrant returns (uint256) {
        uint256 agentId = _agentIdCounter;
        _agentIdCounter++;
        
        // Mint ERC721 token to developer
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, metadataURI);
        
        // Initialize agent info
        agents[agentId] = AgentInfo({
            developer: msg.sender,
            metadataURI: metadataURI,
            category: category,
            reportCount: 0,
            reputationScore: 100, // Starting reputation
            totalTasks: 0,
            successfulTasks: 0,
            registeredAt: block.timestamp,
            isActive: true,
            isFlagged: false
        });
        
        emit AgentRegistered(agentId, msg.sender, category, block.timestamp);
        
        return agentId;
    }
    
    // ============ MODERATION FUNCTIONS ============
    
    /**
     * @notice Community flagging mechanism for bad actors
     * @param agentId The agent to report
     * 
     * @dev Anyone can report an agent. If reports exceed threshold, agent is auto-flagged
     * Emits {AgentReported} event
     */
    function reportAgent(uint256 agentId) external whenNotPaused {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        require(_ownerOf(agentId) != msg.sender, "Cannot report own agent");
        
        agents[agentId].reportCount++;
        
        emit AgentReported(agentId, msg.sender, agents[agentId].reportCount);
        
        // Auto-flag if threshold exceeded
        if (agents[agentId].reportCount >= reportThreshold && !agents[agentId].isFlagged) {
            agents[agentId].isFlagged = true;
            agents[agentId].isActive = false;
            emit AgentFlagged(agentId, address(0), "Auto-flagged: Report threshold exceeded");
        }
    }
    
    /**
     * @notice Moderator function to flag a malicious agent
     * @param agentId The agent to flag
     * @param reason Reason for flagging
     * 
     * @dev Only MODERATOR_ROLE can call this
     * Emits {AgentFlagged} event
     */
    function flagAgent(
        uint256 agentId,
        string calldata reason
    ) external onlyRole(MODERATOR_ROLE) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        
        agents[agentId].isFlagged = true;
        agents[agentId].isActive = false;
        
        emit AgentFlagged(agentId, msg.sender, reason);
    }
    
    /**
     * @notice Moderator function to unflag an agent after review
     * @param agentId The agent to unflag
     * 
     * @dev Only MODERATOR_ROLE can call this
     * Emits {AgentUnflagged} event
     */
    function unflagAgent(uint256 agentId) external onlyRole(MODERATOR_ROLE) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        require(agents[agentId].isFlagged, "Agent is not flagged");
        
        agents[agentId].isFlagged = false;
        agents[agentId].reportCount = 0; // Reset reports after review
        
        emit AgentUnflagged(agentId, msg.sender);
    }
    
    // ============ REPUTATION FUNCTIONS ============
    
    /**
     * @notice Update agent reputation after task completion
     * @param agentId The agent whose reputation to update
     * @param isSuccess Whether the task was successful
     * 
     * @dev Called by PaymentRouter after task completion
     * Reputation changes: +10 for success, -5 for failure
     */
    function updateReputation(
        uint256 agentId,
        bool isSuccess
    ) external onlyRole(ADMIN_ROLE) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        
        uint256 oldScore = agents[agentId].reputationScore;
        
        if (isSuccess) {
            agents[agentId].reputationScore += 10;
            agents[agentId].successfulTasks++;
        } else {
            // Prevent underflow
            if (agents[agentId].reputationScore >= 5) {
                agents[agentId].reputationScore -= 5;
            } else {
                agents[agentId].reputationScore = 0;
            }
        }
        
        agents[agentId].totalTasks++;
        
        emit ReputationUpdated(agentId, oldScore, agents[agentId].reputationScore, isSuccess);
        
        // Auto-deactivate if reputation too low
        if (agents[agentId].reputationScore < minReputationScore && agents[agentId].isActive) {
            agents[agentId].isActive = false;
            emit AgentDeactivated(agentId, "Reputation below minimum threshold");
        }
    }
    
    // ============ EMERGENCY FUNCTIONS ============
    
    /**
     * @notice EMERGENCY STOP - Pause all agent registrations and reports
     * @dev Only ADMIN_ROLE can pause. Use in case of:
     * - Mass malicious agent registration
     * - Smart contract vulnerability discovered
     * - Coordinated attack on the marketplace
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Resume normal operations after emergency
     * @dev Only ADMIN_ROLE can unpause
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get complete agent information
     * @param agentId The agent to query
     * @return info The AgentInfo struct
     */
    function getAgentInfo(uint256 agentId) external view returns (AgentInfo memory) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return agents[agentId];
    }
    
    /**
     * @notice Check if an agent is available for tasks
     * @param agentId The agent to check
     * @return True if agent is active and not flagged
     */
    function isAgentAvailable(uint256 agentId) external view returns (bool) {
        if (_ownerOf(agentId) == address(0)) return false;
        return agents[agentId].isActive && !agents[agentId].isFlagged;
    }
    
    /**
     * @notice Get total number of registered agents
     * @return The current agent counter
     */
    function getTotalAgents() external view returns (uint256) {
        return _agentIdCounter;
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Update the report threshold for auto-flagging
     * @param newThreshold New number of reports needed
     */
    function setReportThreshold(uint256 newThreshold) external onlyRole(ADMIN_ROLE) {
        reportThreshold = newThreshold;
    }
    
    /**
     * @notice Update minimum reputation score
     * @param newMinScore New minimum score
     */
    function setMinReputationScore(uint256 newMinScore) external onlyRole(ADMIN_ROLE) {
        minReputationScore = newMinScore;
    }
    
    /**
     * @notice Manually activate an agent
     * @param agentId Agent to activate
     */
    function activateAgent(uint256 agentId) external onlyRole(ADMIN_ROLE) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        require(!agents[agentId].isFlagged, "Cannot activate flagged agent");
        
        agents[agentId].isActive = true;
        emit AgentReactivated(agentId);
    }
    
    /**
     * @notice Manually deactivate an agent
     * @param agentId Agent to deactivate
     * @param reason Reason for deactivation
     */
    function deactivateAgent(
        uint256 agentId,
        string calldata reason
    ) external onlyRole(ADMIN_ROLE) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        
        agents[agentId].isActive = false;
        emit AgentDeactivated(agentId, reason);
    }
    
    // ============ REQUIRED OVERRIDES ============
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
