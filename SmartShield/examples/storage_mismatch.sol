// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StorageCaller {
    address public owner;          // Slot 0
    address public implementation; // Slot 1

    constructor(address _impl) {
        owner = msg.sender;
        implementation = _impl;
    }

    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }

    function transferVault(address payable to) external {
        require(msg.sender == owner, "Only owner");
        to.transfer(address(this).balance);
    }
}

contract StorageCallee {
    uint256 public nonce;          // Slot 0: Mismatch with owner!
    address public owner;          // Slot 1: Mismatch with implementation!

    function bumpNonce() external {
        nonce += 1;
    }
}
