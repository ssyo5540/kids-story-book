"use client";

import { Download, Smartphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { LOCALE_INFO } from "@/lib/content/types";
import { personaFor, useVoices } from "@/lib/hooks/useVoices";
import { AMBIENCE_LEVELS, AMBIENCE_TRACKS } from "@/lib/player/ambience";
import { useInstall } from "@/lib/pwa/install";
import { useLibraryStore } from "@/lib/store/libraryStore";
import { type PlaybackRate, type SleepMinutes, useSettingsStore } from "@/lib/store/settingsStore";

const RATES: PlaybackRate[] = [0.8, 0.9, 1, 1.1, 1.25];
const MINUTES: SleepMinutes[] = [10, 20, 30, 45, 60];

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-card border border-line bg-white/5 p-4 sm:p-5">
      <div>
        <h2 className="font-display text-lg font-extrabold">{title}</h2>
        {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-pill transition ${checked ? "bg-accent" : "bg-white/20"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-paper-50 shadow transition ${checked ? "left-7" : "left-1"}`}
        />
      </button>
    </label>
  );
}

export function SettingsForm() {
  const s = useSettingsStore();
  const clearLibrary = useLibraryStore((l) => l.clearAll);
  const { data: voices } = useVoices();
  const { state: install, prompt } = useInstall();
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => setUsage({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
      .catch(() => undefined);
  }, []);

  const persona = personaFor(voices, s.preferredLocale, s.preferredVoiceByLocale[s.preferredLocale] ?? "default");

  return (
    <div className="space-y-5">
      <Section title="Narrator" hint="Stories open in this language and voice. You can still switch inside the player.">
        <p>
          <span className="font-bold">{persona?.displayNameLatin ?? "Default voice"}</span> ·{" "}
          {LOCALE_INFO[s.preferredLocale].label}
          {LOCALE_INFO[s.preferredLocale].lang === "en" ? ` (${LOCALE_INFO[s.preferredLocale].hint})` : ""}
        </p>
        <Link href="/voices">
          <Button variant="secondary">Change narrator</Button>
        </Link>
      </Section>

      <Section title="Bedtime" hint="Defaults applied when a story starts.">
        <div className="space-y-2">
          <p className="text-sm text-fg-muted">Sleep timer</p>
          <div className="flex flex-wrap gap-2">
            <Chip selected={s.defaultSleep.mode === "off"} onClick={() => s.setDefaultSleep("off")}>
              Off
            </Chip>
            {MINUTES.map((m) => (
              <Chip
                key={m}
                selected={s.defaultSleep.mode === "minutes" && s.defaultSleep.minutes === m}
                onClick={() => s.setDefaultSleep("minutes", m)}
              >
                {m} min
              </Chip>
            ))}
            <Chip selected={s.defaultSleep.mode === "end"} onClick={() => s.setDefaultSleep("end")}>
              End of story
            </Chip>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-fg-muted">Background sounds</p>
          <div className="flex flex-wrap gap-2">
            {AMBIENCE_TRACKS.map((t) => (
              <Chip
                key={t.id}
                selected={s.defaultAmbience.track === t.id}
                onClick={() => s.setDefaultAmbience(t.id, s.defaultAmbience.level || 1)}
              >
                {t.label}
              </Chip>
            ))}
          </div>
          {s.defaultAmbience.track !== "none" ? (
            <div className="flex flex-wrap gap-2">
              {AMBIENCE_LEVELS.map((l) => (
                <Chip
                  key={l.level}
                  selected={s.defaultAmbience.level === l.level}
                  onClick={() => s.setDefaultAmbience(s.defaultAmbience.track, l.level)}
                >
                  {l.label}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-fg-muted">Reading speed</p>
          <div className="flex flex-wrap gap-2">
            {RATES.map((r) => (
              <Chip key={r} selected={s.defaultRate === r} onClick={() => s.setDefaultRate(r)}>
                {r === 1 ? "Normal" : `${r}×`}
              </Chip>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Screen">
        <Toggle checked={s.dim} onChange={s.setDim} label="Night dim (softer colours for dark rooms)" />
        <Toggle
          checked={s.parentGateEnabled}
          onChange={s.setParentGateEnabled}
          label="Ask grown-ups to press and hold before opening settings"
        />
      </Section>

      <Section
        title="Install the app"
        hint="Adds Nightlight Tales to your home screen with lock-screen controls and offline stories."
      >
        {install.kind === "installed" ? <p className="text-sm text-leaf-500">Installed. Thank you!</p> : null}
        {install.kind === "prompt" ? (
          <Button
            leading={<Smartphone className="h-5 w-5" aria-hidden="true" />}
            onClick={() => void prompt().then((ok) => ok && toast("Installed"))}
          >
            Install
          </Button>
        ) : null}
        {install.kind === "ios-manual" ? (
          <p className="text-sm text-fg-muted">
            On iPhone and iPad: open this page in Safari, tap the <span className="font-bold">Share</span> button, then{" "}
            <span className="font-bold">Add to Home Screen</span>. Stories you download will stay put in the installed
            app.
          </p>
        ) : null}
        {install.kind === "unsupported" ? (
          <p className="text-sm text-fg-muted">
            Your browser will offer to install once it has visited a few pages, or use its menu: Install app.
          </p>
        ) : null}
      </Section>

      <Section title="Storage" hint="Downloads and preferences live only on this device.">
        {usage ? (
          <p className="text-sm text-fg-muted">
            Using {(usage.usage / 1_048_576).toFixed(1)} MB
            {usage.quota ? ` of about ${Math.round(usage.quota / 1_048_576).toLocaleString()} MB available` : ""}.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Link href="/downloads">
            <Button variant="secondary" leading={<Download className="h-5 w-5" aria-hidden="true" />}>
              Manage downloads
            </Button>
          </Link>
          <Button
            variant="ghost"
            leading={<Trash2 className="h-5 w-5" aria-hidden="true" />}
            onClick={() => {
              if (window.confirm("Forget favourites, recent stories and listening positions on this device?")) {
                clearLibrary();
                toast("Cleared");
              }
            }}
          >
            Clear history
          </Button>
        </div>
      </Section>

      <p className="text-center text-sm text-fg-muted">
        <Link href="/about" className="underline hover:text-fg">
          About, credits and privacy
        </Link>
      </p>
    </div>
  );
}
