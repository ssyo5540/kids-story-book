import type { ReactNode } from "react";
import { AudioProvider } from "@/components/player/AudioProvider";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { PlayerSheet } from "@/components/player/PlayerSheet";
import { BottomTabBar } from "./BottomTabBar";
import { SideNav } from "./SideNav";
import { StarfieldBackground } from "./StarfieldBackground";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <StarfieldBackground />
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
        >
          Skip to content
        </a>
        <TopBar />
        <main
          id="main"
          className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6"
          style={{
            paddingBottom: "calc(var(--spacing-tabbar) + var(--dock-h) + env(safe-area-inset-bottom) + 1.5rem)",
          }}
        >
          {children}
        </main>
      </div>
      <BottomTabBar />
      <AudioProvider />
      <MiniPlayer />
      <PlayerSheet />
    </div>
  );
}
