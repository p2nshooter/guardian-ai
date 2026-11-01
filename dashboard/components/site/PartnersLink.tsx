/* The "Partner programmes" links (footer, and "Partners" in the header — owner,
 * 1 Nov 2026, REQUESTS 132) — only while at least one programme is shown
 * (Admin → Programs, all shown by default). Asked in the browser once per page
 * load so the public pages stay static. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import T from "@/components/site/T";

let cached: Promise<boolean> | null = null;
const shown = () => (cached ??= fetch("/api/programs", { cache: "no-store" }).then((r) => r.json()).then((j) => j?.any === true).catch(() => false));

/** True once the site knows at least one partner programme is shown. */
export function usePartnersShown() {
  const [on, setOn] = useState(false);
  useEffect(() => { let live = true; shown().then((v) => { if (live) setOn(v); }); return () => { live = false; }; }, []);
  return on;
}

export default function PartnersLink() {
  const on = usePartnersShown();
  if (!on) return null;
  return <li><Link href="/partners" prefetch={false} className="text-sm text-slate-400 no-underline hover:text-white" data-testid="footer-partners"><T k="foot.partners" /></Link></li>;
}
