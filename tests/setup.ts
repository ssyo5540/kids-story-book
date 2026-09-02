import "fake-indexeddb/auto";

// jsdom does not implement media playback; stub the methods the engine calls.
if (typeof window !== "undefined" && typeof window.HTMLMediaElement !== "undefined") {
  const proto = window.HTMLMediaElement.prototype;
  Object.defineProperty(proto, "play", {
    configurable: true,
    value: () => Promise.resolve(),
  });
  Object.defineProperty(proto, "pause", {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(proto, "load", {
    configurable: true,
    value: () => undefined,
  });
}
