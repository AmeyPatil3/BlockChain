/**
 * @file run-all-tests.ts
 * Comprehensive test suite verifying both Vulnerable and Safe delegatecall patterns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CandidateValidator } from '../../validator/path_validator/candidateValidator.ts';
import { CandidateAttackPath } from '../../validator/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAllTests() {
  console.log('\n======================================================');
  console.log('   SMARTSHIELD GROUP 2: AUTOMATED REGRESSION SUITE   ');
  console.log('======================================================\n');

  // Test 1: Vulnerable Contract Confirmation
  console.log('--- TEST CASE 1: VulnerableOwnerProxy (Should CONFIRM) ---');
  const vulnPath = path.resolve(__dirname, '../vulnerable_contracts/VulnerableOwner.sol');
  const vulnSource = fs.readFileSync(vulnPath, 'utf8');

  const vulnCandidate: CandidateAttackPath = {
    contract: 'VulnerableOwnerProxy',
    caller_contract: 'VulnerableOwnerProxy',
    callee_contract: 'Implementation',
    delegatecall_function: 'fallback',
    vulnerability_type: 'ETHER_TRANSFER',
    attack_path: ['initialize', 'execute'],
    vulnerability_variable: 'owner',
    writer_function: 'initialize',
    reader_function: 'execute',
    expected_storage: { slot: 0, offset: 0 },
  };

  const vulnResult = await CandidateValidator.validateCandidate(vulnCandidate, {
    soliditySource: vulnSource,
  });

  console.log(`- Result Status: [ ${vulnResult.status} ]`);
  console.log(`- Write Detected: ${vulnResult.write_detected}`);
  console.log(`- Storage Match:  ${vulnResult.storage_match}`);
  console.log(`- Constraints:    ${vulnResult.constraints}`);
  if (vulnResult.status !== 'CONFIRMED') {
    throw new Error(`Test 1 Failed: Expected CONFIRMED, got ${vulnResult.status}`);
  }
  console.log('✔ Test Case 1 PASSED: Confirmed true positive.\n');

  // Test 2: Safe Contract Rejection
  console.log('--- TEST CASE 2: SafeDelegatecall (Should REJECT) ---');
  const safePath = path.resolve(__dirname, '../safe_contracts/SafeDelegatecall.sol');
  const safeSource = fs.readFileSync(safePath, 'utf8');

  const safeCandidate: CandidateAttackPath = {
    contract: 'SafeDelegatecall',
    caller_contract: 'SafeDelegatecall',
    delegatecall_function: 'forward',
    vulnerability_type: 'ETHER_TRANSFER',
    attack_path: ['forward', 'forward'],
    vulnerability_variable: 'owner',
    writer_function: 'forward',
    reader_function: 'forward',
    expected_storage: { slot: 0, offset: 0 },
  };

  const safeResult = await CandidateValidator.validateCandidate(safeCandidate, {
    soliditySource: safeSource,
  });

  console.log(`- Result Status: [ ${safeResult.status} ]`);
  console.log(`- Reason:        ${safeResult.reason}`);
  if (safeResult.status === 'CONFIRMED') {
    throw new Error(`Test 2 Failed: Safe contract was falsely CONFIRMED!`);
  }
  console.log('✔ Test Case 2 PASSED: Successfully rejected benign contract (No False Positive).\n');

  console.log('======================================================');
  console.log('   ALL REGRESSION TESTS PASSED WITH 100% ACCURACY!    ');
  console.log('======================================================\n');
}

runAllTests().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***\n', err);
  process.exit(1);
});
