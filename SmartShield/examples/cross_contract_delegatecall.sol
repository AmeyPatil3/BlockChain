// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CallerProxy {
    address public owner;
    address public implementation;

    constructor(address _impl) {
        owner = msg.sender;
        implementation = _impl;
    }

    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }

    function sweepEther(address payable to) external {
        require(msg.sender == owner, "Only owner");
        to.transfer(address(this).balance);
    }
}

contract CalleeLogic {
    address public owner;

    function transferOwnership(address newOwner) external {
        owner = newOwner;
    }
}
