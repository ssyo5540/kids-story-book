import { describe, expect, it } from "vitest";
import { clientIp, DailyLimiter, readJsonCapped } from "@/lib/security/rate-limit";

describe("DailyLimiter", () => {
  it("allows up to the limit then refuses, and refunds", () => {
    const l = new DailyLimiter();
    expect(l.hit("a", 2)).toBe(true);
    expect(l.hit("a", 2)).toBe(true);
    expect(l.hit("a", 2)).toBe(false);
    l.refund("a");
    expect(l.hit("a", 2)).toBe(true);
  });

  it("never grows past its cap even when every key is new today", () => {
    const l = new DailyLimiter();
    for (let i = 0; i < 12_000; i++) l.hit(`k${i}`, 1);
    expect(l.size).toBeLessThanOrEqual(10_000);
  });
});

describe("clientIp", () => {
  it("uses the rightmost X-Forwarded-For entry (the one our proxy appended)", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" });
    expect(clientIp(h)).toBe("203.0.113.9");
  });
  it("falls back to X-Real-IP, then unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("readJsonCapped", () => {
  it("parses small bodies", async () => {
    const req = new Request("http://x/", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(await readJsonCapped(req, 1024)).toEqual({ a: 1 });
  });
  it("rejects a body that is too large even without Content-Length", async () => {
    const big = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 10; i++) c.enqueue(new Uint8Array(500));
        c.close();
      },
    });
    const req = new Request("http://x/", { method: "POST", body: big, duplex: "half" } as RequestInit);
    expect(await readJsonCapped(req, 1024)).toBe("too-large");
  });
  it("rejects on declared Content-Length before reading", async () => {
    const req = new Request("http://x/", { method: "POST", body: "{}", headers: { "content-length": "5000" } });
    expect(await readJsonCapped(req, 1024)).toBe("too-large");
  });
});
