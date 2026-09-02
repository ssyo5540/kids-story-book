"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fetchManifest, requestRendition } from "@/lib/api-client/renditions";
import type { StoryCard } from "@/lib/content/catalog";
import { isIOS, isStandalone } from "@/lib/player/capabilities";
import { downloadKey } from "@/lib/pwa/db";
import { downloadRendition, formatBytes, isDownloaded, removeDownload } from "@/lib/pwa/downloads";
import { defaultRefFor } from "@/lib/store/playerStore";
import { cn } from "@/lib/utils/cn";

/** Download the story in the family's current voice for offline listening. */
export function DownloadButton({ story, className }: { story: StoryCard; className?: string }) {
  const qc = useQueryClient();
  const ref = defaultRefFor(story);
  const key = downloadKey(story.id, ref.locale, ref.voice);
  const existing = useQuery({ queryKey: ["download", key], queryFn: () => isDownloaded(ref) });
  const [progress, setProgress] = useState<number | null>(null);

  const download = useMutation({
    mutationFn: async () => {
      const res = await requestRendition(ref);
      if (res.status !== "ready")
        throw new Error(
          res.status === "generating"
            ? "This voice is still being prepared. Play it once, then download."
            : res.message,
        );
      const manifest = await fetchManifest(res.rendition.manifestUrl);
      return downloadRendition(story, res.rendition, manifest, {
        onProgress: (p) => setProgress(p.total ? p.loaded / p.total : null),
      });
    },
    onSuccess: (rec) => {
      toast(`Saved for offline (${formatBytes(rec.bytes)})`);
      if (isIOS() && !isStandalone()) toast("Tip: install the app so downloads stay put.", { duration: 6000 });
      void qc.invalidateQueries({ queryKey: ["download"] });
      void qc.invalidateQueries({ queryKey: ["downloads"] });
    },
    onError: (e) => toast((e as Error).message),
    onSettled: () => setProgress(null),
  });

  const remove = useMutation({
    mutationFn: () => removeDownload(key),
    onSuccess: () => {
      toast("Removed download");
      void qc.invalidateQueries({ queryKey: ["download"] });
      void qc.invalidateQueries({ queryKey: ["downloads"] });
    },
  });

  const busy = download.isPending || remove.isPending;
  const done = !!existing.data;

  return (
    <button
      type="button"
      onClick={() => (done ? window.confirm("Remove this download?") && remove.mutate() : download.mutate())}
      disabled={busy}
      aria-label={done ? "Remove offline download" : "Download for offline"}
      className={cn(
        "inline-flex h-14 items-center gap-2 rounded-pill border border-line px-5 font-display font-bold text-fg transition hover:bg-white/10 disabled:opacity-60",
        done && "border-leaf-500/60 text-leaf-500",
        className,
      )}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : done ? (
        <Check className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Download className="h-5 w-5" aria-hidden="true" />
      )}
      {busy && progress !== null ? `${Math.round(progress * 100)}%` : done ? "Downloaded" : "Download"}
      {done && !busy ? <Trash2 className="ml-1 h-4 w-4 opacity-60" aria-hidden="true" /> : null}
    </button>
  );
}
