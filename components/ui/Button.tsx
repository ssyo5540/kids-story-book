import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "paper" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
  pill?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-105 active:brightness-95 shadow-lift",
  secondary: "bg-night-700 text-fg hover:bg-night-600 border border-line",
  ghost: "bg-transparent text-fg hover:bg-white/10",
  paper: "paper hover:brightness-[0.98] border border-paper-300",
  danger: "bg-berry-500 text-white hover:brightness-105",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-tap px-4 text-base gap-2",
  lg: "h-14 px-6 text-lg gap-2.5",
  xl: "h-[5.5rem] w-[5.5rem] p-0 text-2xl justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  pill = true,
  leading,
  trailing,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center font-display font-bold transition select-none disabled:opacity-50 disabled:pointer-events-none",
        pill ? "rounded-pill" : "rounded-card",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
      {trailing}
    </button>
  );
}
