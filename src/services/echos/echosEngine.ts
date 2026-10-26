// ECHOS Chip - Engine & Performer (SYS.AI.MAYA.SESAME v1.0.0)
// Paralinguistic vocal fillers, multi-take sampling, and turn-taking earcons

import { getSharedAudioContext } from '../audioContextManager';
import { spatialAcoustic } from '../spatialAcousticEngine';

export type EchosVoiceTag = 
  | 'hum' 
  | 'breath' 
  | 'exhale'
  | 'chirp' 
  | 'gasp' 
  | 'sigh' 
  | 'purr' 
  | 'click' 
  | 'groan' 
  | 'tsk' 
  | 'moan' 
  | 'buzz' 
  | 'laugh';

export type EchosEarcon = 
  | 'floor_want' 
  | 'floor_yield' 
  | 'floor_ack';

export type EchosTag = EchosVoiceTag | EchosEarcon;

export type EchosMood = 
  | 'neutral' 
  | 'content' 
  | 'amused' 
  | 'curious' 
  | 'surprised' 
  | 'disappointed' 
  | 'frustrated' 
  | 'tired' 
  | 'relieved' 
  | 'thinking' 
  | 'desire' 
  | 'annoyed';

export interface EchosMoodMeta {
  hue: number; // 0-360
  hsl: string;
  defaultSound: { tag: EchosVoiceTag; lvl: number };
}

export const ECHOS_VOICE_TAGS: EchosVoiceTag[] = [
  'hum', 'breath', 'exhale', 'chirp', 'gasp', 'sigh', 'purr',
  'click', 'groan', 'tsk', 'moan', 'buzz', 'laugh'
];

export const ECHOS_EARCONS: EchosEarcon[] = [
  'floor_want', 'floor_yield', 'floor_ack'
];

export const ECHOS_MOODS: Record<EchosMood, EchosMoodMeta> = {
  neutral: { hue: 215, hsl: 'hsl(215, 20%, 65%)', defaultSound: { tag: 'breath', lvl: 1 } },
  content: { hue: 145, hsl: 'hsl(145, 55%, 60%)', defaultSound: { tag: 'hum', lvl: 1 } },
  amused: { hue: 45, hsl: 'hsl(45, 90%, 60%)', defaultSound: { tag: 'laugh', lvl: 1 } },
  curious: { hue: 190, hsl: 'hsl(190, 80%, 60%)', defaultSound: { tag: 'chirp', lvl: 1 } },
  surprised: { hue: 280, hsl: 'hsl(280, 85%, 65%)', defaultSound: { tag: 'gasp', lvl: 2 } },
  disappointed: { hue: 230, hsl: 'hsl(230, 30%, 50%)', defaultSound: { tag: 'sigh', lvl: 2 } },
  frustrated: { hue: 15, hsl: 'hsl(15, 80%, 55%)', defaultSound: { tag: 'groan', lvl: 2 } },
  tired: { hue: 220, hsl: 'hsl(220, 20%, 45%)', defaultSound: { tag: 'sigh', lvl: 3 } },
  relieved: { hue: 165, hsl: 'hsl(165, 60%, 60%)', defaultSound: { tag: 'sigh', lvl: 1 } },
  thinking: { hue: 260, hsl: 'hsl(260, 60%, 65%)', defaultSound: { tag: 'hum', lvl: 2 } },
  desire: { hue: 330, hsl: 'hsl(330, 80%, 65%)', defaultSound: { tag: 'purr', lvl: 2 } },
  annoyed: { hue: 5, hsl: 'hsl(5, 75%, 55%)', defaultSound: { tag: 'tsk', lvl: 2 } },
};

export const ECHOS_ALIASES: Record<string, { tag: EchosVoiceTag; lvl: number; mood: EchosMood }> = {
  satisfaction: { tag: 'hum', lvl: 1, mood: 'content' },
  contentment: { tag: 'hum', lvl: 1, mood: 'content' },
  disappointment: { tag: 'sigh', lvl: 2, mood: 'disappointed' },
  relief: { tag: 'sigh', lvl: 1, mood: 'relieved' },
  amusement: { tag: 'laugh', lvl: 1, mood: 'amused' },
  delight: { tag: 'chirp', lvl: 2, mood: 'amused' },
  curiosity: { tag: 'hum', lvl: 1, mood: 'curious' },
  surprise: { tag: 'gasp', lvl: 2, mood: 'surprised' },
  thinking: { tag: 'hum', lvl: 2, mood: 'thinking' },
  pondering: { tag: 'hum', lvl: 2, mood: 'thinking' },
  frustration: { tag: 'groan', lvl: 2, mood: 'frustrated' },
  annoyance: { tag: 'tsk', lvl: 2, mood: 'annoyed' },
  tired: { tag: 'sigh', lvl: 3, mood: 'tired' },
  weary: { tag: 'sigh', lvl: 3, mood: 'tired' },
  desire: { tag: 'purr', lvl: 2, mood: 'desire' },
  longing: { tag: 'purr', lvl: 2, mood: 'desire' },
  pleasure: { tag: 'hum', lvl: 2, mood: 'desire' },
};

export interface ParsedSoundChunk {
  type: 'sound';
  tag: EchosTag;
  lvl: number;
  offsetMs: number;
  under: boolean;
  rawTag: string;
}

export interface ParsedTextChunk {
  type: 'text';
  text: string;
}

export type EchosParsedChunk = ParsedSoundChunk | ParsedTextChunk;

export interface EchosParseResult {
  chunks: EchosParsedChunk[];
  spoken: string;
  tags: ParsedSoundChunk[];
  unknown: string[];
}

export interface EchosSoundPlanItem {
  tag: EchosTag;
  lvl: number;
  take: number;
  cents: number;
  db: number;
  mode: 'gap' | 'under' | 'offset';
  offsetMs: number;
  durationMs: number;
  chunkIndex: number;
}

export interface EchosPlan {
  v: 1;
  spoken: string;
  items: EchosSoundPlanItem[];
  mood: EchosMood;
  hue: number;
}

export interface EchosEvent {
  tag: string;
  take: number;
  lvl: number;
  t: number;
  ev: 'sfx' | 'plan' | 'pass';
  src: 'synth' | 'sample';
  cents: number;
  db: number;
  mode: 'gap' | 'under' | 'offset';
  off: number;
  out: 'audio' | 'blocked' | 'muted' | 'headless';
  ms: number;
  clamped?: boolean;
}

export interface EchosRespiratoryConfig {
  enabled: boolean;
  intensity: number; // 0 to 100 (%)
  frequency: number; // 0 to 100 (%)
}

export interface EchosState {
  mood: EchosMood;
  hue: number;
  level: number;
  lastTag?: string;
  speaking: boolean;
  sessionActive: boolean;
  rr: Record<string, number>; // last take index per tag:lvl
}

// -------------------------------------------------------------
// PURE FUNCTIONS: PARSE & PLAN
// -------------------------------------------------------------

export function parseEchosLine(line: string): EchosParseResult {
  const chunks: EchosParsedChunk[] = [];
  const tags: ParsedSoundChunk[] = [];
  const unknown: string[] = [];
  let spokenParts: string[] = [];

  // Match tags like [hum], [sigh:2], [sigh@-150ms], [laugh:1 under], [disappointment]
  const tagRegex = /\[([a-zA-Z_]+)(?::([1-3]))?(?:@([+-]?\d+)(?:ms)?)?(?:\s+(under))?\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const textPiece = line.slice(lastIndex, match.index);
      if (textPiece.length > 0) {
        chunks.push({ type: 'text', text: textPiece });
        spokenParts.push(textPiece);
      }
    }

    const rawName = match[1].toLowerCase();
    const lvlParsed = match[2] ? parseInt(match[2], 10) : undefined;
    const offsetParsed = match[3] ? parseInt(match[3], 10) : 0;
    const isUnder = match[4] === 'under';

    // Check alias or known tag
    let effectiveTag: EchosTag | null = null;
    let effectiveLvl = lvlParsed || 2;

    if (ECHOS_VOICE_TAGS.includes(rawName as EchosVoiceTag) || ECHOS_EARCONS.includes(rawName as EchosEarcon)) {
      effectiveTag = rawName as EchosTag;
    } else if (ECHOS_ALIASES[rawName]) {
      const alias = ECHOS_ALIASES[rawName];
      effectiveTag = alias.tag;
      if (!lvlParsed) effectiveLvl = alias.lvl;
    } else {
      // Ignored non-echos tag (e.g. [1], [wry]) - if not a purely numeric or mood tag, record unknown
      unknown.push(rawName);
    }

    if (effectiveTag) {
      const soundChunk: ParsedSoundChunk = {
        type: 'sound',
        tag: effectiveTag,
        lvl: Math.max(1, Math.min(3, effectiveLvl)),
        offsetMs: offsetParsed,
        under: isUnder,
        rawTag: match[0],
      };
      chunks.push(soundChunk);
      tags.push(soundChunk);
    } else {
      // Keep unparsed tag text as text if not an ECHOS token
      chunks.push({ type: 'text', text: match[0] });
      spokenParts.push(match[0]);
    }

    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    const remaining = line.slice(lastIndex);
    chunks.push({ type: 'text', text: remaining });
    spokenParts.push(remaining);
  }

  return {
    chunks,
    spoken: spokenParts.join('').replace(/\s+/g, ' ').trim(),
    tags,
    unknown,
  };
}

export function pickTake(tag: string, lvl: number, lastTake?: number): number {
  const totalTakes = 5;
  const candidates: number[] = [];
  for (let i = 1; i <= totalTakes; i++) {
    if (i !== lastTake) candidates.push(i);
  }
  const pickedIndex = Math.floor(Math.random() * candidates.length);
  return candidates[pickedIndex] || 1;
}

export function getTemporalJitterSec(minMs = 8, maxMs = 28): number {
  return (minMs + Math.random() * (maxMs - minMs)) / 1000;
}

export function computeJitter(): { cents: number; db: number; temporalJitterSec: number } {
  // Jitter: +/- 8 cents, +/- 1.0 dB gain jitter, 8ms-28ms natural human speech onset micro-jitter
  const cents = Math.round((Math.random() * 16 - 8) * 10) / 10;
  const db = Math.round((Math.random() * 2.0 - 1.0) * 10) / 10;
  const temporalJitterSec = Math.round(getTemporalJitterSec(8, 28) * 1000) / 1000;
  return { cents, db, temporalJitterSec };
}

// -------------------------------------------------------------
// WEBAUDIO PROCEDURAL SYNTHESIS (Zero External File Dependencies)
// -------------------------------------------------------------

class WebAudioSynthBank {
  private ctx: AudioContext | null = null;
  private ttsGain: GainNode | null = null;
  private ttsAnalyser: AnalyserNode | null = null;
  private ttsAnalyserData: Float32Array | null = null;

  getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        this.ctx = getSharedAudioContext();
        this.ttsGain = this.ctx.createGain();
        this.ttsAnalyser = this.ctx.createAnalyser();
        this.ttsAnalyser.fftSize = 256;
        this.ttsAnalyserData = new Float32Array(this.ttsAnalyser.frequencyBinCount);
        
        this.ttsGain.connect(this.ttsAnalyser);
        this.ttsAnalyser.connect(spatialAcoustic.getVoiceInputNode());
      } catch (err) {
        console.warn('[ECHOS] Failed to initialize shared AudioContext:', err);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  getTTSGain(): GainNode | null {
    this.getContext();
    return this.ttsGain;
  }

  /**
   * Returns current RMS power level of the TTS channel (0 to 1)
   */
  getTTSPower(): number {
    if (!this.ttsAnalyser || !this.ttsAnalyserData) return 0;
    this.ttsAnalyser.getFloatTimeDomainData(this.ttsAnalyserData as any);
    let sum = 0;
    for (let i = 0; i < this.ttsAnalyserData.length; i++) {
      sum += this.ttsAnalyserData[i] * this.ttsAnalyserData[i];
    }
    return Math.sqrt(sum / this.ttsAnalyserData.length);
  }

  /**
   * Connects an HTMLMediaElement to the engine's TTS channel for ducking support.
   */
  connectAssistantAudio(element: HTMLMediaElement): MediaElementAudioSourceNode | null {
    const ctx = this.getContext();
    if (!ctx || !this.ttsGain) return null;
    
    const source = ctx.createMediaElementSource(element);
    source.connect(this.ttsGain);
    return source;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink/brown filter for organic breath timbre
      data[i] = (lastOut + 0.05 * white) / 1.05;
      lastOut = data[i];
    }
    return buffer;
  }

  playSynthTake(
    tag: EchosTag,
    lvl: number,
    take: number,
    cents: number,
    db: number,
    whenTime?: number
  ): { durationMs: number; promise: Promise<void> } {
    const ctx = this.getContext();
    if (!ctx) {
      return { durationMs: 250, promise: Promise.resolve() };
    }

    const now = whenTime !== undefined 
      ? Math.max(ctx.currentTime, whenTime) 
      : ctx.currentTime + getTemporalJitterSec(8, 25);
    const masterGain = ctx.createGain();
    const gainScale = Math.pow(10, db / 20) * (lvl === 1 ? 0.65 : lvl === 3 ? 1.25 : 0.95);
    masterGain.gain.setValueAtTime(gainScale, now);
    masterGain.connect(spatialAcoustic.getBackgroundInputNode());

    const pitchFactor = Math.pow(2, cents / 1200);

    let durationMs = 350;

    switch (tag) {
      // 1. SIGH: Long falling soft breath noise
      case 'sigh': {
        durationMs = lvl === 1 ? 450 : lvl === 3 ? 850 : 650;
        const durSec = durationMs / 1000;
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(750 * pitchFactor, now);
        filter.frequency.exponentialRampToValueAtTime(220 * pitchFactor, now + durSec);
        filter.Q.setValueAtTime(2.2, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.25, now + 0.08);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        noise.start(now);
        noise.stop(now + durSec);
        break;
      }

      // 2. BREATH: Soft gentle in-breath
      case 'breath': {
        durationMs = lvl === 1 ? 220 : lvl === 3 ? 420 : 320;
        const durSec = durationMs / 1000;
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500 * pitchFactor, now);
        filter.frequency.linearRampToValueAtTime(950 * pitchFactor, now + durSec * 0.7);
        filter.Q.setValueAtTime(1.8, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.exponentialRampToValueAtTime(0.18, now + durSec * 0.6);
        env.gain.linearRampToValueAtTime(0.001, now + durSec);

        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        noise.start(now);
        noise.stop(now + durSec);
        break;
      }

      case 'exhale': {
        durationMs = lvl === 1 ? 400 : lvl === 3 ? 800 : 600;
        const durSec = durationMs / 1000;
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850 * pitchFactor, now);
        filter.frequency.linearRampToValueAtTime(450 * pitchFactor, now + durSec);
        filter.Q.setValueAtTime(1.2, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.exponentialRampToValueAtTime(0.12, now + 0.1);
        env.gain.linearRampToValueAtTime(0.001, now + durSec);

        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        noise.start(now);
        noise.stop(now + durSec);
        break;
      }

      // 3. GASP: Sharp, quick intake
      case 'gasp': {
        durationMs = 180;
        const durSec = 0.18;
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450 * pitchFactor, now);
        filter.frequency.exponentialRampToValueAtTime(1300 * pitchFactor, now + 0.14);
        filter.Q.setValueAtTime(3.0, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.35, now + 0.06);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        noise.start(now);
        noise.stop(now + durSec);
        break;
      }

      // 4. HUM: Closed mouth melodic mm
      case 'hum': {
        durationMs = lvl === 1 ? 300 : lvl === 3 ? 600 : 450;
        const durSec = durationMs / 1000;
        const osc = ctx.createOscillator();
        const baseFreq = (175 + (take % 3) * 15) * pitchFactor;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq * 0.96, now + durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.3, now + 0.08);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        osc.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        osc.start(now);
        osc.stop(now + durSec);
        break;
      }

      // 5. CHIRP: Short rising squeak / pleasant perk
      case 'chirp': {
        durationMs = 120;
        const durSec = 0.12;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650 * pitchFactor, now);
        osc.frequency.exponentialRampToValueAtTime(1450 * pitchFactor, now + durSec);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.2, now + 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        osc.connect(env);
        env.connect(masterGain);

        osc.start(now);
        osc.stop(now + durSec);
        break;
      }

      // 6. LAUGH: 2-3 staccato breathy pulses
      case 'laugh': {
        durationMs = 420;
        const pulses = 3;
        for (let p = 0; p < pulses; p++) {
          const pStart = now + p * 0.13;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime((240 - p * 15) * pitchFactor, pStart);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, pStart);
          env.gain.linearRampToValueAtTime(0.22, pStart + 0.03);
          env.gain.exponentialRampToValueAtTime(0.001, pStart + 0.11);

          osc.connect(env);
          env.connect(masterGain);

          osc.start(pStart);
          osc.stop(pStart + 0.12);
        }
        break;
      }

      // 7. PURR: Warm vibrating rumble
      case 'purr': {
        durationMs = 500;
        const durSec = 0.5;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110 * pitchFactor, now);

        const tremolo = ctx.createOscillator();
        tremolo.frequency.setValueAtTime(24, now); // 24Hz rumble
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.setValueAtTime(0.12, now);
        tremolo.connect(tremoloGain.gain);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.22, now + 0.1);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        osc.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        tremolo.start(now);
        osc.start(now);
        tremolo.stop(now + durSec);
        osc.stop(now + durSec);
        break;
      }

      // 8. CLICK: Crisp tongue click
      case 'click': {
        durationMs = 40;
        const durSec = 0.04;
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200 * pitchFactor, now);
        filter.Q.setValueAtTime(4.0, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.4, now);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        noise.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        noise.start(now);
        noise.stop(now + durSec);
        break;
      }

      // 9. TSK: Double click transient
      case 'tsk': {
        durationMs = 120;
        for (let i = 0; i < 2; i++) {
          const tStart = now + i * 0.055;
          const noise = ctx.createBufferSource();
          noise.buffer = this.createNoiseBuffer(ctx, 0.03);

          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(3000 * pitchFactor, tStart);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.3, tStart);
          env.gain.exponentialRampToValueAtTime(0.001, tStart + 0.025);

          noise.connect(filter);
          filter.connect(env);
          env.connect(masterGain);

          noise.start(tStart);
          noise.stop(tStart + 0.03);
        }
        break;
      }

      // 10. GROAN: Low falling vocalization
      case 'groan': {
        durationMs = 380;
        const durSec = 0.38;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140 * pitchFactor, now);
        osc.frequency.exponentialRampToValueAtTime(85 * pitchFactor, now + durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.24, now + 0.06);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        osc.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        osc.start(now);
        osc.stop(now + durSec);
        break;
      }

      // 11. MOAN: Open resonant vocal tone
      case 'moan': {
        durationMs = 450;
        const durSec = 0.45;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(210 * pitchFactor, now);
        osc.frequency.linearRampToValueAtTime(190 * pitchFactor, now + durSec);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.Q.setValueAtTime(1.5, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.25, now + 0.09);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        osc.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        osc.start(now);
        osc.stop(now + durSec);
        break;
      }

      // 12. BUZZ: Gritty low throat vibration
      case 'buzz': {
        durationMs = 280;
        const durSec = 0.28;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95 * pitchFactor, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(260, now);
        filter.Q.setValueAtTime(3.5, now);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now);
        env.gain.linearRampToValueAtTime(0.28, now + 0.04);
        env.gain.exponentialRampToValueAtTime(0.001, now + durSec);

        osc.connect(filter);
        filter.connect(env);
        env.connect(masterGain);

        osc.start(now);
        osc.stop(now + durSec);
        break;
      }

      // EARCON: floor_want (wants the floor: rising 2-note chime C5 -> G5)
      case 'floor_want': {
        durationMs = 200;
        const notes = [523.25, 783.99]; // C5, G5
        notes.forEach((freq, idx) => {
          const tStart = now + idx * 0.09;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * pitchFactor, tStart);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, tStart);
          env.gain.linearRampToValueAtTime(0.18, tStart + 0.015);
          env.gain.exponentialRampToValueAtTime(0.001, tStart + 0.08);

          osc.connect(env);
          env.connect(masterGain);

          osc.start(tStart);
          osc.stop(tStart + 0.085);
        });
        break;
      }

      // EARCON: floor_yield (yields floor: soft click + falling resolving note E5 -> A4)
      case 'floor_yield': {
        durationMs = 240;
        // Subtle click
        const noise = ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(ctx, 0.02);
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2500, now);
        const nEnv = ctx.createGain();
        nEnv.gain.setValueAtTime(0.15, now);
        nEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        noise.connect(filter);
        filter.connect(nEnv);
        nEnv.connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.02);

        // Falling note
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25 * pitchFactor, now + 0.02);
        osc.frequency.exponentialRampToValueAtTime(440.0 * pitchFactor, now + 0.22);
        const env = ctx.createGain();
        env.gain.setValueAtTime(0.001, now + 0.02);
        env.gain.linearRampToValueAtTime(0.15, now + 0.04);
        env.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(env);
        env.connect(masterGain);
        osc.start(now + 0.02);
        osc.stop(now + 0.23);
        break;
      }

      // EARCON: floor_ack (acknowledged: two quiet pips)
      case 'floor_ack': {
        durationMs = 140;
        for (let i = 0; i < 2; i++) {
          const tStart = now + i * 0.06;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880 * pitchFactor, tStart);

          const env = ctx.createGain();
          env.gain.setValueAtTime(0.001, tStart);
          env.gain.linearRampToValueAtTime(0.12, tStart + 0.01);
          env.gain.exponentialRampToValueAtTime(0.001, tStart + 0.045);

          osc.connect(env);
          env.connect(masterGain);

          osc.start(tStart);
          osc.stop(tStart + 0.05);
        }
        break;
      }

      default:
        durationMs = 100;
        break;
    }

    const promise = new Promise<void>((resolve) => {
      setTimeout(resolve, durationMs);
    });

    return { durationMs, promise };
  }
}

// -------------------------------------------------------------
// WEBAUDIO SAMPLER (WAV/MP3 Asset Support)
// -------------------------------------------------------------

class WebAudioSamplerBank {
  private ctx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();

  constructor(private getContextFn: () => AudioContext | null) {}

  async loadSample(tag: string, lvl: number, take: number, url: string): Promise<void> {
    const ctx = this.getContextFn();
    if (!ctx) return;

    const key = `${tag}:${lvl}:${take}`;
    if (this.buffers.has(key)) return;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(key, audioBuffer);
    } catch (e) {
      console.warn(`[ECHOS] Failed to load sample ${key} from ${url}:`, e);
    }
  }

  hasSample(tag: string, lvl: number, take: number): boolean {
    return this.buffers.has(`${tag}:${lvl}:${take}`);
  }

  playSampleTake(
    tag: string,
    lvl: number,
    take: number,
    cents: number,
    db: number,
    whenTime?: number
  ): { durationMs: number; promise: Promise<void> } {
    const ctx = this.getContextFn();
    const key = `${tag}:${lvl}:${take}`;
    const buffer = this.buffers.get(key);

    if (!ctx || !buffer) {
      return { durationMs: 0, promise: Promise.resolve() };
    }

    const now = whenTime !== undefined 
      ? Math.max(ctx.currentTime, whenTime) 
      : ctx.currentTime + getTemporalJitterSec(8, 25);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const pitchFactor = Math.pow(2, cents / 1200);
    source.playbackRate.setValueAtTime(pitchFactor, now);

    const gainNode = ctx.createGain();
    const gainScale = Math.pow(10, db / 20);
    gainNode.gain.setValueAtTime(gainScale, now);

    source.connect(gainNode);
    gainNode.connect(spatialAcoustic.getBackgroundInputNode());

    source.start(now);

    const durationMs = (buffer.duration / pitchFactor) * 1000;
    const promise = new Promise<void>((resolve) => {
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
        resolve();
      };
    });

    return { durationMs, promise };
  }
}

// -------------------------------------------------------------
// ECHOS CLIENT / PERFORMER
// -------------------------------------------------------------

export class EchosClient {
  private synthBank = new WebAudioSynthBank();
  private samplerBank = new WebAudioSamplerBank(() => this.synthBank.getContext());
  private listeners: Array<(state: EchosState) => void> = [];
  private eventListeners: Array<(event: EchosEvent) => void> = [];
  private eventLog: EchosEvent[] = [];
  private activeBreathUntil: number = 0;

  private respiratoryConfig: EchosRespiratoryConfig = {
    enabled: true,
    intensity: 75,
    frequency: 70,
  };

  state: EchosState = {
    mood: 'neutral',
    hue: 215,
    level: 2,
    speaking: false,
    sessionActive: false,
    rr: {},
  };

  private idleTimer: any = null;
  private readonly IDLE_THRESHOLD_MS = 30000;

  constructor() {
    this.loadPersistentRR();
    this.loadPersistentRespiratoryConfig();
    if (typeof window !== 'undefined') {
      (window as any).MythosEchos = this;
    }
  }

  private loadPersistentRespiratoryConfig(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem('echos_respiratory_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.respiratoryConfig = {
            enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
            intensity: typeof parsed.intensity === 'number' ? Math.max(0, Math.min(100, parsed.intensity)) : 75,
            frequency: typeof parsed.frequency === 'number' ? Math.max(0, Math.min(100, parsed.frequency)) : 70,
          };
        }
      }
    } catch (e) {
      console.warn('[ECHOS] Could not load persistent respiratory config:', e);
    }
  }

  public getRespiratoryConfig(): EchosRespiratoryConfig {
    return { ...this.respiratoryConfig };
  }

  public setRespiratoryConfig(partial: Partial<EchosRespiratoryConfig>): void {
    this.respiratoryConfig = {
      ...this.respiratoryConfig,
      ...partial,
      intensity: partial.intensity !== undefined ? Math.max(0, Math.min(100, partial.intensity)) : this.respiratoryConfig.intensity,
      frequency: partial.frequency !== undefined ? Math.max(0, Math.min(100, partial.frequency)) : this.respiratoryConfig.frequency,
    };
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('echos_respiratory_config', JSON.stringify(this.respiratoryConfig));
      } catch (e) {
        console.warn('[ECHOS] Could not save persistent respiratory config:', e);
      }
    }
  }

  private loadPersistentRR(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem('echos_rr_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.state.rr = { ...parsed };
        }
      }
    } catch (e) {
      console.warn('[ECHOS] Could not load persistent RR state:', e);
    }
  }

  public savePersistentRR(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('echos_rr_state', JSON.stringify(this.state.rr));
    } catch (e) {
      console.warn('[ECHOS] Could not save persistent RR state:', e);
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.state.sessionActive && !this.state.speaking) {
      this.startIdleTimer();
    }
  }

  private startIdleTimer(): void {
    if (this.idleTimer) return;
    this.idleTimer = setTimeout(() => {
      if (this.state.sessionActive && !this.state.speaking) {
        if (this.respiratoryConfig.enabled && this.respiratoryConfig.intensity > 0) {
          const intensityDbBoost = (this.respiratoryConfig.intensity - 75) * 0.28;
          const idleDb = Math.max(-45, Math.min(-12, -16 + intensityDbBoost));
          this.play('breath', 1, { db: idleDb });
        }
        this.idleTimer = null;
        this.startIdleTimer();
      }
    }, this.IDLE_THRESHOLD_MS);
  }

  async arm(): Promise<void> {
    const ctx = this.synthBank.getContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
  }

  async loadSample(tag: string, lvl: number, take: number, url: string): Promise<void> {
    await this.samplerBank.loadSample(tag, lvl, take, url);
  }

  /**
   * Load a library of samples from a manifest object
   * Format: { "hum:1:1": "/path/to/hum1.mp3", ... }
   */
  async loadLibrary(manifest: Record<string, string>): Promise<void> {
    const jobs = Object.entries(manifest).map(([key, url]) => {
      const [tag, lvl, take] = key.split(':');
      return this.loadSample(tag, parseInt(lvl, 10), parseInt(take, 10), url);
    });
    await Promise.all(jobs);
  }

  onState(fn: (state: EchosState) => void): () => void {
    this.listeners.push(fn);
    fn(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  onEvent(fn: (event: EchosEvent) => void): () => void {
    this.eventListeners.push(fn);
    return () => {
      this.eventListeners = this.eventListeners.filter(l => l !== fn);
    };
  }

  setState(partial: Partial<EchosState>): void {
    const oldSpeaking = this.state.speaking;
    const oldSession = this.state.sessionActive;
    
    this.state = { ...this.state, ...partial };
    
    if (partial.rr) {
      this.savePersistentRR();
    }

    if (partial.mood && ECHOS_MOODS[partial.mood]) {
      this.state.hue = ECHOS_MOODS[partial.mood].hue;
    }
    
    if (this.state.speaking !== oldSpeaking || this.state.sessionActive !== oldSession) {
      this.resetIdleTimer();
    }
    
    this.listeners.forEach(fn => fn(this.state));
  }

  private emitEvent(ev: EchosEvent): void {
    this.eventLog.push(ev);
    if (this.eventLog.length > 400) this.eventLog.shift();
    this.eventListeners.forEach(fn => fn(ev));
  }

  /**
   * Returns current WebAudio AudioContext.currentTime for sample-accurate timeline scheduling.
   */
  getAudioContextTime(): number {
    const ctx = this.synthBank.getContext();
    return ctx ? ctx.currentTime : 0;
  }

  /**
   * Play a single nonverbal sound or earcon with optional sample-accurate AudioContext scheduling timestamp.
   */
  async play(
    tag: EchosTag, 
    lvl: number = 2, 
    opts?: { cents?: number; db?: number; mode?: 'gap' | 'under' | 'offset'; take?: number; when?: number }
  ): Promise<number> {
    await this.arm();
    const clampedLvl = Math.max(1, Math.min(3, lvl));
    const mode = opts?.mode ?? 'gap';
    const whenTime = opts?.when;

    // SYNC-CHECK: For gap fillers and breaths, verify that TTS isn't currently speaking to prevent clipping/overlap
    if ((mode === 'gap' || tag === 'breath' || tag === 'exhale') && whenTime === undefined) {
      const maxRetries = 6; // Check for up to 300ms
      let retries = 0;
      while (retries < maxRetries) {
        const power = this.synthBank.getTTSPower();
        if (power < 0.008) break; // Silence threshold
        
        // TTS is active, wait for a natural gap
        await new Promise(r => setTimeout(r, 50));
        retries++;
      }
      
      // If still not silent after retries, skip this filler to maintain clean speech
      if (retries === maxRetries) {
        return 0;
      }
    }

    const rrKey = `${tag}:${clampedLvl}`;
    const lastTake = this.state.rr[rrKey];
    const take = opts?.take ?? pickTake(tag, clampedLvl, lastTake);
    this.state.rr[rrKey] = take;
    this.savePersistentRR();

    const jitter = computeJitter();
    const cents = opts?.cents ?? jitter.cents;
    const db = opts?.db ?? jitter.db;

    this.setState({ lastTag: tag, level: clampedLvl });
    this.resetIdleTimer();

    let result: { durationMs: number; promise: Promise<void> };
    let src: 'sample' | 'synth' = 'synth';

    if (this.samplerBank.hasSample(tag, clampedLvl, take)) {
      result = this.samplerBank.playSampleTake(tag, clampedLvl, take, cents, db, whenTime);
      src = 'sample';
    } else {
      result = this.synthBank.playSynthTake(tag, clampedLvl, take, cents, db, whenTime);
      src = 'synth';
    }

    const scheduledOffsetMs = whenTime !== undefined ? Math.max(0, (whenTime - this.getAudioContextTime()) * 1000) : 0;

    if (['breath', 'exhale', 'gasp', 'sigh'].includes(tag)) {
      this.activeBreathUntil = Math.max(this.activeBreathUntil, Date.now() + scheduledOffsetMs + result.durationMs);
    }

    if (mode === 'under' && result.durationMs > 0) {
      this.duckAssistant(result.durationMs, -12, whenTime);
    }

    this.emitEvent({
      tag,
      take,
      lvl: clampedLvl,
      t: Date.now() + scheduledOffsetMs,
      ev: 'sfx',
      src,
      cents,
      db,
      mode,
      off: scheduledOffsetMs,
      out: 'audio',
      ms: result.durationMs,
    });

    await result.promise;
    return result.durationMs;
  }

  /**
   * Schedules an entire ECHOS plan on the hardware AudioContext.currentTime timeline.
   */
  async schedulePlan(plan: EchosPlan, startAudioContextTime?: number): Promise<void> {
    await this.arm();
    const ctx = this.synthBank.getContext();
    if (!ctx || !plan.items || plan.items.length === 0) return;

    const baseTime = startAudioContextTime !== undefined ? startAudioContextTime : ctx.currentTime;

    for (const item of plan.items) {
      const itemTemporalJitterSec = getTemporalJitterSec(8, 28);
      const scheduledTime = baseTime + (item.offsetMs / 1000) + itemTemporalJitterSec;
      this.play(item.tag, item.lvl, {
        take: item.take,
        cents: item.cents,
        db: item.db,
        mode: item.mode,
        when: scheduledTime,
      }).catch(err => console.warn('Schedule plan item error:', err));
    }
  }

  /**
   * Returns current RMS power level of the TTS channel (0 to 1).
   */
  getTTSPower(): number {
    return this.synthBank.getTTSPower();
  }

  /**
   * Returns detailed status of the ECHOS engine breath-buffer.
   */
  getBreathBufferStatus(): { active: boolean; remainingMs: number } {
    const remaining = Math.max(0, this.activeBreathUntil - Date.now());
    return {
      active: remaining > 0,
      remainingMs: remaining,
    };
  }

  /**
   * Hook/helper to check if the breath buffer is actively playing or decaying.
   */
  checkBreathBufferStatus(): boolean {
    return this.getBreathBufferStatus().active;
  }

  /**
   * Async wait hook that delays execution until any active breath buffer completes,
   * ensuring breath injections do not clash with synthesized word audio.
   */
  async waitForBreathBuffer(maxWaitMs: number = 600): Promise<boolean> {
    const startTime = Date.now();
    while (this.checkBreathBufferStatus()) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) return false;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    return true;
  }

  /**
   * Connect an external audio element (like the Assistant TTS) to the ECHOS engine.
   * This allows the engine to duck the assistant volume when fillers play.
   */
  connectAssistantAudio(element: HTMLMediaElement): void {
    this.synthBank.connectAssistantAudio(element);
  }

  /**
   * Manually trigger a ducking event on the Assistant TTS channel.
   */
  duckAssistant(durationMs: number, targetDb: number = -12, whenTime?: number): void {
    const gain = this.synthBank.getTTSGain();
    const ctx = this.synthBank.getContext();
    if (!gain || !ctx) return;

    const now = whenTime !== undefined ? Math.max(ctx.currentTime, whenTime) : ctx.currentTime;
    const targetGain = Math.pow(10, targetDb / 20);
    
    // Smooth ramp down
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.exponentialRampToValueAtTime(targetGain, now + 0.1);
    
    // Smooth ramp back up
    const recoveryStart = now + (durationMs / 1000) - 0.15;
    gain.gain.exponentialRampToValueAtTime(targetGain, Math.max(now + 0.11, recoveryStart));
    gain.gain.exponentialRampToValueAtTime(1.0, Math.max(now + 0.12, recoveryStart + 0.2));

    // Dynamic Sub-band vocal formant notch ducking for frequency clarity
    spatialAcoustic.triggerFormantDucking(durationMs, -14, now);
  }

  /**
   * Create an execution plan for a text line containing ECHOS tags
   */
  plan(line: string): EchosPlan {
    const parsed = parseEchosLine(line);
    const items: EchosSoundPlanItem[] = [];

    let currentMood = this.state.mood;
    const msPerChar = 72; // Average timing for speech synthesis
    let currentOffsetMs = 0;

    parsed.chunks.forEach((chunk, chunkIdx) => {
      if (chunk.type === 'text') {
        const text = chunk.text;
        
        // Scan for long pauses (ellipsis or multiple periods)
        const ellipsisRegex = /\.{2,}/g;
        let match: RegExpExecArray | null;
        while ((match = ellipsisRegex.exec(text)) !== null) {
          // Respiratory frequency & enabled check
          const shouldTriggerPauseExhale = this.respiratoryConfig.enabled && 
            this.respiratoryConfig.frequency > 0 && 
            this.respiratoryConfig.intensity > 0 &&
            (Math.random() <= (this.respiratoryConfig.frequency / 100) * 0.75);

          if (shouldTriggerPauseExhale) {
            const pauseOffset = currentOffsetMs + (match.index * msPerChar);
            const take = pickTake('exhale', 1, this.state.rr['exhale:1']);
            this.state.rr['exhale:1'] = take;
            this.savePersistentRR();
            const jitter = computeJitter();
            const intensityDbBoost = (this.respiratoryConfig.intensity - 75) * 0.28;
            const db = Math.max(-45, Math.min(-10, -20 + (Math.random() * 4) + intensityDbBoost));

            items.push({
              tag: 'exhale',
              lvl: 1,
              take,
              cents: jitter.cents,
              db: Math.round(db * 10) / 10,
              mode: 'offset',
              offsetMs: Math.max(0, Math.round(pauseOffset + 50)),
              durationMs: 600,
              chunkIndex: chunkIdx,
            });
          }
        }
        
        currentOffsetMs += text.length * msPerChar;
      } else if (chunk.type === 'sound') {
        const rrKey = `${chunk.tag}:${chunk.lvl}`;
        const lastTake = this.state.rr[rrKey];
        const take = pickTake(chunk.tag, chunk.lvl, lastTake);
        this.state.rr[rrKey] = take;
        this.savePersistentRR();

        const jitter = computeJitter();

        // Check if tag maps to a mood
        const aliasEntry = Object.values(ECHOS_ALIASES).find(a => a.tag === chunk.tag);
        if (aliasEntry) {
          currentMood = aliasEntry.mood;
        }

        // Use explicit offset if provided, otherwise estimate from current character position
        const itemOffset = chunk.offsetMs !== 0 ? chunk.offsetMs : currentOffsetMs;

        let durationMs = 350;
        const tag = chunk.tag;
        const lvl = chunk.lvl;
        if (tag === 'sigh') durationMs = lvl === 1 ? 450 : lvl === 3 ? 850 : 650;
        else if (tag === 'breath') durationMs = lvl === 1 ? 220 : lvl === 3 ? 420 : 320;
        else if (tag === 'exhale') durationMs = lvl === 1 ? 400 : lvl === 3 ? 800 : 600;
        else if (tag === 'gasp') durationMs = 180;
        else if (tag === 'chirp') durationMs = 120;
        else if (tag === 'laugh') durationMs = 420;
        else if (tag === 'purr') durationMs = 500;
        else if (tag === 'click') durationMs = 40;
        else if (tag === 'tsk') durationMs = 120;
        else if (tag === 'groan') durationMs = 380;
        else if (tag === 'moan') durationMs = 450;
        else if (tag === 'buzz') durationMs = 280;
        else if (tag === 'floor_want') durationMs = 200;
        else if (tag === 'floor_yield') durationMs = 240;
        else if (tag === 'floor_ack') durationMs = 140;

        items.push({
          tag: chunk.tag,
          lvl: chunk.lvl,
          take,
          cents: jitter.cents,
          db: jitter.db,
          mode: chunk.under ? 'under' : chunk.offsetMs !== 0 ? 'offset' : 'gap',
          offsetMs: itemOffset,
          durationMs,
          chunkIndex: chunkIdx,
        });
      }
    });

    // Respiratory Cycle: automatic onset intake breath & completion exhale for long responses
    const isRespiratoryActive = this.respiratoryConfig.enabled && 
      this.respiratoryConfig.frequency > 0 && 
      this.respiratoryConfig.intensity > 0;

    if (isRespiratoryActive) {
      // Dynamic sensitivity thresholds scaled by user frequency:
      // at 100% frequency -> triggers on >= 20 chars or >= 1800ms
      // at 70% frequency (default) -> triggers on >= 48 chars or >= 3400ms
      // at 25% frequency -> triggers on >= 90 chars or >= 6000ms
      const minChars = Math.max(15, Math.round(115 - (this.respiratoryConfig.frequency * 0.95)));
      const minDurationMs = Math.max(1200, Math.round(7200 - (this.respiratoryConfig.frequency * 52)));
      const isLongResponse = parsed.spoken.length >= minChars || currentOffsetMs >= minDurationMs;
      const freqProbability = Math.min(1.0, 0.35 + (this.respiratoryConfig.frequency / 100) * 0.65);

      if (isLongResponse && Math.random() <= freqProbability) {
        const intensityDbBoost = (this.respiratoryConfig.intensity - 75) * 0.28;

        // 1. Onset Intake Breath: trigger if no explicit sound tag at start
        const hasStartBreath = items.some(it => it.offsetMs <= 250 && ['breath', 'gasp', 'hum'].includes(it.tag));
        if (!hasStartBreath) {
          const onsetTag: EchosVoiceTag = Math.random() > 0.25 ? 'breath' : 'gasp';
          const rrKey = `${onsetTag}:1`;
          const lastTake = this.state.rr[rrKey];
          const take = pickTake(onsetTag, 1, lastTake);
          this.state.rr[rrKey] = take;
          this.savePersistentRR();

          const jitter = computeJitter();
          const baseOnsetDb = -19 - Math.random() * 5; // -19dB to -24dB baseline
          const onsetDb = Math.max(-48, Math.min(-10, baseOnsetDb + intensityDbBoost));

          items.unshift({
            tag: onsetTag,
            lvl: 1,
            take,
            cents: jitter.cents,
            db: Math.round(onsetDb * 10) / 10,
            mode: 'offset',
            offsetMs: 0,
            durationMs: onsetTag === 'breath' ? 220 : 180,
            chunkIndex: -1,
          });
        }

        // 2. Completion Exhale: trigger if no explicit trailing sound tag near end
        const hasEndExhale = items.some(it => it.offsetMs >= currentOffsetMs - 400 && ['exhale', 'sigh', 'breath'].includes(it.tag));
        if (!hasEndExhale) {
          const completionTag: EchosVoiceTag = Math.random() > 0.3 ? 'exhale' : 'sigh';
          const rrKey = `${completionTag}:1`;
          const lastTake = this.state.rr[rrKey];
          const take = pickTake(completionTag, 1, lastTake);
          this.state.rr[rrKey] = take;
          this.savePersistentRR();

          const jitter = computeJitter();
          const baseCompletionDb = -21 - Math.random() * 5; // -21dB to -26dB baseline
          const completionDb = Math.max(-50, Math.min(-12, baseCompletionDb + intensityDbBoost));

          items.push({
            tag: completionTag,
            lvl: 1,
            take,
            cents: jitter.cents,
            db: Math.round(completionDb * 10) / 10,
            mode: 'offset',
            offsetMs: Math.max(0, Math.round(currentOffsetMs + 60)),
            durationMs: completionTag === 'exhale' ? 400 : 450,
            chunkIndex: 999,
          });
        }
      }
    }

    // Ensure items are ordered chronologically by timeline offset
    items.sort((a, b) => a.offsetMs - b.offsetMs);

    const hue = ECHOS_MOODS[currentMood]?.hue ?? 215;

    return {
      v: 1,
      spoken: parsed.spoken,
      items,
      mood: currentMood,
      hue,
    };
  }

  getLog(): EchosEvent[] {
    return [...this.eventLog];
  }

  exportJsonl(): string {
    return this.eventLog.map(e => JSON.stringify(e)).join('\n');
  }
}

// Singleton export
export const echos = new EchosClient();
