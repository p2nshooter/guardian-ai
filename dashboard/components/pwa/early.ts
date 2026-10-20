/* Runs in <head> before React: Chrome/Edge fire `beforeinstallprompt` as soon
 * as the page qualifies — often before hydration — so it is caught here and
 * kept on window for components/pwa/Pwa.tsx. `appinstalled` marks the app as
 * installed; a later prompt means it was removed again, so the mark is cleared.
 * Not a client module on purpose: the root layout inlines this string. */
export const PWA_KEY = "axto_pwa_installed";

export const PWA_EARLY = `(function(){var w=window,k="${PWA_KEY}";w.__axtoPwa=w.__axtoPwa||{bip:null};function ping(){try{w.dispatchEvent(new Event("axto-pwa"))}catch(e){}}w.addEventListener("beforeinstallprompt",function(e){e.preventDefault();w.__axtoPwa.bip=e;try{localStorage.removeItem(k)}catch(x){}ping()});w.addEventListener("appinstalled",function(){w.__axtoPwa.bip=null;try{localStorage.setItem(k,"1")}catch(x){}ping()})})();`;
