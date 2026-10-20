/* ==============================================================================
 * Installable app (PWA). Owner, 20 Oct 2026: an install button with a phone
 * icon at the very top, the app opening without the browser, and the icon gone
 * once AXTO is on the phone.
 *
 * - PwaRegister: registers the service worker (root layout).
 * - InstallBar: the bar at the top of the public site, member portal and
 *   sign-in pages. Chrome/Edge/Samsung use their own install dialog (captured
 *   early by components/pwa/early.ts); iPhone/iPad and other browsers get short
 *   steps for their device.
 * - Hidden when AXTO already runs as an app, when the browser reported the
 *   install (appinstalled), or when Chrome finds the installed app
 *   (getInstalledRelatedApps + manifest related_applications). "×" hides it
 *   for 14 days.
 * ============================================================================ */
"use client";
import { pick, useI18n, type Lang } from "@/lib/i18n";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { T } from "@/lib/i18n-pages/pwa";
import { PWA_KEY } from "./early";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global {
  interface Window { __axtoPwa?: { bip: Prompt | null } }
  interface Navigator { getInstalledRelatedApps?: () => Promise<unknown[]>; standalone?: boolean }
}

const DISMISS_KEY = "axto_pwa_later";
const EVENT = "axto-pwa";
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage blocked */ } };

export type Platform = "ios" | "android" | "desktop";
function platform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.matchMedia?.("(display-mode: window-controls-overlay)").matches || navigator.standalone === true;

/** Mount once (root layout). Also catches the install events if the early script did not run (an old cached page). */
export function PwaRegister() {
  useEffect(() => {
    window.__axtoPwa ??= { bip: null };
    const onPrompt = (e: Event) => { e.preventDefault(); window.__axtoPwa!.bip = e as Prompt; write(PWA_KEY, null); window.dispatchEvent(new Event(EVENT)); };
    const onInstalled = () => { window.__axtoPwa!.bip = null; write(PWA_KEY, "1"); window.dispatchEvent(new Event(EVENT)); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (standalone()) write(PWA_KEY, "1");
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

const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); };
const getPrompt = () => window.__axtoPwa?.bip ?? null;

export type InstallState = "hidden" | "prompt" | "guide";

export function usePwaInstall() {
  const prompt = useSyncExternalStore(subscribe, getPrompt, () => null);
  const [env, setEnv] = useState<{ ready: boolean; installed: boolean; dismissed: boolean; platform: Platform }>({ ready: false, installed: false, dismissed: false, platform: "desktop" });

  useEffect(() => {
    const p = platform();
    const installed = standalone() || read(PWA_KEY) === "1";
    setEnv({ ready: true, installed, dismissed: Number(read(DISMISS_KEY) || 0) > Date.now(), platform: p });
    // Chrome on Android can tell us the app is already on the phone even when this page is open in the browser.
    if (!installed && navigator.getInstalledRelatedApps) {
      navigator.getInstalledRelatedApps().then((apps) => {
        if (apps.length) { write(PWA_KEY, "1"); setEnv((e) => ({ ...e, installed: true })); }
      }).catch(() => {});
    }
    const sync = () => setEnv((e) => ({ ...e, installed: standalone() || read(PWA_KEY) === "1" }));
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  // A fresh install prompt means the browser does not have the app installed.
  const installed = env.installed && !prompt;
  const state: InstallState = !env.ready || installed ? "hidden" : prompt ? "prompt" : env.platform === "desktop" ? "hidden" : "guide";

  const install = useCallback(async (): Promise<"accepted" | "dismissed" | "guide"> => {
    const p = getPrompt();
    if (!p) return "guide";
    await p.prompt();
    const r = await p.userChoice.catch(() => ({ outcome: "dismissed" }));
    window.__axtoPwa!.bip = null;
    if (r.outcome === "accepted") write(PWA_KEY, "1");
    window.dispatchEvent(new Event(EVENT));
    return r.outcome === "accepted" ? "accepted" : "dismissed";
  }, []);

  const later = useCallback(() => {
    write(DISMISS_KEY, String(Date.now() + 14 * 86_400_000));
    setEnv((e) => ({ ...e, dismissed: true }));
  }, []);

  return { state, dismissed: env.dismissed, platform: env.platform, install, later };
}

export function PhoneIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="2.6" />
      <path d="M12 7v7m-3-3 3 3 3-3" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

function Guide({ platform, lang, onClose }: { platform: Platform; lang: Lang; onClose: () => void }) {
  const t = pick(T, lang);
  const steps = platform === "ios" ? [t.ios1, t.ios2, t.ios3] : [t.android1, t.android2, t.android3];
  return (
    <div className="pwa-guide" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="pwa-guide-title">
      <div className="pwa-guide-card" onClick={(e) => e.stopPropagation()}>
        <div className="pwa-guide-icon"><PhoneIcon size={26} /></div>
        <h3 id="pwa-guide-title">{platform === "ios" ? t.title : t.androidTitle}</h3>
        <ol>
          {steps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}
        </ol>
        <button type="button" className="btn-primary w-full" onClick={onClose} autoFocus>{t.close}</button>
      </div>
    </div>
  );
}

/** The bar at the very top. Renders nothing when AXTO is installed, not installable, or set aside for later. */
export function InstallBar() {
  const { lang } = useI18n();
  const { state, dismissed, platform: p, install, later } = usePwaInstall();
  const [guide, setGuide] = useState(false);
  const t = pick(T, lang);
  if (state === "hidden" || dismissed) return null;
  return (
    <>
      <div className="pwa-bar" role="region" aria-label={t.barLabel} data-testid="pwa-bar">
        <div className="pwa-bar-inner">
          <span className="pwa-bar-icon"><PhoneIcon /></span>
          <p className="pwa-bar-text"><strong>{t.barTitle}</strong><span>{t.barSub}</span></p>
          <button type="button" className="pwa-bar-btn" data-testid="pwa-install" onClick={async () => { if ((await install()) === "guide") setGuide(true); }}>
            <PhoneIcon size={16} />{t.install}
          </button>
          <button type="button" className="pwa-bar-x" aria-label={t.later} title={t.later} onClick={later}>×</button>
        </div>
      </div>
      {guide ? <Guide platform={p === "ios" ? "ios" : "android"} lang={lang} onClose={() => setGuide(false)} /> : null}
    </>
  );
}

/** Inline install button (member home). Same rules as the bar, ignores "later". */
export function InstallButton({ lang = "en", className = "btn-secondary btn-sm" }: { lang?: Lang; className?: string }) {
  const { state, platform: p, install } = usePwaInstall();
  const [guide, setGuide] = useState(false);
  const t = pick(T, lang);
  if (state === "hidden") return null;
  return (
    <>
      <button type="button" className={`${className} inline-flex items-center gap-2`} onClick={async () => { if ((await install()) === "guide") setGuide(true); }}>
        <PhoneIcon size={16} />{t.install}
      </button>
      {guide ? <Guide platform={p === "ios" ? "ios" : "android"} lang={lang} onClose={() => setGuide(false)} /> : null}
    </>
  );
}
