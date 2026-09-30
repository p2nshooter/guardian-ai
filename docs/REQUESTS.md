# Owner's requests — running log

Every request for a new feature or change is recorded here with its status. Rules that apply to all of them are in [`/CLAUDE.md`](../CLAUDE.md).

| # | Request (summary) | Status | Where |
|---|---|---|---|
| 1 | Remove the legacy per-app EXE pipeline | ✅ done | commit 404d4b6 |
| 2 | All apps must be world-class, complete and complex (Clipper first) — study every app, benchmark the best, new blueprint | 🔄 in progress | `docs/BLUEPRINT-V4.md` §9 |
| 3 | Clipper v4 | ✅ done | `app/app/clipper`, `lib/clipper` |
| 4 | AI Studio v4 | ✅ done | `app/app/studio`, `lib/studio` |
| 5 | Privacy Vault v4 | ✅ done | `app/app/vault`, `lib/vault` |
| 6 | Show each plan's feature differences in the member portal and the admin portal | ✅ done | `lib/plan-matrix.ts`, `/app/billing`, `/admin/plans`, `/pricing` |
| 7 | Keep every payment gateway, make PayPal the primary one (Stripe does not onboard Indonesia) | ✅ done | `lib/billing/gateways.ts` |
| 8 | Sell the whole site: special menu on the homepage, elegant persuasive offer, $2,000,000, automatic PayPal / crypto payment, automatic admin access after payment | ✅ done | `/acquire`, `/admin/acquisition`, `docs/admin/SITE_SALE.md` |
| 9 | Offer copy: elegant, clear, professional, convincing, with a client-side guarantee for BYOK / BYOX / BYOM; Managed "coming soon", enabled manually when ready | ✅ done (truthful wording, see BLUEPRINT-V4 §1) | `lib/acquire-copy.ts` |
| 10 | After payment show +62 856-9123-4561 for manual BNI payment proof; use the BNI account from ulyah.com; write the manual transfer guide | ✅ done | `/acquire` wire panel |
| 11 | Use an AI API key from ulyah.com for testing | ⛔ not done — reading credentials from another repository was blocked by the session's safety policy; add a key in Settings → AI keys instead | — |
| 12 | Standing rules: record every feature request; SEO on every feature incl. the offer; never leak company secrets; zero-touch & non-custodial like Trust Wallet; world-class, re-tested; every feature reflected in the admin and member portals | ✅ recorded | `/CLAUDE.md` |
| 13 | Credit / debit card payments that settle automatically to the owner's BNI account (in the charged currency or at the USD rate) | ✅ done — via Xendit / Midtrans settlement to BNI (IDR at the USD rate, or USD on Xendit) | `docs/admin/CARD_PAYMENTS.md`, Admin → Payment & email → Credit / debit card |
| 14 | Security Analyst v4 | ✅ done | `app/app/security`, `lib/security`, `docs/BLUEPRINT-V4.md` §11 |
| 15 | Merge everything and leave GitHub clean (no pending merges / PRs) | 🔄 partly — `main` fast-forwarded (no open PRs); deleting old branches is refused by this session's git proxy, so 7 stale branches remain for the owner to delete in GitHub → Branches | — |
| 16 | Compliance Center v4 | ✅ done | `app/app/compliance`, `lib/compliance`, `docs/BLUEPRINT-V4.md` §12 |
| 17 | Prompt Library v4 (240 prompts; fix the "Hundreds" claim) | ✅ done | `app/app/prompts`, `lib/prompts`, `docs/BLUEPRINT-V4.md` §13 |
| 18 | Legal AI v4 (redline, playbook review, clause library, deadlines, citations, ask the matter) | ✅ done | `app/app/legal`, `components/legal/tools`, `lib/legal`, `docs/BLUEPRINT-V4.md` §14 |
| 19 | Local Mode (on-device AI, so "100% client-side" is true for that mode) | 🔄 next | `docs/BLUEPRINT-V4.md` §8b |
