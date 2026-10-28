// ==============================================================================
// Copyright (c) 2024-2026 Axto AI. All rights reserved.
// ==============================================================================
// LinkedIn kit (REQUESTS 122): logos, covers and post images for the three company
// pages — AXTO Digital Global (parent, with ulyah.com), axto.io and xaa.es — drawn
// as HTML and rendered by a real browser, so all three share one design.
//   node docs/linkedin/build-kit.mjs
// Facts on the images come from the product catalogues (dashboard/lib/product-catalog.ts,
// xaa src/content/*, ulyah.com apps/web) — nothing is promised that is not built.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { SHOT, card, logo, cover } from "./templates.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node-tools/node_modules/playwright")); }

const HERE = dirname(fileURLToPath(import.meta.url));

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
