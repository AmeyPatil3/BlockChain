// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeDelegatecall {
    address public immutable owner;
    address public implementation;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner permitted");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setImplementation(address _impl) external onlyOwner {
        implementation = _impl;
    }

    function forward(bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = implementation.delegatecall(data);
        require(success, "Forwarding failed");
        return result;
    }
}
