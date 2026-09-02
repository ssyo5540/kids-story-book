import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { getConfig } from "@/lib/config";
import { type Glossary, parseGlossary, textHasGlossaryName } from "./glossary";
import { contentHash } from "./hash";
import { countChars, countWords, parseBody } from "./markdown";
import { collectionSchema, storyFrontmatterSchema, storyMetaSchema } from "./schema";
import {
  type Catalog,
  type Collection,
  type ContentIssue,
  LANGS,
  type Lang,
  type Story,
  type StoryText,
  TARGET_WORDS,
} from "./types";

export interface RawContent {
  collections: Collection[];
  stories: Story[];
  glossary: Glossary;
  issues: ContentIssue[];
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirs(p: string): Promise<string[]> {
  if (!(await exists(p))) return [];
  const entries = await fs.readdir(p, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

function zodIssues(
  prefix: string,
  file: string,
  error: { issues: { path: PropertyKey[]; message: string }[] },
): ContentIssue[] {
  return error.issues.map((i) => ({
    level: "error" as const,
    file,
    message: `${prefix}${i.path.map(String).join(".") || "(root)"}: ${i.message}`,
  }));
}

/** Read and validate every content file. Never throws on content errors; reports them as issues. */
export async function readContent(contentDir: string): Promise<RawContent> {
  const issues: ContentIssue[] = [];
  const root = path.resolve(contentDir);

  let glossary: Glossary = {};
  const glossaryPath = path.join(root, "GLOSSARY.md");
  if (await exists(glossaryPath)) glossary = parseGlossary(await fs.readFile(glossaryPath, "utf8"));

  const collections: Collection[] = [];
  const collectionsDir = path.join(root, "collections");
  if (await exists(collectionsDir)) {
    for (const name of (await fs.readdir(collectionsDir)).filter((f) => /\.ya?ml$/.test(f)).sort()) {
      const file = `collections/${name}`;
      let raw: unknown;
      try {
        raw = parseYaml(await fs.readFile(path.join(collectionsDir, name), "utf8"));
      } catch (e) {
        issues.push({
          level: "error",
          file,
          message: `YAML parse error: ${(e as Error).message}`,
        });
        continue;
      }
      const parsed = collectionSchema.safeParse(raw);
      if (!parsed.success) {
        issues.push(...zodIssues("", file, parsed.error));
        continue;
      }
      const expectedId = name.replace(/\.ya?ml$/, "");
      if (parsed.data.id !== expectedId)
        issues.push({
          level: "error",
          file,
          message: `id "${parsed.data.id}" must match file name "${expectedId}"`,
        });
      if (collections.some((c) => c.id === parsed.data.id))
        issues.push({
          level: "error",
          file,
          message: `duplicate collection id "${parsed.data.id}"`,
        });
      collections.push(parsed.data);
    }
  } else {
    issues.push({
      level: "error",
      file: "collections/",
      message: "collections directory is missing",
    });
  }
  collections.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const collectionIds = new Set(collections.map((c) => c.id));

  const stories: Story[] = [];
  const seenIds = new Set<string>();
  const storiesDir = path.join(root, "stories");
  for (const collectionDirName of await listDirs(storiesDir)) {
    for (const storyDirName of await listDirs(path.join(storiesDir, collectionDirName))) {
      const dirAbs = path.join(storiesDir, collectionDirName, storyDirName);
      const dirRel = `stories/${collectionDirName}/${storyDirName}`;
      const metaPath = path.join(dirAbs, "story.yaml");
      const metaFile = `${dirRel}/story.yaml`;
      if (!(await exists(metaPath))) {
        issues.push({
          level: "error",
          file: metaFile,
          message: "story.yaml is missing",
        });
        continue;
      }
      let rawMeta: unknown;
      try {
        rawMeta = parseYaml(await fs.readFile(metaPath, "utf8"));
      } catch (e) {
        issues.push({
          level: "error",
          file: metaFile,
          message: `YAML parse error: ${(e as Error).message}`,
        });
        continue;
      }
      const metaParsed = storyMetaSchema.safeParse(rawMeta);
      if (!metaParsed.success) {
        issues.push(...zodIssues("", metaFile, metaParsed.error));
        continue;
      }
      const meta = metaParsed.data;
      if (meta.id !== storyDirName)
        issues.push({
          level: "error",
          file: metaFile,
          message: `id "${meta.id}" must match directory name "${storyDirName}"`,
        });
      if (meta.collection !== collectionDirName)
        issues.push({
          level: "error",
          file: metaFile,
          message: `collection "${meta.collection}" must match parent directory "${collectionDirName}"`,
        });
      if (!collectionIds.has(meta.collection))
        issues.push({
          level: "error",
          file: metaFile,
          message: `unknown collection "${meta.collection}"`,
        });
      if (seenIds.has(meta.id))
        issues.push({
          level: "error",
          file: metaFile,
          message: `duplicate story id "${meta.id}"`,
        });
      seenIds.add(meta.id);
      const collection = collections.find((c) => c.id === meta.collection);
      if (collection && collection.mythology !== meta.mythology) {
        issues.push({
          level: "warn",
          file: metaFile,
          message: `mythology "${meta.mythology}" differs from collection "${collection.mythology}"`,
        });
      }

      const texts: Partial<Record<Lang, StoryText>> = {};
      for (const lang of LANGS) {
        const mdPath = path.join(dirAbs, `${lang}.md`);
        if (!(await exists(mdPath))) continue;
        const file = `${dirRel}/${lang}.md`;
        const src = await fs.readFile(mdPath, "utf8");
        let fm: matter.GrayMatterFile<string>;
        try {
          fm = matter(src);
        } catch (e) {
          issues.push({
            level: "error",
            file,
            message: `frontmatter parse error: ${(e as Error).message}`,
          });
          continue;
        }
        const fmParsed = storyFrontmatterSchema.safeParse(fm.data);
        if (!fmParsed.success) {
          issues.push(...zodIssues("frontmatter.", file, fmParsed.error));
          continue;
        }
        const f = fmParsed.data;
        const body = parseBody(fm.content, lang, file);
        issues.push(...body.issues);
        texts[lang] = {
          lang,
          title: f.title,
          summary: f.summary,
          moral: f.moral,
          reviewStatus: f.reviewStatus,
          translatedFromHash: f.translatedFromHash,
          translator: f.translator,
          reviewer: f.reviewer,
          reviewedAt: f.reviewedAt,
          allowParagraphMismatch: f.allowParagraphMismatch,
          paragraphs: body.paragraphs,
          wordCount: countWords(body.paragraphs),
          charCount: countChars(body.paragraphs),
          contentHash: contentHash(body.paragraphs),
          stale: false,
          file,
        };
      }

      const en = texts.en;
      if (!en) {
        issues.push({
          level: "error",
          file: `${dirRel}/en.md`,
          message: "en.md is required",
        });
      } else {
        const target = TARGET_WORDS[meta.durationClass];
        const lo = Math.round(target * 0.85);
        const hi = Math.round(target * 1.15);
        if (en.wordCount < lo || en.wordCount > hi) {
          issues.push({
            level: "warn",
            file: en.file,
            message: `word count ${en.wordCount} is outside ${lo}-${hi} for a ${meta.durationClass}-minute story`,
          });
        }
      }

      for (const lang of LANGS) {
        const t = texts[lang];
        if (!t) continue;
        if (t.reviewStatus === "approved" && (!t.reviewer || !t.reviewedAt)) {
          issues.push({
            level: "error",
            file: t.file,
            message: "approved texts need reviewer and reviewedAt",
          });
        }
        if (lang !== "en") {
          if (!t.translatedFromHash) {
            issues.push({
              level: "error",
              file: t.file,
              message: "translations need translatedFromHash (the en contentHash they were made from)",
            });
          } else if (en && t.translatedFromHash !== en.contentHash) {
            t.stale = true;
            issues.push({
              level: "warn",
              file: t.file,
              message: `stale translation: made from ${t.translatedFromHash}, en is now ${en.contentHash}`,
            });
          }
          if (en && t.paragraphs.length !== en.paragraphs.length) {
            issues.push({
              level: t.allowParagraphMismatch ? "warn" : "error",
              file: t.file,
              message: `paragraph count ${t.paragraphs.length} differs from en (${en.paragraphs.length}); translations must be 1:1${t.allowParagraphMismatch ? "" : " (or set allowParagraphMismatch: true)"}`,
            });
          }
        }
        const full = t.paragraphs.map((p) => p.narration).join(" ");
        for (const key of meta.characters) {
          const canonical = glossary[key]?.[lang];
          if (!canonical) {
            if (lang === "en" && Object.keys(glossary).length > 0) {
              issues.push({
                level: "warn",
                file: metaFile,
                message: `character "${key}" is not in GLOSSARY.md`,
              });
            }
            continue;
          }
          if (!textHasGlossaryName(full, canonical, lang)) {
            issues.push({
              level: "warn",
              file: t.file,
              message: `character "${key}" should appear as "${canonical}" (glossary spelling)`,
            });
          }
        }
      }

      stories.push({ meta, texts, dir: dirRel });
    }
  }
  stories.sort(
    (a, b) =>
      a.meta.collection.localeCompare(b.meta.collection) ||
      a.meta.order - b.meta.order ||
      a.meta.id.localeCompare(b.meta.id),
  );

  return { collections, stories, glossary, issues };
}

/**
 * Apply the publishing gate: drafts never ship; needs_review only when includeUnreviewed;
 * a story is listed only when its English text passes the gate.
 */
export function applyPublishingGate(raw: RawContent, includeUnreviewed: boolean): Catalog {
  const allowed = (s: StoryText | undefined) =>
    !!s && (s.reviewStatus === "approved" || (includeUnreviewed && s.reviewStatus === "needs_review"));

  const stories: Story[] = [];
  for (const story of raw.stories) {
    if (!allowed(story.texts.en)) continue;
    const texts: Partial<Record<Lang, StoryText>> = {};
    for (const lang of LANGS) {
      const t = story.texts[lang];
      if (allowed(t)) texts[lang] = t;
    }
    stories.push({ ...story, texts });
  }
  const usedCollections = new Set(stories.map((s) => s.meta.collection));
  return {
    collections: raw.collections.filter((c) => usedCollections.has(c.id)),
    stories,
    loadedAt: new Date().toISOString(),
    includeUnreviewed,
  };
}

export async function validateContent(contentDir: string): Promise<{ raw: RawContent; issues: ContentIssue[] }> {
  const raw = await readContent(contentDir);
  return { raw, issues: raw.issues };
}

export async function loadCatalog(opts: { contentDir: string; includeUnreviewed: boolean }): Promise<Catalog> {
  const raw = await readContent(opts.contentDir);
  const errors = raw.issues.filter((i) => i.level === "error");
  if (errors.length > 0) {
    const preview = errors
      .slice(0, 5)
      .map((e) => `  ${e.file}: ${e.message}`)
      .join("\n");
    throw new Error(`Content has ${errors.length} error(s). Run \`pnpm content:validate\`.\n${preview}`);
  }
  return applyPublishingGate(raw, opts.includeUnreviewed);
}

type GlobalWithCatalog = typeof globalThis & {
  __nightlightCatalog?: Promise<Catalog>;
};

/** Memoized catalog for the running server / build. */
export function getCatalog(): Promise<Catalog> {
  const g = globalThis as GlobalWithCatalog;
  if (!g.__nightlightCatalog) {
    const cfg = getConfig();
    g.__nightlightCatalog = loadCatalog({
      contentDir: cfg.CONTENT_DIR,
      includeUnreviewed: cfg.CONTENT_INCLUDE_UNREVIEWED,
    });
  }
  return g.__nightlightCatalog;
}

export function resetCatalogCache() {
  (globalThis as GlobalWithCatalog).__nightlightCatalog = undefined;
}
