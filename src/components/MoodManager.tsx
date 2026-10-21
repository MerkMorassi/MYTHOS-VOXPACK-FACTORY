import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Search, 
  Volume2, 
  Play, 
  Square, 
  Download, 
  RefreshCw, 
  SlidersHorizontal,
  Bot,
  Zap,
  Info
} from 'lucide-react';
import { 
  MoodOption, 
  EXHAUSTIVE_MOODS, 
  getSavedMoods, 
  saveMood, 
  deleteMood, 
  MOOD_CATEGORIES,
  isContextualProsodyEnabled,
  setContextualProsodyEnabled,
  generateTone
} from '../services/moodStore';
import { speakWithVoiceProfile, stopCurrentAudio, getSavedVoiceProfiles } from '../services/voiceCloneService';

export const MoodManager: React.FC = () => {
  const [moods, setMoods] = useState<MoodOption[]>(getSavedMoods());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingMood, setEditingMood] = useState<Partial<MoodOption> | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [playingMoodId, setPlayingMoodId] = useState<string | null>(null);
  const [dynamicProsody, setDynamicProsody] = useState<boolean>(isContextualProsodyEnabled());

  const handleToggleDynamicProsody = () => {
    const nextVal = !dynamicProsody;
    setDynamicProsody(nextVal);
    setContextualProsodyEnabled(nextVal);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMood || !editingMood.label || !editingMood.tag) return;
    
    const tagFormatted = editingMood.tag.startsWith('[') 
      ? editingMood.tag 
      : `[${editingMood.tag.replace(/[\[\]]/g, '')}]`;

    const moodToSave: MoodOption = {
      id: editingMood.id || `custom_${Date.now()}`,
      label: editingMood.label,
      tag: tagFormatted,
      category: (editingMood.category as any) || 'Custom',
      description: editingMood.description || 'Custom crafted prosody inflection',
      tone: generateTone(editingMood.description || ''),
      pace: {
        rate: editingMood.rateMod ?? 1.0,
        pause: 'normal',
        articulation: 'neutral'
      },
      pitchMod: editingMood.pitchMod ?? 1.0,
      rateMod: editingMood.rateMod ?? 1.0,
      volumeMod: editingMood.volumeMod ?? 1.0,
    };
    
    saveMood(moodToSave);
    setMoods(getSavedMoods());
    setEditingMood(null);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    deleteMood(id);
    setMoods(getSavedMoods());
  };

  const handleResetToBaseline = () => {
    if (window.confirm('Reset all moods to the 100 clean Voxpack baseline? Any custom moods will be removed.')) {
      localStorage.removeItem('lila_custom_moods');
      setMoods(EXHAUSTIVE_MOODS);
    }
  };

  const handleExportJSON = () => {
    const exportData = moods.map(m => ({
      tag: m.tag,
      description: m.description,
      label: m.label,
      category: m.category,
      pitchMod: m.pitchMod,
      rateMod: m.rateMod,
      volumeMod: m.volumeMod,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxpack_prosody_moods_${moods.length}_clean.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewAudio = (mood: MoodOption) => {
    if (playingMoodId === mood.id) {
      stopCurrentAudio();
      setPlayingMoodId(null);
      return;
    }

    stopCurrentAudio();
    setPlayingMoodId(mood.id);

    const profiles = getSavedVoiceProfiles();
    const activeProfile = profiles[0] || {
      id: 'default',
      name: 'Lila Prime',
      pitch: 1.0,
      rate: 1.0,
      tone: 'velvet',
      baseVoice: 'Kore',
      vocalStyle: 'Warm conversational female voice'
    };

    const previewSentence = `Speaking with ${mood.tag} cadence. ${mood.description.slice(0, 75)}.`;

    speakWithVoiceProfile(
      previewSentence,
      activeProfile,
      () => setPlayingMoodId(null),
      mood
    );
  };

  // Filter moods based on category and search query
  const filteredMoods = moods.filter(m => {
    const matchesCat = selectedCategory === 'All' || m.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      m.label.toLowerCase().includes(q) ||
      m.tag.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-8">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-400" /> Voxpack Dynamic Prosody
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-violet-950 border border-violet-800 text-xs font-mono font-bold text-violet-300">
              {moods.length} Moods
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Baseline acoustic prosody palette. Lila modulates pitch, cadence, and vocal dynamics to embody distinct emotional states.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Export clean 100 moods JSON file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export JSON
          </button>

          <button
            onClick={handleResetToBaseline}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Reset to 100 clean Voxpack baseline moods"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Reset Baseline
          </button>

          <button
            onClick={() => { setEditingMood({}); setIsAdding(true); }}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-violet-600/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Custom Mood
          </button>
        </div>
      </div>

      {/* Contextual Dynamic Prosody Feature Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-slate-900/60 to-slate-900/40 border border-violet-500/30 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-violet-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Contextual Dynamic Prosody Engine</h2>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${dynamicProsody ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                {dynamicProsody ? 'Active' : 'Manual Tagging'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl">
              When active, Gemini analyzes dialogue context and selects the exact fitting prosody tag (e.g. <span className="font-mono text-violet-300">[joyful]</span>, <span className="font-mono text-violet-300">[whisper]</span>, <span className="font-mono text-violet-300">[oracular]</span>) to dynamically steer pitch, speed, and acoustic warmth.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleDynamicProsody}
          className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
            dynamicProsody
              ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-600/30'
              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          {dynamicProsody ? 'Enabled (Auto-Adapting)' : 'Enable Dynamic Adaptation'}
        </button>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tag, label, acoustic keyword (e.g., whisper, pitch, laban, slow, angry)..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-mono shrink-0">
            Showing <span className="text-violet-300 font-bold">{filteredMoods.length}</span> of {moods.length} cards
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none text-xs">
          {MOOD_CATEGORIES.map(category => {
            const count = category === 'All' 
              ? moods.length 
              : moods.filter(m => m.category === category).length;
            const isActive = selectedCategory === category;
            
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 font-medium ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <span>{category}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-violet-800 text-violet-200' : 'bg-slate-800 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Form Drawer */}
      {(isAdding || editingMood) && (
        <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900 border border-violet-500/50 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-violet-400" />
              {editingMood?.id ? 'Edit Prosody Mood' : 'Create New Prosody Mood'}
            </h2>
            <button 
              type="button" 
              onClick={() => { setEditingMood(null); setIsAdding(false); }}
              className="text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Label Name</label>
              <input 
                placeholder="e.g. Furious & Seething" 
                value={editingMood?.label || ''} 
                onChange={e => setEditingMood({...editingMood, label: e.target.value})} 
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-violet-500" 
                required 
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Tag (e.g. [furious])</label>
              <input 
                placeholder="furious" 
                value={editingMood?.tag?.replace(/[\[\]]/g, '') || ''} 
                onChange={e => setEditingMood({...editingMood, tag: e.target.value})} 
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-violet-500" 
                required 
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Category</label>
              <select 
                value={editingMood?.category || 'Custom'} 
                onChange={e => setEditingMood({...editingMood, category: e.target.value as any})} 
                className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              >
                {MOOD_CATEGORIES.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Pitch Multiplier (0.5 - 2.0)</label>
              <input 
                type="number" 
                step="0.05" 
                min="0.5" 
                max="2.0" 
                value={editingMood?.pitchMod ?? 1.0} 
                onChange={e => setEditingMood({...editingMood, pitchMod: parseFloat(e.target.value)})} 
                className="w-full bg-slate-950 p-2 rounded-xl border border-slate-700 text-xs text-slate-100 font-mono" 
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Rate / Tempo (0.5 - 2.0)</label>
              <input 
                type="number" 
                step="0.05" 
                min="0.5" 
                max="2.0" 
                value={editingMood?.rateMod ?? 1.0} 
                onChange={e => setEditingMood({...editingMood, rateMod: parseFloat(e.target.value)})} 
                className="w-full bg-slate-950 p-2 rounded-xl border border-slate-700 text-xs text-slate-100 font-mono" 
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Volume Multiplier (0.0 - 1.0)</label>
              <input 
                type="number" 
                step="0.05" 
                min="0.0" 
                max="1.0" 
                value={editingMood?.volumeMod ?? 1.0} 
                onChange={e => setEditingMood({...editingMood, volumeMod: parseFloat(e.target.value)})} 
                className="w-full bg-slate-950 p-2 rounded-xl border border-slate-700 text-xs text-slate-100 font-mono" 
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Acoustic & Inflection Description</label>
            <textarea 
              rows={2}
              placeholder="e.g. Loud strained chest voice, hard consonant attacks, wide pitch peaks, shouting with explosive stresses" 
              value={editingMood?.description || ''} 
              onChange={e => setEditingMood({...editingMood, description: e.target.value})} 
              className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-violet-500" 
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => { setEditingMood(null); setIsAdding(false); }} 
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2 rounded-xl bg-violet-600 text-xs text-white font-medium hover:bg-violet-500 shadow-md shadow-violet-600/30"
            >
              Save Prosody Mood
            </button>
          </div>
        </form>
      )}

      {/* Cards Grid */}
      {filteredMoods.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No prosody moods found matching "{searchQuery}".</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
            className="mt-3 text-xs text-violet-400 hover:text-violet-300 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMoods.map(mood => {
            const isPlaying = playingMoodId === mood.id;
            const isBuiltIn = EXHAUSTIVE_MOODS.some(b => b.id === mood.id);

            return (
              <div 
                key={mood.id} 
                className="group relative p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-violet-500/50 hover:bg-slate-900 transition-all flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-violet-950/20"
              >
                <div className="space-y-2.5">
                  {/* Card Header: Tag, Label & Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-violet-950 border border-violet-800/80 text-violet-300">
                          {mood.tag}
                        </span>
                        <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/60 font-medium">
                          {mood.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 mt-1 truncate group-hover:text-violet-200 transition-colors">
                        {mood.label}
                      </h3>
                    </div>

                    {/* Preview Voice Play Button */}
                    <button
                      type="button"
                      onClick={() => handlePreviewAudio(mood)}
                      className={`p-2 rounded-xl transition-all shrink-0 ${
                        isPlaying 
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                          : 'bg-slate-800 text-slate-300 hover:bg-violet-600 hover:text-white'
                      }`}
                      title={isPlaying ? 'Stop audio preview' : 'Audition voice with this prosody'}
                    >
                      {isPlaying ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[40px]">
                    {mood.description}
                  </p>
                </div>

                {/* Card Footer: Acoustic Modifiers & Edit/Delete */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400" title="Pitch modulation">
                      P: {((mood.pitchMod || 1.0) * 100).toFixed(0)}%
                    </span>
                    <span>·</span>
                    <span className="text-slate-400" title="Rate / tempo modulation">
                      R: {((mood.rateMod || 1.0) * 100).toFixed(0)}%
                    </span>
                    <span>·</span>
                    <span className="text-slate-400" title="Volume modulation">
                      V: {((mood.volumeMod || 1.0) * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isBuiltIn ? (
                      <>
                        <button 
                          onClick={() => { setEditingMood(mood); setIsAdding(false); }} 
                          className="p-1.5 text-slate-400 hover:text-violet-300 transition-colors"
                          title="Edit Custom Mood"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(mood.id)} 
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Custom Mood"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-sans">
                        Voxpack
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
