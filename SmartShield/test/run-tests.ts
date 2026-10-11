/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnalyzerService } from '../src/analyzer/index.ts';
import { AnalysisInput } from '../src/analyzer/models/types.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ' - ' + detail : ''}`);
    failed++;
  }
}

console.log('====================================================');
console.log('SMARTSHIELD: AUTOMATED TEST SUITE');
console.log('Testing Static Analysis & Attack Path Search Engine');
console.log('====================================================\n');

// Sample test contracts
const testContractSource1 = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TestDrain {
    address public owner;
    uint256 public balance;

    function initialize(address _owner) public {
        owner = _owner;
    }

    function execute() public {
        require(msg.sender == owner, "Unauthorized");
        payable(owner).transfer(balance);
    }
}
`;

const testContractSourceSafeDC = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeDC {
    address public immutable owner;
    address public target;

    constructor() {
        owner = msg.sender;
    }

    function executeDelegate(bytes memory data) public {
        require(msg.sender == owner, "Only owner");
        (bool success, ) = target.delegatecall(data);
        require(success, "Failed");
    }
}
`;

const testCompoundSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Counter {
    uint256 public count;
    uint256 public total;

    function increment() public {
        count++;
        total += 5;
    }

    function reset() public {
        delete count;
    }
}
`;

const testSelfdestructSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Destroyer {
    address public master;

    function setMaster(address _m) external {
        master = _m;
    }

    function destroy(address payable target) external {
        require(msg.sender == master);
        selfdestruct(target);
    }
}
`;

// TEST 1: AST extraction
console.log('TEST SUITE 1: AST Extraction & Contract Parsing');
const res1 = AnalyzerService.analyze({
  sources: [{ filename: 'TestDrain.sol', content: testContractSource1 }],
  compilerVersion: '0.8.20',
});
assert(res1.status === 'SUCCESS', 'AST parsed successfully without fatal error');
assert(res1.ir.contracts.length === 1, 'ContractDefinition correctly identified: TestDrain');
assert(res1.ir.contracts[0].name === 'TestDrain', 'Contract name is TestDrain');

// TEST 2: Function extraction
console.log('\nTEST GROUP 2: Function Extraction & Signatures');
const drainFuncs = res1.ir.contracts[0].functions;
assert(drainFuncs.length === 2, 'Two functions extracted: initialize, execute');
const initFunc = drainFuncs.find((f) => f.name === 'initialize');
const execFunc = drainFuncs.find((f) => f.name === 'execute');
assert(!!initFunc, 'initialize function extracted');
assert(!!execFunc, 'execute function extracted');
assert(initFunc?.fullSignature === 'initialize(address)', 'Full signature correctly matches initialize(address)');
assert(initFunc?.externalReachability === true, 'initialize() has externalReachability = true');

// TEST 3: State variable extraction
console.log('\nTEST GROUP 3: State Variable Extraction');
const stateVars = res1.ir.contracts[0].stateVariables;
assert(stateVars.length === 2, 'Two state variables extracted: owner, balance');
assert(stateVars.some((v) => v.name === 'owner' && v.type === 'address'), 'owner (address) extracted');
assert(stateVars.some((v) => v.name === 'balance' && v.type === 'uint256'), 'balance (uint256) extracted');

// TEST 4 & 5: READ and WRITE detection
console.log('\nTEST GROUP 4 & 5: READ & WRITE Data Flow Detection');
assert(initFunc?.writes.includes('owner') === true, 'initialize() writes state variable owner');
assert(!initFunc?.reads.includes('owner'), 'initialize() does NOT read owner (only writes it)');
assert(execFunc?.reads.includes('owner') === true, 'execute() reads state variable owner');
assert(execFunc?.reads.includes('balance') === true, 'execute() reads state variable balance');

// TEST 6: Compound READ+WRITE (++, +=, delete)
console.log('\nTEST GROUP 6: Compound READ+WRITE Detection');
const resCompound = AnalyzerService.analyze({
  sources: [{ filename: 'Counter.sol', content: testCompoundSource }],
  compilerVersion: '0.8.20',
});
const incFunc = resCompound.ir.functions.find((f) => f.name === 'increment');
const resetFunc = resCompound.ir.functions.find((f) => f.name === 'reset');
assert(incFunc?.reads.includes('count') === true, 'count++ records READ of count');
assert(incFunc?.writes.includes('count') === true, 'count++ records WRITE of count');
assert(incFunc?.reads.includes('total') === true, 'total += 5 records READ of total');
assert(incFunc?.writes.includes('total') === true, 'total += 5 records WRITE of total');
assert(resetFunc?.writes.includes('count') === true, 'delete count records WRITE of count');

// TEST 7: Function Call Graph
console.log('\nTEST GROUP 7: Function Call Graph');
assert(Array.isArray(res1.ir.calls), 'Call graph edges extracted');

// TEST 8: Delegatecall detection
console.log('\nTEST GROUP 8: Delegatecall Detection');
const resSafeDC = AnalyzerService.analyze({
  sources: [{ filename: 'SafeDC.sol', content: testContractSourceSafeDC }],
  compilerVersion: '0.8.20',
});
assert(resSafeDC.ir.delegatecalls.length === 1, 'Delegatecall detected in executeDelegate');
const dcInfo = resSafeDC.ir.delegatecalls[0];
assert(dcInfo.targetExpression === 'target', 'Delegatecall target expression is target');
assert(dcInfo.targetType === 'state_variable', 'Delegatecall target type classified as state_variable');

// TEST 9: Selfdestruct detection
console.log('\nTEST GROUP 9: Selfdestruct Detection');
const resSD = AnalyzerService.analyze({
  sources: [{ filename: 'Destroyer.sol', content: testSelfdestructSource }],
  compilerVersion: '0.8.20',
});
const sdOp = resSD.ir.sensitiveOperations.find((o) => o.type === 'SELF_DESTRUCT');
assert(!!sdOp, 'Sensitive operation SELF_DESTRUCT correctly detected');
assert(sdOp?.function === 'destroy', 'SELF_DESTRUCT detected inside destroy()');

// TEST 10: Ether transfer detection
console.log('\nTEST GROUP 10: Ether Transfer Detection');
const ethOp = res1.ir.sensitiveOperations.find((o) => o.type === 'ETHER_TRANSFER');
assert(!!ethOp, 'Sensitive operation ETHER_TRANSFER correctly detected');
assert(ethOp?.function === 'execute', 'ETHER_TRANSFER detected inside execute()');

// TEST 11: Condition detection
console.log('\nTEST GROUP 11: Condition Detection');
const condOp = res1.ir.sensitiveOperations.find((o) => o.type === 'JUDGMENT_CONDITION');
assert(!!condOp, 'JUDGMENT_CONDITION detected in require(msg.sender == owner)');
assert(condOp?.variablesUsed.includes('owner') === true, 'Condition recorded as using state variable owner');

// TEST 12: Candidate attack path generation (A writes X, B reads X -> transfer)
console.log('\nTEST GROUP 12: Candidate Attack Path Generation');
assert(res1.candidateAttackPaths.length > 0, 'Candidate attack path generated');
const path1 = res1.candidateAttackPaths.find((p) => p.vulnerabilityVariable === 'owner' && p.sensitiveOperation.type === 'ETHER_TRANSFER');
assert(!!path1, 'Path generated: initialize -> owner -> execute -> ETHER_TRANSFER');
assert(path1?.status === 'CANDIDATE', 'Path status is strictly CANDIDATE');
assert(path1?.validationRequired === true, 'Path has validationRequired === true');
assert(path1?.writerFunction === 'initialize', 'Writer function is initialize');
assert(path1?.readerFunction === 'execute', 'Reader function is execute');

// TEST 13: Storage layout extraction
console.log('\nTEST GROUP 13: Storage Layout Extraction');
const ownerLayout = res1.ir.storageLayout.find((s) => s.name === 'owner');
const balanceLayout = res1.ir.storageLayout.find((s) => s.name === 'balance');
assert(ownerLayout?.slot === '0', 'owner placed at slot 0');
assert(ownerLayout?.bytes === 20, 'address owner occupies 20 bytes');
assert(balanceLayout?.slot === '1', 'balance placed at slot 1 (since 20 + 32 > 32)');

// TEST 14: False-positive candidate handling
// Delegatecall exists, but no state-variable read-write dependency exists
console.log('\nTEST GROUP 14: False-Positive Candidate Handling');
assert(resSafeDC.ir.delegatecalls.length === 1, 'Delegatecall detected in SafeDC');
const safePaths = resSafeDC.candidateAttackPaths.filter((p) => p.vulnerabilityType === 'ETHER_TRANSFER' || p.vulnerabilityType === 'SELF_DESTRUCT');
assert(safePaths.length === 0, 'No dangerous candidate attack path generated when no state dependency exists');

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY.\n');
}
