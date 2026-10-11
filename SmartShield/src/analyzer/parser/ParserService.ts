/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as parser from '@solidity-parser/parser';

export interface ParseResult {
  ast: any | null;
  errors: string[];
  filename: string;
}

export class ParserService {
  /**
   * Parse Solidity source code using @solidity-parser/parser with AST generation.
   */
  public static parse(source: string, filename = 'contract.sol'): ParseResult {
    const errors: string[] = [];
    try {
      const ast = parser.parse(source, {
        loc: true,
        range: true,
        tolerant: true,
      });
      return { ast, errors, filename };
    } catch (err: any) {
      const msg = err?.message || String(err);
      errors.push(`Parse error in ${filename}: ${msg}`);
      // Attempt tolerant fallback or partial recovery
      try {
        const astTolerant = parser.parse(source, { tolerant: true });
        return { ast: astTolerant, errors, filename };
      } catch (e: any) {
        return { ast: null, errors, filename };
      }
    }
  }

  /**
   * Safe AST node visit helper
   */
  public static visit(ast: any, visitor: any) {
    if (!ast) return;
    try {
      parser.visit(ast, visitor);
    } catch (err) {
      console.warn('Visitor warning during AST traversal:', err);
    }
  }
}
