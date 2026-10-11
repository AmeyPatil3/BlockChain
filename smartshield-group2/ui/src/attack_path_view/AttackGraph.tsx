import React, { useState } from 'react';
import { ShieldAlert, Database, ArrowRight, Zap, CheckCircle2, User, KeyRound, AlertTriangle } from 'lucide-react';
import { ValidationResult, RuntimeAccess } from '../../../validator/types.ts';

interface AttackGraphProps {
  validationResult: ValidationResult | null;
  candidatePath: any;
}

export const AttackGraph: React.FC<AttackGraphProps> = ({ validationResult, candidatePath }) => {
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    title: string;
    type: string;
    description: string;
    evidence?: any;
  } | null>(null);

  const isConfirmed = validationResult?.status === 'CONFIRMED';
  const writerFunc = candidatePath?.writer_function || candidatePath?.writerFunction || 'initialize';
  const readerFunc = candidatePath?.reader_function || candidatePath?.readerFunction || 'execute';
  const targetVar = candidatePath?.vulnerability_variable || candidatePath?.vulnerabilityVariable || 'owner';
  const targetSlot = candidatePath?.expected_storage?.slot ?? '0';

  const writeAccess = validationResult?.runtime_accesses.find((a) => a.operation === 'WRITE');
  const readAccess = validationResult?.runtime_accesses.find((a) => a.operation === 'READ');

  const nodes = [
    {
      id: 'attacker',
      title: 'Untrusted Attacker',
      subtitle: 'External msg.sender',
      type: 'actor',
      icon: User,
      color: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
      description: 'External caller initiates unauthorized transaction to proxy contract.',
      evidence: {
        address: '0x2000000000000000000000000000000000000002',
        role: 'Attacker identity',
      },
    },
    {
      id: 'writer',
      title: `${writerFunc}()`,
      subtitle: 'Delegatecall Writer',
      type: 'function',
      icon: KeyRound,
      color: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300',
      description: `Invokes '${writerFunc}' via fallback proxy delegatecall forwarding calldata into implementation context.`,
      evidence: {
        function: writerFunc,
        contract: candidatePath?.callee_contract || 'Implementation',
        status: validationResult?.executable ? 'EXECUTED_SUCCESSFULLY' : 'BLOCKED',
      },
    },
    {
      id: 'sstore',
      title: `WRITE [slot 0x${targetSlot}]`,
      subtitle: `Mutates ${targetVar}`,
      type: 'storage',
      icon: Database,
      color: isConfirmed ? 'border-red-500/60 bg-red-500/15 text-red-300' : 'border-slate-700 bg-slate-800 text-slate-400',
      description: `Intercepted SSTORE opcode modifying storage slot 0x${targetSlot} in proxy storage context.`,
      evidence: writeAccess || {
        operation: 'WRITE',
        slot: `0x${targetSlot}`,
        status: validationResult?.write_detected ? 'DETECTED' : 'NOT_FOUND',
      },
    },
    {
      id: 'reader',
      title: `${readerFunc}()`,
      subtitle: 'Privileged Reader / Guard',
      type: 'function',
      icon: Zap,
      color: 'border-purple-500/50 bg-purple-500/10 text-purple-300',
      description: `Attacker invokes '${readerFunc}'. The access control check reads modified '${targetVar}' slot.`,
      evidence: {
        function: readerFunc,
        contract: candidatePath?.caller_contract || 'Proxy',
        guardSatisfied: validationResult?.constraints === 'SAT',
      },
    },
    {
      id: 'sload',
      title: `READ [slot 0x${targetSlot}]`,
      subtitle: `Evaluates ${targetVar}`,
      type: 'storage',
      icon: Database,
      color: isConfirmed ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400',
      description: `Intercepted SLOAD opcode reading overwritten slot 0x${targetSlot} to check msg.sender == owner.`,
      evidence: readAccess || {
        operation: 'READ',
        slot: `0x${targetSlot}`,
        status: validationResult?.read_detected ? 'DETECTED' : 'NOT_FOUND',
      },
    },
    {
      id: 'sink',
      title: 'Sensitive Operation',
      subtitle: 'ETH Transfer / Draining',
      type: 'sink',
      icon: ShieldAlert,
      color: isConfirmed ? 'border-red-500 bg-red-950/40 text-red-200 glow-confirmed' : 'border-slate-700 bg-slate-800 text-slate-400',
      description: 'Sensitive sink executed: privileged transfer or selfdestruct reached by unauthorized caller.',
      evidence: {
        operation: candidatePath?.vulnerability_type || 'ETHER_TRANSFER',
        reached: validationResult?.sensitive_operation_reached ?? false,
        details: validationResult?.evidence?.sensitive_operation_details || 'Contract funds drained',
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Visual Attack Path Graph</span>
            {isConfirmed && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                EXPLOITABLE PATH CONFIRMED
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400">Click any graph node below to inspect intercepted opcode and storage evidence</p>
        </div>
      </div>

      {/* DAG Flow Graph */}
      <div className="glass-panel p-6 rounded-2xl overflow-x-auto">
        <div className="flex items-center justify-between min-w-[850px] gap-2">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isSelected = selectedNode?.id === node.id;

            return (
              <React.Fragment key={node.id}>
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`cursor-pointer transition-all duration-200 transform hover:-translate-y-1 p-3.5 rounded-xl border flex flex-col items-center text-center w-36 ${node.color} ${
                    isSelected ? 'ring-2 ring-indigo-400 scale-105' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-black/30 mb-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-xs leading-tight">{node.title}</span>
                  <span className="text-[10px] text-slate-400 mt-1">{node.subtitle}</span>
                </div>

                {index < nodes.length - 1 && (
                  <div className="flex items-center text-slate-600 px-1">
                    <ArrowRight className="w-4 h-4 text-indigo-400/60 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Evidence Inspection Drawer */}
      {selectedNode && (
        <div className="glass-card p-4 rounded-xl border border-indigo-500/30 transition-all duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Inspecting Node:</span>
              <span className="text-sm font-semibold text-white">{selectedNode.title}</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-2">{selectedNode.description}</p>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Runtime Opcode & State Evidence:</span>
            <pre className="mt-1 p-2.5 rounded-lg bg-black/40 text-[11px] font-mono text-emerald-400 overflow-x-auto border border-white/5">
              {JSON.stringify(selectedNode.evidence, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
