// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ============================================================================
 * MixedSecurityVault.sol — SmartShield Benchmark (Confirmed vs. Rejected Paths)
 * ============================================================================
 * 
 * This contract demonstrates both VULNERABLE and PROTECTED attack paths in 
 * the SAME contract so you can see Group 2 confirm some and reject others:
 * 
 * 🔴 PATH 1–2 (owner): CONFIRMED VULNERABLE
 *    setOwner() has NO guard -> attacker overwrites Slot 0 -> drains vault via emergencyShutdown()
 * 
 * 🔴 PATH 3–4 (admin): CONFIRMED VULNERABLE
 *    setAdmin() has NO guard -> attacker overwrites Slot 1 -> drains vault via sweepFunds()
 * 
 * 🟢 PATH 5–6 (feeRecipient): REJECTED / SAFE
 *    setFeeRecipient() is GUARDED by `require(msg.sender == owner)`!
 *    When an unauthorized attacker attempts delegatecall overwrite, the transaction
 *    REVERTS. Group 2's Z3 SMT solver proves UNSAT and marks it REJECTED / SAFE.
 *    0 ETH is drained!
 * ============================================================================
 */

contract MixedSecurityVault {
    // Slot 0: owner (VULNERABLE)
    address public owner;
    // Slot 1: admin (VULNERABLE)
    address public admin;
    // Slot 2: feeRecipient (PROTECTED)
    address public feeRecipient;
    // Slot 3: implementation address
    address public implementation;

    constructor(address _implementation) {
        owner = msg.sender;
        admin = msg.sender;
        feeRecipient = msg.sender;
        implementation = _implementation;
    }

    // Unguarded proxy entry point
    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }

    receive() external payable {}

    // SINK 1 (Vulnerable if owner hijacked)
    function emergencyShutdown(address payable recipient) external {
        require(msg.sender == owner, "Caller is not owner");
        selfdestruct(recipient);
    }

    // SINK 2 (Vulnerable if admin hijacked)
    function sweepFunds(address payable to, uint256 amount) external {
        require(msg.sender == admin, "Caller is not admin");
        to.transfer(amount);
    }

    // SINK 3 (Protected because feeRecipient cannot be hijacked)
    function claimFees(uint256 amount) external {
        require(msg.sender == feeRecipient, "Caller is not feeRecipient");
        payable(feeRecipient).transfer(amount);
    }
}

contract Implementation {
    address public owner;
    address public admin;
    address public feeRecipient;

    // 🔴 VULNERABLE WRITER: No access control on owner (overwrites slot 0)
    function setOwner(address newOwner) external {
        owner = newOwner;
    }

    // 🔴 VULNERABLE WRITER: No access control on admin (overwrites slot 1)
    function setAdmin(address newAdmin) external {
        admin = newAdmin;
    }

    // 🟢 SAFE WRITER: Guarded by owner check!
    // An attacker cannot call this via delegatecall without reverting!
    function setFeeRecipient(address newRecipient) external {
        require(msg.sender == owner, "Only owner can change fee recipient");
        feeRecipient = newRecipient;
    }
}
