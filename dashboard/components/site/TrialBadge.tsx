/* "100 TRIAL LICENSE" badge on a self-hosted app card (owner's picture,
 * docs/AXTO-APPS-BLUEPRINT.md §4) with the real number left — never a made-up
 * figure; hidden while the programme is closed or the pool is empty. */
"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ED } from "@/lib/i18n-pages/editions";
import { loadEditions } from "@/lib/editions-client";

export default function TrialBadge({ slug }: { slug: string }) {
  const { lang } = useI18n();
  const [left, setLeft] = useState<{ n: number; total: number } | null>(null);
  useEffect(() => {
    let live = true;
    loadEditions().then((d) => {
      const a = d?.trials.open ? d.trials.apps[slug] : null;
      if (live && a && a.total > 0) setLeft({ n: a.available, total: a.total });
    });
    return () => { live = false; };
  }, [slug]);
  if (!left) return null;
  const t = ED[lang].ui;
  return (
    <span className="relative mt-3 inline-flex items-center gap-1.5 self-start rounded-md border border-gold-400/40 bg-gold-400/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold-200" data-testid={`trial-badge-${slug}`}>
      🎟️ {left.n > 0 ? t.trialLeft.replace("{n}", String(left.n)).replace("{total}", String(left.total)) : t.trialSoldOut}
    </span>
  );
}
