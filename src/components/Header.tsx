import React from 'react';
import { Mic, Sparkles, MessageSquare, BookOpen, BrainCircuit, Settings } from 'lucide-react';
import { Persona } from '../services/personaStore';
import { hasStoredApiKey } from '../services/apiKeyStore';
import { MomentumGauge } from './MomentumGauge';

import { Eye } from 'lucide-react';

interface HeaderProps {
  activeTab: 'companion' | 'studio' | 'lore' | 'personas' | 'moods';
  setActiveTab: (tab: 'companion' | 'studio' | 'lore' | 'personas' | 'moods') => void;
  activeMode: 'off-stage' | 'on-stage';
  setActiveMode: (mode: 'off-stage' | 'on-stage') => void;
  activePersona?: Persona;
  selectedMood?: { id: string; label: string; tag: string };
  onOpenSettings?: () => void;
  conversationMomentum?: number;
  isVisionActive?: boolean;
  onToggleVision?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  activeMode, 
  setActiveMode,
  activePersona,
  selectedMood,
  onOpenSettings,
  conversationMomentum = 1.0,
  isVisionActive = false,
  onToggleVision,
}) => {
  const personaName = activePersona?.name || 'LILA';

  const navItems = [
    { id: 'companion' as const, label: 'Live Companion', icon: MessageSquare },
    { id: 'personas' as const, label: 'Root Being (SIA)', icon: BrainCircuit },
    { id: 'studio' as const, label: 'Voice Studio', icon: Mic },
    { id: 'moods' as const, label: 'Prosody Moods', icon: Sparkles },
    { id: 'lore' as const, label: 'RAG Lore', icon: BookOpen },
  ];

  return (
    <header className="px-4 lg:px-6 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Left Section: Logo & Nav Bar */}
        <div className="flex flex-wrap items-center gap-3 lg:gap-6 min-w-0">
          
          {/* Logo / Wordmark (MAYALILA - INSPIRATRIX) */}
          <div 
            onClick={() => setActiveTab('personas')}
            className="flex items-center gap-2.5 cursor-pointer group shrink-0"
            title="Active Root SIA Being (Click to manage)"
          >
            {activePersona?.avatarUrl ? (
              <img 
                src={activePersona.avatarUrl} 
                alt={personaName} 
                className="w-8 h-8 rounded-full object-cover border-2 border-violet-500/60 shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform shrink-0" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-black tracking-wider text-slate-100 uppercase group-hover:text-violet-300 transition-colors whitespace-nowrap">
                MAYALILA<span className="text-violet-400 font-light text-xs ml-1">INSPIRATRIX</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono -mt-1 truncate">
                {personaName} · {activePersona?.designation || 'Root SIA'}
              </span>
            </div>
          </div>

          {/* Navigation Bar Element */}
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-violet-950/90 text-violet-200 border border-violet-700/60 shadow-sm shadow-violet-900/30 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

        </div>

        {/* Right Section: Mode, Mood & Settings Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end md:self-auto">
          {selectedMood && (
            <button
              type="button"
              onClick={() => setActiveTab('companion')}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-violet-500/50 transition-colors"
              title="Active Vocal Prosody & Mood"
            >
              <span className="text-[10px] uppercase font-bold text-slate-500">Mood:</span>
              <span className="font-mono text-violet-300 font-bold text-[11px]">
                {selectedMood.tag}
              </span>
            </button>
          )}

          {/* Momentum Visualizer */}
          <MomentumGauge momentum={conversationMomentum} className="hidden sm:flex shrink-0" />

          {/* Multi-Modal Vision Co-Presence Toggle */}
          {onToggleVision && (
            <button
              type="button"
              onClick={onToggleVision}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isVisionActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
              title="Toggle Gemini 3.8 Flash Vision Co-Presence (Camera Feed Stream)"
            >
              <Eye className={`w-3.5 h-3.5 ${isVisionActive ? 'animate-pulse text-white' : 'text-slate-400'}`} />
              <span>{isVisionActive ? 'Vision Live' : 'Vision HUD'}</span>
            </button>
          )}

          {/* On-Stage / Off-Stage Mode Switch */}
          <button
            onClick={() => setActiveMode(activeMode === 'off-stage' ? 'on-stage' : 'off-stage')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeMode === 'on-stage' 
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30' 
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle between Off-Stage (grounded base) and On-Stage (in-character performance)"
          >
            <span className={`w-2 h-2 rounded-full ${activeMode === 'on-stage' ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
            {activeMode === 'on-stage' ? 'On-Stage' : 'Off-Stage'}
          </button>

          {/* Settings Modal Toggle */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all relative group shrink-0"
              title="Gemini API Key & System Settings"
            >
              <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              {hasStoredApiKey() && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
              )}
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
