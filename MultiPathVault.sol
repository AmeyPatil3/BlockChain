// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ============================================================================
 * MultiPathVault.sol — SmartShield Multi-Candidate Attack Path Benchmark
 * ============================================================================
 * 
 * This contract demonstrates 6 DISTINCT candidate attack paths across 3 
 * vulnerable state variables (owner, admin, feeRecipient) and 3 different sinks:
 * 
 * 1. PATH-001 (Condition Disorder):
 *    setOwner() writes 'owner' -> emergencyShutdown() condition check (require)
 * 
 * 2. PATH-002 (Selfdestruct Drain):
 *    setOwner() writes 'owner' -> emergencyShutdown() selfdestruct sink
 * 
 * 3. PATH-003 (Condition Disorder):
 *    setAdmin() writes 'admin' -> sweepFunds() condition check (require)
 * 
 * 4. PATH-004 (Ether Sending Drain):
 *    setAdmin() writes 'admin' -> sweepFunds() transfer() sink
 * 
 * 5. PATH-005 (Condition Disorder):
 *    setFeeRecipient() writes 'feeRecipient' -> claimFees() condition check
 * 
 * 6. PATH-006 (Ether Sending Drain):
 *    setFeeRecipient() writes 'feeRecipient' -> claimFees() transfer() sink
 * ============================================================================
 */

contract MultiPathVault {
    // Slot 0: owner
    address public owner;
    // Slot 1: admin
    address public admin;
    // Slot 2: feeRecipient
    address public feeRecipient;
    // Slot 3: implementation logic contract
    address public implementation;

    constructor(address _implementation) {
        owner = msg.sender;
        admin = msg.sender;
        feeRecipient = msg.sender;
        implementation = _implementation;
    }

    // Unguarded delegatecall proxy entry point
    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall execution failed");
    }

    receive() external payable {}

    // SINK 1: Selfdestruct authorization path
    function emergencyShutdown(address payable recipient) external {
        require(msg.sender == owner, "Caller is not owner");
        selfdestruct(recipient);
    }

    // SINK 2: Ether sweep authorization path
    function sweepFunds(address payable to, uint256 amount) external {
        require(msg.sender == admin, "Caller is not admin");
        to.transfer(amount);
    }

    // SINK 3: Fee distribution path
    function claimFees(uint256 amount) external {
        require(msg.sender == feeRecipient, "Caller is not feeRecipient");
        payable(feeRecipient).transfer(amount);
    }
}

contract Implementation {
    // Overwrites Slot 0 ('owner') when called via delegatecall
    address public owner;
    // Overwrites Slot 1 ('admin') when called via delegatecall
    address public admin;
    // Overwrites Slot 2 ('feeRecipient') when called via delegatecall
    address public feeRecipient;

    // WRITER 1: Unguarded writer for owner (slot 0)
    function setOwner(address newOwner) external {
        owner = newOwner;
    }

    // WRITER 2: Unguarded writer for admin (slot 1)
    function setAdmin(address newAdmin) external {
        admin = newAdmin;
    }

    // WRITER 3: Unguarded writer for feeRecipient (slot 2)
    function setFeeRecipient(address newRecipient) external {
        feeRecipient = newRecipient;
    }
}
