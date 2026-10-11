/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class ASTAnalyzer {
  /**
   * Traverse AST node recursively and execute callback on each node.
   */
  public static traverse(node: any, callback: (node: any, parent: any) => boolean | void, parent: any = null): void {
    if (!node || typeof node !== 'object') return;

    const stop = callback(node, parent);
    if (stop === true) return;

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          this.traverse(item, callback, node);
        }
      } else if (child && typeof child === 'object') {
        this.traverse(child, callback, node);
      }
    }
  }

  /**
   * Find all nodes matching a specific type
   */
  public static findByType(node: any, type: string): any[] {
    const results: any[] = [];
    this.traverse(node, (n) => {
      if (n.type === type) {
        results.push(n);
      }
    });
    return results;
  }

  /**
   * Convert an AST type name node to a string representation
   */
  public static formatTypeName(typeNameNode: any): string {
    if (!typeNameNode) return 'unknown';
    if (typeof typeNameNode === 'string') return typeNameNode;

    if (typeNameNode.type === 'ElementaryTypeName') {
      return typeNameNode.name;
    }
    if (typeNameNode.type === 'UserDefinedTypeName') {
      return typeNameNode.namePath || typeNameNode.name || 'UserDefined';
    }
    if (typeNameNode.type === 'Mapping') {
      const key = this.formatTypeName(typeNameNode.keyType);
      const value = this.formatTypeName(typeNameNode.valueType);
      return `mapping(${key} => ${value})`;
    }
    if (typeNameNode.type === 'ArrayTypeName') {
      const base = this.formatTypeName(typeNameNode.baseTypeName);
      const length = typeNameNode.length ? typeNameNode.length.number || '' : '';
      return `${base}[${length}]`;
    }
    return typeNameNode.name || 'unknown';
  }

  /**
   * Extract textual representation of an expression node
   */
  public static expressionToString(node: any): string {
    if (!node) return '';
    if (node.type === 'Identifier') return node.name;
    if (node.type === 'NumberLiteral') return node.number;
    if (node.type === 'BooleanLiteral') return node.value ? 'true' : 'false';
    if (node.type === 'StringLiteral') return `"${node.value}"`;
    if (node.type === 'MemberAccess') {
      return `${this.expressionToString(node.expression)}.${node.memberName}`;
    }
    if (node.type === 'IndexAccess') {
      return `${this.expressionToString(node.base)}[${this.expressionToString(node.index)}]`;
    }
    if (node.type === 'BinaryOperation') {
      return `${this.expressionToString(node.left)} ${node.operator} ${this.expressionToString(node.right)}`;
    }
    if (node.type === 'UnaryOperation') {
      return node.isPrefix
        ? `${node.operator}${this.expressionToString(node.subExpression)}`
        : `${this.expressionToString(node.subExpression)}${node.operator}`;
    }
    if (node.type === 'FunctionCall') {
      const expr = this.expressionToString(node.expression);
      const args = (node.arguments || []).map((a: any) => this.expressionToString(a)).join(', ');
      return `${expr}(${args})`;
    }
    if (node.type === 'NameValueList') {
      return '{...}';
    }
    return node.name || node.type || '';
  }
}
