"use client";

import { Drawer } from "vaul";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { usePlayerStore } from "@/lib/store/playerStore";
import { cn } from "@/lib/utils/cn";
import { PlayerBody } from "./PlayerBody";

export function PlayerSheet() {
  const expanded = usePlayerStore((s) => s.expanded);
  const setExpanded = usePlayerStore((s) => s.setExpanded);
  const hasStory = usePlayerStore((s) => !!s.now);
  const desktop = useMediaQuery("(min-width: 1024px)");
  if (!hasStory) return null;
  return (
    <Drawer.Root
      open={expanded}
      onOpenChange={setExpanded}
      direction={desktop ? "right" : "bottom"}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col bg-bg text-fg outline-none",
            desktop
              ? "inset-y-0 right-0 w-[26rem] border-l border-line"
              : "inset-x-0 bottom-0 h-[94dvh] rounded-t-sheet border-t border-line",
          )}
        >
          <div className="starfield -z-10 rounded-t-sheet" aria-hidden="true">
            <i />
          </div>
          {!desktop ? <Drawer.Handle className="mt-3 !w-12 !bg-white/30" /> : null}
          <Drawer.Title className="sr-only">Now playing</Drawer.Title>
          <div className="safe-bottom flex-1 overflow-y-auto px-5 pb-6 pt-3 sm:px-7">
            <PlayerBody onCollapse={() => setExpanded(false)} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
