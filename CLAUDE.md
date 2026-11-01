# AXTO (axto.io) — standing rules for every change

## 0. ★ READ FIRST: THE BUSINESS MASTER BLUEPRINT ★
**`docs/BUSINESS-MASTER-BLUEPRINT.md` is the master design of the whole business of axto.io AND xaa.es** (owner, 29 Oct 2026,
REQUESTS 131). Read it before any work. In one breath:
- **Everything runs by itself (zero-touch).** No daily operator.
- **AXTO is paid first.** Partner channels use prepaid credits. No revenue share, no credit extended.
- **Partners (white label, reseller) own their clients completely**: setup, support, complaints, renewals, revoke, ban.
- **One strict Licence Authority** issues every licence: signed, credit-debited atomically, bound to machines,
  revocable.
- **MANAGE (AXTO-provided AI) is sold ONLY inside white label.** axto.io itself stays BYOX.
- **Admin controls every member.**
- **Affiliate, Reseller and White Label can each be shown or hidden in Admin** (default shown).
- **The AI chat answers everything public and never reveals company secrets.**
- **Build phase by phase (P0–P10), one at a time.**

These rules come from the owner and apply to **every** new feature or change, whatever it is.
**The order of work is `docs/WORK-QUEUE.md`** (one queue for every repository; per-app plans in `docs/apps/`, promotions in `docs/PROMOTION-BLUEPRINT.md`): finish the running item before the next, record new commands there.
**Before any work:** write the owner's command into the blueprint first (`docs/REQUESTS.md` + the plan in `docs/BLUEPRINT-V4.md` / `docs/AXTO-APPS-BLUEPRINT.md`), then build it. Never assume or invent — read the command and the blueprint. Keep the progress table in `docs/BLUEPRINT-V4.md` §19 current.
The running log of the owner's requests is in [`docs/REQUESTS.md`](docs/REQUESTS.md) — add each new request there.

## 1. Every feature is complete, not a stub
- World-class depth: benchmark against the best product in its category (see `docs/BLUEPRINT-V4.md`) — never ship a "simple" version.
- Self-hosted Docker apps (10 products, Linux + Windows): follow `docs/AXTO-APPS-BLUEPRINT.md` — editions per app, the 100-trial-licence programme, signed releases and the enterprise baseline.
- **Design**: every public, member and admin page uses the "Crystal Palace" design system and motion rules in `docs/BLUEPRINT-V4.md` §18 (super-premium, elegant animations that help users, `prefers-reduced-motion` respected).
- **Member portal**: the feature is usable there (translated in all 10 languages — `lib/i18n-pages/*`, enforced by `tests/i18n-pages.test.ts`).
- **Admin portal**: whatever the feature needs to be operated (settings, prices, limits, lists, actions, audit log entries) is in `/admin`.
- **Plans**: if it depends on a plan, it is in `lib/plans.ts` limits, so the plan matrix (`lib/plan-matrix.ts`) shows it on /pricing, member billing and admin plans.
- **Public site copy** (`lib/apps.ts` + `lib/i18n-pages/appfeatures.ts`) matches what the feature really does.

## 2. SEO on everything public
- Every public page: `pageMeta()` title/description/canonical, JSON-LD (`lib/seo.ts`: breadcrumbs, FAQ, product/offer/software), an entry in `app/sitemap.ts`, and links from the header/footer or a related page. This includes the site-sale offer (`/acquire`).
- Copy is written for people first, keywords second; no hidden text, no doorway pages.

## 3. Zero-touch and non-custodial (like Trust Wallet)
- **Zero-touch**: payments, plan activation, licences, downloads and the site sale complete automatically once a payment is verified — no manual step unless the payment method itself needs one (a bank wire).
- **Non-custodial**: the member's files, videos, documents and personal data are processed on their device. AI requests use the member's own keys and are only relayed. Saved work is encrypted per account. Never store what we do not need.
- Claims must stay truthful (`docs/BLUEPRINT-V4.md` §1): "100% client-side" only for paths that really are (Local Mode for AI).

## 4. Never leak company secrets
- No credentials, API keys, signing keys, passwords, webhook secrets, session secrets or private infrastructure details in the repository, in client bundles, in public pages, in logs or in AI prompts. Payment credentials live only in the encrypted store (Admin → Payment & email).
- Public pages show only what a customer needs. Bank details are shown to a signed-in buyer inside a checkout, not on public pages.
- Never paste secrets found anywhere into code, docs, commits or chat.

## 5. Test it again, every time
- `cd dashboard && npx tsc --noEmit -p . && npm test` (unit, incl. i18n completeness).
- Full end-to-end: `bash tests/e2e/run.sh` (local Cloudflare runtime; builds with next-on-pages).
- A real-browser run (Playwright) for any UI change, on desktop and mobile width, with no console errors.
- CI (GitHub Actions E2E) must be green before merging to `main`.

## 6. Storage: R2 only — never D1
Owner, 20 Oct 2026: „Catat ya baik di axto.io maupun di xaa.es, ulyah.com xad.es 1fr.fr tilawa.de dan semua yg membutuhkan penyimpanan, wajib ke R2, jgn pernah ke D1" (and „Database semuanya ke R2 … sy siap bayar 100-1000GB").
- Every record and every file of every site and app — axto.io, xaa.es, ulyah.com, xad.es, 1fr.fr, tilawa.de, the partner sites and anything new — is stored in **Cloudflare R2**. Never create a D1 database, never add a `d1_databases` binding, never write a new D1 query, never "temporarily" use D1.
- Build on the R2 Store design in `docs/R2-DATA-BLUEPRINT.md` §3: one JSON object per document, create-once writes (`If-None-Match: *`) for uniqueness guards, compare-and-swap updates (`etagMatches`), index entries with `customMetadata` summaries, append-only logs, no hot keys (R2 takes 1 write per second per key), daily backups to a private backup bucket kept 35 days. Money and licence transitions are conditional and idempotent.
- Data still in D1 is moved, not left behind: copy once with the same ids, check every row arrived, keep D1 read-only for 7 days, then remove the binding (`docs/R2-DATA-BLUEPRINT.md` §4). Workers KV is not D1: it may hold short-lived caches and rate-limit counters only — durable data never lives there.
