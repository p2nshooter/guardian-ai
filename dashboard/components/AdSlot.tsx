"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Network-controlled ad slot for axto.io. Reads the SAME central config as the
 * whole network from api.ulyah.com — edited ONLY in the ulyah.com admin portal
 * ("semua dikontrol dari portal admin ulyah.com").
 *
 * Contract (mirrors ulyah's publicAdView) — a REAL AdSense unit renders ONLY
 * when the owner has, from the ulyah admin:
 *   1. enabled  this site, AND
 *   2. approved this site (the AdSense-accepted checklist), AND
 *   3. pasted a real ad-unit id for this placement.
 * enabled-but-not-approved (or no id yet) shows a tasteful PREVIEW box so ad
 * positions can be checked before going live. Off by default. Never in /admin,
 * never sticky/interstitial. So an ad only ever appears once a REAL id exists —
 * exactly "baru muncul iklan klo sudah ada id realnya".
 */
interface AdView {
  enabled: boolean;
  approved: boolean;
  clientId: string;
  slots: Record<string, string>;
}

const AD_CONFIG_URL = "https://api.ulyah.com/content/ad-config?site=axto-io";

let cached: Promise<AdView> | null = null;
function fetchAdView(): Promise<AdView> {
  if (cached) return cached;
  cached = fetch(AD_CONFIG_URL, { cache: "no-store" })
    .then((r) => r.json() as Promise<Partial<AdView>>)
    .then((v) => ({
      enabled: !!v.enabled,
      approved: !!v.approved,
      clientId: v.clientId ?? "",
      slots: v.slots ?? {},
    }))
    .catch(() => ({ enabled: false, approved: false, clientId: "", slots: {} }));
  return cached;
}

export function AdSlot({
  placement = "footer",
  className = "",
  label = true,
}: {
  placement?: string;
  className?: string;
  /** Show the tiny "Advertisement" label above a live unit (AdSense policy-friendly). */
  label?: boolean;
}) {
  const [view, setView] = useState<AdView | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.includes("/admin")) return;
    let alive = true;
    fetchAdView().then((v) => alive && setView(v));
    return () => {
      alive = false;
    };
  }, []);

  const slotId = view?.slots?.[placement] || "";
  const live = !!view?.enabled && !!view?.approved && !!slotId && !!view?.clientId;

  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    try {
      // The global adsbygoogle array is created by the loader script in the
      // <head> (app/layout.tsx). We only push when a real, approved unit renders.
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
    } catch {
      /* blocked / not ready */
    }
  }, [live]);

  // Not enabled for this site → render nothing at all.
  if (!view || !view.enabled) return null;

  // Enabled + approved + real id → the live AdSense unit.
  if (live) {
    return (
      <div className={`my-8 flex flex-col items-center ${className}`}>
        {label && (
          <span className="mb-1 text-[10px] uppercase tracking-wider text-gray-400">Advertisement</span>
        )}
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", minHeight: 90 }}
          data-ad-client={view.clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Enabled but not yet approved / no id → position preview only.
  return (
    <div
      className={`my-8 flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 ${className}`}
    >
      &#9645; Ad space &middot; position preview
    </div>
  );
}
