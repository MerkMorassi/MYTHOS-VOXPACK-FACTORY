import { Pace, PauseTier, Articulation } from '../../types';
import { MoodOption, findMoodByTag, EXHAUSTIVE_MOODS } from '../moodStore';

export interface PaceVector {
  effectiveRate: number;     // Final smoothed rate multiplier for TTS (0.6 - 1.8)
  targetRate: number;        // Raw target rate multiplier before inertia smoothing
  momentumFactor: number;    // Conversational momentum component (0.5 - 2.0)
  prosodyRateMod: number;    // Prosody/mood component (0.5 - 2.0)
  syntacticMod: number;      // Text syntax/punctuation component (0.8 - 1.3)
  pitchMod: number;          // Associated pitch modulation factor (0.7 - 1.4)
  pauseTier: PauseTier;      // Recommended pause duration ('short' | 'normal' | 'marked' | 'long')
  articulation: Articulation;// Recommended articulation ('legato' | 'neutral' | 'staccato')
  smoothingAlpha: number;   // Inertia factor used (0.1 = heavy smoothing, 1.0 = instant jump)
  timestamp: number;
}

export interface PaceCalculationInput {
  momentum?: number;         // Conversational momentum (default 1.0)
  prosodyTag?: string;       // Active prosody tag (e.g. 'thoughtful', 'urgent', 'playful')
  mood?: MoodOption;         // Active MoodOption object
  text?: string;             // Spoken dialogue text for syntactic pacing analysis
  baseRate?: number;         // Voice profile base rate (default 1.0)
  mode?: 'off-stage' | 'on-stage'; // Performance state
  instantTransition?: boolean;     // Skip inertia smoothing for dramatic resets
}

export interface PaceHistoryEntry {
  vector: PaceVector;
  textSnippet?: string;
  tagUsed?: string;
  timestamp: number;
}

/**
 * Known prosody rate modifiers mapping tag names to rate and pause characteristics
 */
const PROSODY_RATE_MAP: Record<string, { rateMod: number; pause: PauseTier; articulation: Articulation; pitchMod: number }> = {
  urgent: { rateMod: 1.35, pause: 'short', articulation: 'staccato', pitchMod: 1.15 },
  panicked: { rateMod: 1.40, pause: 'short', articulation: 'staccato', pitchMod: 1.25 },
  terrified: { rateMod: 1.30, pause: 'short', articulation: 'staccato', pitchMod: 1.20 },
  playful: { rateMod: 1.18, pause: 'marked', articulation: 'neutral', pitchMod: 1.10 },
  giddy: { rateMod: 1.25, pause: 'short', articulation: 'neutral', pitchMod: 1.20 },
  ecstatic: { rateMod: 1.30, pause: 'short', articulation: 'neutral', pitchMod: 1.25 },
  cheeky: { rateMod: 1.15, pause: 'normal', articulation: 'staccato', pitchMod: 1.08 },
  thoughtful: { rateMod: 0.82, pause: 'marked', articulation: 'legato', pitchMod: 0.92 },
  hesitant: { rateMod: 0.85, pause: 'long', articulation: 'neutral', pitchMod: 0.95 },
  reflective: { rateMod: 0.85, pause: 'long', articulation: 'neutral', pitchMod: 0.90 },
  wistful: { rateMod: 0.88, pause: 'normal', articulation: 'legato', pitchMod: 0.92 },
  melancholy: { rateMod: 0.82, pause: 'long', articulation: 'legato', pitchMod: 0.88 },
  sultry: { rateMod: 0.78, pause: 'normal', articulation: 'legato', pitchMod: 0.85 },
  drowsy: { rateMod: 0.75, pause: 'long', articulation: 'legato', pitchMod: 0.82 },
  serene: { rateMod: 0.85, pause: 'long', articulation: 'legato', pitchMod: 0.90 },
  soothing: { rateMod: 0.88, pause: 'normal', articulation: 'legato', pitchMod: 0.92 },
  commanding: { rateMod: 0.92, pause: 'marked', articulation: 'staccato', pitchMod: 0.90 },
  stern: { rateMod: 0.88, pause: 'normal', articulation: 'staccato', pitchMod: 0.88 },
  icy: { rateMod: 0.82, pause: 'long', articulation: 'staccato', pitchMod: 0.85 },
  sarcastic: { rateMod: 0.88, pause: 'normal', articulation: 'legato', pitchMod: 0.95 },
  earnest: { rateMod: 0.95, pause: 'normal', articulation: 'legato', pitchMod: 1.0 },
};

export class PaceEngine {
  private currentVector: PaceVector;
  private history: PaceHistoryEntry[] = [];
  private readonly DEFAULT_SMOOTHING_ALPHA = 0.45; // Smooth exponential moving average weight

  constructor() {
    this.currentVector = this.createBaselineVector();
  }

  private createBaselineVector(): PaceVector {
    return {
      effectiveRate: 1.0,
      targetRate: 1.0,
      momentumFactor: 1.0,
      prosodyRateMod: 1.0,
      syntacticMod: 1.0,
      pitchMod: 1.0,
      pauseTier: 'normal',
      articulation: 'neutral',
      smoothingAlpha: 1.0,
      timestamp: Date.now(),
    };
  }

  /**
   * Scans dialogue text for syntactic and punctuation cues that modulate pacing.
   */
  public analyzeTextSyntacticPacing(text?: string): { rateMod: number; pause: PauseTier; articulation: Articulation } {
    if (!text || text.trim().length === 0) {
      return { rateMod: 1.0, pause: 'normal', articulation: 'neutral' };
    }

    const clean = text.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    let rateMod = 1.0;
    let pause: PauseTier = 'normal';
    let articulation: Articulation = 'neutral';

    // Ellipses or long dashes signal deliberate hesitation / thoughtful pauses
    const hasEllipsis = /\.{2,}|—/.test(clean);
    if (hasEllipsis) {
      rateMod -= 0.12;
      pause = 'long';
    }

    // Short exclamation chains signal high-energy rapid delivery
    const exclamationCount = (clean.match(/!/g) || []).length;
    if (exclamationCount > 0) {
      rateMod += Math.min(0.18, exclamationCount * 0.08);
      if (wordCount < 6) {
        articulation = 'staccato';
        pause = 'short';
      }
    }

    // Question chains boost curiosity/momentum
    const questionCount = (clean.match(/\?/g) || []).length;
    if (questionCount > 0) {
      rateMod += Math.min(0.10, questionCount * 0.05);
    }

    // Long multi-clause sentences transition to smoother legato flow
    if (wordCount > 18) {
      rateMod -= 0.05;
      articulation = 'legato';
    } else if (wordCount < 4 && !hasEllipsis) {
      // Very short punchy turns
      rateMod += 0.08;
    }

    // Clamp syntactic rate modifier
    rateMod = Math.max(0.75, Math.min(1.25, rateMod));

    return { rateMod, pause, articulation };
  }

  /**
   * Calculate a complete PaceVector given current momentum, prosody, and text context.
   */
  public calculatePaceVector(input: PaceCalculationInput): PaceVector {
    const momentum = typeof input.momentum === 'number' && !isNaN(input.momentum)
      ? Math.max(0.5, Math.min(2.0, input.momentum))
      : 1.0;

    const baseRate = typeof input.baseRate === 'number' && !isNaN(input.baseRate)
      ? input.baseRate
      : 1.0;

    // 1. Extract prosody characteristics
    let prosodyRateMod = 1.0;
    let prosodyPitchMod = 1.0;
    let prosodyPause: PauseTier = 'normal';
    let prosodyArticulation: Articulation = 'neutral';

    let activeMood: MoodOption | undefined = input.mood;
    if (!activeMood && input.prosodyTag) {
      activeMood = findMoodByTag(input.prosodyTag);
    }

    if (activeMood) {
      prosodyRateMod = activeMood.rateMod ?? activeMood.pace?.rate ?? 1.0;
      prosodyPitchMod = activeMood.pitchMod ?? 1.0;
      prosodyPause = activeMood.pace?.pause ?? 'normal';
      prosodyArticulation = activeMood.pace?.articulation ?? 'neutral';
    } else if (input.prosodyTag && PROSODY_RATE_MAP[input.prosodyTag.toLowerCase()]) {
      const preset = PROSODY_RATE_MAP[input.prosodyTag.toLowerCase()];
      prosodyRateMod = preset.rateMod;
      prosodyPitchMod = preset.pitchMod;
      prosodyPause = preset.pause;
      prosodyArticulation = preset.articulation;
    }

    // 2. Extract syntactic text characteristics
    const syntactic = this.analyzeTextSyntacticPacing(input.text);

    // 3. Compute raw un-smoothed target rate
    // Target Rate = baseRate * momentum ^ 0.5 * prosodyRateMod * syntacticMod
    const momentumComponent = Math.pow(momentum, 0.55);
    const targetRate = Number((baseRate * momentumComponent * prosodyRateMod * syntactic.rateMod).toFixed(3));

    // Clamped target rate within human natural range (0.6x to 1.8x)
    const clampedTargetRate = Math.max(0.60, Math.min(1.80, targetRate));

    // 4. Determine smoothing alpha (inertia)
    // Dramatic tags (urgent, panicked, terrified, ecstatic) trigger instant transition (high alpha)
    const isDramaticTag = Boolean(
      input.prosodyTag && ['urgent', 'panicked', 'terrified', 'ecstatic', 'giddy', 'shocked'].includes(input.prosodyTag.toLowerCase())
    );

    const alpha = input.instantTransition || isDramaticTag
      ? 1.0
      : this.DEFAULT_SMOOTHING_ALPHA;

    // 5. Apply exponential smoothing to calculate effectiveRate
    const prevRate = this.currentVector.effectiveRate || 1.0;
    const effectiveRate = Number((prevRate + alpha * (clampedTargetRate - prevRate)).toFixed(3));

    // Determine effective pause tier and articulation
    const effectivePause = (prosodyPause !== 'normal' ? prosodyPause : syntactic.pause);
    const effectiveArticulation = (prosodyArticulation !== 'neutral' ? prosodyArticulation : syntactic.articulation);

    return {
      effectiveRate,
      targetRate: clampedTargetRate,
      momentumFactor: Number(momentumComponent.toFixed(3)),
      prosodyRateMod: Number(prosodyRateMod.toFixed(3)),
      syntacticMod: Number(syntactic.rateMod.toFixed(3)),
      pitchMod: Number(prosodyPitchMod.toFixed(3)),
      pauseTier: effectivePause,
      articulation: effectiveArticulation,
      smoothingAlpha: alpha,
      timestamp: Date.now(),
    };
  }

  /**
   * Updates internal PaceEngine state with new calculation input and logs transition history.
   */
  public updateState(input: PaceCalculationInput): PaceVector {
    const vector = this.calculatePaceVector(input);
    this.currentVector = vector;

    // Record in history log (keep last 50 entries)
    this.history.push({
      vector,
      textSnippet: input.text ? input.text.slice(0, 40) : undefined,
      tagUsed: input.prosodyTag || input.mood?.tag,
      timestamp: Date.now(),
    });

    if (this.history.length > 50) {
      this.history.shift();
    }

    return vector;
  }

  /**
   * Returns current active PaceVector.
   */
  public getVector(): PaceVector {
    return { ...this.currentVector };
  }

  /**
   * Returns history log of pace vector transitions.
   */
  public getHistory(): PaceHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Resets pace engine to baseline state (1.0x rate).
   */
  public reset(): void {
    this.currentVector = this.createBaselineVector();
    this.history = [];
  }
}

// Global singleton export
export const paceEngine = new PaceEngine();
export default paceEngine;
