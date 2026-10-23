/**
 * VoicePreBufferService
 * Maintains a high-fidelity rolling buffer of the last 500ms of microphone audio.
 * Ensures that when a voice interaction is triggered, we have the preceding audio 
 * context available to prevent clipping or lost initial syllables.
 */

export interface VoicePreBufferState {
  isActive: boolean;
  isReady: boolean;
  error: string | null;
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
  
  private listeners: Array<(state: VoicePreBufferState) => void> = [];
  private state: VoicePreBufferState = {
    isActive: false,
    isReady: false,
    error: null
  };

  constructor() {
    this.bufferSize = 0; // Calculated on start based on sample rate
  }

  onStateChange(fn: (state: VoicePreBufferState) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private updateState(partial: Partial<VoicePreBufferState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(fn => fn(this.state));
  }

  /**
   * Initialize and start the background capture
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
      // (In production, AudioWorklet would be preferred)
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        if (!this.audioBuffer) return;

        for (let i = 0; i < inputData.length; i++) {
          this.audioBuffer[this.writePointer] = inputData[i];
          this.writePointer = (this.writePointer + 1) % this.bufferSize;
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
    this.updateState({ isActive: false, isReady: false });
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

  getState() {
    return this.state;
  }
}

export const voicePreBuffer = new VoicePreBufferService();
