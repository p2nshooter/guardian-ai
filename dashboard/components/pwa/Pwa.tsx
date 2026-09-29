/* ==============================================================================
 * Installable app (PWA): registers the service worker, captures the browser's
 * install prompt (Android/Chrome/Edge/desktop) and shows iPhone/iPad users the
 * "Share → Add to Home Screen" steps. Hidden once AXTO runs as an app.
 * ============================================================================ */
"use client";
import { pick, type Lang } from "@/lib/i18n";
import { useEffect, useState, useSyncExternalStore } from "react";
import { T } from "@/lib/i18n-pages/pwa";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: Prompt | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}
const isIos = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

/** Mount once (root layout). */
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); deferred = e as Prompt; emit(); };
    const onInstalled = () => { deferred = null; emit(); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
        // A new version was deployed: activate it on the next navigation.
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) w.postMessage("skipWaiting"); });
        });
      }).catch(() => {});
    }
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  return null;
}

export function usePwaInstall() {
  const available = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => !!deferred,
    () => false,
  );
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => { setInstalled(standalone()); setIos(isIos()); }, []);
  return {
    canInstall: !installed && (available || ios),
    ios: ios && !available,
    installed,
    async install(): Promise<boolean> {
      if (!deferred) return false;
      await deferred.prompt();
      const r = await deferred.userChoice.catch(() => ({ outcome: "dismissed" }));
      deferred = null; emit();
      return r.outcome === "accepted";
    },
  };
}

/** Button that installs the app, or explains how on iOS. Renders nothing when not installable. */
export function InstallButton({ lang = "en", className = "btn-secondary btn-sm" }: { lang?: Lang; className?: string }) {
  const { canInstall, ios, install } = usePwaInstall();
  const [help, setHelp] = useState(false);
  const t = pick(T, lang);
  if (!canInstall) return null;
  return (
    <>
      <button type="button" className={className} onClick={async () => { if (ios) setHelp(true); else await install(); }}>📲 {t.install}</button>
      {help ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/50 p-3 sm:items-center" onClick={() => setHelp(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
            <ol className="mt-3 space-y-2 text-sm text-slate-700">
              <li>1. {t.ios1} <span aria-hidden="true" className="ml-1 inline-block rounded border border-slate-300 px-1">⬆︎</span></li>
              <li>2. {t.ios2} <span aria-hidden="true" className="ml-1">➕</span></li>
              <li>3. {t.ios3}</li>
            </ol>
            <button className="btn-primary mt-4 w-full" onClick={() => setHelp(false)}>{t.close}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
