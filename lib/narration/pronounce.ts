import { promises as fs } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { getConfig } from "@/lib/config";
import { type PronunciationsFile, pronunciationsFileSchema } from "@/lib/content/schema";
import type { IpaEntry } from "./types";

export interface PronunciationTable {
  respell: Record<string, string>;
  ipa: Record<string, string>;
}

const EMPTY: PronunciationTable = { respell: {}, ipa: {} };

let cached: Promise<PronunciationsFile> | null = null;

export function loadPronunciations(contentDir = getConfig().CONTENT_DIR): Promise<PronunciationsFile> {
  if (!cached) {
    cached = (async () => {
      const file = path.join(contentDir, "voices", "pronunciations.yaml");
      try {
        const raw = parseYaml(await fs.readFile(file, "utf8"));
        return pronunciationsFileSchema.parse(raw ?? {});
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return { locales: {} };
        throw e;
      }
    })();
  }
  return cached;
}

export function tableForLocale(file: PronunciationsFile, locale: string): PronunciationTable {
  return file.locales[locale] ?? EMPTY;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary respelling that works for Latin and Indic scripts (letters + combining marks). */
export function applyRespell(text: string, respell: Record<string, string>): string {
  let out = text;
  for (const [from, to] of Object.entries(respell)) {
    if (!from) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{M}])${escapeRegExp(from)}(?![\\p{L}\\p{M}])`, "gu");
    out = out.replace(re, to);
  }
  return out;
}

export function collectIpa(text: string, ipa: Record<string, string>): IpaEntry[] {
  const entries: IpaEntry[] = [];
  for (const [phrase, value] of Object.entries(ipa)) {
    if (phrase && text.includes(phrase)) entries.push({ phrase, ipa: value });
  }
  return entries;
}

export function resetPronunciationsForTests() {
  cached = null;
}
