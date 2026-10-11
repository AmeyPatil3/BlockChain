/**
 * @file slotComparator.ts
 * FR-05 - Storage Validation & FR-06 - State Variable Validation
 * Compares expected storage slot/offset information from Group 1 with runtime observations.
 */

import { ExpectedStorage, RuntimeAccess } from '../types.ts';

export interface StorageComparisonResult {
  matches: boolean;
  expectedSlotNormalized: string;
  observedSlotNormalized?: string;
  operationFound: boolean;
  writerMatched: boolean;
  readerMatched: boolean;
  details: string;
}

export class SlotComparator {
  /**
   * Normalizes slot representation to lowercase hex without leading zeros, e.g. "0x00" -> "0"
   */
  public static normalizeSlot(slot: string | number | null | undefined): string {
    if (slot === null || slot === undefined) return '0';
    const str = String(slot).trim().toLowerCase();
    try {
      const big = BigInt(str.startsWith('0x') ? str : '0x' + str);
      return big.toString(16);
    } catch {
      // If decimal number string
      try {
        const big = BigInt(str);
        return big.toString(16);
      } catch {
        return str;
      }
    }
  }

  /**
   * Validates whether runtime observed WRITE / READ matches the expected slot and offset
   */
  public static validateStorageAccesses(
    expectedStorage: ExpectedStorage | undefined,
    vulnerabilityVariable: string,
    writerFunction: string,
    readerFunction: string,
    runtimeAccesses: RuntimeAccess[]
  ): StorageComparisonResult {
    const expectedSlot = this.normalizeSlot(expectedStorage?.slot ?? '0');
    const expectedOffset = expectedStorage?.offset ?? 0;

    let writerMatched = false;
    let readerMatched = false;
    let observedWriteSlot: string | undefined;
    let observedReadSlot: string | undefined;

    for (const access of runtimeAccesses) {
      const accessSlot = this.normalizeSlot(access.slot);

      if (access.operation === 'WRITE') {
        observedWriteSlot = accessSlot;
        if (accessSlot === expectedSlot && (access.offset ?? 0) === expectedOffset) {
          writerMatched = true;
        }
      }

      if (access.operation === 'READ') {
        observedReadSlot = accessSlot;
        if (accessSlot === expectedSlot && (access.offset ?? 0) === expectedOffset) {
          readerMatched = true;
        }
      }
    }

    const matches = writerMatched && (readerFunction ? readerMatched : true);

    let details = '';
    if (matches) {
      details = `Storage slot 0x${expectedSlot} (offset ${expectedOffset}) correctly written by '${writerFunction}' and read by '${readerFunction}'.`;
    } else if (!writerMatched) {
      details = `Storage mismatch: expected WRITE to slot 0x${expectedSlot} by '${writerFunction}', but observed: ${observedWriteSlot ? '0x' + observedWriteSlot : 'none'}.`;
    } else if (!readerMatched) {
      details = `Storage mismatch: writer modified slot 0x${expectedSlot}, but reader '${readerFunction}' did not access that slot (observed: ${observedReadSlot ? '0x' + observedReadSlot : 'none'}).`;
    }

    return {
      matches,
      expectedSlotNormalized: expectedSlot,
      observedSlotNormalized: observedWriteSlot,
      operationFound: runtimeAccesses.length > 0,
      writerMatched,
      readerMatched,
      details,
    };
  }
}
