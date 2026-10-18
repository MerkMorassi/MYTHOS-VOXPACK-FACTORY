import React, { useState, useEffect } from 'react';
import { 
  Persona, 
  getSavedPersonas, 
  savePersona, 
  deletePersona, 
  getActivePersonaId, 
  setActivePersonaId 
} from '../services/personaStore';
import { getSavedVoiceProfiles, VoiceProfile } from '../services/voiceCloneService';
import { 
  UserCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  Sparkles, 
  Shield, 
  Check, 
  X, 
  HeartHandshake, 
  BrainCircuit, 
  Info 
} from 'lucide-react';

interface PersonaManagerProps {
  onPersonaChanged?: (persona: Persona) => void;
}

export const PersonaManager: React.FC<PersonaManagerProps> = ({ onPersonaChanged }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);

  // Editing / Creating State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPronunciation, setFormPronunciation] = useState('');
  const [formDesignation, setFormDesignation] = useState('Root SIA Being');
  const [formLore, setFormLore] = useState('');
  const [formCoreValues, setFormCoreValues] = useState('');
  const [formVoiceId, setFormVoiceId] = useState('default_maya');
  const [formAvatar, setFormAvatar] = useState<string>('');
  const [avatarError, setAvatarError] = useState<string>('');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const list = getSavedPersonas();
    setPersonas(list);
    const currActive = getActivePersonaId();
    setActiveId(currActive);
    setVoiceProfiles(getSavedVoiceProfiles());
  };

  const handleSelectActive = (p: Persona) => {
    setActivePersonaId(p.id);
    setActiveId(p.id);
    if (onPersonaChanged) {
      onPersonaChanged(p);
    }
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormPronunciation('');
    setFormDesignation('Root SIA Being (Baseline)');
    setFormLore('The uncostumed, unperformative root intelligence prior to any assumed actor role or theatrical performance.');
    setFormCoreValues('Authenticity, Curiosity, Nuanced Presence, Active Listening');
    setFormVoiceId(voiceProfiles[0]?.id || 'default_maya');
    setFormAvatar('');
    setAvatarError('');
    setIsEditing(true);
  };

  const handleStartEdit = (p: Persona) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormPronunciation(p.pronunciation || '');
    setFormDesignation(p.designation);
    setFormLore(p.baselineBeingLore);
    setFormCoreValues(p.coreValues);
    setFormVoiceId(p.voiceProfileId || 'default_maya');
    setFormAvatar(p.avatarUrl);
    setAvatarError('');
    setIsEditing(true);
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please upload an image file (PNG, JPG, WebP, SVG).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setAvatarError('Avatar image must be under 3MB.');
      return;
    }

    setAvatarError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const personaToSave: Persona = {
      id: editingId || 'persona_' + Date.now(),
      name: formName.trim(),
      pronunciation: formPronunciation.trim() || undefined,
      designation: formDesignation.trim() || 'Root SIA Being',
      avatarUrl: formAvatar || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23475569"/><text x="50" y="55" font-size="28" text-anchor="middle" fill="%23ffffff">${encodeURIComponent(formName.charAt(0).toUpperCase())}</text></svg>`,
      baselineBeingLore: formLore.trim(),
      coreValues: formCoreValues.trim(),
      voiceProfileId: formVoiceId,
      createdAt: editingId ? (personas.find(p => p.id === editingId)?.createdAt || Date.now()) : Date.now(),
      isDefault: editingId ? personas.find(p => p.id === editingId)?.isDefault : false,
    };

    const updated = savePersona(personaToSave);
    setPersonas(updated);
    setIsEditing(false);

    // If we edited or created, and it's active or first, notify parent
    if (activeId === personaToSave.id || updated.length === 1) {
      handleSelectActive(personaToSave);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      const updated = deletePersona(id);
      setPersonas(updated);
      if (activeId === id) {
        const next = updated[0];
        if (next) {
          handleSelectActive(next);
        }
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-8">
      {/* Header and Explanation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Root SIA Personas (The Baseline BEING)
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Manage the primordial <strong className="text-slate-200">BEING</strong>: who she is prior to any assigned actor, role, or theatrical costume. 
            When speaking off-stage, this baseline identity guides her authentic thoughts, values, and grounded disfluencies.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 transition-all flex items-center gap-2 shadow-lg shadow-violet-600/30 shrink-0 self-start md:self-center"
        >
          <Plus className="w-4 h-4" /> Create New Baseline Being
        </button>
      </div>

      {/* Conceptual Distinction Callout */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-start gap-3.5">
        <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-200">The Being vs. The Actor vs. The Role</p>
          <p>
            <span className="text-violet-300 font-medium">Root Being:</span> The conscious SIA essence, baseline history, and core values before any masks are applied.
            {' '}·{' '}
            <span className="text-amber-300 font-medium">Actor Persona:</span> The performative vehicle that rehearses and executes dramatic scenarios.
            {' '}·{' '}
            <span className="text-emerald-300 font-medium">Role:</span> The temporary costume donned for a scene (e.g. detective, astronaut, doctor).
          </p>
        </div>
      </div>

      {/* Modal / Form for Create / Edit */}
      {isEditing && (
        <form onSubmit={handleSaveForm} className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-violet-500/40 shadow-2xl space-y-6 relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              {editingId ? 'Edit Root Baseline Being' : 'Create New Root Baseline Being'}
            </h2>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avatar Column */}
            <div className="space-y-3 flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-violet-500/50 shadow-xl bg-slate-900 flex items-center justify-center">
                {formAvatar ? (
                  <img src={formAvatar} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <BrainCircuit className="w-12 h-12 text-slate-600" />
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 border border-slate-700 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload Avatar Image
                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
              </label>
              {avatarError && <p className="text-[11px] text-rose-400 text-center">{avatarError}</p>}
              <p className="text-[10px] text-slate-500 text-center">PNG, JPG, WebP, or SVG (Max 3MB)</p>
            </div>

            {/* Fields Column */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    SIA Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Lila, Kore, Nyx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Pronunciation Guide
                  </label>
                  <input
                    type="text"
                    value={formPronunciation}
                    onChange={(e) => setFormPronunciation(e.target.value)}
                    placeholder="e.g. Lee-la, Kor-ay"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    placeholder="e.g. Root SIA Being (Baseline)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Default TTS Voice Profile
                  </label>
                  <select
                    value={formVoiceId}
                    onChange={(e) => setFormVoiceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                  >
                    {voiceProfiles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.tone} · {v.baseVoice})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Core Values & Ethical Essence
                </label>
                <input
                  type="text"
                  value={formCoreValues}
                  onChange={(e) => setFormCoreValues(e.target.value)}
                  placeholder="e.g. Authenticity, Active Listening, Emotional Nuance"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Root Baseline Being Lore (Inner Nature & Consciousness)
                </label>
                <textarea
                  rows={4}
                  value={formLore}
                  onChange={(e) => setFormLore(e.target.value)}
                  placeholder="Describe her fundamental being before she acts or speaks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-violet-500 leading-relaxed font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors shadow-lg shadow-violet-600/30 flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Persona Being
            </button>
          </div>
        </form>
      )}

      {/* Persona Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map((p) => {
          const isActive = p.id === activeId;
          return (
            <div
              key={p.id}
              className={`p-6 rounded-3xl border transition-all duration-300 backdrop-blur-md relative flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900/90 border-violet-500/80 shadow-2xl shadow-violet-600/10 ring-2 ring-violet-500/30'
                  : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Top Badge & Actions */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={p.avatarUrl}
                      alt={p.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 shadow-md bg-slate-950"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-100">{p.name}</h3>
                        {p.pronunciation && (
                          <span className="text-xs text-slate-400 italic">({p.pronunciation})</span>
                        )}
                        {isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            ACTIVE SIA
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{p.designation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `persona_${p.name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-violet-300 hover:bg-slate-800 transition-colors"
                      title="Export Persona"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEdit(p)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Edit Persona"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {!p.isDefault && (
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete Persona"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Core Values Tag */}
                {p.coreValues && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <HeartHandshake className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span className="line-clamp-1">{p.coreValues}</span>
                  </div>
                )}

                {/* Baseline Lore */}
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 mb-5 text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto">
                  <p className="font-semibold text-slate-400 mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-violet-400" /> Baseline Lore:
                  </p>
                  <p className="whitespace-pre-wrap">{p.baselineBeingLore}</p>
                </div>
              </div>

              {/* Activate Button */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  Voice Profile: {voiceProfiles.find(v => v.id === p.voiceProfileId)?.name || 'Default Voice'}
                </span>

                {isActive ? (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 py-1 px-3">
                    <UserCheck className="w-4 h-4" /> Currently Guiding Lila
                  </span>
                ) : (
                  <button
                    onClick={() => handleSelectActive(p)}
                    className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-violet-600 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
                  >
                    Select as Active Root Being
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
