/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from '../ast/ASTAnalyzer.ts';
import { CFGFunction, CFGNode, FunctionInfo, StateVariableInfo } from '../models/types.ts';

export class CFGAnalyzer {
  /**
   * Generates a lightweight control flow graph for a function
   */
  public static buildCFG(
    functionAstNode: any,
    funcInfo: FunctionInfo,
    stateVars: StateVariableInfo[]
  ): CFGFunction {
    const nodes: CFGNode[] = [];
    const entryId = `${funcInfo.contract}_${funcInfo.name}_entry`;
    const exitId = `${funcInfo.contract}_${funcInfo.name}_exit`;
    let nodeCounter = 1;

    // Entry node
    nodes.push({
      id: entryId,
      type: 'entry',
      label: `Entry: ${funcInfo.fullSignature}`,
      line: funcInfo.sourceLocation.line || 0,
      variablesRead: [],
      variablesWritten: [],
      next: [],
    });

    const stateVarNames = new Set(stateVars.map((v) => v.name));

    const getVars = (node: any): string[] => {
      const found: string[] = [];
      if (!node) return found;
      ASTAnalyzer.traverse(node, (n) => {
        if (n.type === 'Identifier' && stateVarNames.has(n.name)) {
          if (!found.includes(n.name)) found.push(n.name);
        }
      });
      return found;
    };

    let prevNodeId = entryId;

    if (functionAstNode && functionAstNode.body && functionAstNode.body.statements) {
      for (const stmt of functionAstNode.body.statements) {
        const stmtLine = stmt.loc?.start?.line;

        if (stmt.type === 'IfStatement') {
          const condId = `cond_${nodeCounter++}`;
          const condVars = getVars(stmt.condition);
          const condText = ASTAnalyzer.expressionToString(stmt.condition);

          const trueBranchId = `branch_true_${nodeCounter++}`;
          const falseBranchId = stmt.FalseBody ? `branch_false_${nodeCounter++}` : exitId;

          // Condition Node
          nodes.push({
            id: condId,
            type: 'condition',
            label: `Condition: if (${condText})`,
            line: stmtLine,
            variablesRead: condVars,
            variablesWritten: [],
            condition: condText,
            trueBranch: trueBranchId,
            falseBranch: falseBranchId,
            next: [trueBranchId, falseBranchId],
          });

          // Connect prevNode to condId
          const prev = nodes.find((n) => n.id === prevNodeId);
          if (prev && (!prev.next || prev.next.length === 0)) {
            prev.next = [condId];
          }

          // True branch block
          const trueVarsRead = getVars(stmt.TrueBody);
          nodes.push({
            id: trueBranchId,
            type: 'branch',
            label: `True branch: ${condText}`,
            line: stmt.TrueBody?.loc?.start?.line || stmtLine,
            variablesRead: trueVarsRead,
            variablesWritten: [],
            next: [exitId],
          });

          if (stmt.FalseBody) {
            nodes.push({
              id: falseBranchId,
              type: 'branch',
              label: `False branch: !(${condText})`,
              line: stmt.FalseBody?.loc?.start?.line || stmtLine,
              variablesRead: getVars(stmt.FalseBody),
              variablesWritten: [],
              next: [exitId],
            });
          }

          prevNodeId = condId;
        } else if (stmt.type === 'ExpressionStatement') {
          const expr = stmt.expression;
          const exprText = ASTAnalyzer.expressionToString(expr);
          const vars = getVars(expr);

          let nodeType: CFGNode['type'] = 'statement';
          if (exprText.includes('require(') || exprText.includes('assert(')) {
            nodeType = 'condition';
          } else if (
            exprText.includes('transfer(') ||
            exprText.includes('send(') ||
            exprText.includes('selfdestruct(') ||
            exprText.includes('delegatecall(')
          ) {
            nodeType = 'sensitive';
          }

          const stmtId = `stmt_${nodeCounter++}`;
          nodes.push({
            id: stmtId,
            type: nodeType,
            label: exprText.length > 60 ? exprText.substring(0, 57) + '...' : exprText,
            line: stmtLine,
            variablesRead: vars,
            variablesWritten: expr.type === 'BinaryOperation' && expr.operator === '=' ? getVars(expr.left) : [],
            next: [],
          });

          const prev = nodes.find((n) => n.id === prevNodeId);
          if (prev && (!prev.next || prev.next.length === 0)) {
            prev.next = [stmtId];
          }
          prevNodeId = stmtId;
        } else if (stmt.type === 'WhileStatement' || stmt.type === 'ForStatement') {
          const loopId = `loop_${nodeCounter++}`;
          const condText = ASTAnalyzer.expressionToString(stmt.condition || stmt.conditionExpression);
          nodes.push({
            id: loopId,
            type: 'condition',
            label: `Loop: (${condText})`,
            line: stmtLine,
            variablesRead: getVars(stmt.condition || stmt.conditionExpression),
            variablesWritten: [],
            next: [exitId],
          });

          const prev = nodes.find((n) => n.id === prevNodeId);
          if (prev && (!prev.next || prev.next.length === 0)) {
            prev.next = [loopId];
          }
          prevNodeId = loopId;
        }
      }
    }

    // Connect last active node to Exit
    const prev = nodes.find((n) => n.id === prevNodeId);
    if (prev && (!prev.next || prev.next.length === 0)) {
      prev.next = [exitId];
    }

    // Exit node
    nodes.push({
      id: exitId,
      type: 'exit',
      label: `Exit: ${funcInfo.name}`,
      line: funcInfo.sourceLocation.endLine || 0,
      variablesRead: [],
      variablesWritten: [],
      next: [],
    });

    return {
      contract: funcInfo.contract,
      functionName: funcInfo.name,
      nodes,
      entryNodeId: entryId,
    };
  }
}
