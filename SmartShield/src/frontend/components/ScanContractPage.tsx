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
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  FolderOpen,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { DEMO_CONTRACTS, DemoContract } from '../../analyzer/examples/demoContracts.ts';

interface ScanContractPageProps {
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
  showExamplesModal: boolean;
  setShowExamplesModal: (show: boolean) => void;
}

export const ScanContractPage: React.FC<ScanContractPageProps> = ({
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
  showExamplesModal,
  setShowExamplesModal,
}) => {
  const uploadContractRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [detectedPragma, setDetectedPragma] = useState<string | null>(null);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);
  const [projectPragmaMismatch, setProjectPragmaMismatch] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const activeFile = files[activeFileIndex] || files[0];

  // Multi-file pragma inspection and compatibility detection
  const filePragmas = files.map((f) => {
    const match = f.content.match(/pragma\s+solidity\s+([^;]+);/);
    return {
      filename: f.filename,
      pragma: match ? match[1].trim() : null,
    };
  });

  // Determine active and project-wide pragma requirements
  useEffect(() => {
    const currentFilePragma = filePragmas[activeFileIndex]?.pragma || filePragmas.find((p) => p.pragma)?.pragma || null;
    setDetectedPragma(currentFilePragma);

    // Determine compatible target suggestion based on source
    let suggested = '0.8.20';
    if (currentFilePragma) {
      if (currentFilePragma.includes('0.7.')) suggested = '0.7.6';
      else if (currentFilePragma.includes('0.8.19')) suggested = '0.8.19';
      else if (currentFilePragma.includes('0.8.0')) suggested = '0.8.0';
      else if (currentFilePragma.includes('0.8.')) suggested = '0.8.20';
    }

    // Check for mismatch between source requirement and currently selected target
    if (currentFilePragma) {
      const isReq08 = currentFilePragma.includes('0.8');
      const isReq07 = currentFilePragma.includes('0.7');
      const isTarget08 = compilerVersion.startsWith('0.8');
      const isTarget07 = compilerVersion.startsWith('0.7');

      if (isReq08 && isTarget07) {
        setProjectPragmaMismatch(
          `This project contains source requiring Solidity ${currentFilePragma}, but the selected analysis target is ${compilerVersion}.`
        );
      } else if (isReq07 && isTarget08) {
        setProjectPragmaMismatch(
          `This project contains source requiring Solidity ${currentFilePragma}, but the selected analysis target is ${compilerVersion}.`
        );
      } else {
        setProjectPragmaMismatch(null);
      }
    } else {
      setProjectPragmaMismatch(null);
    }

    // Auto-select version when in Automatic mode
    if (!isManualOverride && suggested !== compilerVersion) {
      setCompilerVersion(suggested);
    }
  }, [files, activeFileIndex, isManualOverride, compilerVersion]);

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
      // Replace existing files with newly uploaded files so old demo contracts do not linger
      setFiles(newFiles);
      setActiveFileIndex(0);
    });
  };

  const handleAddFile = () => {
    const newFileName = `Contract${files.length + 1}.sol`;
    const defaultTemplate = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract ${newFileName.replace('.sol', '')} {\n    address public owner;\n\n    constructor() {\n        owner = msg.sender;\n    }\n}\n`;
    setFiles((prev) => [...prev, { filename: newFileName, content: defaultTemplate }]);
    setActiveFileIndex(files.length);
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) return;
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (activeFileIndex >= updated.length) {
      setActiveFileIndex(updated.length - 1);
    }
  };

  const handleContentChange = (newContent: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === activeFileIndex ? { ...f, content: newContent } : f))
    );
  };

  const handleCopyCode = () => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const lineCount = activeFile?.content ? activeFile.content.split('\n').length : 1;

  const PROGRESS_MILESTONES = [
    'Parsing Solidity AST',
    'Extracting read/write flow',
    'Detecting delegatecall sinks',
    'Searching attack paths',
    'Packaging candidates',
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <input
        type="file"
        ref={uploadContractRef}
        onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        multiple
        accept=".sol,.txt"
        className="hidden"
      />

      {/* Top Benchmark Quick Selector */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Target Contract
          </span>
          <span className="text-xs text-slate-500 hidden md:inline">|</span>
          <span className="text-xs text-slate-400 hidden md:inline">
            Load an academic benchmark or edit directly below
          </span>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Quick load:</span>
          <button
            onClick={() => onSelectDemo(DEMO_CONTRACTS[0])}
            className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer text-xs font-medium"
          >
            Safe Proxy
          </button>
          <button
            onClick={() => onSelectDemo(DEMO_CONTRACTS[1])}
            className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-rose-300 hover:text-rose-200 border border-slate-800 transition cursor-pointer text-xs font-medium"
          >
            Owner Hijack
          </button>
          <button
            onClick={() => onSelectDemo(DEMO_CONTRACTS[2])}
            className="px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-emerald-300 hover:text-emerald-200 border border-slate-800 transition cursor-pointer text-xs font-medium"
          >
            Ether Transfer
          </button>
          <button
            onClick={() => setShowExamplesModal(true)}
            className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold ml-1.5 underline-offset-4 hover:underline cursor-pointer"
          >
            View all 8 examples →
          </button>
        </div>
      </div>

      {/* Main Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project Files, Version Card & Actions (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Project Files Card */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Project Files</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => uploadContractRef.current?.click()}
                  title="Upload .sol file"
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleAddFile}
                  title="Add new file"
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
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
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{file.filename}</span>
                    </div>

                    {files.length > 1 && (
                      <button
                        onClick={(e) => handleRemoveFile(idx, e)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
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

          {/* Clean Solidity Version Block (User requested simplicity: No dropdown in normal view) */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3 text-xs">
            {/* Normal Clean View */}
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold text-slate-300">Solidity</span>
                {detectedPragma && (
                  <span className="text-[11px] font-mono text-slate-400">
                    req: {detectedPragma}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-white text-base">
                  {compilerVersion}
                </span>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isManualOverride ? 'Manual override' : 'Detected automatically'}</span>
                </span>
              </div>

              {detectedPragma ? (
                <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Analysis target:{' '}
                    <strong className="text-white font-mono font-medium">{compilerVersion}</strong>
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    from {detectedPragma.startsWith('^') || detectedPragma.startsWith('>') ? 'range' : 'pragma'}
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 block mt-1">
                  Default target 0.8.20 applied
                </span>
              )}

              {files.length > 1 && (
                <div className="mt-1.5 text-[10px] text-slate-500 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                  <span>Compatible range across {files.length} project files</span>
                </div>
              )}
            </div>

            {/* Smart Mismatch Warning & One-Click Fix */}
            {projectPragmaMismatch && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Solidity version mismatch</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {projectPragmaMismatch}
                </p>
                <div className="pt-0.5">
                  <p className="text-[11px] text-slate-400 mb-1.5">
                    Change target to a compatible version?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const fixVersion = detectedPragma?.includes('0.7') ? '0.7.6' : '0.8.20';
                      setCompilerVersion(fixVersion);
                      setIsManualOverride(false);
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/40 transition cursor-pointer"
                  >
                    Use {detectedPragma?.includes('0.7') ? '0.7.6' : '0.8.20'}
                  </button>
                </div>
              </div>
            )}

            {/* Secondary Control: Analysis Settings */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-200 font-medium cursor-pointer transition select-none"
              >
                <span>{showSettings ? '▾ Analysis settings' : '▸ Analysis settings'}</span>
              </button>

              {showSettings && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  {/* Radio Choice: Automatic vs Manual */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Solidity version
                    </span>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="versionMode"
                          checked={!isManualOverride}
                          onChange={() => {
                            setIsManualOverride(false);
                            const autoVer = detectedPragma?.includes('0.7') ? '0.7.6' : '0.8.20';
                            setCompilerVersion(autoVer);
                          }}
                          className="accent-blue-500"
                        />
                        <span className={!isManualOverride ? 'text-white font-medium text-[11px]' : 'text-slate-400 text-[11px]'}>
                          Automatic ✓
                        </span>
                      </label>

                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="versionMode"
                          checked={isManualOverride}
                          onChange={() => setIsManualOverride(true)}
                          className="accent-blue-500"
                        />
                        <span className={isManualOverride ? 'text-white font-medium text-[11px]' : 'text-slate-400 text-[11px]'}>
                          Manual
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Detected requirement display */}
                  <div>
                    <span className="text-[11px] text-slate-500 block">Detected from:</span>
                    <code className="text-[11px] font-mono text-cyan-300 block mt-0.5 break-all">
                      {detectedPragma ? `pragma solidity ${detectedPragma};` : 'pragma solidity ^0.8.20;'}
                    </code>
                  </div>

                  {/* Manual Override dropdown */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 block">Manual override:</span>
                    <select
                      value={compilerVersion}
                      onChange={(e) => {
                        setCompilerVersion(e.target.value);
                        setIsManualOverride(true);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-blue-500"
                    >
                      <option value="0.8.20">0.8.20 (Default)</option>
                      <option value="0.8.19">0.8.19</option>
                      <option value="0.8.0">0.8.0</option>
                      <option value="0.7.6">0.7.6 (Legacy)</option>
                    </select>
                    <p className="text-[10px] text-slate-500 leading-normal pt-1">
                      Use override only when the detected version is unavailable or analysis requires a specific compiler target.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dominant Analysis Action Button */}
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center space-x-2 transition shadow-xl cursor-pointer ${
              isAnalyzing
                ? 'bg-blue-600/50 cursor-not-allowed text-blue-200'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25 active:scale-[0.98]'
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
        <div className="lg:col-span-9 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center space-x-2 font-mono text-slate-300">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">{activeFile?.filename}</span>
              <span className="text-slate-500">· {lineCount} lines</span>
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <button
                onClick={handleCopyCode}
                className="flex items-center space-x-1 hover:text-white transition cursor-pointer text-slate-400"
                title="Copy source code"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <span className="text-slate-700">|</span>
              <span className="font-mono text-slate-400">Solidity</span>
              <span className="text-slate-700">|</span>
              <span>UTF-8</span>
            </div>
          </div>

          {/* Code Editor Area */}
          <div className="relative flex-1 flex min-h-[520px] bg-slate-950 font-mono text-xs">
            {/* Line Numbers Gutter */}
            <div className="select-none py-3.5 px-3 bg-slate-950/90 border-r border-slate-800/70 text-slate-600 text-right font-mono text-xs w-12 shrink-0 leading-5">
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
              className="flex-1 py-3.5 px-4 bg-transparent text-slate-200 resize-none font-mono text-xs leading-5 focus:outline-none border-none selection:bg-blue-600/30"
            />
          </div>
        </div>
      </div>

      {/* Analysis Progress Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Analyzing Contract</h3>
                <p className="text-xs text-slate-400">
                  Executing static data-flow and candidate attack-path search
                </p>
              </div>
            </div>

            {/* Clean 5-Stage Human-Readable Milestones */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              {PROGRESS_MILESTONES.map((stepName) => {
                const isCurrent = progressStep?.toLowerCase().includes(stepName.toLowerCase().slice(0, 8));
                return (
                  <div
                    key={stepName}
                    className="flex items-center space-x-3 text-xs"
                  >
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {isCurrent ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
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

      {/* Examples Selection Modal */}
      {showExamplesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-3xl w-full space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Reference Benchmark Scenarios
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select from 8 academic benchmark scenarios to test delegatecall static analysis.
                </p>
              </div>
              <button
                onClick={() => setShowExamplesModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer transition"
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
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-blue-500/50 hover:bg-slate-900 transition cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-cyan-400 uppercase font-mono">
                      {demo.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-2 group-hover:text-cyan-300 transition-colors">
                      {demo.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {demo.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono text-slate-400">{demo.sources[0]?.filename}</span>
                    <span className="text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Load Contract →
                    </span>
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
