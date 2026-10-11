/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Info,
  Share2,
  Network,
  GitCompare,
  ArrowLeft,
  Copy,
  Check,
  Sliders,
  Terminal,
  X,
  FileCode,
  Play,
  Pause,
  Search,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { AnalysisResult, CandidateAttackPath } from '../../analyzer/models/types.ts';

interface SecurityResultsPageProps {
  result: AnalysisResult;
  sourceCode: string;
  sourceFiles?: { filename: string; content: string }[];
  onGoToReports: () => void;
  onGoToScan: () => void;
}

export const SecurityResultsPage: React.FC<SecurityResultsPageProps> = ({
  result,
  sourceCode,
  sourceFiles = [],
  onGoToReports,
  onGoToScan,
}) => {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [simulatedStep, setSimulatedStep] = useState<number>(0);
  const [isPlayingTrace, setIsPlayingTrace] = useState<boolean>(true);

  // Technical Evidence Collapsible States (Accordions)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    delegatecall: false,
    dataflow: false,
    storage: false,
    controlflow: false,
    contractstructure: false,
    sensitiveops: false,
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

  // Auto-play attack path step simulation when viewing a path
  useEffect(() => {
    if (!isPlayingTrace || !selectedPathId) return;
    const interval = setInterval(() => {
      setSimulatedStep((prev) => (prev + 1) % 4);
    }, 2200);
    return () => clearInterval(interval);
  }, [isPlayingTrace, selectedPathId]);

  // Filtered candidate paths based on search & classification
  const filteredPaths = paths.filter((p) => {
    const type = (p.vulnerability_type || p.vulnerabilityType || '').toUpperCase();
    if (filterClassification === 'ETHER' && !type.includes('CURRENCY') && !type.includes('ETHER')) {
      return false;
    }
    if (filterClassification === 'DESTRUCT' && !type.includes('DESTRUCT')) {
      return false;
    }
    if (filterClassification === 'CONDITION' && !type.includes('JUDGMENT') && !type.includes('CONDITION')) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = p.id.toLowerCase().includes(q);
      const matchVar = p.vulnerabilityVariable.toLowerCase().includes(q);
      const matchWriter = p.writerFunction.toLowerCase().includes(q);
      const matchReader = p.readerFunction.toLowerCase().includes(q);
      const matchSink = p.sensitiveOperation.type.toLowerCase().includes(q);
      return matchId || matchVar || matchWriter || matchReader || matchSink;
    }

    return true;
  });

  // Affected variables
  const affectedVars = Array.from(new Set(paths.map((p) => p.vulnerabilityVariable)));

  // Human-readable titles mapping
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
      {/* 1. Header & Compact Metrics Row */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-500/30">
                SECURITY RESULTS
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs font-mono text-slate-400">
                Target Solidity v{ir.compilerVersion}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {paths.length > 0
                ? `${paths.length} Potential Attack Path${paths.length === 1 ? '' : 's'} Identified`
                : 'No Potential Attack Paths Found'}
            </h1>
            <p className="text-xs text-amber-300/90 font-medium flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Static analysis complete · Runtime validation required by downstream verification layers</span>
            </p>
          </div>

          <div className="flex items-center space-x-2.5 flex-wrap">
            <button
              onClick={() => setActiveModal('dataflow')}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Technical Explorer</span>
            </button>
            <button
              onClick={onGoToScan}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              Scan Another
            </button>
            <button
              onClick={onGoToReports}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition cursor-pointer"
            >
              Reports & Export
            </button>
          </div>
        </div>

        {/* Compact Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Delegatecalls</span>
            <div className="text-2xl font-black text-white mt-1 font-mono tabular-nums">
              {summary.delegatecallCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Invocations detected</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Potential Paths</span>
            <div className={`text-2xl font-black mt-1 font-mono tabular-nums ${paths.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {paths.length}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Candidate data flows</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">State Involved</span>
            <div className="text-xl font-bold text-cyan-300 mt-1 font-mono truncate">
              {affectedVars.length > 0 ? affectedVars[0] : 'None'}
            </div>
            <span className="text-[10px] text-slate-500 truncate block mt-0.5">
              {affectedVars.length > 1 ? `+${affectedVars.length - 1} more variables` : 'State slot mapped'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 uppercase font-mono block">Contracts Mapped</span>
            <div className="text-2xl font-black text-slate-200 mt-1 font-mono tabular-nums">
              {summary.contractsCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {summary.functionsCount} functions analyzed
            </span>
          </div>
        </div>
      </div>

      {/* 2. Zero-Findings Notice */}
      {paths.length === 0 && (
        <div className="p-8 text-center bg-slate-900/90 border border-slate-800/80 rounded-3xl space-y-3">
          <CheckCircle2 className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">
            No delegatecall-related candidate paths found.
          </h3>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Static analysis completed successfully. This result does not prove the absence of vulnerabilities.
            No externally accessible functions were identified that mutate state variables subsequently evaluated by
            security-sensitive sinks or conditions.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setActiveModal('delegatecalls')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer"
            >
              Inspect detected delegatecall instructions ({summary.delegatecallCount}) →
            </button>
          </div>
        </div>
      )}

      {/* 3. Potential Attack Paths List */}
      {!selectedPathId && paths.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Candidate Attack Paths</span>
                <span className="text-xs font-mono text-slate-400">
                  ({filteredPaths.length} of {paths.length})
                </span>
              </h2>
              <span className="text-xs text-slate-400">
                Click any candidate path to inspect trace evidence & code
              </span>
            </div>

            {/* Classification Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterClassification('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filterClassification === 'ALL'
                    ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({paths.length})
              </button>
              <button
                onClick={() => setFilterClassification('ETHER')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filterClassification === 'ETHER'
                    ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ether Drain
              </button>
              <button
                onClick={() => setFilterClassification('CONDITION')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filterClassification === 'CONDITION'
                    ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Owner / Condition
              </button>
              <button
                onClick={() => setFilterClassification('DESTRUCT')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filterClassification === 'DESTRUCT'
                    ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Destruct
              </button>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate paths by function, variable, or sink..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {filteredPaths.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl text-xs text-slate-400">
              No candidate paths matched your search query or filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPaths.map((path) => (
                <div
                  key={path.id}
                  onClick={() => setSelectedPathId(path.id)}
                  className="bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900 hover:-translate-y-0.5 hover:shadow-lg rounded-2xl p-5 shadow-sm transition-all duration-150 cursor-pointer group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {path.id}
                      </span>
                      <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {getHumanReadableTitle(path)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        CANDIDATE · Validation required
                      </span>
                      <div className="text-xs text-cyan-400 group-hover:translate-x-0.5 transition-transform flex items-center space-x-1 font-semibold">
                        <span>Inspect finding</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Inline Compact Flow Chain */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-blue-500/30 text-blue-300 font-semibold">
                        {path.writerFunction}()
                      </span>
                      <span className="text-slate-500 text-[11px] font-sans">writes</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-rose-500/30 text-rose-300 font-semibold">
                        {path.vulnerabilityVariable} <span className="text-slate-500 text-[10px]">(Slot {path.storage.slot})</span>
                      </span>
                      <span className="text-slate-500 text-[11px] font-sans">read by</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-indigo-500/30 text-indigo-300 font-semibold">
                        {path.readerFunction}()
                      </span>
                      <span className="text-slate-500 text-[11px] font-sans">reaches</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-purple-500/30 text-purple-300 font-semibold">
                        {path.sensitiveOperation.type}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 text-xs text-slate-400 line-clamp-1 leading-normal">
                    {path.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Single Finding Detail View */}
      {selectedPathId && activePath && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedPathId(null)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to all candidate paths</span>
            </button>

            <div className="flex items-center space-x-2 text-xs">
              <span className="font-mono text-slate-400">{activePath.id}</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                CANDIDATE · Validation required
              </span>
            </div>
          </div>

          {/* Finding Title Card */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-2">
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
              Candidate Attack Path Investigation
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {getHumanReadableTitle(activePath)}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span>Target Contract: <strong className="text-white font-mono">{activePath.contract || activePath.callerContract}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Variable: <strong className="text-cyan-300 font-mono">{activePath.vulnerabilityVariable}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Storage Slot: <strong className="text-emerald-400 font-mono">{activePath.storage.slot}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Offset: <strong className="text-slate-200 font-mono">{activePath.storage.offset}B</strong></span>
            </div>
          </div>

          {/* Section: WHY WAS THIS FLAGGED? */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Why Was This Flagged?</span>
            </h3>

            <div className="text-xs text-slate-300 leading-relaxed space-y-2 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 font-normal">
              <p>
                <code className="text-blue-300 font-bold font-mono">{activePath.writerFunction}()</code> writes persistent state variable{' '}
                <code className="text-rose-300 font-bold font-mono">{activePath.vulnerabilityVariable}</code> (EVM storage slot {activePath.storage.slot}).
              </p>
              <p>
                <code className="text-indigo-300 font-bold font-mono">{activePath.readerFunction}()</code> subsequently reads and evaluates{' '}
                <code className="text-rose-300 font-bold font-mono">{activePath.vulnerabilityVariable}</code>.
              </p>
              <p>
                That value directly influences or reaches a security-sensitive sink:{' '}
                <code className="text-purple-300 font-bold font-mono">{activePath.sensitiveOperation.type}</code> in function{' '}
                <code className="text-white font-mono">{activePath.sensitiveOperation.function}()</code>.
              </p>
              <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800/60">
                SmartShield static analysis flagged this candidate path because an unvalidated state mutation in the caller's storage slot can alter downstream sensitive logic.
              </p>
            </div>
          </div>

          {/* Section: ATTACK PATH VISUALIZATION (Animated with Subtle Depth) */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 relative overflow-hidden backdrop-blur-sm">
            {/* Ambient subtle glow */}
            <div className="absolute -right-24 -top-24 w-60 h-60 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-slate-800/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Attack Path Flow Graph
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                    LIVE TRACE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Data-flow trajectory through delegatecall proxy storage into sensitive operation sink
                </p>
              </div>

              {/* Interactive Step Stepper & Playback Controls */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono">
                  {[0, 1, 2, 3].map((stepIdx) => (
                    <button
                      key={stepIdx}
                      onClick={() => {
                        setSimulatedStep(stepIdx);
                        setIsPlayingTrace(false);
                      }}
                      className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                        simulatedStep === stepIdx
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Step {stepIdx + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsPlayingTrace(!isPlayingTrace)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
                  title={isPlayingTrace ? 'Pause animation' : 'Play animation'}
                >
                  {isPlayingTrace ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden sm:inline">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      <span className="hidden sm:inline">Auto Trace</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Visual Node Diagram with Animated Connectors & Depth */}
            <div className="relative z-10 p-6 rounded-2xl bg-slate-950/90 border border-slate-800/80 shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Node 1: Writer Function */}
                <div
                  onClick={() => {
                    setSimulatedStep(0);
                    setIsPlayingTrace(false);
                  }}
                  className={`p-4 rounded-2xl bg-slate-900 border transition-all duration-200 cursor-pointer shadow-lg ${
                    simulatedStep === 0
                      ? 'border-blue-400 shadow-blue-500/20 ring-2 ring-blue-500/30 -translate-y-1'
                      : 'border-slate-800 hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                      STEP 01 · WRITER
                    </span>
                    {simulatedStep === 0 && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </div>
                  <div className="font-mono font-bold text-white text-sm truncate">
                    {activePath.writerFunction}()
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5">
                    <span>Line {activePath.writer?.source_line || 'N/A'}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-blue-300 font-sans">State Mutator</span>
                  </div>
                </div>

                {/* Node 2: Persistent State Variable / Slot */}
                <div
                  onClick={() => {
                    setSimulatedStep(1);
                    setIsPlayingTrace(false);
                  }}
                  className={`p-4 rounded-2xl bg-slate-900 border transition-all duration-200 cursor-pointer shadow-lg ${
                    simulatedStep === 1
                      ? 'border-rose-400 shadow-rose-500/20 ring-2 ring-rose-500/30 -translate-y-1'
                      : 'border-slate-800 hover:border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                      STEP 02 · STORAGE
                    </span>
                    {simulatedStep === 1 && (
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    )}
                  </div>
                  <div className="font-mono font-bold text-rose-300 text-sm truncate">
                    {activePath.vulnerabilityVariable}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5 font-mono">
                    <span className="text-white font-semibold">Slot {activePath.storage.slot}</span>
                    <span className="text-slate-600">·</span>
                    <span>{activePath.storage.offset}B offset</span>
                  </div>
                </div>

                {/* Node 3: Reader Function */}
                <div
                  onClick={() => {
                    setSimulatedStep(2);
                    setIsPlayingTrace(false);
                  }}
                  className={`p-4 rounded-2xl bg-slate-900 border transition-all duration-200 cursor-pointer shadow-lg ${
                    simulatedStep === 2
                      ? 'border-indigo-400 shadow-indigo-500/20 ring-2 ring-indigo-500/30 -translate-y-1'
                      : 'border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      STEP 03 · READER
                    </span>
                    {simulatedStep === 2 && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    )}
                  </div>
                  <div className="font-mono font-bold text-white text-sm truncate">
                    {activePath.readerFunction}()
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5">
                    <span>Line {activePath.reader?.source_line || 'N/A'}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-indigo-300 font-sans">Condition Evaluator</span>
                  </div>
                </div>

                {/* Node 4: Sensitive Operation Sink */}
                <div
                  onClick={() => {
                    setSimulatedStep(3);
                    setIsPlayingTrace(false);
                  }}
                  className={`p-4 rounded-2xl bg-slate-900 border transition-all duration-200 cursor-pointer shadow-lg ${
                    simulatedStep === 3
                      ? 'border-purple-400 shadow-purple-500/20 ring-2 ring-purple-500/30 -translate-y-1'
                      : 'border-slate-800 hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                      STEP 04 · SENSITIVE SINK
                    </span>
                    {simulatedStep === 3 && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                    )}
                  </div>
                  <div className="font-mono font-bold text-purple-300 text-sm truncate">
                    {activePath.sensitiveOperation.type}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5">
                    <span>Line {activePath.sink?.source_line || 'N/A'}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-rose-400 font-sans font-semibold">Exploit Impact</span>
                  </div>
                </div>
              </div>

              {/* Animated Connection Pulse Flow Indicator */}
              <div className="hidden md:flex items-center justify-between px-10 py-3 relative">
                <svg className="w-full h-4 overflow-visible">
                  <defs>
                    <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="35%" stopColor="#f43f5e" />
                      <stop offset="70%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                  {/* Background Track */}
                  <line
                    x1="0%"
                    y1="8"
                    x2="100%"
                    y2="8"
                    stroke="#1e293b"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  {/* Animated Flowing Line */}
                  <line
                    x1="0%"
                    y1="8"
                    x2="100%"
                    y2="8"
                    stroke="url(#flowGrad)"
                    strokeWidth="2.5"
                    strokeDasharray="6 6"
                    className="animate-flow-pulse"
                  />
                </svg>
              </div>

              {/* Step Context Dynamic Callout */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                  <div className="text-slate-300">
                    {simulatedStep === 0 && (
                      <span>
                        <strong className="text-blue-300 font-mono">Step 1:</strong> External caller triggers{' '}
                        <code className="text-white font-mono">{activePath.writerFunction}()</code>, which performs persistent state modification.
                      </span>
                    )}
                    {simulatedStep === 1 && (
                      <span>
                        <strong className="text-rose-300 font-mono">Step 2:</strong> State variable{' '}
                        <code className="text-rose-300 font-mono">{activePath.vulnerabilityVariable}</code> at EVM storage slot{' '}
                        <code className="text-white font-mono">{activePath.storage.slot}</code> is overwritten within the proxy context.
                      </span>
                    )}
                    {simulatedStep === 2 && (
                      <span>
                        <strong className="text-indigo-300 font-mono">Step 3:</strong> Function{' '}
                        <code className="text-white font-mono">{activePath.readerFunction}()</code> executes subsequently and reads the overwritten slot.
                      </span>
                    )}
                    {simulatedStep === 3 && (
                      <span>
                        <strong className="text-purple-300 font-mono">Step 4:</strong> Corrupted storage value directly satisfies constraints for{' '}
                        <code className="text-purple-300 font-mono">{activePath.sensitiveOperation.type}</code>, creating exploit risk.
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0 hidden sm:block">
                  Phase {simulatedStep + 1} of 4
                </div>
              </div>
            </div>
          </div>

          {/* Section: SOURCE EVIDENCE */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Code className="w-4 h-4 text-cyan-400" />
              <span>Source Evidence Snippets</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Writer Source Box */}
              <div className="bg-slate-950/90 border border-blue-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800/80">
                  <span className="font-bold text-blue-400">Writer: {activePath.writerFunction}()</span>
                  <span className="text-slate-500 font-mono">Line {activePath.writer?.source_line || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  {getSourceLines(activePath.writer?.source_line)?.map((s) => (
                    <div
                      key={s.line}
                      className={`flex items-start space-x-3 ${
                        s.isTarget ? 'bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded-lg border-l-2 border-blue-400' : 'text-slate-500'
                      }`}
                    >
                      <span className="w-6 text-right opacity-40 select-none font-mono">{s.line}</span>
                      <span className="truncate">{s.code}</span>
                    </div>
                  )) || <div className="text-slate-500">Source snippet not available</div>}
                </div>
              </div>

              {/* Reader / Sink Source Box */}
              <div className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-slate-800/80">
                  <span className="font-bold text-purple-400">Reader: {activePath.readerFunction}()</span>
                  <span className="text-slate-500 font-mono">Line {activePath.reader?.source_line || activePath.sink?.source_line || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  {getSourceLines(activePath.reader?.source_line || activePath.sink?.source_line)?.map((s) => (
                    <div
                      key={s.line}
                      className={`flex items-start space-x-3 ${
                        s.isTarget ? 'bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-lg border-l-2 border-purple-400' : 'text-slate-500'
                      }`}
                    >
                      <span className="w-6 text-right opacity-40 select-none font-mono">{s.line}</span>
                      <span className="truncate">{s.code}</span>
                    </div>
                  )) || <div className="text-slate-500">Source snippet not available</div>}
                </div>
              </div>
            </div>
          </div>

          {/* Section: TECHNICAL EVIDENCE (ACCORDIONS) */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>Technical Subsystem Evidence</span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Progressive disclosure for security researchers
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Accordion 1: Delegatecall Evidence */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/80">
                <button
                  onClick={() => toggleSection('delegatecall')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer transition"
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
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Caller Contract</span>
                        <span className="font-bold text-white">{activePath.callerContract || 'Proxy'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Target Impl</span>
                        <span className="font-bold text-amber-400">{activePath.calleeContract || 'Implementation'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Target Resolution</span>
                        <span className="font-bold text-cyan-300">{activePath.delegatecall?.target_resolution || 'STATE_VARIABLE'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
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
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                      >
                        View all detected delegatecalls ({summary.delegatecallCount}) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Data Flow Evidence */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/80">
                <button
                  onClick={() => toggleSection('dataflow')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer transition"
                >
                  <span className="flex items-center space-x-2">
                    <GitCompare className="w-4 h-4 text-cyan-400" />
                    <span>Data Flow Evidence</span>
                  </span>
                  {openSections.dataflow ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.dataflow && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono space-y-1.5">
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
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                      >
                        View complete data-flow matrix →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Storage Evidence */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/80">
                <button
                  onClick={() => toggleSection('storage')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer transition"
                >
                  <span className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Storage Collision Evidence</span>
                  </span>
                  {openSections.storage ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.storage && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">State Variable</span>
                        <span className="font-bold text-white">{activePath.vulnerabilityVariable}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Storage Slot</span>
                        <span className="font-bold text-emerald-400">Slot {activePath.storage.slot}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Byte Offset</span>
                        <span className="font-bold text-slate-200">{activePath.storage.offset} Bytes</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
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
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                      >
                        View complete storage layout ({ir.storageLayout.length} variables) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 4: Control Flow Evidence */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/80">
                <button
                  onClick={() => toggleSection('controlflow')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer transition"
                >
                  <span className="flex items-center space-x-2">
                    <Network className="w-4 h-4 text-purple-400" />
                    <span>Control Flow Evidence</span>
                  </span>
                  {openSections.controlflow ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.controlflow && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs space-y-1">
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
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                      >
                        View complete call graph & CFG ({ir.calls.length} edges) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 5: Contract Structure Evidence */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/80">
                <button
                  onClick={() => toggleSection('contractstructure')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer transition"
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
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Contracts</span>
                        <span className="font-bold text-white">{summary.contractsCount}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">Functions</span>
                        <span className="font-bold text-white">{summary.functionsCount}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block">State Variables</span>
                        <span className="font-bold text-white">{summary.stateVariablesCount}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
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
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                      >
                        View detailed contract structure →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 6: Security-Sensitive Operations */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/80">
                <button
                  onClick={() => toggleSection('sensitiveops')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer transition"
                >
                  <span className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-purple-400" />
                    <span>Security-Sensitive Operations</span>
                  </span>
                  {openSections.sensitiveops ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {openSections.sensitiveops && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono space-y-1">
                      <div><strong className="text-purple-300">Operation Type:</strong> {activePath.sensitiveOperation.type}</div>
                      <div><strong className="text-slate-400">Enclosing Function:</strong> {activePath.sensitiveOperation.function}()</div>
                      <div><strong className="text-slate-400">Line:</strong> {activePath.sink?.source_line || 'N/A'}</div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Detected high-risk sinks (selfdestruct, Ether transfers, authorization condition disorder).
                      </span>
                      <button
                        onClick={() => setActiveModal('sensitive')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold cursor-pointer"
                      >
                        View all detected sensitive operations ({summary.sensitiveOperationsCount}) →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 7: Raw Analysis JSON */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/80">
                <button
                  onClick={() => toggleSection('rawanalysis')}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-900/60 cursor-pointer transition"
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
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 flex items-center space-x-1.5 cursor-pointer"
                      >
                        {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedRaw ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-60 scrollbar-thin">
                      {JSON.stringify(activePath, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal Dialogs For Full Subsystems */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-4xl w-full space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white capitalize">
                {activeModal === 'delegatecalls' && 'Detected Delegatecall Invocations'}
                {activeModal === 'dataflow' && 'Complete Read/Write Data Flow Matrix'}
                {activeModal === 'storage' && 'Complete EVM Storage Layout Model'}
                {activeModal === 'controlflow' && 'Control Flow Graph & Call Relationships'}
                {activeModal === 'contractstructure' && 'Deconstructed Contract Structure (AST)'}
                {activeModal === 'sensitive' && 'All Detected Security-Sensitive Operations'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto pr-1 space-y-3 text-xs">
              {activeModal === 'delegatecalls' && (
                <div className="space-y-2.5 font-mono">
                  {ir.delegatecalls.map((dc, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
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
                <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Contract</th>
                        <th className="py-2.5 px-3">Function</th>
                        <th className="py-2.5 px-3">State Writes</th>
                        <th className="py-2.5 px-3">State Reads</th>
                        <th className="py-2.5 px-3">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                      {ir.functions.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400">{f.contract}</td>
                          <td className="py-2.5 px-3 text-white font-semibold">{f.name}()</td>
                          <td className="py-2.5 px-3 text-rose-300">{f.writes.length > 0 ? f.writes.join(', ') : '—'}</td>
                          <td className="py-2.5 px-3 text-blue-300">{f.reads.length > 0 ? f.reads.join(', ') : '—'}</td>
                          <td className="py-2.5 px-3 text-slate-500 uppercase">{f.visibility}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === 'storage' && (
                <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Slot</th>
                        <th className="py-2.5 px-3">Contract</th>
                        <th className="py-2.5 px-3">Variable</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Offset</th>
                        <th className="py-2.5 px-3">Bytes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                      {ir.storageLayout.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{s.slot}</td>
                          <td className="py-2.5 px-3 text-slate-400">{s.contract}</td>
                          <td className="py-2.5 px-3 text-white font-semibold">{s.name}</td>
                          <td className="py-2.5 px-3 text-cyan-300">{s.type}</td>
                          <td className="py-2.5 px-3 text-slate-400">{s.offset}B</td>
                          <td className="py-2.5 px-3 text-slate-500">{s.bytes}B</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeModal === 'controlflow' && (
                <div className="space-y-3 font-mono">
                  <div className="font-bold text-white text-xs">Call Graph Edges:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ir.calls.map((c, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                        <span className="text-white font-semibold">{c.from} → {c.to}</span>
                        <span className="text-slate-500 uppercase text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{c.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModal === 'contractstructure' && (
                <div className="space-y-3 font-mono">
                  {ir.contracts.map((c, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                      <div className="flex justify-between font-bold text-white text-sm">
                        <span>{c.name} ({c.kind})</span>
                        <span className="text-slate-500 text-xs font-normal">{c.functions.length} functions</span>
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

              {activeModal === 'sensitive' && (
                <div className="space-y-2.5 font-mono">
                  {ir.sensitiveOperations.map((op, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-purple-300 font-bold block">{op.type}</span>
                        <span className="text-slate-400 text-[11px]">{op.contract}.{op.function}()</span>
                      </div>
                      <span className="text-slate-500">Line {op.sourceLocation.line}</span>
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
