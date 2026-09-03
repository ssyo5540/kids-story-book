import { describe, expect, it } from "vitest";
import type { JobProgress } from "@/lib/jobs/progress";
import { JobQueue } from "@/lib/jobs/queue";
import { RateLimiter } from "@/lib/jobs/rate-limiter";

const initial = (id: string): JobProgress => ({
  jobId: id,
  storyId: "s",
  locale: "en-IN",
  voice: "Aoede",
  state: "queued",
  chunksDone: 0,
  chunksTotal: 1,
  percent: 0,
  etaSeconds: 1,
  startedAt: "",
  updatedAt: "",
});

describe("JobQueue", () => {
  it("limits concurrency, dedupes by id and records terminal states", async () => {
    const q = new JobQueue(1);
    let running = 0;
    let peak = 0;
    const make = (id: string) =>
      q.enqueue(initial(id), async (update) => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 20));
        update({ state: "ready", percent: 100 });
        running--;
        return id;
      });
    const a = make("a");
    const b = make("b");
    const dup = make("a");
    expect(dup.progress).toBe(a.progress);
    expect(q.stats.queued).toBe(1);
    await Promise.all([a.promise, b.promise]);
    expect(peak).toBe(1);
    expect(q.get("a")?.state).toBe("ready");
  });

  it("marks failures", async () => {
    const q = new JobQueue(2);
    const { promise } = q.enqueue(initial("x"), async () => {
      throw new Error("boom");
    });
    await expect(promise).rejects.toThrow("boom");
    expect(q.get("x")?.state).toBe("failed");
    expect(q.get("x")?.error).toBe("boom");
  });
});

describe("RateLimiter", () => {
  it("grants tokens up to the burst immediately, then paces", async () => {
    const limiter = new RateLimiter(6000, 2); // 100 per second, burst 2
    const t0 = Date.now();
    await limiter.acquire();
    await limiter.acquire();
    expect(Date.now() - t0).toBeLessThan(50);
    await limiter.acquire();
    expect(Date.now() - t0).toBeGreaterThanOrEqual(8);
  });
});

describe("JobQueue shutdown", () => {
  it("fails jobs that never started so pollers do not wait forever, and stops accepting", async () => {
    const q = new JobQueue(1);
    const slow = q.enqueue(initial("running"), async (update) => {
      await new Promise((r) => setTimeout(r, 60));
      update({ state: "ready", percent: 100 });
    });
    const waiting = q.enqueue(initial("waiting"), async () => undefined);
    waiting.promise.catch(() => undefined);
    const drained = await q.drain(1000);
    expect(drained).toBe(true);
    expect(q.isAccepting).toBe(false);
    expect(q.get("waiting")?.state).toBe("failed");
    expect(q.get("running")?.state).toBe("ready");
    await slow.promise;
    expect(() => q.enqueue(initial("late"), async () => undefined)).toThrow(/shutting down/);
  });
});
