/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASTAnalyzer } from '../ast/ASTAnalyzer.ts';
import { FunctionInfo, ParameterInfo, SourceLocation } from '../models/types.ts';

export class FunctionAnalyzer {
  /**
   * Process a FunctionDefinition AST node
   */
  public static processFunctionDefinition(
    node: any,
    contractName: string
  ): FunctionInfo {
    const isConstructor = node.isConstructor || node.name === null && node.subNodes === undefined && node.kind === 'constructor';
    const isFallback = node.isFallback || node.name === null && node.kind === 'fallback' || node.name === 'fallback';
    const isReceive = node.isReceive || node.name === null && node.kind === 'receive' || node.name === 'receive';

    let functionName = node.name;
    if (!functionName) {
      if (isConstructor) functionName = 'constructor';
      else if (isFallback) functionName = 'fallback';
      else if (isReceive) functionName = 'receive';
      else functionName = 'unnamed';
    }

    // Parameters
    const parameters: ParameterInfo[] = [];
    if (node.parameters) {
      const paramList = Array.isArray(node.parameters) ? node.parameters : node.parameters.parameters || [];
      for (const p of paramList) {
        parameters.push({
          name: p.name || '',
          type: ASTAnalyzer.formatTypeName(p.typeName),
        });
      }
    }

    // Return values
    const returnValues: ParameterInfo[] = [];
    if (node.returnParameters) {
      const retList = Array.isArray(node.returnParameters) ? node.returnParameters : node.returnParameters.parameters || [];
      for (const r of retList) {
        returnValues.push({
          name: r.name || undefined,
          type: ASTAnalyzer.formatTypeName(r.typeName),
        });
      }
    }

    // Visibility
    let visibility: 'public' | 'external' | 'internal' | 'private' = 'public';
    if (node.visibility) {
      visibility = node.visibility.toLowerCase();
    } else if (isConstructor) {
      visibility = 'public';
    }

    // Mutability
    let mutability: 'pure' | 'view' | 'nonpayable' | 'payable' = 'nonpayable';
    if (node.stateMutability) {
      mutability = node.stateMutability.toLowerCase();
    }

    // Modifiers attached to function
    const modifiers: string[] = [];
    if (node.modifiers) {
      for (const m of node.modifiers) {
        const modName = m.name || (m.modifierName && m.modifierName.name) || '';
        if (modName) {
          modifiers.push(modName);
        }
      }
    }

    // Access control heuristics (check modifiers and require caller checks)
    const accessControls: string[] = [];
    for (const mod of modifiers) {
      const lower = mod.toLowerCase();
      if (
        lower.includes('owner') ||
        lower.includes('auth') ||
        lower.includes('admin') ||
        lower.includes('role') ||
        lower.includes('governance') ||
        lower.includes('authorized')
      ) {
        accessControls.push(`Modifier: ${mod}`);
      }
    }

    // Check for inline msg.sender or tx.origin requirements
    ASTAnalyzer.traverse(node.body, (n) => {
      if (n.type === 'FunctionCall') {
        const callName = ASTAnalyzer.expressionToString(n.expression);
        if (callName === 'require' || callName === 'assert') {
          const conditionText = n.arguments && n.arguments[0] ? ASTAnalyzer.expressionToString(n.arguments[0]) : '';
          if (conditionText.includes('msg.sender') || conditionText.includes('tx.origin')) {
            accessControls.push(`Caller Check: ${conditionText}`);
          }
        }
      }
    });

    // Signature calculation
    const paramTypes = parameters.map((p) => p.type).join(',');
    const fullSignature = `${functionName}(${paramTypes})`;

    // External reachability:
    // constructors are only called during deployment
    // internal / private are not directly externally callable
    const externalReachability = !isConstructor && (visibility === 'public' || visibility === 'external');

    // Source location
    const sourceLocation: SourceLocation = {
      line: node.loc ? node.loc.start.line : null,
      column: node.loc ? node.loc.start.column : null,
      endLine: node.loc ? node.loc.end.line : null,
      endColumn: node.loc ? node.loc.end.column : null,
    };

    return {
      name: functionName,
      contract: contractName,
      fullSignature,
      selector: this.calculatePseudoSelector(fullSignature),
      visibility,
      mutability,
      modifiers,
      parameters,
      returnValues,
      sourceLocation,
      astNodeId: node.id ? String(node.id) : undefined,
      calledFunctions: [],
      calledBy: [],
      isConstructor,
      isFallback,
      isReceive,
      externalReachability,
      accessControls,
      reads: [],
      writes: [],
    };
  }

  /**
   * Deterministic 4-byte selector hash generation without heavy external crypto
   */
  private static calculatePseudoSelector(signature: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < signature.length; i++) {
      hash ^= signature.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    return '0x' + hex;
  }
}
