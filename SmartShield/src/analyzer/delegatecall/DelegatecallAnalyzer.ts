/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from '../ast/ASTAnalyzer.ts';
import { DelegatecallInfo, FunctionInfo, StateVariableInfo } from '../models/types.ts';

export class DelegatecallAnalyzer {
  /**
   * Scans function ASTs for delegatecall operations and resolves target expressions
   */
  public static detectDelegatecalls(
    functionAstNode: any,
    funcInfo: FunctionInfo,
    stateVars: StateVariableInfo[],
    knownContractNames: string[]
  ): DelegatecallInfo[] {
    const findings: DelegatecallInfo[] = [];
    if (!functionAstNode || !functionAstNode.body) return findings;

    const stateVarNames = new Set(stateVars.map((v) => v.name));
    const paramNames = new Set(funcInfo.parameters.map((p) => p.name));

    // Local variables
    const localNames = new Set<string>();
    ASTAnalyzer.traverse(functionAstNode.body, (n) => {
      if (n.type === 'VariableDeclarationStatement' && n.variables) {
        for (const v of n.variables) {
          if (v && v.name) localNames.add(v.name);
        }
      }
    });

    ASTAnalyzer.traverse(functionAstNode.body, (node) => {
      if (node.type === 'FunctionCall') {
        const expr = node.expression;
        let isDelegatecall = false;
        let targetExpr = 'unknown';

        if (expr.type === 'MemberAccess' && expr.memberName === 'delegatecall') {
          isDelegatecall = true;
          targetExpr = ASTAnalyzer.expressionToString(expr.expression);
        }

        if (isDelegatecall) {
          // Classify target
          let targetType: DelegatecallInfo['targetType'] = 'computed_expression';
          let targetResolved = false;
          let targetContractName: string | null = null;

          if (stateVarNames.has(targetExpr)) {
            targetType = 'state_variable';
            // Check state var type to see if it names a known contract
            const sv = stateVars.find((v) => v.name === targetExpr);
            if (sv && knownContractNames.includes(sv.type)) {
              targetContractName = sv.type;
              targetResolved = true;
            }
          } else if (paramNames.has(targetExpr)) {
            targetType = 'function_parameter';
            const param = funcInfo.parameters.find((p) => p.name === targetExpr);
            if (param && knownContractNames.includes(param.type)) {
              targetContractName = param.type;
              targetResolved = true;
            }
          } else if (localNames.has(targetExpr)) {
            targetType = 'local_variable';
          } else if (targetExpr.startsWith('0x') && targetExpr.length === 42) {
            targetType = 'constant';
            targetResolved = false;
          } else {
            targetType = 'computed_expression';
          }

          // Arguments summary
          const args = (node.arguments || []).map((a: any) => ASTAnalyzer.expressionToString(a)).join(', ');

          findings.push({
            contract: funcInfo.contract,
            function: funcInfo.name,
            sourceLocation: {
              line: node.loc ? node.loc.start.line : funcInfo.sourceLocation.line,
              column: node.loc ? node.loc.start.column : funcInfo.sourceLocation.column,
            },
            targetExpression: targetExpr,
            targetType,
            targetResolved,
            targetContractName,
            argumentsSummary: args || 'None',
          });
        }
      }
    });

    return findings;
  }
}
