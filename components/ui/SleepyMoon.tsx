export function SleepyMoon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M40 6a26 26 0 1 0 18 44 22 22 0 1 1-18-44z" fill="#f6b73c" />
      <path
        d="M40 6a26 26 0 0 0-18 8 22 22 0 0 1 22 30 26 26 0 0 0 14 6A26 26 0 0 0 40 6z"
        fill="#ffd27a"
        opacity="0.55"
      />
      <path d="M30 30q3 3 6 0" stroke="#2a1f14" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M42 26q3 3 6 0" stroke="#2a1f14" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M36 40q4 3 8 0" stroke="#2a1f14" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1.6" fill="#fff4c2" />
      <circle cx="16" cy="50" r="1.3" fill="#fff4c2" />
      <circle cx="6" cy="34" r="1.1" fill="#fff4c2" />
    </svg>
  );
}
