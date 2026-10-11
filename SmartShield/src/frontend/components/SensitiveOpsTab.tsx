/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, Flame, DollarSign, GitBranch, ShieldAlert } from 'lucide-react';
import { AnalysisResult, SensitiveOperation } from '../../analyzer/models/types.ts';

interface SensitiveOpsTabProps {
  result: AnalysisResult;
}

export const SensitiveOpsTab: React.FC<SensitiveOpsTabProps> = ({ result }) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'SELF_DESTRUCT' | 'ETHER_TRANSFER' | 'JUDGMENT_CONDITION'>('ALL');
  const sensitiveOps = result.ir.sensitiveOperations;

  const filteredOps = sensitiveOps.filter((op) => {
    if (activeCategory === 'ALL') return true;
    return op.type === activeCategory;
  });

  const categoryCounts = {
    ALL: sensitiveOps.length,
    SELF_DESTRUCT: sensitiveOps.filter((o) => o.type === 'SELF_DESTRUCT').length,
    ETHER_TRANSFER: sensitiveOps.filter((o) => o.type === 'ETHER_TRANSFER').length,
    JUDGMENT_CONDITION: sensitiveOps.filter((o) => o.type === 'JUDGMENT_CONDITION').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-purple-400" />
            <span>Sensitive Execution Sinks & Judgment Conditions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Categorized according to the three DelegateTracker anomaly archetypes: Self-Destruction, Ether Sending,
            and Judgment-Condition Disorder.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeCategory === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>All Sensitive Operations</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {categoryCounts.ALL}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('SELF_DESTRUCT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeCategory === 'SELF_DESTRUCT'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Category A: Self-Destruct ({categoryCounts.SELF_DESTRUCT})</span>
          </button>

          <button
            onClick={() => setActiveCategory('ETHER_TRANSFER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeCategory === 'ETHER_TRANSFER'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Category B: Ether Transfer ({categoryCounts.ETHER_TRANSFER})</span>
          </button>

          <button
            onClick={() => setActiveCategory('JUDGMENT_CONDITION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeCategory === 'JUDGMENT_CONDITION'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            <span>Category C: Condition Disorder ({categoryCounts.JUDGMENT_CONDITION})</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4">Category Archetype</th>
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Function</th>
                <th className="py-3 px-4">Variables Read by Sink / Check</th>
                <th className="py-3 px-4">Operation Expression / Condition</th>
                <th className="py-3 px-4">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-mono">
              {filteredOps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No sensitive operations detected in this category.
                  </td>
                </tr>
              ) : (
                filteredOps.map((op, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition">
                    {/* Category Type */}
                    <td className="py-3 px-4">
                      {op.type === 'SELF_DESTRUCT' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/40 text-rose-300 border border-rose-500/30">
                          Cat A: SELF_DESTRUCT
                        </span>
                      )}
                      {op.type === 'ETHER_TRANSFER' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-500/30">
                          Cat B: ETHER_TRANSFER
                        </span>
                      )}
                      {op.type === 'JUDGMENT_CONDITION' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/40 text-purple-300 border border-purple-500/30">
                          Cat C: JUDGMENT_CONDITION
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-300">{op.contract}</td>
                    <td className="py-3 px-4 text-white font-bold">{op.function}()</td>

                    {/* Variables used */}
                    <td className="py-3 px-4">
                      {op.variablesUsed.length === 0 ? (
                        <span className="text-slate-600">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {op.variablesUsed.map((v) => (
                            <span
                              key={v}
                              className="px-2 py-0.5 rounded bg-cyan-950/30 text-cyan-300 border border-cyan-500/20 text-[11px]"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Expression / Condition */}
                    <td className="py-3 px-4 text-slate-300 max-w-md truncate">
                      {op.condition ? (
                        <code className="text-purple-300 bg-slate-900 px-1.5 py-0.5 rounded">
                          {op.condition}
                        </code>
                      ) : (
                        <span>{op.details}</span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-500">
                      Line {op.sourceLocation.line || '—'}
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
