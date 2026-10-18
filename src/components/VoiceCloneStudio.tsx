import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Mic, 
  Play, 
  Trash2, 
  CheckCircle2, 
  FileAudio, 
  Sparkles, 
  Volume2, 
  Square, 
  Headphones, 
  Sliders, 
  Info, 
  Check, 
  AlertCircle,
  Edit3,
  X,
  BookmarkCheck
} from 'lucide-react';
import { 
  VoiceProfile, 
  getSavedVoiceProfiles, 
  uploadAndProcessVoiceSample, 
  CloningProgress, 
  speakWithVoiceProfile, 
  saveVoiceProfile, 
  deleteVoiceProfile, 
  stopCurrentAudio 
} from '../services/voiceCloneService';
import { SystemPromptTuner } from './SystemPromptTuner';

interface VoiceCloneStudioProps {
  selectedVoice: VoiceProfile;
  onSelectVoice: (profile: VoiceProfile) => void;
  customInstructions: string;
  setCustomInstructions: (instructions: string) => void;
  onResetInstructions: () => void;
}

export const VoiceCloneStudio: React.FC<VoiceCloneStudioProps> = ({ 
  selectedVoice, 
  onSelectVoice,
  customInstructions,
  setCustomInstructions,
  onResetInstructions 
}) => {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [cloningProgress, setCloningProgress] = useState<CloningProgress | null>(null);
  const [testText, setTestText] = useState('Hello. I am Lila, your synthetic companion. I have absorbed this voice sample to speak with you.');
  const [isPlayingTTS, setIsPlayingTTS] = useState<string | null>(null);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [sampleAudioObj, setSampleAudioObj] = useState<HTMLAudioElement | null>(null);

  // Inline rename state
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    setProfiles(getSavedVoiceProfiles());
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setCloningProgress({
      status: 'validating',
      message: 'Beginning acoustic analysis...',
      percent: 10,
    });

    try {
      const newProfile = await uploadAndProcessVoiceSample(file, (progress) => {
        setCloningProgress(progress);
      });
      const updated = getSavedVoiceProfiles();
      setProfiles(updated);
      onSelectVoice(newProfile);

      setTimeout(() => {
        setCloningProgress(null);
        setIsUploading(false);
      }, 3000);
    } catch (err: any) {
      console.error('Audio processing failed:', err);
      setCloningProgress({
        status: 'error',
        message: err?.message || 'Failed to analyze audio sample. Please upload a clear .wav or .mp3 file.',
        percent: 100,
      });
      setIsUploading(false);
    }
  };

  const handleStartRename = (profile: VoiceProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNameId(profile.id);
    setTempName(profile.name);
  };

  const handleSaveRename = (profileId: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (tempName.trim()) {
      handleFieldChange(profileId, { name: tempName.trim() });
    }
    setEditingNameId(null);
  };

  const handlePlaySampleAudio = (profile: VoiceProfile) => {
    if (playingSampleId === profile.id) {
      if (sampleAudioObj) {
        sampleAudioObj.pause();
        sampleAudioObj.currentTime = 0;
      }
      setPlayingSampleId(null);
      return;
    }

    if (sampleAudioObj) {
      sampleAudioObj.pause();
    }
    stopCurrentAudio();

    if (!profile.sampleUrl || typeof profile.sampleUrl !== 'string' || profile.sampleUrl.trim() === '') {
      return;
    }

    try {
      const audio = new Audio(profile.sampleUrl);
      setSampleAudioObj(audio);
      setPlayingSampleId(profile.id);

      audio.onended = () => {
        setPlayingSampleId(null);
      };
      audio.onerror = () => {
        setPlayingSampleId(null);
      };

      audio.play().catch((err) => {
        console.warn('Audio preview play failed:', err);
        setPlayingSampleId(null);
      });
    } catch (err) {
      console.warn('Could not initialize audio:', err);
      setPlayingSampleId(null);
    }
  };

  const handleTestTTS = (profile: VoiceProfile) => {
    if (sampleAudioObj) {
      sampleAudioObj.pause();
      setPlayingSampleId(null);
    }

    setIsPlayingTTS(profile.id);
    speakWithVoiceProfile(testText, profile, () => {
      setIsPlayingTTS(null);
    });
  };

  const handleStopAll = () => {
    if (sampleAudioObj) {
      sampleAudioObj.pause();
      sampleAudioObj.currentTime = 0;
    }
    stopCurrentAudio();
    setIsPlayingTTS(null);
    setPlayingSampleId(null);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id === 'default_maya' || id === 'cinematic_alto') {
      alert('Default built-in profiles cannot be deleted.');
      return;
    }
    const filtered = deleteVoiceProfile(id);
    setProfiles(filtered);
    if (selectedVoice.id === id && filtered.length > 0) {
      onSelectVoice(filtered[0]);
    }
  };

  const handleFieldChange = (id: string, updates: Partial<VoiceProfile>) => {
    const updated = profiles.map(p => {
      if (p.id === id) {
        const updatedProfile = { ...p, ...updates };
        saveVoiceProfile(updatedProfile);
        if (selectedVoice.id === id) {
          onSelectVoice(updatedProfile);
        }
        return updatedProfile;
      }
      return p;
    });
    setProfiles(updated);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <Mic className="w-6 h-6 text-violet-400" /> Voice Clone & TTS Studio
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload spoken audio samples (.wav, .mp3) to extract vocal acoustics, name them, and save them permanently to your library.
          </p>
        </div>

        {/* Upload Button */}
        <label className={`cursor-pointer px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 shadow-lg ${
          isUploading ? 'bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white shadow-violet-600/30 hover:bg-violet-500'
        }`}>
          <Upload className="w-4 h-4" />
          {isUploading ? 'Analyzing Audio...' : 'Upload Voice Sample (.wav, .mp3)'}
          <input 
            type="file" 
            accept="audio/*" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {/* Progress Feedback Banner for Voice Cloning */}
      {cloningProgress && (
        <div className={`p-4 rounded-2xl border transition-all ${
          cloningProgress.status === 'ready'
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            : cloningProgress.status === 'error'
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
              : 'bg-violet-950/40 border-violet-500/50 text-violet-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {cloningProgress.status === 'ready' ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : cloningProgress.status === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <Sparkles className="w-4 h-4 text-violet-400 animate-spin" />
              )}
              <span>{cloningProgress.message}</span>
            </div>
            <span className="text-xs font-mono">{cloningProgress.percent}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                cloningProgress.status === 'ready' 
                  ? 'bg-emerald-400' 
                  : cloningProgress.status === 'error'
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-violet-500 to-indigo-400'
              }`}
              style={{ width: `${cloningProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Technical Clarity Callout: Audio Upload -> TTS Capability */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md flex items-start gap-3.5">
        <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-200">Permanent Voice Profiles in Path A:</p>
          <p>
            Every voice you upload or customize is a <strong>brand new, permanent voice profile</strong> saved to your library. You can click the pencil icon to rename it, adjust its pitch, tempo, and formant resonance, audition it with any sentence, and link it to Lila or any Root SIA persona.
          </p>
        </div>
      </div>

      {/* Embedded Persona System Instructions & CRUD */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <SystemPromptTuner
          customInstructions={customInstructions}
          setCustomInstructions={setCustomInstructions}
          onReset={onResetInstructions}
        />
      </div>

      {/* Active Voice Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-950/60 to-slate-900 border border-violet-800/60 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-medium text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Active Companion Voice Profile
          </span>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            {selectedVoice.name}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
              Saved Permanently
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Tone: <span className="text-slate-200 capitalize">{selectedVoice.tone}</span> · Pitch: <span className="text-slate-200">{selectedVoice.pitch}x</span> · Rate: <span className="text-slate-200">{selectedVoice.rate}x</span> · Base: <span className="text-slate-200">{selectedVoice.baseVoice}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPlayingTTS || playingSampleId ? (
            <button
              onClick={handleStopAll}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5" /> Stop Audio
            </button>
          ) : (
            <button
              onClick={() => handleTestTTS(selectedVoice)}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-violet-600/30"
            >
              <Volume2 className="w-3.5 h-3.5" /> Audition Active Voice
            </button>
          )}
        </div>
      </div>

      {/* Test Phrase Input */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> Test Speech Synthesizer Phrase:
            </label>
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="w-48 space-y-2">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-emerald-400" /> Fallback Voice:
            </label>
            <select
              value={selectedVoice.fallbackVoice || ''}
              onChange={(e) => handleFieldChange(selectedVoice.id, { fallbackVoice: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="">Default System Voice</option>
              {window.speechSynthesis.getVoices().map((v) => (
                <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Profiles Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Headphones className="w-4 h-4 text-violet-400" /> Saved Voice Library ({profiles.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((p) => {
            const isSelected = selectedVoice.id === p.id;
            const isPlayingThisSample = playingSampleId === p.id;
            const isPlayingThisTTS = isPlayingTTS === p.id;
            const isEditingThisName = editingNameId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectVoice(p)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'bg-slate-900/90 border-violet-500 shadow-xl shadow-violet-600/10 ring-1 ring-violet-500'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isEditingThisName ? (
                        <div 
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(p.id, e);
                              if (e.key === 'Escape') setEditingNameId(null);
                            }}
                            autoFocus
                            className="bg-slate-950 border border-violet-500 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none w-full"
                          />
                          <button
                            onClick={(e) => handleSaveRename(p.id, e)}
                            className="p-1 rounded bg-violet-600 hover:bg-violet-500 text-white"
                            title="Save Name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNameId(null);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100 truncate">{p.name}</h4>
                          <button
                            onClick={(e) => handleStartRename(p, e)}
                            className="p-1 rounded text-slate-500 hover:text-violet-300 hover:bg-slate-800 transition-colors"
                            title="Rename voice profile"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          {isSelected && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800 font-medium shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                      )}
                      
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {p.sampleFileName || 'Built-in Profile'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {p.sampleUrl ? (
                        <button
                          onClick={() => handlePlaySampleAudio(p)}
                          className={`p-2 rounded-lg transition-colors ${
                            isPlayingThisSample 
                              ? 'bg-rose-600 text-white' 
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                          title="Listen to original voice sample recording"
                        >
                          {isPlayingThisSample ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      ) : null}

                      <button
                        onClick={() => handleTestTTS(p)}
                        className={`p-2 rounded-lg transition-colors ${
                          isPlayingThisTTS 
                            ? 'bg-violet-600 text-white' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                        title="Audition synthesized TTS delivery"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {p.id !== 'default_maya' && p.id !== 'cinematic_alto' && (
                        <button
                          onClick={(e) => handleDeleteProfile(p.id, e)}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition-colors"
                          title="Delete voice profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acoustic sliders */}
                  <div className="pt-1 grid grid-cols-2 gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Pitch:</span>
                        <span>{p.pitch.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="1.6"
                        step="0.05"
                        value={p.pitch}
                        onChange={(e) => handleFieldChange(p.id, { pitch: parseFloat(e.target.value) })}
                        className="w-full accent-violet-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Rate / Speed:</span>
                        <span>{p.rate.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.4"
                        step="0.05"
                        value={p.rate}
                        onChange={(e) => handleFieldChange(p.id, { rate: parseFloat(e.target.value) })}
                        className="w-full accent-violet-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Tone selector */}
                  <div className="pt-1 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-slate-400">Tone Timbre:</span>
                    <select
                      value={p.tone}
                      onChange={(e) => handleFieldChange(p.id, { tone: e.target.value as any })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-violet-500"
                    >
                      <option value="velvet">Velvet</option>
                      <option value="warm">Warm</option>
                      <option value="deep">Deep</option>
                      <option value="bright">Bright</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 text-slate-400">
                    <BookmarkCheck className="w-3 h-3 text-emerald-400" />
                    Base: {p.baseVoice}
                  </span>
                  <button
                    onClick={() => onSelectVoice(p)}
                    className="text-violet-400 hover:text-violet-300 font-medium"
                  >
                    {isSelected ? '✓ Selected' : 'Select Voice'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
