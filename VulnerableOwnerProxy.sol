// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * ============================================================
 *  VulnerableOwnerProxy — SmartShield End-to-End Demo Contract
 * ============================================================
 *
 *  VULNERABILITY: Unguarded delegatecall allows an attacker to
 *  overwrite the `owner` storage slot of the Proxy contract by
 *  calling the implementation's `initialize()` function through
 *  the proxy's fallback.
 *
 *  Attack Path (detected by Group 1 -> validated by Group 2):
 *
 *    Attacker --> Proxy.fallback()
 *                   └─► delegatecall --> Implementation.initialize(attacker)
 *                                            └─► owner = attacker   (SSTORE slot 0)
 *                                            └─► Proxy.withdraw()   (sensitive sink)
 *
 *  HOW TO USE:
 *  1. Upload this file to the Group 1 (SmartShield) dashboard
 *  2. Click "Analyse Contract" -- Group 1 will detect the attack path
 *  3. Open Group 2 dashboard -> click "Sync from Group 1 (Port 3000)"
 *  4. Group 2 runs full EVM validation + Z3 SMT check -> CONFIRMED
 * ============================================================
 */

// ---------- Logic / Implementation Contract ----------
contract Implementation {
    address public owner;

    /**
     * @notice VULNERABLE: No access control. Any caller can set owner.
     *         When called via delegatecall from the Proxy, it writes
     *         into the Proxy's own storage slot 0 (owner).
     */
    function initialize(address _newOwner) public {
        owner = _newOwner;
    }

    /**
     * @notice Simulates an action only the owner should perform.
     */
    function sensitiveAction() public view returns (string memory) {
        require(msg.sender == owner, "Caller is not owner");
        return "Sensitive action executed";
    }
}

// ---------- Proxy Contract (the vulnerable one) ----------
contract VulnerableOwnerProxy {
    // slot 0 -- this is the variable that gets hijacked
    address public owner;
    // slot 1 -- address of the logic contract
    address private _implementation;

    constructor(address implementation_) {
        owner = msg.sender;
        _implementation = implementation_;
    }

    /**
     * @notice Withdraw ETH -- only the owner should be able to do this.
     *         This is the "sensitive sink" that the attacker wants to reach.
     */
    function withdraw(address payable recipient, uint256 amount) external {
        require(msg.sender == owner, "Caller is not owner");
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    /**
     * @notice VULNERABLE FALLBACK:
     *         Forwards every call to the implementation via delegatecall
     *         with no access-control guard on which functions can be called.
     *
     *         An attacker can call initialize(attackerAddress) through this
     *         fallback, which runs in the Proxy's storage context, setting
     *         slot 0 (owner) to the attacker's address.
     */
    fallback() external payable {
        address impl = _implementation;
        require(impl != address(0), "No implementation");

        (bool success, ) = impl.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }

    receive() external payable {}
}
