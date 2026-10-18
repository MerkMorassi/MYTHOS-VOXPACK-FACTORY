export interface VoiceProfile {
  id: string;
  name: string;
  sampleUrl: string; // Blob URL or data URL
  sampleFileName?: string;
  pitch: number; // 0.5 to 2.0
  rate: number; // 0.7 to 1.5
  tone: 'warm' | 'bright' | 'deep' | 'velvet' | 'neutral';
  baseVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
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

import { MoodOption } from './moodStore';

let activeAudioElement: HTMLAudioElement | null = null;
let isNeuralQuotaExhausted = false;
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
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
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
      headers: { 'Content-Type': 'application/json' },
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
      id: 'default_maya',
      name: 'Lila Prime (Default)',
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
      id: 'cinematic_alto',
      name: 'Cinematic Alto',
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

/**
 * Hard stop of any active audio or speech synthesis
 */
export function stopCurrentAudio() {
  currentPlaybackSessionId++;
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
 * Strictly synchronized voice playback to guarantee only 1 voice ever speaks at a time
 */
export async function speakWithVoiceProfile(
  text: string, 
  profile: VoiceProfile, 
  onEnd?: () => void,
  mood?: MoodOption
) {
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

  // 1. Try Neural TTS first (if not quota-exhausted)
  if (!isNeuralQuotaExhausted) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceProfile: profile,
          mood,
        }),
      });

      // If a newer playback request arrived while waiting for network, abort!
      if (currentPlaybackSessionId !== thisSessionId) {
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.quotaExceeded) {
          isNeuralQuotaExhausted = true;
          console.info('Neural voice quota reached, switching seamlessly to browser speech synthesis.');
        } else if (data.audio && typeof data.audio === 'string' && data.audio.length > 50) {
          const audioSrc = `data:audio/wav;base64,${data.audio}`;
          const audio = new Audio(audioSrc);
          activeAudioElement = audio;

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
              fallbackSpeechSynthesis(text, profile, safeEnd, thisSessionId, mood);
            }
          };

          try {
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
        isNeuralQuotaExhausted = true;
      }
    } catch (err) {
      console.warn('Neural TTS request failed, using browser synthesis:', err);
    }
  }

  // 2. Browser SpeechSynthesis (free, unlimited, instant, 0 quota)
  if (currentPlaybackSessionId === thisSessionId) {
    fallbackSpeechSynthesis(text, profile, safeEnd, thisSessionId, mood);
  }
}

function fallbackSpeechSynthesis(
  text: string, 
  profile: VoiceProfile, 
  onEnd: () => void,
  sessionId: number,
  mood?: MoodOption
) {
  if (currentPlaybackSessionId !== sessionId) return;

  if (!('speechSynthesis' in window)) {
    onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Modulate pitch and tempo with selected emotional mood
    const basePitch = profile.pitch || 1.0;
    const baseRate = profile.rate || 1.0;
    const pitchMod = mood?.pitchMod ?? 1.0;
    const rateMod = mood?.rateMod ?? 1.0;

    utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch * pitchMod));
    utterance.rate = Math.max(0.6, Math.min(1.5, baseRate * rateMod));
    utterance.volume = Math.max(0.0, Math.min(1.0, mood?.volumeMod ?? 1.0));

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

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('SpeechSynthesis error:', err);
    onEnd();
  }
}
