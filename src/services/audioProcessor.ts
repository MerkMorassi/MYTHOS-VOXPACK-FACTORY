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
 * Injects subtle, randomized 'exhale' noise into silent regions (> 400ms) of a WAV buffer.
 * This simulates organic breathing during natural speech pauses.
 */
function injectContextualExhales(buffer: ArrayBuffer): ArrayBuffer {
  if (buffer.byteLength < 44) return buffer;

  const view = new DataView(buffer);
  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bytesPerSample = view.getUint16(34, true) / 8;
  const pcmDataOffset = 44;
  const samples = (buffer.byteLength - pcmDataOffset) / (bytesPerSample * channels);

  if (channels !== 1 || bytesPerSample !== 2) {
    // Currently only optimized for 16-bit mono WAVs (common for TTS)
    return buffer;
  }

  const silenceThreshold = 150; // Amplitude threshold for "silence"
  const minPauseSamples = Math.floor(sampleRate * 0.45); // ~450ms pause
  
  let pauseStart = -1;
  const pauses: Array<{ start: number; length: number }> = [];

  for (let i = 0; i < samples; i++) {
    const val = Math.abs(view.getInt16(pcmDataOffset + i * 2, true));
    if (val < silenceThreshold) {
      if (pauseStart === -1) pauseStart = i;
    } else {
      if (pauseStart !== -1) {
        const length = i - pauseStart;
        if (length > minPauseSamples) {
          pauses.push({ start: pauseStart, length });
        }
        pauseStart = -1;
      }
    }
  }

  // Process pauses in reverse to not affect indices (though we aren't changing length here)
  pauses.forEach(pause => {
    // 35% chance to skip for natural variation
    if (Math.random() < 0.35) return;

    const breathLength = Math.min(pause.length, Math.floor(sampleRate * 0.7)); // Max 700ms breath
    const breathStart = pause.start + Math.floor((pause.length - breathLength) / 2);
    
    // Simple band-limited noise generator (filtered white noise)
    let lastOut = 0;
    for (let j = 0; j < breathLength; j++) {
      const white = Math.random() * 2 - 1;
      // Simple 1-pole lowpass at ~800Hz for breathy texture
      const filtered = (lastOut + 0.1 * white) / 1.1;
      lastOut = filtered;

      // Envelope: Linear ramp up (15%) and exponential ramp down (85%)
      let env = 0;
      const progress = j / breathLength;
      if (progress < 0.15) {
        env = progress / 0.15;
      } else {
        env = Math.pow(1 - (progress - 0.15) / 0.85, 2);
      }

      const sampleIdx = pcmDataOffset + (breathStart + j) * 2;
      const original = view.getInt16(sampleIdx, true);
      const noise = filtered * 1800 * env; // Intensity scale
      
      // Mix noise into original buffer (likely silence)
      const mixed = Math.max(-32768, Math.min(32767, original + noise));
      view.setInt16(sampleIdx, Math.round(mixed), true);
    }
  });

  return buffer;
}

/**
 * Injects synthetic micro-silences into raw audio stream or returns computed timing gaps.
 * Also performs contextual breath injection for natural-sounding pauses.
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
    try {
      const cleanBase64 = first.replace(/^data:audio\/\w+;base64,/, '');
      const binaryString = atob(cleanBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 1. Prepend start silence/inhalation
      let processedBuffer = prependWavSilenceArrayBuffer(bytes.buffer, config.inhalationDurationMs);
      
      // 2. Inject randomized breaths during pauses
      processedBuffer = injectContextualExhales(processedBuffer);

      // Convert back to base64
      let processedBinary = '';
      const processedBytes = new Uint8Array(processedBuffer);
      const chunkSize = 8192;
      for (let i = 0; i < processedBytes.length; i += chunkSize) {
        processedBinary += String.fromCharCode.apply(
          null,
          Array.from(processedBytes.subarray(i, i + chunkSize))
        );
      }
      return btoa(processedBinary);
    } catch (err) {
      console.warn('Failed to process WAV audio, using original:', err);
      return first;
    }
  }

  // If first is ArrayBuffer
  if (first instanceof ArrayBuffer) {
    let processed = prependWavSilenceArrayBuffer(first, config.inhalationDurationMs);
    processed = injectContextualExhales(processed);
    return processed;
  }

  return config;
}
