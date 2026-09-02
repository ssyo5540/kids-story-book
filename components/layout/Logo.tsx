import Link from "next/link";
import { SleepyMoon } from "@/components/ui/SleepyMoon";

export const APP_NAME = "Nightlight Tales";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${APP_NAME} home`}>
      <SleepyMoon className="h-9 w-9 drop-shadow-[0_0_12px_rgba(246,183,60,0.45)]" />
      {!compact ? (
        <span className="font-display text-xl font-extrabold tracking-tight text-star">{APP_NAME}</span>
      ) : null}
    </Link>
  );
}
