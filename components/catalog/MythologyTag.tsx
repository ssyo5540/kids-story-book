import type { Mythology } from "@/lib/content/types";
import { cn } from "@/lib/utils/cn";

export const MYTH_LABEL: Record<Mythology, string> = { indian: "Indian", greek: "Greek", egyptian: "Egyptian" };
export const MYTH_DOT: Record<Mythology, string> = {
  indian: "bg-myth-indian",
  greek: "bg-myth-greek",
  egyptian: "bg-myth-egyptian",
};

export function MythologyTag({ m, className }: { m: Mythology; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-fg-muted",
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", MYTH_DOT[m])} aria-hidden="true" />
      {MYTH_LABEL[m]}
    </span>
  );
}
