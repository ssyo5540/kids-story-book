import { describe, expect, it } from "vitest";
import { silence } from "@/lib/audio/pcm";
import { pcmDurationMs } from "@/lib/tts/client";
import { FakeTtsDriver } from "@/lib/tts/fake";

describe("pcm helpers", () => {
  it("produces the right number of bytes for silence and round-trips duration", () => {
    expect(silence(700).length).toBe(700 * 48);
    expect(pcmDurationMs(silence(1500).length)).toBe(1500);
    expect(silence(0).length).toBe(0);
  });

  it("fake driver duration tracks the text length", async () => {
    const fake = new FakeTtsDriver(0);
    const short = await fake.synthesize({ text: "Good night.", locale: "en-IN", voiceName: "Aoede", speakingRate: 1 });
    const long = await fake.synthesize({
      text: "Good night. ".repeat(20),
      locale: "en-IN",
      voiceName: "Aoede",
      speakingRate: 1,
    });
    expect(long.durationMs).toBeGreaterThan(short.durationMs);
    expect(pcmDurationMs(long.pcm.length)).toBe(long.durationMs);
  });
});
