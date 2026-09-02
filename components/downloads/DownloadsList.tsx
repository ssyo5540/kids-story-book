"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicCatalog } from "@/lib/content/catalog";
import { LOCALE_INFO } from "@/lib/content/types";
import { personaFor, useVoices } from "@/lib/hooks/useVoices";
import { isIOS, isStandalone } from "@/lib/player/capabilities";
import { formatBytes, listDownloads, removeDownload, storageEstimate } from "@/lib/pwa/downloads";
import { usePlayerStore } from "@/lib/store/playerStore";
import { formatClock } from "@/lib/utils/time";

export function DownloadsList({ catalog }: { catalog: PublicCatalog }) {
  const qc = useQueryClient();
  const { data: downloads, isLoading } = useQuery({ queryKey: ["downloads"], queryFn: listDownloads });
  const { data: voices } = useVoices();
  const loadKnown = usePlayerStore((s) => s.loadKnown);
  const { data: est } = useQuery({
    queryKey: ["storage", downloads?.length ?? 0],
    queryFn: storageEstimate,
  });

  const remove = useMutation({
    mutationFn: removeDownload,
    onSuccess: () => {
      toast("Removed");
      void qc.invalidateQueries({ queryKey: ["downloads"] });
      void qc.invalidateQueries({ queryKey: ["download"] });
    },
  });

  if (isLoading) return <div className="h-32 animate-pulse rounded-card bg-white/5" aria-hidden="true" />;
  if (!downloads?.length)
    return (
      <EmptyState
        title="Nothing saved yet"
        body="Open a story and tap Download to keep it on this device for trips, flights and places without signal."
        action={
          <Link href="/collections">
            <Button variant="secondary">Find a story</Button>
          </Link>
        }
      />
    );

  const total = downloads.reduce((n, d) => n + d.bytes, 0);
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        {downloads.length} {downloads.length === 1 ? "story" : "stories"} · {formatBytes(total)}
        {est?.quota
          ? ` · about ${Math.round((est.quota - est.usage) / 1_048_576).toLocaleString()} MB free on this device`
          : ""}
      </p>
      {isIOS() && !isStandalone() ? (
        <p className="rounded-card border border-dashed border-lamp-300/50 bg-lamp-300/10 px-3 py-2 text-sm text-lamp-200">
          Safari may clear downloads after a week without use. Install the app (Share → Add to Home Screen) so they stay
          put.
        </p>
      ) : null}
      <ul className="space-y-2">
        {downloads.map((d) => {
          const story = catalog.stories.find((s) => s.id === d.storyId);
          const persona = personaFor(voices, d.locale, d.voice);
          return (
            <li key={d.key} className="flex items-center gap-3 rounded-card border border-line bg-white/5 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-extrabold">{d.title}</p>
                <p className="truncate text-xs text-fg-muted">
                  {persona?.displayNameLatin ?? d.voice} · {LOCALE_INFO[d.locale].label} ·{" "}
                  {formatClock(d.durationMs / 1000)} · {formatBytes(d.bytes)}
                </p>
              </div>
              {story ? (
                <Button
                  size="sm"
                  leading={<Play className="h-4 w-4 fill-current" aria-hidden="true" />}
                  onClick={() =>
                    void loadKnown(
                      story,
                      {
                        key: `audio/${d.storyId}/${d.locale}/${d.voice}/${d.renditionHash}`,
                        storyId: d.storyId,
                        locale: d.locale,
                        voice: d.voice,
                        lang: story.langs.includes("en") ? "en" : story.langs[0],
                        renditionHash: d.renditionHash,
                        contentHash: d.contentHash,
                        url: d.audioUrl,
                        manifestUrl: d.manifestUrl,
                        bytes: d.bytes,
                        durationMs: d.durationMs,
                        mimeType: "audio/mpeg",
                        createdAt: new Date(d.createdAt).toISOString(),
                      },
                      { autoplay: true, startAt: "resume", expand: true },
                    )
                  }
                >
                  Play
                </Button>
              ) : null}
              <button
                type="button"
                onClick={() => window.confirm(`Remove "${d.title}"?`) && remove.mutate(d.key)}
                aria-label={`Remove ${d.title}`}
                className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-fg-muted hover:bg-white/10 hover:text-fg"
              >
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
