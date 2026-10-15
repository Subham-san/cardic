import React from 'react';
import { SimulationState, BaselineState, PRESET_SCENARIOS } from '../../types/cardiac';
import { HeartScene } from '../Heart/HeartScene';
import { ECGMonitor } from '../ECG/ECGMonitor';
import { BaselineComparison } from '../Simulation/BaselineComparison';
import { 
  Heart, 
  Droplets, 
  Activity, 
  Gauge, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Minus, 
  BookOpen,
  Zap,
  RotateCcw
} from 'lucide-react';

interface OverviewTabProps {
  state: SimulationState;
  baseline: BaselineState | null;
  onUpdateParam: (key: keyof SimulationState, value: number) => void;
  onResetParam: (key: keyof SimulationState) => void;
  onResetAll: () => void;
  onLoadScenario: (scenario: Partial<SimulationState>) => void;
  onSaveBaseline: () => void;
  onRestoreBaseline: () => void;
  onNavigateTab: (tabId: string) => void;
  onTogglePlay: () => void;
  onToggleBloodFlow: () => void;
  onChangeBloodFlowSpeed: (speed: number) => void;
  onToggleLabels: () => void;
  onChangeViewMode: (mode: 'standard' | 'xray' | 'flowOnly') => void;
  onSelectChamber: (id: string | null) => void;
  onNotify?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  state,
  baseline,
  onUpdateParam,
  onResetParam,
  onResetAll,
  onLoadScenario,
  onSaveBaseline,
  onRestoreBaseline,
  onNavigateTab,
  onTogglePlay,
  onToggleBloodFlow,
  onChangeBloodFlowSpeed,
  onToggleLabels,
  onChangeViewMode,
  onSelectChamber,
  onNotify,
}) => {
  // Clamp helpers for micro-step adjustments
  const stepHR = (delta: number) => {
    const next = Math.max(40, Math.min(180, state.heartRate + delta));
    onUpdateParam('heartRate', next);
  };

  const stepSV = (delta: number) => {
    const next = Math.max(40, Math.min(140, state.strokeVolume + delta));
    onUpdateParam('strokeVolume', next);
  };

  const stepBP = (delta: number) => {
    const nextSys = Math.max(80, Math.min(220, state.systolicBP + delta));
    onUpdateParam('systolicBP', nextSys);
    if (nextSys <= state.diastolicBP + 10) {
      onUpdateParam('diastolicBP', Math.max(40, nextSys - 15));
    }
  };

  // Classifications
  const hrClassification = 
    state.heartRate < 60 ? { label: 'Bradycardia (<60)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' } :
    state.heartRate > 100 ? { label: 'Tachycardia (>100)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' } :
    { label: 'Normal Sinus Rhythm', color: 'text-[#10B981] bg-emerald-500/10 border-emerald-500/30' };

  const bpClassification = 
    state.systolicBP >= 140 || state.diastolicBP >= 90 ? { label: 'Stage 2 Hypertension', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' } :
    state.systolicBP >= 130 || state.diastolicBP >= 80 ? { label: 'Stage 1 Hypertension', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' } :
    state.systolicBP >= 120 ? { label: 'Elevated Systolic', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' } :
    state.systolicBP < 90 ? { label: 'Hypotension (<90)', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' } :
    { label: 'Optimal Normotensive', color: 'text-[#10B981] bg-emerald-500/10 border-emerald-500/30' };

  return (
    <div className="space-y-6">
      {/* 4 Summary Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className="bg-[#101D2D] border border-[#FF5C70]/30 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-[#FF5C70]/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#FF5C70]" />
              Heart Rate (HR)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => stepHR(-5)}
                className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="Decrease 5 BPM"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => stepHR(5)}
                className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="Increase 5 BPM"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-white tracking-tight">
              {state.heartRate}
            </span>
            <span className="text-xs font-mono text-slate-400">BPM</span>
          </div>

          {/* Mini Range Indicator */}
          <div className="mt-2">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-[#10B981] to-rose-400 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, ((state.heartRate - 40) / 140) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>40</span>
              <span className="text-[#10B981]">60–100 (Normal)</span>
              <span>180</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-400">Status:</span>
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${hrClassification.color}`}>
              {hrClassification.label}
            </span>
          </div>
        </div>

        {/* Stroke Volume */}
        <div className="bg-[#101D2D] border border-[#37D6F5]/30 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-[#37D6F5]/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#37D6F5]" />
              Stroke Volume (SV)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => stepSV(-5)}
                className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="Decrease 5 mL"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => stepSV(5)}
                className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="Increase 5 mL"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-white tracking-tight">
              {state.strokeVolume}
            </span>
            <span className="text-xs font-mono text-slate-400">mL/beat</span>
          </div>

          {/* Mini Range Indicator */}
          <div className="mt-2">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#37D6F5] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, ((state.strokeVolume - 40) / 100) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>40</span>
              <span className="text-[#37D6F5]">65–85 (Normal)</span>
              <span>140</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-400">Ejection Index:</span>
            <span className="text-[#37D6F5] font-semibold text-[10px]">
              {(state.strokeVolume / 1.2).toFixed(0)}% Eff. Fraction
            </span>
          </div>
        </div>

        {/* Cardiac Output */}
        <div className="bg-[#101D2D] border border-emerald-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Cardiac Output (CO)
            </span>
            <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              HR × SV
            </span>
          </div>
          
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-emerald-400 tracking-tight">
              {state.cardiacOutput.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-400">L/min</span>
          </div>

          {/* Mini Range Indicator */}
          <div className="mt-2">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, ((state.cardiacOutput - 2.0) / 14.0) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>2.0</span>
              <span className="text-emerald-400">4.5–7.0 (Resting)</span>
              <span>16.0</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-400">Total Perfusion:</span>
            <span className="text-emerald-300 font-semibold text-[10px]">
              {(state.cardiacOutput * 60).toFixed(0)} L/hour
            </span>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="bg-[#101D2D] border border-indigo-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-indigo-500/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              Blood Pressure (BP)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => stepBP(-5)}
                className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="Decrease 5 mmHg"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => stepBP(5)}
                className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                title="Increase 5 mmHg"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-white tracking-tight">
              {state.systolicBP}/{state.diastolicBP}
            </span>
            <span className="text-xs font-mono text-slate-400">mmHg</span>
          </div>

          {/* Mini Range Indicator */}
          <div className="mt-2">
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-rose-400 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, ((state.systolicBP - 80) / 140) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>80</span>
              <span className="text-indigo-300">MAP {state.meanArterialPressure.toFixed(0)}</span>
              <span>220</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono border-t border-slate-800/80 pt-2">
            <span className="text-slate-400">Category:</span>
            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-medium ${bpClassification.color}`}>
              {bpClassification.label}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Clinical Scenarios Pills */}
      <div className="bg-[#101D2D]/80 border border-[#37D6F5]/15 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
          <Zap className="w-4 h-4 text-[#37D6F5]" />
          <span className="font-semibold text-white">Preset Scenarios:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_SCENARIOS.map((sc) => {
            const isSelected = 
              state.heartRate === sc.state.heartRate && 
              state.strokeVolume === sc.state.strokeVolume &&
              state.systolicBP === sc.state.systolicBP;

            return (
              <button
                key={sc.name}
                onClick={() => {
                  onLoadScenario(sc.state);
                  if (onNotify) onNotify(`Loaded scenario: ${sc.name}`, 'success');
                }}
                className={`px-3 py-1 rounded-xl text-xs font-mono transition cursor-pointer border ${
                  isSelected
                    ? 'bg-[#37D6F5] text-slate-950 font-bold border-[#37D6F5] shadow-md'
                    : 'bg-[#07111F] text-slate-300 border-slate-800 hover:border-[#37D6F5]/40 hover:text-white'
                }`}
              >
                {sc.name.split(' (')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3D Visualization Arena & Side Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive 3D Heart Scene */}
        <div className="lg:col-span-7 h-[540px]">
          <HeartScene
            heartRate={state.heartRate}
            isPlaying={state.isPlaying}
            bloodFlowVisible={state.bloodFlowVisible}
            bloodFlowSpeed={state.bloodFlowSpeed}
            showLabels={state.showLabels}
            viewMode={state.viewMode}
            activeChamber={state.activeChamber}
            onTogglePlay={onTogglePlay}
            onToggleBloodFlow={onToggleBloodFlow}
            onChangeBloodFlowSpeed={onChangeBloodFlowSpeed}
            onToggleLabels={onToggleLabels}
            onChangeViewMode={onChangeViewMode}
            onSelectChamber={onSelectChamber}
          />
        </div>

        {/* Right Column: Mini ECG Monitor & Quick Hemodynamic Sliders */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Synchronized Mini ECG Monitor */}
          <div className="h-[250px]">
            <ECGMonitor
              heartRate={state.heartRate}
              isPlaying={state.isPlaying}
              onTogglePlay={onTogglePlay}
              onNotify={onNotify}
            />
          </div>

          {/* Quick Interactive Parameters Panel */}
          <div className="bg-[#101D2D] border border-[#37D6F5]/20 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-tech font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#37D6F5]" />
                Live Hemodynamic Controls
              </h4>
              <button
                onClick={() => onNavigateTab('simulation')}
                className="text-xs font-mono text-[#37D6F5] hover:underline flex items-center gap-1 cursor-pointer"
              >
                Full Controls <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Heart Rate Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Heart Rate:</span>
                <span className="text-[#FF5C70] font-bold">{state.heartRate} BPM</span>
              </div>
              <input
                type="range"
                min="40"
                max="180"
                value={state.heartRate}
                onChange={(e) => onUpdateParam('heartRate', parseInt(e.target.value, 10))}
                className="w-full accent-[#FF5C70] cursor-pointer"
              />
            </div>

            {/* Quick Stroke Volume Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Stroke Volume:</span>
                <span className="text-[#37D6F5] font-bold">{state.strokeVolume} mL</span>
              </div>
              <input
                type="range"
                min="40"
                max="140"
                value={state.strokeVolume}
                onChange={(e) => onUpdateParam('strokeVolume', parseInt(e.target.value, 10))}
                className="w-full accent-[#37D6F5] cursor-pointer"
              />
            </div>

            {/* Quick Calculated Stats Pill */}
            <div className="p-2.5 rounded-xl bg-[#07111F] border border-slate-800 text-[11px] font-mono flex items-center justify-between">
              <span className="text-slate-400">Calculated CO:</span>
              <span className="text-emerald-400 font-bold">{state.cardiacOutput.toFixed(2)} L/min</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Pulse Pressure:</span>
              <span className="text-[#FF5C70] font-bold">{state.pulsePressure} mmHg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Baseline Scenario Quick Comparison */}
      <BaselineComparison
        currentState={state}
        baseline={baseline}
        onSaveBaseline={onSaveBaseline}
        onRestoreBaseline={onRestoreBaseline}
        onResetToDefaults={onResetAll}
        onNotify={onNotify}
      />
    </div>
  );
};
