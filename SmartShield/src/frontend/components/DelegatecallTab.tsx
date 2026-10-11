/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Share2, AlertTriangle, CheckCircle, HelpCircle, Code, ShieldCheck } from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

interface DelegatecallTabProps {
  result: AnalysisResult;
}

export const DelegatecallTab: React.FC<DelegatecallTabProps> = ({ result }) => {
  const delegatecalls = result.ir.delegatecalls;

  return (
    <div className="space-y-6">
      {/* Header & Crucial Disclaimer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-amber-400" />
            <span>Delegatecall AST Detection & Target Classification</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detects low-level and high-level <code className="text-amber-300 font-mono">delegatecall</code> instructions,
            analyzing target resolution and parameter sources.
          </p>
        </div>

        {/* Paper Alignment Notice */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300">
              METHODOLOGY EMPHASIS: Finding delegatecall alone is NOT a vulnerability.
            </p>
            <p className="text-slate-300 leading-relaxed">
              <span className="font-semibold text-white">“delegatecall detected – further attack-path analysis required.”</span>{' '}
              Delegatecall is standard EVM proxy and library plumbing. A candidate attack path only exists when unconstrained
              externally callable logic can modify persistent state variables influencing sensitive execution sinks.
            </p>
          </div>
        </div>
      </div>

      {/* Delegatecall Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-3 px-4">Contract</th>
                <th className="py-3 px-4">Host Function</th>
                <th className="py-3 px-4">Target Expression</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Static Resolution</th>
                <th className="py-3 px-4">Source Location</th>
                <th className="py-3 px-4">Status & Next Step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-mono">
              {delegatecalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                    <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    No delegatecall instructions detected in the analyzed contracts.
                  </td>
                </tr>
              ) : (
                delegatecalls.map((dc, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-bold text-slate-300">{dc.contract}</td>
                    <td className="py-3 px-4 text-cyan-400 font-bold">{dc.function}()</td>

                    {/* Target Expression */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 rounded bg-slate-900 text-amber-300 border border-slate-800 font-mono">
                        {dc.targetExpression}
                      </span>
                    </td>

                    {/* Target Type */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-900 text-slate-300 border border-slate-800">
                        {dc.targetType.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Static Resolution */}
                    <td className="py-3 px-4">
                      {dc.targetResolved ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Resolved ({dc.targetContractName})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-slate-500">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Unresolved / Runtime State</span>
                        </span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="py-3 px-4 text-slate-500">
                      Line {dc.sourceLocation.line || '—'}, Col {dc.sourceLocation.column || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
                        <span>Awaiting Path Search</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Target Analysis Cards */}
      {delegatecalls.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {delegatecalls.map((dc, i) => (
            <div
              key={i}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  {dc.contract}.{dc.function}()
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-mono">
                  {dc.targetType}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-300">
                <div>
                  <span className="text-slate-500">Target Expression:</span>{' '}
                  <code className="text-amber-300 font-mono">{dc.targetExpression}</code>
                </div>
                <div>
                  <span className="text-slate-500">Forwarded Arguments:</span>{' '}
                  <code className="text-slate-300 font-mono text-[11px]">{dc.argumentsSummary}</code>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
                {dc.targetType === 'state_variable'
                  ? 'Target is stored in a contract state variable. If an attacker can overwrite this storage slot, execution flow can be redirected.'
                  : dc.targetType === 'function_parameter'
                  ? 'Target is passed as a function argument. If this function is externally callable without authorization, arbitrary execution may be possible.'
                  : 'Target expression evaluated at runtime.'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
