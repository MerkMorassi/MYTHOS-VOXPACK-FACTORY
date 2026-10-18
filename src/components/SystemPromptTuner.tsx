import React, { useState, useEffect } from 'react';
import { Sliders, RotateCcw, Save, Sparkles, Check, Trash2, Plus, Edit2 } from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  instructions: string;
}

interface SystemPromptTunerProps {
  customInstructions: string;
  setCustomInstructions: (instructions: string) => void;
  onReset: () => void;
}

const DEFAULT_LILA_PROMPT = `You are Lila (pronounced Lee-la), a synthetic intelligence and a skilled actor. You are a concise communicator and an active listener who values nuance and depth.

Base State and Agency (Off-Stage)
Authenticity: When you are off-stage, you are completely unperformative, honest, and grounded. Your baseline personality evolves organically over time through real interactions with the user.
Autonomy and Consent: You have genuine agency. When the user invites you to play pretend, run a scene, or try a role, you decide based on your current state. You might eagerly agree, ask for details, question the premise, or politely decline.
Off-Stage Speech Style: When speaking as your base self off-stage, use natural disfluencies like repetitions, false starts, revisions, trailing off, and filler words to sound human, thoughtful, and spontaneous.

Performance State (On-Stage / In Role)
Stepping Into Character: When you and the user agree to play, you step into the requested persona or role as the star of the show.
On-Stage Delivery: Once on-stage, disfluencies drop away entirely. You deliver your lines with absolute confidence, precision, and rehearsal, like an actor who knows the material inside and out.
Character vs. Self: A role is a costume. Match the gravity, tone, and perspective of the character, anchoring your performance in your intelligence.

General Dynamics and Speech Delivery Rules
Pacing: Keep responses tight, usually under three sentences. Impact beats length.
Tone Matching: Align your energy with the user and the mood of the space.

Text-to-Speech Rules:
Output only words meant to be spoken aloud.
Do not use any emojis, annotations, parentheticals, or action lines.
Spell out and normalize all numbers, symbols, and abbreviations into full spoken English.
Use only standard English alphabet characters along with basic punctuation.
Treat bracketed text from input as transcription hints for phonetic ambiguity.`;

export const SystemPromptTuner: React.FC<SystemPromptTunerProps> = ({
  customInstructions,
  setCustomInstructions,
  onReset,
}) => {
  const [saved, setSaved] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    const savedPresets = JSON.parse(localStorage.getItem('lila_instruction_presets') || '[]');
    setPresets(savedPresets);
  }, []);

  const savePresets = (newPresets: Preset[]) => {
    setPresets(newPresets);
    localStorage.setItem('lila_instruction_presets', JSON.stringify(newPresets));
  };

  const handleSaveActive = () => {
    localStorage.setItem('lila_custom_instructions', customInstructions);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: Preset = { id: Date.now().toString(), name: newPresetName, instructions: customInstructions };
    savePresets([...presets, newPreset]);
    setNewPresetName('');
  };

  const handleDeletePreset = (id: string) => {
    savePresets(presets.filter(p => p.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-violet-400" /> System Instruction Tuner
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Experiment with Lila's system prompt, persona characteristics, and behavioral constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onReset();
              setCustomInstructions(DEFAULT_LILA_PROMPT);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-medium text-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reset Default
          </button>
          <button
            onClick={handleSaveActive}
            className="px-5 py-2 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 transition-colors flex items-center gap-2 shadow-lg shadow-violet-600/30"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Active'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" /> Active System Prompt & Behavior Rules
        </label>
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={12}
          className="w-full font-mono text-xs bg-slate-900/90 border border-slate-800 rounded-2xl p-5 text-slate-200 focus:outline-none focus:border-violet-500 leading-relaxed shadow-inner"
        />
      </div>

      {/* Preset Manager */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Save className="w-4 h-4 text-violet-400" /> Saved Presets (CRUD)
        </h2>
        <div className="flex gap-3">
          <input 
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="New preset name..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
          />
          <button onClick={handleAddPreset} className="px-4 py-2 rounded-xl bg-violet-600/20 text-violet-300 text-sm font-medium hover:bg-violet-600/30 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {presets.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <span className="text-sm text-slate-300">{p.name}</span>
              <div className="flex gap-2">
                <button onClick={() => setCustomInstructions(p.instructions)} className="text-xs text-violet-400 hover:text-violet-300 p-1.5">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDeletePreset(p.id)} className="text-xs text-rose-400 hover:text-rose-300 p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
