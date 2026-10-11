/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from '../ast/ASTAnalyzer.ts';
import { FunctionInfo, ReadWriteInfo, StateVariableInfo } from '../models/types.ts';

export class ReadWriteAnalyzer {
  /**
   * Analyze state variable READ and WRITE operations for a function.
   * Strictly distinguishes persistent storage state variables from local variables,
   * parameters, constants, and immutable variables.
   */
  public static analyzeFunction(
    functionAstNode: any,
    funcInfo: FunctionInfo,
    contractStateVars: StateVariableInfo[],
    inheritedStateVars: StateVariableInfo[] = []
  ): ReadWriteInfo {
    const readsSet = new Set<string>();
    const writesSet = new Set<string>();
    const compoundSet = new Set<string>();

    if (!functionAstNode || !functionAstNode.body) {
      return {
        function: funcInfo.name,
        contract: funcInfo.contract,
        reads: [],
        writes: [],
        compound: [],
        visibility: funcInfo.visibility,
        modifiers: funcInfo.modifiers,
      };
    }

    // Combine all available state variables
    const allStateVars = [...contractStateVars, ...inheritedStateVars];
    // Map of persistent state variables (excluding constants and immutables)
    const persistentVarMap = new Map<string, StateVariableInfo>();
    for (const v of allStateVars) {
      if (!v.isConstant && !v.isImmutable) {
        persistentVarMap.set(v.name, v);
      }
    }

    // Collect parameters
    const paramNames = new Set<string>();
    for (const p of funcInfo.parameters) {
      if (p.name) paramNames.add(p.name);
    }
    for (const r of funcInfo.returnValues) {
      if (r.name) paramNames.add(r.name);
    }

    // Collect local variables declared inside function body
    const localNames = new Set<string>();
    ASTAnalyzer.traverse(functionAstNode.body, (n) => {
      if (n.type === 'VariableDeclarationStatement' && n.variables) {
        for (const v of n.variables) {
          if (v && v.name) {
            localNames.add(v.name);
          }
        }
      }
    });

    const isStateVar = (name: string): boolean => {
      // Local variables and parameters shadow state variables
      if (localNames.has(name) || paramNames.has(name)) {
        return false;
      }
      return persistentVarMap.has(name);
    };

    const extractRootIdentifier = (node: any): string | null => {
      if (!node) return null;
      if (node.type === 'Identifier') return node.name;
      if (node.type === 'IndexAccess') return extractRootIdentifier(node.base);
      if (node.type === 'MemberAccess') {
        // e.g. this.owner or struct.field
        const root = extractRootIdentifier(node.expression);
        if (root === 'this') return node.memberName;
        return root;
      }
      return null;
    };

    // Helper to record reads in any expression
    const recordReads = (exprNode: any) => {
      if (!exprNode) return;
      ASTAnalyzer.traverse(exprNode, (n) => {
        if (n.type === 'Identifier') {
          if (isStateVar(n.name)) {
            readsSet.add(n.name);
          }
        }
      });
    };

    // Traverse statements in the function body
    ASTAnalyzer.traverse(functionAstNode.body, (node) => {
      // Assignment or Binary Operations with assignment operators
      if (
        (node.type === 'BinaryOperation' && isAssignmentOp(node.operator)) ||
        node.type === 'Assignment'
      ) {
        const op = node.operator;
        const left = node.left;
        const right = node.right;

        const rootVar = extractRootIdentifier(left);
        if (rootVar && isStateVar(rootVar)) {
          writesSet.add(rootVar);
          if (op !== '=') {
            // Compound assignment (+=, -=, *=, etc.): both read and write
            readsSet.add(rootVar);
            compoundSet.add(rootVar);
          }
        }

        // If left is index access (e.g. balances[key] = val), the index itself is a read
        if (left.type === 'IndexAccess') {
          recordReads(left.index);
        }

        // Right side is always read
        recordReads(right);
        return;
      }

      // Unary operations (x++, ++x, x--, --x, delete x)
      if (node.type === 'UnaryOperation') {
        const op = node.operator;
        const sub = node.subExpression;
        const rootVar = extractRootIdentifier(sub);

        if (rootVar && isStateVar(rootVar)) {
          if (op === '++' || op === '--') {
            writesSet.add(rootVar);
            readsSet.add(rootVar);
            compoundSet.add(rootVar);
          } else if (op === 'delete') {
            writesSet.add(rootVar);
          } else {
            // e.g. !x, -x
            readsSet.add(rootVar);
          }
        } else {
          recordReads(sub);
        }
        return;
      }

      // If statement condition
      if (node.type === 'IfStatement') {
        recordReads(node.condition);
      }

      // While and For loops
      if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
        recordReads(node.condition);
      }
      if (node.type === 'ForStatement') {
        recordReads(node.conditionExpression);
      }

      // Function calls (arguments read state variables)
      if (node.type === 'FunctionCall') {
        if (node.arguments) {
          for (const arg of node.arguments) {
            recordReads(arg);
          }
        }
      }

      // Return statements
      if (node.type === 'ReturnStatement') {
        recordReads(node.expression);
      }
    });

    return {
      function: funcInfo.name,
      contract: funcInfo.contract,
      reads: Array.from(readsSet),
      writes: Array.from(writesSet),
      compound: Array.from(compoundSet),
      visibility: funcInfo.visibility,
      modifiers: funcInfo.modifiers,
    };
  }
}

function isAssignmentOp(op: string): boolean {
  return [
    '=',
    '+=',
    '-=',
    '*=',
    '/=',
    '%=',
    '|=',
    '&=',
    '^=',
    '<<=',
    '>>=',
  ].includes(op);
}
