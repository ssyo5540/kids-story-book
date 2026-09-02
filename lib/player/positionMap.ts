import type { RenditionManifest } from "@/lib/audio/manifest";

/**
 * Map a position in one rendition to the equivalent position in another (e.g. after a voice or language switch).
 * Paragraph-aligned when both manifests have the same paragraph count; duration ratio otherwise.
 */
export function mapPosition(
  from: RenditionManifest | null,
  to: RenditionManifest,
  positionSec: number,
  fromDurationSec: number,
): number {
  const toDur = to.durationMs / 1000;
  const clamp = (v: number) => Math.min(Math.max(0, v), Math.max(0, toDur - 1));
  if (from && from.paragraphs.length === to.paragraphs.length && from.paragraphs.length > 0) {
    const ms = positionSec * 1000;
    let i = from.paragraphs.findIndex((p) => ms >= p.startMs && ms < p.endMs);
    if (i === -1) i = ms < from.paragraphs[0].startMs ? 0 : from.paragraphs.length - 1;
    const fp = from.paragraphs[i];
    const tp = to.paragraphs[i];
    const span = Math.max(1, fp.endMs - fp.startMs);
    const r = Math.min(1, Math.max(0, (ms - fp.startMs) / span));
    return clamp((tp.startMs + r * (tp.endMs - tp.startMs)) / 1000);
  }
  if (fromDurationSec <= 0) return 0;
  return clamp((positionSec / fromDurationSec) * toDur);
}

/** Index of the paragraph being narrated at a position (for read-along highlighting). */
export function paragraphAt(manifest: RenditionManifest | null, positionSec: number): number {
  if (!manifest) return -1;
  const ms = positionSec * 1000;
  for (const p of manifest.paragraphs) if (ms >= p.startMs && ms < p.endMs) return p.index;
  return -1;
}
