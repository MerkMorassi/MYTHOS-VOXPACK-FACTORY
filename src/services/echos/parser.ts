// ECHOS Chip - Parser & Paralinguistic Route Layer
// Identifies, strips, and routes non-verbal vocalization tags ([sigh], [hum], etc.)
// ensuring only clean text is sent to the TTS service.

import {
  parseEchosLine,
  EchosParseResult,
  ParsedSoundChunk,
  ParsedTextChunk,
  EchosParsedChunk,
  echos,
  EchosTag,
} from './echosEngine';

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
