import React from 'react';
import { SimulationState, BaselineState } from '../../types/cardiac';
import { 
  Bookmark, 
  RotateCcw, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  Trash2,
  Sliders,
  Scale
} from 'lucide-react';

interface BaselineComparisonProps {
  currentState: SimulationState;
  baseline: BaselineState | null;
  onSaveBaseline: () => void;
  onRestoreBaseline: () => void;
  onClearBaseline?: () => void;
  onResetToDefaults: () => void;
  onNotify?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const BaselineComparison: React.FC<BaselineComparisonProps> = ({
  currentState,
  baseline,
  onSaveBaseline,
  onRestoreBaseline,
  onClearBaseline,
  onResetToDefaults,
  onNotify,
}) => {
  // Delta calculations
  const hrDiff = baseline ? currentState.heartRate - baseline.heartRate : 0;
  const svDiff = baseline ? currentState.strokeVolume - baseline.strokeVolume : 0;
  const coDiff = baseline ? currentState.cardiacOutput - baseline.cardiacOutput : 0;
  const coPct = baseline && baseline.cardiacOutput > 0 ? (coDiff / baseline.cardiacOutput) * 100 : 0;
  const sbpDiff = baseline ? currentState.systolicBP - baseline.systolicBP : 0;
  const dbpDiff = baseline ? currentState.diastolicBP - baseline.diastolicBP : 0;
  const ppDiff = baseline ? currentState.pulsePressure - baseline.pulsePressure : 0;
  const mapDiff = baseline ? currentState.meanArterialPressure - baseline.meanArterialPressure : 0;

  const renderDeltaBadge = (diff: number, unit: string) => {
    if (Math.abs(diff) < 0.01) {
      return (
        <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <Minus className="w-3 h-3" /> Baseline Level
        </span>
      );
    }
    const isUp = diff > 0;
    const sign = isUp ? '+' : '';
    const color = isUp ? 'text-cyan-400' : 'text-amber-400';

    return (
      <span className={`flex items-center gap-1 text-[11px] font-mono font-bold ${color}`}>
        {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        {sign}{diff.toFixed(diff % 1 === 0 ? 0 : 2)} {unit}
      </span>
    );
  };

  return (
    <div className="bg-[#101D2D] border border-[#37D6F5]/20 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Top action row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div>
          <h3 className="text-base font-tech font-bold text-white tracking-wide flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#37D6F5]" />
            Baseline Scenario Comparison
          </h3>
          <p className="text-xs text-slate-400">
            Compare hemodynamic modifications against a captured physiological baseline
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              onSaveBaseline();
              if (onNotify) onNotify('Saved current simulation state as active baseline snapshot.', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#37D6F5] hover:bg-[#20b8d6] text-slate-950 rounded-xl text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {baseline ? 'Update Baseline' : 'Save As Baseline'}
          </button>

          {baseline && (
            <>
              <button
                onClick={() => {
                  onRestoreBaseline();
                  if (onNotify) onNotify('Restored simulation parameters from saved baseline.', 'info');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#37D6F5]" />
                Restore Baseline
              </button>

              {onClearBaseline && (
                <button
                  onClick={() => {
                    onClearBaseline();
                    if (onNotify) onNotify('Baseline snapshot cleared.', 'info');
                  }}
                  title="Clear baseline snapshot"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-mono transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => {
              onResetToDefaults();
              if (onNotify) onNotify('Reset all parameters to physiological defaults (72 BPM, 120/80 mmHg).', 'info');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-mono transition cursor-pointer"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {!baseline ? (
        <div className="text-center py-8 bg-[#07111F]/50 border border-dashed border-slate-800 rounded-xl p-6">
          <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No Baseline Snapshot Saved</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Click "Save As Baseline" above to bookmark the current heart parameters ({currentState.heartRate} BPM, {currentState.systolicBP}/{currentState.diastolicBP} mmHg), then adjust the sliders to analyze physiological deltas in real-time.
          </p>
          <button
            onClick={() => {
              onSaveBaseline();
              if (onNotify) onNotify(`Saved baseline snapshot at ${new Date().toLocaleTimeString()}`, 'success');
            }}
            className="px-4 py-2 bg-[#37D6F5]/20 hover:bg-[#37D6F5]/30 text-[#37D6F5] border border-[#37D6F5]/40 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Save Current ({currentState.heartRate} BPM / {currentState.systolicBP}/{currentState.diastolicBP} mmHg) as Baseline
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#07111F]/70 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              Baseline Snapshot Active (Saved at {baseline.savedAt})
            </span>
            <span className="text-slate-400">
              Baseline: {baseline.heartRate} BPM · SV: {baseline.strokeVolume} mL · CO: {baseline.cardiacOutput.toFixed(2)} L/min · BP: {baseline.systolicBP}/{baseline.diastolicBP}
            </span>
          </div>

          {/* Comparison Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cardiac Output Delta */}
            <div className="bg-[#07111F]/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-medium text-slate-400">Cardiac Output (CO)</div>
              <div className="flex items-baseline justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-mono">Baseline: {baseline.cardiacOutput.toFixed(2)} L/min</div>
                  <div className="text-lg font-mono font-bold text-white">
                    {currentState.cardiacOutput.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-400">L/min</span>
                  </div>
                </div>
                <div>{renderDeltaBadge(coDiff, 'L/min')}</div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                <span>Percentage Change:</span>
                <span className={coPct >= 0 ? 'text-[#37D6F5] font-semibold' : 'text-amber-400 font-semibold'}>
                  {coPct >= 0 ? '+' : ''}{coPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Pulse Pressure Delta */}
            <div className="bg-[#07111F]/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-medium text-slate-400">Pulse Pressure (PP)</div>
              <div className="flex items-baseline justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-mono">Baseline: {baseline.pulsePressure} mmHg</div>
                  <div className="text-lg font-mono font-bold text-[#FF5C70]">
                    {currentState.pulsePressure}{' '}
                    <span className="text-xs font-normal text-slate-400">mmHg</span>
                  </div>
                </div>
                <div>{renderDeltaBadge(ppDiff, 'mmHg')}</div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                <span>Vascular Compliance Index:</span>
                <span className="text-slate-300 font-mono">
                  {currentState.pulsePressure > 50 ? 'Stiff / Elevated' : 'Optimal Elasticity'}
                </span>
              </div>
            </div>

            {/* Mean Arterial Pressure Delta */}
            <div className="bg-[#07111F]/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-medium text-slate-400">Mean Arterial Pressure (MAP)</div>
              <div className="flex items-baseline justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs text-slate-500 font-mono">Baseline: {baseline.meanArterialPressure.toFixed(1)} mmHg</div>
                  <div className="text-lg font-mono font-bold text-[#37D6F5]">
                    {currentState.meanArterialPressure.toFixed(1)}{' '}
                    <span className="text-xs font-normal text-slate-400">mmHg</span>
                  </div>
                </div>
                <div>{renderDeltaBadge(mapDiff, 'mmHg')}</div>
              </div>
              <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                <span>Perfusion Target:</span>
                <span className="text-emerald-400 font-mono">
                  {currentState.meanArterialPressure >= 65 && currentState.meanArterialPressure <= 105 ? 'Adequate (65-105)' : 'Out of Normal Range'}
                </span>
              </div>
            </div>
          </div>

          {/* Mathematical Step-by-Step Breakdown */}
          <div className="bg-[#0B1726] border border-[#37D6F5]/20 rounded-xl p-4 space-y-3">
            <h5 className="text-xs font-tech font-bold text-[#37D6F5] uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Transparent Mathematical Calculations
            </h5>
            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="p-2.5 rounded-lg bg-[#07111F] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span>Cardiac Output Formula:</span>
                <span className="text-slate-400">
                  CO = {currentState.heartRate} BPM × {currentState.strokeVolume} mL ÷ 1000 = <strong className="text-white">{currentState.cardiacOutput.toFixed(2)} L/min</strong>
                  {' '}(vs Baseline {baseline.cardiacOutput.toFixed(2)} L/min &rarr; {coDiff >= 0 ? '+' : ''}{coDiff.toFixed(2)} L/min, {coPct >= 0 ? '+' : ''}{coPct.toFixed(1)}%)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07111F] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span>Pulse Pressure Formula:</span>
                <span className="text-slate-400">
                  PP = {currentState.systolicBP} mmHg − {currentState.diastolicBP} mmHg = <strong className="text-[#FF5C70]">{currentState.pulsePressure} mmHg</strong>
                  {' '}(vs Baseline {baseline.pulsePressure} mmHg &rarr; {ppDiff >= 0 ? '+' : ''}{ppDiff} mmHg)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#07111F] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span>Mean Arterial Pressure (MAP):</span>
                <span className="text-slate-400">
                  MAP = {currentState.diastolicBP} + ({currentState.pulsePressure} ÷ 3) = <strong className="text-[#37D6F5]">{currentState.meanArterialPressure.toFixed(1)} mmHg</strong>
                  {' '}(vs Baseline {baseline.meanArterialPressure.toFixed(1)} mmHg &rarr; {mapDiff >= 0 ? '+' : ''}{mapDiff.toFixed(1)} mmHg)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
