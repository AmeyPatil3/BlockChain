/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, FileCode, Flame, Share2, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

export interface HistoryItem {
  id: string;
  contractName: string;
  timestamp: string;
  files: { filename: string; content: string }[];
  result: AnalysisResult;
}

interface ScanHistoryTabProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onClear: () => void;
}

export const ScanHistoryTab: React.FC<ScanHistoryTabProps> = ({ history, onRestore, onClear }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>Local Session Scan History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review past contract analyses from this session and restore any result with one click.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Previous Scans</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Run an analysis on any contract to start recording your scan history for this session.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-white text-base font-mono">
                    {item.contractName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Completed
                  </span>
                </div>
                <div className="text-xs text-slate-400 flex items-center space-x-4">
                  <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>{item.result.summary.delegatecallCount} Delegatecalls</span>
                  <span>•</span>
                  <span className="text-rose-400 font-semibold font-mono">
                    {item.result.candidateAttackPaths.length} Candidate Paths
                  </span>
                </div>
              </div>

              <button
                onClick={() => onRestore(item)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 hover:border-blue-500 transition flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Scan</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
