"use client";

import { CloudRain, Gauge, Mic, Timer } from "lucide-react";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { AMBIENCE_LEVELS, AMBIENCE_TRACKS } from "@/lib/player/ambience";
import { engine } from "@/lib/player/engine";
import { usePlayerStore } from "@/lib/store/playerStore";
import type { PlaybackRate, SleepMinutes } from "@/lib/store/settingsStore";
import { cn } from "@/lib/utils/cn";
import { formatMinutes } from "@/lib/utils/time";

type Panel = "voice" | "sleep" | "ambience" | "speed" | null;

const RATES: PlaybackRate[] = [0.8, 0.9, 1, 1.1, 1.25];
const MINUTES: SleepMinutes[] = [10, 20, 30, 45, 60];

export function PlayerMenus({ onOpenVoices, voiceLabel }: { onOpenVoices: () => void; voiceLabel: string }) {
  const [panel, setPanel] = useState<Panel>(null);
  const sleep = usePlayerStore((s) => s.sleep);
  const ambience = usePlayerStore((s) => s.ambience);
  const rate = usePlayerStore((s) => s.rate);
  const setSleep = usePlayerStore((s) => s.setSleepTimer);
  const setAmbience = usePlayerStore((s) => s.setAmbience);
  const setRate = usePlayerStore((s) => s.setRate);
  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  const sleepLabel =
    sleep.mode === "off"
      ? "Sleep timer"
      : sleep.mode === "end"
        ? "Until the end"
        : sleep.endsAt
          ? formatMinutes(sleep.endsAt - Date.now())
          : `${sleep.minutes} min`;
  const ambLabel = AMBIENCE_TRACKS.find((t) => t.id === ambience.track)?.label ?? "Off";

  const tab = (p: Panel, icon: React.ReactNode, label: string, value: string, active: boolean) => (
    <button
      type="button"
      onClick={() => (p === "voice" ? onOpenVoices() : toggle(p))}
      aria-expanded={p !== "voice" ? panel === p : undefined}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-card px-2 py-2.5 text-center transition hover:bg-white/10",
        panel === p && "bg-white/10",
        active && "text-accent",
      )}
    >
      {icon}
      <span className="font-display text-[0.7rem] font-bold uppercase tracking-wide text-fg-muted">{label}</span>
      <span className="w-full truncate font-display text-sm font-bold">{value}</span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-card border border-line bg-white/5 p-1">
        {tab("voice", <Mic className="h-5 w-5" aria-hidden="true" />, "Voice", voiceLabel, false)}
        {tab(
          "sleep",
          <Timer className="h-5 w-5" aria-hidden="true" />,
          "Sleep",
          sleep.mode === "off" ? "Off" : sleepLabel,
          sleep.mode !== "off",
        )}
        {tab(
          "ambience",
          <CloudRain className="h-5 w-5" aria-hidden="true" />,
          "Sounds",
          ambLabel,
          ambience.track !== "none",
        )}
        {tab("speed", <Gauge className="h-5 w-5" aria-hidden="true" />, "Speed", `${rate}×`, rate !== 1)}
      </div>

      {panel === "sleep" ? (
        <div className="space-y-2 rounded-card border border-line bg-white/5 p-3">
          <p className="text-sm text-fg-muted">Stop the story after…</p>
          <div className="flex flex-wrap gap-2">
            <Chip selected={sleep.mode === "off"} onClick={() => setSleep("off")}>
              Off
            </Chip>
            {MINUTES.map((m) => (
              <Chip
                key={m}
                selected={sleep.mode === "minutes" && sleep.minutes === m}
                onClick={() => setSleep("minutes", m)}
              >
                {m} min
              </Chip>
            ))}
            <Chip selected={sleep.mode === "end"} onClick={() => setSleep("end")}>
              End of story
            </Chip>
          </div>
          {!engine.canSetVolume ? (
            <p className="text-xs text-fg-muted">
              On iPhone and iPad the story stops without fading, because Safari does not allow apps to lower the volume.
            </p>
          ) : (
            <p className="text-xs text-fg-muted">The volume fades gently over the last twenty seconds.</p>
          )}
        </div>
      ) : null}

      {panel === "ambience" ? (
        <div className="space-y-3 rounded-card border border-line bg-white/5 p-3">
          <div className="flex flex-wrap gap-2">
            {AMBIENCE_TRACKS.map((t) => (
              <Chip
                key={t.id}
                selected={ambience.track === t.id}
                onClick={() => setAmbience(t.id, ambience.level || 1)}
                title={t.blurb}
              >
                {t.label}
              </Chip>
            ))}
          </div>
          {ambience.track !== "none" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-fg-muted">Level</span>
              {AMBIENCE_LEVELS.map((l) => (
                <Chip
                  key={l.level}
                  selected={ambience.level === l.level}
                  onClick={() => setAmbience(ambience.track, l.level)}
                >
                  {l.label}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {panel === "speed" ? (
        <div className="flex flex-wrap gap-2 rounded-card border border-line bg-white/5 p-3">
          {RATES.map((r) => (
            <Chip key={r} selected={rate === r} onClick={() => setRate(r)}>
              {r === 1 ? "Normal" : `${r}×`}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
