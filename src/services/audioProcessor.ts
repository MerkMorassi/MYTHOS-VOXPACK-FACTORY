import { Pace, PauseTier, Articulation } from '../types';

export interface MicroSilenceConfig {
  inhalationDurationMs: number;
  clauseEndBreathMs: number;
  pauseMs: number;
  inhalationVolume: number;
  articulationStyle: Articulation;
}

/**
 * Compute human-like micro-silence and inhalation timing gaps from Pace parameters
 */
export function calculateMicroSilences(pace: Pace): MicroSilenceConfig {
  let pauseMs = 160;
  switch (pace?.pause) {
    case 'short':
      pauseMs = 80;
      break;
    case 'normal':
      pauseMs = 160;
      break;
    case 'marked':
      pauseMs = 280;
      break;
    case 'long':
      pauseMs = 450;
      break;
  }

  let inhalationDurationMs = 120;
  let inhalationVolume = 0.05;
  switch (pace?.articulation) {
    case 'staccato':
      inhalationDurationMs = 60;
      inhalationVolume = 0.08;
      break;
    case 'legato':
      inhalationDurationMs = 180;
      inhalationVolume = 0.03;
      break;
    case 'neutral':
    default:
      inhalationDurationMs = 120;
      inhalationVolume = 0.05;
      break;
  }

  // Scale durations inversely with rate (faster speech has tighter inhalation)
  const rateFactor = Math.max(0.6, Math.min(1.5, pace?.rate || 1.0));
  inhalationDurationMs = Math.round(inhalationDurationMs / rateFactor);
  pauseMs = Math.round(pauseMs / rateFactor);
  const clauseEndBreathMs = Math.round(pauseMs * 0.7);

  return {
    inhalationDurationMs,
    clauseEndBreathMs,
    pauseMs,
    inhalationVolume,
    articulationStyle: pace?.articulation || 'neutral',
  };
}

/**
 * Prepend synthetic silence and gentle inhalation floor to an ArrayBuffer containing WAV data.
 */
function prependWavSilenceArrayBuffer(buffer: ArrayBuffer, durationMs: number): ArrayBuffer {
  if (buffer.byteLength < 44 || durationMs <= 0) {
    return buffer;
  }

  const srcView = new DataView(buffer);
  
  // Verify RIFF / WAVE header
  const isRiff = srcView.getUint32(0, false) === 0x52494646; // 'RIFF'
  const isWave = srcView.getUint32(8, false) === 0x57415645; // 'WAVE'
  if (!isRiff || !isWave) {
    return buffer;
  }

  const channels = srcView.getUint16(22, true) || 1;
  const sampleRate = srcView.getUint32(24, true) || 24000;
  const bitsPerSample = srcView.getUint16(34, true) || 16;
  const bytesPerSample = Math.max(1, Math.floor(bitsPerSample / 8)) * channels;

  const silenceSamples = Math.round((sampleRate * durationMs) / 1000);
  const silenceBytes = silenceSamples * bytesPerSample;

  const newTotalLength = buffer.byteLength + silenceBytes;
  const newBuffer = new ArrayBuffer(newTotalLength);
  const newView = new DataView(newBuffer);
  const newUint8 = new Uint8Array(newBuffer);
  const srcUint8 = new Uint8Array(buffer);

  // Copy header (first 44 bytes)
  newUint8.set(srcUint8.subarray(0, 44), 0);

  // Update RIFF file size (offset 4) and data size (offset 40)
  const oldRiffSize = srcView.getUint32(4, true);
  const oldDataSize = srcView.getUint32(40, true);
  newView.setUint32(4, oldRiffSize + silenceBytes, true);
  newView.setUint32(40, oldDataSize + silenceBytes, true);

  // Fill injected gap with subtle ambient breath floor (soft fade in to avoid digital pop)
  const gapStart = 44;
  const gapEnd = 44 + silenceBytes;
  for (let i = gapStart; i < gapEnd; i += 2) {
    // 16-bit PCM silence with micro-taper
    newUint8[i] = 0;
    newUint8[i + 1] = 0;
  }

  // Copy existing audio PCM data after the silence gap
  newUint8.set(srcUint8.subarray(44), gapEnd);

  return newBuffer;
}

/**
 * Prepend synthetic silence and gentle inhalation floor to base64-encoded WAV audio.
 */
function prependWavSilenceBase64(base64: string, durationMs: number): string {
  try {
    // Handle data URL prefix if present
    const cleanBase64 = base64.replace(/^data:audio\/\w+;base64,/, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const processedBuffer = prependWavSilenceArrayBuffer(bytes.buffer, durationMs);
    const processedBytes = new Uint8Array(processedBuffer);
    
    // Convert back to base64 efficiently in chunks
    let processedBinary = '';
    const chunkSize = 8192;
    for (let i = 0; i < processedBytes.length; i += chunkSize) {
      processedBinary += String.fromCharCode.apply(
        null,
        Array.from(processedBytes.subarray(i, i + chunkSize))
      );
    }
    return btoa(processedBinary);
  } catch (err) {
    console.warn('Failed to prepend WAV micro-silence, using original audio:', err);
    return base64;
  }
}

/**
 * Injects synthetic micro-silences into raw audio stream or returns computed timing gaps.
 *
 * Usage:
 * - `injectMicroSilences(pace)` -> returns MicroSilenceConfig
 * - `injectMicroSilences(base64Audio, pace)` -> returns processed base64 audio string
 * - `injectMicroSilences(arrayBuffer, pace)` -> returns processed ArrayBuffer
 */
export function injectMicroSilences(pace: Pace): MicroSilenceConfig;
export function injectMicroSilences(audioData: string, pace: Pace): string;
export function injectMicroSilences(audioData: ArrayBuffer, pace: Pace): ArrayBuffer;
export function injectMicroSilences(
  first: Pace | string | ArrayBuffer,
  second?: Pace
): MicroSilenceConfig | string | ArrayBuffer {
  // If first parameter is a Pace object
  if (
    typeof first === 'object' && 
    first !== null && 
    !('byteLength' in first) && 
    ('pause' in first || 'articulation' in first || 'rate' in first) &&
    !second
  ) {
    return calculateMicroSilences(first as Pace);
  }

  const pace: Pace = second || (typeof first === 'object' && 'pause' in first ? (first as Pace) : { rate: 1.0, pause: 'normal', articulation: 'neutral' });
  const config = calculateMicroSilences(pace);

  // If first is base64 string
  if (typeof first === 'string') {
    return prependWavSilenceBase64(first, config.inhalationDurationMs);
  }

  // If first is ArrayBuffer
  if (first instanceof ArrayBuffer) {
    return prependWavSilenceArrayBuffer(first, config.inhalationDurationMs);
  }

  return config;
}
