/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GitCompare, Search, Filter, ShieldCheck, ArrowRightLeft } from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

interface ReadWriteTabProps {
  result: AnalysisResult;
}

export const ReadWriteTab: React.FC<ReadWriteTabProps> = ({ result }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterContract, setFilterContract] = useState<string>('ALL');
  const [onlyStateModifying, setOnlyStateModifying] = useState(false);

  const contracts = result.ir.contracts;
  const allFunctions = result.ir.functions;

  const filteredFunctions = allFunctions.filter((f) => {
    if (filterContract !== 'ALL' && f.contract !== filterContract) return false;
    if (onlyStateModifying && f.writes.length === 0) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = f.name.toLowerCase().includes(term);
      const matchContract = f.contract.toLowerCase().includes(term);
      const matchReads = f.reads.some((r) => r.toLowerCase().includes(term));
      const matchWrites = f.writes.some((w) => w.toLowerCase().includes(term));
      return matchName || matchContract || matchReads || matchWrites;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <GitCompare className="w-5 h-5 text-cyan-400" />
              <span>State-Variable READ / WRITE Data Flow Analysis</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Traces persistent storage state access per function according to the DelegateTracker data flow capture algorithm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Contract Filter */}
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
              <span className="text-slate-400">Contract:</span>
              <select
                value={filterContract}
                onChange={(e) => setFilterContract(e.target.value)}
                className="bg-transparent text-cyan-400 font-mono font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">
                  All Contracts
                </option>
                {contracts.map((c) => (
                  <option key={c.name} value={c.name} className="bg-slate-900 text-slate-200">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle state modifying only */}
            <button
              onClick={() => setOnlyStateModifying(!onlyStateModifying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                onlyStateModifying
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              State Modifying Only (Writes &gt; 0)
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search function, variable (e.g. owner), contract..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Function</th>
                <th className="py-3 px-4 text-emerald-400">READS</th>
                <th className="py-3 px-4 text-rose-400">WRITES</th>
                <th className="py-3 px-4">Visibility</th>
                <th className="py-3 px-4">Modifiers</th>
                <th className="py-3 px-4 text-center">Externally Reachable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-mono">
              {filteredFunctions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                    No functions matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFunctions.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-semibold text-slate-300">{f.contract}</td>
                    <td className="py-3 px-4 font-bold text-white">
                      {f.name}()
                      <div className="text-[10px] text-slate-500 font-normal">{f.fullSignature}</div>
                    </td>

                    {/* READS */}
                    <td className="py-3 px-4">
                      {f.reads.length === 0 ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {f.reads.map((r) => (
                            <span
                              key={r}
                              className="px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-300 border border-emerald-500/20 text-[11px]"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* WRITES */}
                    <td className="py-3 px-4">
                      {f.writes.length === 0 ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {f.writes.map((w) => (
                            <span
                              key={w}
                              className="px-2 py-0.5 rounded bg-rose-950/30 text-rose-300 border border-rose-500/20 text-[11px] font-bold"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Visibility */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          f.visibility === 'public' || f.visibility === 'external'
                            ? 'bg-blue-950/40 text-blue-300 border border-blue-500/20'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {f.visibility}
                      </span>
                    </td>

                    {/* Modifiers */}
                    <td className="py-3 px-4 text-slate-400">
                      {f.modifiers.length === 0 ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {f.modifiers.map((m) => (
                            <span
                              key={m}
                              className="px-1.5 py-0.5 rounded bg-purple-950/20 text-purple-300 border border-purple-500/20 text-[10px]"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Reachability */}
                    <td className="py-3 px-4 text-center">
                      {f.externalReachability ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                          <span>YES</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 text-slate-500 text-[10px]">
                          <span>NO</span>
                        </span>
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
