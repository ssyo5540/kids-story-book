import { detectVolumeControl } from "./capabilities";

export type EngineEvent =
  | { type: "time"; position: number; duration: number; buffered: number }
  | { type: "status"; status: "playing" | "paused" | "buffering" | "ended" }
  | { type: "duration"; duration: number }
  | { type: "error"; code: "network" | "decode" | "unsupported" | "aborted"; message: string }
  | { type: "previewended" };

const SILENCE = "/audio/silence-1s.mp3";

/**
 * The only code that touches the media elements. Three elements live for the whole app:
 * narration (main story), ambience (looping background), preview (voice samples).
 * No Web Audio graph: it is suspended in the background on iOS.
 */
export class AudioEngine {
  private narration: HTMLAudioElement | null = null;
  private ambienceEl: HTMLAudioElement | null = null;
  private previewEl: HTMLAudioElement | null = null;
  private listeners = new Set<(e: EngineEvent) => void>();
  private detach: (() => void) | null = null;
  private unlocked = false;
  private baseVolume = 1;
  private ambienceBaseVolume = 1;
  private gain = 1;
  canSetVolume = true;

  attach(els: { narration: HTMLAudioElement; ambience: HTMLAudioElement; preview: HTMLAudioElement }): () => void {
    this.detach?.();
    this.narration = els.narration;
    this.ambienceEl = els.ambience;
    this.previewEl = els.preview;
    this.canSetVolume = detectVolumeControl(els.narration);
    const n = els.narration;
    const emit = (e: EngineEvent) => {
      for (const l of this.listeners) l(e);
    };
    const time = () =>
      emit({
        type: "time",
        position: n.currentTime,
        duration: Number.isFinite(n.duration) ? n.duration : 0,
        buffered: bufferedEnd(n),
      });
    const handlers: [string, EventListener][] = [
      ["timeupdate", time],
      ["progress", time],
      ["loadedmetadata", () => emit({ type: "duration", duration: Number.isFinite(n.duration) ? n.duration : 0 })],
      ["durationchange", () => emit({ type: "duration", duration: Number.isFinite(n.duration) ? n.duration : 0 })],
      ["playing", () => (n.paused ? undefined : emit({ type: "status", status: "playing" }))],
      ["pause", () => (n.ended || !n.paused ? undefined : emit({ type: "status", status: "paused" }))],
      ["waiting", () => emit({ type: "status", status: "buffering" })],
      ["stalled", () => emit({ type: "status", status: "buffering" })],
      ["ended", () => emit({ type: "status", status: "ended" })],
      [
        "error",
        () => {
          const code = n.error?.code;
          const map: Record<number, EngineEvent & { type: "error" }> = {
            1: { type: "error", code: "aborted", message: "Playback was interrupted." },
            2: { type: "error", code: "network", message: "The story could not be downloaded. Check your connection." },
            3: { type: "error", code: "decode", message: "This audio file could not be played." },
            4: { type: "error", code: "unsupported", message: "This audio is not supported on this device." },
          };
          if (n.src && n.src !== window.location.href && !n.src.endsWith(SILENCE)) emit(map[code ?? 2] ?? map[2]);
        },
      ],
    ];
    for (const [ev, fn] of handlers) n.addEventListener(ev, fn);
    const onPreviewEnded = () => emit({ type: "previewended" });
    els.preview.addEventListener("ended", onPreviewEnded);
    this.detach = () => {
      for (const [ev, fn] of handlers) n.removeEventListener(ev, fn);
      els.preview.removeEventListener("ended", onPreviewEnded);
    };
    return this.detach;
  }

  on(cb: (e: EngineEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Call inside a user gesture: a silent clip "activates" the element so later programmatic play() is allowed. */
  unlock() {
    const n = this.narration;
    if (!n || this.unlocked) return;
    if (n.src && !n.paused) return;
    try {
      n.src = SILENCE;
      n.load();
      void n
        .play()
        .then(() => {
          this.unlocked = true;
        })
        .catch(() => undefined);
      this.ambienceEl?.load();
    } catch {
      /* ignore */
    }
  }

  /** Set a new narration source and seek to `startAt` once metadata is known. */
  setSource(src: string, startAt: number): Promise<void> {
    const n = this.narration;
    if (!n) return Promise.reject(new Error("engine not attached"));
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        n.removeEventListener("loadedmetadata", onMeta);
        n.removeEventListener("error", onErr);
      };
      const onMeta = () => {
        cleanup();
        if (startAt > 0 && Number.isFinite(n.duration)) n.currentTime = Math.min(startAt, Math.max(0, n.duration - 1));
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error("could not load audio"));
      };
      n.addEventListener("loadedmetadata", onMeta);
      n.addEventListener("error", onErr);
      n.pause();
      n.src = src;
      n.load();
    });
  }

  play(): Promise<void> {
    const n = this.narration;
    if (!n) return Promise.reject(new Error("engine not attached"));
    return n.play().then(() => {
      this.unlocked = true;
      this.ambience.play();
    });
  }

  pause() {
    this.narration?.pause();
    this.ambience.pause();
  }

  seek(sec: number) {
    const n = this.narration;
    if (!n) return;
    const d = Number.isFinite(n.duration) ? n.duration : Number.POSITIVE_INFINITY;
    n.currentTime = Math.max(0, Math.min(sec, d));
  }

  setRate(rate: number) {
    if (this.narration) this.narration.playbackRate = rate;
  }

  /** Base volume (0–1); the sleep-timer gain multiplies it. */
  setVolume(v: number) {
    this.baseVolume = v;
    this.applyVolumes();
  }

  /** Sleep-timer gain (0–1). No-op on platforms without volume control. */
  setGain(g: number) {
    this.gain = g;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.canSetVolume) return;
    if (this.narration) this.narration.volume = clamp01(this.baseVolume * this.gain);
    if (this.ambienceEl) this.ambienceEl.volume = clamp01(this.ambienceBaseVolume * this.gain);
  }

  get position() {
    return this.narration?.currentTime ?? 0;
  }
  get duration() {
    const d = this.narration?.duration ?? 0;
    return Number.isFinite(d) ? d : 0;
  }
  get paused() {
    return this.narration?.paused ?? true;
  }
  get hasSource() {
    const s = this.narration?.src ?? "";
    return !!s && !s.endsWith(SILENCE);
  }

  readonly ambience = {
    set: (src: string | null) => {
      const a = this.ambienceEl;
      if (!a) return;
      if (!src) {
        a.pause();
        a.removeAttribute("src");
        a.load();
        return;
      }
      const abs = new URL(src, window.location.href).href;
      if (a.src !== abs) {
        a.src = src;
        a.loop = true;
        a.load();
      }
      if (this.narration && !this.narration.paused) void a.play().catch(() => undefined);
    },
    play: () => {
      const a = this.ambienceEl;
      if (a?.src) void a.play().catch(() => undefined);
    },
    pause: () => this.ambienceEl?.pause(),
    setVolume: (v: number) => {
      this.ambienceBaseVolume = v;
      this.applyVolumes();
    },
  };

  readonly preview = {
    play: async (url: string) => {
      const p = this.previewEl;
      if (!p) return;
      p.src = url;
      p.load();
      await p.play();
    },
    stop: () => {
      const p = this.previewEl;
      if (!p) return;
      p.pause();
      p.currentTime = 0;
    },
    get playing() {
      return !!this.previewElRef && !this.previewElRef.paused;
    },
    previewElRef: null as HTMLAudioElement | null,
  };
}

function bufferedEnd(el: HTMLMediaElement): number {
  try {
    const b = el.buffered;
    return b.length ? b.end(b.length - 1) : 0;
  } catch {
    return 0;
  }
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/** Module singleton shared by the provider and the store. */
export const engine = new AudioEngine();
