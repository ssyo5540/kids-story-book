"use client";

import type { Localized } from "@/lib/content/catalog";
import { LANG_INFO, LOCALE_LANG } from "@/lib/content/types";
import { useSettingsStore } from "@/lib/store/settingsStore";
import { cn } from "@/lib/utils/cn";

/** Shows the title in the family's preferred language under the English one, when it differs. */
export function NativeTitle({ title, className }: { title: Localized; className?: string }) {
  const locale = useSettingsStore((s) => s.preferredLocale);
  const lang = LOCALE_LANG[locale];
  if (lang === "en") return null;
  const native = title[lang];
  if (!native || native === title.en) return null;
  return (
    <span lang={LANG_INFO[lang].htmlLang} className={cn("font-display", className)}>
      {native}
    </span>
  );
}
