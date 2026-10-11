/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from '../ast/ASTAnalyzer.ts';
import { CallGraphEdge, CallGraphInfo, FunctionInfo } from '../models/types.ts';

export class CallGraphAnalyzer {
  /**
   * Builds the function call graph mapping caller -> callee across internal functions,
   * modifiers, and external targets where inferable.
   */
  public static buildCallGraph(
    functions: FunctionInfo[],
    rawFunctionAsts: Map<string, any>,
    contractNames: string[]
  ): CallGraphInfo {
    const edges: CallGraphEdge[] = [];
    const nodesSet = new Set<string>();
    const adjacency: Record<string, string[]> = {};
    const reverseAdjacency: Record<string, string[]> = {};

    for (const f of functions) {
      const nodeKey = `${f.contract}.${f.name}`;
      nodesSet.add(nodeKey);
      adjacency[nodeKey] = [];
      reverseAdjacency[nodeKey] = [];
    }

    for (const f of functions) {
      const callerKey = `${f.contract}.${f.name}`;
      const astNode = rawFunctionAsts.get(callerKey) || rawFunctionAsts.get(f.name);

      // 1. Modifier invocations
      for (const modName of f.modifiers) {
        const modKey = `${f.contract}.${modName}`;
        if (nodesSet.has(modKey)) {
          edges.push({
            from: callerKey,
            to: modKey,
            type: 'modifier',
            contractFrom: f.contract,
            contractTo: f.contract,
          });
        }
      }

      if (!astNode || !astNode.body) continue;

      // 2. Direct calls inside function body
      ASTAnalyzer.traverse(astNode.body, (n) => {
        if (n.type === 'FunctionCall') {
          const expr = n.expression;
          if (expr.type === 'Identifier') {
            const calleeName = expr.name;
            const targetKey = `${f.contract}.${calleeName}`;
            if (nodesSet.has(targetKey)) {
              edges.push({
                from: callerKey,
                to: targetKey,
                type: 'internal',
                contractFrom: f.contract,
                contractTo: f.contract,
              });
            }
          } else if (expr.type === 'MemberAccess') {
            const memberName = expr.memberName;
            const targetExpr = ASTAnalyzer.expressionToString(expr.expression);

            // Check if member access is a contract call
            for (const cName of contractNames) {
              const targetKey = `${cName}.${memberName}`;
              if (nodesSet.has(targetKey)) {
                edges.push({
                  from: callerKey,
                  to: targetKey,
                  type: 'external',
                  contractFrom: f.contract,
                  contractTo: cName,
                });
              }
            }
          }
        }
      });
    }

    // Deduplicate edges and fill adjacency
    const uniqueEdgeMap = new Map<string, CallGraphEdge>();
    for (const edge of edges) {
      const edgeId = `${edge.from}->${edge.to}`;
      if (!uniqueEdgeMap.has(edgeId)) {
        uniqueEdgeMap.set(edgeId, edge);
        if (!adjacency[edge.from]) adjacency[edge.from] = [];
        if (!adjacency[edge.from].includes(edge.to)) {
          adjacency[edge.from].push(edge.to);
        }
        if (!reverseAdjacency[edge.to]) reverseAdjacency[edge.to] = [];
        if (!reverseAdjacency[edge.to].includes(edge.from)) {
          reverseAdjacency[edge.to].push(edge.from);
        }
      }
    }

    // Update calledFunctions and calledBy on FunctionInfo
    for (const f of functions) {
      const key = `${f.contract}.${f.name}`;
      f.calledFunctions = adjacency[key] || [];
      f.calledBy = reverseAdjacency[key] || [];
    }

    return {
      nodes: Array.from(nodesSet),
      edges: Array.from(uniqueEdgeMap.values()),
      adjacency,
      reverseAdjacency,
    };
  }
}
