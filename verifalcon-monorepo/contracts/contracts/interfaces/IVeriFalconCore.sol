// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVeriFalconCore {
    // Event emitted when an item is listed
    event ItemListed(uint256 indexed itemId, address indexed seller, uint256 price);

    // Event emitted when results are submitted
    event ResultsSubmitted(uint256 indexed itemId, address indexed oracle, uint256 aiScore);

    // Event emitted when a purchase is made
    event ItemPurchased(uint256 indexed itemId, address indexed buyer);

    // Event emitted when a transaction is finalized
    event TransactionFinalized(uint256 indexed itemId, address indexed seller, address indexed buyer);

    // Function to list an item for sale
    function listItem(uint256 itemId, uint256 price) external;

    // Function to submit results from AI and Oracle
    function submitResults(uint256 itemId, uint256 aiScore) external;

    // Function to purchase an item
    function purchaseItem(uint256 itemId) external payable;

    // Function to finalize a transaction
    function finalizeTransaction(uint256 itemId) external;

    // Function to set the minimum AI score required for transactions
    function setMinimumAIScore(uint256 score) external;

    // Function to get the current minimum AI score
    function getMinimumAIScore() external view returns (uint256);
}