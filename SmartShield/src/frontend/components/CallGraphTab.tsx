/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Network, Download, ArrowRight, CornerDownRight, Layers, FileCode } from 'lucide-react';
import { AnalysisResult } from '../../analyzer/models/types.ts';

interface CallGraphTabProps {
  result: AnalysisResult;
}

export const CallGraphTab: React.FC<CallGraphTabProps> = ({ result }) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const edges = result.ir.calls;
  const functions = result.ir.functions;

  // Build node details
  const nodes = functions.map((f) => ({
    key: `${f.contract}.${f.name}`,
    name: f.name,
    contract: f.contract,
    calledFunctions: f.calledFunctions,
    calledBy: f.calledBy,
    visibility: f.visibility,
    writes: f.writes,
    reads: f.reads,
  }));

  const handleExportJSON = () => {
    const graphData = {
      nodes: nodes.map((n) => ({
        id: n.key,
        name: n.name,
        contract: n.contract,
        visibility: n.visibility,
        reads: n.reads,
        writes: n.writes,
      })),
      edges: edges.map((e) => ({
        source: e.from,
        target: e.to,
        type: e.type,
      })),
    };

    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'function-call-graph.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeNodeDetails = nodes.find((n) => n.key === selectedNode);

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Network className="w-5 h-5 text-indigo-400" />
            <span>Function Call Graph & Invocations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Directed function invocation relationships representing internal calls, modifier execution, and cross-contract edges.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Graph JSON</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Graph Nodes & Edge Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph Nodes List / Visual Representation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-xl min-h-[450px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 text-xs text-slate-400 font-mono">
              <span>{nodes.length} Function Nodes</span>
              <span>{edges.length} Directed Call Edges</span>
            </div>

            {/* Edge Cards Visual Map */}
            {edges.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Network className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  No internal or external function-to-function calls detected in the analyzed AST.
                </p>
                <p className="text-[11px] text-slate-600">
                  Functions may be self-contained or relying on delegatecalls/fallbacks.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {edges.map((edge, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedNode(edge.from)}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span className="uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {edge.type}
                      </span>
                      <span>Edge #{idx + 1}</span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs text-white">
                      <span className="font-bold text-blue-400 group-hover:text-blue-300">
                        {edge.from}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-bold text-cyan-400 group-hover:text-cyan-300">
                        {edge.to}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All Discovered Function Nodes */}
            <div className="mt-8 pt-6 border-t border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                All Extracted Function Nodes (Click for Adjacency)
              </h4>
              <div className="flex flex-wrap gap-2">
                {nodes.map((node) => (
                  <button
                    key={node.key}
                    onClick={() => setSelectedNode(node.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition cursor-pointer flex items-center space-x-1.5 ${
                      selectedNode === node.key
                        ? 'bg-blue-600 text-white border-blue-400 font-bold shadow-md shadow-blue-500/20'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <FileCode className="w-3 h-3 text-cyan-400" />
                    <span>{node.key}()</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Node Detail Inspector */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Node Adjacency Inspector</span>
            </h3>

            {activeNodeDetails ? (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Selected Function</span>
                  <div className="text-sm font-bold text-cyan-400 mt-0.5">
                    {activeNodeDetails.key}()
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Visibility: <span className="uppercase text-slate-200">{activeNodeDetails.visibility}</span>
                  </div>
                </div>

                {/* Called Functions (Outgoing Edges) */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Outgoing Calls ({activeNodeDetails.calledFunctions.length}):</span>
                  </div>
                  {activeNodeDetails.calledFunctions.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic">No outgoing calls.</div>
                  ) : (
                    <ul className="space-y-1">
                      {activeNodeDetails.calledFunctions.map((fn) => (
                        <li key={fn} className="text-slate-300">
                          ↳ {fn}()
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Called By (Incoming Edges) */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-400 flex items-center space-x-1">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    <span>Incoming Callers ({activeNodeDetails.calledBy.length}):</span>
                  </div>
                  {activeNodeDetails.calledBy.length === 0 ? (
                    <div className="text-[11px] text-slate-500 italic">No incoming callers.</div>
                  ) : (
                    <ul className="space-y-1">
                      {activeNodeDetails.calledBy.map((fn) => (
                        <li key={fn} className="text-slate-300">
                          ← {fn}()
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* State Variables Touched */}
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-300">State Variable Interactions:</div>
                  <div className="text-slate-400">
                    Writes: <span className="text-rose-400 font-bold">{activeNodeDetails.writes.join(', ') || 'None'}</span>
                  </div>
                  <div className="text-slate-400">
                    Reads: <span className="text-emerald-400">{activeNodeDetails.reads.join(', ') || 'None'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500 italic">
                Select any function node or call edge on the left to inspect its incoming and outgoing relationships.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
