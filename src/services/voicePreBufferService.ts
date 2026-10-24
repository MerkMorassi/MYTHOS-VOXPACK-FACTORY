/**
 * VoicePreBufferService
 * Maintains a high-fidelity rolling buffer of the last 500ms of microphone audio.
 * Ensures that when a voice interaction is triggered, we have the preceding audio 
 * context available to prevent clipping or lost initial syllables.
 * 
 * Includes Voice Activity Detection (VAD) volume thresholding to automatically
 * trigger `echos.play('floor_want')` and halt assistant audio as soon as user 
 * microphone audio exceeds threshold while assistant is speaking.
 */

import { echos } from './echos';
import { stopCurrentAudio, getActiveAudioElement } from './voiceCloneService';

export interface VoicePreBufferState {
  isActive: boolean;
  isReady: boolean;
  error: string | null;
  vadEnabled: boolean;
  vadThreshold: number;
  isSpeechDetected: boolean;
  currentRms: number;
  lastInterruptionTime: number;
}

export interface InterruptionEvent {
  timestamp: number;
  rms: number;
  source: 'vad' | 'manual';
}

class VoicePreBufferService {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  
  // Rolling buffer: 500ms at 44.1kHz or 48kHz
  private bufferSize: number = 0;
  private audioBuffer: Float32Array | null = null;
  private writePointer: number = 0;
  
  // VAD & Interruption state
  private vadEnabled: boolean = true;
  private vadThreshold: number = 0.035; // ~ -29dB RMS threshold for speech
  private vadDebounceMs: number = 1000;  // 1s cooldown between interruption triggers
  private consecutiveSpeechFrames: number = 0;
  private requiredSpeechFrames: number = 2; // ~180ms sustained audio above threshold to avoid false clicks
  private lastInterruptionTime: number = 0;
  private currentRms: number = 0;
  private isSpeechDetected: boolean = false;

  private stateListeners: Array<(state: VoicePreBufferState) => void> = [];
  private interruptionListeners: Array<(event: InterruptionEvent) => void> = [];
  
  private state: VoicePreBufferState = {
    isActive: false,
    isReady: false,
    error: null,
    vadEnabled: true,
    vadThreshold: 0.035,
    isSpeechDetected: false,
    currentRms: 0,
    lastInterruptionTime: 0,
  };

  constructor() {
    this.bufferSize = 0; // Calculated on start based on sample rate
  }

  onStateChange(fn: (state: VoicePreBufferState) => void) {
    this.stateListeners.push(fn);
    fn(this.state);
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== fn);
    };
  }

  onInterruption(fn: (event: InterruptionEvent) => void) {
    this.interruptionListeners.push(fn);
    return () => {
      this.interruptionListeners = this.interruptionListeners.filter(l => l !== fn);
    };
  }

  private updateState(partial: Partial<VoicePreBufferState>) {
    this.state = { ...this.state, ...partial };
    this.stateListeners.forEach(fn => fn(this.state));
  }

  setVadEnabled(enabled: boolean) {
    this.vadEnabled = enabled;
    this.updateState({ vadEnabled: enabled });
  }

  setVadThreshold(threshold: number) {
    this.vadThreshold = Math.max(0.005, Math.min(0.5, threshold));
    this.updateState({ vadThreshold: this.vadThreshold });
  }

  setVadDebounceMs(ms: number) {
    this.vadDebounceMs = Math.max(200, ms);
  }

  /**
   * Helper to check if assistant is actively delivering speech/audio
   */
  private checkIsAssistantSpeaking(): boolean {
    const isEchosSpeaking = echos.state.speaking;
    const hasActiveAudioEl = !!getActiveAudioElement();
    const isBrowserSynthSpeaking = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
    return isEchosSpeaking || hasActiveAudioEl || isBrowserSynthSpeaking;
  }

  /**
   * Triggers an explicit interruption workflow: halts assistant audio and plays 'floor_want' earcon.
   */
  triggerInterruption(source: 'vad' | 'manual' = 'manual'): boolean {
    const now = Date.now();
    this.lastInterruptionTime = now;
    this.updateState({ lastInterruptionTime: now });

    stopCurrentAudio();
    echos.play('floor_want', 2, { mode: 'gap' });

    const ev: InterruptionEvent = {
      timestamp: now,
      rms: this.currentRms,
      source,
    };

    this.interruptionListeners.forEach(fn => {
      try {
        fn(ev);
      } catch (err) {
        console.error('Interruption listener error:', err);
      }
    });

    return true;
  }

  /**
   * Initialize and start the background capture & VAD monitoring
   */
  async start() {
    if (this.state.isActive) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 500ms buffer
      this.bufferSize = Math.floor(this.audioContext.sampleRate * 0.5);
      this.audioBuffer = new Float32Array(this.bufferSize);
      this.writePointer = 0;

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Using ScriptProcessorNode for simplicity and compatibility in this environment
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        if (!this.audioBuffer) return;

        // 1. Write to rolling pre-buffer
        for (let i = 0; i < inputData.length; i++) {
          this.audioBuffer[this.writePointer] = inputData[i];
          this.writePointer = (this.writePointer + 1) % this.bufferSize;
        }

        // 2. Compute RMS volume for Voice Activity Detection (VAD)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.currentRms = rms;

        const isAboveThreshold = rms >= this.vadThreshold;
        if (isAboveThreshold) {
          this.consecutiveSpeechFrames++;
        } else {
          this.consecutiveSpeechFrames = Math.max(0, this.consecutiveSpeechFrames - 1);
        }

        const speechDetected = this.consecutiveSpeechFrames >= this.requiredSpeechFrames;
        if (speechDetected !== this.isSpeechDetected) {
          this.isSpeechDetected = speechDetected;
          this.updateState({ isSpeechDetected: speechDetected, currentRms: rms });
        }

        // 3. VAD-Driven Automated Interruption Check
        if (this.vadEnabled && speechDetected) {
          const now = Date.now();
          if (now - this.lastInterruptionTime > this.vadDebounceMs) {
            if (this.checkIsAssistantSpeaking()) {
              this.triggerInterruption('vad');
            }
          }
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.updateState({ isActive: true, isReady: true, error: null });
    } catch (err: any) {
      console.error('VoicePreBuffer start error:', err);
      this.updateState({ isActive: false, isReady: false, error: err.message });
    }
  }

  /**
   * Stop background capture and release resources
   */
  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioBuffer = null;
    this.consecutiveSpeechFrames = 0;
    this.isSpeechDetected = false;
    this.updateState({ isActive: false, isReady: false, isSpeechDetected: false });
  }

  /**
   * Retrieves the current 500ms pre-buffer in chronological order.
   */
  getPreBuffer(): Float32Array {
    if (!this.audioBuffer) return new Float32Array(0);

    const out = new Float32Array(this.bufferSize);
    // Copy from writePointer to end, then from 0 to writePointer
    const firstPart = this.audioBuffer.subarray(this.writePointer);
    const secondPart = this.audioBuffer.subarray(0, this.writePointer);
    
    out.set(firstPart, 0);
    out.set(secondPart, firstPart.length);
    
    return out;
  }

  getState(): VoicePreBufferState {
    return this.state;
  }
}

export const voicePreBuffer = new VoicePreBufferService();

