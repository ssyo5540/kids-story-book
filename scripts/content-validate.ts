import "./_env";
import { parseArgs } from "node:util";
import { getConfig } from "@/lib/config";
import { applyPublishingGate, validateContent } from "@/lib/content/loader";
import { LANGS, TARGET_WORDS } from "@/lib/content/types";

const { values } = parseArgs({
  options: {
    stats: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    dir: { type: "string" },
  },
});

async function main() {
  const cfg = getConfig();
  const contentDir = values.dir ?? cfg.CONTENT_DIR;
  const { raw, issues } = await validateContent(contentDir);
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          errors,
          warns,
          collections: raw.collections.length,
          stories: raw.stories.length,
        },
        null,
        2,
      ),
    );
  } else {
    for (const i of issues) {
      console.log(`${i.level === "error" ? "ERROR" : "warn "}  ${i.file}: ${i.message}`);
    }
    console.log(
      `\n${raw.collections.length} collections, ${raw.stories.length} stories, ${errors.length} errors, ${warns.length} warnings`,
    );

    if (values.stats) {
      console.log(`\n${"story".padEnd(48)} min  words  target  hash          en   te   ta   kn   ml`);
      for (const s of raw.stories) {
        const en = s.texts.en;
        const cells = LANGS.map((l) => {
          const t = s.texts[l];
          if (!t) return " -  ";
          const code = t.reviewStatus === "approved" ? "ok" : t.reviewStatus === "needs_review" ? "rv" : "dr";
          return `${code}${t.stale ? "*" : " "} `;
        });
        console.log(
          `${`${s.meta.collection}/${s.meta.id}`.padEnd(48)}${String(s.meta.durationClass).padStart(3)}  ${String(en?.wordCount ?? 0).padStart(5)}  ${String(TARGET_WORDS[s.meta.durationClass]).padStart(6)}  ${en?.contentHash ?? "-".repeat(12)}  ${cells.join(" ")}`,
        );
      }
      console.log("\nok=approved rv=needs_review dr=draft *=stale translation");
      const published = applyPublishingGate(raw, cfg.CONTENT_INCLUDE_UNREVIEWED);
      console.log(
        `Published with CONTENT_INCLUDE_UNREVIEWED=${cfg.CONTENT_INCLUDE_UNREVIEWED}: ${published.stories.length} stories in ${published.collections.length} collections`,
      );
    }
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
