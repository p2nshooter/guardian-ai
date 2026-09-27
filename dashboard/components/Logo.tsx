/* AXTO logo — teal shield mark + wordmark (inline SVG: crisp, no request). */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="axto-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1fd8c0" />
          <stop offset="1" stopColor="#0b5f58" />
        </linearGradient>
      </defs>
      <path d="M32 3 L57 10 L57 36 L44 56 L32 61 L20 56 L7 36 L7 10 Z" fill="url(#axto-shield)" />
      <path d="M32 3 V61" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
      <path d="M24 46 L32 16 L40 46 M27 36 H37" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
