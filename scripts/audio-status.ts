import "./_env";
import { parseArgs } from "node:util";
import type { RenditionManifest } from "@/lib/audio/manifest";
import { LOCALE_LANG, LOCALES } from "@/lib/content/types";
import { CHARS_PER_SECOND } from "@/lib/narration/estimate";
import { buildPlan } from "@/lib/renditions/plan";
import { ensureRuntimeReady } from "@/lib/runtime";
import { collectionTitle, fmtInt, loadCliCatalog } from "./_cli";

const { values } = parseArgs({
  options: { json: { type: "boolean", default: false }, calibrate: { type: "boolean", default: false } },
});

async function main() {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const catalog = await loadCliCatalog(true);
  await rt.ledger.refreshOthers(true);
  const snap = rt.ledger.snapshot();
  const all = rt.index.all();

  const missingDefaults: string[] = [];
  const stale: string[] = [];
  const currentKeys = new Set<string>();
  for (const story of catalog.stories) {
    for (const locale of LOCALES) {
      if (!story.texts[LOCALE_LANG[locale]]) continue;
      for (const v of voices.chirpVoices) {
        const plan = await buildPlan(story, collectionTitle(catalog, story), locale, v.name, voices);
        const key = `audio/${story.meta.id}/${locale}/${v.name}/${plan.renditionHash}`;
        currentKeys.add(key);
        if (v.name === voices.locales[locale].default && !rt.index.peek(key))
          missingDefaults.push(`${story.meta.id} ${locale}`);
      }
    }
  }
  for (const r of all) if (!currentKeys.has(r.key)) stale.push(r.key);

  const staleTranslations = catalog.stories.flatMap((s) =>
    Object.values(s.texts)
      .filter((t) => t?.stale)
      .map((t) => `${s.meta.id} ${t?.lang}`),
  );

  const report = {
    driver: rt.tts.name,
    storage: rt.storage.name,
    budget: snap,
    renditions: {
      total: all.length,
      byLocale: Object.fromEntries(LOCALES.map((l) => [l, all.filter((r) => r.locale === l).length])),
    },
    missingDefaults,
    staleRenditions: stale,
    staleTranslations,
  };
  if (values.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`driver=${report.driver} storage=${report.storage}`);
    console.log(
      `budget ${snap.month}: used ${fmtInt(snap.used)} (today ${fmtInt(snap.usedToday)}), reserved ${fmtInt(snap.reserved)}, remaining ${fmtInt(snap.remaining)} of ${fmtInt(snap.monthlyBudget)}`,
    );
    for (const w of snap.writers) console.log(`  ${w.writerId}: ${fmtInt(w.chars)}`);
    console.log(
      `renditions: ${all.length} total — ${Object.entries(report.renditions.byLocale)
        .map(([l, n]) => `${l}:${n}`)
        .join("  ")}`,
    );
    console.log(
      `missing default renditions: ${missingDefaults.length}${missingDefaults.length ? `\n  ${missingDefaults.join("\n  ")}` : ""}`,
    );
    console.log(`stale renditions (text changed): ${stale.length}${stale.length ? `\n  ${stale.join("\n  ")}` : ""}`);
    console.log(
      `stale translations: ${staleTranslations.length}${staleTranslations.length ? `\n  ${staleTranslations.join("\n  ")}` : ""}`,
    );
  }

  if (values.calibrate) {
    const perLang: Record<string, { chars: number; ms: number }> = {};
    for (const r of all) {
      const m = await rt.storage.getJson<RenditionManifest>(`${r.key}.json`);
      if (!m) continue;
      const speech = m.chunks.reduce((n, c) => n + (c.endMs - c.startMs), 0);
      const chars = m.chunks.reduce((n, c) => n + c.chars, 0);
      const e = perLang[m.lang] ?? { chars: 0, ms: 0 };
      perLang[m.lang] = e;
      e.chars += chars;
      e.ms += speech / m.speakingRate; // normalise to rate 1.0
    }
    console.log("\nobserved chars/sec at rate 1.0 (vs CHARS_PER_SECOND):");
    for (const [lang, e] of Object.entries(perLang))
      console.log(
        `  ${lang}: ${(e.chars / (e.ms / 1000)).toFixed(1)} (configured ${CHARS_PER_SECOND[lang as keyof typeof CHARS_PER_SECOND]})`,
      );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
