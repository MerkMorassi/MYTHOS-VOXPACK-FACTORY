import { VoiceProfile } from './voiceCloneService';
import { getStoredLore, LoreDocument } from './ragStore';
import { getSavedMoods, getSavedMoodId, isContextualProsodyEnabled, MoodOption } from './moodStore';

export interface VoxPackManifest {
  voxpack_version: '1.0.0';
  id: string;
  name: string;
  author: string;
  created_at: number;
  description: string;
  acoustic_profile: {
    base_voice: string;
    pitch: number;
    rate: number;
    tone: string;
    vocal_style: string;
    fallback_browser_voice?: string;
  };
  // Bundled voice profile configuration
  voice_profile?: VoiceProfile;
  // Bundled Agent Lore Context (RAG source of truth)
  lore_context?: {
    documents: LoreDocument[];
    total_documents: number;
    exported_at: number;
    summary?: string;
  };
  // Bundled Mood and Vocal Prosody settings
  mood_settings?: {
    selected_mood_id: string;
    contextual_prosody_enabled: boolean;
    custom_moods: MoodOption[];
    available_mood_tags: string[];
    total_custom_moods: number;
  };
  replication?: {
    is_replicated_clone: boolean;
    replicated_voice_id?: string | null;
  };
  sample?: {
    file_name?: string;
    duration_sec?: number;
    sample_url?: string;
  };
  test_utterances?: string[];
}

export function voiceProfileToVoxPack(profile: VoiceProfile): VoxPackManifest {
  return {
    voxpack_version: '1.0.0',
    id: profile.id || `vox_${Date.now()}`,
    name: profile.name || 'Unnamed VoxPack',
    author: 'VoxPack Factory',
    created_at: profile.createdAt || Date.now(),
    description: profile.vocalStyle || 'Custom calibrated synthetic voice package.',
    acoustic_profile: {
      base_voice: profile.baseVoice || 'Kore',
      pitch: profile.pitch ?? 1.0,
      rate: profile.rate ?? 1.0,
      tone: profile.tone || 'neutral',
      vocal_style: profile.vocalStyle || 'Natural, warm, authentic companion delivery.',
      fallback_browser_voice: profile.fallbackVoice,
    },
    replication: {
      is_replicated_clone: !!(profile as any).replicatedVoiceId,
      replicated_voice_id: (profile as any).replicatedVoiceId || null,
    },
    sample: {
      file_name: profile.sampleFileName,
      duration_sec: profile.duration,
      sample_url: profile.sampleUrl && profile.sampleUrl.startsWith('data:') ? profile.sampleUrl : undefined,
    },
    test_utterances: [
      "Hello! I am ready to speak using this calibrated vocal profile.",
      "[joyful] The stars look breathtaking tonight, don't they?",
      "[conspiratorial] Listen closely, I have a secret to tell you.",
      "[weary] It has been a long day, but we made it through together.",
      "[commanding] All systems online and operational. Standing by."
    ]
  };
}

/**
 * Creates a fully bundled VoxPack manifest containing:
 * 1. Selected Voice Profile acoustics
 * 2. Agent Lore Context (RAG knowledge base)
 * 3. Mood & Prosody settings (custom moods, default mood, contextual prosody state)
 */
export function createBundledVoxPack(profile: VoiceProfile): VoxPackManifest {
  const loreDocs = getStoredLore();
  const savedMoods = getSavedMoods();
  const selectedMoodId = getSavedMoodId();
  const contextualProsodyEnabled = isContextualProsodyEnabled();

  const manifest = voiceProfileToVoxPack(profile);
  manifest.voice_profile = profile;
  manifest.lore_context = {
    documents: loreDocs,
    total_documents: loreDocs.length,
    exported_at: Date.now(),
    summary: `Bundled ${loreDocs.length} knowledge base documents & persona memories.`,
  };
  manifest.mood_settings = {
    selected_mood_id: selectedMoodId,
    contextual_prosody_enabled: contextualProsodyEnabled,
    custom_moods: savedMoods.filter(m => m.category === 'Custom'),
    available_mood_tags: savedMoods.slice(0, 30).map(m => m.tag),
    total_custom_moods: savedMoods.filter(m => m.category === 'Custom').length,
  };

  return manifest;
}

export function voxPackToVoiceProfile(pack: VoxPackManifest): VoiceProfile {
  return {
    id: pack.id || `vox_${Date.now()}`,
    name: pack.name || 'Imported VoxPack',
    sampleUrl: pack.sample?.sample_url || '',
    sampleFileName: pack.sample?.file_name || 'imported_voxpack',
    pitch: pack.acoustic_profile.pitch ?? 1.0,
    rate: pack.acoustic_profile.rate ?? 1.0,
    tone: (pack.acoustic_profile.tone as any) || 'neutral',
    baseVoice: (pack.acoustic_profile.base_voice as any) || 'Kore',
    vocalStyle: pack.acoustic_profile.vocal_style || 'Warm, authentic conversational voice',
    fallbackVoice: pack.acoustic_profile.fallback_browser_voice,
    duration: pack.sample?.duration_sec || 0,
    createdAt: pack.created_at || Date.now(),
    ...(pack.replication?.replicated_voice_id ? { replicatedVoiceId: pack.replication.replicated_voice_id } : {})
  };
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports bundled Voice Pack (.vox) containing voice profile, lore context, and mood settings
 */
export function exportVoicePack(profile: VoiceProfile) {
  const manifest = createBundledVoxPack(profile);
  const jsonStr = JSON.stringify(manifest, null, 2);
  const safeName = (profile.name || 'voice').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  downloadFile(jsonStr, `${safeName}.vox`, 'application/json');
}

export function exportVoxPackJson(profile: VoiceProfile) {
  exportVoicePack(profile);
}

/**
 * Generates a self-contained, single-file HTML application containing:
 * - Embedded Audio Player with live waveform visualizer
 * - Gemini API Key manager
 * - .vox pack loader (drag-and-drop or preloaded)
 * - TTS Synthesizer calling Gemini 3.8 Flash TTS with browser voice fallback
 * - Audio buffer recording & WAV export
 */
export function generateStandalonePlayerHtml(profile?: VoiceProfile): string {
  const initialPack = profile ? createBundledVoxPack(profile) : null;
  const initialPackJson = initialPack ? JSON.stringify(initialPack) : 'null';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VOXPACK PLAYER · Standalone Neural TTS</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f293d;
      --accent: #8b5cf6;
      --accent-hover: #7c3aed;
      --accent-glow: rgba(139, 92, 246, 0.25);
      --text: #f3f4f6;
      --text-muted: #94a3b8;
      --emerald: #10b981;
      --amber: #f59e0b;
      --rose: #f43f5e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, var(--bg) 60%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px 48px;
    }
    .container {
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0 20px;
      border-bottom: 1px solid var(--border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px var(--accent-glow);
    }
    .brand h1 {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .brand span {
      font-size: 0.75rem;
      color: var(--accent);
      margin-left: 6px;
      font-weight: 600;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .card-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .key-bar {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    input[type="password"], input[type="text"], textarea {
      width: 100%;
      background: #0b0f19;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text);
      font-size: 0.9rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }
    button {
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    button:hover { background: var(--accent-hover); }
    button.secondary {
      background: #1f293d;
      color: var(--text);
    }
    button.secondary:hover { background: #2d3b55; }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .drop-zone {
      border: 2px dashed var(--border);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: #0d1322;
    }
    .drop-zone.dragover {
      border-color: var(--accent);
      background: rgba(139, 92, 246, 0.05);
    }
    .pack-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(139, 92, 246, 0.15);
      border: 1px solid var(--accent);
      color: #c4b5fd;
    }
    .grid-props {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
      margin-top: 14px;
    }
    .prop-item {
      background: #090e1a;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
    }
    .prop-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    .prop-val {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text);
      font-family: monospace;
    }
    .vocal-style-box {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      background: #090e1a;
      border: 1px solid var(--border);
      font-size: 0.85rem;
      color: #cbd5e1;
      font-style: italic;
    }
    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .chip {
      font-size: 0.75rem;
      background: #1e293b;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 4px 10px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .chip:hover {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    /* Player controls */
    .player-deck {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #070b14;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
    }
    canvas#visualizer {
      width: 100%;
      height: 60px;
      background: #030712;
      border-radius: 8px;
      border: 1px solid #1f2937;
    }
    .player-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .playback-info {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-family: monospace;
    }
    .alert-banner {
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.82rem;
      margin-top: 10px;
      display: none;
    }
    .alert-amber {
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #fde68a;
    }
    .alert-emerald {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #a7f3d0;
    }
    .alert-rose {
      background: rgba(244, 63, 94, 0.1);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: #fecdd3;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        </div>
        <div>
          <h1>VOXPACK PLAYER<span>STANDALONE</span></h1>
        </div>
      </div>
      <div>
        <button class="secondary" id="loadSamplePackBtn">Load Built-in Voices</button>
      </div>
    </header>

    <!-- API Key Manager Card -->
    <div class="card">
      <div class="card-title">
        <span>Gemini API Authentication</span>
        <span id="keyStatusBadge" style="font-size: 0.7rem; color: var(--text-muted);">Stored locally in browser</span>
      </div>
      <div class="key-bar">
        <input type="password" id="apiKeyInput" placeholder="Enter your Gemini API Key (starts with AIzaSy...)" autocomplete="off">
        <button id="saveKeyBtn">Save Key</button>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 8px;">
        Runs entirely client-side. Calls Gemini 3.8 Flash Neural TTS. If no key is set or quota is exceeded, seamlessly falls back to browser voice.
      </p>
    </div>

    <!-- Active VOXPACK Card & Drop Zone -->
    <div class="card">
      <div class="card-title">
        <span>Loaded VOXPACK Manifest</span>
        <button class="secondary" style="padding: 4px 10px; font-size: 0.75rem;" id="exportCurrentPackBtn">Export .vox</button>
      </div>

      <div class="drop-zone" id="dropZone">
        <div style="font-size: 1.5rem; margin-bottom: 6px;">📦</div>
        <p style="font-size: 0.9rem; font-weight: 600;">Drag & Drop a <span style="color: var(--accent);">.vox</span> or <span style="color: var(--accent);">.json</span> Voice Pack here</p>
        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">or click to browse your files</p>
        <input type="file" id="filePicker" accept=".vox,.json,.voxpack" style="display: none;">
      </div>

      <div id="packDetails" style="margin-top: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <h2 id="packName" style="font-size: 1.15rem; font-weight: 800;">Lila Prime (Kore)</h2>
            <span class="pack-badge" id="packVersion">v1.0.0</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);" id="packId">vox_default_kore</span>
        </div>

        <div class="grid-props">
          <div class="prop-item">
            <div class="prop-label">Base Voice</div>
            <div class="prop-val" id="valBaseVoice" style="color: #c4b5fd;">Kore</div>
          </div>
          <div class="prop-item">
            <div class="prop-label">Pitch</div>
            <div class="prop-val" id="valPitch">1.15x</div>
          </div>
          <div class="prop-item">
            <div class="prop-label">Speed / Rate</div>
            <div class="prop-val" id="valRate">1.00x</div>
          </div>
          <div class="prop-item">
            <div class="prop-label">Tone Formant</div>
            <div class="prop-val" id="valTone">velvet</div>
          </div>
        </div>

        <div class="vocal-style-box" id="valStyle">
          "Warm, natural, conversational female companion with authentic nuance and calm grounded presence"
        </div>

        <!-- Bundled Lore & Mood Summary -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px;">
            <div style="font-size: 0.7rem; color: #a78bfa; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">📚 Bundled Lore Context</div>
            <div id="valLoreCount" style="font-size: 0.85rem; font-weight: 700; color: #f1f5f9; margin-top: 2px;">0 Documents</div>
          </div>
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px;">
            <div style="font-size: 0.7rem; color: #34d399; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">🎭 Mood & Prosody Settings</div>
            <div id="valMoodDefault" style="font-size: 0.85rem; font-weight: 700; color: #f1f5f9; margin-top: 2px;">[joyful] (Contextual ON)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Speech Synthesizer & Dialogue Box -->
    <div class="card">
      <div class="card-title">
        <span>Dialogue Input</span>
        <span style="font-size: 0.7rem; color: var(--text-muted);">Supports VOX prosody tags</span>
      </div>

      <textarea id="dialogueText" rows="3" placeholder="Type words meant to be spoken aloud...">[joyful] Hello! I am your synthetic voice. I have been loaded directly from this VOXPACK package.</textarea>

      <div class="quick-chips" id="tagChips">
        <span class="chip" data-tag="[joyful]">+ [joyful]</span>
        <span class="chip" data-tag="[whisper]">+ [whisper]</span>
        <span class="chip" data-tag="[conspiratorial]">+ [conspiratorial]</span>
        <span class="chip" data-tag="[weary]">+ [weary]</span>
        <span class="chip" data-tag="[commanding]">+ [commanding]</span>
        <span class="chip" data-tag="[tender]">+ [tender]</span>
      </div>

      <div style="margin-top: 16px;" class="player-deck">
        <canvas id="visualizer"></canvas>
        <div class="player-actions">
          <div style="display: flex; gap: 10px;">
            <button id="synthesizeBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Synthesize & Speak
            </button>
            <button class="secondary" id="stopBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
              Stop
            </button>
            <button class="secondary" id="downloadAudioBtn" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download WAV
            </button>
          </div>
          <div class="playback-info" id="statusInfo">Ready</div>
        </div>
      </div>

      <div id="alertBanner" class="alert-banner"></div>
    </div>
  </div>

  <script>
    // Embedded Active VOXPACK Manifest
    let currentPack = ${initialPackJson} || {
      voxpack_version: '1.0.0',
      id: 'vox_default_kore',
      name: 'Lila Prime (Kore)',
      author: 'VoxPack Factory',
      created_at: Date.now(),
      description: 'Warm, natural, conversational female companion with authentic nuance and calm grounded presence',
      acoustic_profile: {
        base_voice: 'Kore',
        pitch: 1.15,
        rate: 1.0,
        tone: 'velvet',
        vocal_style: 'Warm, natural, conversational female companion with authentic nuance and calm grounded presence'
      }
    };

    // State
    let apiKey = localStorage.getItem('gemini_api_key') || '';
    let currentAudio = null;
    let currentAudioBlob = null;
    let audioCtx = null;
    let analyserNode = null;
    let animationFrame = null;

    // Elements
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const keyStatusBadge = document.getElementById('keyStatusBadge');
    const dropZone = document.getElementById('dropZone');
    const filePicker = document.getElementById('filePicker');
    const packName = document.getElementById('packName');
    const packId = document.getElementById('packId');
    const packVersion = document.getElementById('packVersion');
    const valBaseVoice = document.getElementById('valBaseVoice');
    const valPitch = document.getElementById('valPitch');
    const valRate = document.getElementById('valRate');
    const valTone = document.getElementById('valTone');
    const valStyle = document.getElementById('valStyle');
    const dialogueText = document.getElementById('dialogueText');
    const synthesizeBtn = document.getElementById('synthesizeBtn');
    const stopBtn = document.getElementById('stopBtn');
    const downloadAudioBtn = document.getElementById('downloadAudioBtn');
    const statusInfo = document.getElementById('statusInfo');
    const alertBanner = document.getElementById('alertBanner');
    const canvas = document.getElementById('visualizer');
    const canvasCtx = canvas.getContext('2d');

    // Init UI
    if (apiKey) {
      apiKeyInput.value = apiKey;
      keyStatusBadge.textContent = 'API Key configured';
      keyStatusBadge.style.color = 'var(--emerald)';
    }

    function renderPack(pack) {
      currentPack = pack;
      packName.textContent = pack.name || 'Unnamed VoxPack';
      packId.textContent = pack.id || 'vox_custom';
      packVersion.textContent = 'v' + (pack.voxpack_version || '1.0.0');
      valBaseVoice.textContent = pack.acoustic_profile?.base_voice || 'Kore';
      valPitch.textContent = (pack.acoustic_profile?.pitch ?? 1.0).toFixed(2) + 'x';
      valRate.textContent = (pack.acoustic_profile?.rate ?? 1.0).toFixed(2) + 'x';
      valTone.textContent = pack.acoustic_profile?.tone || 'neutral';
      valStyle.textContent = '"' + (pack.acoustic_profile?.vocal_style || pack.description || '') + '"';

      const loreCount = pack.lore_context?.total_documents ?? pack.lore_context?.documents?.length ?? 0;
      const valLoreEl = document.getElementById('valLoreCount');
      if (valLoreEl) {
        valLoreEl.textContent = loreCount + ' Document' + (loreCount === 1 ? '' : 's');
      }

      const valMoodEl = document.getElementById('valMoodDefault');
      if (valMoodEl) {
        const moodDef = pack.mood_settings?.selected_mood_id ? '[' + pack.mood_settings.selected_mood_id + ']' : '[joyful]';
        const prosodyState = pack.mood_settings?.contextual_prosody_enabled ? 'Dynamic Prosody ON' : 'Fixed Prosody';
        valMoodEl.textContent = moodDef + ' · ' + prosodyState;
      }

      // Populate tag chips from available tags if available
      const tags = pack.mood_settings?.available_mood_tags || ['[joyful]', '[whisper]', '[conspiratorial]', '[weary]', '[commanding]', '[soothing]'];
      const chipsContainer = document.getElementById('tagChips');
      if (chipsContainer && tags && tags.length > 0) {
        chipsContainer.innerHTML = '';
        tags.slice(0, 10).forEach(t => {
          const span = document.createElement('span');
          span.className = 'chip';
          span.setAttribute('data-tag', t);
          span.textContent = '+ ' + t;
          span.addEventListener('click', () => {
            dialogueText.value = t + ' ' + dialogueText.value.replace(/^\[[a-z]+\]\s*/i, '');
            dialogueText.focus();
          });
          chipsContainer.appendChild(span);
        });
      }
    }
    renderPack(currentPack);

    // Save API Key
    saveKeyBtn.addEventListener('click', () => {
      apiKey = apiKeyInput.value.trim();
      localStorage.setItem('gemini_api_key', apiKey);
      showAlert('API Key successfully saved in local browser storage.', 'emerald');
      keyStatusBadge.textContent = 'API Key configured';
      keyStatusBadge.style.color = 'var(--emerald)';
    });

    // File Drag & Drop
    dropZone.addEventListener('click', () => filePicker.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) loadPackFile(file);
    });
    filePicker.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) loadPackFile(file);
    });

    function loadPackFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed.acoustic_profile || parsed.base_voice || parsed.baseVoice || parsed.voice_profile) {
            // Normalize
            const normalized = {
              voxpack_version: parsed.voxpack_version || '1.0.0',
              id: parsed.id || 'vox_' + Date.now(),
              name: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
              author: parsed.author || 'Imported',
              created_at: parsed.created_at || Date.now(),
              description: parsed.description || parsed.vocalStyle || '',
              acoustic_profile: parsed.acoustic_profile || {
                base_voice: parsed.baseVoice || parsed.base_voice || 'Kore',
                pitch: parsed.pitch ?? 1.0,
                rate: parsed.rate ?? 1.0,
                tone: parsed.tone || 'neutral',
                vocal_style: parsed.vocalStyle || parsed.vocal_style || ''
              },
              voice_profile: parsed.voice_profile,
              lore_context: parsed.lore_context,
              mood_settings: parsed.mood_settings
            };
            renderPack(normalized);
            showAlert('Loaded VOX Voice Pack: ' + normalized.name, 'emerald');
          } else {
            showAlert('Invalid VoxPack manifest format.', 'rose');
          }
        } catch (err) {
          showAlert('Failed to parse JSON: ' + err.message, 'rose');
        }
      };
      reader.readAsText(file);
    }

    // Export current pack as .vox
    document.getElementById('exportCurrentPackBtn').addEventListener('click', () => {
      const str = JSON.stringify(currentPack, null, 2);
      const blob = new Blob([str], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (currentPack.name || 'voice').toLowerCase().replace(/[^a-z0-9]/g, '_') + '.vox';
      a.click();
    });

    // Tag chips
    document.querySelectorAll('#tagChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        dialogueText.value = tag + ' ' + dialogueText.value.replace(/^\[[a-z]+\]\s*/i, '');
        dialogueText.focus();
      });
    });

    // Audio Visualizer
    function setupVisualizer(audioEl) {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      try {
        const source = audioCtx.createMediaElementSource(audioEl);
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        source.connect(analyserNode);
        analyserNode.connect(audioCtx.destination);
      } catch (err) {
        // Source already connected
      }
      drawVisualizer();
    }

    function drawVisualizer() {
      if (!analyserNode) return;
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#ec4899');

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      animationFrame = requestAnimationFrame(drawVisualizer);
    }

    function stopVisualizer() {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      if (canvasCtx) {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // Synthesize & Speak
    synthesizeBtn.addEventListener('click', async () => {
      stopPlayback();
      const rawText = dialogueText.value.trim();
      if (!rawText) return;

      statusInfo.textContent = 'Synthesizing...';
      synthesizeBtn.disabled = true;
      hideAlert();

      // Clean text of VOX paralinguistic tags for TTS speech prompt
      const cleanText = rawText.replace(/\[[a-z]+\]\s*/gi, '').trim() || rawText;

      const baseVoice = currentPack.acoustic_profile?.base_voice || 'Kore';
      const vocalStyle = currentPack.acoustic_profile?.vocal_style || 'Natural, warm companion delivery.';

      if (apiKey) {
        try {
          // Direct call to Gemini 3.8 Flash TTS
          const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=' + encodeURIComponent(apiKey);
          
          const payload = {
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: vocalStyle
                    }
                  }
                ]
              }
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: baseVoice
                  }
                }
              }
            }
          };

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const errMsg = errJson?.error?.message || res.statusText;
            if (res.status === 429 || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED')) {
              showAlert('Gemini Free-Tier rate limit (429) hit. Seamlessly switching to Browser Voice Fallback.', 'amber');
              fallbackBrowserTTS(cleanText);
              return;
            }
            throw new Error(errMsg);
          }

          const data = await res.json();
          const audioBase64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

          if (audioBase64) {
            playBase64Audio(audioBase64);
            return;
          } else {
            throw new Error('No audio returned in response');
          }
        } catch (err) {
          console.warn('Gemini TTS error:', err);
          showAlert('Gemini Neural TTS unavailable (' + err.message + '). Playing via Browser Speech fallback.', 'amber');
          fallbackBrowserTTS(cleanText);
        }
      } else {
        showAlert('No Gemini API Key provided. Playing via Browser Speech Synthesis fallback.', 'amber');
        fallbackBrowserTTS(cleanText);
      }
    });

    function playBase64Audio(base64) {
      try {
        const audioSrc = 'data:audio/wav;base64,' + base64;
        currentAudio = new Audio(audioSrc);
        currentAudio.playbackRate = currentPack.acoustic_profile?.rate || 1.0;

        setupVisualizer(currentAudio);

        currentAudio.onplay = () => {
          statusInfo.textContent = 'Speaking (Gemini Neural TTS)';
          synthesizeBtn.disabled = false;
        };

        currentAudio.onended = () => {
          statusInfo.textContent = 'Completed';
          stopVisualizer();
        };

        currentAudio.onerror = (e) => {
          console.error('Playback error', e);
          statusInfo.textContent = 'Playback error';
          stopVisualizer();
          synthesizeBtn.disabled = false;
        };

        currentAudio.play();

        // Enable download
        downloadAudioBtn.disabled = false;
        downloadAudioBtn.onclick = () => {
          const a = document.createElement('a');
          a.href = audioSrc;
          a.download = (currentPack.name || 'speech').toLowerCase().replace(/[^a-z0-9]/g, '_') + '.wav';
          a.click();
        };
      } catch (err) {
        console.error(err);
        fallbackBrowserTTS(dialogueText.value);
      }
    }

    function fallbackBrowserTTS(text) {
      if (!('speechSynthesis' in window)) {
        statusInfo.textContent = 'SpeechSynthesis not supported';
        synthesizeBtn.disabled = false;
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = Math.max(0.5, Math.min(2.0, (currentPack.acoustic_profile?.pitch || 1.0)));
      utterance.rate = Math.max(0.6, Math.min(1.8, (currentPack.acoustic_profile?.rate || 1.0)));

      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Google English British')));
      if (femaleVoice) utterance.voice = femaleVoice;

      utterance.onstart = () => {
        statusInfo.textContent = 'Speaking (Browser Fallback)';
        synthesizeBtn.disabled = false;
        simulateVisualizerWave();
      };
      utterance.onend = () => {
        statusInfo.textContent = 'Completed';
        stopVisualizer();
      };
      utterance.onerror = () => {
        statusInfo.textContent = 'Error';
        stopVisualizer();
        synthesizeBtn.disabled = false;
      };

      window.speechSynthesis.speak(utterance);
    }

    function simulateVisualizerWave() {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      let t = 0;
      function loop() {
        if (!window.speechSynthesis.speaking) return;
        t += 0.15;
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 30;
        const width = canvas.width / bars;
        for (let i = 0; i < bars; i++) {
          const h = (Math.sin(t + i * 0.4) * 0.4 + 0.5) * canvas.height * 0.8;
          canvasCtx.fillStyle = '#8b5cf6';
          canvasCtx.fillRect(i * width, canvas.height - h, width - 2, h);
        }
        animationFrame = requestAnimationFrame(loop);
      }
      loop();
    }

    function stopPlayback() {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      stopVisualizer();
      statusInfo.textContent = 'Ready';
      synthesizeBtn.disabled = false;
    }

    stopBtn.addEventListener('click', stopPlayback);

    function showAlert(msg, type) {
      alertBanner.textContent = msg;
      alertBanner.className = 'alert-banner alert-' + type;
      alertBanner.style.display = 'block';
    }
    function hideAlert() {
      alertBanner.style.display = 'none';
    }

    // Built-in sample packs switcher
    const BUILTIN_PACKS = [
      {
        name: 'Lila Prime (Kore)',
        acoustic_profile: { base_voice: 'Kore', pitch: 1.15, rate: 1.0, tone: 'velvet', vocal_style: 'Warm, natural, conversational female companion with authentic nuance and calm grounded presence' }
      },
      {
        name: 'Aoede (Melodic)',
        acoustic_profile: { base_voice: 'Aoede', pitch: 1.05, rate: 0.95, tone: 'warm', vocal_style: 'Lyrical, melodic female voice with gentle poetic cadence and open emotional resonance' }
      },
      {
        name: 'Autonoe (Contemplative Alto)',
        acoustic_profile: { base_voice: 'Autonoe', pitch: 0.95, rate: 0.92, tone: 'deep', vocal_style: 'Rich, contemplative female alto voice with thoughtful phrasing and deliberate depth' }
      },
      {
        name: 'Despina (Crisp & Commanding)',
        acoustic_profile: { base_voice: 'Despina', pitch: 1.1, rate: 1.05, tone: 'bright', vocal_style: 'Crisp, articulate, bright commanding female voice with sharp diction and lively presence' }
      },
      {
        name: 'Cinematic Alto (Zephyr)',
        acoustic_profile: { base_voice: 'Zephyr', pitch: 0.95, rate: 0.95, tone: 'deep', vocal_style: 'Intimate, breathy, theatrical alto voice with dramatic pacing and deliberate depth' }
      }
    ];
    let packIdx = 0;
    document.getElementById('loadSamplePackBtn').addEventListener('click', () => {
      packIdx = (packIdx + 1) % BUILTIN_PACKS.length;
      const bp = BUILTIN_PACKS[packIdx];
      renderPack({
        voxpack_version: '1.0.0',
        id: 'vox_' + bp.acoustic_profile.base_voice.toLowerCase(),
        name: bp.name,
        author: 'VoxPack Factory',
        created_at: Date.now(),
        description: bp.acoustic_profile.vocal_style,
        acoustic_profile: bp.acoustic_profile
      });
      showAlert('Switched to built-in pack: ' + bp.name, 'emerald');
    });
  </script>
</body>
</html>`;
}
