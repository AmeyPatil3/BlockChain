/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from '../ast/ASTAnalyzer.ts';
import { FunctionInfo, SensitiveOperation, StateVariableInfo } from '../models/types.ts';

export class SensitiveOperationAnalyzer {
  /**
   * Detects sensitive operations matching the three paper categories:
   * 1. SELF_DESTRUCT (Self-destruction anomaly)
   * 2. ETHER_TRANSFER (Ether-sending anomaly)
   * 3. JUDGMENT_CONDITION (Judgment-condition disorder anomaly)
   */
  public static detectSensitiveOperations(
    functionAstNode: any,
    funcInfo: FunctionInfo,
    stateVars: StateVariableInfo[]
  ): SensitiveOperation[] {
    const ops: SensitiveOperation[] = [];
    if (!functionAstNode || !functionAstNode.body) return ops;

    const stateVarNames = new Set(stateVars.map((v) => v.name));

    const extractUsedStateVars = (node: any): string[] => {
      const used: string[] = [];
      if (!node) return used;
      ASTAnalyzer.traverse(node, (n) => {
        if (n.type === 'Identifier' && stateVarNames.has(n.name)) {
          if (!used.includes(n.name)) used.push(n.name);
        }
      });
      return used;
    };

    ASTAnalyzer.traverse(functionAstNode.body, (node) => {
      // 1. Function Calls: selfdestruct, transfer, send, call{value}, require, assert
      if (node.type === 'FunctionCall') {
        const expr = node.expression;
        const callName = ASTAnalyzer.expressionToString(expr);

        // CATEGORY A: Self-destruct anomaly
        if (
          callName === 'selfdestruct' ||
          callName === 'suicide' ||
          callName.endsWith('.selfdestruct') ||
          callName.endsWith('.suicide')
        ) {
          const varsUsed = extractUsedStateVars(node);
          ops.push({
            type: 'SELF_DESTRUCT',
            function: funcInfo.name,
            contract: funcInfo.contract,
            variablesUsed: varsUsed,
            sourceLocation: {
              line: node.loc ? node.loc.start.line : funcInfo.sourceLocation.line,
              column: node.loc ? node.loc.start.column : funcInfo.sourceLocation.column,
            },
            details: `Contract self-destruction invoked: ${callName}`,
          });
          return;
        }

        // CATEGORY B: Ether transfer anomaly
        // e.g. recipient.transfer(amount), recipient.send(amount), target.call{value: ...}("")
        const isTransfer =
          (expr.type === 'MemberAccess' && (expr.memberName === 'transfer' || expr.memberName === 'send')) ||
          callName.includes('.transfer(') ||
          callName.includes('.send(') ||
          callName.includes('{value:');

        if (isTransfer) {
          const varsUsed = extractUsedStateVars(node);
          // Also include state vars read anywhere in this function if not directly inside call args
          for (const rv of funcInfo.reads) {
            if (!varsUsed.includes(rv)) varsUsed.push(rv);
          }

          ops.push({
            type: 'ETHER_TRANSFER',
            function: funcInfo.name,
            contract: funcInfo.contract,
            variablesUsed: varsUsed,
            sourceLocation: {
              line: node.loc ? node.loc.start.line : funcInfo.sourceLocation.line,
              column: node.loc ? node.loc.start.column : funcInfo.sourceLocation.column,
            },
            details: `Ether transfer operation: ${callName}`,
          });
          return;
        }

        // CATEGORY C: require / assert condition
        if (callName === 'require' || callName === 'assert') {
          const conditionNode = node.arguments && node.arguments[0];
          const condVars = extractUsedStateVars(conditionNode);
          if (condVars.length > 0) {
            const conditionStr = ASTAnalyzer.expressionToString(conditionNode);
            ops.push({
              type: 'JUDGMENT_CONDITION',
              function: funcInfo.name,
              contract: funcInfo.contract,
              variablesUsed: condVars,
              condition: conditionStr,
              sourceLocation: {
                line: node.loc ? node.loc.start.line : funcInfo.sourceLocation.line,
                column: node.loc ? node.loc.start.column : funcInfo.sourceLocation.column,
              },
              details: `Gatekeeper condition checked in ${callName}(${conditionStr})`,
            });
          }
          return;
        }
      }

      // CATEGORY C: If statement branching on state variable
      if (node.type === 'IfStatement') {
        const condVars = extractUsedStateVars(node.condition);
        if (condVars.length > 0) {
          const conditionStr = ASTAnalyzer.expressionToString(node.condition);
          ops.push({
            type: 'JUDGMENT_CONDITION',
            function: funcInfo.name,
            contract: funcInfo.contract,
            variablesUsed: condVars,
            condition: conditionStr,
            sourceLocation: {
              line: node.loc ? node.loc.start.line : funcInfo.sourceLocation.line,
              column: node.loc ? node.loc.start.column : funcInfo.sourceLocation.column,
            },
            details: `Control branch condition: if (${conditionStr})`,
          });
        }
      }

      // CATEGORY C: Loops branching on state variable
      if (node.type === 'WhileStatement' || node.type === 'ForStatement') {
        const condNode = node.condition || node.conditionExpression;
        const condVars = extractUsedStateVars(condNode);
        if (condVars.length > 0) {
          const conditionStr = ASTAnalyzer.expressionToString(condNode);
          ops.push({
            type: 'JUDGMENT_CONDITION',
            function: funcInfo.name,
            contract: funcInfo.contract,
            variablesUsed: condVars,
            condition: conditionStr,
            sourceLocation: {
              line: node.loc ? node.loc.start.line : funcInfo.sourceLocation.line,
              column: node.loc ? node.loc.start.column : funcInfo.sourceLocation.column,
            },
            details: `Loop condition depending on state: (${conditionStr})`,
          });
        }
      }
    });

    return ops;
  }
}
