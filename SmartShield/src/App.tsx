/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, MainTabType } from './frontend/components/Navbar.tsx';
import { HomePage } from './frontend/components/HomePage.tsx';
import { ScanContractPage } from './frontend/components/ScanContractPage.tsx';
import { SecurityResultsPage } from './frontend/components/SecurityResultsPage.tsx';
import { ReportsPage } from './frontend/components/ReportsPage.tsx';
import { HistoryDrawer, ScanHistoryRecord } from './frontend/components/HistoryDrawer.tsx';
import { HelpDrawer } from './frontend/components/HelpDrawer.tsx';
import { DEMO_CONTRACTS, DemoContract } from './analyzer/examples/demoContracts.ts';
import { AnalysisResult } from './analyzer/models/types.ts';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTabType>('scan');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [showExamplesModal, setShowExamplesModal] = useState<boolean>(false);

  const [files, setFiles] = useState<{ filename: string; content: string }[]>(
    DEMO_CONTRACTS[1].sources // vulnerable_owner.sol
  );
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [compilerVersion, setCompilerVersion] = useState<string>('0.8.20');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryRecord[]>([]);

  const PROGRESS_STEPS = [
    'Parsing source',
    'Building AST',
    'Extracting contracts',
    'Extracting functions',
    'Extracting state variables',
    'Building function graph',
    'Extracting reads/writes',
    'Detecting delegatecall',
    'Detecting sensitive operations',
    'Searching attack paths',
    'Calculating storage layout',
    'Generating candidate paths',
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    // Step progress simulation
    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      setProgressStep(PROGRESS_STEPS[i]);
      await new Promise((r) => setTimeout(r, 35));
    }

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: files,
          compilerVersion,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || 'Failed to complete static analysis');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      // Record in local session scan history
      const historyEntry: ScanHistoryRecord = {
        id: (data as any).analysis_id || 'scan-' + Date.now(),
        contractName: files[0]?.filename || 'Contract.sol',
        timestamp: new Date().toISOString(),
        files,
        result: data,
      };
      setHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);

      // Automatically transition to Security Results
      setActiveTab('results');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err?.message || 'Error occurred during contract static analysis');
    } finally {
      setIsAnalyzing(false);
      setProgressStep(null);
    }
  };

  const handleSelectDemo = (demo: DemoContract) => {
    setFiles(demo.sources);
    setActiveFileIndex(0);
    setCompilerVersion(demo.compilerVersion);
  };

  const handleUploadFileFromHome = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setFiles([{ filename: file.name, content }]);
      setActiveFileIndex(0);
      setActiveTab('scan');
    };
    reader.readAsText(file);
  };

  const handlePasteCodeFromHome = () => {
    setActiveTab('scan');
  };

  const handleRestoreHistory = (record: ScanHistoryRecord) => {
    setFiles(record.files);
    setActiveFileIndex(0);
    setResult(record.result);
    setActiveTab('results');
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  // Perform initial analysis on app load
  useEffect(() => {
    handleAnalyze();
  }, []);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 relative overflow-x-hidden">
      {/* Ambient background gradients for subtle visual depth */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        candidateCount={result?.candidateAttackPaths.length || 0}
        hasAnalysis={!!result}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-3 shadow-lg shadow-rose-950/20">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-200">Analysis Failure:</span>
              <p className="mt-0.5 text-slate-300">{error}</p>
            </div>
          </div>
        )}

        {/* Tab 1: Home */}
        {activeTab === 'home' && (
          <HomePage
            onUploadFile={handleUploadFileFromHome}
            onPasteCode={handlePasteCodeFromHome}
            onSelectDemo={(demo) => {
              handleSelectDemo(demo);
              setActiveTab('scan');
            }}
            onViewAllExamples={() => {
              setActiveTab('scan');
              setShowExamplesModal(true);
            }}
            recentScans={history}
            onOpenRecentScan={handleRestoreHistory}
            onViewAllHistory={() => setIsHistoryOpen(true)}
          />
        )}

        {/* Tab 2: Scan Contract */}
        {activeTab === 'scan' && (
          <ScanContractPage
            files={files}
            setFiles={setFiles}
            activeFileIndex={activeFileIndex}
            setActiveFileIndex={setActiveFileIndex}
            compilerVersion={compilerVersion}
            setCompilerVersion={setCompilerVersion}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            progressStep={progressStep}
            onSelectDemo={handleSelectDemo}
            showExamplesModal={showExamplesModal}
            setShowExamplesModal={setShowExamplesModal}
          />
        )}

        {/* Tab 3: Security Results */}
        {activeTab === 'results' && result && (
          <SecurityResultsPage
            result={result}
            sourceCode={files[activeFileIndex]?.content || files[0]?.content || ''}
            sourceFiles={files}
            onGoToReports={() => setActiveTab('reports')}
            onGoToScan={() => setActiveTab('scan')}
          />
        )}

        {/* Tab 4: Export & Reports */}
        {activeTab === 'reports' && result && (
          <ReportsPage result={result} />
        )}
      </main>

      {/* Secondary Drawers */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onRestore={handleRestoreHistory}
        onDelete={handleDeleteHistory}
        onClear={() => setHistory([])}
      />

      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Clean Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/70 py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">SmartShield</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Static Delegatecall Attack-Path Search & Program Analysis</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
            <span>Read/write data-flow capture algorithm</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Candidate paths require downstream runtime validation</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
