export type PrebuiltVoice = 
  | 'Kore'
  | 'Aoede'
  | 'Autonoe'
  | 'Callirrhoe'
  | 'Despina'
  | 'Erinome'
  | 'Laomedeia'
  | 'Leda'
  | 'Puck'
  | 'Charon'
  | 'Fenrir'
  | 'Zephyr';

export const FEMALE_VOICE_MODELS = [
  { id: 'Kore' as const, name: 'Kore', label: 'Kore (Default)', tone: 'Warm, clear, natural conversational female voice', description: 'Grounded, balanced, expressive' },
  { id: 'Aoede' as const, name: 'Aoede', label: 'Aoede', tone: 'Lyrical, melodic, gentle poetic cadence', description: 'Graceful, resonant, artistic' },
  { id: 'Autonoe' as const, name: 'Autonoe', label: 'Autonoe', tone: 'Rich, distinct, contemplative alto voice', description: 'Self-possessed, deliberate, nuanced' },
  { id: 'Callirrhoe' as const, name: 'Callirrhoe', label: 'Callirrhoe', tone: 'Velvety, fluid, alluring conversational warmth', description: 'Smooth, breathy, intimate' },
  { id: 'Despina' as const, name: 'Despina', label: 'Despina', tone: 'Crisp, articulate, bright commanding presence', description: 'Sharp, decisive, energetic' },
  { id: 'Erinome' as const, name: 'Erinome', label: 'Erinome', tone: 'Soft, tender, vulnerable whisper-like timbre', description: 'Intimate, fragile, compassionate' },
  { id: 'Laomedeia' as const, name: 'Laomedeia', label: 'Laomedeia', tone: 'Stately, measured, cinematic theatrical depth', description: 'Regal, authoritative, oratorical' },
  { id: 'Leda' as const, name: 'Leda', label: 'Leda', tone: 'Vibrant, playful, warm youthful inflection', description: 'Engaging, spirited, cheerful' },
];

export const OTHER_VOICE_MODELS = [
  { id: 'Puck' as const, name: 'Puck', label: 'Puck', tone: 'Playful, energetic, youthful', description: 'Bright, nimble' },
  { id: 'Charon' as const, name: 'Charon', label: 'Charon', tone: 'Deep, resonant, measured baritone', description: 'Grounded, solemn' },
  { id: 'Fenrir' as const, name: 'Fenrir', label: 'Fenrir', tone: 'Intense, dramatic, heavy timbre', description: 'Bold, commanding' },
  { id: 'Zephyr' as const, name: 'Zephyr', label: 'Zephyr', tone: 'Soft, airy, cinematic alto', description: 'Intimate, atmospheric' },
];

export interface VoiceProfile {
  id: string;
  name: string;
  sampleUrl: string; // Blob URL or data URL
  sampleFileName?: string;
  pitch: number; // 0.5 to 2.0
  rate: number; // 0.7 to 1.5
  tone: 'warm' | 'bright' | 'deep' | 'velvet' | 'neutral';
  baseVoice: PrebuiltVoice;
  vocalStyle: string; // Style prompt for neural TTS
  fallbackVoice?: string; // Browser-native voice name
  duration: number;
  createdAt: number;
}

export type CloningStatus = 'idle' | 'validating' | 'decoding' | 'analyzing' | 'synthesizing' | 'ready' | 'error';

export interface CloningProgress {
  status: CloningStatus;
  message: string;
  percent: number;
}

import { MoodOption, extractContextualProsody } from './moodStore';
import { getApiAuthHeaders } from './apiKeyStore';
import { injectMicroSilences } from './audioProcessor';
import { echos, prepareMessageForTTS, stripParalinguisticTags, paceEngine, injectSemanticProsodyTags } from './echos';
import { decodeAudioDataShared } from './audioContextManager';

let activeAudioElement: HTMLAudioElement | null = null;
let isNeuralQuotaExhausted = (() => {
  if (typeof localStorage === 'undefined') return false;
  const stored = localStorage.getItem('lila_neural_quota_exhausted');
  if (stored === 'true') {
    const timestamp = Number(localStorage.getItem('lila_neural_quota_timestamp') || 0);
    // Recover after 2 hours (Gemini free tier reset window is often 2h-24h, 2h is a safe aggressive retry)
    if (Date.now() - timestamp > 2 * 60 * 60 * 1000) {
      localStorage.removeItem('lila_neural_quota_exhausted');
      localStorage.removeItem('lila_neural_quota_timestamp');
      return false;
    }
    return true;
  }
  return false;
})();

function setNeuralQuotaExhausted(value: boolean) {
  isNeuralQuotaExhausted = value;
  if (typeof localStorage !== 'undefined') {
    if (value) {
      localStorage.setItem('lila_neural_quota_exhausted', 'true');
      localStorage.setItem('lila_neural_quota_timestamp', Date.now().toString());
    } else {
      localStorage.removeItem('lila_neural_quota_exhausted');
      localStorage.removeItem('lila_neural_quota_timestamp');
    }
  }
}

let currentPlaybackSessionId = 0;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Enhanced upload and processing function with detailed real-time progress callbacks
 */
export async function uploadAndProcessVoiceSample(
  file: File,
  onProgress?: (progress: CloningProgress) => void
): Promise<VoiceProfile> {
  const report = (status: CloningStatus, message: string, percent: number) => {
    if (onProgress) {
      onProgress({ status, message, percent });
    }
  };

  report('validating', `Validating ${file.name} (${Math.round(file.size / 1024)} KB)...`, 15);
  await new Promise(r => setTimeout(r, 200));

  const arrayBuffer = await file.arrayBuffer();
  const audioBase64 = arrayBufferToBase64(arrayBuffer);
  const sampleUrl = file.size < 4 * 1024 * 1024 
    ? `data:${file.type || 'audio/wav'};base64,${audioBase64}` 
    : URL.createObjectURL(file);

  report('decoding', 'Decoding waveform acoustics & calculating duration...', 35);
  let duration = 0;
  try {
    const audioBuffer = await decodeAudioDataShared(arrayBuffer);
    duration = audioBuffer.duration;
  } catch (err) {
    console.warn('Could not decode audio duration locally:', err);
  }

  report('analyzing', 'Extracting pitch, formant tone, and vocal characteristics...', 65);
  let serverAnalysis: any = null;
  try {
    const audioBase64 = arrayBufferToBase64(arrayBuffer);
    const res = await fetch('/api/analyze-voice-sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
      body: JSON.stringify({
        audioBase64,
        mimeType: file.type || 'audio/wav',
        fileName: file.name,
      }),
    });
    if (res.ok) {
      serverAnalysis = await res.json();
    }
  } catch (err) {
    console.warn('Server voice analysis fallback:', err);
  }

  report('synthesizing', 'Building neural TTS conditioning profile...', 85);
  await new Promise(r => setTimeout(r, 200));

  const profileId = 'voice_' + Date.now();
  const profileName = serverAnalysis?.name || file.name.replace(/\.[^/.]+$/, '') || 'Custom Voice Clone';

  const profile: VoiceProfile = {
    id: profileId,
    name: profileName,
    sampleUrl,
    sampleFileName: file.name,
    pitch: serverAnalysis?.pitch ?? 1.15,
    rate: serverAnalysis?.rate ?? 1.0,
    tone: serverAnalysis?.tone ?? 'velvet',
    baseVoice: serverAnalysis?.baseVoice ?? 'Kore',
    vocalStyle: serverAnalysis?.vocalStyle ?? 'Warm, nuanced, authentic female companion voice',
    duration,
    createdAt: Date.now(),
  };

  saveVoiceProfile(profile);
  report('ready', `TTS Voice Profile "${profile.name}" created and ready!`, 100);
  return profile;
}

// Backward compatible alias
export async function processAudioSample(file: File): Promise<VoiceProfile> {
  return uploadAndProcessVoiceSample(file);
}

export function getSavedVoiceProfiles(): VoiceProfile[] {
  try {
    const raw = localStorage.getItem('lila_voice_profiles') || localStorage.getItem('maya_voice_profiles');
    if (!raw) return getDefaultProfiles();
    return JSON.parse(raw);
  } catch {
    return getDefaultProfiles();
  }
}

export function saveVoiceProfile(profile: VoiceProfile) {
  const existing = getSavedVoiceProfiles();
  const updated = [profile, ...existing.filter(p => p.id !== profile.id)];
  localStorage.setItem('lila_voice_profiles', JSON.stringify(updated));
}

export function deleteVoiceProfile(id: string): VoiceProfile[] {
  const existing = getSavedVoiceProfiles();
  const updated = existing.filter(p => p.id !== id);
  localStorage.setItem('lila_voice_profiles', JSON.stringify(updated));
  return updated;
}

export function getDefaultProfiles(): VoiceProfile[] {
  return [
    {
      id: 'default_kore',
      name: 'Lila Prime (Kore)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 1.15,
      rate: 1.0,
      tone: 'velvet',
      baseVoice: 'Kore',
      vocalStyle: 'Warm, natural, conversational female companion with authentic nuance and calm grounded presence',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'female_aoede',
      name: 'Aoede (Melodic)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 1.05,
      rate: 0.95,
      tone: 'warm',
      baseVoice: 'Aoede',
      vocalStyle: 'Lyrical, melodic female voice with gentle poetic cadence and open emotional resonance',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'female_autonoe',
      name: 'Autonoe (Contemplative)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 0.95,
      rate: 0.92,
      tone: 'deep',
      baseVoice: 'Autonoe',
      vocalStyle: 'Rich, contemplative female alto voice with thoughtful phrasing and deliberate depth',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'female_callirrhoe',
      name: 'Callirrhoe (Velvet)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 1.0,
      rate: 0.9,
      tone: 'velvet',
      baseVoice: 'Callirrhoe',
      vocalStyle: 'Velvety, fluid, alluring female voice with soft breathiness and close conversational warmth',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'female_despina',
      name: 'Despina (Crisp)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 1.1,
      rate: 1.05,
      tone: 'bright',
      baseVoice: 'Despina',
      vocalStyle: 'Crisp, articulate, bright commanding female voice with sharp diction and lively presence',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'female_erinome',
      name: 'Erinome (Tender)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 1.0,
      rate: 0.88,
      tone: 'warm',
      baseVoice: 'Erinome',
      vocalStyle: 'Soft, tender, vulnerable whisper-like female voice with intimate breath and delicate pacing',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'female_laomedeia',
      name: 'Laomedeia (Stately)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 0.92,
      rate: 0.9,
      tone: 'deep',
      baseVoice: 'Laomedeia',
      vocalStyle: 'Stately, measured, cinematic theatrical female voice with regal authority and oratorical weight',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'female_leda',
      name: 'Leda (Vibrant)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 1.2,
      rate: 1.08,
      tone: 'bright',
      baseVoice: 'Leda',
      vocalStyle: 'Vibrant, playful, warm youthful female voice with energetic inflection and engaging charm',
      duration: 0,
      createdAt: Date.now(),
    },
    {
      id: 'cinematic_alto',
      name: 'Cinematic Alto (Zephyr)',
      sampleUrl: '',
      sampleFileName: 'built-in',
      pitch: 0.95,
      rate: 0.95,
      tone: 'deep',
      baseVoice: 'Zephyr',
      vocalStyle: 'Intimate, breathy, theatrical alto voice with dramatic pacing and deliberate depth',
      duration: 0,
      createdAt: Date.now(),
    }
  ];
}

import { interruptionMemoryStore } from './interruptionMemoryStore';

let activePlaybackText = '';
let activePlaybackStartTime = 0;
let activePlaybackEstimatedDurationSec = 0;

function recordInterruptionMemory(fullText: string, ratio: number, source: 'vad' | 'manual') {
  if (!fullText || fullText.length < 5) return;

  const targetIndex = Math.floor(fullText.length * ratio);
  
  // Find nearest space boundary
  let splitIndex = targetIndex;
  const leftSpace = fullText.lastIndexOf(' ', targetIndex);
  const rightSpace = fullText.indexOf(' ', targetIndex);

  if (leftSpace !== -1 && (targetIndex - leftSpace < 15 || rightSpace === -1)) {
    splitIndex = leftSpace;
  } else if (rightSpace !== -1) {
    splitIndex = rightSpace;
  }

  const spokenPart = fullText.slice(0, splitIndex).trim();
  const unspokenPart = fullText.slice(splitIndex).trim();

  if (spokenPart.length > 0 && unspokenPart.length > 0) {
    interruptionMemoryStore.setLastInterruption({
      id: 'int_' + Date.now(),
      fullResponse: fullText,
      spokenPart,
      unspokenPart,
      progressPercent: Math.round(ratio * 100),
      timestamp: Date.now(),
      source,
    });
  }
}

/**
 * Hard stop of any active audio or speech synthesis with interruption boundary tracking
 */
export function stopCurrentAudio(source: 'vad' | 'manual' = 'manual') {
  currentPlaybackSessionId++;

  // Capture interruption boundary before clearing active audio element
  if (activeAudioElement && !activeAudioElement.paused && activePlaybackText) {
    try {
      const currentTime = activeAudioElement.currentTime || 0;
      const duration = activeAudioElement.duration || activePlaybackEstimatedDurationSec || 1.0;
      
      if (currentTime > 0.2 && duration > 0.4) {
        const ratio = Math.min(0.98, Math.max(0.02, currentTime / duration));
        recordInterruptionMemory(activePlaybackText, ratio, source);
      }
    } catch (err) {
      console.warn('Could not record audio interruption memory:', err);
    }
  } else if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking && activePlaybackText) {
    try {
      const elapsedSec = (Date.now() - activePlaybackStartTime) / 1000;
      const durationSec = activePlaybackEstimatedDurationSec || 2.0;
      if (elapsedSec > 0.3) {
        const ratio = Math.min(0.98, Math.max(0.02, elapsedSec / durationSec));
        recordInterruptionMemory(activePlaybackText, ratio, source);
      }
    } catch (err) {
      console.warn('Could not record synth interruption memory:', err);
    }
  }

  activePlaybackText = '';
  activePlaybackStartTime = 0;
  activePlaybackEstimatedDurationSec = 0;

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
    } catch (_) {}
    activeAudioElement = null;
  }
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
}

export function getActiveAudioElement(): HTMLAudioElement | null {
  return activeAudioElement;
}

/**
 * Hook / helper function to explicitly check the ECHOS engine's breath-buffer status.
 * Returns true if a breath buffer (e.g. inhale/exhale sound) is actively playing or decaying.
 */
export function checkBreathBufferStatus(): boolean {
  return echos.checkBreathBufferStatus();
}

/**
 * Hook / helper function to retrieve detailed breath-buffer status from the ECHOS engine.
 */
export function getBreathBufferStatus(): { active: boolean; remainingMs: number } {
  return echos.getBreathBufferStatus();
}

/**
 * Hook / helper function to wait for active breath buffer to complete before starting word audio.
 */
export async function waitForBreathBuffer(maxWaitMs: number = 600): Promise<boolean> {
  return echos.waitForBreathBuffer(maxWaitMs);
}

class SubUtteranceAudioQueue {
  private queue: Array<{ audio: HTMLAudioElement; clauseText: string }> = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;
  private thisSessionId: number;
  private onEnd?: () => void;
  private echosPlanHandled = false;
  private echosPlan: any;
  private isFinished = false;

  constructor(sessionId: number, echosPlan: any, onEnd?: () => void) {
    this.thisSessionId = sessionId;
    this.echosPlan = echosPlan;
    this.onEnd = onEnd;
  }

  enqueue(audioBase64: string, clauseText: string) {
    const audioSrc = `data:audio/wav;base64,${audioBase64}`;
    const audio = new Audio(audioSrc);
    this.queue.push({ audio, clauseText });
    this.playNext();
  }

  async playNext() {
    if (this.isPlaying || this.queue.length === 0) return;
    if (currentPlaybackSessionId !== this.thisSessionId) return;

    this.isPlaying = true;
    const item = this.queue.shift()!;
    this.currentAudio = item.audio;
    activeAudioElement = item.audio;

    echos.connectAssistantAudio(item.audio);

    if (!this.echosPlanHandled && this.echosPlan?.items?.length > 0) {
      this.echosPlanHandled = true;
      const audioContextStart = echos.getAudioContextTime();
      echos.schedulePlan(this.echosPlan, audioContextStart);
    }

    item.audio.onended = () => {
      this.isPlaying = false;
      this.currentAudio = null;
      if (activeAudioElement === item.audio) {
        activeAudioElement = null;
      }
      if (this.queue.length > 0) {
        this.playNext();
      } else if (this.isFinished) {
        if (this.onEnd && currentPlaybackSessionId === this.thisSessionId) {
          this.onEnd();
        }
      }
    };

    item.audio.onerror = () => {
      this.isPlaying = false;
      this.currentAudio = null;
      if (activeAudioElement === item.audio) {
        activeAudioElement = null;
      }
      if (this.queue.length > 0) {
        this.playNext();
      } else if (this.isFinished) {
        if (this.onEnd && currentPlaybackSessionId === this.thisSessionId) {
          this.onEnd();
        }
      }
    };

    try {
      await echos.waitForBreathBuffer(600);
      if (currentPlaybackSessionId !== this.thisSessionId) return;

      activePlaybackText = item.clauseText;
      activePlaybackStartTime = Date.now();
      activePlaybackEstimatedDurationSec = item.audio.duration || (item.clauseText.length * 0.07);

      await item.audio.play();
    } catch (err) {
      console.warn('Chunk play error:', err);
      this.isPlaying = false;
      if (this.queue.length > 0) {
        this.playNext();
      } else if (this.isFinished && this.onEnd && currentPlaybackSessionId === this.thisSessionId) {
        this.onEnd();
      }
    }
  }

  markFinished() {
    this.isFinished = true;
    if (!this.isPlaying && this.queue.length === 0) {
      if (this.onEnd && currentPlaybackSessionId === this.thisSessionId) {
        this.onEnd();
      }
    }
  }
}

/**
 * Strictly synchronized voice playback to guarantee only 1 voice ever speaks at a time
 */
export async function speakWithVoiceProfile(
  text: string, 
  profile: VoiceProfile, 
  onEnd?: () => void,
  mood?: MoodOption,
  momentum?: number
) {
  // Extract contextual prosody if present (e.g., "[joyful] Good morning!")
  const { cleanText, mood: detectedMood } = extractContextualProsody(text);
  const effectiveMood = mood || detectedMood;

  // Semantic Prosody Tag Auto-Injection (Pre-TTS LLM Filter):
  // Parses assistant response and injects nonverbal sound tokens ([sigh], [gasp], [laugh], [hum], [tsk])
  // based on sentiment, punctuation, and mood cues before TTS routing.
  const { injectedText } = injectSemanticProsodyTags(cleanText, { moodTag: effectiveMood?.tag });

  // Plan ECHOS nonverbal acoustic events and extract clean spoken words
  const echosPlan = echos.plan(injectedText);
  // Prepare message for TTS: strip any non-verbal vocalization tags ([sigh], [hum], etc.) and route them
  const { cleanTextForTTS: textForTts } = prepareMessageForTTS(echosPlan.spoken || injectedText);

  // Sync ECHOS mood if plan indicates an emotion
  if (echosPlan.mood) {
    echos.setState({ mood: echosPlan.mood });
  }

  // Increment session token to invalidate any previous or race audio calls
  const thisSessionId = ++currentPlaybackSessionId;
  stopCurrentAudio();
  currentPlaybackSessionId = thisSessionId; // Re-align after stopCurrentAudio

  let hasCompleted = false;
  const safeEnd = () => {
    if (!hasCompleted && currentPlaybackSessionId === thisSessionId) {
      hasCompleted = true;
      if (onEnd) onEnd();
    }
  };

  // 1. Try Sub-Utterance Streaming Neural TTS first (if not quota-exhausted)
  if (!isNeuralQuotaExhausted) {
    try {
      const streamRes = await fetch('/api/tts-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify({
          text: textForTts,
          voiceProfile: profile,
          mood: effectiveMood,
          momentum,
        }),
      });

      if (currentPlaybackSessionId !== thisSessionId) {
        return;
      }

      if (streamRes.ok && streamRes.body) {
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let chunksReceived = 0;
        let streamQuotaExceeded = false;
        const audioQueue = new SubUtteranceAudioQueue(thisSessionId, echosPlan, safeEnd);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (currentPlaybackSessionId !== thisSessionId) {
            reader.cancel();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const payload = JSON.parse(trimmed);
              if (payload.quotaExceeded) {
                streamQuotaExceeded = true;
                setNeuralQuotaExhausted(true);
                break;
              }
              if (payload.audio) {
                chunksReceived++;
                audioQueue.enqueue(payload.audio, payload.clauseText || textForTts);
              }
            } catch (e) {
              console.warn('NDJSON parse error in tts-stream:', e);
            }
          }

          if (streamQuotaExceeded) {
            reader.cancel();
            break;
          }
        }

        if (!streamQuotaExceeded && buffer.trim()) {
          try {
            const payload = JSON.parse(buffer.trim());
            if (payload.audio) {
              chunksReceived++;
              audioQueue.enqueue(payload.audio, payload.clauseText || textForTts);
            }
          } catch (_) {}
        }

        audioQueue.markFinished();

        if (chunksReceived > 0 && !streamQuotaExceeded) {
          return; // Successfully streaming neural audio chunks
        }
      }
    } catch (streamErr) {
      console.warn('Streaming TTS endpoint fallback to batch/browser:', streamErr);
    }

    // Fallback to batch Neural TTS endpoint
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiAuthHeaders() },
        body: JSON.stringify({
          text: textForTts,
          voiceProfile: profile,
          mood: effectiveMood,
          momentum,
        }),
      });

      // If a newer playback request arrived while waiting for network, abort!
      if (currentPlaybackSessionId !== thisSessionId) {
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.quotaExceeded) {
          setNeuralQuotaExhausted(true);
          console.info('Neural voice quota reached, switching seamlessly to browser speech synthesis.');
        } else if (data.audio && typeof data.audio === 'string' && data.audio.length > 50) {
          // Prepend synthetic micro-silences for natural human inhalation before playback starts
          const paceToUse = effectiveMood?.pace || { rate: 1.0, pause: 'normal', articulation: 'neutral' };
          const processedAudio = injectMicroSilences(data.audio, paceToUse);
          const audioSrc = `data:audio/wav;base64,${processedAudio}`;
          const audio = new Audio(audioSrc);
          activeAudioElement = audio;
          
          // Connect to ECHOS for ducking support
          echos.connectAssistantAudio(audio);

          // Trigger ECHOS paralinguistic sound takes with sample-accurate AudioContext timeline alignment
          if (echosPlan.items.length > 0) {
            const audioContextStart = echos.getAudioContextTime();
            echos.schedulePlan(echosPlan, audioContextStart);
          }

          audio.onended = () => {
            if (activeAudioElement === audio) {
              activeAudioElement = null;
            }
            safeEnd();
          };

          audio.onerror = () => {
            if (activeAudioElement === audio) {
              activeAudioElement = null;
            }
            // Only fallback if this session is still the active one
            if (currentPlaybackSessionId === thisSessionId) {
              fallbackSpeechSynthesis(text, profile, safeEnd, thisSessionId, mood, momentum);
            }
          };

          try {
            // Explicitly check breath-buffer status to ensure breath-injections never clash with synthesized word start
            await echos.waitForBreathBuffer(600);
            if (currentPlaybackSessionId !== thisSessionId) return;

            activePlaybackText = textForTts;
            activePlaybackStartTime = Date.now();
            activePlaybackEstimatedDurationSec = audio.duration || (textForTts.length * 0.07);

            await audio.play();
            return; // Successfully playing neural audio, do NOT fall through
          } catch (playErr) {
            console.warn('Audio play error, falling back:', playErr);
            if (activeAudioElement === audio) {
              activeAudioElement = null;
            }
          }
        }
      } else if (res.status === 429) {
        setNeuralQuotaExhausted(true);
      }
    } catch (err: any) {
      const errStr = String(err);
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        setNeuralQuotaExhausted(true);
      }
      console.warn('Neural TTS request failed, using browser synthesis:', err);
    }
  }

  // 2. Browser SpeechSynthesis (free, unlimited, instant, 0 quota)
  if (currentPlaybackSessionId === thisSessionId) {
    fallbackSpeechSynthesis(text, profile, safeEnd, thisSessionId, mood, momentum);
  }
}

async function fallbackSpeechSynthesis(
  text: string, 
  profile: VoiceProfile, 
  onEnd: () => void,
  sessionId: number,
  mood?: MoodOption,
  momentum?: number
) {
  if (currentPlaybackSessionId !== sessionId) return;

  if (!('speechSynthesis' in window)) {
    onEnd();
    return;
  }

  // Explicitly check breath-buffer status to ensure breath-injections never clash with synthesized word start
  await echos.waitForBreathBuffer(600);
  if (currentPlaybackSessionId !== sessionId) return;

  // Extract contextual prosody if present and strip tag from utterance
  const { cleanText, mood: detectedMood } = extractContextualProsody(text);
  const effectiveMood = mood || detectedMood;
  // Ensure non-verbal vocalization tags ([sigh], [hum], etc.) are stripped for clean TTS
  const cleanDialogueForTTS = stripParalinguisticTags(cleanText);

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanDialogueForTTS);
    
    // Calculate smoothed PaceVector via PaceEngine for natural rate and prosody transitions
    const basePitch = profile.pitch || 1.0;
    const baseRate = profile.rate || 1.0;
    const rawVolume = effectiveMood?.volumeMod ?? 1.0;

    const paceVector = paceEngine.updateState({
      momentum,
      mood: effectiveMood,
      text: cleanDialogueForTTS,
      baseRate,
    });

    // Express loudness > 1.0 through elevated pitch and projection rate in browser fallback
    const loudnessExcess = Math.max(0, rawVolume - 1.0);
    const loudnessPitchMultiplier = 1.0 + loudnessExcess * 0.4;
    const loudnessRateMultiplier = 1.0 + loudnessExcess * 0.25;

    utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch * paceVector.pitchMod * loudnessPitchMultiplier));
    utterance.rate = Math.max(0.6, Math.min(1.8, paceVector.effectiveRate * loudnessRateMultiplier));
    utterance.volume = Math.max(0.0, Math.min(1.0, rawVolume));

    const voices = window.speechSynthesis.getVoices();
    
    // 1. Try to use profile's specified fallback voice
    let selectedVoice = voices.find(v => v.name === profile.fallbackVoice);

    // 2. Fallback to generic English female voice if not found
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.startsWith('en') && (
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('samantha') || 
          v.name.toLowerCase().includes('victoria') || 
          v.name.toLowerCase().includes('karen') || 
          v.name.toLowerCase().includes('zira') || 
          v.name.toLowerCase().includes('google english british') ||
          v.name.toLowerCase().includes('google uk english female')
        )
      ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (currentPlaybackSessionId === sessionId) {
        onEnd();
      }
    };

    utterance.onerror = () => {
      if (currentPlaybackSessionId === sessionId) {
        onEnd();
      }
    };

    activePlaybackText = cleanDialogueForTTS;
    activePlaybackStartTime = Date.now();
    activePlaybackEstimatedDurationSec = cleanDialogueForTTS.length * 0.08;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('SpeechSynthesis error:', err);
    onEnd();
  }
}
