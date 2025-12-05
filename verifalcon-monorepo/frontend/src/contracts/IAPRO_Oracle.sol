// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAPRO_Oracle {
    function requestSerialCheck(string calldata serialNumber) external returns (uint256 requestId);
    
    event OracleResponse(uint256 indexed requestId, bool isValid, bool isStolen);
}