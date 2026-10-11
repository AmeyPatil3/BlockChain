/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from '../ast/ASTAnalyzer.ts';
import { FunctionAnalyzer } from '../functions/FunctionAnalyzer.ts';
import { ContractInfo, FunctionInfo, StateVariableInfo } from '../models/types.ts';

export class ContractAnalyzer {
  /**
   * Process a ContractDefinition AST node into ContractInfo
   */
  public static processContractDefinition(
    node: any,
    compilerVersion: string
  ): { contract: ContractInfo; rawFunctions: Map<string, any> } {
    const contractName = node.name;
    const kind = (node.kind || 'contract').toLowerCase() as 'contract' | 'interface' | 'library';

    // Inheritance
    const inheritance: string[] = [];
    if (node.baseContracts) {
      for (const base of node.baseContracts) {
        const baseName = base.baseName?.namePath || base.baseName?.name;
        if (baseName) {
          inheritance.push(baseName);
        }
      }
    }

    const stateVariables: StateVariableInfo[] = [];
    const functions: FunctionInfo[] = [];
    const constructors: FunctionInfo[] = [];
    const fallbackFunctions: FunctionInfo[] = [];
    const receiveFunctions: FunctionInfo[] = [];
    const modifiers: string[] = [];
    const rawFunctions = new Map<string, any>();

    let declarationOrder = 0;

    for (const subNode of node.subNodes || []) {
      if (subNode.type === 'StateVariableDeclaration') {
        for (const variable of subNode.variables || []) {
          const varName = variable.name;
          const varType = ASTAnalyzer.formatTypeName(variable.typeName);
          const isConstant = !!variable.isDeclaredConst;
          const isImmutable = !!variable.isImmutable;
          const visibility = variable.visibility || 'default';

          stateVariables.push({
            name: varName,
            type: varType,
            visibility,
            isConstant,
            isImmutable,
            slot: '0', // StorageLayoutAnalyzer will fill accurate slots
            offset: 0,
            bytes: 32,
            declarationOrder: declarationOrder++,
            contract: contractName,
            location: {
              line: variable.loc ? variable.loc.start.line : null,
              column: variable.loc ? variable.loc.start.column : null,
              endLine: variable.loc ? variable.loc.end.line : null,
              endColumn: variable.loc ? variable.loc.end.column : null,
            },
          });
        }
      } else if (subNode.type === 'ModifierDefinition') {
        if (subNode.name) {
          modifiers.push(subNode.name);
        }
      } else if (subNode.type === 'FunctionDefinition') {
        const funcInfo = FunctionAnalyzer.processFunctionDefinition(subNode, contractName);
        functions.push(funcInfo);
        rawFunctions.set(funcInfo.name, subNode);

        if (funcInfo.isConstructor) {
          constructors.push(funcInfo);
        } else if (funcInfo.isFallback) {
          fallbackFunctions.push(funcInfo);
        } else if (funcInfo.isReceive) {
          receiveFunctions.push(funcInfo);
        }
      }
    }

    const contract: ContractInfo = {
      name: contractName,
      kind,
      inheritance,
      stateVariables,
      functions,
      modifiers,
      constructors,
      fallbackFunctions,
      receiveFunctions,
    };

    return { contract, rawFunctions };
  }
}
