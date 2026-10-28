// ==============================================================================
// Copyright (c) 2024-2026 Axto AI. All rights reserved.
// ==============================================================================
// LinkedIn kit (REQUESTS 122): logos, covers and post images for the three company
// pages — AXTO Digital Global (parent, with ulyah.com), axto.io and xaa.es — drawn
// as HTML and rendered by a real browser, so all three share one design.
//   node docs/linkedin/build-kit.mjs
// Facts on the images come from the product catalogues (dashboard/lib/product-catalog.ts,
// xaa src/content/*, ulyah.com apps/web) — nothing is promised that is not built.
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../..");
const dataUri = (p, type) => `data:${type};base64,${readFileSync(p).toString("base64")}`;
const SHOT = (f) => dataUri(join(ROOT, "dashboard/public/guides/orchestra", f), "image/png");
const ULYAH_ICON = (() => { try { return dataUri(join(ROOT, "../ulyah.com/apps/web/public/icon-512.png"), "image/png"); } catch { return ""; } })();

// ── Brand marks ──────────────────────────────────────────────────────────────
const AXTO_MARK = (size) => `<svg width="${size}" height="${size * 1.22}" viewBox="0 0 160 196" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2fe3c9"/><stop offset="1" stop-color="#0b5a50"/></linearGradient></defs>
  <path d="M80 4 156 26v94l-26 46-50 26-50-26L4 120V26Z" fill="url(#g)"/>
  <path d="M80 4v188" stroke="#fff" stroke-opacity=".85" stroke-width="2.4"/>
  <path d="M80 50 56 152M80 50l24 102M63 124h34" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>`;
const XAA_MARK = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <path d="M32 2 62 32 32 62 2 32Z" fill="#b3122e"/><path d="M32 9 55 32 32 55 9 32Z" fill="none" stroke="#ffc400" stroke-width="2"/>
  <path d="M23 23l18 18M41 23 23 41" stroke="#ffc400" stroke-width="5" stroke-linecap="round"/></svg>`;
const ULYAH_MARK = (size) => ULYAH_ICON ? `<img src="${ULYAH_ICON}" width="${size}" height="${size}" style="border-radius:${size * 0.22}px">` : "";

const BRANDS = {
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
function card(b, p) {
  const B = BRANDS[b];
  const bullets = p.bullets.map((x) => `<li><span style="color:${B.accent}">◆</span><span>${x}</span></li>`).join("");
  const right = p.shot
    ? `<div class="shot"><img src="${p.shot}"></div>`
    : p.big ? `<div class="big"><div class="disp n" style="color:${B.accent}">${p.big[0]}</div><div class="l">${p.big[1]}</div></div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  body{width:1200px;height:627px;background:${B.bg};color:${B.ink};position:relative;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(180deg,#000,transparent 85%)}
  .wrap{position:relative;display:flex;height:100%;padding:52px 58px 46px}
  .left{flex:1;display:flex;flex-direction:column;min-width:0}
  .brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:21px;letter-spacing:.2px}
  .brand small{display:block;font-weight:500;font-size:14px;color:${B.muted};letter-spacing:.4px}
  .eyebrow{margin-top:30px;display:inline-block;align-self:flex-start;font-size:14px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;color:${B.accent};border:1px solid ${B.accent}55;background:${B.accent}14;padding:7px 14px;border-radius:999px}
  h1{margin-top:18px;font-size:${p.titleSize || 52}px;line-height:1.04;font-weight:800;letter-spacing:-1.2px}
  h1 em{font-style:normal;background:linear-gradient(90deg,${B.accent},${B.accent2});-webkit-background-clip:text;color:transparent}
  .sub{margin-top:14px;font-size:21px;line-height:1.38;color:${B.muted};max-width:640px}
  ul{list-style:none;margin-top:22px;display:grid;gap:10px}
  li{display:flex;gap:12px;font-size:19px;line-height:1.3}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:15px;color:${B.muted}}
  .foot b{color:${B.ink}}
  .shot{width:430px;margin-left:34px;align-self:center;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 6px rgba(255,255,255,.03)}
  .shot img{display:block;width:100%}
  .big{width:330px;margin-left:30px;align-self:center;text-align:center;padding:40px 24px;border-radius:24px;border:1px solid ${B.accent}44;background:linear-gradient(160deg,${B.accent}1f,transparent)}
  .big .n{font-size:110px;font-weight:900;line-height:1;letter-spacing:-3px}
  .big .l{margin-top:12px;font-size:20px;color:${B.muted};line-height:1.35}
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
function logo(b) {
  const B = BRANDS[b];
  const bg = b === "xaa" ? "radial-gradient(circle at 50% 35%,#2a0a12,#0b0608)" : "radial-gradient(circle at 50% 35%,#0c2a26,#05080b)";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
  body{width:400px;height:400px;background:${bg};display:flex;align-items:center;justify-content:center}</style></head>
  <body>${b === "xaa" ? XAA_MARK(300) : AXTO_MARK(210)}</body></html>`;
}
function cover(b, c) {
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

// ── Content ──────────────────────────────────────────────────────────────────
const PAGES = {
  "axto-digital-global": {
    brand: "group",
    cover: { title: "Software that <em>runs on your terms</em>", sub: "PT AXTO Digital Global — AI & cybersecurity, web & software development, Islamic learning",
      chips: ["axto.io · AI & security apps", "xaa.es · Web & software studio", "ulyah.com · Islamic learning, 28 languages"] },
    posts: [
      ["01-our-brands", "group", { eyebrow: "Who we are", title: "Three brands, <em>one standard</em>", sub: "PT AXTO Digital Global builds software people run with confidence.",
        bullets: ["<b>axto.io</b> — 10 self-hosted AI & cybersecurity apps", "<b>xaa.es</b> — web & software studio; you own the code", "<b>ulyah.com</b> — Islamic learning in 28 languages"], big: ["3", "brands under<br>AXTO Digital Global"] }],
      ["02-ulyah-quran", "ulyah", { eyebrow: "The Qur'an, in your language", title: "Listen to the Qur'an.<br><em>Understand its meaning.</em>", sub: "An Islamic learning platform in 28 languages.",
        bullets: ["32 renowned reciters — real recitations, never text-to-speech", "Mushaf flipbook that follows the reciter page by page", "Translations, hadith, Prophets' stories and daily content"], big: ["28", "languages,<br>one platform"] }],
      ["03-ulyah-library", "ulyah", { eyebrow: "Digital library", title: "Classical knowledge, <em>open to everyone</em>", sub: "Read and listen, at home or on the move.",
        bullets: ["Digital kitab library, including pesantren texts", "Islamic audiobooks to listen anywhere", "Hadith with their grades, sanad and nasakh explained"] }],
      ["04-ulyah-daily-tools", "ulyah", { eyebrow: "Everyday worship tools", title: "Prayer times, qibla and <em>much more</em>", sub: "Practical tools for daily Muslim life, free to use.",
        bullets: ["Prayer times and Ramadan imsakiyah in many countries", "Qibla finder and Hijri calendar", "Zakat and inheritance (waris) calculators"] }],
      ["05-ulyah-live-radio", "ulyah", { eyebrow: "Live & on air", title: "Live recitation, lectures <em>and radio</em>", sub: "Watched and heard right on ulyah.com — no switching sites.",
        bullets: ["Live streams of recitation and lectures", "Qur'an radio that keeps playing as you browse", "A kids' corner with Iqro, hijaiyah and short surahs"] }],
      ["06-ulyah-hajj-umrah", "ulyah", { eyebrow: "Hajj & Umrah", title: "Plan the journey <em>of a lifetime</em>", sub: "Selected Hajj and Umrah packages with transparent pricing.",
        bullets: ["Guidance you can trust", "Contact the organiser directly", "Alongside duas, guides and worship tools"] }],
    ],
  },
  "axto.io": {
    brand: "axto",
    cover: { title: "AI & cybersecurity <em>you run yourself</em>", sub: "10 apps · Windows & Linux · your keys, your data, your servers",
      chips: ["Guardian AI", "Orchestra AI", "Vault AI", "SOC AI", "AXTO Legal", "+5 more"] },
    posts: [
      ["01-ten-apps", "axto", { eyebrow: "The AXTO suite", title: "Ten apps. <em>Your servers.</em>", sub: "AI and cybersecurity for legal, security and business teams.",
        bullets: ["Guardian · Orchestra · Vault · Edge · SOC", "Compliance · Sentinel OT · Antivirus · Studio · Legal", "Docker apps for Windows & Linux, activated with your licence"], big: ["10", "self-hosted<br>applications"] }],
      ["02-orchestra", "axto", { eyebrow: "Orchestra AI", title: "One console for <em>every AI worker</em>", sub: "Cloud models with your own keys, open models on your own GPU.",
        bullets: ["7 routing modes with failover", "Auto & manual scaling inside your licence", "OpenAI-compatible API for your own apps"], shot: SHOT("05-gpu-pool.png") }],
      ["03-gpu-worker", "axto", { eyebrow: "GPU worker", title: "Your graphics card, <em>working smart</em>", sub: "Run Llama, Qwen or Mistral locally — no per-token fees.",
        bullets: ["NVIDIA, AMD, Intel & Apple detected automatically", "Overheat protection moves jobs to a cooler GPU", "Live suggestions: which GPU is free right now"], shot: SHOT("06-auto-scale.png") }],
      ["04-guardian", "axto", { eyebrow: "Guardian AI", title: "AI cybersecurity <em>for your servers</em>", sub: "Detection, response and threat intelligence that stay on your hardware.",
        bullets: ["Process, network, file-integrity and DNS monitoring", "Incident management with automated response", "Agents report to your own Guardian core"] }],
      ["05-vault", "axto", { eyebrow: "Vault AI", title: "Redact personal data <em>before any model sees it</em>", sub: "A privacy proxy in front of every AI provider.",
        bullets: ["PII, PHI and financial data masked in milliseconds", "Original values restored in the answer", "Audit log of every redaction — originals never stored"] }],
      ["06-security-ops", "axto", { eyebrow: "Security operations", title: "SOC, compliance <em>and OT security</em>", sub: "Four engines for the security team, on-premise.",
        bullets: ["SOC AI — AI-assisted SIEM + SOAR", "Compliance AI — continuous audit monitoring", "Sentinel OT & Antivirus — industrial IoT and malware"] }],
      ["07-legal", "axto", { eyebrow: "AXTO Legal", title: "Private AI <em>for legal work</em>", sub: "Research, contracts, disputes, compliance and drafting.",
        bullets: ["36 practice workspaces", "Contract review, due diligence, litigation strategy", "Runs on your own AI keys — client files stay with you"], big: ["36", "legal<br>workspaces"] }],
      ["08-licence", "axto", { eyebrow: "Download & licence", title: "Download freely. <em>Run it licensed.</em>", sub: "Every app comes from your AXTO portal, for Windows or Linux.",
        bullets: ["Signed licence checks, offline lifetime option", "Bring your own AI keys — zero token markup", "Monthly plans and lifetime licences"] }],
    ],
  },
  "xaa.es": {
    brand: "xaa",
    cover: { title: "Websites & software <em>that you own</em>", sub: "Web & software studio · English · Español · Bahasa Indonesia",
      chips: ["Websites", "E-commerce", "SaaS", "Enterprise systems", "Civic & election"] },
    posts: [
      ["01-studio", "xaa", { eyebrow: "xaa.es studio", title: "Websites & software <em>that sell</em>", sub: "From a first landing page to a global platform.",
        bullets: ["Websites — landing pages to corporate sites", "Commerce — from first catalogue to multi-warehouse", "Products & SaaS, enterprise systems, AI backup & recovery"] }],
      ["02-how-we-work", "xaa", { eyebrow: "How we work", title: "You pay in steps. <em>You own the code.</em>", sub: "No status meetings — check your project at 2 am.",
        bullets: ["10% deposit · 40% at production · 50% when you've seen it run", "A real completion date, visible all project long", "Source, designs and accounts transfer to you at handover"] }],
      ["03-packages", "xaa", { eyebrow: "Clear packages", title: "From <em>€500</em> to enterprise", sub: "Fixed packages, priced in EUR, scoped before you commit.",
        bullets: ["Landing page €500 · Company profile €2,500", "E-commerce €10,000 · SaaS / web application €35,000", "Enterprise platforms and global ecosystems on scope"], big: ["€500", "landing pages<br>from"] }],
      ["04-care", "xaa", { eyebrow: "Setup & care", title: "Backups and recovery <em>your team runs</em>", sub: "Separate services, never a lock-in.",
        bullets: ["Setup packages from €149", "AI backup & recovery plans from €149", "One-click backups, restore and database reset"] }],
      ["05-templates", "xaa", { eyebrow: "SaaS templates", title: "Start from a <em>working template</em>", sub: "18 SaaS templates in the catalogue, from €390.",
        bullets: ["Waitlist & Landing — live demo, ready today", "CRM, invoicing, booking, LMS, e-commerce and more", "Others built to order on the same shared core"], big: ["18", "SaaS templates<br>in the catalogue"] }],
      ["06-civic", "xaa", { eyebrow: "Election & civic systems", title: "Software that has to work <em>on one particular day</em>", titleSize: 46, sub: "Built and run before — demos use generated data only.",
        bullets: ["Voter-roll verification and an offline field register", "Same-evening recapitulation you can defend", "From one village to a nation"] }],
    ],
  },
};

// ── Render ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 2 });
const page = await ctx.newPage();
async function render(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(150);
  const jpeg = out.endsWith(".jpg");
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h }, ...(jpeg ? { type: "jpeg", quality: 92 } : {}) });
}
const made = [];
for (const [slug, P] of Object.entries(PAGES)) {
  const dir = join(HERE, slug);
  mkdirSync(join(dir, "posts"), { recursive: true });
  await render(logo(P.brand), 400, 400, join(dir, "logo.png")); made.push(`${slug}/logo.png`);
  await render(cover(P.brand, P.cover), 1128, 191, join(dir, "cover.jpg")); made.push(`${slug}/cover.jpg`);
  for (const [file, b, p] of P.posts) {
    await render(card(b, p), 1200, 627, join(dir, "posts", `${file}.jpg`)); made.push(`${slug}/posts/${file}.jpg`);
  }
}
await browser.close();
console.log(made.join("\n"));
