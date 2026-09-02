import "./_env";
import { parseArgs } from "node:util";
import { LOCALE_LANG, LOCALES } from "@/lib/content/types";
import { TERMINAL_STATES } from "@/lib/jobs/progress";
import { buildPlan } from "@/lib/renditions/plan";
import { ensureRenditionForStory } from "@/lib/renditions/service";
import { ensureRuntimeReady } from "@/lib/runtime";
import { isLocale, resolveVoiceName } from "@/lib/tts/voices";
import { bar, collectionTitle, fmtInt, loadCliCatalog, selectStories, usd } from "./_cli";

const { values } = parseArgs({
  options: {
    locale: { type: "string", multiple: true },
    lang: { type: "string", multiple: true },
    voice: { type: "string", default: "default" },
    story: { type: "string" },
    collection: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    "allow-unreviewed": { type: "boolean", default: false },
  },
});

async function main() {
  const rt = await ensureRuntimeReady();
  const voices = await rt.voices;
  const catalog = await loadCliCatalog(values["allow-unreviewed"]);
  const stories = selectStories(catalog, { story: values.story, collection: values.collection });
  const localeArgs = [...(values.locale ?? []), ...(values.lang ?? [])];
  const locales = localeArgs.length ? localeArgs : [...LOCALES];
  for (const l of locales) if (!isLocale(l)) throw new Error(`unknown locale ${l}`);

  console.log(`driver=${rt.tts.name} storage=${rt.storage.name} writer=${rt.ledger.writerId}`);
  const snap = rt.ledger.snapshot();
  console.log(
    `budget ${snap.month}: used ${fmtInt(snap.used)} / ${fmtInt(snap.monthlyBudget)} (remaining ${fmtInt(snap.remaining)})\n`,
  );

  type Row = {
    story: string;
    locale: string;
    voice: string;
    chunks: number;
    chars: number;
    bytes: number;
    est: number;
    status: "exists" | "todo" | "no-text";
  };
  const rows: Row[] = [];
  for (const story of stories) {
    for (const locale of locales) {
      if (!isLocale(locale)) continue;
      const lang = LOCALE_LANG[locale];
      if (!story.texts[lang]) {
        rows.push({
          story: story.meta.id,
          locale,
          voice: "-",
          chunks: 0,
          chars: 0,
          bytes: 0,
          est: 0,
          status: "no-text",
        });
        continue;
      }
      const voiceName = resolveVoiceName(voices, locale, values.voice);
      const plan = await buildPlan(story, collectionTitle(catalog, story), locale, voiceName, voices);
      const exists = !values.force && !!(await rt.index.get(story.meta.id, locale, voiceName, plan.renditionHash));
      rows.push({
        story: story.meta.id,
        locale,
        voice: voiceName,
        chunks: plan.chunks.length,
        chars: plan.totalChars,
        bytes: plan.totalBytes,
        est: plan.estimatedSeconds,
        status: exists ? "exists" : "todo",
      });
    }
  }

  console.log(
    `${"story".padEnd(36)} ${"locale".padEnd(6)} ${"voice".padEnd(8)} chunks   chars    bytes   ~sec  status`,
  );
  for (const r of rows) {
    console.log(
      `${r.story.padEnd(36)} ${r.locale.padEnd(6)} ${r.voice.padEnd(8)} ${String(r.chunks).padStart(6)} ${fmtInt(r.chars).padStart(7)} ${fmtInt(r.bytes).padStart(8)} ${String(r.est).padStart(6)}  ${r.status}`,
    );
  }
  const todo = rows.filter((r) => r.status === "todo");
  const chars = todo.reduce((n, r) => n + r.chars, 0);
  console.log(
    `\n${todo.length} rendition(s) to generate, ${fmtInt(chars)} characters (≈ ${usd(chars)} at $30/1M; free tier may cover it)`,
  );
  if (chars > snap.remaining)
    console.log(
      `WARNING: exceeds remaining monthly budget by ${fmtInt(chars - snap.remaining)} characters; some jobs will be refused.`,
    );
  if (values["dry-run"] || todo.length === 0) {
    console.log(values["dry-run"] ? "dry run — nothing generated" : "nothing to do");
    await rt.ledger.persist();
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const r of todo) {
    const story = stories.find((s) => s.meta.id === r.story);
    if (!story || !isLocale(r.locale)) continue;
    const res = await ensureRenditionForStory(story, collectionTitle(catalog, story), r.locale, r.voice, {
      source: "cli",
    });
    if (res.status === "ready") {
      ok++;
      console.log(`ready   ${r.story} ${r.locale} ${r.voice} (already)`);
      continue;
    }
    if (res.status === "unavailable") {
      failed++;
      console.log(`skip    ${r.story} ${r.locale} ${r.voice}: ${res.reason} — ${res.message}`);
      continue;
    }
    const jobId = res.job.jobId;
    process.stdout.write(`gen     ${r.story} ${r.locale} ${r.voice} `);
    let last = "";
    for (;;) {
      const p = rt.queue.get(jobId);
      if (!p) break;
      const line = `${bar(p.percent)} ${String(p.percent).padStart(3)}% ${p.state} ${p.chunksDone}/${p.chunksTotal} eta ${p.etaSeconds}s`;
      if (line !== last) {
        process.stdout.write(`\r        ${r.story.padEnd(36)} ${line}`);
        last = line;
      }
      if (TERMINAL_STATES.has(p.state)) {
        process.stdout.write("\n");
        if (p.state === "ready") ok++;
        else {
          failed++;
          console.log(`        -> ${p.state}: ${p.error ?? ""}`);
        }
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  await rt.ledger.persist();
  const after = rt.ledger.snapshot();
  console.log(
    `\ndone: ${ok} ready, ${failed} failed/skipped. budget used ${fmtInt(after.used)} / ${fmtInt(after.monthlyBudget)}`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
