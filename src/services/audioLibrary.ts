import { echos } from './echos';

export interface AudioSampleEntry {
  tag: string;
  lvl: number;
  take: number;
  url: string;
  label?: string;
  timestamp: number;
}

/**
 * Central Audio Library for ECHOS (SYS.AI.MAYA.SESAME)
 * Stores and manages high-fidelity audio assets that override procedural synth generators.
 * Supports persistence of user-recorded sampler clips.
 */
class AudioLibrary {
  private samples: AudioSampleEntry[] = [];
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('echos_audio_library');
    if (saved) {
      try {
        this.samples = JSON.parse(saved);
      } catch (e) {
        console.warn('[AudioLibrary] Failed to parse stored library', e);
      }
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('echos_audio_library', JSON.stringify(this.samples));
  }

  /**
   * Register a new sample clip.
   * If a sample with the same tag:lvl:take exists, it will be overwritten.
   */
  async registerSample(tag: string, lvl: number, take: number, url: string, label?: string) {
    const entry: AudioSampleEntry = {
      tag,
      lvl,
      take,
      url,
      label,
      timestamp: Date.now()
    };

    const existingIndex = this.samples.findIndex(
      s => s.tag === tag && s.lvl === lvl && s.take === take
    );

    if (existingIndex !== -1) {
      this.samples[existingIndex] = entry;
    } else {
      this.samples.push(entry);
    }

    this.saveToStorage();

    // Load into ECHOS engine immediately if we are initialized
    if (this.isInitialized) {
      await echos.loadSample(tag, lvl, take, url);
    }
  }

  /**
   * Unregister a sample clip.
   */
  unregisterSample(tag: string, lvl: number, take: number) {
    this.samples = this.samples.filter(
      s => !(s.tag === tag && s.lvl === lvl && s.take === take)
    );
    this.saveToStorage();
    // Note: ECHOS engine currently doesn't support unloading, but synth will fallback if buffer is cleared
  }

  /**
   * Retrieve all registered samples.
   */
  getSamples(): AudioSampleEntry[] {
    return [...this.samples];
  }

  /**
   * Initialize the ECHOS engine with all registered samples from the library.
   */
  async initializeEngine() {
    if (this.isInitialized) return;
    
    const manifest: Record<string, string> = {};
    this.samples.forEach(s => {
      manifest[`${s.tag}:${s.lvl}:${s.take}`] = s.url;
    });
    
    if (Object.keys(manifest).length > 0) {
      await echos.loadLibrary(manifest);
    }
    
    this.isInitialized = true;
    console.info(`[AudioLibrary] ECHOS engine initialized with ${this.samples.length} samples.`);
  }

  /**
   * Clear the entire library (DANGER)
   */
  clearLibrary() {
    this.samples = [];
    this.saveToStorage();
  }
}

export const audioLibrary = new AudioLibrary();
export default audioLibrary;
