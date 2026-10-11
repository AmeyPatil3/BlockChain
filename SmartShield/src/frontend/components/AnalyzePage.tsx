/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  FileCode,
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  Code,
  Layers,
  ChevronRight,
  Sliders,
  X,
  FileCheck,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { DEMO_CONTRACTS, DemoContract } from '../../analyzer/examples/demoContracts.ts';

interface AnalyzePageProps {
  files: { filename: string; content: string }[];
  setFiles: React.Dispatch<React.SetStateAction<{ filename: string; content: string }[]>>;
  activeFileIndex: number;
  setActiveFileIndex: (index: number) => void;
  compilerVersion: string;
  setCompilerVersion: (version: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  progressStep: string | null;
  onSelectDemo: (demo: DemoContract) => void;
}

export const AnalyzePage: React.FC<AnalyzePageProps> = ({
  files,
  setFiles,
  activeFileIndex,
  setActiveFileIndex,
  compilerVersion,
  setCompilerVersion,
  onAnalyze,
  isAnalyzing,
  progressStep,
  onSelectDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadContractRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [showCompilerOverride, setShowCompilerOverride] = useState(false);
  const [detectedPragma, setDetectedPragma] = useState<string | null>(null);

  const activeFile = files[activeFileIndex] || files[0];

  // Auto-detect Solidity compiler version from pragma
  useEffect(() => {
    if (!activeFile?.content) return;
    const match = activeFile.content.match(/pragma\s+solidity\s+([^;]+);/);
    if (match && match[1]) {
      const pragma = match[1].trim();
      setDetectedPragma(pragma);
      if (pragma.includes('0.8.20')) setCompilerVersion('0.8.20');
      else if (pragma.includes('0.8.19')) setCompilerVersion('0.8.19');
      else if (pragma.includes('0.8.0')) setCompilerVersion('0.8.0');
      else if (pragma.includes('0.7.')) setCompilerVersion('0.7.6');
      else if (pragma.includes('0.8.')) setCompilerVersion('0.8.20');
    } else {
      setDetectedPragma(null);
    }
  }, [activeFile?.content]);

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
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFiles = (uploaded: File[]) => {
    const solFiles = uploaded.filter((f) => f.name.endsWith('.sol') || f.name.endsWith('.txt'));
    if (solFiles.length === 0) return;

    const readPromises = solFiles.map(
      (file) =>
        new Promise<{ filename: string; content: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              filename: file.name,
              content: (e.target?.result as string) || '',
            });
          };
          reader.readAsText(file);
        })
    );

    Promise.all(readPromises).then((newFiles) => {
      setFiles(newFiles);
      setActiveFileIndex(0);
    });
  };

  const handleAddFile = () => {
    const filename = prompt('Enter new contract filename (e.g. Logic.sol):', 'NewContract.sol');
    if (!filename) return;
    const finalName = filename.endsWith('.sol') ? filename : `${filename}.sol`;
    const defaultTemplate = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract ${finalName.replace('.sol', '')} {\n    address public owner;\n\n    constructor() {\n        owner = msg.sender;\n    }\n}\n`;
    setFiles([...files, { filename: finalName, content: defaultTemplate }]);
    setActiveFileIndex(files.length);
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert('Project must contain at least one Solidity file.');
      return;
    }
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (activeFileIndex >= updated.length) {
      setActiveFileIndex(updated.length - 1);
    }
  };

  const handleContentChange = (content: string) => {
    const updated = [...files];
    if (updated[activeFileIndex]) {
      updated[activeFileIndex] = { ...updated[activeFileIndex], content };
      setFiles(updated);
    }
  };

  const lineCount = activeFile?.content ? activeFile.content.split('\n').length : 1;

  // Clean 5 milestones for user-facing progress
  const PROGRESS_MILESTONES = [
    'Parsing source',
    'Mapping program structure',
    'Tracing state data flow',
    'Analyzing delegatecall relationships',
    'Searching potential attack paths',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={uploadContractRef}
        onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        accept=".sol"
        multiple
        className="hidden"
      />

      {/* Top Workstation Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Analyze Contract
            </h1>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              Static Analysis
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload or edit Solidity contracts to detect potential delegatecall-related attack paths.
          </p>
        </div>

        {/* Quick Example Selector Chips */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="text-slate-500 text-[11px]">Try example:</span>
          <button
            onClick={() => onSelectDemo(DEMO_CONTRACTS[0])}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer text-[11px]"
          >
            Safe Proxy
          </button>
          <button
            onClick={() => onSelectDemo(DEMO_CONTRACTS[1])}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-rose-300 border border-slate-800 transition cursor-pointer text-[11px]"
          >
            Owner Control
          </button>
          <button
            onClick={() => onSelectDemo(DEMO_CONTRACTS[2])}
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-slate-800 transition cursor-pointer text-[11px]"
          >
            Ether Transfer
          </button>
          <button
            onClick={() => setShowExamplesModal(true)}
            className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium ml-1 underline cursor-pointer"
          >
            View all 8 examples →
          </button>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Files & Actions (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Project Files</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => uploadContractRef.current?.click()}
                  title="Upload .sol file"
                  className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleAddFile}
                  title="Add new file"
                  className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* File List */}
            <div className="space-y-1.5">
              {files.map((file, idx) => {
                const isActive = idx === activeFileIndex;
                return (
                  <div
                    key={file.filename + idx}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-mono transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{file.filename}</span>
                    </div>

                    {files.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveFile(idx, e)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded opacity-60 hover:opacity-100"
                        title="Delete file"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Drag & Drop Quick Dropzone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => uploadContractRef.current?.click()}
              className={`p-3 rounded-xl border border-dashed text-center transition cursor-pointer ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <span className="text-[11px] text-slate-400 block font-medium">
                Drop .sol files or click to add
              </span>
            </div>
          </div>

          {/* Compiler & Target Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Solidity Target:</span>
              <button
                onClick={() => setShowCompilerOverride(!showCompilerOverride)}
                className="text-cyan-400 hover:text-cyan-300 text-[11px] underline cursor-pointer"
              >
                {showCompilerOverride ? 'Close' : 'Change'}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono font-bold text-white text-xs">
                v{compilerVersion}
              </span>
              <span className="text-[11px] text-slate-500">
                {detectedPragma ? `(auto-detected ${detectedPragma})` : '(supported 0.8.x)'}
              </span>
            </div>

            {showCompilerOverride && (
              <div className="pt-2 border-t border-slate-800">
                <label className="text-[11px] text-slate-400 block mb-1">
                  Manual Compiler Override:
                </label>
                <select
                  value={compilerVersion}
                  onChange={(e) => setCompilerVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="0.8.20">0.8.20 (Default)</option>
                  <option value="0.8.19">0.8.19</option>
                  <option value="0.8.0">0.8.0</option>
                  <option value="0.7.6">0.7.6 (Legacy)</option>
                </select>
              </div>
            )}
          </div>

          {/* Dominant Analysis Action Button (§14 Requirement) */}
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center space-x-2 transition shadow-xl cursor-pointer ${
              isAnalyzing
                ? 'bg-blue-600/50 cursor-not-allowed text-blue-200'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/25 active:scale-98'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Analyzing Contract...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>Run Static Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Embedded Source Code Workspace (9 cols) */}
        <div className="lg:col-span-9 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center space-x-2 font-mono text-slate-300">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">{activeFile?.filename}</span>
              <span className="text-slate-500">• {lineCount} lines</span>
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span>Solidity 0.8.x</span>
              <span className="text-slate-600">|</span>
              <span>UTF-8</span>
            </div>
          </div>

          {/* Code Editor Area */}
          <div className="relative flex-1 flex min-h-[500px] bg-slate-950 font-mono text-xs">
            {/* Line Numbers Gutter */}
            <div className="select-none py-3 px-3 bg-slate-950/80 border-r border-slate-800/80 text-slate-600 text-right font-mono text-xs w-12 shrink-0 leading-5">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code Textarea */}
            <textarea
              value={activeFile?.content || ''}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="// Paste or write Solidity smart contract code here..."
              spellCheck={false}
              className="flex-1 py-3 px-4 bg-transparent text-slate-200 resize-none font-mono text-xs leading-5 focus:outline-none border-none selection:bg-blue-600/30"
            />
          </div>
        </div>
      </div>

      {/* Analysis Progress Overlay (§15 Requirement) */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Analyzing Contract</h3>
                <p className="text-xs text-slate-400">
                  Executing static data-flow and candidate attack-path search
                </p>
              </div>
            </div>

            {/* Clean 5-Stage Human-Readable Milestones */}
            <div className="space-y-2.5 pt-2">
              {PROGRESS_MILESTONES.map((stepName, idx) => {
                const isCurrent = progressStep?.toLowerCase().includes(stepName.toLowerCase().slice(0, 8));
                return (
                  <div
                    key={stepName}
                    className="flex items-center space-x-3 text-xs"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      {isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <span className={isCurrent ? 'font-bold text-white' : 'text-slate-400'}>
                      {stepName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Examples Selection Modal (§8.1 Requirement) */}
      {showExamplesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl w-full space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Reference Benchmark Contracts
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select from 8 academic benchmark scenarios to test delegatecall static analysis.
                </p>
              </div>
              <button
                onClick={() => setShowExamplesModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of 8 Demo Contracts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1 py-1">
              {DEMO_CONTRACTS.map((demo) => (
                <div
                  key={demo.id}
                  onClick={() => {
                    onSelectDemo(demo);
                    setShowExamplesModal(false);
                  }}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/90 transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-cyan-400 uppercase font-mono">
                      {demo.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1.5">
                      {demo.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {demo.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono">{demo.sources[0]?.filename}</span>
                    <span className="text-blue-400 font-semibold">Load Contract →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
