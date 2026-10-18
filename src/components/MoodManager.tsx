import React, { useState } from 'react';
import { Sparkles, Plus, Trash2, Edit3, X, Check, Save } from 'lucide-react';
import { MoodOption, getSavedMoods, saveMood, deleteMood, MOOD_CATEGORIES } from '../services/moodStore';

export const MoodManager: React.FC = () => {
  const [moods, setMoods] = useState<MoodOption[]>(getSavedMoods());
  const [editingMood, setEditingMood] = useState<Partial<MoodOption> | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMood || !editingMood.label || !editingMood.tag) return;
    
    const moodToSave: MoodOption = {
      id: editingMood.id || `custom_${Date.now()}`,
      label: editingMood.label,
      tag: editingMood.tag.startsWith('[') ? editingMood.tag : `[${editingMood.tag.replace(/[\[\]]/g, '')}]`,
      category: editingMood.category || 'Custom',
      description: editingMood.description || '',
      pitchMod: editingMood.pitchMod || 1.0,
      rateMod: editingMood.rateMod || 1.0,
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

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" /> Dynamic Vocal Prosody (Moods)
          </h1>
          <p className="text-sm text-slate-400 mt-1">Define how Lila's voice changes based on emotional state.</p>
        </div>
        <button
          onClick={() => { setEditingMood({}); setIsAdding(true); }}
          className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Create New Mood
        </button>
      </div>

      {(isAdding || editingMood) && (
        <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900 border border-violet-500/40 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-100">{editingMood?.id ? 'Edit Mood' : 'Create New Mood'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Label (e.g. Furious)" value={editingMood?.label || ''} onChange={e => setEditingMood({...editingMood, label: e.target.value})} className="bg-slate-950 p-2 rounded-lg border border-slate-700 text-sm" required />
            <input placeholder="Tag (e.g. furious)" value={editingMood?.tag?.replace(/[\[\]]/g, '') || ''} onChange={e => setEditingMood({...editingMood, tag: e.target.value})} className="bg-slate-950 p-2 rounded-lg border border-slate-700 text-sm" required />
            <select value={editingMood?.category || 'Custom'} onChange={e => setEditingMood({...editingMood, category: e.target.value as any})} className="bg-slate-950 p-2 rounded-lg border border-slate-700 text-sm">
              {MOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" step="0.1" placeholder="Pitch (0.5-2.0)" value={editingMood?.pitchMod || 1.0} onChange={e => setEditingMood({...editingMood, pitchMod: parseFloat(e.target.value)})} className="bg-slate-950 p-2 rounded-lg border border-slate-700 text-sm" />
            <input type="number" step="0.1" placeholder="Rate (0.5-2.0)" value={editingMood?.rateMod || 1.0} onChange={e => setEditingMood({...editingMood, rateMod: parseFloat(e.target.value)})} className="bg-slate-950 p-2 rounded-lg border border-slate-700 text-sm" />
            <input type="number" step="0.1" placeholder="Volume (0.0-1.0)" value={editingMood?.volumeMod ?? 1.0} onChange={e => setEditingMood({...editingMood, volumeMod: parseFloat(e.target.value)})} className="bg-slate-950 p-2 rounded-lg border border-slate-700 text-sm" />
          </div>
          <textarea placeholder="Description" value={editingMood?.description || ''} onChange={e => setEditingMood({...editingMood, description: e.target.value})} className="w-full bg-slate-950 p-2 rounded-lg border border-slate-700 text-sm" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => {setEditingMood(null); setIsAdding(false);}} className="px-4 py-2 rounded-lg bg-slate-800 text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-violet-600 text-sm text-white">Save</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {moods.map(m => (
          <div key={m.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-100">{m.label} <span className="text-violet-400 text-xs font-mono">{m.tag}</span></h3>
              <p className="text-xs text-slate-400 mt-1">{m.description}</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => {setEditingMood(m); setIsAdding(false);}} className="p-2 text-slate-400 hover:text-white"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(m.id)} className="p-2 text-slate-400 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
