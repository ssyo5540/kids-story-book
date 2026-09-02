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

/**
 * Inflected names (Tamil "தருமரை", Malayalam "യുധിഷ്ഠിരനെ", Telugu "అర్జునుడి") do not contain the
 * nominative canonical spelling verbatim. Return the canonical plus a short stem so a text passes when it
 * uses the name in any common case form.
 */
export function glossaryStems(canonical: string, lang: Lang): string[] {
  const out = new Set<string>([canonical]);
  const strip = (re: RegExp) => {
    const stem = canonical.replace(re, "");
    if (stem !== canonical && [...stem].length >= 3) out.add(stem);
  };
  switch (lang) {
    case "ta":
      strip(/\u0BCD$/u); // final pulli: தருமர் -> தருமர
      break;
    case "ml":
      strip(/[\u0D7A-\u0D7F]$/u); // chillu: യുധിഷ്ഠിരൻ -> യുധിഷ്ഠിര
      strip(/(ൻ|ർ|ൽ|ൾ|ൺ|ൿ)$/u);
      break;
    case "te":
      strip(/డు$/u); // అర్జునుడు -> అర్జును (matches అర్జునుడి, అర్జునుడు)
      break;
    case "kn":
      strip(/ನು$/u);
      break;
    default:
      break;
  }
  return [...out];
}

export function textHasGlossaryName(text: string, canonical: string, lang: Lang): boolean {
  return glossaryStems(canonical, lang).some((stem) => text.includes(stem));
}
