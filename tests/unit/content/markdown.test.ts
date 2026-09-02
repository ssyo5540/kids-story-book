import { describe, expect, it } from "vitest";
import { contentHash } from "@/lib/content/hash";
import { countWords, normalizeNarration, parseBody, splitSentences } from "@/lib/content/markdown";

const sample = `Long ago, in a *quiet* kingdom, there lived five brothers.

"Good night," said the teacher softly.

## Chapter Two

---

The stars came out one by one.

## Chapter Three

And all was well.`;

describe("parseBody", () => {
  it("splits blank-line separated blocks into paragraphs with kinds", () => {
    const { paragraphs, issues } = parseBody(sample, "en", "x/en.md");
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(paragraphs.map((p) => p.kind)).toEqual(["text", "dialogue", "heading", "break", "text", "heading", "text"]);
    expect(paragraphs.map((p) => p.sectionIndex)).toEqual([0, 0, 1, 1, 1, 2, 2]);
    expect(paragraphs[0].narration).toBe("Long ago, in a quiet kingdom, there lived five brothers.");
    expect(paragraphs[0].display).toContain("*quiet*");
    expect(paragraphs[2].narration).toBe("Chapter Two");
  });

  it("flags forbidden markup as errors and style problems as warnings", () => {
    const { issues } = parseBody(
      "Visit [this] link https://example.com now\n\nHe had 3 apples; Mr. Smith SHOUTED",
      "en",
      "f",
    );
    const errors = issues.filter((i) => i.level === "error").map((i) => i.message);
    const warns = issues.filter((i) => i.level === "warn").map((i) => i.message);
    expect(errors.some((m) => m.includes("square brackets"))).toBe(true);
    expect(errors.some((m) => m.includes("URLs"))).toBe(true);
    expect(warns.some((m) => m.includes("numbers as words"))).toBe(true);
    expect(warns.some((m) => m.includes("semicolons"))).toBe(true);
    expect(warns.some((m) => m.includes("abbreviations"))).toBe(true);
    expect(warns.some((m) => m.includes("ALL CAPS"))).toBe(true);
  });

  it("rejects headings other than ##", () => {
    const { issues } = parseBody("# Title\n\nBody", "en", "f");
    expect(issues.some((i) => i.level === "error" && i.message.includes("## Heading"))).toBe(true);
  });

  it("handles Telugu text with danda sentence separators", () => {
    const te = "అనగనగా ఒక రాజు ఉన్నాడు। అతనికి ఐదుగురు కొడుకులు।";
    const { paragraphs, issues } = parseBody(te, "te", "f");
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    expect(paragraphs).toHaveLength(1);
    expect(splitSentences(te, "te").length).toBe(2);
  });
});

describe("normalizeNarration", () => {
  it("straightens quotes, strips emphasis and zero-width chars, collapses whitespace", () => {
    expect(normalizeNarration("“Hello”  *there*\u200B ‘friend’")).toBe("\"Hello\" there 'friend'");
  });
});

describe("contentHash", () => {
  it("is stable across formatting-only changes and changes when words change", () => {
    const a = parseBody("The *moon* rose.\n\nGood night.", "en", "f").paragraphs;
    const b = parseBody("The moon   rose.\n\n\nGood night.", "en", "f").paragraphs;
    const c = parseBody("The sun rose.\n\nGood night.", "en", "f").paragraphs;
    expect(contentHash(a)).toBe(contentHash(b));
    expect(contentHash(a)).not.toBe(contentHash(c));
    expect(contentHash(a)).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("countWords", () => {
  it("counts whitespace tokens across narration paragraphs", () => {
    const p = parseBody("One two three.\n\n---\n\nFour five.", "en", "f").paragraphs;
    expect(countWords(p)).toBe(5);
  });
});
