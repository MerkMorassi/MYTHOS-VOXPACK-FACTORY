import React from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Volume2, Sparkles, Palette, PhoneOff } from 'lucide-react';

export type OrbTheme = 'spectral' | 'neon' | 'minimal' | 'solaris';

interface GlowingOrbProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  onToggleListening: () => void;
  isListening: boolean;
  activeMode: 'off-stage' | 'on-stage';
  currentText?: string;
  orbTheme: OrbTheme;
  onChangeTheme: (theme: OrbTheme) => void;
  volume: number;
  micUnavailable?: boolean;
  isVoiceSessionActive?: boolean;
  onEndVoiceSession?: () => void;
  selectedMood?: { id: string; label: string; tag: string };
}

export const GlowingOrb: React.FC<GlowingOrbProps> = ({
  state,
  onToggleListening,
  isListening,
  activeMode,
  currentText,
  orbTheme,
  onChangeTheme,
  volume,
  isVoiceSessionActive,
  onEndVoiceSession,
  selectedMood,
}) => {
  const getThemeStyles = () => {
    switch (orbTheme) {
      case 'neon':
        if (state === 'speaking') return 'from-pink-500 via-rose-500 to-fuchsia-600 shadow-pink-500/60 ring-2 ring-pink-400';
        if (state === 'listening') return 'from-cyan-400 via-teal-400 to-emerald-500 shadow-cyan-400/60 ring-2 ring-cyan-300';
        if (state === 'thinking') return 'from-yellow-400 via-amber-500 to-orange-500 shadow-amber-400/60 ring-2 ring-amber-300';
        return 'from-fuchsia-600 via-purple-600 to-cyan-500 shadow-fuchsia-500/50';

      case 'minimal':
        if (state === 'speaking') return 'from-slate-200 via-slate-400 to-slate-600 shadow-slate-300/40 border border-slate-400';
        if (state === 'listening') return 'from-slate-300 via-zinc-400 to-slate-500 shadow-zinc-400/40 border border-zinc-400';
        if (state === 'thinking') return 'from-zinc-400 via-slate-500 to-zinc-600 shadow-zinc-500/40 border border-slate-500';
        return 'from-slate-800 via-slate-900 to-black shadow-slate-900/80 border border-slate-700';

      case 'solaris':
        if (state === 'speaking') return 'from-amber-400 via-orange-500 to-red-600 shadow-orange-500/60';
        if (state === 'listening') return 'from-yellow-300 via-amber-400 to-orange-500 shadow-yellow-400/60';
        if (state === 'thinking') return 'from-orange-400 via-amber-600 to-yellow-600 shadow-amber-500/60';
        return 'from-amber-500 via-orange-600 to-yellow-500 shadow-amber-600/50';

      case 'spectral':
      default:
        if (state === 'speaking') return 'from-indigo-500 via-purple-500 to-pink-500 shadow-purple-500/50';
        if (state === 'listening') return 'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/50';
        if (state === 'thinking') return 'from-amber-500 via-orange-500 to-yellow-500 shadow-amber-500/50';
        return activeMode === 'on-stage' 
          ? 'from-violet-600 via-fuchsia-600 to-indigo-600 shadow-violet-600/40'
          : 'from-blue-600 via-indigo-600 to-violet-600 shadow-indigo-600/40';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'listening': 
        return 'Listening to you... speak naturally';
      case 'thinking': 
        return 'Lila is reflecting...';
      case 'speaking': 
        return 'Lila is speaking... (tap orb to interrupt)';
      default: 
        if (isVoiceSessionActive) {
          return 'Turn-taking active · Waiting for your turn';
        }
        return 'Push to talk · Tap orb to begin live conversation';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 relative">
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none animate-pulse"></div>

      {/* Theme Selector Menu */}
      <div className="absolute top-2 right-4 flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 backdrop-blur-md z-20">
        <Palette className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[11px] font-medium text-slate-400 mr-1">Theme:</span>
        {(['spectral', 'neon', 'minimal', 'solaris'] as OrbTheme[]).map((t) => (
          <button
            key={t}
            onClick={() => onChangeTheme(t)}
            className={`px-2 py-0.5 text-[11px] rounded-lg capitalize transition-colors ${
              orbTheme === t 
                ? 'bg-violet-600 text-white font-semibold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative flex items-center justify-center mb-6 mt-4">
        {/* Ripple rings when active */}
        {(state === 'listening' || state === 'speaking' || isListening) && (
          <>
            <motion.div
              className="absolute w-64 h-64 rounded-full border border-violet-500/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-52 h-52 rounded-full border border-indigo-500/40"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
          </>
        )}

        {/* Central Orb */}
        <motion.button
          onClick={onToggleListening}
          className={`relative w-44 h-44 rounded-full bg-gradient-to-br ${getThemeStyles()} shadow-2xl flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-violet-500/40`}
          animate={{
            scale: state === 'speaking' ? [1, 1.08 + (volume / 100), 1] : state === 'thinking' ? [1, 0.96, 1] : state === 'listening' ? [1, 1.05, 1] : [1, 1.02, 1],
          }}
          transition={{
            duration: state === 'speaking' ? 0.2 : state === 'listening' ? 1.5 : 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          title={isVoiceSessionActive ? (state === 'speaking' ? 'Tap to interrupt' : 'Tap to toggle mic') : 'Tap to start voice conversation'}
        >
          {/* Internal core lighting highlight */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-white/20 via-transparent to-black/30 pointer-events-none"></div>

          {/* Icon indicator */}
          <div className="relative z-10 text-white flex flex-col items-center">
            {state === 'speaking' ? (
              <Volume2 className="w-12 h-12 animate-bounce" />
            ) : state === 'listening' || isListening ? (
              <Mic className="w-12 h-12 animate-pulse text-emerald-200" />
            ) : (
              <Sparkles className="w-12 h-12 text-white/90" />
            )}
          </div>
        </motion.button>
      </div>

      {/* Status & prompt hint */}
      <div className="text-center space-y-2 z-10 max-w-md">
        <div className="flex items-center justify-center gap-2">
          {isVoiceSessionActive && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          )}
          <p className="text-sm font-medium text-slate-200 tracking-wide">
            {getStatusText()}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500">
            {activeMode === 'on-stage' ? 'Active Mode: On-Stage' : 'Active Mode: Off-Stage'}
          </span>
          {selectedMood && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-violet-300 font-mono font-medium flex items-center gap-1">
                Mood: <strong className="text-amber-300">{selectedMood.tag}</strong> {selectedMood.label.split('&')[0].trim()}
              </span>
            </>
          )}
        </div>

        {currentText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-sm italic backdrop-blur-sm shadow-xl max-w-lg mx-auto"
          >
            "{currentText}"
          </motion.div>
        )}
      </div>

      {/* Voice Session Controls */}
      <div className="mt-6 flex items-center gap-3">
        {!isVoiceSessionActive ? (
          <button
            onClick={onToggleListening}
            className="px-7 py-3 rounded-full font-medium text-sm transition-all duration-200 flex items-center gap-2.5 shadow-lg bg-violet-600 text-white shadow-violet-600/30 hover:bg-violet-500 active:scale-95"
          >
            <Mic className="w-4 h-4" />
            Push to Talk / Start Voice Conversation
          </button>
        ) : (
          <>
            <button
              onClick={onToggleListening}
              className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-lg ${
                state === 'speaking'
                  ? 'bg-amber-600 text-white shadow-amber-600/30 hover:bg-amber-500'
                  : isListening
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {state === 'speaking' ? (
                <>Interrupt Lila</>
              ) : isListening ? (
                <><Mic className="w-4 h-4 animate-pulse" /> Listening to you</>
              ) : (
                <><Mic className="w-4 h-4" /> Mic Ready</>
              )}
            </button>

            {onEndVoiceSession && (
              <button
                onClick={onEndVoiceSession}
                className="px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-lg bg-rose-600/90 text-white hover:bg-rose-600 shadow-rose-600/20 active:scale-95"
                title="End the turn-taking voice session"
              >
                <PhoneOff className="w-4 h-4" />
                End Conversation
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
