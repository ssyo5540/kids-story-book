import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  leading?: ReactNode;
  tone?: "default" | "indian" | "greek" | "egyptian";
}

const tones = {
  default: "data-[selected=true]:bg-accent data-[selected=true]:text-accent-ink data-[selected=true]:border-accent",
  indian:
    "data-[selected=true]:bg-myth-indian data-[selected=true]:text-night-950 data-[selected=true]:border-myth-indian",
  greek:
    "data-[selected=true]:bg-myth-greek data-[selected=true]:text-night-950 data-[selected=true]:border-myth-greek",
  egyptian:
    "data-[selected=true]:bg-myth-egyptian data-[selected=true]:text-night-950 data-[selected=true]:border-myth-egyptian",
};

export function Chip({ selected = false, leading, tone = "default", className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      data-selected={selected}
      aria-pressed={rest.role ? undefined : selected}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-pill border border-line bg-white/5 px-3.5 font-display text-sm font-bold text-fg transition hover:bg-white/10",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
    </button>
  );
}
