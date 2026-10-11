/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Flame,
  Share2,
  Database,
  ArrowRight,
  Code,
  Info,
  ChevronDown,
  ChevronUp,
  Download,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AnalysisResult, CandidateAttackPath } from '../../analyzer/models/types.ts';

interface SimpleFindingsTabProps {
  result: AnalysisResult;
  sourceCode: string;
  onOpenAdvanced: () => void;
  onGoToExport: () => void;
}

export const SimpleFindingsTab: React.FC<SimpleFindingsTabProps> = ({
  result,
  sourceCode,
  onOpenAdvanced,
  onGoToExport,
}) => {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(
    result.candidateAttackPaths.length > 0 ? result.candidateAttackPaths[0].id : null
  );

  const { summary, candidateAttackPaths, ir } = result;
  const sourceLines = sourceCode ? sourceCode.split('\n') : [];

  // Group affected variables
  const affectedVars = Array.from(new Set(candidateAttackPaths.map((p) => p.vulnerabilityVariable)));
  const hasDelegatecall = summary.delegatecallCount > 0;
  const highRiskCount = candidateAttackPaths.filter(
    (p) => p.vulnerabilityType === 'SELF_DESTRUCT' || p.vulnerabilityType === 'ETHER_TRANSFER'
  ).length;
  const mediumRiskCount = candidateAttackPaths.length - highRiskCount;

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
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Security Analysis Overview Card (Section 4 Simple View Requirement) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                Security Analysis Overview
              </span>
              <span className="text-xs font-mono text-slate-500">• Simple View</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              {candidateAttackPaths.length > 0
                ? `${candidateAttackPaths.length} Candidate Attack Path${candidateAttackPaths.length === 1 ? '' : 's'} Detected`
                : hasDelegatecall
                ? 'Delegatecall Detected (Protected)'
                : 'No Delegatecall Attack Paths Detected'}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenAdvanced}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-2 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Advanced Inspector</span>
            </button>
            <button
              onClick={onGoToExport}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-2 transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Findings</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Badges matching Section 4 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Delegatecalls</span>
              <Share2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-2">
              {summary.delegatecallCount}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {summary.delegatecallCount > 0 ? 'Occurrences found' : 'None detected'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Candidate Paths</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 mt-2">
              {candidateAttackPaths.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {highRiskCount} High, {mediumRiskCount} Medium
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Main Affected Variable</span>
              <Database className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-2 truncate">
              {affectedVars.length > 0 ? affectedVars[0] : 'None'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {affectedVars.length > 1 ? `+${affectedVars.length - 1} more variables` : 'State slot mapped'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Verification Status</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm font-bold text-amber-300 mt-2">
              Static Candidate
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Validation required
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Findings Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <span>Discovered Candidate Attack Paths</span>
          </h3>
          <span className="text-xs text-slate-400">Click any card to inspect full evidence</span>
        </div>

        {candidateAttackPaths.length === 0 ? (
          <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-white">No Potential Attack Paths Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Static data-flow analysis confirmed that no externally accessible functions modify state variables
              read by sensitive transfer or selfdestruct sinks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {candidateAttackPaths.map((path) => {
              const isSelected = selectedPathId === path.id;
              const writerSnippet = getSourceSnippet(path.writer?.source_line);
              const readerSnippet = getSourceSnippet(path.reader?.source_line || path.sink?.source_line);

              return (
                <div
                  key={path.id}
                  className={`bg-slate-900/90 border rounded-2xl p-6 transition-all shadow-xl ${
                    isSelected ? 'border-blue-500/50 shadow-blue-500/5' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none"
                    onClick={() => setSelectedPathId(isSelected ? null : path.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-extrabold text-white bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                        {path.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          path.vulnerabilityType === 'SELF_DESTRUCT'
                            ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                            : path.vulnerabilityType === 'ETHER_TRANSFER'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-950/60 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {path.vulnerability_type ? path.vulnerability_type.replace('_', ' ') : path.vulnerabilityType.replace('_', ' ')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Candidate
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                        Slot {path.storage.slot} • {path.vulnerabilityVariable}
                      </span>
                      <button className="text-slate-400 hover:text-white p-1 rounded-lg">
                        {isSelected ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Flow Diagram (Section 29/30) */}
                  <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-blue-500/30 text-blue-300 font-bold">
                        {path.writerFunction}()
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans">mutates</span>
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/30 text-rose-300 font-bold">
                        {path.vulnerabilityVariable}{' '}
                        <span className="text-[10px] text-slate-500 font-normal">(Slot {path.storage.slot})</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans">read by</span>
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/30 text-indigo-300 font-bold">
                        {path.readerFunction}()
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans">reaches</span>
                      <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-purple-500/30 text-purple-300 font-bold">
                        {path.sensitiveOperation.type}
                      </span>
                    </div>
                  </div>

                  {/* Why it was detected & Evidence Accordion */}
                  {isSelected && (
                    <div className="mt-5 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-400">
                          <Info className="w-4 h-4" />
                          <span>Why this was detected:</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {path.reason}
                        </p>
                      </div>

                      {/* Source Code Snippets */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        {writerSnippet && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30">
                            <div className="text-[10px] uppercase font-bold text-blue-400 mb-2 flex justify-between">
                              <span>Writer: {path.writerFunction}()</span>
                              <span className="text-slate-500">Line {path.writer?.source_line}</span>
                            </div>
                            <div className="space-y-1">
                              {writerSnippet.map((s) => (
                                <div
                                  key={s.line}
                                  className={`flex items-start space-x-2 ${
                                    s.isTarget ? 'bg-blue-500/20 text-blue-200 px-1 rounded' : 'text-slate-500'
                                  }`}
                                >
                                  <span className="select-none opacity-40 w-5 text-right">{s.line}</span>
                                  <span className="truncate">{s.code}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {readerSnippet && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30">
                            <div className="text-[10px] uppercase font-bold text-purple-400 mb-2 flex justify-between">
                              <span>Reader: {path.readerFunction}()</span>
                              <span className="text-slate-500">Line {path.reader?.source_line}</span>
                            </div>
                            <div className="space-y-1">
                              {readerSnippet.map((s) => (
                                <div
                                  key={s.line}
                                  className={`flex items-start space-x-2 ${
                                    s.isTarget ? 'bg-purple-500/20 text-purple-200 px-1 rounded' : 'text-slate-500'
                                  }`}
                                >
                                  <span className="select-none opacity-40 w-5 text-right">{s.line}</span>
                                  <span className="truncate">{s.code}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                        <span>Static candidate generated. Dynamic validation not yet performed.</span>
                        <button
                          onClick={onOpenAdvanced}
                          className="text-cyan-400 hover:text-cyan-300 font-medium underline flex items-center space-x-1"
                        >
                          <span>Inspect Storage & CFG in Advanced View →</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
