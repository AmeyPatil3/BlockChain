// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableOwnerProxy {
    address public owner;
    address public implementation;

    constructor(address _implementation) {
        owner = msg.sender;
        implementation = _implementation;
    }

    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }

    function execute(address payable recipient, uint256 amount) public {
        require(msg.sender == owner, "Caller is not owner");
        recipient.transfer(amount);
    }
}

contract Implementation {
    address public owner;

    function initialize(address newOwner) public {
        owner = newOwner;
    }
}
