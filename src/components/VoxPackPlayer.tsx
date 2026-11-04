import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Download, 
  Upload, 
  Sparkles, 
  Volume2, 
  Sliders, 
  FileCode, 
  Check, 
  Key, 
  ExternalLink, 
  Radio, 
  Layers,
  FileAudio,
  CheckCircle2,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { 
  VoiceProfile, 
  getSavedVoiceProfiles, 
  saveVoiceProfile, 
  speakWithVoiceProfile, 
  stopCurrentAudio 
} from '../services/voiceCloneService';
import { 
  VoxPackManifest, 
  voiceProfileToVoxPack, 
  createBundledVoxPack,
  voxPackToVoiceProfile, 
  exportVoicePack,
  exportVoxPackJson, 
  generateStandalonePlayerHtml, 
  downloadFile 
} from '../services/voxPackExport';
import { saveLoreDocument } from '../services/ragStore';
import { saveMood } from '../services/moodStore';
import { getStoredApiKey, saveStoredApiKey } from '../services/apiKeyStore';

interface VoxPackPlayerProps {
  selectedVoice: VoiceProfile;
  onSelectVoice: (profile: VoiceProfile) => void;
}

export const VoxPackPlayer: React.FC<VoxPackPlayerProps> = ({
  selectedVoice,
  onSelectVoice,
}) => {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [currentManifest, setCurrentManifest] = useState<VoxPackManifest>(() => createBundledVoxPack(selectedVoice));
  const [dialogueText, setDialogueText] = useState<string>(
    '[joyful] Hello! I am your synthetic voice model. I have been calibrated and packaged as a standalone VOXPACK.'
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [exportedSuccess, setExportedSuccess] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredApiKey() || '');
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const list = getSavedVoiceProfiles();
    setProfiles(list);
  }, []);

  useEffect(() => {
    setCurrentManifest(createBundledVoxPack(selectedVoice));
  }, [selectedVoice]);

  const handleSelectProfile = (p: VoiceProfile) => {
    onSelectVoice(p);
    setCurrentManifest(createBundledVoxPack(p));
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveStoredApiKey(apiKeyInput.trim());
      setIsKeySaved(true);
      setTimeout(() => setIsKeySaved(false), 2500);
    }
  };

  const handlePlayTTS = () => {
    if (isPlaying) {
      stopCurrentAudio();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    // Convert current manifest back to a temporary or updated profile
    const activeProf = voxPackToVoiceProfile(currentManifest);
    speakWithVoiceProfile(dialogueText, activeProf, () => {
      setIsPlaying(false);
    });
  };

  const handleExportJson = () => {
    exportVoicePack(selectedVoice);
    setExportedSuccess('Voice Pack (.vox) downloaded with lore & mood presets!');
    setTimeout(() => setExportedSuccess(null), 3500);
  };

  const handleDownloadStandalonePlayer = () => {
    const htmlContent = generateStandalonePlayerHtml(selectedVoice);
    const safeName = (selectedVoice.name || 'voice').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    downloadFile(htmlContent, `voxpack-player-${safeName}.html`, 'text/html');
    setExportedSuccess('Standalone HTML Player generated & downloaded!');
    setTimeout(() => setExportedSuccess(null), 3500);
  };

  const handleOpenStandalonePlayerInNewTab = () => {
    const htmlContent = generateStandalonePlayerHtml(selectedVoice);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) parseAndLoadPack(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseAndLoadPack(file);
  };

  const parseAndLoadPack = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.acoustic_profile || parsed.base_voice || parsed.baseVoice || parsed.voice_profile) {
          const profile = voxPackToVoiceProfile({
            voxpack_version: parsed.voxpack_version || '1.0.0',
            id: parsed.id || 'vox_' + Date.now(),
            name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
            author: parsed.author || 'Imported VoxPack',
            created_at: parsed.created_at || Date.now(),
            description: parsed.description || parsed.vocalStyle || '',
            acoustic_profile: parsed.acoustic_profile || {
              base_voice: parsed.baseVoice || parsed.base_voice || 'Kore',
              pitch: parsed.pitch ?? 1.0,
              rate: parsed.rate ?? 1.0,
              tone: parsed.tone || 'neutral',
              vocal_style: parsed.vocalStyle || parsed.vocal_style || 'Natural companion delivery'
            }
          });

          // Unpack bundled lore context if present
          let loreCount = 0;
          if (parsed.lore_context?.documents && Array.isArray(parsed.lore_context.documents)) {
            for (const doc of parsed.lore_context.documents) {
              if (doc && doc.title && doc.content) {
                saveLoreDocument({
                  title: doc.title,
                  content: doc.content,
                  tags: doc.tags || ['voxpack_import']
                });
                loreCount++;
              }
            }
          }

          // Unpack custom moods if present
          let moodsCount = 0;
          if (parsed.mood_settings?.custom_moods && Array.isArray(parsed.mood_settings.custom_moods)) {
            for (const m of parsed.mood_settings.custom_moods) {
              if (m && m.id && m.tag) {
                saveMood(m);
                moodsCount++;
              }
            }
          }

          saveVoiceProfile(profile);
          const updated = getSavedVoiceProfiles();
          setProfiles(updated);
          onSelectVoice(profile);
          setCurrentManifest(createBundledVoxPack(profile));
          const summary = `Loaded VOX Pack "${profile.name}" (${loreCount} lore docs, ${moodsCount} custom moods)!`;
          setExportedSuccess(summary);
          setTimeout(() => setExportedSuccess(null), 3500);
        } else {
          alert('Invalid .vox or .voxpack configuration file format.');
        }
      } catch (err: any) {
        alert('Could not parse file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleAddTag = (tag: string) => {
    setDialogueText(prev => `${tag} ${prev.replace(/^\[[a-z]+\]\s*/i, '')}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Export Actions */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-950 border border-violet-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs font-mono font-semibold border border-violet-500/30">
              VOXPACK ENGINE
            </span>
            <span className="text-xs text-slate-400">Standalone Portable TTS Player</span>
          </div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-violet-400" />
            VOXPACK Player & Package Exporter
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Export any calibrated voice acoustic profile into a standalone portable HTML player or <code className="text-violet-300 font-mono">.voxpack.json</code> package that plays in any browser with Gemini Neural TTS.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleDownloadStandalonePlayer}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-violet-600/30"
            title="Download single-file HTML standalone player"
          >
            <Download className="w-4 h-4" />
            Download Standalone Player (.html)
          </button>

          <button
            onClick={handleOpenStandalonePlayerInNewTab}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Preview standalone player in a new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
            Test in New Tab
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 rounded-xl bg-violet-950 hover:bg-violet-900 text-violet-200 border border-violet-700/60 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-violet-950/40"
            title="Download complete .vox configuration file bundling voice profile, lore context, and mood settings"
          >
            <Download className="w-3.5 h-3.5 text-violet-400" />
            Export Voice Pack (.vox)
          </button>
        </div>
      </div>

      {exportedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportedSuccess}</span>
        </div>
      )}

      {/* Main Grid: Voice Switcher & Drag-Drop / Interactive Player Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (5 cols): Voice Factory Pack Selector & Import Dropzone */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400" /> Factory Voice Catalog ({profiles.length})
              </span>
              <span className="text-[10px] text-slate-500">1-Tap Switch</span>
            </div>

            {/* Quick Voice Selector List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {profiles.map(p => {
                const isSelected = p.id === selectedVoice.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProfile(p)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-violet-950/60 border-violet-500/60 shadow-md shadow-violet-950/50'
                        : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200 truncate">{p.name}</span>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                        Base: <span className="text-violet-300">{p.baseVoice}</span> · Pitch: {p.pitch.toFixed(2)}x · Tone: {p.tone}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportVoicePack(p);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                      title="Download .vox Voice Pack for this voice"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Drag & Drop Import Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-xl border-2 border-dashed border-slate-800 hover:border-violet-500/60 bg-slate-950/60 text-center cursor-pointer transition-all hover:bg-violet-950/10 group"
            >
              <Upload className="w-5 h-5 mx-auto text-slate-500 group-hover:text-violet-400 transition-colors" />
              <p className="text-xs font-semibold text-slate-300 mt-1">
                Drop any <span className="text-violet-400">.vox</span>, <span className="text-violet-400">.voxpack</span> or <span className="text-violet-400">.json</span> file here
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Click to browse your local storage</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".vox,.json,.voxpack"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          </div>

          {/* Quick API Key Setup */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Embedded Gemini API Key
              </span>
              {isKeySaved && (
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy... (optional for standalone)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              When downloading the standalone player, you can run it anywhere offline or online with zero server dependencies.
            </p>
          </div>
        </div>

        {/* Right Column (7 cols): Active VoxPack Inspection & Audio Deck */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            
            {/* Header of Active VoxPack */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-100">{currentManifest.name}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 font-mono text-[10px] font-bold">
                    v{currentManifest.voxpack_version}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {currentManifest.id} · Base Voice: <span className="text-violet-300 font-bold">{currentManifest.acoustic_profile.base_voice}</span>
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Formant Tone</span>
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  {currentManifest.acoustic_profile.tone}
                </span>
              </div>
            </div>

            {/* Acoustic Specs Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Pitch Multiplier</span>
                <span className="text-sm font-mono font-bold text-violet-300">
                  {currentManifest.acoustic_profile.pitch.toFixed(2)}x
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Pacing Rate</span>
                <span className="text-sm font-mono font-bold text-indigo-300">
                  {currentManifest.acoustic_profile.rate.toFixed(2)}x
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Synthesizer</span>
                <span className="text-sm font-mono font-bold text-emerald-400 truncate block">
                  gemini-3.8-flash-tts
                </span>
              </div>
            </div>

            {/* Bundled Metadata: Lore Context & Mood Presets */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-violet-400 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Bundled Lore Context
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 block">
                  {currentManifest.lore_context?.total_documents ?? currentManifest.lore_context?.documents?.length ?? 0} Documents
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  RAG source of truth
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Mood & Prosody
                </span>
                <span className="text-xs font-mono font-bold text-slate-200 block">
                  [{currentManifest.mood_settings?.selected_mood_id || 'joyful'}]
                </span>
                <span className="text-[10px] text-slate-500 block truncate">
                  {currentManifest.mood_settings?.contextual_prosody_enabled !== false ? 'Dynamic Prosody ON' : 'Fixed Prosody'}
                </span>
              </div>
            </div>

            {/* Vocal Style Conditioning Prompt */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Vocal Style Prompt Conditioning
              </span>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 italic leading-relaxed">
                "{currentManifest.acoustic_profile.vocal_style}"
              </div>
            </div>

            {/* Interactive Dialogue Synth Deck */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Test Utterance / Dialogue
                </label>
                <div className="flex gap-1.5">
                  {['[joyful]', '[whisper]', '[conspiratorial]', '[commanding]'].map((tag, idx) => (
                    <button
                      key={`vox-tag-${tag}-${idx}`}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 hover:bg-violet-600 hover:text-white transition-all"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                value={dialogueText}
                onChange={(e) => setDialogueText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-violet-500 font-sans leading-relaxed"
                placeholder="Type dialogue to test this VoxPack..."
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePlayTTS}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                    isPlaying
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" /> Stop Playback
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> Play in VoxPack Voice
                    </>
                  )}
                </button>

                <span className="text-[11px] text-slate-400 font-mono">
                  {isPlaying ? 'Synthesizing voice stream...' : 'Engine ready'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
