/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Copy,
  Check,
  ShieldAlert,
  Terminal,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

interface ReportsPageProps {
  result: AnalysisResult;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [showOtherFormats, setShowOtherFormats] = useState(false);
  const [selectedFormatTab, setSelectedFormatTab] = useState<'csv' | 'json' | 'manifest'>('csv');

  const { summary, candidateAttackPaths, ir } = result;

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(candidateAttackPaths, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartshield-candidate-paths-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateMarkdownReport = () => {
    const lines = [
      '# SmartShield Static Analysis Security Report',
      `**Generated:** ${new Date().toISOString()}`,
      `**Target Compiler:** ${ir.compilerVersion}`,
      `**Methodology:** DelegateTracker Read-Write Data Flow Capture Algorithm`,
      '',
      '## Executive Summary',
      `- Contracts Analyzed: ${summary.contractsCount}`,
      `- Functions Mapped: ${summary.functionsCount}`,
      `- State Variables: ${summary.stateVariablesCount}`,
      `- Delegatecalls Detected: ${summary.delegatecallCount}`,
      `- Sensitive Operations: ${summary.sensitiveOperationsCount}`,
      `- Potential Attack Paths: ${summary.candidateAttackPathsCount}`,
      '',
      '## Potential Attack Paths (Validation Required)',
    ];

    if (candidateAttackPaths.length === 0) {
      lines.push('No delegatecall-related candidate paths detected.');
    } else {
      candidateAttackPaths.forEach((p, idx) => {
        lines.push(`### Potential Path #${idx + 1}: ${p.id}`);
        lines.push(`- **Classification:** ${p.vulnerability_type || p.vulnerabilityType}`);
        lines.push(`- **Status:** ${p.status} (Runtime Validation Required)`);
        lines.push(`- **State Variable:** \`${p.vulnerabilityVariable}\` (Slot: ${p.storage.slot}, Offset: ${p.storage.offset}B)`);
        lines.push(`- **Writer Function:** \`${p.writerFunction}()\``);
        lines.push(`- **Reader Function:** \`${p.readerFunction}()\``);
        lines.push(`- **Sensitive Operation:** \`${p.sensitiveOperation.type}\` in \`${p.sensitiveOperation.function}()\``);
        lines.push(`- **Technical Rationale:** ${p.reason}`);
        lines.push('');
      });
    }

    lines.push('---');
    lines.push('**Notice:** All candidate findings are generated via static AST analysis. Dynamic or symbolic validation is required to verify constraint satisfiability.');
    return lines.join('\n');
  };

  const handleDownloadReport = () => {
    const content = generateMarkdownReport();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartshield-security-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadPackage = async () => {
    try {
      const res = await fetch('/api/analysis/current/package');
      let pkgData;
      if (res.ok) {
        pkgData = await res.json();
      } else {
        pkgData = {
          'manifest.json': {
            schema_version: '1.0',
            package_name: 'SmartShield Analysis Package',
            timestamp: new Date().toISOString(),
            tool: 'SmartShield Static Delegatecall Analyzer',
            status: 'STATIC_CANDIDATES_GENERATED',
            summary: result.summary,
          },
          'contract_ir.json': result.ir,
          'candidate_paths.json': result.candidateAttackPaths,
          'delegatecalls.json': result.ir.delegatecalls,
          'storage_layout.json': result.ir.storageLayout,
          'call_graph.json': result.ir.calls,
          'cfg.json': result.ir.controlFlow,
          'read_write.json': result.ir.functions.map((f) => ({
            contract: f.contract,
            function: f.name,
            reads: f.reads,
            writes: f.writes,
          })),
        };
      }

      const blob = new Blob([JSON.stringify(pkgData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smartshield-analysis-package-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download package:', e);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch('/api/attack-paths/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartshield-candidate-paths-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback client-side CSV generation
        const headers = ['id', 'classification', 'variable', 'slot', 'offset', 'writer', 'reader', 'sink', 'status'];
        const rows = candidateAttackPaths.map((p) => [
          p.id,
          p.vulnerability_type || p.vulnerabilityType,
          p.vulnerabilityVariable,
          p.storage.slot,
          p.storage.offset,
          p.writerFunction,
          p.readerFunction,
          p.sensitiveOperation.type,
          p.status,
        ]);
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartshield-candidate-paths-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('CSV export failed:', e);
    }
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(candidateAttackPaths, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* 1. Delivery Center Manifest Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-500/30">
                DELIVERY CENTER
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400 font-mono">
                Solidity v{ir.compilerVersion}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Reports & Audit Deliverables
            </h1>
            <p className="text-xs text-slate-400 font-normal">
              Standardized handoff packages for human security reviewers and automated verification pipelines.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3 Artifacts Ready</span>
            </span>
          </div>
        </div>

        {/* Clean 4-Metric Manifest Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Candidates Flagged</span>
            <div className={`text-xl font-black mt-1 font-mono tabular-nums ${candidateAttackPaths.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {candidateAttackPaths.length}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Stage 1 data flows</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Delegatecalls</span>
            <div className="text-xl font-black text-white mt-1 font-mono tabular-nums">
              {summary.delegatecallCount}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Low-level call sites</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Storage Slots</span>
            <div className="text-xl font-black text-slate-200 mt-1 font-mono tabular-nums">
              {ir.storageLayout.length}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">State layout mapped</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Verification Status</span>
            <div className="text-sm font-bold text-amber-300 mt-1 truncate">
              Validation Req.
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Downstream handoff</span>
          </div>
        </div>
      </div>

      {/* 2. Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs flex items-start space-x-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-300 tracking-wide uppercase text-[11px]">
            Static Analysis Candidate Findings Notice
          </p>
          <p className="text-slate-300 leading-relaxed font-normal">
            Exports contain Stage 1 candidate data-flow paths intended for downstream validation. Candidate paths are not confirmed exploits until formally verified by symbolic constraint solvers.
          </p>
        </div>
      </div>

      {/* 3. Primary 3 Deliverable Packages */}
      <div className="space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-white tracking-tight uppercase">
            Primary Deliverables
          </h2>
          <p className="text-xs text-slate-400">
            Choose your desired delivery artifact format:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Human-Readable Markdown Audit Report */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-emerald-500/40 transition">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Security Report</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-normal">
                  Human-readable Markdown audit document summarizing executive metrics, state variables, and delegatecall traces.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleDownloadReport}
                className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Download Report (.md)</span>
              </button>

              <button
                onClick={handleCopyReport}
                className="w-full px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMd ? 'Copied Markdown' : 'Copy Markdown'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Export Machine-Readable Analysis Archive */}
          <div className="bg-slate-900 border border-blue-500/50 rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-5 relative">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Package className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white">Machine Package</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-bold bg-blue-500/20 text-cyan-300 font-mono border border-blue-500/30">
                    Primary Handoff
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-normal">
                  Standardized JSON archive containing candidate paths, contract AST IR, storage layout, read/write matrices, and CFG.
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadPackage}
              className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Export Package (.json)</span>
            </button>
          </div>

          {/* Card 3: Export Candidate Paths */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5 hover:border-cyan-500/40 transition">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Candidate Paths JSON</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-normal">
                  Isolated JSON array matching the standardized <code className="text-cyan-300 font-mono">CandidateAttackPath</code> schema for scripts.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadJSON}
                className="flex-1 px-3 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-sm cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
              <button
                onClick={handleCopyJSON}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 flex items-center space-x-1.5 transition cursor-pointer active:scale-[0.98]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabular Data Inspection & Spreadsheets (Flat elevation, No 3D) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Data Inspection & Formats
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedFormatTab('csv')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedFormatTab === 'csv'
                  ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tabular CSV Table
            </button>
            <button
              onClick={() => setSelectedFormatTab('json')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedFormatTab === 'json'
                  ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw Schema Preview
            </button>
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="p-5 bg-slate-950/60">
          {selectedFormatTab === 'csv' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-normal">
                Spreadsheet tabular view of candidate paths with storage slots and functions:
              </div>

              {candidateAttackPaths.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  No candidate attack paths to display in table.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Path ID</th>
                        <th className="py-2.5 px-3">Classification</th>
                        <th className="py-2.5 px-3">State Variable</th>
                        <th className="py-2.5 px-3">Slot</th>
                        <th className="py-2.5 px-3">Writer Function</th>
                        <th className="py-2.5 px-3">Reader Function</th>
                        <th className="py-2.5 px-3">Sensitive Sink</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {candidateAttackPaths.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2.5 px-3 text-cyan-300 font-bold whitespace-nowrap">{p.id}</td>
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{p.vulnerability_type || p.vulnerabilityType}</td>
                          <td className="py-2.5 px-3 text-rose-300 font-semibold">{p.vulnerabilityVariable}</td>
                          <td className="py-2.5 px-3 text-emerald-400 tabular-nums">{p.storage.slot}</td>
                          <td className="py-2.5 px-3 text-blue-300">{p.writerFunction}()</td>
                          <td className="py-2.5 px-3 text-indigo-300">{p.readerFunction}()</td>
                          <td className="py-2.5 px-3 text-purple-300 font-semibold">{p.sensitiveOperation.type}</td>
                          <td className="py-2.5 px-3 text-amber-400 text-[11px] whitespace-nowrap">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {selectedFormatTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Standardized CandidateAttackPath[] JSON Schema:</span>
                <button
                  onClick={handleCopyJSON}
                  className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold cursor-pointer underline"
                >
                  Copy JSON to clipboard
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-72 scrollbar-thin">
                {JSON.stringify(candidateAttackPaths, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* 5. Downstream Verification Pipeline Integration */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Downstream Validation Instructions</span>
        </h3>

        <p className="text-xs text-slate-300 leading-relaxed">
          SmartShield candidate findings represent statically verified data-flow paths through delegatecall state mutations.
          To complete formal verification or generate an exploit PoC, feed the <code className="text-cyan-300 font-mono">smartshield-analysis-package.json</code> directly into your symbolic execution harness or fuzzing test suite:
        </p>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
          <div className="text-slate-500"># Verify candidate paths with symbolic constraint solver</div>
          <div className="text-cyan-400">$ smartshield-validate --package ./smartshield-analysis-package.json --solver z3</div>
          <div className="text-slate-500 mt-2"># Run Foundry fuzzing harness against extracted storage collision slots</div>
          <div className="text-cyan-400">$ forge test --match-contract AttackPath_Test -vvv</div>
        </div>
      </div>
    </div>
  );
};
