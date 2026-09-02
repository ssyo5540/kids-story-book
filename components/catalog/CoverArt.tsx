import { cn } from "@/lib/utils/cn";

/**
 * Stylised book-cover illustration: night gradient tinted by the accent colour, a few stars,
 * and a simple symbol. Pure SVG so it ships with the static page.
 */
export function CoverArt({
  symbol = "moon",
  accent,
  className,
  title,
}: {
  symbol?: string;
  accent: string;
  className?: string;
  title?: string;
}) {
  const id = `cov-${accent.replace("#", "")}-${symbol}`;
  return (
    <svg
      viewBox="0 0 120 160"
      className={cn("h-full w-full", className)}
      role="img"
      aria-hidden={title ? undefined : true}
    >
      <title>{title ?? "Book cover illustration"}</title>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#1f2766" />
          <stop offset="1" stopColor="#0b1030" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="38%" r="45%">
          <stop offset="0" stopColor="#fff4c2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff4c2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="160" fill={`url(#${id}-bg)`} />
      <rect width="120" height="160" fill={`url(#${id}-glow)`} />
      <g fill="#fff4c2">
        <circle cx="18" cy="22" r="1.4" />
        <circle cx="96" cy="16" r="1.1" />
        <circle cx="104" cy="52" r="1.6" />
        <circle cx="30" cy="70" r="1" />
        <circle cx="86" cy="86" r="1.2" />
        <circle cx="14" cy="120" r="1.3" />
      </g>
      <g
        transform="translate(60 78)"
        fill="#fff8e7"
        stroke="#fff8e7"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <CoverSymbol symbol={symbol} accent={accent} />
      </g>
      <path d="M0 132 Q30 120 60 132 T120 132 V160 H0 Z" fill="#070b22" opacity="0.55" />
    </svg>
  );
}

function CoverSymbol({ symbol, accent }: { symbol: string; accent: string }) {
  switch (symbol) {
    case "bow":
      return (
        <g fill="none">
          <path d="M-22 -30 Q 30 0 -22 30" />
          <path d="M-22 -30 L-22 30" strokeWidth="1.5" />
          <path d="M-22 0 H 30" />
          <path d="M30 0 l-8 -5 M30 0 l-8 5" />
          <path d="M-22 0 l-7 -4 M-22 0 l-7 4" strokeWidth="1.5" />
        </g>
      );
    case "bridge":
      return (
        <g fill="none">
          <path d="M-36 6 Q 0 -34 36 6" />
          <path d="M-30 6 Q 0 -20 30 6" strokeWidth="1.5" />
          <path d="M-40 18 q 8 -5 16 0 t 16 0 t 16 0 t 16 0" strokeWidth="2" />
          <path d="M-40 28 q 8 -5 16 0 t 16 0 t 16 0 t 16 0" strokeWidth="1.5" opacity="0.7" />
        </g>
      );
    case "banyan":
      return (
        <g>
          <path d="M-4 30 L-4 4 M4 30 L4 4" fill="none" />
          <path d="M-14 30 L-8 10 M14 30 L8 10" fill="none" strokeWidth="1.5" />
          <ellipse cx="0" cy="-10" rx="34" ry="20" stroke="none" />
          <ellipse cx="-18" cy="0" rx="16" ry="11" stroke="none" />
          <ellipse cx="18" cy="0" rx="16" ry="11" stroke="none" />
          <ellipse cx="0" cy="-24" rx="18" ry="12" stroke="none" />
        </g>
      );
    case "lotus":
      return (
        <g stroke="none">
          <path d="M0 24 C -30 24 -34 -4 -20 -12 C -12 4 -4 12 0 24 Z" />
          <path d="M0 24 C 30 24 34 -4 20 -12 C 12 4 4 12 0 24 Z" />
          <path d="M0 24 C -18 10 -16 -18 0 -30 C 16 -18 18 10 0 24 Z" />
          <path d="M0 24 C -10 14 -12 -8 -8 -20 C -2 -4 0 8 0 24 Z" fill={accent} opacity="0.6" />
          <path d="M0 24 C 10 14 12 -8 8 -20 C 2 -4 0 8 0 24 Z" fill={accent} opacity="0.6" />
        </g>
      );
    case "olive":
      return (
        <g>
          <path d="M-34 24 C -10 0 10 -10 36 -28" fill="none" />
          <ellipse cx="-20" cy="10" rx="9" ry="4" transform="rotate(-35 -20 10)" stroke="none" />
          <ellipse cx="-6" cy="-1" rx="9" ry="4" transform="rotate(-35 -6 -1)" stroke="none" />
          <ellipse cx="9" cy="-11" rx="9" ry="4" transform="rotate(-35 9 -11)" stroke="none" />
          <ellipse cx="24" cy="-21" rx="9" ry="4" transform="rotate(-35 24 -21)" stroke="none" />
          <ellipse cx="-12" cy="18" rx="9" ry="4" transform="rotate(35 -12 18)" stroke="none" />
          <ellipse cx="3" cy="8" rx="9" ry="4" transform="rotate(35 3 8)" stroke="none" />
          <ellipse cx="18" cy="-2" rx="9" ry="4" transform="rotate(35 18 -2)" stroke="none" />
          <circle cx="-2" cy="14" r="3.5" fill={accent} stroke="none" />
          <circle cx="12" cy="4" r="3.5" fill={accent} stroke="none" />
        </g>
      );
    case "sunboat":
      return (
        <g>
          <circle cx="0" cy="-16" r="13" stroke="none" fill="#ffd27a" />
          <path d="M-36 14 Q 0 6 36 14 L 28 26 H -28 Z" stroke="none" />
          <path d="M-38 12 Q -46 2 -34 -8 M38 12 Q 46 2 34 -8" fill="none" />
          <path d="M-40 34 q 8 -5 16 0 t 16 0 t 16 0 t 16 0" fill="none" strokeWidth="2" opacity="0.7" />
        </g>
      );
    case "berries":
      return (
        <g>
          <path d="M0 -30 C 0 -10 0 0 0 10" fill="none" />
          <path d="M0 -14 C -14 -20 -22 -10 -20 -2 C -8 0 -2 -6 0 -14 Z" stroke="none" fill="#5cb88a" />
          <path d="M0 -6 C 14 -12 22 -2 20 6 C 8 8 2 2 0 -6 Z" stroke="none" fill="#5cb88a" />
          <circle cx="-10" cy="18" r="8" stroke="none" fill={accent} />
          <circle cx="8" cy="22" r="8" stroke="none" fill={accent} />
          <circle cx="0" cy="8" r="8" stroke="none" fill={accent} />
          <circle cx="-12" cy="15" r="2" stroke="none" fill="#fff8e7" opacity="0.7" />
          <circle cx="6" cy="19" r="2" stroke="none" fill="#fff8e7" opacity="0.7" />
        </g>
      );
    case "star":
      return <path d="M0 -30 L8 -9 L30 -9 L12 4 L19 26 L0 13 L-19 26 L-12 4 L-30 -9 L-8 -9 Z" stroke="none" />;
    case "pot":
      return (
        <g>
          <path d="M-14 -22 H 14 L 10 -12 H -10 Z" stroke="none" />
          <path d="M-12 -12 C -34 -4 -34 26 -8 30 H 8 C 34 26 34 -4 12 -12 Z" stroke="none" />
          <path d="M-20 4 Q 0 12 20 4" fill="none" stroke={accent} strokeWidth="3" />
        </g>
      );
    case "lamp":
      return (
        <g>
          <path d="M0 -30 C 8 -20 8 -10 0 -4 C -8 -10 -8 -20 0 -30 Z" stroke="none" fill="#ffd27a" />
          <path d="M-22 4 C -22 18 22 18 22 4 L 30 0 C 26 26 -26 26 -30 0 Z" stroke="none" />
          <path d="M0 -4 V 4" fill="none" />
        </g>
      );
    case "tortoise":
      return (
        <g>
          <ellipse cx="0" cy="4" rx="28" ry="18" stroke="none" />
          <path
            d="M-10 -8 h 20 M-18 4 h 36 M-10 16 h 20 M-6 -8 v 24 M6 -8 v 24"
            fill="none"
            stroke={accent}
            strokeWidth="2"
          />
          <circle cx="32" cy="6" r="7" stroke="none" />
          <circle cx="34" cy="4" r="1.5" stroke="none" fill="#0b1030" />
          <rect x="-24" y="16" width="8" height="10" rx="3" stroke="none" />
          <rect x="14" y="16" width="8" height="10" rx="3" stroke="none" />
        </g>
      );
    case "elephant":
      return (
        <g>
          <ellipse cx="-4" cy="6" rx="26" ry="20" stroke="none" />
          <circle cx="20" cy="-6" r="14" stroke="none" />
          <path d="M28 4 C 40 10 40 26 30 32" fill="none" strokeWidth="5" />
          <ellipse cx="12" cy="-4" rx="8" ry="12" stroke="none" opacity="0.8" />
          <circle cx="24" cy="-9" r="1.6" stroke="none" fill="#0b1030" />
          <rect x="-24" y="18" width="9" height="14" rx="3" stroke="none" />
          <rect x="-4" y="18" width="9" height="14" rx="3" stroke="none" />
        </g>
      );
    case "wave":
      return (
        <g fill="none">
          <path d="M-40 -6 q 10 -12 20 0 t 20 0 t 20 0 t 20 0" />
          <path d="M-40 10 q 10 -12 20 0 t 20 0 t 20 0 t 20 0" opacity="0.8" />
          <path d="M-40 26 q 10 -12 20 0 t 20 0 t 20 0 t 20 0" opacity="0.6" />
        </g>
      );
    case "feather":
      return (
        <g>
          <path d="M0 32 C -30 10 -20 -28 6 -34 C 26 -14 22 18 0 32 Z" stroke="none" />
          <path d="M0 32 C 2 10 4 -10 8 -30" fill="none" stroke={accent} strokeWidth="2" />
        </g>
      );
    case "lyre":
      return (
        <g fill="none">
          <path d="M-22 26 C -34 6 -30 -22 -14 -30 M22 26 C 34 6 30 -22 14 -30" />
          <path d="M-22 26 H 22" />
          <path d="M-14 -20 V 22 M-5 -24 V 22 M5 -24 V 22 M14 -20 V 22" strokeWidth="1.5" />
        </g>
      );
    case "mango":
      return (
        <g>
          <path d="M-10 -26 C 26 -30 34 20 6 30 C -24 36 -34 -4 -10 -26 Z" stroke="none" fill="#ffd27a" />
          <path d="M-12 -26 C -14 -34 -6 -36 -2 -32" fill="none" />
          <path d="M-4 -30 C 6 -34 14 -28 12 -22 C 4 -22 0 -26 -4 -30 Z" stroke="none" fill="#5cb88a" />
        </g>
      );
    default:
      return (
        <g stroke="none">
          <path d="M12 -34 a 30 30 0 1 0 22 50 a 24 24 0 1 1 -22 -50 z" />
          <circle cx="-16" cy="-6" r="2" />
          <circle cx="-26" cy="14" r="1.5" />
        </g>
      );
  }
}
