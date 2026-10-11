/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Layers,
  FileCode,
  Database,
  Share2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ShieldAlert,
  Sliders,
  ChevronRight,
} from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

interface ContractOverviewTabProps {
  result: AnalysisResult;
}

export const ContractOverviewTab: React.FC<ContractOverviewTabProps> = ({ result }) => {
  const { summary, ir } = result;

  const statCards = [
    {
      label: 'Contracts Analyzed',
      value: summary.contractsCount,
      icon: Layers,
      color: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/30',
      badge: 'AST Extracted',
    },
    {
      label: 'Functions Detected',
      value: summary.functionsCount,
      icon: FileCode,
      color: 'from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/30',
      badge: 'Signatures Mapped',
    },
    {
      label: 'State Variables',
      value: summary.stateVariablesCount,
      icon: Database,
      color: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/30',
      badge: 'Storage Slotted',
    },
    {
      label: 'delegatecall Occurrences',
      value: summary.delegatecallCount,
      icon: Share2,
      color: 'from-amber-500/20 to-amber-600/10 text-amber-400 border-amber-500/30',
      badge: 'Requires Validation',
    },
    {
      label: 'Sensitive Operations',
      value: summary.sensitiveOperationsCount,
      icon: AlertTriangle,
      color: 'from-purple-500/20 to-purple-600/10 text-purple-400 border-purple-500/30',
      badge: 'Sinks & Conditions',
    },
    {
      label: 'Candidate Attack Paths',
      value: summary.candidateAttackPathsCount,
      icon: Flame,
      color: 'from-rose-500/20 to-rose-600/10 text-rose-400 border-rose-500/30',
      badge: 'Unvalidated Candidates',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">
            Static Candidate Findings Notice (DelegateTracker Alignment)
          </p>
          <p className="text-slate-300 leading-relaxed">
            All detected paths and delegatecall operations are static data-flow candidates. None are claimed to be confirmed
            exploits at this stage. Symbolic constraint checking and dynamic execution are required for verification.
          </p>
        </div>
      </div>

      {/* Top 6 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl bg-gradient-to-b ${card.color} border bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5" />
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700/50">
                  {card.badge}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white">{card.value}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contracts Breakdown */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Extracted Contract Architectures</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ir.contracts.map((contract) => (
            <div
              key={contract.name}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-white font-mono">{contract.name}</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-semibold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {contract.kind}
                    </span>
                  </div>
                  {contract.inheritance.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Inherits: <span className="text-cyan-400 font-mono">{contract.inheritance.join(', ')}</span>
                    </p>
                  )}
                </div>

                <span className="text-xs font-mono text-slate-500">
                  {contract.functions.length} funcs • {contract.stateVariables.length} vars
                </span>
              </div>

              {/* State variables mini list */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>State Variables ({contract.stateVariables.length})</span>
                </div>
                {contract.stateVariables.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No state variables declared.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {contract.stateVariables.map((v) => (
                      <span
                        key={v.name}
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300"
                      >
                        <span className="text-cyan-400">{v.type}</span> {v.name}{' '}
                        <span className="text-slate-500">(slot {v.slot})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Functions mini list */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Functions ({contract.functions.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contract.functions.map((f) => (
                    <span
                      key={f.name}
                      className={`px-2 py-1 rounded text-[11px] font-mono border ${
                        f.externalReachability
                          ? 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {f.name}() {f.externalReachability && <span className="text-emerald-400 text-[9px]">● ext</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* Modifiers */}
              {contract.modifiers.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-semibold text-slate-300 flex items-center space-x-1">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>Modifiers Defined:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contract.modifiers.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded bg-purple-950/30 border border-purple-500/30 text-[10px] font-mono text-purple-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
