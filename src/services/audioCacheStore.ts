/**
 * IndexedDB-Backed AudioBuffer Pre-Warming & Persistent Take Cache
 * 
 * Provides an IndexedDB persistence and memory pre-warming layer for:
 * 1. Persona Voice Samples and ECHOS Multi-Take audio assets.
 * 2. Decoded PCM AudioBuffers stored across browser sessions to eliminate
 *    runtime fetch and AudioContext.decodeAudioData latency during persona switching.
 */

const DB_NAME = 'lorepack_audio_cache_db';
const DB_VERSION = 1;
const SAMPLES_STORE = 'audio_samples';
const PCM_STORE = 'pcm_buffers';

export interface CachedSampleRecord {
  key: string;
  tag: string;
  lvl: number;
  take: number;
  personaId?: string;
  arrayBuffer: ArrayBuffer;
  timestamp: number;
}

export interface CachedPcmRecord {
  key: string;
  personaId?: string;
  channels: number;
  length: number;
  sampleRate: number;
  channelData: ArrayBuffer[]; // Float32Array buffers
  timestamp: number;
}

export interface CacheStats {
  sampleCount: number;
  pcmCount: number;
  totalBytes: number;
}

class AudioCacheStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryAudioBufferCache: Map<string, AudioBuffer> = new Map();

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is only available in browser environments'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains(SAMPLES_STORE)) {
            const store = db.createObjectStore(SAMPLES_STORE, { keyPath: 'key' });
            store.createIndex('personaId', 'personaId', { unique: false });
            store.createIndex('tag', 'tag', { unique: false });
          }

          if (!db.objectStoreNames.contains(PCM_STORE)) {
            const pcmStore = db.createObjectStore(PCM_STORE, { keyPath: 'key' });
            pcmStore.createIndex('personaId', 'personaId', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  /**
   * Stores raw audio ArrayBuffer into IndexedDB.
   */
  async storeSampleBinary(
    key: string, 
    arrayBuffer: ArrayBuffer, 
    meta?: { tag?: string; lvl?: number; take?: number; personaId?: string }
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const record: CachedSampleRecord = {
        key,
        tag: meta?.tag || 'sample',
        lvl: meta?.lvl || 1,
        take: meta?.take || 1,
        personaId: meta?.personaId,
        arrayBuffer: arrayBuffer.slice(0),
        timestamp: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SAMPLES_STORE, 'readwrite');
        const store = tx.objectStore(SAMPLES_STORE);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[AudioCacheStore] Error storing sample binary:', err);
    }
  }

  /**
   * Retrieves raw audio ArrayBuffer from IndexedDB.
   */
  async getSampleBinary(key: string): Promise<ArrayBuffer | null> {
    try {
      const db = await this.getDB();
      return await new Promise<ArrayBuffer | null>((resolve, reject) => {
        const tx = db.transaction(SAMPLES_STORE, 'readonly');
        const store = tx.objectStore(SAMPLES_STORE);
        const req = store.get(key);
        req.onsuccess = () => {
          const record = req.result as CachedSampleRecord | undefined;
          resolve(record ? record.arrayBuffer : null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[AudioCacheStore] Error reading sample binary:', err);
      return null;
    }
  }

  /**
   * Stores pre-decoded PCM AudioBuffer data directly into IndexedDB,
   * enabling sub-millisecond reconstruction without AudioContext.decodeAudioData.
   */
  async storeDecodedPcm(key: string, audioBuffer: AudioBuffer, personaId?: string): Promise<void> {
    try {
      // Store in hot memory cache immediately
      this.memoryAudioBufferCache.set(key, audioBuffer);

      const db = await this.getDB();
      const channels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      const channelDataBuffers: ArrayBuffer[] = [];

      for (let ch = 0; ch < channels; ch++) {
        const f32 = audioBuffer.getChannelData(ch);
        // Copy channel data buffer
        channelDataBuffers.push(f32.buffer.slice(0));
      }

      const pcmRecord: CachedPcmRecord = {
        key,
        personaId,
        channels,
        length,
        sampleRate,
        channelData: channelDataBuffers,
        timestamp: Date.now(),
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(PCM_STORE, 'readwrite');
        const store = tx.objectStore(PCM_STORE);
        const req = store.put(pcmRecord);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('[AudioCacheStore] Error storing decoded PCM:', err);
    }
  }

  /**
   * Retrieves or reconstructs a pre-decoded AudioBuffer from hot memory or IndexedDB.
   */
  async getCachedAudioBuffer(ctx: AudioContext, key: string): Promise<AudioBuffer | null> {
    // 1. Hot memory cache check (< 0.1ms)
    if (this.memoryAudioBufferCache.has(key)) {
      return this.memoryAudioBufferCache.get(key)!;
    }

    try {
      const db = await this.getDB();
      const pcmRecord = await new Promise<CachedPcmRecord | null>((resolve, reject) => {
        const tx = db.transaction(PCM_STORE, 'readonly');
        const store = tx.objectStore(PCM_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (pcmRecord) {
        // Instant reconstruction from raw PCM float arrays
        const audioBuffer = ctx.createBuffer(
          pcmRecord.channels,
          pcmRecord.length,
          pcmRecord.sampleRate
        );
        for (let ch = 0; ch < pcmRecord.channels; ch++) {
          const f32 = new Float32Array(pcmRecord.channelData[ch]);
          audioBuffer.copyToChannel(f32, ch);
        }

        this.memoryAudioBufferCache.set(key, audioBuffer);
        return audioBuffer;
      }
    } catch (err) {
      console.warn('[AudioCacheStore] PCM cache read failed, falling back:', err);
    }

    return null;
  }

  /**
   * Alias for storeDecodedPcm
   */
  async storeAudioBuffer(key: string, audioBuffer: AudioBuffer, personaId?: string): Promise<void> {
    return this.storeDecodedPcm(key, audioBuffer, personaId);
  }

  /**
   * Alias for getCachedAudioBuffer
   */
  async getAudioBuffer(ctx: AudioContext, key: string): Promise<AudioBuffer | null> {
    return this.getCachedAudioBuffer(ctx, key);
  }

  /**
   * Pre-warms all audio assets associated with a persona into memory AudioBuffers.
   * If key audio sample URLs or paths are provided, downloads and decodes them into
   * the persistent cache if not already stored.
   * Call this on persona load or switch to eliminate voice onset and take trigger latency.
   */
  async prewarmPersona(
    personaIdOrPersona: string | { id: string; name?: string; voiceProfileId?: string },
    ctx: AudioContext,
    keySampleUrls?: Array<{ key: string; url: string } | string>
  ): Promise<{ prewarmedCount: number; durationMs: number }> {
    const startTime = performance.now();
    let prewarmedCount = 0;
    const personaId = typeof personaIdOrPersona === 'string' ? personaIdOrPersona : personaIdOrPersona.id;

    // 1. Download and decode any provided key audio samples that aren't yet cached
    if (keySampleUrls && keySampleUrls.length > 0) {
      for (const item of keySampleUrls) {
        const key = typeof item === 'string' ? `sample_${personaId}_${encodeURIComponent(item)}` : item.key;
        const url = typeof item === 'string' ? item : item.url;
        
        if (!this.memoryAudioBufferCache.has(key)) {
          try {
            // Check if already in IndexedDB first
            const existing = await this.getCachedAudioBuffer(ctx, key);
            if (existing) {
              prewarmedCount++;
              continue;
            }

            // Download and decode
            const res = await fetch(url);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
              await this.storeSampleBinary(key, arrayBuffer, { personaId });
              await this.storeDecodedPcm(key, decoded, personaId);
              prewarmedCount++;
            }
          } catch (sampleErr) {
            console.warn(`[AudioCacheStore] Failed to download/decode sample ${url}:`, sampleErr);
          }
        }
      }
    }

    // 2. Pre-warm all stored PCM buffers for this persona from IndexedDB into hot memory
    try {
      const db = await this.getDB();
      const records = await new Promise<CachedPcmRecord[]>((resolve, reject) => {
        const tx = db.transaction(PCM_STORE, 'readonly');
        const store = tx.objectStore(PCM_STORE);
        const index = store.index('personaId');
        const req = index.getAll(personaId);
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const rec of records) {
        if (!this.memoryAudioBufferCache.has(rec.key)) {
          const audioBuffer = ctx.createBuffer(rec.channels, rec.length, rec.sampleRate);
          for (let ch = 0; ch < rec.channels; ch++) {
            const f32 = new Float32Array(rec.channelData[ch]);
            audioBuffer.copyToChannel(f32, ch);
          }
          this.memoryAudioBufferCache.set(rec.key, audioBuffer);
          prewarmedCount++;
        }
      }
    } catch (err) {
      console.warn(`[AudioCacheStore] Persona pre-warming error for ${personaId}:`, err);
    }

    const durationMs = Math.round(performance.now() - startTime);
    return { prewarmedCount, durationMs };
  }

  /**
   * Pre-warms all stored PCM buffers into memory.
   */
  async prewarmAll(ctx: AudioContext): Promise<{ prewarmedCount: number; durationMs: number }> {
    const startTime = performance.now();
    let prewarmedCount = 0;

    try {
      const db = await this.getDB();
      const records = await new Promise<CachedPcmRecord[]>((resolve, reject) => {
        const tx = db.transaction(PCM_STORE, 'readonly');
        const store = tx.objectStore(PCM_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const rec of records) {
        if (!this.memoryAudioBufferCache.has(rec.key)) {
          const audioBuffer = ctx.createBuffer(rec.channels, rec.length, rec.sampleRate);
          for (let ch = 0; ch < rec.channels; ch++) {
            const f32 = new Float32Array(rec.channelData[ch]);
            audioBuffer.copyToChannel(f32, ch);
          }
          this.memoryAudioBufferCache.set(rec.key, audioBuffer);
          prewarmedCount++;
        }
      }
    } catch (err) {
      console.warn('[AudioCacheStore] Pre-warm all error:', err);
    }

    const durationMs = Math.round(performance.now() - startTime);
    return { prewarmedCount, durationMs };
  }

  /**
   * Returns cache metrics (counts and approximate byte size).
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const db = await this.getDB();
      const samples = await new Promise<CachedSampleRecord[]>((res, rej) => {
        const tx = db.transaction(SAMPLES_STORE, 'readonly');
        const req = tx.objectStore(SAMPLES_STORE).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });

      const pcmList = await new Promise<CachedPcmRecord[]>((res, rej) => {
        const tx = db.transaction(PCM_STORE, 'readonly');
        const req = tx.objectStore(PCM_STORE).getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });

      let totalBytes = 0;
      samples.forEach(s => {
        totalBytes += s.arrayBuffer?.byteLength || 0;
      });
      pcmList.forEach(p => {
        p.channelData?.forEach(buf => {
          totalBytes += buf.byteLength || 0;
        });
      });

      return {
        sampleCount: samples.length,
        pcmCount: pcmList.length,
        totalBytes,
      };
    } catch (err) {
      console.warn('[AudioCacheStore] Error getting cache stats:', err);
      return { sampleCount: 0, pcmCount: 0, totalBytes: 0 };
    }
  }

  /**
   * Completely clears the IndexedDB cache and memory buffers.
   */
  async clearAllCache(): Promise<void> {
    this.memoryAudioBufferCache.clear();
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([SAMPLES_STORE, PCM_STORE], 'readwrite');
        tx.objectStore(SAMPLES_STORE).clear();
        tx.objectStore(PCM_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('[AudioCacheStore] Error clearing cache:', err);
    }
  }
}

// Singleton Export
export const audioCacheStore = new AudioCacheStore();

// Convenience Functional Exports
export const prewarmPersona = (
  personaIdOrPersona: string | { id: string; name?: string; voiceProfileId?: string },
  ctx: AudioContext,
  keySampleUrls?: Array<{ key: string; url: string } | string>
) => audioCacheStore.prewarmPersona(personaIdOrPersona, ctx, keySampleUrls);

export const storeAudioBuffer = (key: string, buffer: AudioBuffer, personaId?: string) =>
  audioCacheStore.storeAudioBuffer(key, buffer, personaId);

export const getAudioBuffer = (ctx: AudioContext, key: string) =>
  audioCacheStore.getAudioBuffer(ctx, key);
