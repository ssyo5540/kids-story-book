import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-night-950/70 px-2 py-0.5 font-display text-xs font-bold text-star backdrop-blur-sm",
        className,
      )}
      {...rest}
    />
  );
}
