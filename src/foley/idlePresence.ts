import { BrowserFoleySampler } from './sampler';
import { VOXPACK_FOLEY_CONFIG } from './config';

export class IdlePresenceGenerator {
  private sampler: BrowserFoleySampler;
  private timer: number | null = null;
  private isEnabled: boolean = false;
  private isIdle: () => boolean;

  constructor(sampler: BrowserFoleySampler, isIdle: () => boolean) {
    this.sampler = sampler;
    this.isIdle = isIdle;
  }

  start() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.scheduleNext();
  }

  stop() {
    this.isEnabled = false;
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext() {
    if (!this.isEnabled) return;
    const { minimum_interval_seconds, maximum_interval_seconds } = VOXPACK_FOLEY_CONFIG.idle_presence_engine;
    const delay = Math.random() * (maximum_interval_seconds - minimum_interval_seconds) + minimum_interval_seconds;
    
    this.timer = window.setTimeout(() => {
      if (this.isIdle()) {
        this.sampler.scheduleIdlePresence();
      }
      this.scheduleNext();
    }, delay * 1000);
  }
}
