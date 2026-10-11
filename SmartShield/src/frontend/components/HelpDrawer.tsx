/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, X, Shield, BookOpen, Layers, Terminal, AlertTriangle, GitBranch, ArrowRight, Code } from 'lucide-react';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpDrawer: React.FC<HelpDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'methodology' | 'patterns' | 'boundary' | 'api'>('methodology');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800/80 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-cyan-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Documentation & Methodology</h3>
              <p className="text-[11px] text-slate-400">SmartShield delegatecall static analysis framework</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 border-b border-slate-800/80 flex space-x-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('methodology')}
            className={`pb-3 font-semibold transition cursor-pointer relative ${
              activeTab === 'methodology'
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Methodology</span>
            {activeTab === 'methodology' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`pb-3 font-semibold transition cursor-pointer relative ${
              activeTab === 'patterns'
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Detection Logic</span>
            {activeTab === 'patterns' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('boundary')}
            className={`pb-3 font-semibold transition cursor-pointer relative ${
              activeTab === 'boundary'
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Validation Boundary</span>
            {activeTab === 'boundary' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-3 font-semibold transition cursor-pointer relative ${
              activeTab === 'api'
                ? 'text-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>API & CLI</span>
            {activeTab === 'api' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs text-slate-300 leading-relaxed font-normal">
          {activeTab === 'methodology' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">How SmartShield Works</h4>
                <p className="text-slate-400">
                  DelegateTracker-inspired read/write data-flow capture algorithm.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
                <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">The Core Question</span>
                <p className="text-slate-300">
                  Instead of naively checking whether <code className="text-amber-300 font-mono">delegatecall</code> exists in a contract, SmartShield evaluates whether a delegatecall participates in an exploitable relationship involving:
                </p>
                <div className="p-3 bg-slate-900/90 rounded-xl text-slate-200 font-mono text-[11px] space-y-1.5 border border-slate-800/80">
                  <div>1. Externally accessible function mutates persistent state variable (WRITE)</div>
                  <div>2. Subsequent execution function evaluates that variable (READ)</div>
                  <div>3. The evaluated variable directly influences a security-sensitive sink</div>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <span className="font-bold text-white text-xs uppercase tracking-wider block">7-Stage Static Analysis Pipeline:</span>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-400">
                  <li><strong className="text-slate-200">Parse Solidity:</strong> AST extraction using standardized Solidity parsers.</li>
                  <li><strong className="text-slate-200">Build Contract IR:</strong> Normalize functions, visibility, modifiers, and state variables.</li>
                  <li><strong className="text-slate-200">Storage Layout Modeling:</strong> Calculate contiguous 32-byte EVM storage slot and byte offset packing.</li>
                  <li><strong className="text-slate-200">Semantic Read/Write Capture:</strong> Trace persistent storage mutations and evaluations.</li>
                  <li><strong className="text-slate-200">Delegatecall Detection:</strong> Identify target expressions and access control restrictions.</li>
                  <li><strong className="text-slate-200">Sensitive Operation Detection:</strong> Map high-risk sinks (`selfdestruct`, Ether transfers, conditions).</li>
                  <li><strong className="text-slate-200">Attack Path Search:</strong> Synthesize candidate attack paths conforming to the standardized schema.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">The Three Anomaly Detection Patterns</h4>
                <p className="text-slate-400">
                  Formalized rule modules based on research paper classifications.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                  <span className="font-bold text-rose-400 font-mono text-xs">1. Self-Destruct Anomaly</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Occurs when Function A writes state variable $X$, Function B reads $X$, and Function B reaches a <code className="text-rose-300 font-mono">selfdestruct(recipient)</code> call.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                  <span className="font-bold text-emerald-400 font-mono text-xs">2. Currency-Sending Anomaly</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Occurs when Function A writes state variable $X$, Function B reads $X$, and Function B executes an Ether transfer (<code className="text-emerald-300 font-mono">transfer</code>, <code className="text-emerald-300 font-mono">send</code>, or <code className="text-emerald-300 font-mono">call{"{value}"}</code>).
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                  <span className="font-bold text-purple-400 font-mono text-xs">3. Judgment-Condition Disorder</span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Occurs when Function A writes state variable $X$, Function B reads $X$, and Function B evaluates $X$ inside a security-sensitive gatekeeper condition (<code className="text-purple-300 font-mono">require(msg.sender == owner)</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'boundary' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Static Analysis vs. Runtime Validation</h4>
                <p className="text-slate-400">
                  Explicit Stage 1 vs. Stage 2 handoff boundary.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 space-y-1.5">
                <span className="font-bold text-amber-300">Stage 1 Scope (This System)</span>
                <p className="text-[11px] leading-relaxed">
                  SmartShield strictly generates <strong>candidate attack paths</strong> with <code className="font-mono text-white">status: "CANDIDATE"</code>. It does not claim confirmed exploits or execute transactions on live blockchains.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 text-[11px]">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                  <strong className="text-cyan-400 block uppercase font-mono">Stage 1: SmartShield</strong>
                  <ul className="space-y-1 text-slate-400 font-mono text-[10px]">
                    <li>✓ AST & Program Structure</li>
                    <li>✓ Persistent Read/Write Flow</li>
                    <li>✓ Storage Slot Packing</li>
                    <li>✓ Candidate Attack Paths</li>
                    <li>✓ Machine-Readable Package</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5">
                  <strong className="text-indigo-400 block uppercase font-mono">Stage 2: Validation</strong>
                  <ul className="space-y-1 text-slate-400 font-mono text-[10px]">
                    <li>→ Symbolic Execution (Z3)</li>
                    <li>→ Constraint Solving</li>
                    <li>→ Runtime Read/Write Capture</li>
                    <li>→ Exploit Path Feasibility</li>
                    <li>→ Confirmation / Rejection</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Developer API & CLI Reference</h4>
                <p className="text-slate-400">
                  Headless programmatic access and downstream ingestion endpoints.
                </p>
              </div>

              <div className="space-y-2.5 font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-emerald-400 font-bold">POST</span> /api/analyze
                  <span className="text-slate-500 block text-[10px] mt-0.5">Execute static analysis on source payload</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-blue-400 font-bold">GET</span> /api/analysis/:id/package
                  <span className="text-slate-500 block text-[10px] mt-0.5">Download full multi-file JSON handoff archive</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                  <span className="text-blue-400 font-bold">GET</span> /api/attack-paths
                  <span className="text-slate-500 block text-[10px] mt-0.5">Retrieve array of CandidateAttackPath objects</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                <span className="text-slate-400 font-bold">Terminal CLI:</span>
                <code className="text-cyan-300 block bg-slate-900 p-2.5 rounded-lg border border-slate-800">npm run cli examples/vulnerable_owner.sol</code>
                <span className="text-[10px] text-slate-500 block">Outputs candidate paths directly and saves to /results/</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
