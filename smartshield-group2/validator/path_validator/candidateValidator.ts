/**
 * @file candidateValidator.ts
 * FR-03, FR-08, FR-09: Candidate Path Execution & Vulnerability Confirmation Engine
 * Consumes CandidateAttackPath and executes sequential path calls in the EVM sandbox.
 */

import { ethers } from 'ethers';
import { CandidateAttackPath, ValidationResult, RuntimeAccess } from '../types.ts';
import { SolcCompiler } from '../compiler/solcCompiler.ts';
import { EVMRunner } from '../symbolic_executor/evmRunner.ts';
import { SlotComparator } from '../storage_tracker/slotComparator.ts';
import { Z3Solver } from '../constraint_checker/z3Solver.ts';

export interface ValidationOptions {
  soliditySource?: string;
  sources?: Record<string, string>;
  initialContractBalanceEth?: string;
}

export class CandidateValidator {
  /**
   * Validates a candidate attack path end-to-end
   */
  public static async validateCandidate(
    candidate: CandidateAttackPath,
    options: ValidationOptions
  ): Promise<ValidationResult> {
    const rawSources = options.sources || (options.soliditySource ? { 'Contract.sol': options.soliditySource } : null);

    if (!rawSources) {
      return {
        status: 'INCONCLUSIVE',
        executable: false,
        write_detected: false,
        read_detected: false,
        storage_match: false,
        constraints: 'UNKNOWN',
        sensitive_operation_reached: false,
        variable: candidate.vulnerability_variable || candidate.vulnerabilityVariable || 'unknown',
        reason: 'Solidity source code was not provided for compilation and validation.',
        runtime_accesses: [],
        attack_path: candidate.attack_path || candidate.path || [],
      };
    }

    // 1. Compile contracts (FR-01)
    const compileResult = SolcCompiler.compile(rawSources);
    if (!compileResult.success) {
      return {
        status: 'INCONCLUSIVE',
        executable: false,
        write_detected: false,
        read_detected: false,
        storage_match: false,
        constraints: 'UNKNOWN',
        sensitive_operation_reached: false,
        variable: candidate.vulnerability_variable || candidate.vulnerabilityVariable || 'unknown',
        reason: `Solidity compilation failed: ${compileResult.errors?.join('; ')}`,
        runtime_accesses: [],
        attack_path: candidate.attack_path || candidate.path || [],
      };
    }

    // 2. Setup EVM Runner (FR-02)
    const runner = new EVMRunner();
    await runner.init();

    const aliceAddr = '0x1000000000000000000000000000000000000001';
    const attackerAddr = '0x2000000000000000000000000000000000000002';
    const recipientAddr = '0x3000000000000000000000000000000000000003';

    await runner.setAccountBalance(aliceAddr, '100.0');
    await runner.setAccountBalance(attackerAddr, '10.0');
    await runner.setAccountBalance(recipientAddr, '0.0');

    // Identify target contracts
    const callerContractName =
      candidate.caller_contract || candidate.callerContract || candidate.contract || 'VulnerableOwnerProxy';
    const calleeContractName =
      candidate.callee_contract || candidate.calleeContract || 'Implementation';

    const callerCompiled = compileResult.contracts[callerContractName];
    const calleeCompiled = compileResult.contracts[calleeContractName];

    if (!callerCompiled) {
      return {
        status: 'INCONCLUSIVE',
        executable: false,
        write_detected: false,
        read_detected: false,
        storage_match: false,
        constraints: 'UNKNOWN',
        sensitive_operation_reached: false,
        variable: candidate.vulnerability_variable || candidate.vulnerabilityVariable || 'unknown',
        reason: `Target caller contract '${callerContractName}' not found in compiled artifacts. Available: ${Object.keys(compileResult.contracts).join(', ')}`,
        runtime_accesses: [],
        attack_path: candidate.attack_path || candidate.path || [],
      };
    }

    try {
      // 3. Deploy contracts
      let calleeAddr = '0x0000000000000000000000000000000000000000';
      if (calleeCompiled) {
        calleeAddr = await runner.deployContract(aliceAddr, calleeCompiled.bytecode);
      }

      // Check constructor params for proxy
      let constructorArgsHex = '';
      if (calleeCompiled && callerCompiled.abi) {
        const constructorAbi = callerCompiled.abi.find((item) => item.type === 'constructor');
        if (constructorAbi && constructorAbi.inputs && constructorAbi.inputs.length === 1) {
          const abiCoder = ethers.AbiCoder.defaultAbiCoder();
          constructorArgsHex = abiCoder.encode(['address'], [calleeAddr]).slice(2);
        }
      }

      const proxyAddr = await runner.deployContract(aliceAddr, callerCompiled.bytecode, constructorArgsHex);

      // Fund proxy with test ETH
      const initialBal = options.initialContractBalanceEth || '10.0';
      await runner.setAccountBalance(proxyAddr, initialBal);

      // 4. Candidate Path Execution (FR-03, FR-04)
      const writerFunctionName =
        candidate.writer_function || candidate.writerFunction || candidate.attack_path?.[0] || 'initialize';
      const readerFunctionName =
        candidate.reader_function || candidate.readerFunction || candidate.attack_path?.[1] || 'execute';

      const pathTrace: string[] = [];

      // Step 1: Execute writer function (e.g. initialize(attackerAddr))
      pathTrace.push(`Step 1: Attacker invokes ${writerFunctionName}(${attackerAddr}) on Proxy`);

      let writerDataHex = '0x';
      if (calleeCompiled && calleeCompiled.abi) {
        const iface = new ethers.Interface(calleeCompiled.abi);
        const fnFragment = iface.getFunction(writerFunctionName);
        if (fnFragment) {
          // If function accepts an address (newOwner)
          if (fnFragment.inputs.length === 1 && fnFragment.inputs[0].type === 'address') {
            writerDataHex = iface.encodeFunctionData(writerFunctionName, [attackerAddr]);
          } else {
            writerDataHex = iface.encodeFunctionData(writerFunctionName, []);
          }
        }
      }

      const writerResult = await runner.executeCall({
        caller: attackerAddr,
        to: proxyAddr,
        dataHex: writerDataHex,
        contractName: callerContractName,
        functionName: writerFunctionName,
      });

      if (!writerResult.success) {
        return {
          status: 'REJECTED',
          executable: false,
          write_detected: false,
          read_detected: false,
          storage_match: false,
          constraints: 'UNSAT',
          sensitive_operation_reached: false,
          variable: candidate.vulnerability_variable || candidate.vulnerabilityVariable || 'unknown',
          reason: `Writer function execution reverted: ${writerResult.revertReason || 'Reverted without reason'}`,
          runtime_accesses: runner.getAllRuntimeAccesses(),
          attack_path: candidate.attack_path || candidate.path || [],
        };
      }

      // Check whether write occurred
      const writesObserved = writerResult.runtimeAccesses.filter((a) => a.operation === 'WRITE');
      const writeDetected = writesObserved.length > 0;
      let runtimeOwnerWritten: string | null = null;
      if (writeDetected && writesObserved[0].value) {
        runtimeOwnerWritten = writesObserved[0].value;
      }

      // Step 2: Execute reader function (e.g. execute(recipient, 10 ETH))
      pathTrace.push(`Step 2: Attacker invokes ${readerFunctionName}(${recipientAddr}, ${initialBal} ETH)`);

      let readerDataHex = '0x';
      if (callerCompiled && callerCompiled.abi) {
        const iface = new ethers.Interface(callerCompiled.abi);
        const fnFragment = iface.getFunction(readerFunctionName);
        if (fnFragment) {
          if (fnFragment.inputs.length === 2) {
            readerDataHex = iface.encodeFunctionData(readerFunctionName, [
              recipientAddr,
              ethers.parseEther(initialBal),
            ]);
          } else if (fnFragment.inputs.length === 1) {
            readerDataHex = iface.encodeFunctionData(readerFunctionName, [recipientAddr]);
          } else {
            readerDataHex = iface.encodeFunctionData(readerFunctionName, []);
          }
        }
      }

      const readerResult = await runner.executeCall({
        caller: attackerAddr,
        to: proxyAddr,
        dataHex: readerDataHex,
        contractName: callerContractName,
        functionName: readerFunctionName,
      });

      const readsObserved = readerResult.runtimeAccesses.filter((a) => a.operation === 'READ');
      const readDetected = readsObserved.length > 0;

      // 5. Storage Validation (FR-05, FR-06)
      const rawStorage = candidate.expected_storage || candidate.storage;
      const expectedStorage: import('../types.ts').ExpectedStorage = {
        slot: rawStorage?.slot ?? 0,
        offset: rawStorage?.offset ?? 0,
      };
      const storageComp = SlotComparator.validateStorageAccesses(
        expectedStorage,
        candidate.vulnerability_variable || candidate.vulnerabilityVariable || 'owner',
        writerFunctionName,
        readerFunctionName,
        runner.getAllRuntimeAccesses()
      );

      // 6. Constraint Validation (FR-07)
      const constraintCheck = await Z3Solver.checkAccessControlCondition({
        callerAddress: attackerAddr,
        originalOwnerAddress: aliceAddr,
        runtimeOwnerWrittenAddress: runtimeOwnerWritten,
        requiresOwnerCheck: true,
      });

      // 7. Check sensitive sink reachability
      const sensitiveReached =
        readerResult.transfers.length > 0 ||
        readerResult.selfdestructs.length > 0 ||
        readerResult.success;

      if (readerResult.transfers.length > 0) {
        pathTrace.push(
          `Sensitive Sink Reached: ${readerResult.transfers[0].valueEth} ETH transferred to ${readerResult.transfers[0].to}`
        );
      }

      // 8. Final Vulnerability Confirmation (FR-08, FR-09)
      const isConfirmed =
        writerResult.success &&
        readerResult.success &&
        writeDetected &&
        readDetected &&
        storageComp.matches &&
        constraintCheck.status === 'SAT' &&
        sensitiveReached;

      const allAccesses = runner.getAllRuntimeAccesses();

      return {
        status: isConfirmed ? 'CONFIRMED' : 'REJECTED',
        executable: writerResult.success && readerResult.success,
        write_detected: writeDetected,
        read_detected: readDetected,
        storage_match: storageComp.matches,
        constraints: constraintCheck.status,
        sensitive_operation_reached: sensitiveReached,
        variable: candidate.vulnerability_variable || candidate.vulnerabilityVariable || 'owner',
        reason: isConfirmed
          ? `Vulnerability successfully confirmed: delegatecall writer overwritten storage slot 0x${storageComp.expectedSlotNormalized}, granting caller unauthorized control to execute sensitive sink.`
          : `Validation rejected: ${storageComp.details || constraintCheck.reason}`,
        runtime_accesses: allAccesses,
        attack_path: candidate.attack_path || candidate.path || [writerFunctionName, readerFunctionName],
        evidence: {
          writer_observed: writesObserved[0] || null,
          reader_observed: readsObserved[0] || null,
          sensitive_operation_details: readerResult.transfers[0]
            ? `Transfer: ${readerResult.transfers[0].valueEth} ETH to ${readerResult.transfers[0].to}`
            : undefined,
          path_trace: pathTrace,
        },
      };
    } catch (err: any) {
      return {
        status: 'INCONCLUSIVE',
        executable: false,
        write_detected: false,
        read_detected: false,
        storage_match: false,
        constraints: 'UNKNOWN',
        sensitive_operation_reached: false,
        variable: candidate.vulnerability_variable || candidate.vulnerabilityVariable || 'unknown',
        reason: `Runtime execution error during validation: ${err.message || String(err)}`,
        runtime_accesses: runner.getAllRuntimeAccesses(),
        attack_path: candidate.attack_path || candidate.path || [],
      };
    }
  }
}
