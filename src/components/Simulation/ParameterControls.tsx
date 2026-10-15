import React, { useState } from 'react';
import { SimulationState, PRESET_SCENARIOS } from '../../types/cardiac';
import { 
  RotateCcw, 
  AlertTriangle, 
  Activity, 
  Gauge, 
  Heart, 
  Droplets, 
  BookOpen, 
  Plus, 
  Minus, 
  Info,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface ParameterControlsProps {
  state: SimulationState;
  onUpdateParam: (key: keyof SimulationState, value: number) => void;
  onResetParam: (key: keyof SimulationState) => void;
  onResetAll: () => void;
  onLoadScenario: (scenarioState: Partial<SimulationState>) => void;
  onNotify?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  state,
  onUpdateParam,
  onResetParam,
  onResetAll,
  onLoadScenario,
  onNotify,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const defaultValues = {
    heartRate: 72,
    strokeVolume: 70,
    systolicBP: 120,
    diastolicBP: 80,
    bloodVolume: 5.0,
  };

  const handleSystolicChange = (val: number) => {
    const clamped = Math.max(80, Math.min(220, val));
    onUpdateParam('systolicBP', clamped);
    if (clamped <= state.diastolicBP + 10) {
      onUpdateParam('diastolicBP', Math.max(40, clamped - 15));
    }
  };

  const handleDiastolicChange = (val: number) => {
    const clamped = Math.max(40, Math.min(130, val));
    onUpdateParam('diastolicBP', clamped);
    if (clamped >= state.systolicBP - 10) {
      onUpdateParam('systolicBP', Math.min(220, clamped + 15));
    }
  };

  const stepParam = (key: keyof SimulationState, delta: number, min: number, max: number) => {
    const current = Number(state[key]);
    const next = Math.max(min, Math.min(max, Math.round((current + delta) * 10) / 10));
    if (key === 'systolicBP') {
      handleSystolicChange(next);
    } else if (key === 'diastolicBP') {
      handleDiastolicChange(next);
    } else {
      onUpdateParam(key, next);
    }
  };

  // Helper to determine clinical status of current values
  const getHRStatus = (bpm: number) => {
    if (bpm < 60) return { label: 'Sinus Bradycardia (<60)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (bpm > 100) return { label: 'Sinus Tachycardia (>100)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    return { label: 'Normal Sinus Rhythm (60–100)', color: 'text-[#10B981] bg-emerald-500/10 border-emerald-500/30' };
  };

  const getBPStatus = (sbp: number, dbp: number) => {
    if (sbp < 90 || dbp < 60) return { label: 'Hypotension (<90/<60)', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
    if (sbp >= 140 || dbp >= 90) return { label: 'Stage 2 Hypertension (≥140/90)', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
    if (sbp >= 130 || dbp >= 80) return { label: 'Stage 1 Hypertension (130–139)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    if (sbp >= 120 && dbp < 80) return { label: 'Elevated Systolic (120–129)', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    return { label: 'Optimal Normotensive (<120/<80)', color: 'text-[#10B981] bg-emerald-500/10 border-emerald-500/30' };
  };

  const hrStatus = getHRStatus(state.heartRate);
  const bpStatus = getBPStatus(state.systolicBP, state.diastolicBP);

  return (
    <div className="bg-[#101D2D] border border-[#37D6F5]/20 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header with Global Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div>
          <h3 className="text-base font-tech font-bold text-white tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#37D6F5]" />
            Cardiovascular Parameter Controls
          </h3>
          <p className="text-xs text-slate-400">
            Bidirectional slider & direct numeric controls with real-time hemodynamic synthesis
          </p>
        </div>
        <button
          onClick={() => {
            onResetAll();
            if (onNotify) onNotify('Restored all parameters to baseline physiological defaults (72 BPM, 120/80 mmHg)', 'info');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#37D6F5]" />
          Reset Defaults
        </button>
      </div>

      {/* Preset Scenarios selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#37D6F5]" />
            Quick Clinical & Physiological Scenarios:
          </span>
          <span className="text-[11px] text-slate-500 font-normal">Click to load scenario</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {PRESET_SCENARIOS.map((scenario) => {
            const isMatch =
              state.heartRate === scenario.state.heartRate &&
              state.strokeVolume === scenario.state.strokeVolume &&
              state.systolicBP === scenario.state.systolicBP &&
              state.diastolicBP === scenario.state.diastolicBP;

            return (
              <button
                key={scenario.name}
                onClick={() => {
                  onLoadScenario(scenario.state);
                  if (onNotify) onNotify(`Loaded scenario: ${scenario.name}`, 'success');
                }}
                className={`text-left p-2.5 rounded-xl border transition cursor-pointer group relative ${
                  isMatch
                    ? 'bg-[#37D6F5]/15 border-[#37D6F5] shadow-lg ring-1 ring-[#37D6F5]/50'
                    : 'border-slate-800 bg-[#07111F]/60 hover:bg-[#1B2C42]/80 hover:border-[#37D6F5]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className={`text-[11px] font-semibold leading-tight ${isMatch ? 'text-[#37D6F5]' : 'text-slate-200 group-hover:text-white'}`}>
                    {scenario.name}
                  </div>
                  {isMatch && <CheckCircle2 className="w-3.5 h-3.5 text-[#37D6F5] shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  {scenario.state.heartRate} BPM · {scenario.state.systolicBP}/{scenario.state.diastolicBP} mmHg
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders & Numeric Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Heart Rate */}
        <div className="bg-[#07111F]/70 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#FF5C70]" />
              Heart Rate (HR)
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${hrStatus.color}`}>
              {hrStatus.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="40"
              max="180"
              step="1"
              value={state.heartRate}
              onChange={(e) => onUpdateParam('heartRate', parseInt(e.target.value, 10))}
              className="flex-1 accent-[#FF5C70] cursor-pointer"
            />
            {/* Direct Numeric Input with Step Buttons */}
            <div className="flex items-center gap-1 bg-[#101D2D] border border-slate-700/80 rounded-lg p-0.5">
              <button
                onClick={() => stepParam('heartRate', -5, 40, 180)}
                title="Decrease 5 BPM"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min="40"
                max="180"
                value={state.heartRate}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) onUpdateParam('heartRate', Math.max(40, Math.min(180, val)));
                }}
                className="w-12 bg-transparent text-center font-mono font-bold text-sm text-[#FF5C70] outline-none"
              />
              <button
                onClick={() => stepParam('heartRate', 5, 40, 180)}
                title="Increase 5 BPM"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400 w-8">BPM</span>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5">
            <span>Range: 40–180 BPM</span>
            {state.heartRate !== defaultValues.heartRate && (
              <button
                onClick={() => onResetParam('heartRate')}
                className="text-slate-400 hover:text-[#37D6F5] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset (72)
              </button>
            )}
          </div>
        </div>

        {/* Stroke Volume */}
        <div className="bg-[#07111F]/70 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#37D6F5]" />
              Stroke Volume (SV)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
              {state.strokeVolume >= 65 && state.strokeVolume <= 85 ? 'Standard Ejection (70 mL)' : 'Dynamic Adjusted'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="40"
              max="140"
              step="1"
              value={state.strokeVolume}
              onChange={(e) => onUpdateParam('strokeVolume', parseInt(e.target.value, 10))}
              className="flex-1 accent-[#37D6F5] cursor-pointer"
            />
            <div className="flex items-center gap-1 bg-[#101D2D] border border-slate-700/80 rounded-lg p-0.5">
              <button
                onClick={() => stepParam('strokeVolume', -5, 40, 140)}
                title="Decrease 5 mL"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min="40"
                max="140"
                value={state.strokeVolume}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) onUpdateParam('strokeVolume', Math.max(40, Math.min(140, val)));
                }}
                className="w-12 bg-transparent text-center font-mono font-bold text-sm text-[#37D6F5] outline-none"
              />
              <button
                onClick={() => stepParam('strokeVolume', 5, 40, 140)}
                title="Increase 5 mL"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400 w-8">mL</span>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5">
            <span>Range: 40–140 mL/beat</span>
            {state.strokeVolume !== defaultValues.strokeVolume && (
              <button
                onClick={() => onResetParam('strokeVolume')}
                className="text-slate-400 hover:text-[#37D6F5] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset (70)
              </button>
            )}
          </div>
        </div>

        {/* Systolic Blood Pressure */}
        <div className="bg-[#07111F]/70 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-rose-400" />
              Systolic Blood Pressure (SBP)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Peak Ventricular Ejection
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="80"
              max="220"
              step="1"
              value={state.systolicBP}
              onChange={(e) => handleSystolicChange(parseInt(e.target.value, 10))}
              className="flex-1 accent-rose-400 cursor-pointer"
            />
            <div className="flex items-center gap-1 bg-[#101D2D] border border-slate-700/80 rounded-lg p-0.5">
              <button
                onClick={() => stepParam('systolicBP', -5, 80, 220)}
                title="Decrease 5 mmHg"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min="80"
                max="220"
                value={state.systolicBP}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) handleSystolicChange(val);
                }}
                className="w-12 bg-transparent text-center font-mono font-bold text-sm text-rose-400 outline-none"
              />
              <button
                onClick={() => stepParam('systolicBP', 5, 80, 220)}
                title="Increase 5 mmHg"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400 w-8">mmHg</span>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5">
            <span>Range: 80–220 mmHg</span>
            {state.systolicBP !== defaultValues.systolicBP && (
              <button
                onClick={() => onResetParam('systolicBP')}
                className="text-slate-400 hover:text-[#37D6F5] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset (120)
              </button>
            )}
          </div>
        </div>

        {/* Diastolic Blood Pressure */}
        <div className="bg-[#07111F]/70 border border-slate-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              Diastolic Blood Pressure (DBP)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Resting Vascular Runoff
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="40"
              max="130"
              step="1"
              value={state.diastolicBP}
              onChange={(e) => handleDiastolicChange(parseInt(e.target.value, 10))}
              className="flex-1 accent-cyan-400 cursor-pointer"
            />
            <div className="flex items-center gap-1 bg-[#101D2D] border border-slate-700/80 rounded-lg p-0.5">
              <button
                onClick={() => stepParam('diastolicBP', -5, 40, 130)}
                title="Decrease 5 mmHg"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min="40"
                max="130"
                value={state.diastolicBP}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) handleDiastolicChange(val);
                }}
                className="w-12 bg-transparent text-center font-mono font-bold text-sm text-cyan-400 outline-none"
              />
              <button
                onClick={() => stepParam('diastolicBP', 5, 40, 130)}
                title="Increase 5 mmHg"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400 w-8">mmHg</span>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5">
            <span>Range: 40–130 mmHg</span>
            {state.diastolicBP !== defaultValues.diastolicBP && (
              <button
                onClick={() => onResetParam('diastolicBP')}
                className="text-slate-400 hover:text-[#37D6F5] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset (80)
              </button>
            )}
          </div>
        </div>

        {/* Blood Volume */}
        <div className="bg-[#07111F]/70 border border-slate-800 p-4 rounded-xl space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-indigo-400" />
              Circulating Blood Volume (Illustrative)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-500/30 text-indigo-300 bg-indigo-500/10">
              {state.bloodVolume < 4.2 ? 'Hypovolemic' : state.bloodVolume > 5.8 ? 'Hypervolemic' : 'Euvolemic (Standard 5.0 L)'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="3.0"
              max="7.0"
              step="0.1"
              value={state.bloodVolume}
              onChange={(e) => onUpdateParam('bloodVolume', parseFloat(e.target.value))}
              className="flex-1 accent-indigo-400 cursor-pointer"
            />
            <div className="flex items-center gap-1 bg-[#101D2D] border border-slate-700/80 rounded-lg p-0.5">
              <button
                onClick={() => stepParam('bloodVolume', -0.2, 3.0, 7.0)}
                title="Decrease 0.2 L"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min="3.0"
                max="7.0"
                step="0.1"
                value={state.bloodVolume.toFixed(1)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onUpdateParam('bloodVolume', Math.max(3.0, Math.min(7.0, val)));
                }}
                className="w-14 bg-transparent text-center font-mono font-bold text-sm text-indigo-300 outline-none"
              />
              <button
                onClick={() => stepParam('bloodVolume', 0.2, 3.0, 7.0)}
                title="Increase 0.2 L"
                className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400 w-8">Liters</span>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-800/80 pt-1.5">
            <span>Illustrative range: 3.0–7.0 L (approx. 7% of total adult body weight)</span>
            {state.bloodVolume !== defaultValues.bloodVolume && (
              <button
                onClick={() => onResetParam('bloodVolume')}
                className="text-slate-400 hover:text-[#37D6F5] flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset (5.0 L)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Calculated Hemodynamics Output Bar */}
      <div className="bg-gradient-to-r from-[#0B1726] to-[#102236] border border-[#37D6F5]/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-tech font-bold uppercase tracking-wider text-[#37D6F5] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Automatic Hemodynamic Calculations
          </h4>
          <span className="text-[10px] font-mono text-slate-400">Live Mathematical Outputs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-[#07111F]/80 border border-slate-800/90 rounded-xl p-3 shadow-inner">
            <div className="text-[11px] font-mono text-slate-400">Cardiac Output (CO)</div>
            <div className="text-2xl font-mono font-bold text-white mt-0.5">
              {state.cardiacOutput.toFixed(2)}{' '}
              <span className="text-xs font-normal text-slate-400">L/min</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              HR ({state.heartRate}) × SV ({state.strokeVolume}) ÷ 1000
            </div>
          </div>

          <div className="bg-[#07111F]/80 border border-slate-800/90 rounded-xl p-3 shadow-inner">
            <div className="text-[11px] font-mono text-slate-400">Pulse Pressure (PP)</div>
            <div className="text-2xl font-mono font-bold text-[#FF5C70] mt-0.5">
              {state.pulsePressure}{' '}
              <span className="text-xs font-normal text-slate-400">mmHg</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              SBP ({state.systolicBP}) − DBP ({state.diastolicBP})
            </div>
          </div>

          <div className="bg-[#07111F]/80 border border-slate-800/90 rounded-xl p-3 shadow-inner">
            <div className="text-[11px] font-mono text-slate-400">Mean Arterial Pressure (MAP)</div>
            <div className="text-2xl font-mono font-bold text-[#37D6F5] mt-0.5">
              {state.meanArterialPressure.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-400">mmHg</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              DBP ({state.diastolicBP}) + (PP ({state.pulsePressure}) ÷ 3)
            </div>
          </div>
        </div>
      </div>

      {/* Educational Disclaimer Footer */}
      <div className="flex items-start gap-2.5 text-[11px] text-slate-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <span className="font-semibold text-amber-300">Educational Simulation Disclaimer:</span> These calculations implement foundational physiological formulas for interactive study. Circulating blood volume is illustrative. This system does not model individual patient clinical complexities or provide diagnostic predictions.
        </p>
      </div>
    </div>
  );
};
