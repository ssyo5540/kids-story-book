"use client";

import { Moon, SunMedium } from "lucide-react";
import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settingsStore";

/** Night-dim toggle. Also applies the `data-dim` attribute whenever the setting changes. */
export function DimToggle() {
  const dim = useSettingsStore((s) => s.dim);
  const toggle = useSettingsStore((s) => s.toggleDim);
  useEffect(() => {
    document.documentElement.dataset.dim = dim ? "true" : "false";
  }, [dim]);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dim}
      aria-label={dim ? "Turn night dim off" : "Turn night dim on"}
      title={dim ? "Night dim is on" : "Night dim"}
      className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-fg-muted transition hover:bg-white/10 hover:text-fg"
    >
      {dim ? <SunMedium className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}
