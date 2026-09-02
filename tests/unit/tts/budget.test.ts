import { describe, expect, it } from "vitest";
import { MemoryStorage } from "@/lib/storage/memory";
import { BudgetLedger } from "@/lib/tts/budget";

const at = (iso: string) => () => new Date(iso);

describe("BudgetLedger", () => {
  it("reserves, commits and refuses when the monthly budget would be exceeded", async () => {
    const storage = new MemoryStorage();
    const ledger = new BudgetLedger(storage, "server", 1000, 0, at("2026-09-02T10:00:00Z"));
    await ledger.load();
    const r1 = ledger.reserve(600);
    expect(r1.ok).toBe(true);
    const r2 = ledger.reserve(500);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe("monthly");
    if (r1.ok) {
      ledger.commit(r1.id, 250, "en-IN");
      ledger.commit(r1.id, 250, "en-IN");
      ledger.release(r1.id, { completedRendition: true });
    }
    const snap = ledger.snapshot();
    expect(snap.used).toBe(500);
    expect(snap.reserved).toBe(0);
    expect(snap.remaining).toBe(500);
    await ledger.persist();
    const file = await storage.getJson<{ chars: number; renditions: number; byLocale: Record<string, number> }>(
      "usage/2026-09/server.json",
    );
    expect(file?.chars).toBe(500);
    expect(file?.renditions).toBe(1);
    expect(file?.byLocale["en-IN"]).toBe(500);
  });

  it("counts other writers' usage and rolls over at month end", async () => {
    const storage = new MemoryStorage();
    await storage.put(
      "usage/2026-09/cli-laptop.json",
      Buffer.from(
        JSON.stringify({
          writerId: "cli-laptop",
          month: "2026-09",
          chars: 900,
          requests: 1,
          renditions: 1,
          interruptedChars: 0,
          byLocale: {},
          days: {},
          updatedAt: "",
        }),
      ),
      { contentType: "application/json" },
    );
    let now = new Date("2026-09-30T23:00:00Z");
    const ledger = new BudgetLedger(storage, "server", 1000, 0, () => now);
    await ledger.load();
    expect(ledger.snapshot().used).toBe(900);
    expect(ledger.reserve(200).ok).toBe(false);
    now = new Date("2026-10-01T00:10:00Z");
    expect(ledger.snapshot().month).toBe("2026-10");
    expect(ledger.reserve(200).ok).toBe(true);
  });

  it("enforces the daily brake separately", async () => {
    const ledger = new BudgetLedger(new MemoryStorage(), "server", 100_000, 300, at("2026-09-02T10:00:00Z"));
    await ledger.load();
    const r = ledger.reserve(250);
    expect(r.ok).toBe(true);
    if (r.ok) {
      ledger.commit(r.id, 250, "te-IN");
      ledger.release(r.id);
    }
    const again = ledger.reserve(100);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toBe("daily");
  });
});
