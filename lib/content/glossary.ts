import { LANGS, type Lang } from "./types";

export type Glossary = Record<string, Partial<Record<Lang, string>>>;

/**
 * Parse GLOSSARY.md: the first Markdown table with a header row containing `key` and language codes.
 * Returns { key: { en: "Arjuna", te: "...", ... } }.
 */
export function parseGlossary(md: string): Glossary {
  const lines = md.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  const out: Glossary = {};
  let header: string[] | null = null;
  for (const line of lines) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (!header) {
      if (cells.map((c) => c.toLowerCase()).includes("key")) header = cells.map((c) => c.toLowerCase());
      continue;
    }
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    const key = cells[header.indexOf("key")];
    if (!key) continue;
    const entry: Partial<Record<Lang, string>> = {};
    for (const lang of LANGS) {
      const idx = header.indexOf(lang);
      const v = idx >= 0 ? cells[idx] : "";
      if (v && v !== "-") entry[lang] = v;
    }
    out[key] = entry;
  }
  return out;
}
