/* AXTO logo — the same violet shield with a watchful eye as the favicon
 * (public/favicon.svg), so the tab, the app icon and the page match. Inline SVG. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="axto-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6d5dfc" />
          <stop offset="1" stopColor="#2a1f7a" />
        </linearGradient>
      </defs>
      <path d="M32 3 56 12v18c0 15-10 26-24 31C18 56 8 45 8 30V12Z" fill="url(#axto-shield)" />
      <path d="M15 32c5-7 11-10 17-10s12 3 17 10c-5 7-11 10-17 10s-12-3-17-10Z" fill="#fff" />
      <circle cx="32" cy="32" r="6" fill="#2a1f7a" />
      <circle cx="34" cy="30" r="1.8" fill="#fff" />
    </svg>
  );
}

export function Logo({ dark = false, size = 28, suffix }: { dark?: boolean; size?: number; suffix?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className={`text-[19px] font-extrabold tracking-tight ${dark ? "text-white" : "text-ink-900"}`}>AXTO</span>
      {suffix ? <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${dark ? "bg-white/10 text-brand-300" : "bg-brand-50 text-brand-700"}`}>{suffix}</span> : null}
    </span>
  );
}
