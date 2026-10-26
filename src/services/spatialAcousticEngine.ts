/**
 * Spatial Acoustic Engine & Sub-Band Frequency Sidechain Ducking Manager
 * 
 * Provides:
 * 1. True Sub-Band Frequency Sidechain Ducking:
 *    - Real-time sidechain detector monitoring the vocal intelligibility zone (1.5 kHz – 3.8 kHz).
 *    - Dual-stage vocal formant notch filters:
 *        F2 Core Formant: 2,000 Hz (Q = 1.8)
 *        F3 Consonant Articulation: 3,400 Hz (Q = 2.2)
 *    - Carves acoustic room in background textures/earcons/reverbs without broadband volume dips.
 *    - Musical ballistics (25ms attack, 120ms hold, 220ms release).
 * 2. Procedural Web Audio Convolver Space Engine:
 *    - 6 environmental spaces (Dry, Vocal Booth, Studio A, Resonant Sanctum, Metallic Corridor, Open Canyon).
 *    - Equal-power dry/wet crossfader.
 */

import { getSharedAudioContext } from './audioContextManager';

export type AcousticSpace = 'dry' | 'booth' | 'studio' | 'sanctum' | 'corridor' | 'canyon';

export interface AcousticSpaceProfile {
  id: AcousticSpace;
  name: string;
  description: string;
  defaultWet: number; // 0 to 1
  durationSec: number;
  decay: number;
  hfDamp: boolean;
  preDelayMs: number;
}

export const ACOUSTIC_SPACES: Record<AcousticSpace, AcousticSpaceProfile> = {
  dry: {
    id: 'dry',
    name: 'Direct / Dry',
    description: 'Pure studio direct feed with zero room reflection',
    defaultWet: 0,
    durationSec: 0.1,
    decay: 5,
    hfDamp: true,
    preDelayMs: 0,
  },
  booth: {
    id: 'booth',
    name: 'Vocal Isolation Booth',
    description: 'Tight, warm acoustic treatment with close-mic intimacy',
    defaultWet: 0.18,
    durationSec: 0.25,
    decay: 4.2,
    hfDamp: true,
    preDelayMs: 8,
  },
  studio: {
    id: 'studio',
    name: 'Recording Studio A',
    description: 'Balanced natural room acoustic with warm early reflections',
    defaultWet: 0.28,
    durationSec: 0.75,
    decay: 2.8,
    hfDamp: true,
    preDelayMs: 16,
  },
  sanctum: {
    id: 'sanctum',
    name: 'Resonant Sanctum',
    description: 'Grand vaulted stone sanctuary with lush, luminous decay',
    defaultWet: 0.45,
    durationSec: 2.8,
    decay: 1.6,
    hfDamp: true,
    preDelayMs: 32,
  },
  corridor: {
    id: 'corridor',
    name: 'Subterranean Corridor',
    description: 'Futuristic metallic acoustic reflections with flutter decay',
    defaultWet: 0.35,
    durationSec: 1.2,
    decay: 2.1,
    hfDamp: false,
    preDelayMs: 22,
  },
  canyon: {
    id: 'canyon',
    name: 'Open Air Canyon',
    description: 'Vast outdoor natural expanse with distant ambient decay',
    defaultWet: 0.40,
    durationSec: 3.6,
    decay: 1.3,
    hfDamp: true,
    preDelayMs: 50,
  },
};

export interface AcousticConfig {
  space: AcousticSpace;
  reverbWet: number; // 0 to 100 (%)
  formantDucking: boolean;
  duckingDepthDb: number; // -6 to -24 dB
  autoSidechain: boolean;
  active: boolean;
}

export interface SidechainStatus {
  isDuckingActive: boolean;
  currentReductionDb: number;
  voicePower: number;
  f2Frequency: number;
  f3Frequency: number;
}

class SpatialAcousticEngine {
  private ctx: AudioContext | null = null;
  
  // Audio Input Buses
  private voiceInputBus: GainNode | null = null;       // Key / Sidechain input (Voice)
  private backgroundInputBus: GainNode | null = null;  // Bed / Subject to ducking (Earcons, takes, textures)
  private masterSumBus: GainNode | null = null;

  // Sub-Band Formant Notch Filters
  private formantNotchF2: BiquadFilterNode | null = null; // 2000 Hz Formant Notch
  private formantNotchF3: BiquadFilterNode | null = null; // 3400 Hz Consonant Notch

  // Reverb Routing
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private preDelayNode: DelayNode | null = null;
  private dampFilter: BiquadFilterNode | null = null;

  // Real-time Sidechain Detector
  private voiceAnalyser: AnalyserNode | null = null;
  private voiceFreqData: Uint8Array | null = null;
  private detectorInterval: any = null;
  private isDuckingActive: boolean = false;
  private currentReductionDb: number = 0;
  private lastVoiceTime: number = 0;
  private readonly HOLD_MS = 130;
  private readonly ATTACK_SEC = 0.025;
  private readonly RELEASE_SEC = 0.22;

  // Cached generated impulse response AudioBuffers
  private irCache: Map<AcousticSpace, AudioBuffer> = new Map();

  private config: AcousticConfig = {
    space: 'studio',
    reverbWet: 25,
    formantDucking: true,
    duckingDepthDb: -14,
    autoSidechain: true,
    active: true,
  };

  private listeners: Array<(config: AcousticConfig) => void> = [];
  private statusListeners: Array<(status: SidechainStatus) => void> = [];

  constructor() {
    this.loadPersistentConfig();
  }

  private loadPersistentConfig(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem('echos_acoustic_spatial_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          this.config = {
            space: parsed.space && ACOUSTIC_SPACES[parsed.space as AcousticSpace] ? parsed.space : 'studio',
            reverbWet: typeof parsed.reverbWet === 'number' ? Math.max(0, Math.min(100, parsed.reverbWet)) : 25,
            formantDucking: typeof parsed.formantDucking === 'boolean' ? parsed.formantDucking : true,
            duckingDepthDb: typeof parsed.duckingDepthDb === 'number' ? Math.max(-24, Math.min(-6, parsed.duckingDepthDb)) : -14,
            autoSidechain: typeof parsed.autoSidechain === 'boolean' ? parsed.autoSidechain : true,
            active: typeof parsed.active === 'boolean' ? parsed.active : true,
          };
        }
      }
    } catch (e) {
      console.warn('[SpatialAcoustic] Could not load persistent config:', e);
    }
  }

  public savePersistentConfig(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('echos_acoustic_spatial_config', JSON.stringify(this.config));
    } catch (e) {
      console.warn('[SpatialAcoustic] Could not save persistent config:', e);
    }
  }

  /**
   * Initializes or returns the spatial audio graph.
   * Signal Flow:
   *   [Voice Bus] ------> [Voice Analyser]
   *          \----------> [Master Sum Bus] ------------------------\
   *                                                                 |
   *   [Background Bus] -> [Notch F2: 2.0kHz] -> [Notch F3: 3.4kHz] /
   *                                                                 |
   *                     [Master Sum Bus] ---------------------------+
   *                            |                                    |
   *                            +-----------------> [Dry Gain] ----> [Destination]
   *                            |                                    ^
   *                            \-> [Convolver] --> [Wet Gain] ------/
   */
  public getAudioGraph() {
    if (!this.ctx || !this.voiceInputBus || !this.backgroundInputBus) {
      this.ctx = getSharedAudioContext();

      // 1. Voice Channel (Sidechain Key Signal)
      this.voiceInputBus = this.ctx.createGain();
      this.voiceInputBus.gain.value = 1.0;

      this.voiceAnalyser = this.ctx.createAnalyser();
      this.voiceAnalyser.fftSize = 512;
      this.voiceFreqData = new Uint8Array(this.voiceAnalyser.frequencyBinCount);
      this.voiceInputBus.connect(this.voiceAnalyser);

      // 2. Background Bed Channel (Subject to Formant Ducking)
      this.backgroundInputBus = this.ctx.createGain();
      this.backgroundInputBus.gain.value = 1.0;

      // Band 1: Core Formant Notch (F2 ~ 2,000 Hz, Q = 1.8)
      this.formantNotchF2 = this.ctx.createBiquadFilter();
      this.formantNotchF2.type = 'peaking';
      this.formantNotchF2.frequency.value = 2000;
      this.formantNotchF2.Q.value = 1.8;
      this.formantNotchF2.gain.value = 0;

      // Band 2: Upper Consonant Articulation Notch (F3 ~ 3,400 Hz, Q = 2.2)
      this.formantNotchF3 = this.ctx.createBiquadFilter();
      this.formantNotchF3.type = 'peaking';
      this.formantNotchF3.frequency.value = 3400;
      this.formantNotchF3.Q.value = 2.2;
      this.formantNotchF3.gain.value = 0;

      // Connect background bed through dual formant notches
      this.backgroundInputBus.connect(this.formantNotchF2);
      this.formantNotchF2.connect(this.formantNotchF3);

      // 3. Master Summing Bus
      this.masterSumBus = this.ctx.createGain();
      this.masterSumBus.gain.value = 1.0;

      // Voice bypasses formant notches directly into master sum
      this.voiceInputBus.connect(this.masterSumBus);
      // Processed background bed enters master sum
      this.formantNotchF3.connect(this.masterSumBus);

      // 4. Spatial Convolver Reverb Network
      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 1.0;

      this.preDelayNode = this.ctx.createDelay(0.2);
      this.preDelayNode.delayTime.value = 0.016;

      this.convolver = this.ctx.createConvolver();
      this.convolver.normalize = true;

      this.dampFilter = this.ctx.createBiquadFilter();
      this.dampFilter.type = 'lowpass';
      this.dampFilter.frequency.value = 7200;

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = 0.25;

      // Master Sum -> Dry Gain -> Destination
      this.masterSumBus.connect(this.dryGain);
      this.dryGain.connect(this.ctx.destination);

      // Master Sum -> PreDelay -> Convolver -> Damp -> Wet Gain -> Destination
      this.masterSumBus.connect(this.preDelayNode);
      this.preDelayNode.connect(this.convolver);
      this.convolver.connect(this.dampFilter);
      this.dampFilter.connect(this.wetGain);
      this.wetGain.connect(this.ctx.destination);

      // Load active environment space and mix
      this.applySpace(this.config.space);
      this.updateMixGains();

      // Start continuous real-time sidechain detector loop
      this.startSidechainDetector();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return {
      voiceInputBus: this.voiceInputBus!,
      backgroundInputBus: this.backgroundInputBus!,
      masterSumBus: this.masterSumBus!,
      formantNotchF2: this.formantNotchF2!,
      formantNotchF3: this.formantNotchF3!,
      dryGain: this.dryGain!,
      wetGain: this.wetGain!,
      convolver: this.convolver!,
    };
  }

  /**
   * Real-time continuous sidechain detector loop.
   * Measures energy specifically in the 1.5kHz - 3.8kHz vocal formant bins.
   * When speech is detected, dynamically engages dual formant notch filters on the background bed.
   */
  private startSidechainDetector(): void {
    if (this.detectorInterval || typeof window === 'undefined') return;

    this.detectorInterval = setInterval(() => {
      if (!this.config.formantDucking || !this.config.autoSidechain || !this.voiceAnalyser || !this.voiceFreqData || !this.ctx) {
        return;
      }

      this.voiceAnalyser.getByteFrequencyData(this.voiceFreqData as any);

      // Target frequency range: 1.5 kHz to 3.8 kHz
      const sampleRate = this.ctx.sampleRate;
      const binCount = this.voiceAnalyser.frequencyBinCount;
      const hzPerBin = (sampleRate / 2) / binCount;
      const minBin = Math.floor(1500 / hzPerBin);
      const maxBin = Math.min(binCount - 1, Math.ceil(3800 / hzPerBin));

      let energySum = 0;
      let count = 0;
      for (let i = minBin; i <= maxBin; i++) {
        energySum += this.voiceFreqData[i];
        count++;
      }
      const avgVoiceEnergy = count > 0 ? (energySum / count) / 255 : 0;
      const now = this.ctx.currentTime;

      // Threshold: speech energy present (> 12% in formant band)
      const threshold = 0.12;
      const isVoiceDetected = avgVoiceEnergy > threshold;

      if (isVoiceDetected) {
        this.lastVoiceTime = Date.now();
        if (!this.isDuckingActive) {
          this.engageNotchFilters(now);
        }
      } else {
        const timeSinceVoice = Date.now() - this.lastVoiceTime;
        if (this.isDuckingActive && timeSinceVoice > this.HOLD_MS) {
          this.releaseNotchFilters(now);
        }
      }

      // Notify telemetry listeners if status changed
      if (this.statusListeners.length > 0) {
        this.statusListeners.forEach(fn => fn({
          isDuckingActive: this.isDuckingActive,
          currentReductionDb: Math.round(this.currentReductionDb * 10) / 10,
          voicePower: Math.round(avgVoiceEnergy * 100) / 100,
          f2Frequency: 2000,
          f3Frequency: 3400,
        }));
      }
    }, 25);
  }

  private engageNotchFilters(nowTime: number): void {
    if (!this.formantNotchF2 || !this.formantNotchF3) return;
    this.isDuckingActive = true;
    const depth = this.config.duckingDepthDb;
    this.currentReductionDb = depth;

    // F2 (2.0 kHz) takes full depth
    this.formantNotchF2.gain.cancelScheduledValues(nowTime);
    this.formantNotchF2.gain.setValueAtTime(this.formantNotchF2.gain.value, nowTime);
    this.formantNotchF2.gain.linearRampToValueAtTime(depth, nowTime + this.ATTACK_SEC);

    // F3 (3.4 kHz) takes 75% depth to preserve consonant sparkle
    this.formantNotchF3.gain.cancelScheduledValues(nowTime);
    this.formantNotchF3.gain.setValueAtTime(this.formantNotchF3.gain.value, nowTime);
    this.formantNotchF3.gain.linearRampToValueAtTime(depth * 0.75, nowTime + this.ATTACK_SEC);
  }

  private releaseNotchFilters(nowTime: number): void {
    if (!this.formantNotchF2 || !this.formantNotchF3) return;
    this.isDuckingActive = false;
    this.currentReductionDb = 0;

    this.formantNotchF2.gain.cancelScheduledValues(nowTime);
    this.formantNotchF2.gain.setValueAtTime(this.formantNotchF2.gain.value, nowTime);
    this.formantNotchF2.gain.linearRampToValueAtTime(0, nowTime + this.RELEASE_SEC);

    this.formantNotchF3.gain.cancelScheduledValues(nowTime);
    this.formantNotchF3.gain.setValueAtTime(this.formantNotchF3.gain.value, nowTime);
    this.formantNotchF3.gain.linearRampToValueAtTime(0, nowTime + this.RELEASE_SEC);
  }

  /**
   * Procedural stereo impulse response generator with decorrelated channels
   * and physical decay characteristics.
   */
  private generateImpulseResponse(profile: AcousticSpaceProfile): AudioBuffer {
    const ctx = this.ctx || getSharedAudioContext();
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * profile.durationSec));
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let lastL = 0;
    let lastR = 0;
    const decay = profile.decay;
    const hfDamp = profile.hfDamp;

    for (let i = 0; i < length; i++) {
      const progress = i / length;
      const env = Math.pow(1 - progress, decay);
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;

      let reflectionSpike = 0;
      if (i < sampleRate * 0.08) {
        if (i % Math.floor(sampleRate * 0.012) === 0) {
          reflectionSpike = (Math.random() * 2 - 1) * 0.4;
        }
      }

      if (hfDamp) {
        lastL = 0.65 * lastL + 0.35 * (whiteL + reflectionSpike);
        lastR = 0.65 * lastR + 0.35 * (whiteR + reflectionSpike);
        left[i] = lastL * env;
        right[i] = lastR * env;
      } else {
        lastL = 0.3 * lastL + 0.7 * (whiteL + reflectionSpike);
        lastR = 0.3 * lastR + 0.7 * (whiteR + reflectionSpike);
        left[i] = lastL * env;
        right[i] = lastR * env;
      }
    }

    return buffer;
  }

  private applySpace(space: AcousticSpace): void {
    if (!this.convolver || !this.preDelayNode || !this.dampFilter) return;

    if (space === 'dry' || !this.config.active) {
      this.wetGain!.gain.value = 0;
      this.dryGain!.gain.value = 1.0;
      return;
    }

    const profile = ACOUSTIC_SPACES[space] || ACOUSTIC_SPACES.studio;
    this.preDelayNode.delayTime.value = profile.preDelayMs / 1000;

    if (space === 'corridor') {
      this.dampFilter.frequency.value = 9500;
    } else if (space === 'sanctum') {
      this.dampFilter.frequency.value = 4500;
    } else {
      this.dampFilter.frequency.value = 7200;
    }

    let ir = this.irCache.get(space);
    if (!ir) {
      ir = this.generateImpulseResponse(profile);
      this.irCache.set(space, ir);
    }

    try {
      this.convolver.buffer = ir;
    } catch (err) {
      console.warn('[SpatialAcoustic] Error setting convolver buffer:', err);
    }

    this.updateMixGains();
  }

  private updateMixGains(): void {
    if (!this.dryGain || !this.wetGain) return;

    if (!this.config.active || this.config.space === 'dry' || this.config.reverbWet === 0) {
      this.dryGain.gain.value = 1.0;
      this.wetGain.gain.value = 0;
      return;
    }

    const wetPercent = this.config.reverbWet / 100;
    const angle = wetPercent * (Math.PI / 4.5);
    this.dryGain.gain.value = Math.cos(angle);
    this.wetGain.gain.value = Math.sin(angle) * 1.15;
  }

  /**
   * Manually schedules a sub-band formant ducking event (e.g. from ECHOS timeline plan).
   */
  public triggerFormantDucking(durationMs: number, targetDb?: number, whenTime?: number): void {
    if (!this.config.formantDucking) return;
    this.getAudioGraph();
    if (!this.formantNotchF2 || !this.formantNotchF3 || !this.ctx) return;

    const depth = targetDb !== undefined ? targetDb : this.config.duckingDepthDb;
    const now = whenTime !== undefined ? Math.max(this.ctx.currentTime, whenTime) : this.ctx.currentTime;
    const durSec = durationMs / 1000;

    // F2 (2.0 kHz)
    this.formantNotchF2.gain.cancelScheduledValues(now);
    this.formantNotchF2.gain.setValueAtTime(this.formantNotchF2.gain.value, now);
    this.formantNotchF2.gain.linearRampToValueAtTime(depth, now + this.ATTACK_SEC);

    // F3 (3.4 kHz)
    this.formantNotchF3.gain.cancelScheduledValues(now);
    this.formantNotchF3.gain.setValueAtTime(this.formantNotchF3.gain.value, now);
    this.formantNotchF3.gain.linearRampToValueAtTime(depth * 0.75, now + this.ATTACK_SEC);

    const recoveryStart = Math.max(now + 0.05, now + durSec - 0.1);
    this.formantNotchF2.gain.setValueAtTime(depth, recoveryStart);
    this.formantNotchF2.gain.linearRampToValueAtTime(0, recoveryStart + this.RELEASE_SEC);

    this.formantNotchF3.gain.setValueAtTime(depth * 0.75, recoveryStart);
    this.formantNotchF3.gain.linearRampToValueAtTime(0, recoveryStart + this.RELEASE_SEC);
  }

  public getConfig(): AcousticConfig {
    return { ...this.config };
  }

  public setConfig(partial: Partial<AcousticConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
      reverbWet: partial.reverbWet !== undefined 
        ? Math.max(0, Math.min(100, partial.reverbWet)) 
        : this.config.reverbWet,
      duckingDepthDb: partial.duckingDepthDb !== undefined
        ? Math.max(-24, Math.min(-6, partial.duckingDepthDb))
        : this.config.duckingDepthDb,
    };
    this.savePersistentConfig();

    if (partial.space !== undefined || partial.active !== undefined) {
      this.applySpace(this.config.space);
    }
    this.updateMixGains();

    this.listeners.forEach(fn => fn(this.config));
  }

  public onConfigChange(fn: (config: AcousticConfig) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  public onSidechainActivity(fn: (status: SidechainStatus) => void): () => void {
    this.statusListeners.push(fn);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== fn);
    };
  }

  /**
   * Primary voice / speech channel input (Sidechain Key Signal).
   */
  public getVoiceInputNode(): GainNode {
    return this.getAudioGraph().voiceInputBus;
  }

  /**
   * Background / Bed channel input (Subject to Formant Ducking).
   */
  public getBackgroundInputNode(): GainNode {
    return this.getAudioGraph().backgroundInputBus;
  }

  /**
   * Legacy / General input fallback (routes into background bed).
   */
  public getInputNode(): GainNode {
    return this.getBackgroundInputNode();
  }

  /**
   * Audition test: plays a brief resonant chime through the acoustic space
   */
  public async previewAcousticSpace(): Promise<void> {
    const inputBus = this.getBackgroundInputNode();
    const ctx = this.ctx || getSharedAudioContext();
    const now = ctx.currentTime;

    const freqs = [440, 659.25, 880];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25 / freqs.length, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.6);

      osc.connect(gain);
      gain.connect(inputBus);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.65);
    });
  }

  /**
   * Audition test for Sub-Band Sidechain Ducking:
   * Plays a sustained harmonic pad on the background bus, then bursts a voice tone on the
   * voice channel to demonstrate the formant frequency carving in real time.
   */
  public async testSidechainDucking(): Promise<void> {
    const ctx = this.ctx || getSharedAudioContext();
    const bgBus = this.getBackgroundInputNode();
    const voiceBus = this.getVoiceInputNode();
    const now = ctx.currentTime;

    // 1. Sustained Background Bed Pad (rich in 2kHz - 3.5kHz frequencies)
    const padOsc = ctx.createOscillator();
    padOsc.type = 'sawtooth';
    padOsc.frequency.setValueAtTime(261.63, now); // C4

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(4500, now);

    const padGain = ctx.createGain();
    padGain.gain.setValueAtTime(0.001, now);
    padGain.gain.linearRampToValueAtTime(0.18, now + 0.1);
    padGain.gain.setValueAtTime(0.18, now + 1.8);
    padGain.gain.linearRampToValueAtTime(0.001, now + 2.2);

    padOsc.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(bgBus);

    padOsc.start(now);
    padOsc.stop(now + 2.2);

    // 2. Simulated Speech Vocal Tone burst at +500ms on the voice channel
    const voiceStart = now + 0.5;
    const voiceOsc = ctx.createOscillator();
    voiceOsc.type = 'triangle';
    voiceOsc.frequency.setValueAtTime(320, voiceStart); // Vocal pitch E4

    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.001, voiceStart);
    voiceGain.gain.linearRampToValueAtTime(0.3, voiceStart + 0.05);
    voiceGain.gain.setValueAtTime(0.3, voiceStart + 0.7);
    voiceGain.gain.linearRampToValueAtTime(0.001, voiceStart + 0.85);

    voiceOsc.connect(voiceGain);
    voiceGain.connect(voiceBus);

    voiceOsc.start(voiceStart);
    voiceOsc.stop(voiceStart + 0.85);
  }
}

// Singleton Export
export const spatialAcoustic = new SpatialAcousticEngine();
