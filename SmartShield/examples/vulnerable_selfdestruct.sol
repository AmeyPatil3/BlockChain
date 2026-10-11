// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WalletProxy {
    address public master;
    address public implementation;

    constructor(address _impl) {
        master = msg.sender;
        implementation = _impl;
    }

    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }
}

contract WalletImplementation {
    address public master;

    function initMaster(address _newMaster) public {
        master = _newMaster;
    }

    function killContract(address payable recipient) public {
        require(msg.sender == master, "Only master can destroy");
        selfdestruct(recipient);
    }
}
