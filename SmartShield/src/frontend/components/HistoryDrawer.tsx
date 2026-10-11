/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, X, RotateCcw, Trash2, CheckCircle2, FileCode, ChevronRight } from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

export interface ScanHistoryRecord {
  id: string;
  contractName: string;
  timestamp: string;
  files: { filename: string; content: string }[];
  result: AnalysisResult;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ScanHistoryRecord[];
  onRestore: (item: ScanHistoryRecord) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onRestore,
  onDelete,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800/80 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Recent Scans</h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 tabular-nums">
              {history.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {history.length > 0 && (
              <button
                onClick={onClear}
                className="text-[11px] text-slate-400 hover:text-rose-400 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-800/70 transition cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-20 text-slate-500 space-y-3">
              <Clock className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
              <p className="text-xs font-semibold text-slate-400">No previous scans in this session.</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Run an analysis on any contract to automatically preserve candidates and trace metadata here.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-blue-500/40 transition-all space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate mr-2">
                    <div className="flex items-center space-x-2">
                      <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-mono text-xs font-bold text-white block truncate group-hover:text-cyan-300 transition-colors">
                        {item.contractName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-900">
                  <div className="space-x-2 text-slate-400 font-mono text-[10px] tabular-nums">
                    <span>{item.result.summary.delegatecallCount} DC</span>
                    <span className="text-slate-600">·</span>
                    <span className={item.result.candidateAttackPaths.length > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {item.result.candidateAttackPaths.length} Candidate Paths
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onRestore(item);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1.5 border border-slate-700/80 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Open Scan</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
