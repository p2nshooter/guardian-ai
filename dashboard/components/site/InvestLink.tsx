/* The footer's "Invest in AXTO" link — only while the owner shows the investor
 * round (§26.4, hidden by default — Admin → Investors). Asked in the browser so
 * the public pages stay static; while hidden nothing is in the HTML at all. */
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import T from "@/components/site/T";

let cached: Promise<boolean> | null = null;
const shown = () => (cached ??= fetch("/api/invest", { cache: "no-store" }).then((r) => r.json()).then((j) => j?.visible === true).catch(() => false));

export default function InvestLink() {
  const [on, setOn] = useState(false);
  useEffect(() => { let live = true; shown().then((v) => { if (live) setOn(v); }); return () => { live = false; }; }, []);
  if (!on) return null;
  return <li><Link href="/invest" prefetch={false} className="text-sm text-slate-400 no-underline hover:text-white" data-testid="footer-invest"><T k="foot.invest" /></Link></li>;
}
