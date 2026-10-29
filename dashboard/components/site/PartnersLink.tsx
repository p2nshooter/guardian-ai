/* The footer's "Partner programmes" link — only while at least one programme is
 * shown (Admin → Programs, all shown by default). Asked in the browser so the
 * public pages stay static. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import T from "@/components/site/T";

let cached: Promise<boolean> | null = null;
const shown = () => (cached ??= fetch("/api/programs", { cache: "no-store" }).then((r) => r.json()).then((j) => j?.any === true).catch(() => false));

export default function PartnersLink() {
  const [on, setOn] = useState(false);
  useEffect(() => { let live = true; shown().then((v) => { if (live) setOn(v); }); return () => { live = false; }; }, []);
  if (!on) return null;
  return <li><Link href="/partners" prefetch={false} className="text-sm text-slate-400 no-underline hover:text-white" data-testid="footer-partners"><T k="foot.partners" /></Link></li>;
}
