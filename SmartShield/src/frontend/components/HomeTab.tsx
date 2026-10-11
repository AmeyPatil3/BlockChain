/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Shield,
  FileCode,
  Share2,
  AlertTriangle,
  ArrowRight,
  GitCompare,
  Database,
  Terminal,
  ExternalLink,
  Cpu,
  Layers,
  Upload,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { DEMO_CONTRACTS, DemoContract } from '../../analyzer/examples/demoContracts.ts';

interface HomeTabProps {
  onSelectDemo: (demo: DemoContract) => void;
  onGoToEditor: () => void;
  onUploadFile?: (file: File) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ onSelectDemo, onGoToEditor, onUploadFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onUploadFile) {
        onUploadFile(e.dataTransfer.files[0]);
      } else {
        onGoToEditor();
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onUploadFile) {
        onUploadFile(e.target.files[0]);
      } else {
        onGoToEditor();
      }
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".sol"
        className="hidden"
      />

      {/* Hero Banner: Section 5 Standard Landing */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-8 sm:p-12 shadow-2xl text-center">
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>DelegateTracker Read-Write Data Flow Engine</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
            SMARTSHIELD
          </h1>

          <p className="text-xl sm:text-2xl font-medium text-slate-300">
            Delegatecall Security Analyzer
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Analyze your Solidity smart contracts for potential delegatecall-related attack paths. Identifies state-variable
            modifications, subsequent reads, and sensitive operation sinks.
          </p>

          {/* Primary Action Area: Upload / Drag & Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-8 max-w-xl mx-auto p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-400 bg-blue-500/10 scale-102'
                : 'border-slate-700 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-900'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white">
              Upload Solidity Contract
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Drag & Drop your <code className="text-cyan-400 font-mono">.sol</code> file here, or click to browse
            </p>

            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-md shadow-blue-500/20">
                [ Upload Contract ]
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToEditor();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700"
              >
                Paste Code
              </button>
            </div>
          </div>
        </div>

        {/* Quick Notice Banner */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 text-left">
          <div className="flex items-start space-x-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Static Candidate Only:</span> Static paths
              are unvalidated attack hypotheses. Symbolic validation is required to test runtime satisfiability.
            </div>
          </div>

          <div className="flex items-start space-x-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <Cpu className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-blue-300">Deterministic Engine:</span> Analyzes AST,
              EVM storage layouts, and read/write dependencies deterministically with zero mock keywords.
            </div>
          </div>
        </div>
      </div>

      {/* Example Contracts Section (Section 5 & 58 Requirement) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              <span>Reference Example Contracts</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select one of the 8 reference contracts to test static analysis and attack-path discovery immediately.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DEMO_CONTRACTS.map((demo) => (
            <div
              key={demo.id}
              onClick={() => onSelectDemo(demo)}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-850 cursor-pointer transition group flex flex-col justify-between"
            >
              <div>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-cyan-400 border border-slate-700 uppercase">
                  {demo.category}
                </span>

                <h3 className="text-sm font-bold text-white mt-2 group-hover:text-blue-400 transition">
                  {demo.name}
                </h3>

                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {demo.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">{demo.sources[0]?.filename}</span>
                <span className="text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  Load →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4-Step Analysis Pipeline Diagram */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <span>Static Analysis Pipeline Architecture</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h3 className="text-sm font-semibold text-white">AST & Storage Layout</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Extracts contract hierarchies, functions, signatures, visibility, modifiers, and EVM 32-byte storage slot offsets.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h3 className="text-sm font-semibold text-white">Read/Write Data Flow</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Scans function bodies to isolate persistent state-variable READs and WRITEs, handling compound increments/deletes.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h3 className="text-sm font-semibold text-white">Sensitive Operations</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Identifies Category A (selfdestruct), Category B (Ether transfer), and Category C (judgment condition disorder).
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm mb-3">
              4
            </div>
            <h3 className="text-sm font-semibold text-white">Candidate Attack Paths</h3>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Synthesizes writer-reader-sink chains correlating delegatecalls and storage slots into standardized machine-readable output.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
