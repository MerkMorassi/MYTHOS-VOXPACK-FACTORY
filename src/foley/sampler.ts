import { VOXPACK_FOLEY_CONFIG } from "./config";

export class BrowserFoleySampler {
  private audioCtx: AudioContext;
  private bufferCache: Record<string, AudioBuffer> = {};
  private activeNodes: Map<number, { sourceNode: AudioScheduledSourceNode, gainNode: GainNode }[]> = new Map();
  private lastAssetIndex: Record<string, number> = {};

  constructor(audioContext: AudioContext) {
    this.audioCtx = audioContext;
  }

  /**
   * Batch load assets with tag/url manifest.
   */
  async batchLoadAssets(assets: { tag: string; url: string }[]): Promise<void> {
    await Promise.all(assets.map(asset => this.loadSample(asset.url)));
  }

  async loadSample(url: string): Promise<void> {
    if (this.bufferCache[url]) return;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.bufferCache[url] = await this.audioCtx.decodeAudioData(arrayBuffer);
  }

  schedulePlay(tag: string, startOffsetSeconds: number, momentum: number = 1.0): void {
    const assetConfig = VOXPACK_FOLEY_CONFIG.foley_matrix[tag];
    if (!assetConfig || assetConfig.assets.length === 0) return;

    const url = this.selectAsset(tag, assetConfig);
    const buffer = this.bufferCache[url];
    if (!buffer) return;

    const targetTime = this.audioCtx.currentTime + startOffsetSeconds;
    const crossfadeDuration = VOXPACK_FOLEY_CONFIG.global.crossfadeMs / 1000;

    this.enforceChokeGroups(assetConfig.choke_group, targetTime, crossfadeDuration);

    const bufferSource = this.audioCtx.createBufferSource();
    bufferSource.buffer = buffer;

    const gainNode = this.audioCtx.createGain();
    
    // Apply crossfade in
    gainNode.gain.setValueAtTime(0, targetTime);
    gainNode.gain.linearRampToValueAtTime(1, targetTime + crossfadeDuration);

    const dbOffset = Math.random() * (assetConfig.volumeRangeDb[1] - assetConfig.volumeRangeDb[0]) + assetConfig.volumeRangeDb[0];
    const linearGain = Math.pow(10, dbOffset / 20);
    gainNode.gain.setValueAtTime(linearGain, targetTime + crossfadeDuration);

    // Apply momentum modulation if tag relates to breathing/panting
    const isBreath = tag.includes('gasp') || tag.includes('pant') || tag.includes('sigh');
    const momentumFactor = isBreath ? momentum : 1.0;

    const centsOffset = Math.random() * (assetConfig.pitchRandomCents[1] - assetConfig.pitchRandomCents[0]) + assetConfig.pitchRandomCents[0];
    bufferSource.playbackRate.setValueAtTime(Math.pow(2, centsOffset / 1200) * momentumFactor, targetTime);

    bufferSource.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    bufferSource.start(targetTime);

    this.trackActiveNode(assetConfig.choke_group, bufferSource, gainNode);
  }

  scheduleIdlePresence(): void {
    if (!VOXPACK_FOLEY_CONFIG.idle_presence_engine.enabled) return;
    const pool = VOXPACK_FOLEY_CONFIG.idle_presence_engine.presence_pool;
    const url = pool[Math.floor(Math.random() * pool.length)];
    const buffer = this.bufferCache[url];
    if (!buffer) return;

    const bufferSource = this.audioCtx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.connect(this.audioCtx.destination);
    bufferSource.start();
  }

  private selectAsset(tag: string, config: any): string {
    if (config.pool_selection === "sequential_round_robin") {
      const idx = (this.lastAssetIndex[tag] || -1) + 1;
      this.lastAssetIndex[tag] = idx % config.assets.length;
      return config.assets[this.lastAssetIndex[tag]];
    } else {
      let idx;
      do {
        idx = Math.floor(Math.random() * config.assets.length);
      } while (idx === this.lastAssetIndex[tag] && config.assets.length > 1);
      this.lastAssetIndex[tag] = idx;
      return config.assets[idx];
    }
  }

  private enforceChokeGroups(chokeGroup: number, targetTime: number, crossfade: number): void {
    const nodes = this.activeNodes.get(chokeGroup) || [];
    nodes.forEach(node => {
      try { 
        node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, targetTime);
        node.gainNode.gain.linearRampToValueAtTime(0, targetTime + crossfade);
        node.sourceNode.stop(targetTime + crossfade); 
      } catch (e) {}
    });
    this.activeNodes.set(chokeGroup, []);
  }

  private trackActiveNode(chokeGroup: number, sourceNode: AudioScheduledSourceNode, gainNode: GainNode): void {
    if (!this.activeNodes.has(chokeGroup)) this.activeNodes.set(chokeGroup, []);
    this.activeNodes.get(chokeGroup)!.push({ sourceNode, gainNode });
  }
}
