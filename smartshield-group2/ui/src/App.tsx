import React, { useState, useEffect } from 'react';
import { Shield, Play, Activity, Sparkles, FileText, Download, CheckCircle, Terminal, Layers, RefreshCw, Key, Check, X } from 'lucide-react';
import { AttackGraph } from './attack_path_view/AttackGraph.tsx';
import { StateDiffView } from './simulation_view/StateDiffView.tsx';
import { ValidationBadge } from './validation_result/ValidationBadge.tsx';
import { CandidateAttackPath, ValidationResult, SimulationResult } from '../../validator/types.ts';

const SAMPLE_VULNERABLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VulnerableOwnerProxy {
    address public owner;
    address public implementation;

    constructor(address _implementation) {
        owner = msg.sender;
        implementation = _implementation;
    }

    fallback() external payable {
        (bool success, ) = implementation.delegatecall(msg.data);
        require(success, "Delegatecall failed");
    }

    function execute(address payable recipient, uint256 amount) public {
        require(msg.sender == owner, "Caller is not owner");
        recipient.transfer(amount);
    }
}

contract Implementation {
    address public owner;

    function initialize(address newOwner) public {
        owner = newOwner;
    }
}`;

const SAMPLE_SAFE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SafeDelegatecall {
    address public immutable owner;
    address public implementation;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner permitted");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setImplementation(address _impl) external onlyOwner {
        implementation = _impl;
    }

    function forward(bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = implementation.delegatecall(data);
        require(success, "Forwarding failed");
        return result;
    }
}`;

const VULN_CANDIDATE: CandidateAttackPath = {
  contract: 'VulnerableOwnerProxy',
  caller_contract: 'VulnerableOwnerProxy',
  callee_contract: 'Implementation',
  delegatecall_function: 'fallback',
  vulnerability_type: 'ETHER_TRANSFER',
  attack_path: ['initialize', 'execute'],
  vulnerability_variable: 'owner',
  writer_function: 'initialize',
  reader_function: 'execute',
  expected_storage: { slot: 0, offset: 0 },
};

const SAFE_CANDIDATE: CandidateAttackPath = {
  contract: 'SafeDelegatecall',
  caller_contract: 'SafeDelegatecall',
  delegatecall_function: 'forward',
  vulnerability_type: 'ETHER_TRANSFER',
  attack_path: ['forward', 'forward'],
  vulnerability_variable: 'owner',
  writer_function: 'forward',
  reader_function: 'forward',
  expected_storage: { slot: 0, offset: 0 },
};

type ContractMode = 'synced' | 'vulnerable' | 'safe';

interface SyncedPackage {
  filename: string;
  sourceCode: string;
  results: Array<{
    candidate_id: string;
    candidate: CandidateAttackPath;
    validation: ValidationResult;
  }>;
  activePathIndex: number;
}

export default function App() {
  const [contractMode, setContractMode] = useState<ContractMode>('vulnerable');
  const [syncedPackage, setSyncedPackage] = useState<SyncedPackage | null>(null);
  const [sourceCode, setSourceCode] = useState(SAMPLE_VULNERABLE);
  const [candidatePath, setCandidatePath] = useState<CandidateAttackPath>(VULN_CANDIDATE);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<{ explanation: string; impact: string; recommendation: string; model?: string } | null>(null);
  const [securityReport, setSecurityReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'simulation' | 'ai' | 'report'>('graph');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);

  // Gemini API key state & modal
  const [geminiKeyPreview, setGeminiKeyPreview] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);
  const [keySaving, setKeySaving] = useState(false);

  // Check backend Gemini status on mount
  useEffect(() => {
    fetch('/api/gemini-status')
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) {
          setGeminiKeyPreview(d.preview);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setKeySaving(true);
    try {
      const res = await fetch('/api/set-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeminiKeyPreview(data.preview);
        setKeySaveMessage('✓ Gemini API Key saved & active!');
        setTimeout(() => {
          setShowKeyModal(false);
          setKeySaveMessage(null);
          setGeminiKeyInput('');
        }, 1200);
        // Refresh explanation with new key
        if (validationResult) {
          handleExplain(validationResult, candidatePath);
        }
      } else {
        setKeySaveMessage(`✗ ${data.error || 'Failed to update key'}`);
      }
    } catch (err: any) {
      setKeySaveMessage(`✗ ${err.message}`);
    } finally {
      setKeySaving(false);
    }
  };

  // Run Validation (POST /api/validate)
  const handleValidate = async (cand?: CandidateAttackPath, src?: string) => {
    const c = cand || candidatePath;
    const s = src || sourceCode;
    setLoading(true);
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: c.contract,
          candidate_path: c,
          solidity_source: s,
        }),
      });
      const data = await res.json();
      setValidationResult(data.validation);

      // Auto-trigger simulation if confirmed
      if (data.status === 'CONFIRMED') {
        handleSimulate(data.validation, c, s);
      }
      handleExplain(data.validation, c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Run Simulation (POST /api/simulate)
  const handleSimulate = async (valResult?: ValidationResult, cand?: CandidateAttackPath, src?: string) => {
    const c = cand || candidatePath;
    const s = src || sourceCode;
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: c.contract,
          candidate_path: c,
          solidity_source: s,
          initial_balance: '10.0',
        }),
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Run AI Explanation (POST /api/explain)
  const handleExplain = async (valResult: ValidationResult, cand?: CandidateAttackPath) => {
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validation_result: valResult,
          candidate_path: cand || candidatePath,
          solidity_source: syncedPackage?.sourceCode || sourceCode,
        }),
      });
      const data = await res.json();
      setAiExplanation(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Switch between presets and synced contract without wiping anything
  const handleSelectMode = (mode: ContractMode) => {
    setContractMode(mode);
    if (mode === 'synced' && syncedPackage) {
      const curResult = syncedPackage.results[syncedPackage.activePathIndex] || syncedPackage.results[0];
      setSourceCode(syncedPackage.sourceCode);
      if (curResult) {
        setCandidatePath(curResult.candidate);
        setValidationResult(curResult.validation);
        if (curResult.validation.status === 'CONFIRMED') {
          handleSimulate(curResult.validation, curResult.candidate, syncedPackage.sourceCode);
        }
        handleExplain(curResult.validation, curResult.candidate);
      }
    } else if (mode === 'vulnerable') {
      setSourceCode(SAMPLE_VULNERABLE);
      setCandidatePath(VULN_CANDIDATE);
      handleValidate(VULN_CANDIDATE, SAMPLE_VULNERABLE);
    } else if (mode === 'safe') {
      setSourceCode(SAMPLE_SAFE);
      setCandidatePath(SAFE_CANDIDATE);
      handleValidate(SAFE_CANDIDATE, SAMPLE_SAFE);
    }
  };

  // Switch between candidate attack paths in the synced contract
  const handleSelectSyncedPath = (index: number) => {
    if (!syncedPackage || !syncedPackage.results[index]) return;
    const item = syncedPackage.results[index];
    setSyncedPackage({ ...syncedPackage, activePathIndex: index });
    setCandidatePath(item.candidate);
    setValidationResult(item.validation);
    if (item.validation.status === 'CONFIRMED') {
      handleSimulate(item.validation, item.candidate, syncedPackage.sourceCode);
    }
    handleExplain(item.validation, item.candidate);
  };

  // Generate Security Report (POST /api/report)
  const handleGenerateReport = async () => {
    if (!validationResult) return;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_name: candidatePath.contract,
          candidate_path: candidatePath,
          validation_result: validationResult,
          simulation_result: simulationResult,
          ai_explanation: aiExplanation,
          solidity_source: syncedPackage?.sourceCode || sourceCode,
        }),
      });
      const data = await res.json();
      setSecurityReport(data.report);
      setActiveTab('report');
    } catch (err) {
      console.error(err);
    }
  };

  // Sync live analysis from Group 1 via Group 2 backend proxy (avoids browser CORS restriction)
  const handleSyncGroup1 = async () => {
    setLoading(true);
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/ingest-from-group1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group1Url: 'http://localhost:3000' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSyncStatus('error');
        setSyncError(errData.error || `HTTP ${res.status} — Group 1 may not be running on port 3000.`);
        return;
      }

      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        setSyncStatus('error');
        setSyncError('Group 1 returned no candidate paths. Try analysing a contract in Group 1 first.');
        return;
      }

      const rawSource = data.solidity_source || sourceCode;
      const results = data.results;
      const filename = data.filename || 'Contract.sol';

      // Save permanently into state so preset switching never wipes it
      const newPackage: SyncedPackage = {
        filename,
        sourceCode: rawSource,
        results,
        activePathIndex: 0,
      };

      setSyncedPackage(newPackage);
      setContractMode('synced');
      setSourceCode(rawSource);

      const firstResult = results[0];
      const path = firstResult.candidate;
      const validation: ValidationResult = firstResult.validation;

      setCandidatePath(path);
      setValidationResult(validation);
      setSyncStatus('success');
      setSyncError(null);

      if (validation.status === 'CONFIRMED') {
        handleSimulate(validation, path, rawSource);
        setActiveTab('graph');
      }
      handleExplain(validation, path);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(`Could not reach Group 2 backend. Is the server running? (${err.message})`);
    } finally {
      setLoading(false);
    }
  };

  // Initial load auto-run validation
  useEffect(() => {
    handleValidate(VULN_CANDIDATE, SAMPLE_VULNERABLE);
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">SmartShield</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                GROUP 2 VALIDATOR
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Dynamic EVM Opcode Validation, Controlled Simulation & AI Explanation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSyncStatus('idle'); setSyncError(null); handleSyncGroup1(); }}
            disabled={loading || syncStatus === 'syncing'}
            title="Fetch candidate paths from Group 1 static analysis server (port 3000) via server-side proxy"
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all border ${syncStatus === 'success'
                ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200'
                : syncStatus === 'error'
                  ? 'bg-red-600/30 border-red-500/50 text-red-200'
                  : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-indigo-500/40'
              }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'success' ? '✓ Synced from Group 1' : syncStatus === 'error' ? '✗ Sync Failed' : 'Sync from Group 1 (Port 3000)'}
          </button>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">Compiler:</span>
            <span className="font-mono text-emerald-300 font-semibold">solc 0.8.37 (Wasm)</span>
          </div>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-black/40 border border-white/5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">SMT Engine:</span>
            <span className="font-mono text-indigo-300 font-semibold">Microsoft Z3</span>
          </div>
          <button
            onClick={() => setShowKeyModal(true)}
            title="Configure Google Gemini API Key for live AI explanations and audit report enrichment"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-950/50 border border-amber-500/30 text-amber-200 transition-all font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Gemini AI:</span>
            {geminiKeyPreview ? (
              <span className="font-mono text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="text-amber-400/80 text-[11px]">Set API Key</span>
            )}
          </button>
        </div>
      </header>

      {/* Sync Error / Success Banner */}
      {syncStatus === 'error' && syncError && (
        <div className="px-6 py-2.5 bg-red-950/80 border-b border-red-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-red-200">
            <span className="text-red-400 font-bold">⚠ Group 1 Sync Error:</span>
            <span>{syncError}</span>
            <span className="text-red-400/60">— Make sure Group 1 is running: <code className="font-mono text-red-300">cd SmartShield && npm start</code></span>
          </div>
          <button onClick={() => { setSyncStatus('idle'); setSyncError(null); }} className="text-red-400 hover:text-red-200 text-xs font-bold flex-shrink-0">✕ Dismiss</button>
        </div>
      )}
      {syncStatus === 'success' && (
        <div className="px-6 py-2 bg-emerald-950/70 border-b border-emerald-500/20 flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-300">✓ Candidate path successfully imported from Group 1 and validated by Group 2 EVM engine.</span>
          <button onClick={() => setSyncStatus('idle')} className="text-emerald-500 hover:text-emerald-200 text-xs font-bold flex-shrink-0">✕</button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Preset Controls & Source Code (4 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Contract Selector: Synced Contract & Reference Benchmarks */}
          <div className="glass-panel p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Contract</span>
              {syncedPackage ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-2.5 py-0.5 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Synced from Port 3000
                </span>
              ) : (
                <span className="text-[10px] text-indigo-400">Reference Benchmarks</span>
              )}
            </div>

            {/* Live Synced Contract Button (Displayed when synced from Group 1) */}
            {syncedPackage && (
              <button
                onClick={() => handleSelectMode('synced')}
                className={`w-full p-3 rounded-xl text-xs font-semibold text-left transition-all border ${contractMode === 'synced'
                    ? 'bg-cyan-600/90 text-white border-cyan-400 shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
                    : 'bg-cyan-950/40 text-cyan-200 border-cyan-500/30 hover:bg-cyan-900/50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-sm">
                    ⚡ {syncedPackage.filename}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 border border-cyan-400/40 text-cyan-300 font-mono">
                    {syncedPackage.results.length} candidate path{syncedPackage.results.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-[11px] opacity-85 font-normal mt-1">
                  Active live contract imported from Group 1 • Click anytime to switch back
                </div>
              </button>
            )}

            {/* Reference Benchmark Presets */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectMode('vulnerable')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${contractMode === 'vulnerable'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-black/30 text-slate-300 border-white/5 hover:border-white/20'
                  }`}
              >
                🚨 Vulnerable Proxy
                <div className="text-[10px] opacity-75 font-normal">Reference benchmark</div>
              </button>
              <button
                onClick={() => handleSelectMode('safe')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all border ${contractMode === 'safe'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                    : 'bg-black/30 text-slate-300 border-white/5 hover:border-white/20'
                  }`}
              >
                🛡️ Safe Delegatecall
                <div className="text-[10px] opacity-75 font-normal">Reference benchmark</div>
              </button>
            </div>
          </div>

          {/* Candidate Path Selector (When Synced Contract has multiple paths, e.g. 6 paths) */}
          {contractMode === 'synced' && syncedPackage && syncedPackage.results.length > 1 && (
            <div className="glass-panel p-3.5 rounded-2xl space-y-2.5 border border-cyan-500/30 bg-cyan-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Candidate Paths ({syncedPackage.results.length} detected)
                </span>
                <span className="text-[11px] text-cyan-400/80 font-mono">
                  Inspecting Path #{syncedPackage.activePathIndex + 1}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {syncedPackage.results.map((resItem, idx) => {
                  const isSelected = idx === syncedPackage.activePathIndex;
                  const pathId = resItem.candidate_id || (resItem.candidate as any)?.id || 'PATH-' + String(idx + 1).padStart(3, '0');
                  const varName = resItem.candidate.vulnerability_variable || (resItem.candidate as any).vulnerabilityVariable || 'owner';
                  const vulnType = (resItem.candidate.vulnerability_type || (resItem.candidate as any).vulnerabilityType || '').toUpperCase();
                  const typeLabel = vulnType === 'SELF_DESTRUCT'
                    ? 'Destruct'
                    : vulnType === 'ETHER_TRANSFER' || vulnType === 'CURRENCY_SENDING'
                      ? 'Drain'
                      : 'Condition';
                  return (
                    <button
                      key={pathId + idx}
                      onClick={() => handleSelectSyncedPath(idx)}
                      className={`px-2.5 py-1.5 rounded-lg text-left text-[11px] font-mono transition-all border ${isSelected
                          ? 'bg-cyan-600 text-white border-cyan-300 font-bold shadow-md shadow-cyan-600/30 ring-1 ring-cyan-300'
                          : 'bg-black/40 text-slate-300 border-white/10 hover:border-cyan-500/40 hover:bg-black/60'
                        }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>{pathId}</span>
                        <span className="text-[9px] uppercase px-1 rounded bg-black/30 opacity-80">{typeLabel}</span>
                      </div>
                      <div className="text-[10px] opacity-75 truncate">{varName}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Source Code View */}
          <div className="glass-panel p-4 rounded-2xl flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Solidity Contract Source
              </span>
              <button
                onClick={handleValidate}
                disabled={loading}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
              >
                <Play className="w-3 h-3" />
                {loading ? 'Validating...' : 'Run EVM Validation'}
              </button>
            </div>
            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="mt-3 flex-1 w-full bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-[11px] text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Right Column: Execution Evidence, Visualization, Simulation & Report (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Validation Status Badge */}
          <ValidationBadge validationResult={validationResult} />

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'graph' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Attack Path Graph
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'simulation' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              <Play className="w-3.5 h-3.5" />
              Sandbox Simulation
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Grounded AI Explanation
            </button>
            <button
              onClick={() => {
                handleGenerateReport();
                setActiveTab('report');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${activeTab === 'report' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Security Audit Report
            </button>
          </div>

          {/* Tab 1: Visual Graph */}
          {activeTab === 'graph' && (
            <AttackGraph validationResult={validationResult} candidatePath={candidatePath} />
          )}

          {/* Tab 2: Simulation View */}
          {activeTab === 'simulation' && (
            <StateDiffView
              simulationResult={simulationResult}
              candidatePath={candidatePath}
              validationStatus={validationResult?.status}
              validationReason={validationResult?.reason}
            />
          )}

          {/* Tab 3: Grounded AI Explanation */}
          {activeTab === 'ai' && (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Grounded AI Analysis</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                    EVIDENCE-BOUND
                  </span>
                  {aiExplanation?.model && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                      {aiExplanation.model}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowKeyModal(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-medium"
                >
                  Configure Gemini Key
                </button>
              </div>
              <p className="text-xs text-slate-400">Strictly generated from verified execution opcodes and Z3 constraint solver proofs (zero hallucinations).</p>

              {aiExplanation ? (
                <div className="space-y-4 text-xs leading-relaxed">
                  <div className="glass-card p-4 rounded-xl border border-white/5 space-y-1">
                    <span className="font-bold text-indigo-400 uppercase tracking-wide text-[10px]">Root Cause Explanation</span>
                    <p className="text-slate-200">{aiExplanation.explanation}</p>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-red-500/20 space-y-1 bg-red-950/10">
                    <span className="font-bold text-red-400 uppercase tracking-wide text-[10px]">Potential Exploit Impact</span>
                    <p className="text-red-200">{aiExplanation.impact}</p>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-emerald-500/20 space-y-1 bg-emerald-950/10">
                    <span className="font-bold text-emerald-400 uppercase tracking-wide text-[10px]">Recommended Remediation</span>
                    <pre className="text-emerald-200 whitespace-pre-wrap font-sans text-xs">{aiExplanation.recommendation}</pre>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-black/30 text-xs text-slate-400">Awaiting AI explanation...</div>
              )}
            </div>
          )}

          {/* Tab 4: Security Report */}
          {activeTab === 'report' && (
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Security Audit Report</h3>
                  {geminiKeyPreview && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                      Gemini Enriched
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([securityReport || ''], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${candidatePath.contract}_Audit_Report.md`;
                    a.click();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Report (.md)
                </button>
              </div>

              <div className="bg-black/50 p-4 rounded-xl border border-white/5 max-h-[480px] overflow-y-auto">
                <pre className="text-[11px] font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {securityReport || 'Generating security report...'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gemini API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Google Gemini AI Configuration</h3>
              </div>
              <button
                onClick={() => { setShowKeyModal(false); setKeySaveMessage(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              SmartShield uses Gemini to synthesize formal audit explanations and threat analyses grounded in EVM opcode traces and Z3 solver proofs.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Status
              </label>
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-xs flex items-center justify-between">
                <span className="text-slate-400">API Key:</span>
                {geminiKeyPreview ? (
                  <span className="font-mono text-emerald-300 font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Connected & Active
                  </span>
                ) : (
                  <span className="text-amber-400">Not configured (offline mode)</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Enter / Update Gemini API Key
              </label>
              <input
                type="password"
                placeholder="AIzaSy... or AQ...."
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-500">
                Key will be saved to <code className="text-slate-400">smartshield-group2/.env</code> and activated immediately.
              </p>
            </div>

            {keySaveMessage && (
              <div className={`p-2.5 rounded-lg text-xs font-medium ${keySaveMessage.startsWith('✓') ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30' : 'bg-red-950/60 text-red-300 border border-red-500/30'}`}>
                {keySaveMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowKeyModal(false); setKeySaveMessage(null); }}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGeminiKey}
                disabled={!geminiKeyInput.trim() || keySaving}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {keySaving ? 'Saving…' : 'Save & Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
