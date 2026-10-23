// ECHOS Chip - Engine & Performer (SYS.AI.MAYA.SESAME v1.0.0)
// Paralinguistic vocal fillers, multi-take sampling, and turn-taking earcons

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

export function computeJitter(): { cents: number; db: number } {
  // Jitter: +/- 8 cents, +/- 1.0 dB gain jitter
  const cents = Math.round((Math.random() * 16 - 8) * 10) / 10;
  const db = Math.round((Math.random() * 2.0 - 1.0) * 10) / 10;
  return { cents, db };
}

// -------------------------------------------------------------
// WEBAUDIO PROCEDURAL SYNTHESIS (Zero External File Dependencies)
// -------------------------------------------------------------

class WebAudioSynthBank {
  private ctx: AudioContext | null = null;

  getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
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
    db: number
  ): { durationMs: number; promise: Promise<void> } {
    const ctx = this.getContext();
    if (!ctx) {
      return { durationMs: 250, promise: Promise.resolve() };
    }

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    const gainScale = Math.pow(10, db / 20) * (lvl === 1 ? 0.65 : lvl === 3 ? 1.25 : 0.95);
    masterGain.gain.setValueAtTime(gainScale, now);
    masterGain.connect(ctx.destination);

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
// ECHOS CLIENT / PERFORMER
// -------------------------------------------------------------

export class EchosClient {
  private synthBank = new WebAudioSynthBank();
  private listeners: Array<(state: EchosState) => void> = [];
  private eventListeners: Array<(event: EchosEvent) => void> = [];
  private eventLog: EchosEvent[] = [];

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
    if (typeof window !== 'undefined') {
      (window as any).MythosEchos = this;
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
        this.play('breath', 1, { db: -15 }); // Subtle idle breath
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
   * Play a single nonverbal sound or earcon
   */
  async play(tag: EchosTag, lvl: number = 2, opts?: { cents?: number; db?: number }): Promise<number> {
    await this.arm();
    const clampedLvl = Math.max(1, Math.min(3, lvl));
    const rrKey = `${tag}:${clampedLvl}`;
    const lastTake = this.state.rr[rrKey];
    const take = pickTake(tag, clampedLvl, lastTake);
    this.state.rr[rrKey] = take;

    const jitter = computeJitter();
    const cents = opts?.cents ?? jitter.cents;
    const db = opts?.db ?? jitter.db;

    this.setState({ lastTag: tag, level: clampedLvl });
    this.resetIdleTimer();

    const result = this.synthBank.playSynthTake(tag, clampedLvl, take, cents, db);

    this.emitEvent({
      tag,
      take,
      lvl: clampedLvl,
      t: Date.now(),
      ev: 'sfx',
      src: 'synth',
      cents,
      db,
      mode: 'gap',
      off: 0,
      out: 'audio',
      ms: result.durationMs,
    });

    await result.promise;
    return result.durationMs;
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
          // Randomized probability to inject a subtle exhale during a long pause
          if (Math.random() > 0.35) {
            const pauseOffset = currentOffsetMs + (match.index * msPerChar);
            const take = pickTake('exhale', 1, this.state.rr['exhale:1']);
            const jitter = computeJitter();
            const db = -20 + (Math.random() * 6); // Very subtle

            items.push({
              tag: 'exhale',
              lvl: 1,
              take,
              cents: jitter.cents,
              db,
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
