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

import { textHasGlossaryName } from "@/lib/content/glossary";

describe("textHasGlossaryName", () => {
  it("accepts inflected Tamil, Malayalam and Telugu forms", () => {
    expect(textHasGlossaryName("அவள் தருமரைப் பார்த்தாள்", "தருமர்", "ta")).toBe(true);
    expect(textHasGlossaryName("അവൾ യുധിഷ്ഠിരനെ നോക്കി", "യുധിഷ്ഠിരൻ", "ml")).toBe(true);
    expect(textHasGlossaryName("అర్జునుడి భుజం", "అర్జునుడు", "te")).toBe(true);
    expect(textHasGlossaryName("nothing here", "Arjuna", "en")).toBe(false);
  });
});
