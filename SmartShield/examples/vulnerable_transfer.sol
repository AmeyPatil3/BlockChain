// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableTransfer {
    address public beneficiary;
    address public implementation;
    uint256 public balance;

    constructor(address _implementation) {
        beneficiary = msg.sender;
        implementation = _implementation;
    }

    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }

    function setBeneficiary(address _newBeneficiary) public {
        beneficiary = _newBeneficiary;
    }

    function withdrawFunds(uint256 amount) public {
        require(msg.sender == beneficiary, "Unauthorized beneficiary");
        payable(beneficiary).transfer(amount);
    }
}
