import { Settings } from "lucide-react";
import Link from "next/link";
import { DimToggle } from "./DimToggle";
import { Logo } from "./Logo";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="hidden lg:block" />
        <div className="flex items-center gap-1">
          <DimToggle />
          <Link
            href="/settings"
            aria-label="Grown-ups settings"
            className="inline-flex h-tap w-tap items-center justify-center rounded-pill text-fg-muted transition hover:bg-white/10 hover:text-fg"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
