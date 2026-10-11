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
  ChevronRight,
  FileCode,
  Info,
  Share2,
  Network,
  GitCompare,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Eye,
  Sliders,
  Terminal,
} from 'lucide-react';
import { AnalysisResult, CandidateAttackPath } from '../../analyzer/models/types.ts';

interface FindingsPageProps {
  result: AnalysisResult;
  sourceCode: string;
  sourceFiles?: { filename: string; content: string }[];
  onGoToReports: () => void;
  onGoToAnalyze: () => void;
}

export const FindingsPage: React.FC<FindingsPageProps> = ({
  result,
  sourceCode,
  sourceFiles = [],
  onGoToReports,
  onGoToAnalyze,
}) => {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Technical Evidence Collapsible States (Accordions)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    delegatecall: false,
    dataflow: false,
    storage: false,
    controlflow: false,
    contractstructure: false,
    rawanalysis: false,
  });

  // Modal dialog states for viewing full subsystem maps
  const [activeModal, setActiveModal] = useState<
    'delegatecalls' | 'dataflow' | 'storage' | 'controlflow' | 'contractstructure' | 'sensitive' | null
  >(null);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const { summary, candidateAttackPaths, ir } = result;
  const paths = candidateAttackPaths;

  // Selected path object
  const activePath = paths.find((p) => p.id === selectedPathId) || null;

  // Affected variables
  const affectedVars = Array.from(new Set(paths.map((p) => p.vulnerabilityVariable)));

  // Human-readable titles mapping (§21 Requirement)
  const getHumanReadableTitle = (p: CandidateAttackPath) => {
    const type = p.vulnerability_type || p.vulnerabilityType;
    if (type === 'CURRENCY_SENDING' || type === 'ETHER_TRANSFER') {
      return 'Potential Ether-transfer control path';
    }
    if (type === 'SELF_DESTRUCT') {
      return 'Potential self-destruct control path';
    }
    if (type === 'JUDGMENT_CONDITION') {
      return 'Potential authorization / condition control path';
    }
    return `Potential security issue (${type})`;
  };

  // Helper to extract lines from code
  const getSourceLines = (lineNum: number | null | undefined, context = 3) => {
    if (!lineNum || lineNum < 1 || !sourceCode) return null;
    const lines = sourceCode.split('\n');
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(lines.length, lineNum + context);
    return lines.slice(start, end).map((code, idx) => ({
      line: start + idx + 1,
      code,
      isTarget: start + idx + 1 === lineNum,
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ========================================================================= */}
      {/* 1. FINDINGS HEADER & COMPACT METRICS ROW (§18 Requirement)                 */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                Analysis Complete
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-mono text-slate-400">
                Solidity v{ir.compilerVersion}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {paths.length > 0
                ? `${paths.length} Potential Attack Path${paths.length === 1 ? '' : 's'} Discovered`
                : 'No Potential Attack Paths Discovered'}
            </h1>
            <p className="text-xs text-amber-300/90 font-medium">
              Static analysis complete • Runtime validation required
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onGoToAnalyze}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              Analyze Another
            </button>
            <button
              onClick={onGoToReports}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              Export Report
            </button>
          </div>
        </div>

        {/* Compact Metrics Row (§18 Requirement) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Delegatecalls</span>
            <div className="text-xl font-bold text-white mt-1">
              {summary.delegatecallCount}
            </div>
            <span className="text-[10px] text-slate-500">Invocations detected</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Potential Paths</span>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {paths.length}
            </div>
            <span className="text-[10px] text-slate-500">Candidate data flows</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">State Involved</span>
            <div className="text-xl font-bold text-cyan-300 mt-1 font-mono truncate">
              {affectedVars.length > 0 ? affectedVars[0] : 'None'}
            </div>
            <span className="text-[10px] text-slate-500 truncate block">
              {affectedVars.length > 1 ? `+${affectedVars.length - 1} more variables` : 'State slot mapped'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Contracts Mapped</span>
            <div className="text-xl font-bold text-slate-200 mt-1">
              {summary.contractsCount}
            </div>
            <span className="text-[10px] text-slate-500">
              {summary.functionsCount} functions analyzed
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ZERO-FINDINGS NOTICE (§47 Requirement - NEVER CLAIM "SAFE")             */}
      {/* ========================================================================= */}
      {paths.length === 0 && (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">
            No delegatecall-related candidate paths found
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            This result is based on static analysis. It does not prove that the contract is free of vulnerabilities.
            No externally accessible functions were identified that mutate state variables subsequently evaluated by
            security-sensitive sinks or conditions.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveModal('delegatecalls')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline"
            >
              Inspect detected delegatecall instructions ({summary.delegatecallCount}) →
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW 1: POTENTIAL ATTACK PATHS LIST (§20 Requirement)                   */}
      {/* ========================================================================= */}
      {!selectedPathId && paths.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Potential Attack Paths</span>
            </h2>
            <span className="text-xs text-slate-400">
              Select any candidate path to investigate source and technical evidence
            </span>
          </div>

          <div className="space-y-3">
            {paths.map((path) => (
              <div
                key={path.id}
                onClick={() => setSelectedPathId(path.id)}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-850 rounded-2xl p-5 shadow-lg transition-all cursor-pointer group"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {path.id}
                    </span>
                    <span className="text-sm font-bold text-white group-hover:text-blue-300 transition">
                      {getHumanReadableTitle(path)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      CANDIDATE • Validation required
                    </span>
                    <button className="text-xs text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center space-x-1 font-semibold">
                      <span>View Finding</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Compact Flow Chain (§20 Requirement) */}
                <div className="mt-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-blue-500/30 text-blue-300 font-semibold">
                      {path.writerFunction}()
                    </span>
                    <span className="text-slate-500 text-[11px] font-sans">→ writes</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-rose-500/30 text-rose-300 font-semibold">
                      {path.vulnerabilityVariable} <span className="text-slate-500 text-[10px]">(Slot {path.storage.slot})</span>
                    </span>
                    <span className="text-slate-500 text-[11px] font-sans">→ read by</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-indigo-500/30 text-indigo-300 font-semibold">
                      {path.readerFunction}()
                    </span>
                    <span className="text-slate-500 text-[11px] font-sans">→ reaches</span>
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-purple-500/30 text-purple-300 font-semibold">
                      {path.sensitiveOperation.type}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 line-clamp-1">
                  {path.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW 2: SINGLE FINDING INVESTIGATION VIEW (§23-§33 Requirement)         */}
      {/* ========================================================================= */}
      {selectedPathId && activePath && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedPathId(null)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all findings</span>
            </button>

            <div className="flex items-center space-x-2 text-xs">
              <span className="font-mono text-slate-400">{activePath.id}</span>
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                CANDIDATE • Validation required
              </span>
            </div>
          </div>

          {/* Finding Title Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
              Candidate Attack Path Investigation
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {getHumanReadableTitle(activePath)}
            </h2>
            <div className="flex items-center space-x-4 text-xs text-slate-400 pt-1">
              <span>Target Contract: <strong className="text-white">{activePath.contract || activePath.callerContract}</strong></span>
              <span>•</span>
              <span>Variable: <strong className="text-cyan-300 font-mono">{activePath.vulnerabilityVariable}</strong></span>
              <span>•</span>
              <span>Storage Slot: <strong className="text-white font-mono">{activePath.storage.slot}</strong></span>
            </div>
          </div>

          {/* Section: WHY WAS THIS FLAGGED? (§23 Requirement) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Why Was This Flagged?</span>
            </h3>

            <div className="text-xs text-slate-300 leading-relaxed space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p>
                <code className="text-blue-300 font-bold font-mono">{activePath.writerFunction}()</code> writes the persistent state variable{' '}
                <code className="text-rose-300 font-bold font-mono">{activePath.vulnerabilityVariable}</code> (EVM storage slot {activePath.storage.slot}).
              </p>
              <p>
                <code className="text-indigo-300 font-bold font-mono">{activePath.readerFunction}()</code> subsequently reads and evaluates{' '}
                <code className="text-rose-300 font-bold font-mono">{activePath.vulnerabilityVariable}</code>.
              </p>
              <p>
                That value directly influences or reaches a security-sensitive operation:{' '}
                <code className="text-purple-300 font-bold font-mono">{activePath.sensitiveOperation.type}</code> in function{' '}
                <code className="text-white font-mono">{activePath.sensitiveOperation.function}()</code>.
              </p>
              <p className="text-slate-400 text-[11px] pt-1">
                SmartShield static analysis identified a potential delegatecall-related attack path because an unvalidated state mutation in the caller's storage slot can alter downstream sensitive logic.
              </p>
            </div>
          </div>

          {/* Section: ATTACK PATH VISUALIZATION (§24 Requirement) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Attack Path Flow</span>
            </h3>

            {/* Visual Node Diagram */}
            <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
              {/* Node 1: Writer */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-blue-500/40 text-center w-full md:w-48 shadow-md">
                <span className="text-[10px] text-blue-400 uppercase font-bold block mb-1">1. Writer Function</span>
                <span className="font-bold text-white text-sm block truncate">{activePath.writerFunction}()</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Line {activePath.writer?.source_line || 'N/A'}</span>
              </div>

              {/* Arrow 1 */}
              <div className="flex flex-col items-center text-slate-500 text-[11px]">
                <span className="font-sans font-medium text-slate-400 mb-0.5">writes state</span>
                <ArrowRight className="w-5 h-5 text-blue-400 rotate-90 md:rotate-0" />
              </div>

              {/* Node 2: Variable */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-rose-500/40 text-center w-full md:w-48 shadow-md">
                <span className="text-[10px] text-rose-400 uppercase font-bold block mb-1">2. State Variable</span>
                <span className="font-bold text-rose-300 text-sm block truncate">{activePath.vulnerabilityVariable}</span>
                <span className="text-[10px] text-slate-500 mt-1 block font-mono">Slot {activePath.storage.slot}</span>
              </div>

              {/* Arrow 2 */}
              <div className="flex flex-col items-center text-slate-500 text-[11px]">
                <span className="font-sans font-medium text-slate-400 mb-0.5">read by</span>
                <ArrowRight className="w-5 h-5 text-indigo-400 rotate-90 md:rotate-0" />
              </div>

              {/* Node 3: Reader */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-center w-full md:w-48 shadow-md">
                <span className="text-[10px] text-indigo-400 uppercase font-bold block mb-1">3. Reader Function</span>
                <span className="font-bold text-white text-sm block truncate">{activePath.readerFunction}()</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Line {activePath.reader?.source_line || 'N/A'}</span>
              </div>

              {/* Arrow 3 */}
              <div className="flex flex-col items-center text-slate-500 text-[11px]">
                <span className="font-sans font-medium text-slate-400 mb-0.5">reaches</span>
                <ArrowRight className="w-5 h-5 text-purple-400 rotate-90 md:rotate-0" />
              </div>

              {/* Node 4: Sink */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-purple-500/40 text-center w-full md:w-48 shadow-md">
                <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">4. Sensitive Operation</span>
                <span className="font-bold text-purple-300 text-sm block truncate">{activePath.sensitiveOperation.type}</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Line {activePath.sink?.source_line || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Section: SOURCE EVIDENCE (§25 & §50 Requirement) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Source Evidence</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Writer Source Box */}
              <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800">
                  <span className="font-bold text-blue-400">Writer: {activePath.writerFunction}()</span>
                  <span className="text-slate-500">Line {activePath.writer?.source_line || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  {getSourceLines(activePath.writer?.source_line)?.map((s) => (
                    <div
                      key={s.line}
                      className={`flex items-start space-x-3 ${
                        s.isTarget ? 'bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded' : 'text-slate-500'
                      }`}
                    >
                      <span className="w-6 text-right opacity-40 select-none">{s.line}</span>
                      <span className="truncate">{s.code}</span>
                    </div>
                  )) || <div className="text-slate-500">Source snippet not available</div>}
                </div>
              </div>

              {/* Reader / Sink Source Box */}
              <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800">
                  <span className="font-bold text-purple-400">Reader: {activePath.readerFunction}()</span>
                  <span className="text-slate-500">Line {activePath.reader?.source_line || activePath.sink?.source_line || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  {getSourceLines(activePath.reader?.source_line || activePath.sink?.source_line)?.map((s) => (
                    <div
                      key={s.line}
                      className={`flex items-start space-x-3 ${
                        s.isTarget ? 'bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded' : 'text-slate-500'
                      }`}
                    >
                      <span className="w-6 text-right opacity-40 select-none">{s.line}</span>
                      <span className="truncate">{s.code}</span>
                    </div>
                  )) || <div className="text-slate-500">Source snippet not available</div>}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. TECHNICAL EVIDENCE (ACCORDIONS) (§27-§33 Requirement)                  */}
          {/* ========================================================================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Technical Evidence</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Progressive disclosure for researchers
              </span>
            </div>

            <div className="space-y-3">
              {/* Accordion 1: Delegatecall Evidence (§28 Requirement) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <button
                  onClick={() => toggleSection('delegatecall')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Share2 className="w-4 h-4 text-amber-400" />
                    <span>Delegatecall Involvement</span>
                  </span>
                  {openSections.delegatecall ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.delegatecall && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Caller Contract</span>
                        <span className="font-bold text-white">{activePath.callerContract || 'Proxy'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Implementation Target</span>
                        <span className="font-bold text-amber-400">{activePath.calleeContract || 'Implementation'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Target Resolution</span>
                        <span className="font-bold text-cyan-300">{activePath.delegatecall?.target_resolution || 'STATE_VARIABLE'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Access Control</span>
                        <span className="font-bold text-slate-200">{activePath.access_control?.reader || 'CONDITIONAL'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Delegatecall executes callee logic within caller storage context.
                      </span>
                      <button
                        onClick={() => setActiveModal('delegatecalls')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                      >
                        View all detected delegatecalls ({summary.delegatecallCount}) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Data Flow Evidence (§29 Requirement) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <button
                  onClick={() => toggleSection('dataflow')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <GitCompare className="w-4 h-4 text-cyan-400" />
                    <span>Data Flow Evidence</span>
                  </span>
                  {openSections.dataflow ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.dataflow && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono space-y-1.5">
                      <div><strong className="text-blue-400">Writer:</strong> {activePath.writerFunction}() ──[WRITE]──► <span className="text-rose-300 font-bold">{activePath.vulnerabilityVariable}</span></div>
                      <div><strong className="text-indigo-400">Reader:</strong> {activePath.readerFunction}() ──[READ]──► <span className="text-rose-300 font-bold">{activePath.vulnerabilityVariable}</span></div>
                      <div><strong className="text-purple-400">Sensitive Use:</strong> {activePath.readerFunction}() ──[EVALUATE]──► {activePath.sensitiveOperation.type}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Tracks persistent state variable mutation dependencies across functions.
                      </span>
                      <button
                        onClick={() => setActiveModal('dataflow')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                      >
                        View complete data-flow matrix →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Storage Evidence (§30 Requirement) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <button
                  onClick={() => toggleSection('storage')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Storage Evidence</span>
                  </span>
                  {openSections.storage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.storage && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">State Variable</span>
                        <span className="font-bold text-white">{activePath.vulnerabilityVariable}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Storage Slot</span>
                        <span className="font-bold text-emerald-400">Slot {activePath.storage.slot}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Byte Offset</span>
                        <span className="font-bold text-slate-200">{activePath.storage.offset} Bytes</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Layout Status</span>
                        <span className="font-bold text-cyan-300">Static Mapped</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Calculates contiguous EVM 32-byte packing and identifies potential layout conflicts.
                      </span>
                      <button
                        onClick={() => setActiveModal('storage')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                      >
                        View complete storage layout ({ir.storageLayout.length} variables) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Control Flow Evidence (§31 Requirement) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <button
                  onClick={() => toggleSection('controlflow')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    <span>Control Flow Evidence</span>
                  </span>
                  {openSections.controlflow ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.controlflow && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs space-y-1">
                      <div className="text-slate-400">Simplified execution flow for <strong className="text-white">{activePath.readerFunction}()</strong>:</div>
                      <div className="text-cyan-300 pl-2">1. ENTRY: {activePath.readerFunction}()</div>
                      <div className="text-amber-300 pl-4">2. CONDITION CHECK: evaluate {activePath.vulnerabilityVariable}</div>
                      <div className="text-rose-300 pl-6">3. SINK: execute {activePath.sensitiveOperation.type}</div>
                      <div className="text-slate-500 pl-2">4. EXIT / RETURN</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Inter-function call graph and intra-function basic block control-flow graphs.
                      </span>
                      <button
                        onClick={() => setActiveModal('controlflow')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                      >
                        View complete call graph & CFG ({ir.calls.length} edges) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 5: Contract Structure Evidence (§32 Requirement) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <button
                  onClick={() => toggleSection('contractstructure')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-blue-400" />
                    <span>Contract Structure</span>
                  </span>
                  {openSections.contractstructure ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.contractstructure && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Contracts</span>
                        <span className="font-bold text-white">{summary.contractsCount}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Functions</span>
                        <span className="font-bold text-white">{summary.functionsCount}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">State Variables</span>
                        <span className="font-bold text-white">{summary.stateVariablesCount}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Inheritance Links</span>
                        <span className="font-bold text-white">
                          {ir.contracts.reduce((acc, c) => acc + c.inheritance.length, 0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        AST deconstruction of contract hierarchies, function signatures, and visibility.
                      </span>
                      <button
                        onClick={() => setActiveModal('contractstructure')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
                      >
                        View detailed contract structure →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 6: Raw Analysis JSON (§33 Requirement) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <button
                  onClick={() => toggleSection('rawanalysis')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-slate-400" />
                    <span>Raw Candidate Path JSON</span>
                  </span>
                  {openSections.rawanalysis ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.rawanalysis && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">Standard CandidateAttackPath Schema v1.0</span>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(activePath, null, 2))}
                        className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedRaw ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-60 scrollbar-thin">
                      {JSON.stringify(activePath, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL DIALOGS FOR FULL TECHNICAL SUBSYSTEMS                            */}
      {/* ========================================================================= */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-4xl w-full space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white capitalize">
                  {activeModal === 'delegatecalls' && 'Detected Delegatecall Invocations'}
                  {activeModal === 'dataflow' && 'Complete Read/Write Data Flow Matrix'}
                  {activeModal === 'storage' && 'Complete EVM Storage Layout Model'}
                  {activeModal === 'controlflow' && 'Control Flow Graph & Call Relationships'}
                  {activeModal === 'contractstructure' && 'Deconstructed Contract Structure (AST)'}
                  {activeModal === 'sensitive' && 'All Detected Security-Sensitive Operations'}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto pr-1 space-y-3 text-xs">
              {activeModal === 'delegatecalls' && (
                <div className="space-y-2 font-mono">
                  {ir.delegatecalls.map((dc, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex justify-between text-white font-bold">
                        <span>{dc.contract}.{dc.function}()</span>
                        <span className="text-slate-500">Line {dc.sourceLocation.line}</span>
                      </div>
                      <div className="text-slate-400">Target Expression: <span className="text-amber-400">{dc.targetExpression}</span></div>
                      <div className="text-slate-400">Resolution: <span className="text-cyan-300">{dc.targetType}</span></div>
                      <div className="text-slate-500 text-[11px] truncate">Arguments: {dc.argumentsSummary || 'calldata'}</div>
                    </div>
                  ))}
                </div>
              )}

              {activeModal === 'dataflow' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Contract</th>
                        <th className="py-2 px-3">Function</th>
                        <th className="py-2 px-3">State Writes</th>
                        <th className="py-2 px-3">State Reads</th>
                        <th className="py-2 px-3">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {ir.functions.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-950/50">
                          <td className="py-2 px-3 text-slate-400">{f.contract}</td>
                          <td className="py-2 px-3 text-white font-semibold">{f.name}()</td>
                          <td className="py-2 px-3 text-rose-300">{f.writes.length > 0 ? f.writes.join(', ') : '—'}</td>
                          <td className="py-2 px-3 text-blue-300">{f.reads.length > 0 ? f.reads.join(', ') : '—'}</td>
                          <td className="py-2 px-3 text-slate-500 uppercase">{f.visibility}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === 'storage' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Slot</th>
                        <th className="py-2 px-3">Contract</th>
                        <th className="py-2 px-3">Variable</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Offset</th>
                        <th className="py-2 px-3">Bytes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {ir.storageLayout.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-950/50">
                          <td className="py-2 px-3 text-emerald-400 font-bold">{s.slot}</td>
                          <td className="py-2 px-3 text-slate-400">{s.contract}</td>
                          <td className="py-2 px-3 text-white font-semibold">{s.name}</td>
                          <td className="py-2 px-3 text-cyan-300">{s.type}</td>
                          <td className="py-2 px-3 text-slate-400">{s.offset}B</td>
                          <td className="py-2 px-3 text-slate-500">{s.bytes}B</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === 'controlflow' && (
                <div className="space-y-3 font-mono">
                  <div className="font-bold text-white">Call Graph Edges:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ir.calls.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                        <span>{c.from} → {c.to}</span>
                        <span className="text-slate-500 uppercase">{c.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModal === 'contractstructure' && (
                <div className="space-y-3 font-mono">
                  {ir.contracts.map((c, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold text-white text-sm">
                        <span>{c.name} ({c.kind})</span>
                        <span className="text-slate-500">{c.functions.length} functions</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Inheritance: {c.inheritance.length > 0 ? c.inheritance.join(', ') : 'None'}
                      </div>
                      <div className="text-xs text-slate-400">
                        State Variables: {c.stateVariables.map((v) => `${v.type} ${v.name}`).join(', ') || 'None'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
