"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Network-controlled ad slot for axto.io. Reads the SAME central config as the
 * whole network from api.ulyah.com (edited only in the ulyah.com admin). Off by
 * default; preview box when on without an id; real AdSense unit once an id is
 * set. Never in the admin, never sticky/interstitial.
 */
interface AdView {
  enabled: boolean;
  clientId: string;
  slots: Record<string, string>;
}

let cached: Promise<AdView> | null = null;
function fetchAdView(): Promise<AdView> {
  if (cached) return cached;
  cached = fetch("https://api.ulyah.com/content/ad-config?site=axto-io")
    .then((r) => r.json() as Promise<Partial<AdView>>)
    .then((v) => ({ enabled: !!v.enabled, clientId: v.clientId ?? "", slots: v.slots ?? {} }))
    .catch(() => ({ enabled: false, clientId: "", slots: {} }));
  return cached;
}

export function AdSlot({ placement = "footer", className = "" }: { placement?: string; className?: string }) {
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
  useEffect(() => {
    if (!view?.enabled || !slotId || pushed.current) return;
    pushed.current = true;
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
    } catch {
      /* blocked / not ready */
    }
  }, [view?.enabled, slotId]);

  if (!view || !view.enabled) return null;

  if (slotId && view.clientId) {
    return (
      <div className={`my-8 flex justify-center ${className}`}>
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

  return (
    <div className={`my-8 flex min-h-[90px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 ${className}`}>
      &#9645; Ad space &middot; position preview
    </div>
  );
}
