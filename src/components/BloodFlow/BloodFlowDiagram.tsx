import React, { useState } from 'react';
import { Droplets, ArrowRight, ShieldCheck, Heart, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

interface BloodFlowDiagramProps {
  heartRate: number;
  bloodFlowSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onSelectChamber?: (chamberId: string) => void;
}

export const BloodFlowDiagram: React.FC<BloodFlowDiagramProps> = ({
  heartRate,
  bloodFlowSpeed,
  onChangeSpeed,
  onSelectChamber,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  const circulationSteps = [
    {
      step: 1,
      title: 'Venous Return to Right Atrium',
      circuit: 'pulmonary',
      oxygenation: 'deoxygenated',
      chamber: 'right_atrium',
      vessels: 'Superior Vena Cava (SVC) & Inferior Vena Cava (IVC)',
      description:
        'Deoxygenated, carbon dioxide-rich blood returns from upper body (head, neck, arms via SVC) and lower body (trunk, viscera, legs via IVC) into the Right Atrium.',
      pressure: '2 - 6 mmHg (Central Venous Pressure)',
    },
    {
      step: 2,
      title: 'Tricuspid Inflow to Right Ventricle',
      circuit: 'pulmonary',
      oxygenation: 'deoxygenated',
      chamber: 'right_ventricle',
      vessels: 'Tricuspid Atrioventricular (AV) Valve',
      description:
        'During ventricular diastole, the tricuspid valve opens. Atrial contraction ("atrial kick") provides the final 20% filling into the compliant Right Ventricle.',
      pressure: 'End-diastolic ~4 mmHg, peak systolic ~25 mmHg',
    },
    {
      step: 3,
      title: 'Pulmonary Ejection into Lungs',
      circuit: 'pulmonary',
      oxygenation: 'deoxygenated',
      chamber: 'pulmonary_trunk',
      vessels: 'Pulmonary Valve & Pulmonary Arteries',
      description:
        'Right ventricular systole forces open the pulmonary valve. Deoxygenated blood surges through the pulmonary trunk into left and right pulmonary arteries toward the pulmonary capillary beds.',
      pressure: 'Pulmonary artery ~25/10 mmHg (Mean: 14 mmHg)',
    },
    {
      step: 4,
      title: 'Alveolar Gas Exchange in Lungs',
      circuit: 'pulmonary',
      oxygenation: 'transition',
      chamber: 'lungs',
      vessels: 'Pulmonary Alveolar Capillaries',
      description:
        'Blood passes single-file through delicate alveolar capillaries. CO2 diffuses across thin respiratory membranes into alveoli for exhalation, and inhaled O2 binds to hemoglobin, transforming blood to bright scarlet oxygenated blood.',
      pressure: 'Microvascular capillary pressure ~7 mmHg',
    },
    {
      step: 5,
      title: 'Pulmonary Venous Return to Left Atrium',
      circuit: 'systemic',
      oxygenation: 'oxygenated',
      chamber: 'left_atrium',
      vessels: '4 Pulmonary Veins (2 Left, 2 Right)',
      description:
        'Freshly oxygenated blood returns from the lungs through four pulmonary veins directly into the high-compliance Left Atrium.',
      pressure: 'Mean Left Atrial Pressure ~8 - 10 mmHg',
    },
    {
      step: 6,
      title: 'Mitral Inflow into Left Ventricle',
      circuit: 'systemic',
      oxygenation: 'oxygenated',
      chamber: 'left_ventricle',
      vessels: 'Bicuspid / Mitral Atrioventricular Valve',
      description:
        'Mitral valve opens under LA-to-LV pressure gradient. The thick-walled Left Ventricle fills with oxygenated blood, primed for high-pressure systemic ejection.',
      pressure: 'End-diastolic ~8 - 12 mmHg',
    },
    {
      step: 7,
      title: 'Aortic High-Pressure Ejection',
      circuit: 'systemic',
      oxygenation: 'oxygenated',
      chamber: 'aorta',
      vessels: 'Aortic Semilunar Valve & Aorta',
      description:
        'Powerful left ventricular contraction generates ~120 mmHg, flinging open the aortic valve. Blood surges into the ascending aorta, aortic arch, and branches.',
      pressure: '120/80 mmHg (Systemic Arterial Pressure)',
    },
    {
      step: 8,
      title: 'Systemic Perfusion & Tissue Capillaries',
      circuit: 'systemic',
      oxygenation: 'transition',
      chamber: 'systemic_organs',
      vessels: 'Brachiocephalic, Carotid, Subclavian & Systemic Arterioles',
      description:
        'Oxygenated blood perfuses the brain, heart (via coronary arteries), kidneys, digestive organs, and working skeletal muscles before returning as venous blood to step 1.',
      pressure: 'Mean Arterial Pressure (MAP) ~93 mmHg',
    },
  ];

  const current = circulationSteps[activeStep];

  return (
    <div className="bg-[#101D2D] border border-[#37D6F5]/20 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div>
          <h3 className="text-base font-tech font-bold text-white tracking-wide flex items-center gap-2">
            <Droplets className="w-4 h-4 text-[#FF5C70]" />
            Dual-Circuit Blood Flow & Hemodynamic Pathway
          </h3>
          <p className="text-xs text-slate-400">
            Interactive educational walkthrough of systemic and pulmonary circulation
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 bg-[#07111F] px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5C70]" />
            <span className="text-slate-300">Oxygen-Rich (Arterial Systemic)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#37D6F5]" />
            <span className="text-slate-300">Oxygen-Poor (Venous Pulmonary)</span>
          </div>
        </div>
      </div>

      {/* Step Pills Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
        {circulationSteps.map((s, idx) => {
          const isActive = idx === activeStep;
          const isOxy = s.oxygenation === 'oxygenated';
          const isDeoxy = s.oxygenation === 'deoxygenated';

          return (
            <button
              key={s.step}
              onClick={() => {
                setActiveStep(idx);
                if (onSelectChamber && s.chamber) onSelectChamber(s.chamber);
              }}
              className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-[#37D6F5] text-slate-950 border-white font-bold shadow-lg scale-105'
                  : 'bg-[#07111F]/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-[#1B2C42]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono ${isActive ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                  0{s.step}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOxy ? 'bg-[#FF5C70]' : isDeoxy ? 'bg-[#37D6F5]' : 'bg-emerald-400'
                  }`}
                />
              </div>
              <div className="text-[11px] font-medium leading-tight mt-1 line-clamp-2">
                {s.title.split(' to ')[0].split(' in ')[0]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Active Step Card */}
      <div className="bg-[#07111F]/90 border border-[#37D6F5]/25 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                current.oxygenation === 'oxygenated'
                  ? 'bg-[#FF5C70]/20 text-[#FF5C70] border border-[#FF5C70]/30'
                  : 'bg-[#37D6F5]/20 text-[#37D6F5] border border-[#37D6F5]/30'
              }`}
            >
              STEP 0{current.step} OF 08 · {current.circuit.toUpperCase()} CIRCUIT
            </span>
            <h4 className="text-base font-tech font-bold text-white tracking-wide">
              {current.title}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={activeStep === 0}
              onClick={() => setActiveStep(activeStep - 1)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-mono text-slate-300"
            >
              &larr; Prev
            </button>
            <button
              disabled={activeStep === circulationSteps.length - 1}
              onClick={() => setActiveStep(activeStep + 1)}
              className="px-2.5 py-1 rounded bg-[#37D6F5]/20 hover:bg-[#37D6F5]/30 text-[#37D6F5] border border-[#37D6F5]/40 text-xs font-mono font-semibold"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">
          {current.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono pt-2 border-t border-slate-800">
          <div className="bg-[#101D2D] p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block mb-1">Key Anatomic Vessels & Valves:</span>
            <span className="text-white font-medium">{current.vessels}</span>
          </div>
          <div className="bg-[#101D2D] p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 block mb-1">Physiological Pressure Range:</span>
            <span className="text-[#37D6F5] font-medium">{current.pressure}</span>
          </div>
        </div>
      </div>

      {/* Dual Circuit Summary Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Pulmonary Circuit */}
        <div className="bg-[#07111F]/70 border border-[#37D6F5]/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#37D6F5]" />
            Pulmonary Circuit (Low Pressure / Low Resistance)
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            Pumps deoxygenated blood from the right ventricle into the pulmonary capillary bed of the lungs for carbon dioxide release and oxygen uptake. Mean pressures are low (~14 mmHg) to prevent alveolar pulmonary edema.
          </p>
        </div>

        {/* Systemic Circuit */}
        <div className="bg-[#07111F]/70 border border-[#FF5C70]/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-tech font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#FF5C70]" />
            Systemic Circuit (High Pressure / High Resistance)
          </div>
          <p className="text-slate-300 text-xs leading-relaxed">
            Pumps oxygen-saturated blood from the thick left ventricle into the entire body via the aorta and arterial tree. Requires high pressures (~120/80 mmHg) to overcome systemic vascular resistance (SVR) and ensure capillary perfusion.
          </p>
        </div>
      </div>
    </div>
  );
};
