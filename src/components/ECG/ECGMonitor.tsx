import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Activity, 
  Info, 
  ZoomIn, 
  ZoomOut,
  Radio,
  Sliders
} from 'lucide-react';

interface ECGMonitorProps {
  heartRate: number;
  isPlaying: boolean;
  onTogglePlay?: () => void;
  onNotify?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const ECGMonitor: React.FC<ECGMonitorProps> = ({
  heartRate,
  isPlaying,
  onTogglePlay,
  onNotify,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [speed, setSpeed] = useState<25 | 50>(25); // mm/s
  const [gain, setGain] = useState<0.5 | 1.0 | 2.0>(1.0); // mm/mV
  const [lead, setLead] = useState<'Lead I' | 'Lead II' | 'Lead III' | 'V1' | 'V5'>('Lead II');
  const [selectedWave, setSelectedWave] = useState<'p' | 'qrs' | 't' | 'pr' | 'qt' | null>(null);

  // Audio Context for synthetic QRS beep
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Animation & buffer state
  const bufferRef = useRef<{ y: number }[]>([]);
  const sweepXRef = useRef(0);
  const phaseRef = useRef(0);
  const animIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef(performance.now());

  // Trigger web audio beep on R wave
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio autoplay permission fallback
    }
  }, [soundEnabled]);

  // Synthetic P-QRS-T complex mathematically synchronized to heart rate and lead orientation
  const getECGValueAtPhase = (t: number, leadType: string): number => {
    const pStart = 0.02;
    const pEnd = 0.12;
    const qrsStart = 0.16;
    const qrsEnd = 0.24;
    const tStart = 0.28;
    const tEnd = 0.44;

    // Lead vector polarity adjustments
    const leadMultiplier = leadType === 'V1' ? 0.7 : leadType === 'Lead III' ? 0.85 : 1.0;
    const invertT = leadType === 'V1';

    if (t >= pStart && t < pEnd) {
      // P wave: atrial depolarization
      const pt = (t - pStart) / (pEnd - pStart);
      return 0.18 * Math.sin(pt * Math.PI) * leadMultiplier;
    } else if (t >= qrsStart && t < qrsEnd) {
      // QRS Complex: ventricular depolarization
      const qt = (t - qrsStart) / (qrsEnd - qrsStart);
      if (qt < 0.2) {
        return -0.15 * Math.sin((qt / 0.2) * Math.PI) * leadMultiplier;
      } else if (qt < 0.65) {
        const rt = (qt - 0.2) / 0.45;
        return 1.35 * Math.sin(rt * Math.PI) * leadMultiplier;
      } else {
        const st = (qt - 0.65) / 0.35;
        return -0.32 * Math.sin(st * Math.PI) * leadMultiplier;
      }
    } else if (t >= tStart && t < tEnd) {
      // T wave: ventricular repolarization
      const tt = (t - tStart) / (tEnd - tStart);
      const val = 0.38 * Math.sin(tt * Math.PI) * (1.1 - 0.3 * tt) * leadMultiplier;
      return invertT ? -val * 0.5 : val;
    }

    // Isoelectric baseline with tiny physiological micro-variation
    return Math.sin(t * 80) * 0.008;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 340);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight || 340;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      const now = performance.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isPlaying) {
        const cycleFreq = heartRate / 60;
        const prevPhase = phaseRef.current;
        phaseRef.current = (phaseRef.current + dt * cycleFreq) % 1.0;

        // Beep detection at R-peak (~phase 0.2)
        if (prevPhase < 0.2 && phaseRef.current >= 0.2) {
          playBeep();
        }

        const pxPerSec = speed === 25 ? 140 : 260;
        const advancePx = dt * pxPerSec;
        sweepXRef.current = (sweepXRef.current + advancePx) % width;

        const mv = getECGValueAtPhase(phaseRef.current, lead);
        const baselineY = height * 0.62;
        const scaleY = height * 0.28 * gain;
        const sampleY = baselineY - mv * scaleY;

        const xInt = Math.floor(sweepXRef.current);
        bufferRef.current[xInt] = { y: sampleY };

        // Erase zone ahead of phosphor sweep
        const eraseWidth = 24;
        for (let i = 0; i < eraseWidth; i++) {
          const eraseX = (xInt + i) % width;
          delete bufferRef.current[eraseX];
        }
      }

      // Draw Grid & Background
      ctx.fillStyle = '#060e18';
      ctx.fillRect(0, 0, width, height);

      // Minor grid (1mm squares: ~7px)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(55, 214, 245, 0.06)';
      ctx.beginPath();
      for (let x = 0; x < width; x += 7) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 7) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major grid (5mm squares: ~35px)
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(55, 214, 245, 0.16)';
      ctx.beginPath();
      for (let x = 0; x < width; x += 35) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 35) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Draw Waveform from buffer
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 4;
      ctx.beginPath();

      let isDrawing = false;
      for (let x = 0; x < width; x++) {
        const point = bufferRef.current[x];
        if (point) {
          if (!isDrawing) {
            ctx.moveTo(x, point.y);
            isDrawing = true;
          } else {
            ctx.lineTo(x, point.y);
          }
        } else {
          isDrawing = false;
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Phosphor Beam Head (Sweeping Cursor)
      const curX = sweepXRef.current;
      const curSample = bufferRef.current[Math.floor(curX)];
      if (curSample) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(curX, curSample.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(55, 214, 245, 0.2)';
        ctx.beginPath();
        ctx.arc(curX, curSample.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [heartRate, isPlaying, speed, gain, lead, playBeep]);

  const handleClearBuffer = () => {
    bufferRef.current = [];
    sweepXRef.current = 0;
    if (onNotify) onNotify('ECG waveform buffer cleared and reset.', 'info');
  };

  // Physiological Interval Calculations
  const rrIntervalMs = Math.round(60000 / heartRate);
  const prIntervalMs = Math.round(160 * (72 / heartRate) ** 0.3);
  const qrsDurationMs = 88;
  const qtcMs = Math.round(390 / Math.sqrt(rrIntervalMs / 1000));

  const rhythmDiagnosis =
    heartRate < 60
      ? 'Sinus Bradycardia'
      : heartRate > 100
      ? 'Sinus Tachycardia'
      : 'Normal Sinus Rhythm';

  return (
    <div className="bg-[#101D2D] border border-[#37D6F5]/20 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Top Header & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#37D6F5]/10 border border-[#37D6F5]/30 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#37D6F5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-tech font-bold text-white tracking-wide">
                Live Diagnostic ECG Monitor
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
                {rhythmDiagnosis.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Lead: {lead} · Speed: {speed} mm/s · Gain: {gain}x ({(gain * 10).toFixed(0)} mm/mV) · RR: {rrIntervalMs} ms
            </p>
          </div>
        </div>

        {/* Live BPM Badge & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#07111F] border border-[#37D6F5]/30 px-3.5 py-1 rounded-xl flex items-baseline gap-1.5 shadow-inner">
            <span className="text-xs font-mono text-slate-400">HR:</span>
            <span className="text-xl font-mono font-bold text-[#FF5C70]">{heartRate}</span>
            <span className="text-[10px] font-mono text-slate-400">BPM</span>
          </div>

          {/* Lead Selector Dropdown / Buttons */}
          <div className="flex items-center bg-[#07111F] p-0.5 rounded-xl border border-slate-800 text-xs font-mono">
            {(['Lead I', 'Lead II', 'Lead III', 'V1', 'V5'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLead(l)}
                className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                  lead === l ? 'bg-[#37D6F5] text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (onNotify) onNotify(!soundEnabled ? 'ECG QRS audio blip enabled.' : 'ECG audio muted.', 'info');
            }}
            title={soundEnabled ? 'Mute QRS Blip' : 'Enable QRS Beep'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-[#37D6F5]/20 text-[#37D6F5] border-[#37D6F5]/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Speed Toggle */}
          <button
            onClick={() => {
              const next = speed === 25 ? 50 : 25;
              setSpeed(next);
              if (onNotify) onNotify(`ECG sweep speed set to ${next} mm/s`, 'info');
            }}
            title="Toggle paper sweep speed (25 or 50 mm/s)"
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition cursor-pointer"
          >
            {speed} mm/s
          </button>

          {/* Gain Toggle */}
          <button
            onClick={() => {
              const next = gain === 1.0 ? 2.0 : gain === 2.0 ? 0.5 : 1.0;
              setGain(next);
              if (onNotify) onNotify(`ECG voltage gain set to ${next}x (${next * 10} mm/mV)`, 'info');
            }}
            title="Toggle voltage amplitude gain (0.5x, 1x, 2x)"
            className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition cursor-pointer"
          >
            {gain}x Gain
          </button>

          {/* Reset / Clear */}
          <button
            onClick={handleClearBuffer}
            title="Clear Waveform Buffer"
            className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative w-full h-[280px] rounded-xl overflow-hidden border border-slate-800 shadow-inner bg-[#060e18]">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Lead Calibration Voltage Marker on Left Edge */}
        <div className="absolute left-3 top-3 pointer-events-none text-[10px] font-mono text-cyan-400/90 bg-[#07111F]/85 px-2.5 py-1 rounded-lg border border-cyan-400/20 backdrop-blur-none shadow-md">
          <div className="font-bold">{lead.toUpperCase()}</div>
          <div className="text-slate-400">{(1.0 * gain).toFixed(1)} mV / cm</div>
        </div>

        {/* Real-time Physiological Interval Badges */}
        <div className="absolute right-3 top-3 pointer-events-none flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-[#07111F]/85 px-3 py-1 rounded-lg border border-slate-800 backdrop-blur-none shadow-md">
          <span>RR: <strong className="text-white">{rrIntervalMs}ms</strong></span>
          <span className="text-slate-600">|</span>
          <span>PR: <strong className="text-white">{prIntervalMs}ms</strong></span>
          <span className="text-slate-600">|</span>
          <span>QRS: <strong className="text-white">{qrsDurationMs}ms</strong></span>
          <span className="text-slate-600">|</span>
          <span>QTc: <strong className="text-cyan-400">{qtcMs}ms</strong></span>
        </div>

        {/* Bottom Status / Mode Marker */}
        <div className="absolute right-3 bottom-3 pointer-events-none text-[10px] font-mono text-slate-400 bg-[#07111F]/85 px-2.5 py-1 rounded-lg border border-slate-800">
          Educational Synthetic Simulation (Not Clinical)
        </div>
      </div>

      {/* Interactive Wave Caliper & Electrophysiology Guide */}
      <div className="bg-[#07111F]/80 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="text-xs font-tech font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>Electrophysiological Complex Wave Guide:</span>
          <span className="text-[10px] font-mono text-slate-500 font-normal">Click any component for physiological breakdown</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* P Wave */}
          <button
            onClick={() => setSelectedWave(selectedWave === 'p' ? null : 'p')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              selectedWave === 'p'
                ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500/40'
                : 'bg-[#101D2D]/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>P Wave (Atrial Depol.)</span>
              <span className="font-mono text-[10px] text-amber-400">~0.08–0.12s</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              Sinoatrial (SA) node pacemaker triggers wave of depolarization across both atria, causing atrial contraction ("atrial kick").
            </p>
          </button>

          {/* QRS Complex */}
          <button
            onClick={() => setSelectedWave(selectedWave === 'qrs' ? null : 'qrs')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              selectedWave === 'qrs'
                ? 'bg-[#37D6F5]/20 border-[#37D6F5] text-cyan-200 shadow-md ring-1 ring-[#37D6F5]/40'
                : 'bg-[#101D2D]/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>QRS Complex (Ventricular Depol.)</span>
              <span className="font-mono text-[10px] text-[#37D6F5]">~0.08–0.10s</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              Rapid conduction down the Bundle of His and Purkinje network triggers simultaneous, powerful ventricular systole and blood ejection.
            </p>
          </button>

          {/* T Wave */}
          <button
            onClick={() => setSelectedWave(selectedWave === 't' ? null : 't')}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
              selectedWave === 't'
                ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500/40'
                : 'bg-[#101D2D]/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>T Wave (Ventricular Repol.)</span>
              <span className="font-mono text-[10px] text-purple-400">~0.16s</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              Ventricular cardiomyocytes repolarize, restoring baseline resting potential in preparation for the next cardiac cycle.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
