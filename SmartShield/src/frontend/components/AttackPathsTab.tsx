/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flame,
  ArrowRight,
  ShieldAlert,
  Database,
  CheckCircle2,
  AlertTriangle,
  Code,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCode,
  Info,
} from 'lucide-react';
import { AnalysisResult, CandidateAttackPath } from '../../analyzer/models/types.ts';

interface AttackPathsTabProps {
  result: AnalysisResult;
  sourceCode: string;
}

export const AttackPathsTab: React.FC<AttackPathsTabProps> = ({ result, sourceCode }) => {
  const [expandedPathId, setExpandedPathId] = useState<string | null>(
    result.candidateAttackPaths.length > 0 ? result.candidateAttackPaths[0].id : null
  );

  const paths = result.candidateAttackPaths;
  const sourceLines = sourceCode ? sourceCode.split('\n') : [];

  const toggleExpand = (id: string) => {
    setExpandedPathId((prev) => (prev === id ? null : id));
  };

  const getSourceSnippet = (lineNum: number | null | undefined, context = 2) => {
    if (!lineNum || lineNum < 1 || sourceLines.length === 0) return null;
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(sourceLines.length, lineNum + context);
    return sourceLines.slice(start, end).map((code, idx) => ({
      line: start + idx + 1,
      code,
      isTarget: start + idx + 1 === lineNum,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Research Alignment Notice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300">
            CANDIDATE ATTACK PATHS ONLY (STATIC ANALYSIS SCOPE)
          </p>
          <p className="text-slate-300 leading-relaxed">
            Candidate paths are generated purely via static read-write data flow analysis. They are{' '}
            <span className="font-bold text-white uppercase">not confirmed vulnerabilities</span> until formally validated
            using symbolic constraint solvers (e.g. Z3) and dynamic test vectors.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <span>Candidate Attack Paths for Validation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Data-flow sequences connecting externally reachable state mutation functions to security-sensitive operations.
          </p>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
          Total Candidates: <span className="text-rose-400 font-bold">{paths.length}</span>
        </div>
      </div>

      {paths.length === 0 ? (
        <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-xl space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Candidate Attack Paths Detected</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Static data flow analysis did not detect any externally accessible writer functions influencing state variables
            read by sensitive sinks or judgment conditions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {paths.map((path) => {
            const isExpanded = expandedPathId === path.id;
            const writerSnippet = getSourceSnippet(path.writer?.source_line);
            const readerSnippet = getSourceSnippet(path.reader?.source_line);
            const sinkSnippet = getSourceSnippet(path.sink?.source_line);
            const delegatecallSnippet = getSourceSnippet(path.delegatecallLocation.line);

            return (
              <div
                key={path.id}
                className={`bg-slate-900/90 border rounded-2xl p-5 shadow-xl transition-all ${
                  isExpanded ? 'border-blue-500/50 shadow-blue-500/5' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div
                  className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => toggleExpand(path.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-extrabold text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {path.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                        path.vulnerabilityType === 'SELF_DESTRUCT'
                          ? 'bg-rose-950/50 text-rose-400 border border-rose-500/30'
                          : path.vulnerabilityType === 'ETHER_TRANSFER'
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'
                          : 'bg-purple-950/50 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      {path.vulnerability_type ? path.vulnerability_type.replace('_', ' ') : path.vulnerabilityType.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {path.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                      Target Variable: <strong className="text-white">{path.vulnerabilityVariable}</strong> (Slot {path.storage.slot})
                    </span>
                    <button className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Compact Flow Chain (Always visible) */}
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-blue-500/30 text-blue-300 font-bold">
                      {path.writerFunction}()
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans">writes</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-rose-500/30 text-rose-300 font-bold">
                      {path.vulnerabilityVariable}
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans">reads</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-indigo-500/30 text-indigo-300 font-bold">
                      {path.readerFunction}()
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans">reaches</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-purple-500/30 text-purple-300 font-bold">
                      {path.sensitiveOperation.type}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-slate-800 space-y-5 animate-in fade-in duration-200">
                    {/* Why Detected Rationale */}
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                        <Info className="w-4 h-4 text-cyan-400" />
                        <span>Why this was detected (Static Analysis Rationale):</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {path.reason}
                      </p>
                      <p className="text-[11px] text-slate-400 italic">
                        The relationship forms a potential delegatecall-related attack path because an externally callable function mutates state, and the subsequent reader function evaluates that state before executing a security-sensitive sink.
                      </p>
                    </div>

                    {/* Technical Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Storage Slot</span>
                        <span className="font-mono text-cyan-400 font-bold mt-0.5 block">
                          Slot {path.storage.slot} (Offset {path.storage.offset}B)
                        </span>
                        <span className="text-[10px] text-slate-500">Confidence: {path.storage.confidence}</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Access Controls</span>
                        <span className="font-mono text-slate-300 mt-0.5 block truncate">
                          Writer: {path.access_control?.writer || 'PUBLIC'}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Reader: {path.access_control?.reader || 'CONDITIONAL'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Delegatecall Location</span>
                        <span className="font-mono text-amber-400 mt-0.5 block truncate">
                          {path.delegatecallLocation.function || 'N/A'} (Line {path.delegatecallLocation.line || 'N/A'})
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {path.callerContract} → {path.calleeContract || 'Implementation'}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-mono">Validation Status</span>
                        <span className="font-mono text-amber-300 mt-0.5 block">
                          Static Candidate Only
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Dynamic validation required
                        </span>
                      </div>
                    </div>

                    {/* Source-Level Evidence Snippets */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-white font-mono">
                        <Code className="w-4 h-4 text-cyan-400" />
                        <span>Source-Level Evidence:</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        {/* Writer snippet */}
                        {writerSnippet && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30">
                            <div className="text-[10px] uppercase font-bold text-blue-400 mb-2 flex items-center justify-between">
                              <span>Writer: {path.writerFunction}()</span>
                              <span className="text-slate-500">Line {path.writer?.source_line}</span>
                            </div>
                            <div className="space-y-1">
                              {writerSnippet.map((s) => (
                                <div
                                  key={s.line}
                                  className={`flex items-start space-x-2 ${
                                    s.isTarget ? 'bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded' : 'text-slate-500'
                                  }`}
                                >
                                  <span className="select-none w-6 text-right opacity-50 text-[10px]">{s.line}</span>
                                  <span className="text-[11px] truncate">{s.code}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reader & Sink snippet */}
                        {(readerSnippet || sinkSnippet) && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30">
                            <div className="text-[10px] uppercase font-bold text-purple-400 mb-2 flex items-center justify-between">
                              <span>Reader / Sink: {path.readerFunction}()</span>
                              <span className="text-slate-500">
                                Line {path.reader?.source_line || path.sink?.source_line}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {(readerSnippet || sinkSnippet)!.map((s) => (
                                <div
                                  key={s.line}
                                  className={`flex items-start space-x-2 ${
                                    s.isTarget ? 'bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded' : 'text-slate-500'
                                  }`}
                                >
                                  <span className="select-none w-6 text-right opacity-50 text-[10px]">{s.line}</span>
                                  <span className="text-[11px] truncate">{s.code}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
