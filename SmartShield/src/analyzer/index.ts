/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from './ast/ASTAnalyzer.ts';
import { AttackPathGenerator } from './attackPaths/AttackPathGenerator.ts';
import { CallGraphAnalyzer } from './callgraph/CallGraphAnalyzer.ts';
import { CFGAnalyzer } from './cfg/CFGAnalyzer.ts';
import { ContractAnalyzer } from './contracts/ContractAnalyzer.ts';
import { ReadWriteAnalyzer } from './dataflow/ReadWriteAnalyzer.ts';
import { DelegatecallAnalyzer } from './delegatecall/DelegatecallAnalyzer.ts';
import {
  AnalysisInput,
  AnalysisResult,
  CFGFunction,
  ContractInfo,
  ContractIR,
  DelegatecallInfo,
  FunctionInfo,
  ReadWriteInfo,
  SensitiveOperation,
  StateVariableInfo,
  StorageSlotInfo,
} from './models/types.ts';
import { ParserService } from './parser/ParserService.ts';
import { SensitiveOperationAnalyzer } from './sensitiveOperations/SensitiveOperationAnalyzer.ts';
import { StorageLayoutAnalyzer } from './storage/StorageLayoutAnalyzer.ts';

export class AnalyzerService {
  /**
   * Main entry point: Performs full static analysis and attack-path search
   * across one or more Solidity source files.
   */
  public static analyze(input: AnalysisInput): AnalysisResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    const allContracts: ContractInfo[] = [];
    const allStateVars: StateVariableInfo[] = [];
    const allFunctions: FunctionInfo[] = [];
    const allModifiers: string[] = [];
    const allStorageLayouts: StorageSlotInfo[] = [];
    const allDelegatecalls: DelegatecallInfo[] = [];
    const allSensitiveOps: SensitiveOperation[] = [];
    const allCFGs: CFGFunction[] = [];
    const rawFunctionAsts = new Map<string, any>();

    // 1. Parse each file into AST
    const parsedFiles: { filename: string; ast: any }[] = [];
    for (const source of input.sources) {
      const { ast, errors: pErrors } = ParserService.parse(source.content, source.filename);
      if (pErrors.length > 0) {
        warnings.push(...pErrors);
      }
      if (ast) {
        parsedFiles.push({ filename: source.filename, ast });
      } else {
        errors.push(`Could not generate AST for ${source.filename}. Check Solidity syntax.`);
      }
    }

    if (parsedFiles.length === 0) {
      return {
        ir: {
          contracts: [],
          stateVariables: [],
          functions: [],
          modifiers: [],
          calls: [],
          delegatecalls: [],
          sensitiveOperations: [],
          controlFlow: [],
          storageLayout: [],
          compilerVersion: input.compilerVersion,
        },
        candidateAttackPaths: [],
        summary: {
          contractsCount: 0,
          functionsCount: 0,
          stateVariablesCount: 0,
          delegatecallCount: 0,
          sensitiveOperationsCount: 0,
          candidateAttackPathsCount: 0,
          highRiskCandidatesCount: 0,
        },
        warnings,
        errors: errors.length > 0 ? errors : ['No valid Solidity source provided.'],
        status: 'ERROR',
      };
    }

    // 2. Extract contracts and definitions
    for (const file of parsedFiles) {
      ASTAnalyzer.traverse(file.ast, (node) => {
        if (node.type === 'ContractDefinition') {
          const { contract, rawFunctions } = ContractAnalyzer.processContractDefinition(
            node,
            input.compilerVersion
          );
          allContracts.push(contract);

          for (const [fName, fNode] of rawFunctions.entries()) {
            rawFunctionAsts.set(`${contract.name}.${fName}`, fNode);
            rawFunctionAsts.set(fName, fNode);
          }
        }
      });
    }

    const contractNames = allContracts.map((c) => c.name);

    // 3. Compute EVM storage layouts for each contract
    for (const contract of allContracts) {
      const layout = StorageLayoutAnalyzer.calculateStorageLayout(
        contract.stateVariables,
        contract.name,
        input.compilerVersion
      );
      allStorageLayouts.push(...layout);

      // Update state variable slot information
      for (const sv of contract.stateVariables) {
        const slotEntry = layout.find((l) => l.name === sv.name);
        if (slotEntry) {
          sv.slot = slotEntry.slot;
          sv.offset = slotEntry.offset;
          sv.bytes = slotEntry.bytes;
          sv.isComplex = slotEntry.isComplex;
          sv.complexReason = slotEntry.complexReason;
        }
        allStateVars.push(sv);
      }

      for (const m of contract.modifiers) {
        if (!allModifiers.includes(m)) allModifiers.push(m);
      }

      for (const f of contract.functions) {
        allFunctions.push(f);
      }
    }

    // 4. Data flow & Read/Write Analysis for every function
    for (const contract of allContracts) {
      // Find inherited state variables if any
      const inheritedStateVars: StateVariableInfo[] = [];
      for (const inh of contract.inheritance) {
        const parentContract = allContracts.find((c) => c.name === inh);
        if (parentContract) {
          inheritedStateVars.push(...parentContract.stateVariables);
        }
      }

      for (const func of contract.functions) {
        const astNode = rawFunctionAsts.get(`${contract.name}.${func.name}`);
        const rwInfo = ReadWriteAnalyzer.analyzeFunction(
          astNode,
          func,
          contract.stateVariables,
          inheritedStateVars
        );
        func.reads = rwInfo.reads;
        func.writes = rwInfo.writes;
      }
    }

    // 5. Function Call Graph construction
    const callGraph = CallGraphAnalyzer.buildCallGraph(
      allFunctions,
      rawFunctionAsts,
      contractNames
    );

    // 6. Control Flow Analysis (CFG) for each function
    for (const contract of allContracts) {
      for (const func of contract.functions) {
        const astNode = rawFunctionAsts.get(`${contract.name}.${func.name}`);
        const cfg = CFGAnalyzer.buildCFG(astNode, func, contract.stateVariables);
        allCFGs.push(cfg);
      }
    }

    // 7. Delegatecall detection
    for (const contract of allContracts) {
      for (const func of contract.functions) {
        const astNode = rawFunctionAsts.get(`${contract.name}.${func.name}`);
        const dcs = DelegatecallAnalyzer.detectDelegatecalls(
          astNode,
          func,
          contract.stateVariables,
          contractNames
        );
        allDelegatecalls.push(...dcs);
      }
    }

    // 8. Sensitive operation detection (Selfdestruct, Ether transfer, Condition disorder)
    for (const contract of allContracts) {
      for (const func of contract.functions) {
        const astNode = rawFunctionAsts.get(`${contract.name}.${func.name}`);
        const ops = SensitiveOperationAnalyzer.detectSensitiveOperations(
          astNode,
          func,
          contract.stateVariables
        );
        allSensitiveOps.push(...ops);
      }
    }

    // 9. Generate Candidate Attack Paths
    const candidateAttackPaths = AttackPathGenerator.generateAttackPaths(
      allContracts,
      allFunctions,
      allDelegatecalls,
      allSensitiveOps,
      allStorageLayouts
    );

    // High risk candidate paths: paths where delegatecall is present or reaches Ether transfer/selfdestruct
    const highRiskCount = candidateAttackPaths.filter(
      (p) =>
        p.vulnerabilityType === 'SELF_DESTRUCT' ||
        p.vulnerabilityType === 'ETHER_TRANSFER' ||
        p.delegatecallLocation.function !== 'N/A'
    ).length;

    const ir: ContractIR = {
      contracts: allContracts,
      stateVariables: allStateVars,
      functions: allFunctions,
      modifiers: allModifiers,
      calls: callGraph.edges,
      delegatecalls: allDelegatecalls,
      sensitiveOperations: allSensitiveOps,
      controlFlow: allCFGs,
      storageLayout: allStorageLayouts,
      compilerVersion: input.compilerVersion,
    };

    return {
      ir,
      candidateAttackPaths,
      summary: {
        contractsCount: allContracts.length,
        functionsCount: allFunctions.length,
        stateVariablesCount: allStateVars.length,
        delegatecallCount: allDelegatecalls.length,
        sensitiveOperationsCount: allSensitiveOps.length,
        candidateAttackPathsCount: candidateAttackPaths.length,
        highRiskCandidatesCount: highRiskCount,
      },
      warnings,
      errors,
      status: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
    };
  }
}
