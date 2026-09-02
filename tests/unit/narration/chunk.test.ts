import { describe, expect, it } from "vitest";
import { parseBody } from "@/lib/content/markdown";
import { chunkParagraphs, splitLongSentence } from "@/lib/narration/chunk";
import { PAUSE_MS } from "@/lib/narration/pauses";

const opts = { maxBytes: 4500, maxEstSeconds: 60, speakingRate: 0.9 };
const bytes = (s: string) => Buffer.byteLength(s, "utf8");

describe("chunkParagraphs", () => {
  it("never crosses paragraph boundaries and assigns pauses by kind", () => {
    const md = 'First one. Second one.\n\n"Hello," she said.\n\n## Chapter Two\n\n---\n\nThe end.';
    const { chunks, planParagraphs } = chunkParagraphs(parseBody(md, "en", "f").paragraphs, "en", opts);
    expect(chunks.map((c) => c.paragraphIndex)).toEqual([0, 1, 2, 4]);
    expect(chunks[0].pauseAfterMs).toBe(PAUSE_MS.text);
    expect(chunks[1].pauseAfterMs).toBe(PAUSE_MS.beforeHeading); // dialogue followed by a heading
    expect(chunks[2].pauseAfterMs).toBe(PAUSE_MS.heading + PAUSE_MS.break); // heading followed by a break
    expect(chunks[3].pauseAfterMs).toBe(0); // last chunk: tail added separately
    expect(planParagraphs[3]).toMatchObject({ kind: "break", firstChunkIndex: -1 });
  });

  it("keeps every chunk under the byte cap for Telugu text", () => {
    const sentence = "అనగనగా ఒక అడవిలో చిన్న కుందేలు ఉండేది, అది రోజూ ఉదయాన్నే నదికి వెళ్ళి నీళ్ళు తాగేది.";
    const paragraph = Array.from({ length: 60 }, () => sentence).join(" ");
    const { chunks } = chunkParagraphs(parseBody(paragraph, "te", "f").paragraphs, "te", {
      ...opts,
      maxBytes: 1500,
      maxEstSeconds: 600,
    });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(bytes(c.text)).toBeLessThanOrEqual(1500);
      expect(c.text.endsWith(".")).toBe(true); // sentence boundary
    }
    expect(chunks.slice(0, -1).every((c) => c.pauseAfterMs === PAUSE_MS.intraParagraph)).toBe(true);
  });

  it("respects the estimated-seconds cap", () => {
    const paragraph = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const { chunks } = chunkParagraphs(parseBody(paragraph, "en", "f").paragraphs, "en", {
      ...opts,
      maxEstSeconds: 10,
    });
    expect(chunks.length).toBeGreaterThan(3);
  });

  it("applies prepareText (respelling) before chunking", () => {
    const { chunks } = chunkParagraphs(parseBody("Drona smiled.", "en", "f").paragraphs, "en", {
      ...opts,
      prepareText: (t) => t.replace("Drona", "Droh-na"),
    });
    expect(chunks[0].text).toBe("Droh-na smiled.");
  });
});

describe("splitLongSentence", () => {
  it("splits at soft punctuation, then words, then graphemes", () => {
    const soft = `${"a".repeat(30)}, ${"b".repeat(30)}, ${"c".repeat(30)}`;
    expect(splitLongSentence(soft, 70, "en")).toEqual([`${"a".repeat(30)}, ${"b".repeat(30)},`, "c".repeat(30)]);
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
    for (const part of splitLongSentence(words, 20, "en")) expect(bytes(part)).toBeLessThanOrEqual(20);
    const glued = "క".repeat(50); // 3 bytes each, no spaces
    const parts = splitLongSentence(glued, 30, "te");
    expect(parts.join("")).toBe(glued);
    for (const p of parts) expect(bytes(p)).toBeLessThanOrEqual(30);
  });
});
