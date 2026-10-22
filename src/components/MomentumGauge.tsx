import React, { useState, useEffect } from 'react';
import { Activity, Flame, Sparkles } from 'lucide-react';
import { echos, EchosState } from '../services/echos';

interface MomentumGaugeProps {
  momentum: number; // typically 0.5 to 2.0
  className?: string;
}

export const MomentumGauge: React.FC<MomentumGaugeProps> = ({ 
  momentum = 1.0, 
  className = '' 
}) => {
  const [echosState, setEchosState] = useState<EchosState>(() => echos.state);

  useEffect(() => {
    return echos.onState(s => setEchosState({ ...s }));
  }, []);

  // Normalize momentum (0.5 = 0%, 2.0 = 100%)
  const clamped = Math.max(0.5, Math.min(2.0, momentum));
  const percent = Math.round(((clamped - 0.5) / 1.5) * 100);

  let label = 'Conversational';
  let badgeColor = 'text-violet-300 border-violet-800/60 bg-violet-950/60';
  let barGradient = 'from-indigo-500 via-violet-500 to-fuchsia-500';

  if (clamped < 0.8) {
    label = 'Serene';
    badgeColor = 'text-sky-300 border-sky-800/60 bg-sky-950/60';
    barGradient = 'from-sky-500 via-teal-400 to-emerald-400';
  } else if (clamped <= 1.15) {
    label = 'Grounded';
    badgeColor = 'text-emerald-300 border-emerald-800/60 bg-emerald-950/60';
    barGradient = 'from-teal-400 via-emerald-500 to-indigo-500';
  } else if (clamped <= 1.45) {
    label = 'Dynamic';
    badgeColor = 'text-amber-300 border-amber-800/60 bg-amber-950/60';
    barGradient = 'from-violet-500 via-amber-500 to-orange-500';
  } else {
    label = 'Intense';
    badgeColor = 'text-rose-300 border-rose-800/60 bg-rose-950/60';
    barGradient = 'from-amber-500 via-rose-500 to-red-500';
  }

  return (
    <div 
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs shadow-sm select-none transition-all ${className}`}
      title={`Conversational Intensity & Momentum: ${clamped.toFixed(2)}x (${label}) · ECHOS Mood: ${echosState.mood}`}
    >
      <div className="flex items-center gap-1.5">
        <Activity 
          className={`w-3.5 h-3.5 transition-colors ${clamped > 1.3 ? 'text-amber-400 animate-pulse' : 'text-violet-400'}`}
          style={{ color: echosState.hue ? `hsl(${echosState.hue}, 85%, 65%)` : undefined }} 
        />
        <span className="text-[10px] uppercase font-bold text-slate-400 hidden lg:inline">
          Momentum:
        </span>
      </div>

      <div className="flex flex-col gap-1 w-20 sm:w-24">
        <div className="flex items-center justify-between text-[10px] font-mono leading-none">
          <span className="text-slate-300 font-semibold">{clamped.toFixed(2)}x</span>
          <span className={`text-[9px] px-1 py-0.2 rounded font-medium ${badgeColor}`}>
            {label}
          </span>
        </div>

        {/* Subtle gradient bar */}
        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
          <div 
            className={`h-full bg-gradient-to-r ${barGradient} transition-all duration-300 ease-out rounded-full`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
