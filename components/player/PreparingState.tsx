"use client";

import { Button } from "@/components/ui/Button";
import { SleepyMoon } from "@/components/ui/SleepyMoon";
import { usePlayerStore } from "@/lib/store/playerStore";

export function ProgressRing({ percent, className }: { percent: number; className?: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(100, Math.max(0, percent)) / 100)}
        transform="rotate(-90 28 28)"
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

function describeRetryAfter(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "later";
  const hours = (at.getTime() - Date.now()) / 3600_000;
  if (hours < 1) return "within the hour";
  if (hours < 20) return "tomorrow";
  return `on ${at.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`;
}

export function PreparingState({ personaName }: { personaName: string }) {
  const preparing = usePlayerStore((s) => s.preparing);
  const status = usePlayerStore((s) => s.status);
  const error = usePlayerStore((s) => s.error);
  const playDefault = usePlayerStore((s) => s.playDefaultInstead);
  const cancel = usePlayerStore((s) => s.cancelPreparing);
  const now = usePlayerStore((s) => s.now);
  const load = usePlayerStore((s) => s.load);

  if (status === "error" && error) {
    const gentle = error.code === "budget" || error.code === "disabled";
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-card border border-line bg-white/5 p-5 text-center"
        role="alert"
      >
        <SleepyMoon className="h-14 w-14" />
        <p className="font-display text-lg font-bold">
          {gentle ? "This voice is resting tonight" : "Something went wrong"}
        </p>
        <p className="text-sm text-fg-muted">
          {error.message}
          {error.retryAfter ? ` It should be back ${describeRetryAfter(error.retryAfter)}.` : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {error.fallback ? <Button onClick={() => void playDefault()}>Play in the default voice</Button> : null}
          {!gentle && now ? (
            <Button
              variant="secondary"
              onClick={() => void load(now.story, now.ref, { autoplay: true, startAt: "resume" })}
            >
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  // The browser refused to start audio after the wait (autoplay policy): a tap on Play is all that is needed.
  if (status === "paused" && error?.code === "autoplay") {
    return (
      <output className="block rounded-card border border-line bg-white/5 px-4 py-3 text-center text-sm text-fg-muted">
        {personaName} is ready. Tap play to start the story.
      </output>
    );
  }

  if (status !== "preparing" && status !== "loading") return null;
  const job = preparing?.job;
  const percent = job?.percent ?? 2;
  const eta = job?.etaSeconds;
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-card border border-line bg-white/5 p-5 text-center"
      aria-live="polite"
    >
      <div className="relative h-16 w-16 text-accent">
        <ProgressRing percent={percent} className="h-16 w-16" />
        <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-fg">
          {Math.round(percent)}%
        </span>
      </div>
      <p className="font-display text-lg font-bold">Preparing {personaName}'s voice…</p>
      <p className="text-sm text-fg-muted">
        {eta ? `About ${eta} seconds. ` : ""}The first listen takes a moment; after that it is instant.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {preparing?.fallback ? (
          <Button variant="secondary" size="sm" onClick={() => void playDefault()}>
            Play in the default voice instead
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
