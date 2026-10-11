/**
 * @file milestone1.test.ts
 * Section 16: First Milestone Verification Test
 * Proves end-to-end candidate path validation on VulnerableOwner contract:
 * - Compiles Solidity source
 * - Executes candidate path (initialize -> execute)
 * - Observes expected WRITE at slot 0
 * - Observes expected READ at slot 0
 * - Matches storage slot 0 & offset 0
 * - Solves access-control constraints (SAT)
 * - Reaches sensitive transfer sink
 * - Returns CONFIRMED
 * - Simulates safe local exploit and computes before/after state diff
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CandidateValidator } from '../../validator/path_validator/candidateValidator.ts';
import { ExploitReplayer } from '../../simulator/simulation_engine/exploitReplayer.ts';
import { CandidateAttackPath } from '../../validator/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMilestone1Test() {
  console.log('\n======================================================');
  console.log('  SMARTSHIELD GROUP 2: MILESTONE 1 VERIFICATION TEST  ');
  console.log('======================================================\n');

  // Load contract source
  const contractPath = path.resolve(__dirname, '../vulnerable_contracts/VulnerableOwner.sol');
  const soliditySource = fs.readFileSync(contractPath, 'utf8');

  // 1. Group 1 Candidate Attack Path Input
  const candidatePath: CandidateAttackPath = {
    contract: 'VulnerableOwnerProxy',
    caller_contract: 'VulnerableOwnerProxy',
    callee_contract: 'Implementation',
    delegatecall_function: 'fallback',
    vulnerability_type: 'ETHER_TRANSFER',
    attack_path: ['initialize', 'execute'],
    vulnerability_variable: 'owner',
    writer_function: 'initialize',
    reader_function: 'execute',
    expected_storage: {
      slot: 0,
      offset: 0,
    },
  };

  console.log('1. Consuming Group 1 CandidateAttackPath:');
  console.log(JSON.stringify(candidatePath, null, 2));

  // 2. Run Candidate Validator
  console.log('\n2. Running CandidateValidator (Isolated EVM + SMT)...');
  const startTime = Date.now();
  const validationResult = await CandidateValidator.validateCandidate(candidatePath, {
    soliditySource,
    initialContractBalanceEth: '10.0',
  });
  const duration = Date.now() - startTime;

  console.log(`Validation completed in ${duration}ms\n`);
  console.log('Validation Result Summary:');
  console.log(`- Status:                      [ ${validationResult.status} ]`);
  console.log(`- Executable:                  ${validationResult.executable}`);
  console.log(`- Write Detected:              ${validationResult.write_detected}`);
  console.log(`- Read Detected:               ${validationResult.read_detected}`);
  console.log(`- Storage Slot/Offset Match:   ${validationResult.storage_match}`);
  console.log(`- SMT Constraint Result:       ${validationResult.constraints}`);
  console.log(`- Sensitive Operation Reached: ${validationResult.sensitive_operation_reached}`);
  console.log(`- Reason:                      ${validationResult.reason}`);

  if (validationResult.evidence?.path_trace) {
    console.log('\nExecution Path Trace:');
    validationResult.evidence.path_trace.forEach((step) => console.log(`  -> ${step}`));
  }

  // Assertions for Milestone 1
  if (validationResult.status !== 'CONFIRMED') {
    throw new Error(`TEST FAILED: Expected CONFIRMED but got ${validationResult.status}`);
  }
  if (!validationResult.executable) throw new Error('TEST FAILED: Path should be executable');
  if (!validationResult.write_detected) throw new Error('TEST FAILED: Expected write was not detected');
  if (!validationResult.read_detected) throw new Error('TEST FAILED: Expected read was not detected');
  if (!validationResult.storage_match) throw new Error('TEST FAILED: Storage slot mismatch');
  if (validationResult.constraints !== 'SAT') throw new Error('TEST FAILED: Constraints must be SAT');
  if (!validationResult.sensitive_operation_reached) throw new Error('TEST FAILED: Sensitive sink was not reached');

  console.log('\n>>> SUCCESS: All validation criteria passed with CONFIRMED status! <<<\n');

  // 3. Run Controlled Simulation
  console.log('3. Running Controlled Attack Simulation (Safe Sandbox)...');
  const simResult = await ExploitReplayer.simulateExploit(candidatePath, soliditySource, '10.0');

  console.log('\nSimulation State Comparison:');
  console.log(`- BEFORE Owner:             ${simResult.before_state.owner}`);
  console.log(`- BEFORE Proxy Balance:     ${simResult.before_state.contractBalanceEth} ETH`);
  console.log(`- BEFORE Attacker Balance:  ${simResult.before_state.attackerBalanceEth} ETH`);
  console.log(`- AFTER Owner:              ${simResult.after_state.owner}`);
  console.log(`- AFTER Proxy Balance:      ${simResult.after_state.contractBalanceEth} ETH`);
  console.log(`- AFTER Attacker Balance:   ${simResult.after_state.attackerBalanceEth} ETH`);
  console.log(`- Impact Summary:           ${simResult.impact.summary}`);

  if (simResult.status !== 'COMPLETED') {
    throw new Error(`SIMULATION FAILED: Status is ${simResult.status}`);
  }
  if (simResult.after_state.contractBalanceEth !== '0.0') {
    throw new Error('SIMULATION FAILED: Contract was not drained');
  }
  if (simResult.after_state.attackerBalanceEth !== '10.0') {
    throw new Error('SIMULATION FAILED: Attacker did not receive drained funds');
  }

  console.log('\n>>> SUCCESS: Simulation completed and confirmed state transition! <<<\n');
  console.log('======================================================');
  console.log('  MILESTONE 1 END-TO-END VALIDATION PROVEN ACCORDING TO PRD ');
  console.log('======================================================\n');
}

runMilestone1Test().catch((err) => {
  console.error('\n*** MILESTONE 1 VERIFICATION FAILED ***\n', err);
  process.exit(1);
});
