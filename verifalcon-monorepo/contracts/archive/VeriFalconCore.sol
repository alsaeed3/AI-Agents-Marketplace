// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./libraries/SafeMath.sol";
import "./interfaces/IVeriFalconCore.sol";

/**
 * @title VeriFalconCore (ARCHIVED)
 * @notice This contract has been archived as part of the strategic pivot to AI Agent Marketplace.
 * @dev Original luxury verification logic preserved for reference.
 */
contract VeriFalconCore is IVeriFalconCore {
    using SafeMath for uint256;

    struct Listing {
        address seller;
        uint256 price;
        uint256 aiScore;
        bool isActive;
    }

    mapping(uint256 => Listing) public listings;
    uint256 public minimumAIScore;
    address public owner;
    mapping(address => bool) public authorizedAgents;
    mapping(address => bool) public authorizedOracles;
    uint256 public protocolFee;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the contract owner");
        _;
    }

    modifier onlyAuthorizedAgent() {
        require(authorizedAgents[msg.sender], "Not an authorized agent");
        _;
    }

    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender], "Not an authorized oracle");
        _;
    }

    modifier isActiveListing(uint256 itemId) {
        require(listings[itemId].isActive, "Listing is not active");
        _;
    }

    constructor(uint256 _minimumAIScore, uint256 _protocolFee) {
        owner = msg.sender;
        minimumAIScore = _minimumAIScore;
        protocolFee = _protocolFee;
    }

    function listItem(uint256 itemId, uint256 price) external override {
        require(price > 0, "Price must be greater than zero");

        listings[itemId] = Listing({
            seller: msg.sender,
            price: price,
            aiScore: 0,
            isActive: true
        });

        emit ItemListed(itemId, msg.sender, price);
    }

    function submitResults(uint256 itemId, uint256 aiScore) external override onlyAuthorizedOracle isActiveListing(itemId) {
        listings[itemId].aiScore = aiScore;
        emit ResultsSubmitted(itemId, msg.sender, aiScore);
    }

    function purchaseItem(uint256 itemId) external payable override isActiveListing(itemId) {
        Listing memory listing = listings[itemId];
        require(msg.value >= listing.price, "Insufficient funds sent");

        listing.isActive = false;
        listings[itemId] = listing;

        payable(listing.seller).transfer(listing.price.sub(protocolFee));
        emit ItemPurchased(itemId, msg.sender);
    }

    function finalizeTransaction(uint256 itemId) external override onlyAuthorizedAgent isActiveListing(itemId) {
        Listing memory listing = listings[itemId];
        require(listing.aiScore >= minimumAIScore, "AI score does not meet the minimum requirement");

        listing.isActive = false;
        listings[itemId] = listing;

        emit TransactionFinalized(itemId, listing.seller, msg.sender);
    }

    function authorizeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = true;
    }

    function revokeAgent(address agent) external onlyOwner {
        authorizedAgents[agent] = false;
    }

    function authorizeOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = true;
    }

    function revokeOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = false;
    }

    function setMinimumAIScore(uint256 score) external override onlyOwner {
        minimumAIScore = score;
    }

    function getMinimumAIScore() external view override returns (uint256) {
        return minimumAIScore;
    }
}
