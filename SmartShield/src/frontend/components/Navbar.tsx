/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Clock, HelpCircle, Activity } from 'lucide-react';

export type MainTabType = 'home' | 'scan' | 'results' | 'reports';

interface NavbarProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  candidateCount: number;
  hasAnalysis: boolean;
  historyCount: number;
  onOpenHistory: () => void;
  onOpenHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  candidateCount,
  hasAnalysis,
  historyCount,
  onOpenHistory,
  onOpenHelp,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/70 text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none group"
            onClick={() => setActiveTab('home')}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:border-blue-400/60 transition-all duration-200">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="font-extrabold tracking-tight text-base text-white group-hover:text-cyan-200 transition-colors">
              SmartShield
            </span>
          </div>

          {/* Primary 4-Tab Navigation */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 p-1 bg-slate-900/70 rounded-xl border border-slate-800/60">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'home'
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              HOME
            </button>

            <button
              onClick={() => setActiveTab('scan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'scan'
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm shadow-cyan-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              SCAN CONTRACT
            </button>

            <button
              onClick={() => hasAnalysis && setActiveTab('results')}
              disabled={!hasAnalysis}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'results'
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm shadow-cyan-950/50'
                  : !hasAnalysis
                  ? 'text-slate-600 cursor-not-allowed border border-transparent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span>SECURITY RESULTS</span>
              {hasAnalysis && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono tabular-nums leading-none ${
                    candidateCount > 0
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {candidateCount}
                </span>
              )}
            </button>

            <button
              onClick={() => hasAnalysis && setActiveTab('reports')}
              disabled={!hasAnalysis}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm shadow-cyan-950/50'
                  : !hasAnalysis
                  ? 'text-slate-600 cursor-not-allowed border border-transparent'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              REPORTS & EXPORT
            </button>
          </nav>

          {/* Secondary Utilities: History & Help */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenHistory}
              title="Recent Scans"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer text-xs font-medium"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">HISTORY</span>
              {historyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-950/80 text-[10px] text-cyan-300 font-mono tabular-nums border border-blue-800/50 leading-none">
                  {historyCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenHelp}
              title="Methodology & Documentation"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition cursor-pointer text-xs font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">METHODOLOGY</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
