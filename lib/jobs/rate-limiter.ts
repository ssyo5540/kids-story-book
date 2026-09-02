/** Token bucket shared by every TTS request in the process. */
export class RateLimiter {
  private tokens: number;
  private lastRefill = Date.now();
  private pausedUntil = 0;
  private waiters: (() => void)[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly perMinute: number,
    private readonly burst = Math.max(1, Math.floor(perMinute / 4)),
  ) {
    this.tokens = this.burst;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 60_000;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.perMinute);
    this.lastRefill = now;
  }

  /** Pause all callers (e.g. after RESOURCE_EXHAUSTED). */
  pause(ms: number) {
    this.pausedUntil = Math.max(this.pausedUntil, Date.now() + ms);
  }

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.waiters.push(resolve);
      this.pump();
    });
  }

  private pump() {
    if (this.timer) return;
    const tick = () => {
      this.timer = null;
      this.refill();
      const now = Date.now();
      while (this.waiters.length && this.tokens >= 1 && now >= this.pausedUntil) {
        this.tokens -= 1;
        this.waiters.shift()?.();
      }
      if (this.waiters.length) {
        const waitPause = Math.max(0, this.pausedUntil - now);
        const waitToken = this.tokens >= 1 ? 0 : ((1 - this.tokens) / this.perMinute) * 60_000;
        this.timer = setTimeout(tick, Math.max(10, Math.ceil(Math.max(waitPause, waitToken))));
      }
    };
    tick();
  }
}
