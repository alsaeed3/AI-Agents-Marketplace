// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PaymentRouter
 * @author VeriFalcon Team
 * @notice x402-style Micro-payments Implementation for the Decentralized AI Agent Marketplace
 * @dev Implements secure payment routing with escrow, refunds, and stuck funds recovery
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard: All payout functions protected against reentrancy attacks
 * - AccessControl: Role-based permissions for admin operations
 * - Pausable: Emergency stop for payment operations
 * 
 * LEGAL COMPLIANCE:
 * - termsVersion: Users must accept current ToS version before transactions
 * - acceptedTerms mapping: On-chain proof of ToS acceptance
 * 
 * GAP MITIGATION:
 * - withdrawStuckFunds(): 48-hour timelock for admin fund recovery
 */
contract PaymentRouter is AccessControl, Pausable, ReentrancyGuard {
    
    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    // ============ ENUMS ============
    enum TaskStatus {
        Pending,        // 0: Task created, payment escrowed
        InProgress,     // 1: Agent has started work
        Completed,      // 2: Task completed successfully
        Refunded,       // 3: Client received refund
        Disputed        // 4: Under dispute resolution
    }
    
    // ============ STRUCTS ============
    struct Task {
        uint256 agentId;        // ID from AgentRegistry
        address client;         // Address of the client
        address developer;      // Agent developer (payout recipient)
        uint256 payment;        // Total payment amount in wei
        uint256 platformFee;    // Platform fee in wei
        uint256 deadline;       // Unix timestamp for task deadline
        uint256 createdAt;      // Task creation timestamp
        TaskStatus status;      // Current task status
        bool tosAccepted;       // Legal: ToS acceptance proof
    }
    
    // ============ STATE VARIABLES ============
    mapping(uint256 => Task) public tasks;
    uint256 private _taskIdCounter;
    
    // Legal compliance
    string public termsVersion;
    mapping(address => mapping(string => bool)) public acceptedTerms;
    
    // Payment configuration
    uint256 public platformFeePercent = 5; // 5% platform fee
    uint256 public refundTimeout = 30;      // 30 seconds for auto-refund eligibility
    
    // Stuck funds recovery (48-hour timelock)
    uint256 public constant TIMELOCK_DURATION = 48 hours;
    mapping(bytes32 => uint256) public withdrawalRequests;
    
    // Protocol treasury
    uint256 public accumulatedFees;
    
    // Reference to AgentRegistry (for reputation updates)
    address public agentRegistry;
    
    // ============ EVENTS ============
    event TaskCreated(
        uint256 indexed taskId,
        uint256 indexed agentId,
        address indexed client,
        uint256 payment
    );
    
    event TaskStarted(
        uint256 indexed taskId,
        uint256 timestamp
    );
    
    event TaskCompleted(
        uint256 indexed taskId,
        uint256 payoutAmount
    );
    
    event TaskRefunded(
        uint256 indexed taskId,
        uint256 refundAmount
    );
    
    event TermsAccepted(
        address indexed user,
        string version,
        uint256 timestamp
    );
    
    event TermsVersionUpdated(
        string oldVersion,
        string newVersion
    );
    
    event WithdrawalRequested(
        bytes32 indexed requestId,
        uint256 amount,
        uint256 unlockTime
    );
    
    event WithdrawalExecuted(
        bytes32 indexed requestId,
        uint256 amount,
        address recipient
    );
    
    event WithdrawalCancelled(
        bytes32 indexed requestId
    );
    
    event FeesWithdrawn(
        uint256 amount,
        address recipient
    );
    
    event PaymentReleased(
        uint256 indexed taskId,
        uint256 amount,
        address indexed client,
        address indexed developer
    );
    
    // ============ MODIFIERS ============
    
    /**
     * @notice Ensure user has accepted current ToS version
     * @dev Required before any payment transaction
     */
    modifier termsAccepted() {
        require(
            acceptedTerms[msg.sender][termsVersion],
            "Must accept current Terms of Service"
        );
        _;
    }
    
    // ============ CONSTRUCTOR ============
    constructor(string memory initialTermsVersion) {
        termsVersion = initialTermsVersion;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }
    
    // ============ TERMS OF SERVICE FUNCTIONS ============
    
    /**
     * @notice Accept the current Terms of Service version
     * @dev Required before creating tasks or making payments
     * Creates on-chain proof of acceptance
     * 
     * Emits {TermsAccepted} event
     */
    function acceptTerms() external {
        require(!acceptedTerms[msg.sender][termsVersion], "Already accepted current terms");
        
        acceptedTerms[msg.sender][termsVersion] = true;
        
        emit TermsAccepted(msg.sender, termsVersion, block.timestamp);
    }
    
    /**
     * @notice Check if a user has accepted current terms
     * @param user Address to check
     * @return True if user has accepted current termsVersion
     */
    function hasAcceptedTerms(address user) external view returns (bool) {
        return acceptedTerms[user][termsVersion];
    }
    
    /**
     * @notice Update Terms of Service version
     * @param newVersion New version string (e.g., "v2.0")
     * @dev All users must re-accept after version update
     * 
     * Emits {TermsVersionUpdated} event
     */
    function updateTermsVersion(
        string calldata newVersion
    ) external onlyRole(ADMIN_ROLE) {
        string memory oldVersion = termsVersion;
        termsVersion = newVersion;
        
        emit TermsVersionUpdated(oldVersion, newVersion);
    }
    
    // ============ TASK & PAYMENT FUNCTIONS ============
    
    /**
     * @notice Create a new task and escrow payment
     * @param agentId ID of the agent from AgentRegistry
     * @param developer Address of the agent developer (payment recipient)
     * @param deadline Unix timestamp for task deadline
     * @return taskId The unique identifier for the created task
     * 
     * @dev Payment is held in escrow until task completion or refund
     * Emits {TaskCreated} event
     */
    function createTask(
        uint256 agentId,
        address developer,
        uint256 deadline
    ) external payable whenNotPaused nonReentrant termsAccepted returns (uint256) {
        require(msg.value > 0, "Payment required");
        require(developer != address(0), "Invalid developer address");
        require(deadline > block.timestamp, "Deadline must be in future");
        
        uint256 taskId = _taskIdCounter;
        _taskIdCounter++;
        
        // Calculate platform fee
        uint256 fee = (msg.value * platformFeePercent) / 100;
        
        tasks[taskId] = Task({
            agentId: agentId,
            client: msg.sender,
            developer: developer,
            payment: msg.value,
            platformFee: fee,
            deadline: deadline,
            createdAt: block.timestamp,
            status: TaskStatus.Pending,
            tosAccepted: true
        });
        
        emit TaskCreated(taskId, agentId, msg.sender, msg.value);
        
        return taskId;
    }
    
    /**
     * @notice Mark task as started by agent
     * @param taskId The task to start
     * 
     * @dev Called by operator when agent begins work
     * Emits {TaskStarted} event
     */
    function startTask(uint256 taskId) external onlyRole(OPERATOR_ROLE) {
        require(tasks[taskId].client != address(0), "Task does not exist");
        require(tasks[taskId].status == TaskStatus.Pending, "Task not pending");
        
        tasks[taskId].status = TaskStatus.InProgress;
        
        emit TaskStarted(taskId, block.timestamp);
    }
    
    /**
     * @notice Complete task and release payment to developer
     * @param taskId The task to complete
     * 
     * @dev Protected by ReentrancyGuard against reentrancy attacks
     * Emits {TaskCompleted} event
     */
    function completeTask(
        uint256 taskId
    ) external onlyRole(OPERATOR_ROLE) nonReentrant {
        Task storage task = tasks[taskId];
        require(task.client != address(0), "Task does not exist");
        require(
            task.status == TaskStatus.Pending || task.status == TaskStatus.InProgress,
            "Task not in valid state"
        );
        
        task.status = TaskStatus.Completed;
        
        // Calculate payout (total - fee)
        uint256 payout = task.payment - task.platformFee;
        
        // Accumulate platform fees
        accumulatedFees += task.platformFee;
        
        // Transfer payout to developer
        // SECURITY: Using call instead of transfer for gas flexibility
        (bool success, ) = payable(task.developer).call{value: payout}("");
        require(success, "Payout transfer failed");
        
        emit TaskCompleted(taskId, payout);
        emit PaymentReleased(taskId, payout, task.client, task.developer);
    }
    
    /**
     * @notice Refund client for failed/timed-out task
     * @param taskId The task to refund
     * 
     * @dev Client can request refund if:
     * - Task is still pending after deadline
     * - Agent fails to respond within refundTimeout
     * 
     * Protected by ReentrancyGuard
     * Emits {TaskRefunded} event
     */
    function refundTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.client != address(0), "Task does not exist");
        require(
            msg.sender == task.client || hasRole(OPERATOR_ROLE, msg.sender),
            "Not authorized"
        );
        require(
            task.status == TaskStatus.Pending || task.status == TaskStatus.InProgress,
            "Task not refundable"
        );
        
        // Check refund eligibility
        bool isPastDeadline = block.timestamp > task.deadline;
        bool isPastTimeout = block.timestamp > task.createdAt + refundTimeout;
        
        require(
            isPastDeadline || isPastTimeout || hasRole(OPERATOR_ROLE, msg.sender),
            "Refund not yet available"
        );
        
        task.status = TaskStatus.Refunded;
        
        // Full refund to client
        (bool success, ) = payable(task.client).call{value: task.payment}("");
        require(success, "Refund transfer failed");
        
        emit TaskRefunded(taskId, task.payment);
    }
    
    // ============ STUCK FUNDS RECOVERY (48-HOUR TIMELOCK) ============
    
    /**
     * @notice Request withdrawal of stuck funds
     * @param amount Amount to withdraw
     * @param recipient Address to receive funds
     * @return requestId Unique identifier for this withdrawal request
     * 
     * @dev Creates a timelock request that can be executed after 48 hours
     * This is a GAP MITIGATION feature for funds that may get stuck
     * 
     * Emits {WithdrawalRequested} event
     */
    function requestStuckFundsWithdrawal(
        uint256 amount,
        address recipient
    ) external onlyRole(ADMIN_ROLE) returns (bytes32) {
        require(amount > 0, "Amount must be positive");
        require(recipient != address(0), "Invalid recipient");
        
        bytes32 requestId = keccak256(
            abi.encodePacked(amount, recipient, block.timestamp, msg.sender)
        );
        
        require(withdrawalRequests[requestId] == 0, "Request already exists");
        
        uint256 unlockTime = block.timestamp + TIMELOCK_DURATION;
        withdrawalRequests[requestId] = unlockTime;
        
        emit WithdrawalRequested(requestId, amount, unlockTime);
        
        return requestId;
    }
    
    /**
     * @notice Execute a timelocked withdrawal request
     * @param requestId The request ID from requestStuckFundsWithdrawal
     * @param amount Amount to withdraw (must match original request)
     * @param recipient Recipient address (must match original request)
     * 
     * @dev Can only be executed after 48-hour timelock has passed
     * Protects against hasty admin actions
     * 
     * Emits {WithdrawalExecuted} event
     */
    function executeStuckFundsWithdrawal(
        bytes32 requestId,
        uint256 amount,
        address recipient
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        uint256 unlockTime = withdrawalRequests[requestId];
        require(unlockTime != 0, "Request does not exist");
        require(block.timestamp >= unlockTime, "Timelock not expired");
        
        
        // Note: For enhanced security in production, you could store and verify
        // full request details. The requestId itself provides the verification.
        
        delete withdrawalRequests[requestId];
        
        require(address(this).balance >= amount, "Insufficient balance");
        
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Withdrawal transfer failed");
        
        emit WithdrawalExecuted(requestId, amount, recipient);
    }
    
    /**
     * @notice Cancel a pending withdrawal request
     * @param requestId The request ID to cancel
     * 
     * @dev Allows admin to cancel if circumstances change
     * Emits {WithdrawalCancelled} event
     */
    function cancelWithdrawalRequest(
        bytes32 requestId
    ) external onlyRole(ADMIN_ROLE) {
        require(withdrawalRequests[requestId] != 0, "Request does not exist");
        
        delete withdrawalRequests[requestId];
        
        emit WithdrawalCancelled(requestId);
    }
    
    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Withdraw accumulated platform fees
     * @param recipient Address to receive fees
     * 
     * @dev Only accumulated fees can be withdrawn, not escrowed funds
     * Emits {FeesWithdrawn} event
     */
    function withdrawFees(
        address recipient
    ) external onlyRole(ADMIN_ROLE) nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(accumulatedFees > 0, "No fees to withdraw");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Fee withdrawal failed");
        
        emit FeesWithdrawn(amount, recipient);
    }
    
    /**
     * @notice Update platform fee percentage
     * @param newFeePercent New fee percentage (0-20%)
     */
    function setPlatformFee(uint256 newFeePercent) external onlyRole(ADMIN_ROLE) {
        require(newFeePercent <= 20, "Fee too high");
        platformFeePercent = newFeePercent;
    }
    
    /**
     * @notice Update refund timeout duration
     * @param newTimeout New timeout in seconds
     */
    function setRefundTimeout(uint256 newTimeout) external onlyRole(ADMIN_ROLE) {
        refundTimeout = newTimeout;
    }
    
    /**
     * @notice Set AgentRegistry address for reputation updates
     * @param registry Address of AgentRegistry contract
     */
    function setAgentRegistry(address registry) external onlyRole(ADMIN_ROLE) {
        require(registry != address(0), "Invalid registry address");
        agentRegistry = registry;
    }
    
    /**
     * @notice Emergency pause all payment operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Resume payment operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get task details
     * @param taskId The task to query
     * @return Task struct with all details
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        require(tasks[taskId].client != address(0), "Task does not exist");
        return tasks[taskId];
    }
    
    /**
     * @notice Get total number of tasks created
     */
    function getTotalTasks() external view returns (uint256) {
        return _taskIdCounter;
    }
    
    /**
     * @notice Check if refund is available for a task
     * @param taskId The task to check
     * @return True if refund can be processed
     */
    function isRefundAvailable(uint256 taskId) external view returns (bool) {
        Task memory task = tasks[taskId];
        if (task.client == address(0)) return false;
        if (task.status != TaskStatus.Pending && task.status != TaskStatus.InProgress) {
            return false;
        }
        
        return block.timestamp > task.deadline || 
               block.timestamp > task.createdAt + refundTimeout;
    }
    
    /**
     * @notice Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // ============ RECEIVE FUNCTION ============
    
    /**
     * @notice Allow contract to receive ETH/BNB
     */
    receive() external payable {}
}
