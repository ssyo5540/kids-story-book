"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { isActive, NAV_ITEMS } from "./nav";

export function NavLinks({ orientation }: { orientation: "row" | "column" }) {
  const pathname = usePathname() ?? "/";
  return (
    <ul className={cn("flex", orientation === "row" ? "w-full justify-around" : "flex-col gap-1")}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <li key={item.href} className={orientation === "row" ? "flex-1" : undefined}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center font-display font-bold transition",
                orientation === "row"
                  ? "h-tabbar flex-col justify-center gap-0.5 text-[0.7rem]"
                  : "h-tap gap-3 rounded-pill px-4 text-base",
                active ? "text-accent" : "text-fg-muted hover:text-fg",
                orientation === "column" && active && "bg-white/10",
                orientation === "column" && !active && "hover:bg-white/5",
              )}
            >
              <Icon className={cn(orientation === "row" ? "h-6 w-6" : "h-5 w-5")} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
