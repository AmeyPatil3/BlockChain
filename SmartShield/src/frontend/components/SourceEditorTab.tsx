/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileCode,
  Upload,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { DEMO_CONTRACTS, DemoContract } from '../../analyzer/examples/demoContracts.ts';

interface SourceFile {
  filename: string;
  content: string;
}

interface SourceEditorTabProps {
  files: SourceFile[];
  setFiles: React.Dispatch<React.SetStateAction<SourceFile[]>>;
  activeFileIndex: number;
  setActiveFileIndex: (idx: number) => void;
  compilerVersion: string;
  setCompilerVersion: (ver: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  progressStep: string | null;
  onSelectDemo: (demo: DemoContract) => void;
}

const COMPILER_VERSIONS = ['0.8.20', '0.8.19', '0.8.0', '0.7.6', '0.6.12'];

export const SourceEditorTab: React.FC<SourceEditorTabProps> = ({
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
  const activeFile = files[activeFileIndex] || files[0];

  const handleContentChange = (val: string) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === activeFileIndex ? { ...f, content: val } : f))
    );
  };

  const handleAddFile = () => {
    const newName = `Contract${files.length + 1}.sol`;
    setFiles((prev) => [
      ...prev,
      {
        filename: newName,
        content: `// SPDX-License-Identifier: MIT\npragma solidity ^${compilerVersion};\n\ncontract ${newName.replace('.sol', '')} {\n    // Enter Solidity source code\n}\n`,
      },
    ]);
    setActiveFileIndex(files.length);
  };

  const handleRemoveFile = (idx: number) => {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setActiveFileIndex(Math.max(0, idx - 1));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    Array.from(uploaded).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setFiles((prev) => {
          const exists = prev.find((f) => f.filename === file.name);
          if (exists) {
            return prev.map((f) => (f.filename === file.name ? { ...f, content: text } : f));
          }
          return [...prev, { filename: file.name, content: text }];
        });
      };
      reader.readAsText(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            <span>Solidity Source Analyzer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Provide single contracts or paired Caller + Callee sources (e.g. Proxy.sol and Implementation.sol).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Compiler Version */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400">Solidity Version:</span>
            <select
              value={compilerVersion}
              onChange={(e) => setCompilerVersion(e.target.value)}
              className="bg-transparent text-cyan-400 font-mono font-medium focus:outline-none cursor-pointer"
            >
              {COMPILER_VERSIONS.map((ver) => (
                <option key={ver} value={ver} className="bg-slate-900 text-slate-200">
                  {ver}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept=".sol,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload .sol</span>
          </button>

          {/* Quick Demo Dropdown */}
          <select
            onChange={(e) => {
              const demo = DEMO_CONTRACTS.find((d) => d.id === e.target.value);
              if (demo) onSelectDemo(demo);
            }}
            defaultValue=""
            className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium focus:outline-none cursor-pointer"
          >
            <option value="" disabled>
              Load Example Preset...
            </option>
            {DEMO_CONTRACTS.map((demo) => (
              <option key={demo.id} value={demo.id} className="bg-slate-900">
                {demo.name}
              </option>
            ))}
          </select>

          {/* ANALYZE BUTTON */}
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition-all shadow-md cursor-pointer ${
              isAnalyzing
                ? 'bg-blue-600/50 text-blue-200 cursor-wait'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Analyze Contract</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Notification when analyzing */}
      {isAnalyzing && (
        <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 animate-pulse flex items-center space-x-3 text-xs text-blue-300">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-white">Pipeline Execution in Progress:</span>{' '}
            {progressStep || 'Running AST and Data Flow Analysis...'}
          </div>
        </div>
      )}

      {/* Multi-File Tab Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-t-xl px-4 pt-3 flex items-center justify-between">
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
          {files.map((file, idx) => (
            <div
              key={idx}
              onClick={() => setActiveFileIndex(idx)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-t-lg text-xs font-mono transition cursor-pointer border-t border-x ${
                activeFileIndex === idx
                  ? 'bg-slate-950 text-cyan-400 border-slate-700 font-semibold'
                  : 'bg-slate-900/60 text-slate-400 border-transparent hover:text-slate-300 hover:bg-slate-800/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{file.filename}</span>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(idx);
                  }}
                  className="hover:text-rose-400 p-0.5 rounded transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={handleAddFile}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition ml-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add File</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
          {activeFile.content.split('\n').length} lines • {activeFile.content.length} chars
        </div>
      </div>

      {/* Source Code Editor Area */}
      <div className="relative border-x border-b border-slate-800 rounded-b-xl overflow-hidden bg-slate-950">
        <div className="flex">
          {/* Line Numbers */}
          <div className="py-4 px-3 select-none text-right font-mono text-xs text-slate-600 bg-slate-950/80 border-r border-slate-900 shrink-0">
            {activeFile.content.split('\n').map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={activeFile.content}
            onChange={(e) => handleContentChange(e.target.value)}
            spellCheck={false}
            className="w-full h-[520px] p-4 font-mono text-xs text-slate-200 bg-transparent resize-none leading-6 focus:outline-none selection:bg-blue-500/30 font-medium"
            placeholder="// Paste Solidity contract here..."
          />
        </div>
      </div>
    </div>
  );
};
