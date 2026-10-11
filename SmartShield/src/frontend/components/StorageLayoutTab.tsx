/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Database, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

interface StorageLayoutTabProps {
  result: AnalysisResult;
}

export const StorageLayoutTab: React.FC<StorageLayoutTabProps> = ({ result }) => {
  const { storageLayout, compilerVersion } = result.ir;

  return (
    <div className="space-y-6">
      {/* Header & Compiler Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>EVM State Variable Storage Layout Model</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Computes 32-byte slot assignments and byte offsets according to EVM packing rules.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Target Compiler:</span>
            <span className="text-cyan-400 font-bold">{compilerVersion}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start space-x-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            Storage layout is strictly compiler-version dependent. SmartShield calculates contiguous packing for
            primitive types (uint, address, bool, bytesN) and flags dynamic mappings and arrays for extended symbolic
            keccak256 hash resolution.
          </p>
        </div>
      </div>

      {/* Storage Layout Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Declaration Order</th>
                <th className="py-3 px-4">State Variable</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-emerald-400">Slot</th>
                <th className="py-3 px-4 text-cyan-400">Byte Offset</th>
                <th className="py-3 px-4">Bytes Occupied</th>
                <th className="py-3 px-4">Storage Characteristics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-mono">
              {storageLayout.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 italic">
                    No state variables declared in the analyzed contracts.
                  </td>
                </tr>
              ) : (
                storageLayout.map((slot, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-semibold text-slate-300">{slot.contract}</td>
                    <td className="py-3 px-4 text-slate-500">#{slot.declarationOrder}</td>
                    <td className="py-3 px-4 font-bold text-white">{slot.name}</td>
                    <td className="py-3 px-4 text-cyan-300">{slot.type}</td>

                    {/* Slot */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-bold">
                        {slot.slot}
                      </span>
                    </td>

                    {/* Offset */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-500/30">
                        {slot.offset}B
                      </span>
                    </td>

                    {/* Bytes */}
                    <td className="py-3 px-4 text-slate-400">{slot.bytes} B</td>

                    {/* Complexity / Notes */}
                    <td className="py-3 px-4">
                      {slot.isComplex ? (
                        <div className="flex items-center space-x-1.5 text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] font-sans">
                            {slot.complexReason || 'Complex storage layout – requires extended analysis.'}
                          </span>
                        </div>
                      ) : slot.slot.includes('N/A') ? (
                        <span className="text-slate-500 text-[11px] font-sans">Bytecode constant / immutable</span>
                      ) : (
                        <div className="flex items-center space-x-1 text-emerald-400 text-[11px] font-sans">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Standard 32B packed EVM primitive</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
