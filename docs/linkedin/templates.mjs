// ==============================================================================
// Copyright (c) 2024-2026 Axto AI. All rights reserved.
// ==============================================================================
// The LinkedIn card, logo and cover designs, shared by build-kit.mjs (the page kit,
// REQUESTS 122) and build-library.ts (the daily auto-post images, REQUESTS 123).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const dataUri = (p, type) => `data:${type};base64,${readFileSync(p).toString("base64")}`;
export const SHOT = (f) => dataUri(join(ROOT, "dashboard/public/guides/orchestra", f), "image/png");
const ULYAH_ICON = (() => { try { return dataUri(join(ROOT, "../ulyah.com/apps/web/public/icon-512.png"), "image/png"); } catch { return ""; } })();

// ── Brand marks ──────────────────────────────────────────────────────────────
export const AXTO_MARK = (size) => `<svg width="${size}" height="${size * 1.22}" viewBox="0 0 160 196" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fe3c9"/><stop offset="1" stop-color="#0b5a50"/></linearGradient></defs>
  <path d="M80 4 156 26v94l-26 46-50 26-50-26L4 120V26Z" fill="url(#g)"/>
  <path d="M80 4v188" stroke="#fff" stroke-opacity=".85" stroke-width="2.4"/>
  <path d="M80 50 56 152M80 50l24 102M63 124h34" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>`;
export const XAA_MARK = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <path d="M32 2 62 32 32 62 2 32Z" fill="#b3122e"/><path d="M32 9 55 32 32 55 9 32Z" fill="none" stroke="#ffc400" stroke-width="2"/>
  <path d="M23 23l18 18M41 23 23 41" stroke="#ffc400" stroke-width="5" stroke-linecap="round"/></svg>`;
const ULYAH_MARK = (size) => ULYAH_ICON ? `<img src="${ULYAH_ICON}" width="${size}" height="${size}" style="border-radius:${size * 0.22}px">` : "";

export const BRANDS = {
  group: { mark: AXTO_MARK, name: "AXTO Digital Global", domain: "axto.io · xaa.es · ulyah.com", kicker: "axto.io · xaa.es · ulyah.com",
    bg: "radial-gradient(1200px 500px at 85% -10%, rgba(45,212,191,.22), transparent 60%), radial-gradient(900px 500px at 0% 120%, rgba(212,175,55,.16), transparent 60%), linear-gradient(135deg,#05070b,#0b1220)",
    accent: "#2dd4bf", accent2: "#d4af37", ink: "#eef6f5", muted: "#9fb3b0" },
  axto: { mark: AXTO_MARK, name: "axto.io", domain: "axto.io", kicker: "Self-hosted AI & cybersecurity",
    bg: "radial-gradient(1100px 520px at 90% -20%, rgba(45,212,191,.28), transparent 60%), radial-gradient(800px 500px at -10% 120%, rgba(99,102,241,.18), transparent 60%), linear-gradient(135deg,#04070a,#08201d)",
    accent: "#2dd4bf", accent2: "#818cf8", ink: "#effaf8", muted: "#9fbab5" },
  xaa: { mark: XAA_MARK, name: "xaa.es", domain: "xaa.es", kicker: "Web & software studio",
    bg: "radial-gradient(1100px 520px at 90% -20%, rgba(179,18,46,.38), transparent 60%), radial-gradient(800px 500px at -10% 120%, rgba(255,196,0,.14), transparent 60%), linear-gradient(135deg,#0b0608,#22080f)",
    accent: "#ffc400", accent2: "#ff4d6d", ink: "#fff8ec", muted: "#d8bfa9" },
  ulyah: { mark: ULYAH_MARK, name: "ulyah.com", domain: "ulyah.com", kicker: "Islamic learning platform",
    bg: "radial-gradient(1100px 520px at 90% -20%, rgba(212,175,55,.26), transparent 60%), linear-gradient(135deg,#04170f,#0b3d2e)",
    accent: "#e2c06a", accent2: "#8fd3b1", ink: "#fbf7ea", muted: "#c5d8cc" },
};

const BASE_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,"DejaVu Sans",sans-serif;-webkit-font-smoothing:antialiased}
.disp{font-family:"Inter Display",Inter,sans-serif}
.mono{font-family:"JetBrains Mono",monospace}`;

// ── Post card 1200×627 ───────────────────────────────────────────────────────
export function card(b, p) {
  const B = BRANDS[b];
  const bullets = p.bullets.map((x) => `<li><span style="color:${B.accent}">◆</span><span>${x}</span></li>`).join("");
  const right = p.shot
    ? `<div class="shot"><img src="${p.shot}"></div>`
    : p.big ? `<div class="big"><div class="disp n" style="color:${B.accent}">${p.big[0]}</div><div class="l">${p.big[1]}</div></div>`
    : p.mark ? `<div class="mk"><div class="ring"></div>${B.mark(150)}</div>` : "";
  // `large`: the auto-post library's cards, read in a feed at phone size — bigger type.
  const L = p.large;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  body{width:1200px;height:627px;background:${B.bg};color:${B.ink};position:relative;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(180deg,#000,transparent 85%)}
  .wrap{position:relative;display:flex;height:100%;padding:52px 58px 46px}
  .left{flex:1;display:flex;flex-direction:column;min-width:0}
  .brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:21px;letter-spacing:.2px}
  .brand small{display:block;font-weight:500;font-size:14px;color:${B.muted};letter-spacing:.4px}
  .eyebrow{margin-top:30px;display:inline-block;align-self:flex-start;font-size:14px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:${B.accent};border:1px solid ${B.accent}55;background:${B.accent}14;padding:7px 14px;border-radius:999px}
  h1{margin-top:18px;font-size:${p.titleSize || (L ? 58 : 52)}px;line-height:1.04;font-weight:800;letter-spacing:-1.2px}
  h1 em{font-style:normal;background:linear-gradient(90deg,${B.accent},${B.accent2});-webkit-background-clip:text;color:transparent}
  .sub{margin-top:14px;font-size:${L ? 24 : 21}px;line-height:1.38;color:${B.muted};max-width:640px}
  ul{list-style:none;margin-top:22px;display:grid;gap:10px}
  li{display:flex;gap:12px;font-size:${L ? 23 : 19}px;line-height:1.3}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:${L ? 19 : 15}px;color:${B.muted}}
  .foot b{color:${B.ink}}
  .shot{width:430px;margin-left:34px;align-self:center;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 6px rgba(255,255,255,.03)}
  .shot img{display:block;width:100%}
  .big{width:330px;margin-left:30px;align-self:center;text-align:center;padding:40px 24px;border-radius:24px;border:1px solid ${B.accent}44;background:linear-gradient(160deg,${B.accent}1f,transparent)}
  .big .n{font-size:110px;font-weight:900;line-height:1;letter-spacing:-3px}
  .big .l{margin-top:12px;font-size:20px;color:${B.muted};line-height:1.35}
  .mk{width:300px;margin-left:30px;align-self:center;position:relative;display:flex;align-items:center;justify-content:center;height:300px}
  .mk .ring{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,${B.accent}33,transparent 68%);border:1px solid ${B.accent}33}
  .mk svg{position:relative;filter:drop-shadow(0 18px 40px ${B.accent}55)}
  </style></head><body><div class="grid"></div><div class="wrap"><div class="left">
  <div class="brand">${B.mark(46)}<div>${B.name}<small>${p.kicker || B.kicker}</small></div></div>
  <div class="eyebrow">${p.eyebrow}</div>
  <h1 class="disp">${p.title}</h1>
  ${p.sub ? `<div class="sub">${p.sub}</div>` : ""}
  <ul>${bullets}</ul>
  <div class="foot"><span><b>${p.cta || B.domain}</b></span><span class="mono">${p.tag || ""}</span></div>
  </div>${right}</div></body></html>`;
}

// ── Logo 400×400 and cover 1128×191 ──────────────────────────────────────────
export function logo(b) {
  const B = BRANDS[b];
  const bg = b === "xaa" ? "radial-gradient(circle at 50% 35%,#2a0a12,#0b0608)" : "radial-gradient(circle at 50% 35%,#0c2a26,#05080b)";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  body{width:400px;height:400px;background:${bg};display:flex;align-items:center;justify-content:center}</style></head>
  <body>${b === "xaa" ? XAA_MARK(300) : AXTO_MARK(210)}</body></html>`;
}
export function cover(b, c) {
  const B = BRANDS[b];
  // LinkedIn lays the logo over the lower-left of the cover: keep words to the right half.
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  body{width:1128px;height:191px;background:${B.bg};color:${B.ink};position:relative;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:32px 32px}
  .glow{position:absolute;left:40px;top:-60px;opacity:.13}
  .txt{position:absolute;right:46px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right;width:700px}
  h1{font-size:33px;font-weight:800;letter-spacing:-.6px;line-height:1.08}
  h1 em{font-style:normal;background:linear-gradient(90deg,${B.accent},${B.accent2});-webkit-background-clip:text;color:transparent}
  p{margin-top:8px;font-size:15px;color:${B.muted}}
  .chips{margin-top:12px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
  .chip{font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:999px;border:1px solid ${B.accent}55;background:${B.accent}12;color:${B.ink}}
  </style></head><body><div class="grid"></div><div class="glow">${b === "xaa" ? XAA_MARK(300) : AXTO_MARK(250)}</div>
  <div class="txt"><h1 class="disp">${c.title}</h1><p>${c.sub}</p><div class="chips">${c.chips.map((x) => `<span class="chip">${x}</span>`).join("")}</div></div></body></html>`;
}
