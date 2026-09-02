import { promises as fs } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { getConfig } from "@/lib/config";
import { type LocaleVoices, type VoicesFile, voicesFileSchema } from "@/lib/content/schema";
import { LOCALE_INFO, LOCALE_LANG, LOCALES, type Locale, REGIONS, type RegionId } from "@/lib/content/types";

let cached: Promise<VoicesFile> | null = null;

export function loadVoices(contentDir = getConfig().CONTENT_DIR): Promise<VoicesFile> {
  if (!cached) {
    cached = fs
      .readFile(path.join(contentDir, "voices", "voices.yaml"), "utf8")
      .then((raw) => voicesFileSchema.parse(parseYaml(raw)));
  }
  return cached;
}

export function resetVoicesForTests() {
  cached = null;
}

export function voiceId(locale: Locale, name: string): string {
  return `${locale}-Chirp3-HD-${name}`;
}

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

export function localeVoices(file: VoicesFile, locale: Locale): LocaleVoices {
  return file.locales[locale];
}

/** Resolve "default" or a voice name; throws on unknown voice. */
export function resolveVoiceName(file: VoicesFile, locale: Locale, voice: string): string {
  const lv = localeVoices(file, locale);
  const name = voice === "default" ? lv.default : voice;
  if (!file.chirpVoices.some((v) => v.name === name)) throw new Error(`unknown voice "${voice}" for ${locale}`);
  return name;
}

export interface PublicVoice {
  name: string;
  id: string;
  gender: "female" | "male";
  displayName: string;
  displayNameLatin: string;
  blurb: string;
  avatar: string;
  isDefault: boolean;
  previewUrl: string;
}

export interface PublicLocaleVoices {
  locale: Locale;
  lang: string;
  label: string;
  nativeLabel: string;
  hint: string;
  default: string;
  audioQuality: "stable" | "beta";
  voices: PublicVoice[];
}

export interface PublicVoicesCatalog {
  regions: { id: RegionId; label: string; locales: Locale[] }[];
  locales: Record<Locale, PublicLocaleVoices>;
}

export function toPublicVoices(
  file: VoicesFile,
  previewUrl: (locale: Locale, voice: string) => string,
): PublicVoicesCatalog {
  const locales = {} as Record<Locale, PublicLocaleVoices>;
  for (const locale of LOCALES) {
    const lv = file.locales[locale];
    const info = LOCALE_INFO[locale];
    locales[locale] = {
      locale,
      lang: LOCALE_LANG[locale],
      label: info.label,
      nativeLabel: info.nativeLabel,
      hint: info.hint,
      default: lv.default,
      audioQuality: lv.audioQuality,
      voices: file.chirpVoices.map((v) => {
        const persona = lv.personas[v.name];
        return {
          name: v.name,
          id: voiceId(locale, v.name),
          gender: v.gender,
          displayName: persona?.displayName ?? v.name,
          displayNameLatin: persona?.displayNameLatin ?? persona?.displayName ?? v.name,
          blurb: persona?.blurb ?? "",
          avatar: persona?.avatar ?? v.name.toLowerCase(),
          isDefault: v.name === lv.default,
          previewUrl: previewUrl(locale, v.name),
        };
      }),
    };
  }
  return { regions: REGIONS.map((r) => ({ id: r.id, label: r.label, locales: r.locales })), locales };
}
