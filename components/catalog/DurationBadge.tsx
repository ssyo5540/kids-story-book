import type { DurationClass } from "@/lib/content/types";
import { cn } from "@/lib/utils/cn";
import { formatDurationClass } from "@/lib/utils/time";

/** Moon-phase icon: crescent (5), half (15), gibbous (30), full (60). */
export function MoonPhase({ d, className }: { d: DurationClass; className?: string }) {
  const id = `mp-${d}`;
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <circle cx="12" cy="12" r="10" />
        </clipPath>
      </defs>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.25" />
      <g clipPath={`url(#${id})`} fill="currentColor">
        {d === 5 ? <path d="M12 2a10 10 0 1 0 0 20 8 8 0 1 1 0-20z" /> : null}
        {d === 15 ? <rect x="12" y="2" width="12" height="20" /> : null}
        {d === 30 ? <path d="M12 2v20a10 10 0 0 0 0-20zM12 2a4 10 0 1 0 0 20V2z" /> : null}
        {d === 60 ? <circle cx="12" cy="12" r="10" /> : null}
      </g>
    </svg>
  );
}

export function DurationBadge({ d, className }: { d: DurationClass; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-night-950/75 px-2 py-0.5 font-display text-xs font-bold text-star backdrop-blur-sm",
        className,
      )}
    >
      <MoonPhase d={d} />
      {formatDurationClass(d)}
    </span>
  );
}
