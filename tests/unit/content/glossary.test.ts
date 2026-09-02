import { describe, expect, it } from "vitest";
import { parseGlossary } from "@/lib/content/glossary";

describe("parseGlossary", () => {
  it("reads the first table keyed by `key` with language columns", () => {
    const md = `# Glossary\n\n| key | en | te | ta |\n|---|---|---|---|\n| Arjuna | Arjuna | అర్జునుడు | அர்ஜுனன் |\n| Ra | Ra | - | ரா |\n`;
    const g = parseGlossary(md);
    expect(g.Arjuna).toEqual({ en: "Arjuna", te: "అర్జునుడు", ta: "அர்ஜுனன்" });
    expect(g.Ra).toEqual({ en: "Ra", ta: "ரா" });
  });
});
