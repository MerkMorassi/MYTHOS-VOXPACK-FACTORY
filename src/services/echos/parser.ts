// ECHOS Chip - Parser & Paralinguistic Route Layer
// Identifies, strips, and routes non-verbal vocalization tags ([sigh], [hum], etc.)
// ensuring only clean text is sent to the TTS service.

import {
  parseEchosLine,
  computeJitter,
  EchosParseResult,
  ParsedSoundChunk,
  ParsedTextChunk,
  EchosParsedChunk,
  echos,
  EchosTag,
} from './echosEngine';
import { VoxLine, VoxSegment } from '../voxLineParser';

export interface ParsedChunk {
  type: 'text' | 'sound';
  text?: string;
  tag?: EchosTag;
  lvl?: number;
  offsetMs?: number;
  under?: boolean;
  rawTag?: string;
}

export interface SplitLineResult {
  spoken: string;
  cleanText: string;
  chunks: EchosParsedChunk[];
  soundChunks: ParsedSoundChunk[];
  textChunks: ParsedTextChunk[];
  unknownTags: string[];
}

export interface ParalinguisticParseResult {
  cleanDialogue: string;
  cleanText: string;
  identifiedTags: ParsedSoundChunk[];
  hasParalinguisticTags: boolean;
  chunks: EchosParsedChunk[];
}

export interface PrecalculatedBreath {
  tag: EchosTag;
  lvl: number;
  offsetMs: number;
  durationMs: number;
  mode: 'gap' | 'under' | 'offset';
  cents: number;
  db: number;
  segmentIndex: number;
  reason: 'enter_beat' | 'enter_ramp' | 'pause_tier' | 'ellipsis' | 'echos_tag';
}

export interface VoxLineBreathPlan {
  totalEstimatedDurationMs: number;
  breaths: PrecalculatedBreath[];
  cleanSpokenText: string;
}

/**
 * Splits a dialogue message into clean spoken text and discrete sound/text chunks.
 * Paralinguistic tags (e.g. [hum], [sigh:2], [floor_ack]) are parsed into sound chunks,
 * while regular words are preserved in spoken text.
 */
export function splitLineChunks(line: string): SplitLineResult {
  if (!line) {
    return {
      spoken: '',
      cleanText: '',
      chunks: [],
      soundChunks: [],
      textChunks: [],
      unknownTags: [],
    };
  }

  const result: EchosParseResult = parseEchosLine(line);
  const textChunks = result.chunks.filter((c): c is ParsedTextChunk => c.type === 'text');
  const soundChunks = result.chunks.filter((c): c is ParsedSoundChunk => c.type === 'sound');

  return {
    spoken: result.spoken,
    cleanText: result.spoken,
    chunks: result.chunks,
    soundChunks,
    textChunks,
    unknownTags: result.unknown,
  };
}

/**
 * Identifies all non-verbal vocalization tags ([sigh], [hum], [gasp], [laugh], etc.)
 * embedded within a message string.
 */
export function identifyParalinguisticTags(message: string): ParsedSoundChunk[] {
  return splitLineChunks(message).soundChunks;
}

/**
 * Strips all paralinguistic vocal tags (e.g. [sigh], [hum], [gasp]) from dialogue,
 * ensuring only pristine clean text is provided to the TTS engine or caption display.
 */
export function stripParalinguisticTags(dialogue: string): string {
  return splitLineChunks(dialogue).spoken;
}

/**
 * Identifies and strips paralinguistic vocal tags from dialogue, returning clean text
 * and structured sound chunks for routing.
 */
export function identifyAndStripParalinguisticTags(dialogue: string): ParalinguisticParseResult {
  const result = splitLineChunks(dialogue);
  return {
    cleanDialogue: result.spoken,
    cleanText: result.spoken,
    identifiedTags: result.soundChunks,
    hasParalinguisticTags: result.soundChunks.length > 0,
    chunks: result.chunks,
  };
}

/**
 * Routes detected non-verbal vocalization tags to the ECHOS engine state and/or triggers playback,
 * returning clean text suitable for the TTS service.
 */
export function routeNonVerbalVocalizations(
  message: string,
  playImmediately: boolean = false
): { cleanText: string; routedTags: ParsedSoundChunk[] } {
  const { spoken, soundChunks } = splitLineChunks(message);

  if (soundChunks.length > 0) {
    soundChunks.forEach((sound) => {
      echos.setState({ lastTag: sound.tag, level: sound.lvl });
      if (playImmediately) {
        echos.play(sound.tag, sound.lvl);
      }
    });
  }

  return {
    cleanText: spoken,
    routedTags: soundChunks,
  };
}

/**
 * Strips paralinguistic tags from spoken dialogue and optionally plays any detected nonverbal tags immediately.
 */
export function stripAndRouteParalinguistics(
  line: string,
  playImmediately: boolean = false
): { spokenText: string; soundChunks: ParsedSoundChunk[] } {
  const { cleanText, routedTags } = routeNonVerbalVocalizations(line, playImmediately);
  return {
    spokenText: cleanText,
    soundChunks: routedTags,
  };
}

/**
 * Prepares a message specifically for the TTS service:
 * 1. Identifies any non-verbal vocalization tags ([sigh], [hum], etc.)
 * 2. Routes them to the ECHOS engine (state tracking)
 * 3. Strips all tags so only clean text is sent to the TTS service.
 */
export function prepareMessageForTTS(
  message: string,
  routeToEngine: boolean = true
): { cleanTextForTTS: string; paralinguisticTags: ParsedSoundChunk[] } {
  if (routeToEngine) {
    const { cleanText, routedTags } = routeNonVerbalVocalizations(message, false);
    return {
      cleanTextForTTS: cleanText,
      paralinguisticTags: routedTags,
    };
  }
  return {
    cleanTextForTTS: stripParalinguisticTags(message),
    paralinguisticTags: identifyParalinguisticTags(message),
  };
}

/**
 * Pre-calculates required breath injections and paralinguistic sound offsets from VoxLine metadata
 * BEFORE synthesis starts, eliminating runtime parsing latency during on-stage performances.
 */
export function precalculateVoxLineBreaths(voxLine: VoxLine): VoxLineBreathPlan {
  if (!voxLine || !voxLine.segments || voxLine.segments.length === 0) {
    return {
      totalEstimatedDurationMs: 0,
      breaths: [],
      cleanSpokenText: '',
    };
  }

  const breaths: PrecalculatedBreath[] = [];
  let accumulatedOffsetMs = 0;
  const spokenParts: string[] = [];

  const msPerCharDefault = 72; // Average speech synthesis timing per character

  voxLine.segments.forEach((seg: VoxSegment, segIdx: number) => {
    spokenParts.push(seg.text);

    const rate = Math.max(0.5, Math.min(2.0, seg.pace?.rate || 1.0));
    const msPerChar = msPerCharDefault / rate;

    // 1. Transition gap breath injection (enter.kind)
    if (seg.enter) {
      if (seg.enter.kind === 'beat' && seg.enter.ms > 150) {
        // Inhale breath during deliberate theatrical beat transition
        const jitter = computeJitter();
        const durationMs = Math.min(280, Math.max(160, Math.round(seg.enter.ms * 0.7)));
        breaths.push({
          tag: 'breath',
          lvl: seg.intensity > 0.75 ? 2 : 1,
          offsetMs: Math.max(0, Math.round(accumulatedOffsetMs + 30)),
          durationMs,
          mode: 'gap',
          cents: jitter.cents,
          db: -14 + jitter.db,
          segmentIndex: segIdx,
          reason: 'enter_beat',
        });
      } else if (seg.enter.kind === 'ramp' && seg.enter.ms > 300) {
        // Soft exhale transition breath during emotional mood ramp
        const jitter = computeJitter();
        breaths.push({
          tag: 'exhale',
          lvl: 1,
          offsetMs: Math.max(0, Math.round(accumulatedOffsetMs + 40)),
          durationMs: 400,
          mode: 'offset',
          cents: jitter.cents,
          db: -18 + jitter.db,
          segmentIndex: segIdx,
          reason: 'enter_ramp',
        });
      }

      accumulatedOffsetMs += seg.enter.ms;
    }

    // 2. Explicit ECHOS sound attached to VoxSegment
    if (seg.echosSound) {
      const tag = (seg.echosSound.tag || 'breath') as EchosTag;
      const lvl = Math.max(1, Math.min(3, seg.echosSound.lvl || 2));
      const jitter = computeJitter();
      const soundOffset = seg.echosSound.offsetMs !== undefined
        ? seg.echosSound.offsetMs
        : accumulatedOffsetMs;

      let durationMs = 350;
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

      breaths.push({
        tag,
        lvl,
        offsetMs: Math.max(0, Math.round(soundOffset)),
        durationMs,
        mode: seg.echosSound.under ? 'under' : 'gap',
        cents: jitter.cents,
        db: jitter.db,
        segmentIndex: segIdx,
        reason: 'echos_tag',
      });
    }

    // 3. Scan segment text for syntactic pause cues (ellipses / long dashes)
    const text = seg.text;
    const ellipsisRegex = /\.{2,}|—/g;
    let match: RegExpExecArray | null;
    while ((match = ellipsisRegex.exec(text)) !== null) {
      const relativeOffsetMs = match.index * msPerChar;
      const absoluteOffsetMs = accumulatedOffsetMs + relativeOffsetMs;
      const jitter = computeJitter();

      breaths.push({
        tag: 'exhale',
        lvl: 1,
        offsetMs: Math.max(0, Math.round(absoluteOffsetMs + 40)),
        durationMs: 450,
        mode: 'offset',
        cents: jitter.cents,
        db: -18 + jitter.db,
        segmentIndex: segIdx,
        reason: 'ellipsis',
      });
    }

    // 4. Pause tier breath gap for 'long' or 'marked' pause tiers on clause boundaries
    if (seg.pace?.pause === 'long' || seg.pace?.pause === 'marked') {
      const clauseRegex = /[,;:!?]/g;
      let clauseMatch: RegExpExecArray | null;
      while ((clauseMatch = clauseRegex.exec(text)) !== null) {
        if (Math.random() > 0.4) {
          const relMs = clauseMatch.index * msPerChar;
          const absMs = accumulatedOffsetMs + relMs;
          const jitter = computeJitter();

          breaths.push({
            tag: 'breath',
            lvl: 1,
            offsetMs: Math.max(0, Math.round(absMs + 30)),
            durationMs: seg.pace.pause === 'long' ? 320 : 220,
            mode: 'gap',
            cents: jitter.cents,
            db: -16 + jitter.db,
            segmentIndex: segIdx,
            reason: 'pause_tier',
          });
        }
      }
    }

    // Accumulate estimated speech duration of this segment
    const segmentSpeechDuration = text.length * msPerChar;
    accumulatedOffsetMs += segmentSpeechDuration;
  });

  // Sort breaths chronologically by offset
  breaths.sort((a, b) => a.offsetMs - b.offsetMs);

  return {
    totalEstimatedDurationMs: Math.round(accumulatedOffsetMs),
    breaths,
    cleanSpokenText: spokenParts.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

/**
 * Pre-calculates and schedules breath injections for a VoxLine, returning a cancellation cleanup function.
 */
export function executeVoxLineBreathPlan(
  plan: VoxLineBreathPlan,
  activeSessionIdCheck?: () => boolean
): () => void {
  if (!plan || plan.breaths.length === 0) {
    return () => {};
  }

  const timers: Array<ReturnType<typeof setTimeout>> = [];

  plan.breaths.forEach((breath) => {
    const timer = setTimeout(() => {
      if (activeSessionIdCheck && !activeSessionIdCheck()) {
        return;
      }
      echos.play(breath.tag, breath.lvl, {
        cents: breath.cents,
        db: breath.db,
        mode: breath.mode,
      });
    }, breath.offsetMs);

    timers.push(timer);
  });

  return () => {
    timers.forEach((t) => clearTimeout(t));
  };
}

/**
 * Convenience wrapper to pre-calculate and route VoxLine breaths to ECHOS engine.
 */
export function processVoxLineBreaths(voxLine: VoxLine): VoxLineBreathPlan {
  const plan = precalculateVoxLineBreaths(voxLine);
  if (plan.breaths.length > 0) {
    // Set engine state to last precalculated sound level
    const lastBreath = plan.breaths[plan.breaths.length - 1];
    echos.setState({ lastTag: lastBreath.tag, level: lastBreath.lvl });
  }
  return plan;
}
