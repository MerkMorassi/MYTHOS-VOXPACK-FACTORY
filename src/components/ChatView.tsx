import React, { useState, useRef, useEffect } from 'react';
import { GlowingOrb, OrbTheme } from './GlowingOrb';
import { VoiceProfile, speakWithVoiceProfile } from '../services/voiceCloneService';
import { Persona } from '../services/personaStore';
import { ChatSession } from '../services/sessionStore';
import { 
  QuickPrompt, 
  getSavedQuickPrompts, 
  saveQuickPrompt, 
  deleteQuickPrompt 
} from '../services/quickPromptStore';
import { 
  MoodOption, 
  EXHAUSTIVE_MOODS, 
  MOOD_CATEGORIES,
  getMoodById,
  extractContextualProsody,
  findMoodByTag
} from '../services/moodStore';
import { 
  Sparkles, 
  Mic, 
  ExternalLink, 
  Volume2, 
  Film, 
  Compass, 
  Send, 
  Keyboard, 
  ChevronDown, 
  ChevronUp, 
  History, 
  Plus, 
  Trash2, 
  User, 
  BrainCircuit,
  BookmarkPlus,
  Play,
  Check,
  X,
  Filter,
  Search,
  SlidersHorizontal,
  ChartPieIcon,
  Download,
  FileAudio
} from 'lucide-react';
import { SessionMoodChart } from './SessionMoodChart';
import { useDraftPersistence } from '../hooks/useDraftPersistence';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: 'off-stage' | 'on-stage';
  timestamp: number;
  moodTag?: string;
  moodLabel?: string;
  voxLine?: any;
  imagePreview?: string;
}

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (text: string, source?: 'voice' | 'keyboard' | 'prompt') => void;
  isLoading: boolean;
  activeMode: 'off-stage' | 'on-stage';
  selectedVoice: VoiceProfile;
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
  onToggleListening: () => void;
  isListening: boolean;
  currentSpokenText?: string;
  orbTheme: OrbTheme;
  onChangeTheme: (theme: OrbTheme) => void;
  orbVolume: number;
  micUnavailable?: boolean;
  isVoiceSessionActive?: boolean;
  onEndVoiceSession?: () => void;
  onOpenVoiceStudio?: () => void;
  activePersona?: Persona;
  onOpenPersonaManager?: () => void;
  sessions?: ChatSession[];
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
  onDeleteSession?: (id: string) => void;
  selectedMood: MoodOption;
  onSelectMood: (mood: MoodOption) => void;
  onOpenMoodManager?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  onSendMessage,
  isLoading,
  activeMode,
  selectedVoice,
  state,
  onToggleListening,
  isListening,
  currentSpokenText,
  orbTheme,
  onChangeTheme,
  orbVolume,
  micUnavailable,
  isVoiceSessionActive,
  onEndVoiceSession,
  onOpenVoiceStudio,
  activePersona,
  onOpenPersonaManager,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  selectedMood,
  onSelectMood,
  onOpenMoodManager,
}) => {
  const [inputText, setInputText, clearInputDraft] = useDraftPersistence(`lila_chat_draft_${currentSessionId || 'default'}`);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [moodSearch, setMoodSearch] = useState('');
  const [moodCategoryFilter, setMoodCategoryFilter] = useState<string>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToneChart, setShowToneChart] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const moodDropdownRef = useRef<HTMLDivElement>(null);
  const sessionDrawerRef = useRef<HTMLDivElement>(null);

  // Quick Prompts State
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [promptCategory, setPromptCategory] = useState<'all' | 'scene' | 'off-stage' | 'custom'>('all');
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [newCategory, setNewCategory] = useState<'scene' | 'off-stage' | 'custom'>('scene');
  const [triggeredPromptId, setTriggeredPromptId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setQuickPrompts(getSavedQuickPrompts());
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moodDropdownRef.current && !moodDropdownRef.current.contains(event.target as Node)) {
        setShowMoodDropdown(false);
      }
      if (sessionDrawerRef.current && !sessionDrawerRef.current.contains(event.target as Node)) {
        setShowSessionDrawer(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || isSubmitting) return;
    const textToSend = inputText.trim();
    clearInputDraft();
    setIsSubmitting(true);
    
    // Explicitly pass 'keyboard' source to prevent starting mic feedback loop
    onSendMessage(textToSend, 'keyboard');
    
    setTimeout(() => {
      setIsSubmitting(false);
    }, 600);
  };

  const handlePlayMessage = (content: string) => {
    speakWithVoiceProfile(content, selectedVoice, undefined, selectedMood);
  };

  const handleTriggerPrompt = (qp: QuickPrompt) => {
    if (isLoading || isSubmitting) return;
    setTriggeredPromptId(qp.id);
    onSendMessage(qp.prompt, 'prompt');
    setTimeout(() => setTriggeredPromptId(null), 1500);
  };

  const handleSaveNewPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newPromptText.trim()) return;

    const newQp: QuickPrompt = {
      id: 'qp_custom_' + Date.now(),
      label: newLabel.trim(),
      prompt: newPromptText.trim(),
      category: newCategory,
      isBuiltIn: false,
      createdAt: Date.now(),
    };

    const updated = saveQuickPrompt(newQp);
    setQuickPrompts(updated);
    setNewLabel('');
    setNewPromptText('');
    setIsAddingPrompt(false);
  };

  const handleDeletePrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteQuickPrompt(id);
    setQuickPrompts(updated);
  };
  
  const handleExportSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const exportData = session.messages.map(msg => ({
      timestamp: msg.timestamp,
      role: msg.role,
      content: msg.content,
      moodTags: msg.moodTag ? [msg.moodTag] : [] // Format as array as requested "mood tags"
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.title.replace(/\s+/g, '-').toLowerCase()}-${new Date(session.createdAt).toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentPersonaName = activePersona?.name || 'Lila';

  const filteredPrompts = quickPrompts.filter(p => {
    if (promptCategory === 'all') return true;
    if (promptCategory === 'custom') return !p.isBuiltIn;
    return p.category === promptCategory;
  });

  const filteredMoods = EXHAUSTIVE_MOODS.filter((m) => {
    const matchesCategory = moodCategoryFilter === 'All' || m.category === moodCategoryFilter;
    const q = moodSearch.toLowerCase().trim();
    const matchesQuery = !q || 
      m.label.toLowerCase().includes(q) || 
      m.tag.toLowerCase().includes(q) || 
      m.description.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-8 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Top Status & Controls Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Active Root Persona Badge */}
        <div 
          onClick={onOpenPersonaManager}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md cursor-pointer hover:border-violet-500/50 transition-colors group"
          title="Click to manage Root Baseline Being (Persona)"
        >
          {activePersona?.avatarUrl ? (
            <img 
              src={activePersona.avatarUrl} 
              alt={activePersona.name} 
              className="w-7 h-7 rounded-full object-cover border border-violet-500/50 shrink-0" 
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center shrink-0">
              <BrainCircuit className="w-4 h-4 text-violet-300" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">Root SIA:</span>
              <span className="text-xs font-bold text-slate-100 group-hover:text-violet-300 transition-colors truncate">
                {currentPersonaName}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {activePersona?.designation || 'Baseline Being'}
            </p>
          </div>
        </div>

        {/* TTS Voice Indicator */}
        <div 
          onClick={onOpenVoiceStudio}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md cursor-pointer hover:border-violet-500/50 transition-colors group"
          title="Click to open Voice Clone Studio"
        >
          <Mic className="w-4 h-4 text-violet-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">TTS Voice:</span>
              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-violet-300" />
            </div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-violet-300 truncate block">
              {selectedVoice.name}
            </span>
            {selectedVoice.sampleFileName && (
              <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                <FileAudio className="w-2.5 h-2.5" /> LIVE SAMPLE
              </span>
            )}
          </div>
        </div>

        {/* Mood Selection & Vocal Prosody Dropdown */}
        <div className="relative" ref={moodDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setShowMoodDropdown(!showMoodDropdown);
              setShowSessionDrawer(false);
            }}
            className={`w-full h-full flex items-center justify-between gap-2.5 px-4 py-2.5 rounded-xl border backdrop-blur-md transition-all text-xs font-medium ${
              showMoodDropdown 
                ? 'border-violet-400 ring-2 ring-violet-500/50 bg-violet-950/60 text-white shadow-lg shadow-violet-900/30' 
                : 'border-violet-500/40 bg-slate-900/80 hover:border-violet-400 hover:bg-slate-900 text-slate-200 shadow-md'
            }`}
            title="Click to open full Vocal Mood & Prosody selector"
          >
            <div className="flex items-center gap-2.5 truncate text-left min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Mood:</span>
                  <span className="text-xs font-mono text-violet-200 font-bold bg-violet-950 px-2 py-0.5 rounded border border-violet-800/60">
                    {selectedMood.tag}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-100 group-hover:text-violet-200 truncate block">
                  {selectedMood.label}
                </span>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-amber-300 transition-transform duration-200 shrink-0 ${showMoodDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Moods Dropdown Panel */}
          {showMoodDropdown && (
            <div className="absolute left-0 sm:left-auto sm:right-0 lg:left-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl p-3.5 z-50 backdrop-blur-xl space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-bold text-slate-100">Vocal Prosody & Mood</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Dynamically influences Lila's emotional tone, pitch & cadence
                  </p>
                </div>
                <span className="text-[10px] font-mono text-violet-300 font-semibold bg-violet-950 border border-violet-800/60 px-2 py-0.5 rounded-full">
                  {selectedMood.tag}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={moodSearch}
                  onChange={(e) => setMoodSearch(e.target.value)}
                  placeholder="Search moods or tags (e.g. whisper, dramatic, excited)..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
                {moodSearch && (
                  <button
                    onClick={() => setMoodSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
                {MOOD_CATEGORIES.map((cat) => {
                  const isActive = moodCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setMoodCategoryFilter(cat)}
                      className={`px-2 py-1 rounded-md whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-violet-600 text-white font-medium shadow-sm'
                          : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Exhaustive Moods Scrollable List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {filteredMoods.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-500">
                    No moods matching "{moodSearch}"
                  </p>
                ) : (
                  filteredMoods.map((mood) => {
                    const isSelected = mood.id === selectedMood.id;
                    return (
                      <div
                        key={mood.id}
                        onClick={() => {
                          onSelectMood(mood);
                          setShowMoodDropdown(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-violet-950/70 border-violet-500/80 ring-1 ring-violet-500/40'
                            : 'bg-slate-950/40 border-slate-800/70 hover:border-violet-500/50 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                              isSelected 
                                ? 'bg-violet-600 text-white' 
                                : 'bg-slate-800 text-violet-300 border border-violet-900/60'
                            }`}>
                              {mood.tag}
                            </span>
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {mood.label}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {mood.description}
                        </p>

                        <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                          <span className="text-slate-400">{mood.category}</span>
                          <span className="text-slate-400">
                            Pitch: {((mood.pitchMod || 1.0) * 100).toFixed(0)}% · Rate: {((mood.rateMod || 1.0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Informational Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>{filteredMoods.length} moods shown ({EXHAUSTIVE_MOODS.length} total)</span>
                {onOpenMoodManager ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoodDropdown(false);
                      onOpenMoodManager();
                    }}
                    className="text-violet-400 hover:text-violet-300 font-medium underline flex items-center gap-1"
                  >
                    View All 100 Cards →
                  </button>
                ) : (
                  <span className="text-violet-400/80 font-mono">Prepends prosody tag</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat Sessions / History Switcher Button */}
        <div className="relative" ref={sessionDrawerRef}>
          <button
            onClick={() => {
              setShowSessionDrawer(!showSessionDrawer);
              setShowMoodDropdown(false);
            }}
            className="w-full h-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md hover:border-violet-500/50 transition-colors text-xs font-medium text-slate-300 hover:text-slate-100"
          >
            <div className="flex items-center gap-2 truncate">
              <History className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="truncate">
                {sessions.find(s => s.id === currentSessionId)?.title || 'Chat History'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showSessionDrawer ? 'rotate-180' : ''}`} />
          </button>

          {/* Sessions Dropdown Menu */}
          {showSessionDrawer && (
            <div className="absolute right-0 top-full mt-2 w-72 md:w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 backdrop-blur-xl space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Conversation History</span>
                {onNewSession && (
                  <button
                    onClick={() => {
                      onNewSession();
                      setShowSessionDrawer(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-medium flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3 h-3" /> New Chat
                  </button>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1">
                {sessions.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-500">No saved history yet.</p>
                ) : (
                  sessions.map((s) => {
                    const isSelected = s.id === currentSessionId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (onSelectSession) onSelectSession(s.id);
                          setShowSessionDrawer(false);
                        }}
                        className={`p-2.5 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs ${
                          isSelected
                            ? 'bg-violet-600/20 text-violet-200 border border-violet-500/40 font-semibold'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate">{s.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {s.messages.length} msgs
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleExportSession(s, e)}
                            className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-slate-700/50"
                            title="Export session as JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          
                          {onDeleteSession && sessions.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(s.id);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700/50"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tone Insights Button (Opens Recharts Pie Chart) */}
        <button
          type="button"
          onClick={() => setShowToneChart(true)}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md cursor-pointer hover:border-violet-500/50 hover:bg-slate-900 transition-all text-left group"
          title="Open session tone & vocal prosody pie chart visualization"
        >
          <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center shrink-0">
            <ChartPieIcon className="w-4 h-4 text-pink-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 block leading-tight">Performance:</span>
            <span className="text-xs font-bold text-slate-200 group-hover:text-pink-300 truncate block">
              Tone Insights
            </span>
          </div>
        </button>

        {/* Export Current Session Button */}
        <button
          type="button"
          onClick={(e) => {
            const currentSession = sessions.find(s => s.id === currentSessionId);
            if (currentSession) handleExportSession(currentSession, e);
          }}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left group"
          title="Export the current chat session's history as a JSON file"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-slate-400 block leading-tight">Data:</span>
            <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate block">
              Export Session
            </span>
          </div>
        </button>
      </div>

      {/* DEDICATED MOOD SELECTION DROPDOWN & PROSODY CONTROL BAR */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-violet-950/40 to-slate-900/90 border border-violet-500/40 shadow-xl backdrop-blur-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Mood Selection (Dynamic Vocal Prosody)
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-violet-950 text-violet-300 border border-violet-800 shadow-sm">
                  {selectedMood.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Prepends emotional tone tag to system instructions to dynamically modulate Lila's delivery, pitch, and cadence.
              </p>
            </div>
          </div>

          {/* Primary Native <select> Dropdown containing all exhaustive moods */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label htmlFor="mood-dropdown-select" className="text-xs font-bold text-amber-300 whitespace-nowrap shrink-0">
              Vocal Mood:
            </label>
            <select
              id="mood-dropdown-select"
              value={selectedMood.id}
              onChange={(e) => {
                const m = getMoodById(e.target.value);
                onSelectMood(m);
              }}
              className="flex-1 md:w-72 bg-slate-950 border border-violet-500/60 hover:border-violet-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/40 text-xs font-semibold text-slate-100 rounded-xl px-3 py-2 outline-none cursor-pointer shadow-lg"
            >
              {MOOD_CATEGORIES.filter(c => c !== 'All').map((category) => (
                <optgroup key={category} label={category} className="bg-slate-900 text-slate-300 font-bold">
                  {EXHAUSTIVE_MOODS.filter(m => m.category === category).map((mood) => (
                    <option key={mood.id} value={mood.id} className="bg-slate-950 text-slate-100 font-normal">
                      {mood.tag} {mood.label} — {mood.description.substring(0, 36)}...
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* 1-Click Quick Mood Switchers */}
        <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">
            Quick Moods:
          </span>
          {[
            { id: 'natural', tag: '[natural]', name: 'Natural' },
            { id: 'excited', tag: '[excited]', name: 'Excited' },
            { id: 'whisper', tag: '[whisper]', name: 'Whisper' },
            { id: 'dramatic', tag: '[dramatic]', name: 'Dramatic' },
            { id: 'noir', tag: '[noir]', name: 'Noir' },
            { id: 'playful', tag: '[playful]', name: 'Playful' },
            { id: 'warm', tag: '[warm]', name: 'Warm' },
            { id: 'urgent', tag: '[urgent]', name: 'Urgent' },
            { id: 'melancholic', tag: '[melancholic]', name: 'Melancholic' },
            { id: 'inquisitive', tag: '[inquisitive]', name: 'Curious' },
          ].map((item) => {
            const isSelected = selectedMood.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectMood(getMoodById(item.id))}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30 ring-1 ring-violet-400 scale-[1.03]'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="font-mono text-[10px] text-violet-300 font-semibold">{item.tag}</span>
                <span>{item.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowMoodDropdown(!showMoodDropdown)}
            className="ml-auto text-[11px] text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Search all {EXHAUSTIVE_MOODS.length} moods...</span>
          </button>
        </div>
      </div>

      {/* Primary Voice Turn-Taking Orb Component */}
      <GlowingOrb
        state={isLoading ? 'thinking' : state}
        onToggleListening={onToggleListening}
        isListening={isListening}
        activeMode={activeMode}
        currentText={currentSpokenText}
        orbTheme={orbTheme}
        onChangeTheme={onChangeTheme}
        volume={orbVolume}
        micUnavailable={micUnavailable}
        isVoiceSessionActive={isVoiceSessionActive}
        onEndVoiceSession={onEndVoiceSession}
        selectedMood={selectedMood}
      />

      {/* QUICK PROMPTS & SCENE SETTERS (Full Save & Single-Click Trigger) */}
      <div className="space-y-3.5 p-5 rounded-2xl bg-slate-900/50 border border-slate-800/90 backdrop-blur-md shadow-xl">
        {/* Header with Title and Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Quick Prompts & Scene Triggers
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              (Single-Click Trigger)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => setPromptCategory('all')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  promptCategory === 'all' 
                    ? 'bg-violet-600 text-white font-semibold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPromptCategory('scene')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  promptCategory === 'scene' 
                    ? 'bg-violet-600 text-white font-semibold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Scenes
              </button>
              <button
                onClick={() => setPromptCategory('off-stage')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  promptCategory === 'off-stage' 
                    ? 'bg-violet-600 text-white font-semibold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Off-Stage
              </button>
              <button
                onClick={() => setPromptCategory('custom')}
                className={`px-2 py-0.5 rounded-lg transition-colors ${
                  promptCategory === 'custom' 
                    ? 'bg-violet-600 text-white font-semibold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Custom
              </button>
            </div>

            {/* Add Custom Prompt Button */}
            <button
              onClick={() => setIsAddingPrompt(!isAddingPrompt)}
              className="px-3 py-1 rounded-xl bg-violet-600/30 text-violet-300 border border-violet-500/40 hover:bg-violet-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              {isAddingPrompt ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {isAddingPrompt ? 'Cancel' : 'Add Prompt'}
            </button>
          </div>
        </div>

        {/* Form to create and save a new Quick Prompt */}
        {isAddingPrompt && (
          <form onSubmit={handleSaveNewPrompt} className="p-4 rounded-xl bg-slate-950/90 border border-violet-500/40 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-violet-400" /> Save New Quick Prompt
              </span>
              <span className="text-[10px] text-slate-500">Persisted locally</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Prompt Label / Role Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Victorian Alchemist, Cyberpunk Hacker, Rehearsal Beat"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="scene">Roleplay Scene (On-Stage)</option>
                  <option value="off-stage">Off-Stage Conversation</option>
                  <option value="custom">General Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Conversation Starter or Scene-Setting Line <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={2}
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="The exact message sent to trigger the conversation or role..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-violet-500 leading-relaxed font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingPrompt(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md"
              >
                <Check className="w-3.5 h-3.5" /> Save Quick Prompt
              </button>
            </div>
          </form>
        )}

        {/* Quick Prompts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredPrompts.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500 md:col-span-2">
              No quick prompts found in this category. Click "+ Add Prompt" to create one.
            </p>
          ) : (
            filteredPrompts.map((qp) => {
              const isTriggered = triggeredPromptId === qp.id;
              return (
                <div
                  key={qp.id}
                  onClick={() => handleTriggerPrompt(qp)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
                    isTriggered
                      ? 'bg-violet-950/80 border-violet-400 shadow-lg shadow-violet-500/20 scale-[0.99]'
                      : 'bg-slate-950/60 border-slate-800/90 hover:border-violet-500/70 hover:bg-slate-900/80 hover:shadow-md'
                  }`}
                  title="Click to trigger this prompt immediately"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {qp.category === 'scene' ? (
                          <Film className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        ) : (
                          <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-slate-200 group-hover:text-violet-300 transition-colors truncate">
                          {qp.label}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                          qp.category === 'scene' 
                            ? 'bg-violet-950 text-violet-300 border border-violet-800/60' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {qp.category === 'scene' ? 'Scene' : 'Off-Stage'}
                        </span>

                        {!qp.isBuiltIn && (
                          <button
                            onClick={(e) => handleDeletePrompt(qp.id, e)}
                            className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Delete custom prompt"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      "{qp.prompt}"
                    </p>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 group-hover:text-violet-400 transition-colors">
                      <Play className="w-2.5 h-2.5 fill-current" /> Single-click trigger
                    </span>
                    {isTriggered && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Sending...
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live Conversation Transcript */}
      <div className="space-y-4 flex-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Live Spoken Transcript
        </h3>

        <div className="space-y-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md max-h-[450px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Push to talk above or trigger a Quick Prompt to begin your live voice session with {currentPersonaName}.
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      {isAssistant && activePersona?.avatarUrl && (
                        <img src={activePersona.avatarUrl} alt="" className="w-3.5 h-3.5 rounded-full inline object-cover" />
                      )}
                      {isAssistant ? currentPersonaName : 'You'}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${msg.mode === 'on-stage' ? 'bg-violet-950 text-violet-300 border border-violet-800' : 'bg-slate-800 text-slate-400'}`}>
                      {msg.mode === 'on-stage' ? 'On-Stage' : 'Off-Stage'}
                    </span>
                    {isAssistant && (msg.moodTag || extractContextualProsody(msg.content).detectedTag) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950/90 text-amber-300 border border-amber-500/40 font-mono font-bold flex items-center gap-1 shadow-sm">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        {msg.moodTag || extractContextualProsody(msg.content).detectedTag}
                      </span>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed max-w-2xl relative group ${
                      isAssistant
                        ? 'bg-slate-900 border border-slate-800 text-slate-200 shadow-lg'
                        : 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                    }`}
                  >
                    {msg.imagePreview && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-w-xs shadow-md">
                        <img src={msg.imagePreview} alt="Captured camera scene" className="w-full h-auto object-cover" />
                        <span className="block text-[9px] font-mono px-2 py-0.5 bg-slate-950/80 text-violet-300">
                          Eye of Lila Vision Frame
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {isAssistant && (
                      <button
                        onClick={() => handlePlayMessage(msg.content)}
                        className="absolute -right-10 top-3 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Replay with cloned voice"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Keyboard Fallback Drawer (Collapsible) */}
      <div className="pt-2">
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1.5 transition-colors mb-2 ml-auto"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>{showManualInput ? 'Hide keyboard input' : 'Optional keyboard input'}</span>
          {showManualInput ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showManualInput && (
          <form onSubmit={handleSubmit} className="sticky bottom-4 z-40">
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {['natural', 'excited', 'whisper', 'dramatic', 'noir', 'playful', 'warm'].map((id) => {
                const mood = getMoodById(id);
                const isSelected = mood.id === selectedMood.id;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => onSelectMood(mood)}
                    className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mood.tag} {mood.label.split('&')[0].trim()}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 p-2 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl backdrop-blur-md">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={activeMode === 'on-stage' ? "Deliver your line for the scene..." : `Type text message to ${currentPersonaName}...`}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-100 focus:outline-none placeholder-slate-500"
                disabled={isLoading || isSubmitting}
              />
              <button
                type="submit"
                disabled={isLoading || isSubmitting || !inputText.trim()}
                className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg shadow-violet-600/30"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Session Mood Recharts Visualization Modal */}
      <SessionMoodChart
        isOpen={showToneChart}
        onClose={() => setShowToneChart(false)}
        messages={messages}
        sessionTitle={sessions.find(s => s.id === currentSessionId)?.title}
      />
    </div>
  );
};
