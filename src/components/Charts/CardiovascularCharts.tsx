import React, { useState } from 'react';
import { HistoryDataPoint } from '../../types/cardiac';
import { LineChart, BarChart2, TrendingUp, Clock, Info, Download, Copy, Check, RotateCcw } from 'lucide-react';

interface CardiovascularChartsProps {
  history: HistoryDataPoint[];
  currentHR: number;
  currentCO: number;
  currentSBP: number;
  currentDBP: number;
  onClearHistory: () => void;
  onNotify?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const CardiovascularCharts: React.FC<CardiovascularChartsProps> = ({
  history,
  currentHR,
  currentCO,
  currentSBP,
  currentDBP,
  onClearHistory,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'bp' | 'co' | 'hr'>('bp');
  const [hoveredPoint, setHoveredPoint] = useState<HistoryDataPoint | null>(null);
  const [copied, setCopied] = useState(false);

  // Take the most recent 35 history points
  const points = history.slice(-35);

  // Chart Dimensions
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 25, bottom: 35, left: 50 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Statistical calculations for active metric
  const getStats = () => {
    if (points.length === 0) return { min: 0, max: 0, avg: 0 };
    let values: number[] = [];
    if (activeTab === 'bp') {
      values = points.map((p) => p.systolicBP);
    } else if (activeTab === 'co') {
      values = points.map((p) => p.cardiacOutput);
    } else {
      values = points.map((p) => p.heartRate);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return { min, max, avg };
  };

  const stats = getStats();

  const handleExportCSV = () => {
    if (points.length === 0) return;
    const header = 'Timestamp,Time,HeartRate_BPM,CardiacOutput_Lmin,SystolicBP_mmHg,DiastolicBP_mmHg,PulsePressure_mmHg,MAP_mmHg\n';
    const rows = points
      .map(
        (p) =>
          `${p.timestamp},"${p.time}",${p.heartRate},${p.cardiacOutput.toFixed(2)},${p.systolicBP},${p.diastolicBP},${p.pulsePressure},${p.meanArterialPressure.toFixed(1)}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardiac_simulation_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (onNotify) onNotify('Exported telemetry dataset to CSV file.', 'success');
  };

  const handleCopySummary = () => {
    const text = `Cardiac AI 3D Simulation Summary:
Current HR: ${currentHR} BPM
Current CO: ${currentCO.toFixed(2)} L/min
Current BP: ${currentSBP}/${currentDBP} mmHg (Pulse Pressure: ${currentSBP - currentDBP} mmHg, MAP: ${(currentDBP + (currentSBP - currentDBP) / 3).toFixed(1)} mmHg)
Captured History Samples: ${points.length}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onNotify) onNotify('Copied telemetry summary to clipboard.', 'success');
  };

  // Render SVG Paths
  const renderBPChart = () => {
    if (points.length < 2) return null;
    const minVal = 40;
    const maxVal = 220;

    const getY = (val: number) =>
      padding.top + graphHeight - ((val - minVal) / (maxVal - minVal)) * graphHeight;
    const getX = (idx: number) =>
      padding.left + (idx / (points.length - 1)) * graphWidth;

    const sysPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.systolicBP)}`)
      .join(' ');

    const diaPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.diastolicBP)}`)
      .join(' ');

    const reverseDia = [...points]
      .reverse()
      .map((p, i) => `L ${getX(points.length - 1 - i)} ${getY(p.diastolicBP)}`)
      .join(' ');
    const areaPath = `${sysPath} ${reverseDia} Z`;

    return (
      <g>
        <path d={areaPath} fill="rgba(255, 92, 112, 0.12)" />
        <path d={sysPath} fill="none" stroke="#FF5C70" strokeWidth="2.5" />
        <path d={diaPath} fill="none" stroke="#37D6F5" strokeWidth="2.5" />

        {points.map((p, i) => (
          <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(p)}>
            <circle cx={getX(i)} cy={getY(p.systolicBP)} r="3" fill="#FF5C70" />
            <circle cx={getX(i)} cy={getY(p.diastolicBP)} r="3" fill="#37D6F5" />
          </g>
        ))}
      </g>
    );
  };

  const renderCOChart = () => {
    if (points.length < 2) return null;
    const minVal = 2.0;
    const maxVal = 16.0;

    const getY = (val: number) =>
      padding.top + graphHeight - ((val - minVal) / (maxVal - minVal)) * graphHeight;
    const getX = (idx: number) =>
      padding.left + (idx / (points.length - 1)) * graphWidth;

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.cardiacOutput)}`)
      .join(' ');

    const areaPath = `${linePath} L ${getX(points.length - 1)} ${padding.top + graphHeight} L ${getX(0)} ${padding.top + graphHeight} Z`;

    return (
      <g>
        <path d={areaPath} fill="rgba(55, 214, 245, 0.1)" />
        <path d={linePath} fill="none" stroke="#37D6F5" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(p.cardiacOutput)}
            r="3"
            fill="#37D6F5"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(p)}
          />
        ))}
      </g>
    );
  };

  const renderHRChart = () => {
    if (points.length < 2) return null;
    const minVal = 40;
    const maxVal = 190;

    const getY = (val: number) =>
      padding.top + graphHeight - ((val - minVal) / (maxVal - minVal)) * graphHeight;
    const getX = (idx: number) =>
      padding.left + (idx / (points.length - 1)) * graphWidth;

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.heartRate)}`)
      .join(' ');

    const areaPath = `${linePath} L ${getX(points.length - 1)} ${padding.top + graphHeight} L ${getX(0)} ${padding.top + graphHeight} Z`;

    return (
      <g>
        <path d={areaPath} fill="rgba(255, 92, 112, 0.1)" />
        <path d={linePath} fill="none" stroke="#FF5C70" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(p.heartRate)}
            r="3"
            fill="#FF5C70"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(p)}
          />
        ))}
      </g>
    );
  };

  return (
    <div className="bg-[#101D2D] border border-[#37D6F5]/20 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header and selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#37D6F5]" />
          <div>
            <h3 className="text-base font-tech font-bold text-white tracking-wide">
              Hemodynamic Trend Monitors
            </h3>
            <p className="text-xs text-slate-400">
              Live parameter tracking over simulation adjustments
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab buttons */}
          <div className="flex items-center bg-[#07111F] p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('bp')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'bp'
                  ? 'bg-rose-500/20 text-[#FF5C70] border border-rose-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              BP Trend
            </button>
            <button
              onClick={() => setActiveTab('co')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'co'
                  ? 'bg-[#37D6F5]/20 text-[#37D6F5] border border-[#37D6F5]/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cardiac Output
            </button>
            <button
              onClick={() => setActiveTab('hr')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                activeTab === 'hr'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Heart Rate
            </button>
          </div>

          {/* Action buttons: Export CSV, Copy Summary, Clear */}
          <button
            onClick={handleExportCSV}
            title="Download Telemetry History as CSV"
            className="flex items-center gap-1 text-xs font-mono text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={handleCopySummary}
            title="Copy Telemetry Summary to Clipboard"
            className="flex items-center gap-1 text-xs font-mono text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copy</span>
          </button>

          <button
            onClick={() => {
              onClearHistory();
              if (onNotify) onNotify('Historical trend buffer cleared.', 'info');
            }}
            title="Clear Historical Tracking Buffer"
            className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Statistical Summary Bar */}
      <div className="bg-[#07111F]/70 border border-slate-800 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 text-slate-300">
          <span>
            Min: <strong className="text-white">{stats.min.toFixed(activeTab === 'co' ? 2 : 0)}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Avg: <strong className="text-cyan-400">{stats.avg.toFixed(activeTab === 'co' ? 2 : 0)}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Max: <strong className="text-rose-400">{stats.max.toFixed(activeTab === 'co' ? 2 : 0)}</strong>
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Tracking interval: ~1 sample / parameter update
        </div>
      </div>

      {/* Main Chart SVG */}
      <div className="relative bg-[#07111F] border border-slate-800/90 rounded-xl p-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* Grid lines and Y-axis marks */}
          {activeTab === 'bp' && (
            <>
              {[60, 100, 140, 180, 220].map((v) => {
                const y = padding.top + graphHeight - ((v - 40) / (220 - 40)) * graphHeight;
                return (
                  <g key={v}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1A2838" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
                      {v}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {activeTab === 'co' && (
            <>
              {[3, 6, 9, 12, 15].map((v) => {
                const y = padding.top + graphHeight - ((v - 2.0) / (16.0 - 2.0)) * graphHeight;
                return (
                  <g key={v}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1A2838" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
                      {v} L
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {activeTab === 'hr' && (
            <>
              {[60, 90, 120, 150, 180].map((v) => {
                const y = padding.top + graphHeight - ((v - 40) / (190 - 40)) * graphHeight;
                return (
                  <g key={v}>
                    <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#1A2838" strokeDasharray="3 3" />
                    <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
                      {v}
                    </text>
                  </g>
                );
              })}
            </>
          )}

          {/* Active Chart Line */}
          {activeTab === 'bp' && renderBPChart()}
          {activeTab === 'co' && renderCOChart()}
          {activeTab === 'hr' && renderHRChart()}

          {/* X Axis Time Labels */}
          {points.length > 0 && (
            <>
              <text x={padding.left} y={height - 10} fill="#64748B" fontSize="9" fontFamily="monospace">
                {points[0].time}
              </text>
              <text x={width - padding.right} y={height - 10} textAnchor="end" fill="#64748B" fontSize="9" fontFamily="monospace">
                {points[points.length - 1].time}
              </text>
            </>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-[#101D2D]/95 border border-[#37D6F5]/40 rounded-xl p-3 shadow-2xl text-xs font-mono space-y-1">
            <div className="text-slate-400 text-[10px] flex items-center gap-1 border-b border-slate-700/60 pb-1">
              <Clock className="w-3 h-3 text-[#37D6F5]" />
              Time: {hoveredPoint.time}
            </div>
            <div className="text-white font-bold">
              HR: <span className="text-[#FF5C70]">{hoveredPoint.heartRate} BPM</span>
            </div>
            <div className="text-white">
              CO: <span className="text-[#37D6F5]">{hoveredPoint.cardiacOutput.toFixed(2)} L/min</span>
            </div>
            <div className="text-white">
              BP: <span className="text-rose-400">{hoveredPoint.systolicBP}</span> / <span className="text-cyan-400">{hoveredPoint.diastolicBP} mmHg</span>
            </div>
            <div className="text-slate-400 text-[10px]">
              Pulse Pressure: {hoveredPoint.pulsePressure} mmHg
            </div>
          </div>
        )}
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-1">
        {activeTab === 'bp' && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#FF5C70] rounded-full" />
              Systolic Pressure (Current: {currentSBP} mmHg)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-[#37D6F5] rounded-full" />
              Diastolic Pressure (Current: {currentDBP} mmHg)
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-3 h-3 bg-[#FF5C70]/15 rounded" />
              Pulse Pressure Envelope
            </span>
          </div>
        )}

        {activeTab === 'co' && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#37D6F5] rounded-full" />
            <span>Cardiac Output (L/min) · Current: {currentCO.toFixed(2)} L/min</span>
          </div>
        )}

        {activeTab === 'hr' && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-[#FF5C70] rounded-full" />
            <span>Heart Rate (BPM) · Current: {currentHR} BPM</span>
          </div>
        )}

        <div className="text-[11px] text-slate-500">
          Showing {points.length} captured snapshots
        </div>
      </div>
    </div>
  );
};
