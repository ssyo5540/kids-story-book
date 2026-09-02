import { type JobProgress, TERMINAL_STATES } from "./progress";

export type ProgressUpdater = (patch: Partial<JobProgress>) => void;

interface Entry {
  progress: JobProgress;
  run: (update: ProgressUpdater) => Promise<unknown>;
  promise: Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  started: boolean;
  finishedAt?: number;
}

/** Small in-process job queue with a concurrency limit and a progress registry. */
export class JobQueue {
  private entries = new Map<string, Entry>();
  private pending: string[] = [];
  private running = 0;
  private accepting = true;

  constructor(
    private readonly concurrency: number,
    private readonly retainMs = 10 * 60_000,
  ) {}

  /** True while a job with this id is queued or running. */
  has(id: string) {
    const e = this.entries.get(id);
    return !!e && !TERMINAL_STATES.has(e.progress.state);
  }

  get(id: string): JobProgress | undefined {
    this.sweep();
    return this.entries.get(id)?.progress;
  }

  list(): JobProgress[] {
    this.sweep();
    return [...this.entries.values()].map((e) => e.progress);
  }

  get stats() {
    return { queued: this.pending.length, running: this.running };
  }

  stopAccepting() {
    this.accepting = false;
  }

  /** Enqueue (or attach to an existing active job with the same id). */
  enqueue<T>(
    initial: JobProgress,
    run: (update: ProgressUpdater) => Promise<T>,
  ): { progress: JobProgress; promise: Promise<T> } {
    const existing = this.entries.get(initial.jobId);
    if (existing && !TERMINAL_STATES.has(existing.progress.state))
      return { progress: existing.progress, promise: existing.promise as Promise<T> };
    if (!this.accepting) throw new Error("queue is shutting down");

    let resolve!: (v: unknown) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    promise.catch(() => undefined); // nobody may await it; avoid unhandled rejections
    const entry: Entry = { progress: initial, run, promise, resolve, reject, started: false };
    this.entries.set(initial.jobId, entry);
    this.pending.push(initial.jobId);
    this.pump();
    return { progress: entry.progress, promise: promise as Promise<T> };
  }

  private pump() {
    while (this.running < this.concurrency && this.pending.length) {
      const id = this.pending.shift();
      if (!id) break;
      const entry = this.entries.get(id);
      if (!entry || entry.started) continue;
      entry.started = true;
      this.running++;
      const update: ProgressUpdater = (patch) => {
        Object.assign(entry.progress, patch, { updatedAt: new Date().toISOString() });
      };
      entry
        .run(update)
        .then((v) => {
          entry.resolve(v);
        })
        .catch((e) => {
          if (!TERMINAL_STATES.has(entry.progress.state)) update({ state: "failed", error: (e as Error).message });
          entry.reject(e);
        })
        .finally(() => {
          entry.finishedAt = Date.now();
          this.running--;
          this.pump();
        });
    }
  }

  private sweep() {
    const now = Date.now();
    for (const [id, e] of this.entries) if (e.finishedAt && now - e.finishedAt > this.retainMs) this.entries.delete(id);
  }

  /** Wait for running jobs to finish (used on SIGTERM). */
  async drain(timeoutMs: number): Promise<boolean> {
    this.stopAccepting();
    this.pending = [];
    const deadline = Date.now() + timeoutMs;
    while (this.running > 0 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    return this.running === 0;
  }
}
