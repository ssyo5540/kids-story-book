import { NavLinks } from "./NavLinks";

export function BottomTabBar() {
  return (
    <nav
      aria-label="Main"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-deep/90 backdrop-blur-md lg:hidden"
    >
      <NavLinks orientation="row" />
    </nav>
  );
}
