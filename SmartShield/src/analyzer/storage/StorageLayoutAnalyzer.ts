/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateVariableInfo, StorageSlotInfo } from '../models/types.ts';

export class StorageLayoutAnalyzer {
  /**
   * Calculates EVM storage slot and byte offset for state variables in declaration order.
   * Accurately supports simple types (uintN, intN, address, bool, bytesN, enums).
   * Flags dynamic types, mappings, and complex structs as requiring extended analysis.
   */
  public static calculateStorageLayout(
    stateVars: StateVariableInfo[],
    contractName: string,
    compilerVersion: string
  ): StorageSlotInfo[] {
    const layout: StorageSlotInfo[] = [];
    let currentSlot = 0;
    let currentByteOffset = 0; // 0 to 31

    for (const v of stateVars) {
      if (v.isConstant || v.isImmutable) {
        // Constants and immutables do not occupy storage slots
        layout.push({
          name: v.name,
          type: v.type,
          slot: 'N/A (Constant/Immutable)',
          offset: 0,
          bytes: 0,
          contract: contractName,
          declarationOrder: v.declarationOrder,
          isComplex: false,
          complexReason: 'Constants/immutables are in bytecode, not storage slot',
        });
        continue;
      }

      const { bytes, isComplex, complexReason } = this.getTypeStorageSize(v.type);

      if (isComplex) {
        // Complex type (mapping, dynamic array, struct, etc.)
        // In Solidity, it occupies a full 32-byte slot base pointer
        if (currentByteOffset > 0) {
          currentSlot += 1;
          currentByteOffset = 0;
        }

        layout.push({
          name: v.name,
          type: v.type,
          slot: currentSlot.toString(),
          offset: 0,
          bytes: 32,
          contract: contractName,
          declarationOrder: v.declarationOrder,
          isComplex: true,
          complexReason: complexReason || 'Complex storage layout – requires extended analysis.',
        });

        currentSlot += 1;
        currentByteOffset = 0;
        continue;
      }

      // Simple packed type: fits in current slot or moves to next slot
      if (currentByteOffset + bytes > 32) {
        // Does not fit in remaining bytes of current slot
        currentSlot += 1;
        currentByteOffset = 0;
      }

      layout.push({
        name: v.name,
        type: v.type,
        slot: currentSlot.toString(),
        offset: currentByteOffset,
        bytes: bytes,
        contract: contractName,
        declarationOrder: v.declarationOrder,
        isComplex: false,
      });

      currentByteOffset += bytes;
      if (currentByteOffset >= 32) {
        currentSlot += 1;
        currentByteOffset = 0;
      }
    }

    return layout;
  }

  public static getTypeStorageSize(typeName: string): {
    bytes: number;
    isComplex: boolean;
    complexReason?: string;
  } {
    const cleanType = typeName.trim();

    // Mappings
    if (cleanType.startsWith('mapping')) {
      return {
        bytes: 32,
        isComplex: true,
        complexReason: 'Complex storage layout – requires extended analysis. (Mapping uses keccak256(key . slot))',
      };
    }

    // Dynamic arrays
    if (cleanType.endsWith('[]')) {
      return {
        bytes: 32,
        isComplex: true,
        complexReason: 'Complex storage layout – requires extended analysis. (Dynamic array length at slot, data at keccak256(slot))',
      };
    }

    // Fixed arrays e.g. uint256[5]
    const fixedArrayMatch = cleanType.match(/(.+)\[(\d+)\]$/);
    if (fixedArrayMatch) {
      return {
        bytes: 32,
        isComplex: true,
        complexReason: 'Complex storage layout – requires extended analysis. (Fixed-size array)',
      };
    }

    // Dynamic string or bytes
    if (cleanType === 'string' || cleanType === 'bytes') {
      return {
        bytes: 32,
        isComplex: true,
        complexReason: 'Complex storage layout – requires extended analysis. (Dynamic byte-length storage)',
      };
    }

    // Address & Contract types
    if (cleanType === 'address' || cleanType === 'address payable') {
      return { bytes: 20, isComplex: false };
    }

    // Boolean
    if (cleanType === 'bool') {
      return { bytes: 1, isComplex: false };
    }

    // uint / int variants
    const uintMatch = cleanType.match(/^uint(\d+)?$/);
    if (uintMatch) {
      const bits = uintMatch[1] ? parseInt(uintMatch[1], 10) : 256;
      return { bytes: Math.ceil(bits / 8), isComplex: false };
    }

    const intMatch = cleanType.match(/^int(\d+)?$/);
    if (intMatch) {
      const bits = intMatch[1] ? parseInt(intMatch[1], 10) : 256;
      return { bytes: Math.ceil(bits / 8), isComplex: false };
    }

    // bytes1 .. bytes32
    const bytesMatch = cleanType.match(/^bytes(\d+)$/);
    if (bytesMatch) {
      const b = parseInt(bytesMatch[1], 10);
      if (b >= 1 && b <= 32) {
        return { bytes: b, isComplex: false };
      }
    }

    // Enums: typically 1 byte if <= 256 items
    if (cleanType.toLowerCase().includes('enum') || cleanType.toLowerCase().endsWith('status') || cleanType.toLowerCase().endsWith('state')) {
      return { bytes: 1, isComplex: false };
    }

    // Fallback default: treated as 32-byte primitive or unknown struct
    if (/^[A-Z]/.test(cleanType)) {
      // Might be a custom contract or struct
      return {
        bytes: 20, // If contract address
        isComplex: false,
      };
    }

    return { bytes: 32, isComplex: false };
  }
}
