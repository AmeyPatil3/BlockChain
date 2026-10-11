/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, ShieldAlert, Cpu, Network, Layers, GitBranch, Database, FileText } from 'lucide-react';

export const DocsTab: React.FC = () => {
  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase font-mono">
          <span>SmartShield • Static Architecture & Specifications</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Delegatecall Attack-Path Search & Static Analysis
        </h1>

        <p className="text-sm text-slate-300 leading-relaxed">
          This module implements the static attack-path search portion of a DelegateTracker-inspired SmartShield
          architecture. The core research paper:{' '}
          <span className="text-white italic">
            "DelegateTracker: Delegatecall vulnerability detection tool based on read-write data flow capture algorithm"
          </span>
          {' '}divides detection into two stages:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30">
            <span className="text-xs font-bold text-blue-400 uppercase font-mono">Stage 1: Static Analysis Scope (This Engine)</span>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-400">
              <li>• AST Information Extraction (Contracts, Functions, Modifiers)</li>
              <li>• EVM Storage Slot & Offset Packing Modeling</li>
              <li>• Persistent State-Variable READ/WRITE Data Flow</li>
              <li>• Delegatecall Classification & Sensitive Sink Detection</li>
              <li>• Candidate Attack Path Derivation</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase font-mono">Stage 2: Validation Scope (Handoff Target)</span>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
              <li>• Symbolic Execution (Z3 / constraint solvers)</li>
              <li>• Dynamic Execution & Path Feasibility Testing</li>
              <li>• Satisfiability of modifier guard conditions</li>
              <li>• Final Confirmation of Exploitability</li>
            </ul>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Mandatory Research Scope Distinction:</span>
            <p className="mt-0.5 text-slate-300 leading-relaxed">
              This module strictly outputs <code className="text-amber-300 font-mono">status: "CANDIDATE"</code> and{' '}
              <code className="text-amber-300 font-mono">validationRequired: true</code>. Finding a delegatecall or
              a read-write relationship is a candidate attack path; it is NOT a confirmed vulnerability until validated
              dynamically or symbolically in Stage 2.
            </p>
          </div>
        </div>
      </div>

      {/* Methodology & The Three Patterns */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>The Three DelegateTracker Vulnerability Patterns</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-rose-400 font-mono">Pattern 1: Self-Destruct Anomaly</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Finds a pair of functions where Function A writes state variable <code className="text-slate-200">X</code>,
              and Function B reads <code className="text-slate-200">X</code> and reaches{' '}
              <code className="text-rose-300">selfdestruct()</code>:
            </p>
            <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded">
              A() → X → B() → selfdestruct
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-emerald-400 font-mono">Pattern 2: Ether-Sending Anomaly</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Finds a pair of functions where Function A writes state variable <code className="text-slate-200">X</code>,
              and Function B reads <code className="text-slate-200">X</code> and reaches currency transfer:
            </p>
            <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded">
              A() → X → B() → transfer
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-purple-400 font-mono">Pattern 3: Judgment-Condition Disorder</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Finds a pair of functions where Function A writes state variable <code className="text-slate-200">X</code>,
              and Function B reads <code className="text-slate-200">X</code> in a gatekeeper condition (require, if, loop):
            </p>
            <div className="font-mono text-[11px] text-slate-300 bg-slate-900 p-2 rounded">
              A() → X → B() → condition/branch
            </div>
          </div>
        </div>
      </div>

      {/* REST API Endpoints & Machine-Readable Handoff */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <span>REST API Endpoints & Machine-Readable Handoff</span>
        </h2>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-emerald-400 font-bold">POST</span> /api/analyze
              <p className="text-slate-400 font-sans text-xs mt-1">
                Submits Solidity source files and compiler version; returns full ContractIR and CandidateAttackPath[].
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-blue-400 font-bold">GET</span> /api/attack-paths
              <p className="text-slate-400 font-sans text-xs mt-1">
                Returns the current list of candidate attack paths in the standardized CandidateAttackPath JSON format.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-blue-400 font-bold">GET</span> /api/contracts/:id/read-write
              <p className="text-slate-400 font-sans text-xs mt-1">
                Returns the read/write state variable sets and compound operations for all functions in the target contract.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-blue-400 font-bold">GET</span> /api/contracts/:id/storage
              <p className="text-slate-400 font-sans text-xs mt-1">
                Returns 32-byte EVM storage slots and byte offsets for all state variables.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-emerald-400 font-bold">POST</span> /api/attack-paths/export
              <p className="text-slate-400 font-sans text-xs mt-1">
                Exports candidate attack paths as JSON or CSV format.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Known Limitations */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Database className="w-5 h-5 text-amber-400" />
          <span>Known Limitations & Static Analysis Boundaries</span>
        </h2>

        <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
          <li>
            <strong className="text-white">Solidity Version Dependence:</strong> Storage slot packing and AST node formats
            vary between Solidity compiler versions. The analyzer explicitly tags the compiler version used.
          </li>
          <li>
            <strong className="text-white">Complex Storage Structures:</strong> While contiguous primitives (uint, address,
            bool, bytesN) are modeled, dynamic structures (mappings, dynamic arrays) require keccak256 hash calculations
            and are tagged as <code className="text-cyan-300">"Complex storage layout – requires extended analysis"</code>.
          </li>
          <li>
            <strong className="text-white">Unresolved Delegatecall Targets:</strong> If the target address is dynamically
            computed or received at runtime, static analysis cannot guarantee the exact callee bytecode without Group 2 dynamic traces.
          </li>
          <li>
            <strong className="text-white">Static False Positives:</strong> Statically, an execution path may appear possible
            because Function A writes a variable read by Function B, but complex require guards or cryptographic checks may render
            the path mathematically unreachable at runtime. Group 2 symbolic constraint checking exists specifically to filter these.
          </li>
        </ul>
      </div>
    </div>
  );
};
