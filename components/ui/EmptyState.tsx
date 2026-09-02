import type { ReactNode } from "react";
import { SleepyMoon } from "@/components/ui/SleepyMoon";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-white/5 px-6 py-10 text-center">
      <SleepyMoon className="h-16 w-16" />
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {body ? <p className="max-w-sm text-fg-muted">{body}</p> : null}
      {action}
    </div>
  );
}
