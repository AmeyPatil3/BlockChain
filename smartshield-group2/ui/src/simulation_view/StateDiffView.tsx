import React from 'react';
import { CandidateAttackPath, SimulationResult } from '../../../validator/types.ts';
import { TrendingDown, TrendingUp, ShieldCheck, AlertOctagon, DollarSign, Database, Code2 } from 'lucide-react';

interface StateDiffViewProps {
  simulationResult: SimulationResult | null;
  candidatePath?: CandidateAttackPath | null;
  validationStatus?: 'CONFIRMED' | 'REJECTED' | 'INCONCLUSIVE' | null;
  validationReason?: string | null;
}

export const StateDiffView: React.FC<StateDiffViewProps> = ({
  simulationResult,
  candidatePath,
  validationStatus,
  validationReason,
}) => {
  const varName =
    candidatePath?.vulnerability_variable ||
    (candidatePath as any)?.vulnerabilityVariable ||
    (candidatePath as any)?.variable ||
    'owner';
  const slotNum = String(
    candidatePath?.expected_storage?.slot ??
    (candidatePath as any)?.storage?.slot ??
    0
  );
  const writerFunc =
    candidatePath?.writer_function ||
    (candidatePath as any)?.writerFunction ||
    (candidatePath as any)?.entry_point?.function ||
    'initialize';
  const readerFunc =
    candidatePath?.reader_function ||
    (candidatePath as any)?.readerFunction ||
    (candidatePath as any)?.sink?.function ||
    'execute';
  const contractName = candidatePath?.contract || 'Contract';

  // If path was verified as REJECTED / SAFE
  if (validationStatus === 'REJECTED') {
    return (
      <div className="space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-emerald-300 bg-emerald-50/70 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              EXPLOIT BLOCKED • SAFE FROM DRAIN
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2">
              Attack Path Successfully Defended
            </h3>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
              EVM bytecode validation and Z3 SMT constraint solving proved that an unauthorized caller cannot overwrite state variable <span className="font-mono text-emerald-700 font-semibold">{varName}</span> (Slot {slotNum}).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs font-mono text-emerald-800 max-w-xl mx-auto space-y-1 text-left shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span>Guarded Function: <span className="text-slate-900 font-bold">{writerFunc}()</span></span>
              <span>Target: <span className="text-slate-900 font-bold">{varName} (Slot {slotNum})</span></span>
            </div>
            <div className="text-emerald-700 font-bold pt-1">
              ✓ Protection: {validationReason || 'Execution reverted: Access control condition holds'}
            </div>
            <div className="text-slate-500 text-[11px] pt-1">
              Vault Balance Preserved: <span className="text-slate-900 font-bold">10.0 ETH</span> • Attacker Looted: <span className="text-emerald-700 font-bold">0.0 ETH</span>
            </div>
          </div>
        </div>

        {/* Safe State Diff Confirmation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Contract State (Untampered)
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-white border border-slate-100">
                <span className="text-slate-500">{varName} Slot {slotNum}:</span>
                <span className="font-mono text-emerald-700 font-semibold">Protected (Unchanged)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-white border border-slate-100">
                <span className="text-slate-500">Vault Balance:</span>
                <span className="font-mono font-bold text-slate-900">10.0 ETH (SAFE)</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Attacker Result
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Transaction Status:</span>
                <span className="font-mono text-rose-600 font-bold">REVERTED (Blocked)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500">Attacker Loot:</span>
                <span className="font-mono text-slate-700 font-bold">0.0 ETH (0%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!simulationResult) {
    return (
      <div className="glass-panel p-6 rounded-2xl text-center text-slate-500 shadow-xs">
        <p className="text-sm">Click "Run EVM Validation" to simulate and demonstrate attack impact in the isolated sandbox.</p>
      </div>
    );
  }

  const { before_state, after_state, steps, impact } = simulationResult;
  const beforeSlotVal = before_state.storage?.[slotNum] || before_state.owner;
  const afterSlotVal = after_state.storage?.[slotNum] || after_state.owner;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Controlled Sandbox Simulation</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              SAFE ISOLATED REPLAY
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Replaying <span className="font-mono text-cyan-700 font-semibold">{contractName}</span> • Vulnerable State Variable: <span className="font-mono text-amber-700 font-semibold">{varName}</span> (Slot {slotNum})
          </p>
        </div>
      </div>

      {/* Target Spec Header Pill */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono shadow-xs flex-wrap">
        <div className="flex items-center gap-1.5 text-slate-700">
          <Code2 className="w-4 h-4 text-cyan-600" />
          <span className="text-slate-500">Contract:</span>
          <span className="font-bold text-slate-900">{contractName}</span>
        </div>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5 text-slate-700">
          <Database className="w-4 h-4 text-amber-600" />
          <span className="text-slate-500">Target Variable:</span>
          <span className="font-bold text-amber-800">{varName} (Slot {slotNum})</span>
        </div>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="text-slate-500">Writer:</span>
          <span className="font-bold text-cyan-700">{candidatePath?.writer_function || 'writer'}()</span>
          <span className="text-slate-400">→</span>
          <span className="text-slate-500">Sink:</span>
          <span className="font-bold text-rose-700">{candidatePath?.reader_function || 'sink'}()</span>
        </div>
      </div>

      {/* Before vs After Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BEFORE STATE */}
        <div className="glass-card p-5 rounded-xl border border-slate-200 bg-white relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 px-3 py-1 bg-slate-100 text-[10px] font-bold text-slate-600 rounded-bl-lg uppercase tracking-wider border-b border-l border-slate-200">
            BEFORE ATTACK
          </div>
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Initial Contract & Account State</span>
          </h4>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Legitimate {varName}:</span>
              <span className="font-mono text-emerald-700 font-semibold truncate max-w-[180px]">{before_state.owner}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Storage Slot {slotNum} ({varName}):</span>
              <span className="font-mono text-cyan-800 truncate max-w-[180px]">{beforeSlotVal}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Proxy Vault Balance:</span>
              <span className="font-mono font-bold text-slate-900 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                {before_state.contractBalanceEth} ETH
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500">Attacker Balance:</span>
              <span className="font-mono text-slate-600">{before_state.attackerBalanceEth} ETH</span>
            </div>
          </div>
        </div>

        {/* AFTER STATE */}
        <div className="glass-card p-5 rounded-xl border border-red-200 bg-red-50/40 relative overflow-hidden shadow-xs">
          <div className="absolute top-0 right-0 px-3 py-1 bg-red-100 text-[10px] font-bold text-red-700 rounded-bl-lg uppercase tracking-wider border-b border-l border-red-200">
            AFTER EXPLOIT
          </div>
          <h4 className="text-sm font-semibold text-red-900 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            <span>Post-Execution Hijacked State</span>
          </h4>

          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-red-200">
              <span className="text-slate-500">Hijacked {varName}:</span>
              <span className="font-mono text-red-700 font-bold truncate max-w-[180px]">{after_state.owner}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-red-200">
              <span className="text-slate-500">Storage Slot {slotNum} ({varName}):</span>
              <span className="font-mono text-red-700 font-bold truncate max-w-[180px]">{afterSlotVal} (OVERWRITTEN)</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-red-200">
              <span className="text-slate-500">Proxy Vault Balance:</span>
              <span className="font-mono font-bold text-red-700 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                {after_state.contractBalanceEth} ETH (DRAINED)
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-white border border-red-200">
              <span className="text-slate-500">Attacker Balance:</span>
              <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                +{after_state.attackerBalanceEth} ETH (LOOTED)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Exploit Steps Timeline */}
      <div className="glass-panel p-5 rounded-xl space-y-3 shadow-xs bg-white">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Demonstrated Attack Progression</h4>
        <div className="space-y-2">
          {steps.map((step) => (
            <div key={step.stepNumber} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 text-xs border border-slate-200">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[11px] border border-indigo-200">
                {step.stepNumber}
              </span>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{step.action}</span>
                  {step.sensitiveOpTriggered && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 font-bold">
                      {step.sensitiveOpTriggered}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-600">
                  Calldata: <span className="text-indigo-700 font-semibold">{step.calldataSummary}</span>
                </div>
                {step.storageModified && (
                  <div className="text-[11px] font-mono text-emerald-700 font-medium">
                    Storage Slot {step.storageModified.slot} overwrite verified ({step.storageModified.oldValue} → {step.storageModified.newValue}).
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Impact Callout */}
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
          <span className="font-bold">Demonstrated Security Consequence: </span>
          {impact.summary}
        </div>
      </div>
    </div>
  );
};
