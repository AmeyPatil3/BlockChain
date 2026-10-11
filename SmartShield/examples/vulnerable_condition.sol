// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableCondition {
    address public admin;
    bool public isUnlocked;
    uint256 public vaultValue;

    constructor() {
        admin = msg.sender;
        isUnlocked = false;
    }

    function toggleStatus(bool state) public {
        isUnlocked = state;
    }

    function unlockVault(address payable recipient) public {
        require(isUnlocked, "Vault is locked");
        recipient.transfer(vaultValue);
    }
}
