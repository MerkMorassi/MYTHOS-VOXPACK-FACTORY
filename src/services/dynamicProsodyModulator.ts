/**
 * Dynamic Real-Time Pitch & Speed Modulation Envelopes
 * 
 * Provides physiologically grounded prosody modulation for neural voice output:
 * - Real-time playbackRate velocity envelopes based on clause syntax, punctuation, and duration progress.
 * - Onset attack acceleration (gradual vocal onset: 0.95x -> 1.02x).
 * - Conversational momentum scaling.
 * - Terminal cadence modulation (deceleration on periods, question intonation lift on question marks).
 * - Smooth frame-by-frame interpolation to avoid acoustic clicks or pitch artifacts.
 */

import { MoodOption } from './moodStore';

export interface ProsodyEnvelopeConfig {
  enabled: boolean;
  momentum: number; // 0.6 to 1.5
  baseRate: number; // 0.8 to 1.3
  mood?: MoodOption;
  clauseText: string;
}

export interface ActiveModulationController {
  stop: () => void;
  getEffectiveRate: () => number;
}

/**
 * Calculates instantaneous velocity envelope multiplier (0.85 to 1.25)
 * based on progress ratio (0 to 1) and terminal punctuation cues.
 */
export function calculateEnvelopeMultiplier(
  progress: number,
  clauseText: string,
  momentum: number = 1.0
): number {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const trimmed = (clauseText || '').trim();
  const isQuestion = trimmed.endsWith('?');
  const isExclamation = trimmed.endsWith('!');
  const isEllipsis = /\.{2,}$/.test(trimmed) || trimmed.endsWith('—');

  let envelope = 1.0;

  // 1. Onset Phrasing Attack (0.0 to 0.15 progress):
  // Natural human vocal cords accelerate smoothly from breath into steady phonation
  if (clampedProgress < 0.15) {
    const t = clampedProgress / 0.15;
    envelope = 0.94 + 0.08 * Math.sin(t * (Math.PI / 2)); // 0.94x -> 1.02x
  }
  // 2. Core Body Phrasing (0.15 to 0.78 progress):
  // Sustains dynamic conversational momentum
  else if (clampedProgress < 0.78) {
    const momentumInfluence = (momentum - 1.0) * 0.12;
    envelope = 1.01 + momentumInfluence;
  }
  // 3. Terminal Cadence Resolution (0.78 to 1.0 progress):
  else {
    const t = (clampedProgress - 0.78) / 0.22;
    if (isQuestion) {
      // Questions sustain tempo and slightly accelerate into rising inflection
      envelope = 1.01 + 0.04 * t;
    } else if (isExclamation) {
      // Exclamations punch through with sustained velocity
      envelope = 1.03;
    } else if (isEllipsis) {
      // Trailing off: marked deceleration
      envelope = 1.0 - 0.12 * Math.sin(t * (Math.PI / 2)); // Drops to ~0.88x
    } else {
      // Declarative resolution: natural 5-7% deceleration
      envelope = 1.0 - 0.065 * Math.sin(t * (Math.PI / 2)); // Drops to ~0.935x
    }
  }

  return envelope;
}

/**
 * Attaches dynamic real-time speed and pitch modulation loop to an HTMLAudioElement.
 * Continuously evaluates current playback progress and smoothly updates audio.playbackRate.
 */
export function attachProsodyEnvelope(
  audio: HTMLAudioElement,
  config: ProsodyEnvelopeConfig
): ActiveModulationController {
  if (!config.enabled) {
    audio.playbackRate = config.baseRate * (config.momentum || 1.0);
    return {
      stop: () => {},
      getEffectiveRate: () => audio.playbackRate,
    };
  }

  let isRunning = true;
  let rafId: number | null = null;
  const baseRate = config.baseRate || 1.0;
  const momentum = config.momentum || 1.0;
  let currentTargetRate = baseRate * momentum;

  const updateLoop = () => {
    if (!isRunning || !audio || audio.paused || audio.ended) {
      return;
    }

    const duration = audio.duration;
    const currentTime = audio.currentTime;

    if (duration && !isNaN(duration) && duration > 0) {
      const progress = currentTime / duration;
      const envelopeMult = calculateEnvelopeMultiplier(progress, config.clauseText, momentum);
      const calculatedRate = baseRate * momentum * envelopeMult;

      // Clamp between 0.65x and 1.6x for vocal naturalness
      const clampedRate = Math.max(0.65, Math.min(1.6, calculatedRate));

      // Smooth lowpass slew interpolation (avoid instantaneous rate pops)
      currentTargetRate = currentTargetRate * 0.75 + clampedRate * 0.25;
      audio.playbackRate = Number(currentTargetRate.toFixed(3));
    }

    rafId = requestAnimationFrame(updateLoop);
  };

  const handlePlay = () => {
    if (isRunning) {
      rafId = requestAnimationFrame(updateLoop);
    }
  };

  const handleStop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  audio.addEventListener('play', handlePlay);
  audio.addEventListener('pause', handleStop);
  audio.addEventListener('ended', handleStop);

  // If already playing, start immediately
  if (!audio.paused) {
    rafId = requestAnimationFrame(updateLoop);
  }

  return {
    stop: () => {
      isRunning = false;
      handleStop();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handleStop);
      audio.removeEventListener('ended', handleStop);
    },
    getEffectiveRate: () => currentTargetRate,
  };
}
