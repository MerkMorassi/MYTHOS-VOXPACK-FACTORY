/**
 * InterruptionMemoryStore
 * Tracks when the assistant was interrupted mid-phrase by user voice activity (VAD) or manual tap.
 * Preserves exact spoken vs. unspoken character boundaries so Lila can naturally acknowledge
 * or resume her cut-off thoughts on subsequent conversational turns.
 */

export interface InterruptionMemory {
  id: string;
  fullResponse: string;
  spokenPart: string;
  unspokenPart: string;
  progressPercent: number;
  timestamp: number;
  source: 'vad' | 'manual';
}

class InterruptionMemoryStore {
  private lastInterruption: InterruptionMemory | null = null;
  private listeners: Array<(memory: InterruptionMemory | null) => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('echos_interruption_memory');
      if (saved) {
        this.lastInterruption = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[InterruptionMemoryStore] Could not load saved memory:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      if (this.lastInterruption) {
        localStorage.setItem('echos_interruption_memory', JSON.stringify(this.lastInterruption));
      } else {
        localStorage.removeItem('echos_interruption_memory');
      }
    } catch (e) {
      console.warn('[InterruptionMemoryStore] Could not save memory:', e);
    }
  }

  onMemoryChange(fn: (memory: InterruptionMemory | null) => void) {
    this.listeners.push(fn);
    fn(this.lastInterruption);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach(fn => fn(this.lastInterruption));
  }

  setLastInterruption(memory: InterruptionMemory) {
    this.lastInterruption = memory;
    this.notify();
  }

  getLastInterruption(): InterruptionMemory | null {
    if (!this.lastInterruption) return null;
    // Expire memory if older than 5 minutes
    if (Date.now() - this.lastInterruption.timestamp > 5 * 60 * 1000) {
      this.clearLastInterruption();
      return null;
    }
    return this.lastInterruption;
  }

  clearLastInterruption() {
    this.lastInterruption = null;
    this.notify();
  }
}

export const interruptionMemoryStore = new InterruptionMemoryStore();
