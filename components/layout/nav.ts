import { BookOpen, Download, House, type LucideIcon, Mic } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Also mark active for these path prefixes. */
  match?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/collections", label: "Stories", icon: BookOpen, match: ["/collections", "/stories"] },
  { href: "/voices", label: "Voices", icon: Mic },
  { href: "/downloads", label: "Downloads", icon: Download },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  return (item.match ?? [item.href]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
