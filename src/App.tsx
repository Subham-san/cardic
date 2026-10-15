import React, { useState, useEffect, useRef } from 'react';
import { SimulationState, BaselineState, HistoryDataPoint, ToastNotification } from './types/cardiac';
import { OverviewTab } from './components/Dashboard/OverviewTab';
import { HeartScene } from './components/Heart/HeartScene';
import { ParameterControls } from './components/Simulation/ParameterControls';
import { BaselineComparison } from './components/Simulation/BaselineComparison';
import { ECGMonitor } from './components/ECG/ECGMonitor';
import { CardiovascularCharts } from './components/Charts/CardiovascularCharts';
import { BloodFlowDiagram } from './components/BloodFlow/BloodFlowDiagram';
import { CardioAIAssistant } from './components/AI/CardioAIAssistant';
import { AboutSection } from './components/About/AboutSection';

import {
  Heart,
  Activity,
  Layers,
  Sparkles,
  Bot,
  HelpCircle,
  RotateCcw,
  Play,
  Pause,
  Bookmark,
  TrendingUp,
  Droplets,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Radio,
  Sliders
} from 'lucide-react';

const INITIAL_SIMULATION_STATE: SimulationState = {
  heartRate: 72,
  strokeVolume: 70,
  systolicBP: 120,
  diastolicBP: 80,
  bloodVolume: 5.0,
  cardiacOutput: (72 * 70) / 1000, // 5.04 L/min
  pulsePressure: 120 - 80, // 40 mmHg
  meanArterialPressure: 80 + (120 - 80) / 3, // 93.33 mmHg
  isPlaying: true,
  bloodFlowVisible: true,
  bloodFlowSpeed: 1.0,
  showLabels: true,
  viewMode: 'standard',
  activeChamber: null,
  audioBeepEnabled: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'heart' | 'simulation' | 'ecg' | 'flow' | 'ai' | 'about'>('overview');
  const [simulationState, setSimulationState] = useState<SimulationState>(INITIAL_SIMULATION_STATE);
  const [baseline, setBaseline] = useState<BaselineState | null>(null);
  const [history, setHistory] = useState<HistoryDataPoint[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const notify = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Recalculate derived hemodynamics whenever inputs change
  const updateSimulationParam = (key: keyof SimulationState, value: any) => {
    setSimulationState((prev) => {
      const next = { ...prev, [key]: value };

      // Recalculate hemodynamics
      const co = (next.heartRate * next.strokeVolume) / 1000;
      const pp = next.systolicBP - next.diastolicBP;
      const map = next.diastolicBP + pp / 3;

      next.cardiacOutput = co;
      next.pulsePressure = pp;
      next.meanArterialPressure = map;

      return next;
    });
  };

  const resetSingleParam = (key: keyof SimulationState) => {
    const defaults: Record<string, number> = {
      heartRate: 72,
      strokeVolume: 70,
      systolicBP: 120,
      diastolicBP: 80,
      bloodVolume: 5.0,
    };
    if (key in defaults) {
      updateSimulationParam(key, defaults[key]);
      notify(`Reset ${String(key)} to physiological baseline.`, 'info');
    }
  };

  const resetAllToDefaults = () => {
    setSimulationState((prev) => ({
      ...prev,
      heartRate: 72,
      strokeVolume: 70,
      systolicBP: 120,
      diastolicBP: 80,
      bloodVolume: 5.0,
      cardiacOutput: 5.04,
      pulsePressure: 40,
      meanArterialPressure: 93.33,
      isPlaying: true,
      bloodFlowVisible: true,
      bloodFlowSpeed: 1.0,
      viewMode: 'standard',
      activeChamber: null,
    }));
    notify('Simulation reset to standard baseline (72 BPM, 70 mL, 120/80 mmHg).', 'success');
  };

  const loadScenario = (scenarioState: Partial<SimulationState>) => {
    setSimulationState((prev) => {
      const next = { ...prev, ...scenarioState };
      const co = (next.heartRate * next.strokeVolume) / 1000;
      const pp = next.systolicBP - next.diastolicBP;
      const map = next.diastolicBP + pp / 3;
      next.cardiacOutput = co;
      next.pulsePressure = pp;
      next.meanArterialPressure = map;
      return next;
    });
  };

  const saveBaseline = () => {
    setBaseline({
      heartRate: simulationState.heartRate,
      strokeVolume: simulationState.strokeVolume,
      systolicBP: simulationState.systolicBP,
      diastolicBP: simulationState.diastolicBP,
      bloodVolume: simulationState.bloodVolume,
      cardiacOutput: simulationState.cardiacOutput,
      pulsePressure: simulationState.pulsePressure,
      meanArterialPressure: simulationState.meanArterialPressure,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
    notify('Saved current hemodynamic state as comparison baseline.', 'success');
  };

  const restoreBaseline = () => {
    if (!baseline) return;
    setSimulationState((prev) => ({
      ...prev,
      heartRate: baseline.heartRate,
      strokeVolume: baseline.strokeVolume,
      systolicBP: baseline.systolicBP,
      diastolicBP: baseline.diastolicBP,
      bloodVolume: baseline.bloodVolume,
      cardiacOutput: baseline.cardiacOutput,
      pulsePressure: baseline.pulsePressure,
      meanArterialPressure: baseline.meanArterialPressure,
    }));
    notify('Restored parameters from saved baseline snapshot.', 'info');
  };

  // Record history points for trends
  useEffect(() => {
    const point: HistoryDataPoint = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: Date.now(),
      heartRate: simulationState.heartRate,
      cardiacOutput: simulationState.cardiacOutput,
      systolicBP: simulationState.systolicBP,
      diastolicBP: simulationState.diastolicBP,
      pulsePressure: simulationState.pulsePressure,
      meanArterialPressure: simulationState.meanArterialPressure,
    };

    setHistory((prev) => [...prev.slice(-49), point]);
  }, [
    simulationState.heartRate,
    simulationState.strokeVolume,
    simulationState.systolicBP,
    simulationState.diastolicBP,
  ]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Heart, description: 'Clinical telemetry & 3D preview' },
    { id: 'heart', label: '3D Heart', icon: Layers, description: '3D biomechanics & anatomy lab' },
    { id: 'simulation', label: 'Live Simulation', icon: Activity, description: 'Hemodynamic sliders & presets' },
    { id: 'ecg', label: 'ECG Monitor', icon: TrendingUp, description: 'Real-time Lead II waveform' },
    { id: 'flow', label: 'Blood Flow', icon: Droplets, description: 'Dual-circuit circulation walkthrough' },
    { id: 'ai', label: 'CardioAI', icon: Bot, description: 'Physiological mentor powered by AI' },
    { id: 'about', label: 'About', icon: HelpCircle, description: 'Syntax Squad & clinical disclaimer' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#07111F] text-slate-100 flex flex-col selection:bg-[#37D6F5] selection:text-slate-950 font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 bg-[#101D2D]/95 border-b border-[#37D6F5]/20 backdrop-blur-none px-4 sm:px-6 py-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Sidebar Toggle + Brand Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-[#37D6F5] border border-slate-700 transition cursor-pointer"
              title={sidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className="flex items-center gap-3 text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#37D6F5] to-[#FF5C70] p-[2px] shadow-lg group-hover:scale-105 transition">
                <div className="w-full h-full bg-[#07111F] rounded-[10px] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#FF5C70]" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-tech font-bold text-white tracking-wider">
                    CARDIAC AI 3D
                  </h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#37D6F5]/10 text-[#37D6F5] border border-[#37D6F5]/30">
                    SYNTAX SQUAD
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                  Cardiovascular Biomechanics & Interactive Telemetry
                </p>
              </div>
            </button>
          </div>

          {/* Right Header Controls: Status, Play/Pause, Reset, Mobile Menu */}
          <div className="flex items-center gap-2.5">
            {/* Live Beating Rhythm Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-[#07111F] px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  simulationState.isPlaying ? 'bg-[#10B981] animate-ping' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300">
                {simulationState.isPlaying ? 'SIMULATION RUNNING' : 'PAUSED'}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-[#37D6F5] font-bold">{simulationState.heartRate} BPM</span>
              <span className="text-slate-600">|</span>
              <span className="text-[#FF5C70] font-bold">{simulationState.systolicBP}/{simulationState.diastolicBP} mmHg</span>
            </div>

            {/* Play/Pause Toggle Button */}
            <button
              onClick={() => {
                const nextPlaying = !simulationState.isPlaying;
                updateSimulationParam('isPlaying', nextPlaying);
                notify(nextPlaying ? 'Resumed cardiac simulation.' : 'Paused simulation.', 'info');
              }}
              title={simulationState.isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {simulationState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-[#10B981]" />}
            </button>

            {/* Global Reset Simulation Button */}
            <button
              onClick={resetAllToDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF5C70]/15 hover:bg-[#FF5C70]/25 text-[#FF5C70] border border-[#FF5C70]/30 rounded-xl text-xs font-mono font-medium transition cursor-pointer"
              title="Reset All Parameters to Default (72 BPM, 120/80 mmHg)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Simulation</span>
            </button>

            {/* Mobile Navigation Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fadeIn">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-mono transition text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#37D6F5] text-slate-950 font-bold shadow-md'
                      : 'bg-[#07111F] text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Left Navigation Sidebar (Desktop) */}
        <aside
          className={`hidden lg:flex flex-col border-r border-[#37D6F5]/15 bg-[#101D2D]/60 backdrop-blur-none transition-all duration-300 select-none ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Navigation Links */}
          <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
              {sidebarCollapsed ? 'MENU' : 'NAVIGATION MODULES'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={sidebarCollapsed ? `${item.label} — ${item.description}` : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer text-left group relative ${
                    isActive
                      ? 'bg-[#37D6F5] text-slate-950 font-bold shadow-lg shadow-[#37D6F5]/10'
                      : 'text-slate-300 hover:bg-[#1B2C42]/70 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-slate-950' : 'text-[#37D6F5] group-hover:scale-110 transition'}`} />
                  
                  {!sidebarCollapsed && (
                    <div className="overflow-hidden">
                      <div className="text-xs font-mono leading-tight">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                        {item.description}
                      </div>
                    </div>
                  )}

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Widget: Live Hemodynamic Mini-Telemetry */}
          <div className="p-3 border-t border-slate-800/80 bg-[#07111F]/50">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-1 py-1 text-center">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[10px] font-mono text-[#37D6F5] font-bold">{simulationState.heartRate}</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[#101D2D] border border-slate-800 text-[11px] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    Cardiac State:
                  </span>
                  <span className="text-[#37D6F5] font-bold">{simulationState.heartRate} BPM</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Cardiac Output:</span>
                  <span className="text-emerald-400 font-bold">{simulationState.cardiacOutput.toFixed(2)} L/min</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">BP:</span>
                  <span className="text-[#FF5C70] font-bold">{simulationState.systolicBP}/{simulationState.diastolicBP} mmHg</span>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewTab
              state={simulationState}
              baseline={baseline}
              onUpdateParam={updateSimulationParam}
              onResetParam={resetSingleParam}
              onResetAll={resetAllToDefaults}
              onLoadScenario={loadScenario}
              onSaveBaseline={saveBaseline}
              onRestoreBaseline={restoreBaseline}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onTogglePlay={() => updateSimulationParam('isPlaying', !simulationState.isPlaying)}
              onToggleBloodFlow={() => updateSimulationParam('bloodFlowVisible', !simulationState.bloodFlowVisible)}
              onChangeBloodFlowSpeed={(s) => updateSimulationParam('bloodFlowSpeed', s)}
              onToggleLabels={() => updateSimulationParam('showLabels', !simulationState.showLabels)}
              onChangeViewMode={(m) => updateSimulationParam('viewMode', m)}
              onSelectChamber={(id) => updateSimulationParam('activeChamber', id)}
              onNotify={notify}
            />
          )}

          {activeTab === 'heart' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-tech font-bold text-white tracking-wide">
                    Interactive 3D Anatomical Heart Laboratory
                  </h2>
                  <p className="text-xs text-slate-400">
                    Rotate (drag), zoom (scroll or HUD buttons), and inspect anatomical chambers, coronary vessels, and blood flows. Drag and drop any .glb model onto the canvas anytime.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono bg-[#101D2D] px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Frequency:</span>
                  <span className="text-[#37D6F5] font-bold">{(simulationState.heartRate / 60).toFixed(2)} Hz</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">Period:</span>
                  <span className="text-[#FF5C70] font-bold">{(60 / simulationState.heartRate).toFixed(2)} s</span>
                </div>
              </div>

              <div className="h-[650px] w-full">
                <HeartScene
                  heartRate={simulationState.heartRate}
                  isPlaying={simulationState.isPlaying}
                  bloodFlowVisible={simulationState.bloodFlowVisible}
                  bloodFlowSpeed={simulationState.bloodFlowSpeed}
                  showLabels={simulationState.showLabels}
                  viewMode={simulationState.viewMode}
                  activeChamber={simulationState.activeChamber}
                  onTogglePlay={() => updateSimulationParam('isPlaying', !simulationState.isPlaying)}
                  onToggleBloodFlow={() => updateSimulationParam('bloodFlowVisible', !simulationState.bloodFlowVisible)}
                  onChangeBloodFlowSpeed={(s) => updateSimulationParam('bloodFlowSpeed', s)}
                  onToggleLabels={() => updateSimulationParam('showLabels', !simulationState.showLabels)}
                  onChangeViewMode={(m) => updateSimulationParam('viewMode', m)}
                  onSelectChamber={(id) => updateSimulationParam('activeChamber', id)}
                />
              </div>
            </div>
          )}

          {activeTab === 'simulation' && (
            <div className="space-y-6">
              <ParameterControls
                state={simulationState}
                onUpdateParam={updateSimulationParam}
                onResetParam={resetSingleParam}
                onResetAll={resetAllToDefaults}
                onLoadScenario={loadScenario}
                onNotify={notify}
              />

              <BaselineComparison
                currentState={simulationState}
                baseline={baseline}
                onSaveBaseline={saveBaseline}
                onRestoreBaseline={restoreBaseline}
                onResetToDefaults={resetAllToDefaults}
                onNotify={notify}
              />

              <CardiovascularCharts
                history={history}
                currentHR={simulationState.heartRate}
                currentCO={simulationState.cardiacOutput}
                currentSBP={simulationState.systolicBP}
                currentDBP={simulationState.diastolicBP}
                onClearHistory={() => setHistory([])}
                onNotify={notify}
              />
            </div>
          )}

          {activeTab === 'ecg' && (
            <div className="space-y-6">
              <ECGMonitor
                heartRate={simulationState.heartRate}
                isPlaying={simulationState.isPlaying}
                onTogglePlay={() => updateSimulationParam('isPlaying', !simulationState.isPlaying)}
                onNotify={notify}
              />

              <CardiovascularCharts
                history={history}
                currentHR={simulationState.heartRate}
                currentCO={simulationState.cardiacOutput}
                currentSBP={simulationState.systolicBP}
                currentDBP={simulationState.diastolicBP}
                onClearHistory={() => setHistory([])}
                onNotify={notify}
              />
            </div>
          )}

          {activeTab === 'flow' && (
            <div className="space-y-6">
              <div className="h-[460px]">
                <HeartScene
                  heartRate={simulationState.heartRate}
                  isPlaying={simulationState.isPlaying}
                  bloodFlowVisible={true}
                  bloodFlowSpeed={simulationState.bloodFlowSpeed}
                  showLabels={simulationState.showLabels}
                  viewMode="flowOnly"
                  activeChamber={simulationState.activeChamber}
                  onTogglePlay={() => updateSimulationParam('isPlaying', !simulationState.isPlaying)}
                  onToggleBloodFlow={() => updateSimulationParam('bloodFlowVisible', !simulationState.bloodFlowVisible)}
                  onChangeBloodFlowSpeed={(s) => updateSimulationParam('bloodFlowSpeed', s)}
                  onToggleLabels={() => updateSimulationParam('showLabels', !simulationState.showLabels)}
                  onChangeViewMode={(m) => updateSimulationParam('viewMode', m)}
                  onSelectChamber={(id) => updateSimulationParam('activeChamber', id)}
                />
              </div>

              <BloodFlowDiagram
                heartRate={simulationState.heartRate}
                bloodFlowSpeed={simulationState.bloodFlowSpeed}
                onChangeSpeed={(s) => updateSimulationParam('bloodFlowSpeed', s)}
                onSelectChamber={(id) => updateSimulationParam('activeChamber', id)}
              />
            </div>
          )}

          {activeTab === 'ai' && (
            <CardioAIAssistant simulationState={simulationState} />
          )}

          {activeTab === 'about' && (
            <AboutSection />
          )}
        </main>
      </div>

      {/* Floating Clinical Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#101D2D]/95 border border-[#37D6F5]/40 shadow-2xl backdrop-blur-md animate-slideUp text-xs font-mono">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-[#37D6F5] shrink-0" />}
          <span className="text-slate-100">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Minimal Clinical Footer */}
      <footer className="border-t border-slate-800/80 bg-[#07111F] py-3.5 px-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>Cardiac AI 3D — Syntax Squad</span>
          </div>
          <span className="text-slate-400">
            Educational Cardiovascular Physiology Simulator · Not for Clinical Diagnosis or Treatment
          </span>
        </div>
      </footer>
    </div>
  );
}
