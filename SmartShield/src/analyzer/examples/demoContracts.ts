/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DemoContract {
  id: string;
  name: string;
  category: string;
  description: string;
  compilerVersion: string;
  sources: { filename: string; content: string }[];
  expectedFinding: string;
}

export const DEMO_CONTRACTS: DemoContract[] = [
  {
    id: 'safe-delegatecall',
    name: 'Safe Delegatecall (safe_delegatecall.sol)',
    category: 'Protected Delegatecall',
    description:
      'A safe delegatecall pattern where delegatecall can only be invoked by authorized owner, and the implementation logic does not overwrite critical state.',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Delegatecall is detected, but no dangerous unvalidated state-variable attack path is produced.',
    sources: [
      {
        filename: 'safe_delegatecall.sol',
        content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeDelegatecall {
    address public immutable owner;
    address public implementation;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner permitted");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setImplementation(address _impl) external onlyOwner {
        implementation = _impl;
    }

    function forward(bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = implementation.delegatecall(data);
        require(success, "Forwarding failed");
        return result;
    }
}
`,
      },
    ],
  },
  {
    id: 'vulnerable-owner',
    name: 'Vulnerable Owner Manipulation (vulnerable_owner.sol)',
    category: 'Owner Manipulation',
    description:
      'A classic unvalidated delegatecall proxy. The implementation contract can overwrite the owner storage slot of the proxy, and execute() reads owner to allow draining Ether.',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Candidate attack path: initialize() writes owner, execute() reads owner and triggers sensitive transfer().',
    sources: [
      {
        filename: 'vulnerable_owner.sol',
        content: `// SPDX-License-Identifier: MIT
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
`,
      },
    ],
  },
  {
    id: 'vulnerable-transfer',
    name: 'Currency-Sending Anomaly (vulnerable_transfer.sol)',
    category: 'Currency Transfer',
    description:
      'A contract where an attacker-accessible function mutates the beneficiary or treasury destination, directly leading to an unauthorized currency withdrawal.',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Candidate attack path: setBeneficiary() writes beneficiary, withdrawFunds() reads beneficiary and reaches Ether transfer.',
    sources: [
      {
        filename: 'vulnerable_transfer.sol',
        content: `// SPDX-License-Identifier: MIT
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
`,
      },
    ],
  },
  {
    id: 'vulnerable-selfdestruct',
    name: 'Self-Destruct Anomaly (vulnerable_selfdestruct.sol)',
    category: 'Selfdestruct',
    description:
      'An uninitialized library or implementation contract containing selfdestruct. An attacker writes the master variable and calls destroy().',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Candidate attack path: initMaster() writes master, killContract() reads master and reaches selfdestruct.',
    sources: [
      {
        filename: 'vulnerable_selfdestruct.sol',
        content: `// SPDX-License-Identifier: MIT
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
`,
      },
    ],
  },
  {
    id: 'vulnerable-condition',
    name: 'Judgment-Condition Anomaly (vulnerable_condition.sol)',
    category: 'Condition Anomaly',
    description:
      'Demonstrates state variable mutation causing judgment-condition disorder. A function writes a state variable which is then read in a gatekeeping require condition.',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Candidate attack path: setAllowance writes isUnlocked, unlockVault reads isUnlocked in require condition.',
    sources: [
      {
        filename: 'vulnerable_condition.sol',
        content: `// SPDX-License-Identifier: MIT
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
`,
      },
    ],
  },
  {
    id: 'cross-contract-delegatecall',
    name: 'Cross-Contract Delegatecall (cross_contract_delegatecall.sol)',
    category: 'Cross-Contract',
    description:
      'Multi-contract architecture where a Proxy contract invokes delegatecall to a separate Callee contract. State layout relationships and data-flow across contracts are analyzed.',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Cross-contract call edge detected. Implementation writes owner at slot 0, Proxy reads owner at slot 0.',
    sources: [
      {
        filename: 'cross_contract_delegatecall.sol',
        content: `// SPDX-License-Identifier: MIT
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
`,
      },
    ],
  },
  {
    id: 'storage-mismatch',
    name: 'Storage Layout Mismatch (storage_mismatch.sol)',
    category: 'Storage Conflict',
    description:
      'Caller contract defines slot 0 as owner, while Implementation defines slot 0 as a different variable (nonce). Executing delegatecall leads to unintended slot collisions.',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Potential storage layout conflict detected: Caller slot 0 (owner) vs Callee slot 0 (nonce).',
    sources: [
      {
        filename: 'storage_mismatch.sol',
        content: `// SPDX-License-Identifier: MIT
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
`,
      },
    ],
  },
  {
    id: 'unresolved-target',
    name: 'Unresolved Delegatecall Target (unresolved_target.sol)',
    category: 'Unresolved Target',
    description:
      'The delegatecall destination target is passed dynamically via user input parameter rather than a known state variable or constant address.',
    compilerVersion: '0.8.20',
    expectedFinding:
      'Delegatecall target classified as target_resolution = UNKNOWN or PARAMETER. Static analysis flags partial resolution.',
    sources: [
      {
        filename: 'unresolved_target.sol',
        content: `// SPDX-License-Identifier: MIT
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
`,
      },
    ],
  },
];
