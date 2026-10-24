/**
 * VoicePreBufferService
 * Maintains a high-fidelity rolling buffer of the last 500ms of microphone audio.
 * Uses a dedicated WebAudio AudioWorkletNode (with ScriptProcessor fallback) running 
 * in a background audio thread for zero-latency audio capture and VAD RMS power calculation.
 * 
 * Includes Voice Activity Detection (VAD) volume thresholding to automatically
 * trigger `echos.play('floor_want')` and halt assistant audio as soon as user 
 * microphone audio exceeds threshold while assistant is speaking.
 */

import { echos } from './echos';
import { stopCurrentAudio, getActiveAudioElement } from './voiceCloneService';
import { ensureAudioContextResumed } from './audioContextManager';

export interface VoicePreBufferState {
  isActive: boolean;
  isReady: boolean;
  workletActive: boolean;
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
  private workletNode: AudioWorkletNode | null = null;
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
    workletActive: false,
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

    stopCurrentAudio(source);
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
   * High-level frame processing handler called by both AudioWorklet and ScriptProcessor fallback
   */
  private handleAudioFrame(inputData: Float32Array, rms: number) {
    if (!this.audioBuffer) return;

    // 1. Write to rolling 500ms pre-buffer
    for (let i = 0; i < inputData.length; i++) {
      this.audioBuffer[this.writePointer] = inputData[i];
      this.writePointer = (this.writePointer + 1) % this.bufferSize;
    }

    this.currentRms = rms;

    // 2. Compute RMS volume for Voice Activity Detection (VAD)
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
  }

  /**
   * Initialize and start background capture with threaded AudioWorklet Node
   */
  async start() {
    if (this.state.isActive) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = await ensureAudioContextResumed();
      
      // 500ms rolling buffer size
      this.bufferSize = Math.floor(this.audioContext.sampleRate * 0.5);
      this.audioBuffer = new Float32Array(this.bufferSize);
      this.writePointer = 0;

      this.source = this.audioContext.createMediaStreamSource(this.stream);

      let workletLoaded = false;

      // 1. Attempt AudioWorklet thread initialization
      if (this.audioContext.audioWorklet) {
        try {
          const workletCode = `
            class VadPreBufferProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input && input.length > 0) {
                  const inputChannel = input[0];
                  if (inputChannel && inputChannel.length > 0) {
                    let sum = 0;
                    for (let i = 0; i < inputChannel.length; i++) {
                      sum += inputChannel[i] * inputChannel[i];
                    }
                    const rms = Math.sqrt(sum / inputChannel.length);
                    this.port.postMessage({
                      samples: inputChannel,
                      rms: rms
                    });
                  }
                }
                return true;
              }
            }
            registerProcessor('vad-prebuffer-processor', VadPreBufferProcessor);
          `;

          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const workletUrl = URL.createObjectURL(blob);
          try {
            await this.audioContext.audioWorklet.addModule(workletUrl);
          } finally {
            URL.revokeObjectURL(workletUrl);
          }

          this.workletNode = new AudioWorkletNode(this.audioContext, 'vad-prebuffer-processor');
          this.workletNode.port.onmessage = (e) => {
            if (e.data && e.data.samples) {
              this.handleAudioFrame(new Float32Array(e.data.samples), e.data.rms || 0);
            }
          };

          this.source.connect(this.workletNode);
          const dummyGain = this.audioContext.createGain();
          dummyGain.gain.setValueAtTime(0, this.audioContext.currentTime);
          this.workletNode.connect(dummyGain);
          dummyGain.connect(this.audioContext.destination);

          workletLoaded = true;
          console.info('[VoicePreBuffer] AudioWorklet VAD thread initialized successfully.');
        } catch (workletErr) {
          console.warn('[VoicePreBuffer] AudioWorklet failed, falling back to ScriptProcessor:', workletErr);
        }
      }

      // 2. Fallback to ScriptProcessorNode if AudioWorklet fails or is unsupported
      if (!workletLoaded) {
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        this.processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          this.handleAudioFrame(inputData, rms);
        };

        this.source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
      }

      this.updateState({
        isActive: true,
        isReady: true,
        workletActive: workletLoaded,
        error: null,
      });
    } catch (err: any) {
      console.error('VoicePreBuffer start error:', err);
      this.updateState({ isActive: false, isReady: false, error: err.message });
    }
  }

  /**
   * Stop background capture and release resources
   */
  stop() {
    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch (_) {}
      this.workletNode = null;
    }
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (_) {}
      this.processor = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (_) {}
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext = null;
    }
    
    this.audioBuffer = null;
    this.consecutiveSpeechFrames = 0;
    this.isSpeechDetected = false;
    this.updateState({ isActive: false, isReady: false, workletActive: false, isSpeechDetected: false });
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
