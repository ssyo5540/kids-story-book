import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";

export function SideNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-line bg-bg-deep/60 px-4 py-5 lg:flex">
      <Logo />
      <nav aria-label="Main">
        <NavLinks orientation="column" />
      </nav>
      <p className="mt-auto px-4 text-xs text-fg-muted">Soft stories for sleepy listeners.</p>
    </aside>
  );
}
