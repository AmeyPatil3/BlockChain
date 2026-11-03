import React, { useState } from 'react';
import { ShieldAlert, Database, ArrowRight, Zap, User, KeyRound } from 'lucide-react';
import { ValidationResult } from '../../../validator/types.ts';

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
      color: 'border-amber-300 bg-amber-50 text-amber-900',
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
      color: 'border-indigo-300 bg-indigo-50 text-indigo-900',
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
      color: isConfirmed ? 'border-red-300 bg-red-50 text-red-900 font-bold' : 'border-slate-300 bg-slate-100 text-slate-600',
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
      color: 'border-purple-300 bg-purple-50 text-purple-900',
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
      color: isConfirmed ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-300 bg-slate-100 text-slate-600',
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
      color: isConfirmed ? 'border-red-400 bg-red-100 text-red-950 font-bold glow-confirmed' : 'border-slate-300 bg-slate-100 text-slate-600',
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
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Visual Attack Path Graph</span>
            {isConfirmed && (
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200">
                EXPLOITABLE PATH CONFIRMED
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">Click any graph node below to inspect intercepted opcode and storage evidence</p>
        </div>
      </div>

      {/* DAG Flow Graph */}
      <div className="glass-panel p-6 rounded-2xl overflow-x-auto shadow-xs bg-white">
        <div className="flex items-center justify-between min-w-[850px] gap-2">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isSelected = selectedNode?.id === node.id;

            return (
              <React.Fragment key={node.id}>
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`cursor-pointer transition-all duration-200 transform hover:-translate-y-1 p-3.5 rounded-xl border flex flex-col items-center text-center w-36 shadow-xs ${node.color} ${
                    isSelected ? 'ring-2 ring-indigo-500 scale-105' : ''
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200/60 mb-2 shadow-xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-xs leading-tight">{node.title}</span>
                  <span className="text-[10px] text-slate-500 mt-1">{node.subtitle}</span>
                </div>

                {index < nodes.length - 1 && (
                  <div className="flex items-center text-slate-400 px-1">
                    <ArrowRight className="w-4 h-4 text-indigo-500 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Evidence Inspection Drawer */}
      {selectedNode && (
        <div className="glass-card p-4 rounded-xl border border-indigo-200 bg-white shadow-md transition-all duration-300">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Inspecting Node:</span>
              <span className="text-sm font-semibold text-slate-900">{selectedNode.title}</span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              ✕ Close
            </button>
          </div>
          <p className="text-xs text-slate-700 mt-2">{selectedNode.description}</p>
          <div className="mt-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Runtime Opcode & State Evidence:</span>
            <pre className="mt-1 p-2.5 rounded-lg bg-slate-900 text-[11px] font-mono text-emerald-300 overflow-x-auto border border-slate-800">
              {JSON.stringify(selectedNode.evidence, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
