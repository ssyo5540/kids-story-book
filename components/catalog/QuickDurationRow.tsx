import Link from "next/link";
import { DURATION_CLASSES } from "@/lib/content/types";
import { formatDurationClass } from "@/lib/utils/time";
import { MoonPhase } from "./DurationBadge";

export function QuickDurationRow() {
  return (
    <section aria-labelledby="quick-duration" className="space-y-3">
      <h2 id="quick-duration" className="font-display text-xl font-extrabold">
        How long until lights out?
      </h2>
      <ul className="grid grid-cols-4 gap-2 sm:gap-3">
        {DURATION_CLASSES.map((d) => (
          <li key={d}>
            <Link
              href={`/collections?duration=${d}`}
              className="flex h-20 flex-col items-center justify-center gap-1 rounded-card border border-line bg-white/5 font-display font-bold text-fg transition hover:border-accent hover:bg-white/10 sm:h-24"
            >
              <MoonPhase d={d} className="h-7 w-7 text-moon" />
              <span className="text-sm sm:text-base">{formatDurationClass(d)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
