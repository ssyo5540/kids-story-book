export interface NowPlayingMeta {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
}

const ms = () => (typeof navigator !== "undefined" && "mediaSession" in navigator ? navigator.mediaSession : null);

export function setNowPlaying(meta: NowPlayingMeta) {
  const s = ms();
  if (!s) return;
  try {
    s.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      artwork: meta.artworkUrl ? [{ src: meta.artworkUrl, sizes: "512x512", type: "image/png" }] : [],
    });
  } catch {
    /* unsupported */
  }
}

export function setPlaybackState(state: "playing" | "paused" | "none") {
  const s = ms();
  if (!s) return;
  try {
    s.playbackState = state;
  } catch {
    /* unsupported */
  }
}

let lastPos = 0;
export function updatePosition(position: number, duration: number, rate: number) {
  const s = ms();
  if (!s || !("setPositionState" in s)) return;
  const now = Date.now();
  if (now - lastPos < 1000) return;
  lastPos = now;
  try {
    if (Number.isFinite(duration) && duration > 0)
      s.setPositionState({ duration, position: Math.min(position, duration), playbackRate: rate });
  } catch {
    /* unsupported */
  }
}

export interface SessionHandlers {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekBackward: () => void;
  seekForward: () => void;
  seekTo: (sec: number) => void;
}

export function bindHandlers(h: SessionHandlers) {
  const s = ms();
  if (!s) return () => undefined;
  const pairs: [MediaSessionAction, MediaSessionActionHandler][] = [
    ["play", () => h.play()],
    ["pause", () => h.pause()],
    ["stop", () => h.stop()],
    ["seekbackward", () => h.seekBackward()],
    ["seekforward", () => h.seekForward()],
    ["seekto", (d) => (d.seekTime != null ? h.seekTo(d.seekTime) : undefined)],
  ];
  for (const [action, fn] of pairs) {
    try {
      s.setActionHandler(action, fn);
    } catch {
      /* action unsupported */
    }
  }
  return () => {
    for (const [action] of pairs) {
      try {
        s.setActionHandler(action, null);
      } catch {
        /* ignore */
      }
    }
  };
}
