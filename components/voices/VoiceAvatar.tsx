import { cn } from "@/lib/utils/cn";

const PALETTE = ["#f28c28", "#d95d7a", "#5cb88a", "#3aa7c9", "#c9a227", "#7fb3ff", "#b07cd6", "#e9a520"];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** Simple cartoon avatar: a round face with hair/turban tinted per persona and a gender-neutral smile. */
export function VoiceAvatar({
  seed,
  gender,
  className,
  grand = false,
}: {
  seed: string;
  gender: "female" | "male";
  className?: string;
  grand?: boolean;
}) {
  const h = hash(seed);
  const skin = ["#f1c9a5", "#d9a06b", "#b97a4f", "#8d5a3a"][h % 4];
  const hair = grand ? "#e8e4dc" : ["#2a1f14", "#4a2c1a", "#1d1a2e", "#5a3b1e"][(h >> 3) % 4];
  const ring = PALETTE[(h >> 6) % PALETTE.length];
  return (
    <svg viewBox="0 0 64 64" className={cn("h-16 w-16", className)} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill={ring} opacity="0.9" />
      <circle cx="32" cy="32" r="27" fill="#0b1030" />
      {gender === "female" ? (
        <path d="M12 40 C 10 18 54 18 52 40 C 52 26 12 26 12 40 Z" fill={hair} />
      ) : (
        <path d="M14 30 C 16 14 48 14 50 30 L 46 26 C 40 20 24 20 18 26 Z" fill={hair} />
      )}
      <circle cx="32" cy="34" r="15" fill={skin} />
      {gender === "female" ? (
        <path d="M17 34 C 15 20 49 20 47 34 C 44 24 20 24 17 34 Z" fill={hair} />
      ) : (
        <path d="M18 30 C 22 20 42 20 46 30 C 40 25 24 25 18 30 Z" fill={hair} />
      )}
      <circle cx="26" cy="34" r="1.8" fill="#2a1f14" />
      <circle cx="38" cy="34" r="1.8" fill="#2a1f14" />
      <path d="M27 41 q5 4 10 0" stroke="#2a1f14" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {grand ? <path d="M22 30 h6 M36 30 h6" stroke="#2a1f14" strokeWidth="1.2" /> : null}
      <path d="M12 58 C 16 46 48 46 52 58 Z" fill={ring} />
    </svg>
  );
}
