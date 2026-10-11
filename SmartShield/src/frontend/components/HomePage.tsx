/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Shield,
  Upload,
  Clock,
  ChevronRight,
  FileCode,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DEMO_CONTRACTS, DemoContract } from '../../analyzer/examples/demoContracts.ts';
import { ScanHistoryRecord } from './HistoryDrawer.tsx';

interface HomePageProps {
  onUploadFile: (file: File) => void;
  onPasteCode: () => void;
  onSelectDemo: (demo: DemoContract) => void;
  onViewAllExamples: () => void;
  recentScans: ScanHistoryRecord[];
  onOpenRecentScan: (scan: ScanHistoryRecord) => void;
  onViewAllHistory: () => void;
}

/**
 * Animated interactive EVM Proxy Network canvas representing delegatecall
 * message dispatch, storage context, and attack path tracing with subtle parallax.
 */
const NetworkCanvas: React.FC<{ mousePos: { x: number; y: number } }> = ({ mousePos }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };
    window.addEventListener('resize', handleResize);

    // Nodes representing EVM Proxy Architecture
    const baseNodes = [
      { id: 'caller', label: 'Caller', rx: 0.15, ry: 0.45, color: '#38bdf8' },
      { id: 'proxy', label: 'Proxy', rx: 0.38, ry: 0.3, color: '#60a5fa' },
      { id: 'delegate', label: 'delegatecall', rx: 0.62, ry: 0.3, color: '#a855f7' },
      { id: 'logic', label: 'Logic Impl', rx: 0.85, ry: 0.45, color: '#c084fc' },
      { id: 'storage', label: 'Slot 0 (Owner)', rx: 0.5, ry: 0.75, color: '#f43f5e' },
    ];

    const edges = [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 2, to: 4 }, // delegatecall executing in proxy storage context!
      { from: 1, to: 4 },
    ];

    // Traveling pulse packets
    const packets = [
      { edge: 0, progress: 0.1, speed: 0.007, color: '#38bdf8' },
      { edge: 1, progress: 0.5, speed: 0.009, color: '#a855f7' },
      { edge: 2, progress: 0.2, speed: 0.008, color: '#c084fc' },
      { edge: 3, progress: 0.7, speed: 0.011, color: '#f43f5e' }, // red alert packet to slot 0
    ];

    let t = 0;

    const render = () => {
      t += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Subtle parallax offset based on mouse position
      const px = (mousePos.x - 0.5) * 20 * window.devicePixelRatio;
      const py = (mousePos.y - 0.5) * 15 * window.devicePixelRatio;

      const computedNodes = baseNodes.map((n, i) => {
        const floatY = Math.sin(t + i * 1.3) * 6 * window.devicePixelRatio;
        const floatX = Math.cos(t * 0.7 + i) * 4 * window.devicePixelRatio;
        return {
          ...n,
          x: n.rx * width + px * (0.8 + i * 0.2) + floatX,
          y: n.ry * height + py * (0.8 + i * 0.2) + floatY,
        };
      });

      // Draw Edges
      edges.forEach((e) => {
        const n1 = computedNodes[e.from];
        const n2 = computedNodes[e.to];

        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1.5 * window.devicePixelRatio;
        ctx.stroke();

        // Subtle glow line
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.08)';
        ctx.lineWidth = 4 * window.devicePixelRatio;
        ctx.stroke();
      });

      // Draw Packets (traveling pulses)
      packets.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const edge = edges[p.edge];
        const n1 = computedNodes[edge.from];
        const n2 = computedNodes[edge.to];
        const cx = n1.x + (n2.x - n1.x) * p.progress;
        const cy = n1.y + (n2.y - n1.y) * p.progress;

        // Packet glow
        const rad = 3.5 * window.devicePixelRatio;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 3);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Nodes
      computedNodes.forEach((n) => {
        const radius = 5 * window.devicePixelRatio;

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}15`;
        ctx.fill();

        // Core circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 10 * window.devicePixelRatio;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label
        ctx.font = `${Math.round(10 * window.devicePixelRatio)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + radius * 3.4);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
    />
  );
};

export const HomePage: React.FC<HomePageProps> = ({
  onUploadFile,
  onPasteCode,
  onSelectDemo,
  onViewAllExamples,
  recentScans,
  onOpenRecentScan,
  onViewAllHistory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFile(e.target.files[0]);
    }
  };

  // 3D Parallax tilt transform calculation for central hero card
  const tiltX = (mousePos.y - 0.5) * -8;
  const tiltY = (mousePos.x - 0.5) * 8;

  return (
    <div
      onMouseMove={handleMouseMove}
      className="space-y-14 max-w-4xl mx-auto pb-16 relative"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".sol,.txt"
        className="hidden"
      />

      {/* Layered Animated Hero Section */}
      <div className="relative pt-4 pb-2 text-center space-y-6">
        {/* Interactive EVM Network Canvas Background */}
        <div className="absolute inset-0 -top-8 -bottom-8 rounded-3xl overflow-hidden pointer-events-none -z-10">
          <NetworkCanvas mousePos={mousePos} />
        </div>

        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-blue-500/15 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Brand Kicker with subtle elevation */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-blue-500/30 text-cyan-300 text-xs font-semibold tracking-wide shadow-lg shadow-blue-950/40 backdrop-blur-md">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>Solidity Delegatecall Attack-Path Search</span>
        </div>

        {/* Headline with balanced tracking and gradient */}
        <div className="space-y-3 relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight text-balance">
            Verify Delegatecall Security{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              Before Deployment
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed text-balance">
            Trace storage collisions, read-write state flows, and caller-controlled execution paths across proxy architectures with mathematical precision.
          </p>
        </div>

        {/* Central Upload Card with Layered 3D Perspective */}
        <div
          style={{
            transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="max-w-xl mx-auto bg-slate-900/95 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/30 relative overflow-hidden backdrop-blur-md group"
        >
          {/* Subtle perimeter glow accent */}
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Action CTAs */}
          <div className="flex items-center justify-center gap-3 mb-6 relative z-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs tracking-wide transition shadow-lg shadow-blue-600/25 flex items-center space-x-2 cursor-pointer active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Contract (.sol)</span>
            </button>

            <button
              onClick={onPasteCode}
              className="px-5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 font-semibold text-xs tracking-wide transition border border-slate-700/80 flex items-center space-x-2 cursor-pointer active:scale-[0.98]"
            >
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Paste Solidity</span>
            </button>
          </div>

          {/* Interactive Dashed Dropzone with Elevation */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer relative z-10 group/drop ${
              isDragging
                ? 'border-cyan-400 bg-cyan-500/15 scale-[1.01]'
                : 'border-slate-700/80 bg-slate-950/70 hover:border-cyan-500/50 hover:bg-slate-950/90 hover:shadow-lg'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover/drop:scale-105 group-hover/drop:border-cyan-400/60 transition-transform">
              <Upload className="w-5 h-5 text-cyan-400" />
            </div>

            <h3 className="text-sm font-bold text-white tracking-wide">
              Drop Solidity files here
            </h3>

            <p className="text-xs text-slate-400 mt-1.5 font-normal">
              Drag & drop your <span className="text-cyan-400 font-mono font-medium">.sol</span> files or click to browse local files
            </p>
          </div>

          {/* Clean Unboxed Metadata Separators */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center space-x-3 text-xs text-slate-400 relative z-10 font-medium">
            <span>Static Analysis Engine</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>AST Normalization</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>Zero Remote Execution</span>
          </div>
        </div>
      </div>

      {/* Reference Scenarios with subtle 3D hover depth */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Explore Reference Scenarios
          </span>
          <button
            onClick={onViewAllExamples}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline-offset-4 hover:underline cursor-pointer"
          >
            View all 8 contract models →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Example 1: Safe Proxy */}
          <div
            onClick={() => onSelectDemo(DEMO_CONTRACTS[0])}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/20 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-emerald-400">BENIGN PATTERN</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
              Safe Proxy Contract
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Standard upgradeable proxy with separated storage slots and owner guards.
            </p>
          </div>

          {/* Example 2: Vulnerable Owner */}
          <div
            onClick={() => onSelectDemo(DEMO_CONTRACTS[1])}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/40 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-950/20 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-rose-400">CRITICAL OVERWRITE</span>
              <span className="w-2 h-2 rounded-full bg-rose-400/80" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
              Owner Control Overwrite
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Storage collision on Slot 0 enabling attacker to hijack contract ownership.
            </p>
          </div>

          {/* Example 3: Ether Transfer */}
          <div
            onClick={() => onSelectDemo(DEMO_CONTRACTS[2])}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-950/20 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-semibold text-amber-400">SENSITIVE SINK</span>
              <span className="w-2 h-2 rounded-full bg-amber-400/80" />
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
              Ether Transfer Path
            </h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Arbitrary delegatecall modifies recipient balance variables triggering drain.
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Pipeline Architecture with Step Elevation */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="text-center space-y-1">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Analysis Pipeline Architecture
          </h3>
          <p className="text-xs text-slate-400">
            5-stage static verification cycle inspired by academic delegatecall research
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 text-center transition">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">01. PARSE</span>
            <span className="text-xs text-white font-bold block">AST Extraction</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Solidity tree parser</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-blue-500/40 text-center transition">
            <span className="text-[10px] font-mono text-blue-400 block mb-1">02. MAP</span>
            <span className="text-xs text-white font-bold block">Data-Flow Matrix</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Reads & writes per func</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/40 text-center transition">
            <span className="text-[10px] font-mono text-cyan-400 block mb-1">03. DETECT</span>
            <span className="text-xs text-white font-bold block">Delegatecall Sinks</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Low-level target flow</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-rose-500/40 text-center transition">
            <span className="text-[10px] font-mono text-rose-400 block mb-1">04. SEARCH</span>
            <span className="text-xs text-white font-bold block">Attack Paths</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Storage collision trace</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-emerald-500/40 text-center transition">
            <span className="text-[10px] font-mono text-emerald-400 block mb-1">05. HANDOFF</span>
            <span className="text-xs text-white font-bold block">Audit Package</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">JSON & Markdown report</span>
          </div>
        </div>
      </div>

      {/* Recent Scans Section */}
      {recentScans.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recent Scans in Current Session</span>
            </h3>

            <button
              onClick={onViewAllHistory}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold underline-offset-4 hover:underline cursor-pointer"
            >
              View scan history ({recentScans.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentScans.slice(0, 4).map((scan) => (
              <div
                key={scan.id}
                onClick={() => onOpenRecentScan(scan)}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-blue-500/40 hover:bg-slate-900 hover:-translate-y-0.5 hover:shadow-lg transition cursor-pointer flex items-center justify-between group"
              >
                <div className="truncate mr-3">
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-mono text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                      {scan.contractName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
                    <span>
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={scan.result.candidateAttackPaths.length > 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                      {scan.result.candidateAttackPaths.length} candidate path{scan.result.candidateAttackPaths.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
