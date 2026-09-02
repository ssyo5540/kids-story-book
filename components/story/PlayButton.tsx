"use client";

import { Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { StoryCard } from "@/lib/content/catalog";
import { useLibraryStore } from "@/lib/store/libraryStore";
import { defaultRefFor, usePlayerStore } from "@/lib/store/playerStore";

export function PlayButton({ story }: { story: StoryCard }) {
  const load = usePlayerStore((s) => s.load);
  const nowId = usePlayerStore((s) => s.now?.story.id);
  const status = usePlayerStore((s) => s.status);
  const toggle = usePlayerStore((s) => s.toggle);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const saved = useLibraryStore((s) => s.positions[story.id]);
  const isCurrent = nowId === story.id;
  const resumable = !!saved && !saved.completed && saved.position > 5;

  const onClick = () => {
    if (isCurrent && status !== "error" && status !== "idle") {
      if (status === "paused" || status === "ended") toggle();
      setExpanded(true);
      return;
    }
    void load(story, defaultRefFor(story), { autoplay: true, startAt: "resume", expand: true });
  };

  return (
    <Button
      size="lg"
      leading={<Play className="h-5 w-5 fill-current" aria-hidden="true" />}
      onClick={onClick}
      aria-label={`Play ${story.title.en}`}
    >
      {isCurrent && status === "playing" ? "Now playing" : resumable ? "Resume story" : "Play story"}
    </Button>
  );
}
