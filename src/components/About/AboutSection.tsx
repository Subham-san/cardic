import React from 'react';
import { ShieldAlert, Users, Award, BookOpen, Heart, Activity, Code, Cpu } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero Branding Card */}
      <div className="bg-gradient-to-br from-[#101D2D] to-[#0A1828] border border-[#37D6F5]/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#37D6F5]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-[#FF5C70]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#37D6F5]/10 border border-[#37D6F5]/30 text-xs font-mono text-[#37D6F5]">
            <Award className="w-3.5 h-3.5" /> SYNTAX SQUAD HACKATHON INNOVATION
          </div>

          <h2 className="text-2xl sm:text-3xl font-tech font-bold text-white tracking-wide">
            CARDIAC AI 3D <span className="text-[#37D6F5]">—</span> SYNTAX SQUAD
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            “Cardiac AI 3D is an interactive educational platform designed to help students explore heart anatomy, simplified blood circulation, cardiovascular parameters, and ECG concepts through 3D visualization and AI-assisted explanations.”
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Users className="w-4 h-4 text-[#FF5C70]" /> Developed by <strong className="text-white">Syntax Squad</strong>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Cpu className="w-4 h-4 text-[#37D6F5]" /> Powered by Three.js & Gemini 3.8 Flash
            </span>
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer Box */}
      <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-rose-400 font-tech font-bold text-sm tracking-wide">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          MANDATORY MEDICAL & EDUCATIONAL DISCLAIMER
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          “This application is an educational prototype. Visualizations and calculations are simplified and have not been validated for clinical use. It is not a medical device and must not be used for diagnosis, treatment decisions, or emergency assessment.”
        </p>
        <p className="text-[11px] text-slate-400 font-mono">
          If you or someone near you is experiencing chest pain, pressure, shortness of breath, or cardiovascular symptoms, immediately call your local emergency services (such as 911).
        </p>
      </div>

      {/* Physiological Formulas Cheatsheet */}
      <div className="bg-[#101D2D] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-tech font-bold text-white tracking-wide flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#37D6F5]" />
          Cardiovascular Formula & Physiology Cheatsheet
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-[#07111F] p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold">1. Cardiac Output (CO)</div>
            <div className="text-lg text-white font-bold">CO = HR × SV ÷ 1000</div>
            <p className="text-slate-400 text-[11px] font-sans">
              The volume of blood pumped by each ventricle per minute. Standard resting adult range is 4.0 – 8.0 L/min.
            </p>
          </div>

          <div className="bg-[#07111F] p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-rose-400 font-bold">2. Pulse Pressure (PP)</div>
            <div className="text-lg text-white font-bold">PP = SBP − DBP</div>
            <p className="text-slate-400 text-[11px] font-sans">
              The difference between systolic and diastolic arterial pressures. Reflects stroke volume and arterial wall compliance.
            </p>
          </div>

          <div className="bg-[#07111F] p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-emerald-400 font-bold">3. Mean Arterial Pressure (MAP)</div>
            <div className="text-lg text-white font-bold">MAP ≈ DBP + (PP ÷ 3)</div>
            <p className="text-slate-400 text-[11px] font-sans">
              The average perfusion pressure driving blood into body organs throughout the cardiac cycle. Adequate target is &ge; 65 mmHg.
            </p>
          </div>
        </div>
      </div>

      {/* Syntax Squad Mission & Engineering Standards */}
      <div className="bg-[#101D2D] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-tech font-bold text-white tracking-wide flex items-center gap-2">
          <Code className="w-4 h-4 text-[#FF5C70]" />
          Syntax Squad Architectural Highlights
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3 bg-[#07111F] rounded-xl border border-slate-800/80">
            <h4 className="font-semibold text-white mb-1">Modular Procedural 3D Mesh</h4>
            <p className="text-slate-400">
              Built with discrete anatomical sub-assemblies (left/right ventricles, atria, aorta, pulmonary trunk, coronary tree) ready for seamless replacement with external GLB assets.
            </p>
          </div>

          <div className="p-3 bg-[#07111F] rounded-xl border border-slate-800/80">
            <h4 className="font-semibold text-white mb-1">Real-Time Catmull-Rom Flow</h4>
            <p className="text-slate-400">
              Over 500 dual-loop particles dynamically animated along 3D CatmullRom splines, velocity-synchronized with heart rate and user controls.
            </p>
          </div>

          <div className="p-3 bg-[#07111F] rounded-xl border border-slate-800/80">
            <h4 className="font-semibold text-white mb-1">Lead II Precision ECG Engine</h4>
            <p className="text-slate-400">
              Canvas-based medical monitor rendering real-time P-QRS-T complexes with phosphorescent sweep head, millivolt calibration, and synthesized audio blips.
            </p>
          </div>

          <div className="p-3 bg-[#07111F] rounded-xl border border-slate-800/80">
            <h4 className="font-semibold text-white mb-1">Server-Side Gemini 3.8 Flash</h4>
            <p className="text-slate-400">
              Secure full-stack backend endpoint (/api/chat) injecting active dashboard telemetry to give tailored cardiovascular explanations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
