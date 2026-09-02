import "./_env";
import { parseArgs } from "node:util";
import { LOCALE_LANG, LOCALES } from "@/lib/content/types";
import { parseManifestKey } from "@/lib/renditions/keys";
import { buildPlan } from "@/lib/renditions/plan";
import { ensureRuntimeReady } from "@/lib/runtime";
import { collectionTitle, loadCliCatalog } from "./_cli";

const { values } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false }, "older-than": { type: "string", default: "30d" } },
});

function parseAge(s: string): number {
  const m = /^(\d+)([dh])$/.exec(s);
  if (!m) throw new Error("--older-than expects e.g. 30d or 12h");
  return Number(m[1]) * (m[2] === "d" ? 86_400_000 : 3_600_000);
}

async function main() {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const catalog = await loadCliCatalog(true);
  const maxAge = parseAge(values["older-than"]);

  const current = new Set<string>();
  for (const story of catalog.stories)
    for (const locale of LOCALES) {
      if (!story.texts[LOCALE_LANG[locale]]) continue;
      for (const v of voices.chirpVoices) {
        const plan = await buildPlan(story, collectionTitle(catalog, story), locale, v.name, voices);
        current.add(`audio/${story.meta.id}/${locale}/${v.name}/${plan.renditionHash}`);
      }
    }

  const keys = await rt.storage.list("audio/");
  const manifests = new Set(keys.filter((k) => k.endsWith(".json")));
  const toDelete: string[] = [];
  for (const k of keys) {
    const base = k.replace(/\.(mp3|json)$/, "");
    if (k.endsWith(".mp3") && !manifests.has(`${base}.json`)) {
      toDelete.push(k); // orphan mp3 without manifest
      continue;
    }
    if (current.has(base)) continue;
    const info = parseManifestKey(`${base}.json`);
    if (!info) continue;
    const m = await rt.storage.getJson<{ createdAt: string }>(`${base}.json`);
    const age = m ? Date.now() - Date.parse(m.createdAt) : Number.POSITIVE_INFINITY;
    if (age > maxAge) toDelete.push(k);
  }
  console.log(`${toDelete.length} object(s) to delete${values["dry-run"] ? " (dry run)" : ""}`);
  for (const k of toDelete) {
    console.log(`  ${k}`);
    if (!values["dry-run"]) {
      await rt.storage.delete(k);
      rt.index.remove(k.replace(/\.(mp3|json)$/, ""));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
