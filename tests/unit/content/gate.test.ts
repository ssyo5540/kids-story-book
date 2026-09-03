import { describe, expect, it } from "vitest";
import { applyPublishingGate, type RawContent } from "@/lib/content/loader";
import type { ReviewStatus, Story, StoryText } from "@/lib/content/types";

function text(lang: StoryText["lang"], reviewStatus: ReviewStatus): StoryText {
  return {
    lang,
    title: "t",
    summary: "s",
    moral: "m",
    reviewStatus,
    paragraphs: [],
    wordCount: 0,
    charCount: 0,
    contentHash: "000000000000",
    stale: false,
  } as unknown as StoryText;
}

function story(id: string, texts: Partial<Record<StoryText["lang"], StoryText>>): Story {
  return {
    meta: { id, collection: "c1", mythology: "indian", durationClass: 5, ageRange: [4, 8] },
    texts,
    dir: id,
  } as unknown as Story;
}

const raw: RawContent = {
  collections: [{ id: "c1", mythology: "indian", order: 1, title: { en: "C" }, description: { en: "d" } } as never],
  stories: [
    story("approved-en-unreviewed-te", { en: text("en", "approved"), te: text("te", "needs_review") }),
    story("unreviewed-en", { en: text("en", "needs_review"), ta: text("ta", "approved") }),
    story("draft-en", { en: text("en", "draft") }),
  ],
  glossary: {} as never,
  issues: [],
};

describe("applyPublishingGate", () => {
  it("in production shows only approved texts and drops stories whose English is not approved", () => {
    const c = applyPublishingGate(raw, false);
    expect(c.stories.map((s) => s.meta.id)).toEqual(["approved-en-unreviewed-te"]);
    expect(Object.keys(c.stories[0].texts)).toEqual(["en"]);
  });

  it("with the unreviewed flag also admits needs_review texts but never drafts", () => {
    const c = applyPublishingGate(raw, true);
    expect(c.stories.map((s) => s.meta.id).sort()).toEqual(["approved-en-unreviewed-te", "unreviewed-en"]);
    const first = c.stories.find((s) => s.meta.id === "approved-en-unreviewed-te");
    expect(Object.keys(first?.texts ?? {}).sort()).toEqual(["en", "te"]);
    expect(c.stories.find((s) => s.meta.id === "draft-en")).toBeUndefined();
  });
});
