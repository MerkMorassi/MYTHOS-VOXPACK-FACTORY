import React from 'react';
import { Mic, Sparkles, MessageSquare, BookOpen, BrainCircuit, Settings } from 'lucide-react';
import { Persona } from '../services/personaStore';
import { hasStoredApiKey } from '../services/apiKeyStore';

interface HeaderProps {
  activeTab: 'companion' | 'studio' | 'lore' | 'personas' | 'moods';
  setActiveTab: (tab: 'companion' | 'studio' | 'lore' | 'personas' | 'moods') => void;
  activeMode: 'off-stage' | 'on-stage';
  setActiveMode: (mode: 'off-stage' | 'on-stage') => void;
  activePersona?: Persona;
  selectedMood?: { id: string; label: string; tag: string };
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeTab, 
  setActiveTab, 
  activeMode, 
  setActiveMode,
  activePersona,
  selectedMood,
  onOpenSettings,
}) => {
  const personaName = activePersona?.name || 'LILA';

  return (
    <header className="flex items-center justify-between gap-6 px-6 py-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark + Persona avatar */}
      <div 
        onClick={() => setActiveTab('personas')}
        className="flex items-center gap-3 cursor-pointer group"
        title="Active Root SIA Persona (Click to manage)"
      >
        {activePersona?.avatarUrl ? (
          <img 
            src={activePersona.avatarUrl} 
            alt={personaName} 
            className="w-8 h-8 rounded-full object-cover border-2 border-violet-500/60 shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform" 
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-slate-100 uppercase group-hover:text-violet-300 transition-colors whitespace-nowrap shrink-0">
            {personaName}
          </span>
          <span className="text-[10px] text-slate-400 -mt-1 font-mono">
            {activePersona?.designation || 'Root SIA Being'}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-400">
        <button 
          onClick={() => setActiveTab('companion')}
          className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'companion' ? 'text-violet-400 font-semibold' : 'hover:text-slate-100'}`}
        >
          <MessageSquare className="w-4 h-4" /> Live Companion
        </button>
        <button 
          onClick={() => setActiveTab('personas')}
          className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'personas' ? 'text-violet-400 font-semibold' : 'hover:text-slate-100'}`}
        >
          <BrainCircuit className="w-4 h-4" /> Root Being (SIA)
        </button>
        <button 
          onClick={() => setActiveTab('studio')}
          className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'studio' ? 'text-violet-400 font-semibold' : 'hover:text-slate-100'}`}
        >
          <Mic className="w-4 h-4" /> Voice Studio
        </button>
        <button 
          onClick={() => setActiveTab('moods')}
          className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'moods' ? 'text-violet-400 font-semibold' : 'hover:text-slate-100'}`}
        >
          <Sparkles className="w-4 h-4" /> Prosody Moods
        </button>
        <button 
          onClick={() => setActiveTab('lore')}
          className={`transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeTab === 'lore' ? 'text-violet-400 font-semibold' : 'hover:text-slate-100'}`}
        >
          <BookOpen className="w-4 h-4" /> RAG Lore
        </button>
      </nav>

      {/* Zone 3: Mode switch & Active Mood */}
      <div className="flex items-center gap-3 shrink-0">
        {selectedMood && (
          <button
            type="button"
            onClick={() => setActiveTab('companion')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-violet-500/50 transition-colors"
            title="Active Vocal Prosody & Mood (Influences Lila's vocal inflection)"
          >
            <span className="text-[10px] uppercase font-bold text-slate-400">Mood:</span>
            <span className="font-mono text-violet-300 font-bold bg-violet-950 px-1.5 py-0.5 rounded border border-violet-800/60 text-[11px]">
              {selectedMood.tag}
            </span>
            <span className="text-slate-200 font-medium hidden xl:inline">
              {selectedMood.label}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveMode(activeMode === 'off-stage' ? 'on-stage' : 'off-stage')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-2 ${
            activeMode === 'on-stage' 
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' 
              : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
          }`}
          title="Toggle between Off-Stage (grounded self) and On-Stage (in-character performance)"
        >
          <span className={`w-2 h-2 rounded-full ${activeMode === 'on-stage' ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></span>
          {activeMode === 'on-stage' ? 'On-Stage (Roleplay)' : 'Off-Stage (Base)'}
        </button>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-violet-500/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-all relative group shrink-0"
            title="Gemini API Key & System Settings"
          >
            <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
            {hasStoredApiKey() && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
            )}
          </button>
        )}
      </div>
    </header>
  );
};
