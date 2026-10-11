// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DynamicDispatcher {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function dispatch(address target, bytes calldata data) external returns (bytes memory) {
        // Target is dynamically supplied by caller parameter
        (bool success, bytes memory result) = target.delegatecall(data);
        require(success, "Dynamic delegatecall failed");
        return result;
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }
}
