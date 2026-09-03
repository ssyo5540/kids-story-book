import type { StorageAdapter } from "@/lib/storage/types";

export interface UsageFile {
  writerId: string;
  month: string;
  chars: number;
  requests: number;
  renditions: number;
  interruptedChars: number;
  byLocale: Record<string, number>;
  days: Record<string, number>;
  updatedAt: string;
}

export interface BudgetSnapshot {
  month: string;
  used: number;
  usedToday: number;
  reserved: number;
  monthlyBudget: number;
  dailyBudget: number;
  remaining: number;
  remainingToday: number;
  writers: { writerId: string; chars: number }[];
}

export type ReserveResult =
  | { ok: true; id: string }
  | { ok: false; reason: "monthly" | "daily"; snapshot: BudgetSnapshot; retryAfter: string };

export function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
export function firstOfNextMonth(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}
export function nextUtcMidnight(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}

/**
 * Monthly character ledger. Each writer owns one JSON file per month in storage, so there are no write
 * races as long as writer ids are unique per running process (the server derives its id from the
 * deployment, see lib/config.ts); other writers' totals are read at load and refreshed periodically.
 * Reservations are in-memory and atomic (single-threaded JS).
 */
export class BudgetLedger {
  private own: UsageFile;
  /** Other writers' month total and today's total (so the daily cap is shared across writers too). */
  private others = new Map<string, { chars: number; today: number }>();
  private reservations = new Map<string, number>();
  private loaded = false;
  private lastRefresh = 0;
  private persistTimer: NodeJS.Timeout | null = null;
  private seq = 0;

  constructor(
    private readonly storage: StorageAdapter,
    readonly writerId: string,
    private readonly monthlyBudget: number,
    private readonly dailyBudget: number,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.own = this.blank();
  }

  private blank(): UsageFile {
    return {
      writerId: this.writerId,
      month: monthKey(this.now()),
      chars: 0,
      requests: 0,
      renditions: 0,
      interruptedChars: 0,
      byLocale: {},
      days: {},
      updatedAt: new Date(0).toISOString(),
    };
  }

  private key(writer = this.writerId, month = monthKey(this.now())) {
    return `usage/${month}/${writer}.json`;
  }

  async load(): Promise<void> {
    this.rollMonth();
    const mine = await this.storage.getJson<UsageFile>(this.key());
    if (mine) this.own = { ...this.blank(), ...mine };
    await this.refreshOthers(true);
    this.loaded = true;
  }

  private rollMonth() {
    const m = monthKey(this.now());
    if (this.own.month !== m) {
      this.own = this.blank();
      this.others.clear();
      this.reservations.clear();
      this.lastRefresh = 0;
    }
  }

  async refreshOthers(force = false): Promise<void> {
    const t = Date.now();
    if (!force && t - this.lastRefresh < 5 * 60_000) return;
    this.lastRefresh = t;
    const keys = await this.storage.list(`usage/${monthKey(this.now())}/`);
    const next = new Map<string, { chars: number; today: number }>();
    const today = dayKey(this.now());
    for (const k of keys) {
      if (!k.endsWith(".json")) continue;
      const writer =
        k
          .split("/")
          .pop()
          ?.replace(/\.json$/, "") ?? "";
      if (!writer || writer === this.writerId) continue;
      const f = await this.storage.getJson<UsageFile>(k);
      if (f) next.set(writer, { chars: f.chars ?? 0, today: f.days?.[today] ?? 0 });
    }
    this.others = next;
  }

  private usedTotal(): number {
    let n = this.own.chars;
    for (const v of this.others.values()) n += v.chars;
    return n;
  }

  private usedTodayTotal(): number {
    let n = this.own.days[dayKey(this.now())] ?? 0;
    for (const v of this.others.values()) n += v.today;
    return n;
  }

  private reservedTotal(): number {
    let n = 0;
    for (const v of this.reservations.values()) n += v;
    return n;
  }

  snapshot(): BudgetSnapshot {
    this.rollMonth();
    const used = this.usedTotal();
    const reserved = this.reservedTotal();
    const usedToday = this.usedTodayTotal();
    return {
      month: this.own.month,
      used,
      usedToday,
      reserved,
      monthlyBudget: this.monthlyBudget,
      dailyBudget: this.dailyBudget,
      remaining: Math.max(0, this.monthlyBudget - used - reserved),
      remainingToday: Math.max(0, this.dailyBudget - usedToday - reserved),
      writers: [
        { writerId: this.writerId, chars: this.own.chars },
        ...[...this.others.entries()].map(([writerId, v]) => ({ writerId, chars: v.chars })),
      ],
    };
  }

  /** Reserve the full size of a job before its first request. */
  reserve(chars: number): ReserveResult {
    if (!this.loaded) throw new Error("BudgetLedger.load() must be awaited first");
    const snap = this.snapshot();
    if (snap.used + snap.reserved + chars > this.monthlyBudget)
      return { ok: false, reason: "monthly", snapshot: snap, retryAfter: firstOfNextMonth(this.now()) };
    if (this.dailyBudget > 0 && snap.usedToday + snap.reserved + chars > this.dailyBudget)
      return { ok: false, reason: "daily", snapshot: snap, retryAfter: nextUtcMidnight(this.now()) };
    const id = `r${++this.seq}`;
    this.reservations.set(id, chars);
    return { ok: true, id };
  }

  /** Record chars actually billed by one successful request, drawing down the reservation. */
  commit(id: string, chars: number, locale: string): void {
    this.rollMonth();
    const left = this.reservations.get(id);
    if (left !== undefined) this.reservations.set(id, Math.max(0, left - chars));
    this.own.chars += chars;
    this.own.requests += 1;
    this.own.byLocale[locale] = (this.own.byLocale[locale] ?? 0) + chars;
    const d = dayKey(this.now());
    this.own.days[d] = (this.own.days[d] ?? 0) + chars;
    this.schedulePersist();
  }

  /** Release whatever is left of a reservation (job finished or failed). */
  release(id: string, opts?: { completedRendition?: boolean; interruptedChars?: number }): void {
    this.reservations.delete(id);
    if (opts?.completedRendition) this.own.renditions += 1;
    if (opts?.interruptedChars) this.own.interruptedChars += opts.interruptedChars;
    this.schedulePersist();
  }

  private schedulePersist() {
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.persist();
    }, 2000);
  }

  async persist(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.own.updatedAt = new Date().toISOString();
    await this.storage.put(this.key(), Buffer.from(JSON.stringify(this.own, null, 2)), {
      contentType: "application/json",
      cacheControl: "no-store",
    });
  }
}
