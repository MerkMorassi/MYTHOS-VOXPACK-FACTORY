/**
 * Centralized AudioContext Singleton & Lifecycle Manager
 * Manages a single Web Audio API AudioContext instance across all audio services,
 * prevents AudioContext creation leaks, and handles suspend/resume lifecycle.
 */

let sharedAudioContext: AudioContext | null = null;

/**
 * Returns the primary shared AudioContext singleton instance, creating it on first access
 * or re-initializing if previously closed. Automatically attempts resume if suspended.
 */
export function getSharedAudioContext(): AudioContext {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext is only available in browser environments');
  }

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioCtx();
  }

  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }

  return sharedAudioContext;
}

/**
 * Explicitly ensures the shared AudioContext is in 'running' state after a user gesture.
 */
export async function ensureAudioContextResumed(): Promise<AudioContext> {
  const ctx = getSharedAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      console.warn('[AudioContextManager] Could not resume AudioContext:', err);
    }
  }
  return ctx;
}

/**
 * Safely decodes audio ArrayBuffer using the shared AudioContext without leaking new contexts.
 */
export async function decodeAudioDataShared(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = getSharedAudioContext();
  // Pass a slice to prevent detachment if caller reuses arrayBuffer
  return await ctx.decodeAudioData(arrayBuffer.slice(0));
}

/**
 * Suspends the shared AudioContext when all audio operations enter idle state.
 */
export async function suspendSharedAudioContext(): Promise<void> {
  if (sharedAudioContext && sharedAudioContext.state === 'running') {
    try {
      await sharedAudioContext.suspend();
    } catch (err) {
      console.warn('[AudioContextManager] Could not suspend AudioContext:', err);
    }
  }
}
