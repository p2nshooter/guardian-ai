/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - AI workspace for legal, security & business teams
 * Maintained by: AXTO Digital Global <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 * Every collection axto.io keeps in R2 (owner, 20 Oct 2026: "Database
 * semuanya ke R2 … jgn ada yg ke d1"), with its uniqueness guards and indexes
 * (docs/R2-DATA-BLUEPRINT.md §7). One place, so the app, the one-time D1 copy,
 * the nightly backup and the tests agree on the key layout.
 *
 * A document has the same fields as the D1 row it replaces (snake_case), plus
 * `id`. Tables whose key was not `id` get a deterministic id: subscriptions and
 * managed subscriptions by user, usage by user + month, AI keys by user +
 * provider, trials by code, payment proofs by transaction hash.
 *
 * Index sort keys are newest first by created_at unless a list needs another
 * order (support threads by last activity, payouts by period, connect events
 * and webhook deliveries in the order they happened).
 * ============================================================================ */
import type { Store } from "../r2/store";
import { newestFirst, oldestFirst } from "../r2/ulid";

const lower = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const pad = (n: number, w = 16) => String(Math.max(0, Math.floor(n))).padStart(w, "0");

export interface UserDoc {
  id: string; email: string; role: string; password_hash: string; name: string; organization: string; country: string;
  status: string; last_login_at: string; storage_bytes: number; ai_provider: string; sessions_valid_after: string;
  created_at: string; updated_at: string;
}

export interface SubscriptionDoc {
  id: string; user_id: string; plan: string; cycle: string; status: string; current_period_start: string; current_period_end: string;
  last_order_id: string; reminded_at: string; created_at: string; updated_at: string;
  /** The last orders this subscription was extended by: applying a paid order twice is a no-op. */
  applied_orders?: string[];
}

export interface OrderDoc {
  id: string; invoice_no: string; user_id: string; email: string; plan: string; cycle: string; amount_usd: number; currency: string;
  amount_local: number; gateway: string; gateway_ref: string; status: string; meta: string; created_at: string; paid_at: string;
}

export interface ShLicenseDoc {
  id: string; user_id: string; product: string; license_key: string; package_code: string; max_nodes: number; status: string;
  expires_at: string; bound_machine_id: string; reset_count: number; last_seen_at: string; last_version: string; last_ip: string;
  notes: string; source: string; created_at: string; updated_at: string;
}

export interface ShTrialDoc {
  id: string; code: string; product: string; batch: string; status: string; user_id: string; email: string; ip: string;
  license_id: string; claimed_at: string; rating: number; converted: number; created_at: string;
}

export interface LifetimeLicenseDoc {
  id: string; user_id: string; order_id: string; scope: string; product: string; devices: number; major_version: number;
  updates_until: string; status: string; note: string; install_key: string; created_at: string; updated_at: string;
}

export interface LifetimeActivationDoc {
  id: string; license_id: string; product: string; machine_id: string; label: string; created_at: string; revoked_at: string;
  /** Seat number 1…devices while active: the guard on it is what keeps a licence within its device count. */
  slot: number;
}

export interface PaymentProofDoc { id: string; tx_hash: string; network: string; order_id: string; amount: number; created_at: string }

export interface SupportThreadDoc {
  id: string; token_hash: string; user_id: string; name: string; email: string; topic: string; source: string; status: string;
  needs_admin: number; ai_enabled: number; subject: string; last_from: string; last_preview: string; unread_admin: number;
  message_count: number; last_message_at: string; created_at: string;
}

export interface ConnectEventDoc { id: string; seq: number; user_id: string; channel: string; type: string; data: string; size: number; source: string; created_at: string }

export interface WebhookDoc {
  id: string; user_id: string; url: string; secret_enc: string; channels: string; types: string; active: number; failures: number;
  last_status: number | null; last_error: string | null; last_delivery_at: string | null; created_at: string;
}

export interface WebhookDeliveryDoc {
  id: string; webhook_id: string; user_id: string; event_id: number; attempt: number; status: number | null; duration_ms: number | null;
  error: string | null; done: number; next_at: string | null; created_at: string; updated_at: string;
}

export interface ApiKeyDoc {
  id: string; user_id: string; name: string; prefix: string; hash: string; scopes: string; origins: string; created_at: string;
  last_used_at: string | null; revoked_at: string | null;
}

export interface UserAiKeyDoc { id: string; user_id: string; provider: string; key_enc: string; hint: string; model: string; created_at: string }

export interface AiProviderKeyDoc {
  id: string; provider: string; key_name: string; category: string; purpose: string; value_enc: string; for_managed_pool: number;
  is_active: number; created_at: string; updated_at: string;
}

export interface ByoxUsageDoc { id: string; user_id: string; month: string; requests: number; clipper_videos: number }
/**
 * One Clipper usage event (Clipper C1, docs/apps/CLIPPER-BLUEPRINT.md §8): a video counted against the month, a
 * refusal at the quota or storage limit, a project created, restored, deleted or saved over another device's copy.
 * Autosaves are not logged (they would cost writes and say nothing); storage itself is users.storage_bytes.
 */
export interface ClipperUsageDoc {
  id: string; user_id: string; month: string;
  event: "video" | "quota_full" | "storage_full" | "project_created" | "project_restored" | "project_deleted" | "conflict_overwrite";
  project_id: string; bytes: number; detail: string; created_at: string;
}
export interface ManagedUsageDoc { id: string; user_id: string; month: string; credits_used: number; tokens: number }
export interface ManagedSubscriptionDoc { id: string; user_id: string; plan: string; status: string; current_period_end: string; created_at: string; updated_at: string }

/** A password-reset link. The id is the SHA-256 of the token: the token itself is never stored. */
export interface PasswordResetDoc { id: string; email: string; expires_at: string; used: number; created_at: string }

export interface AuditDoc {
  id: string; actor_id: string; actor_email: string; action: string; entity_type: string; entity_id: string; metadata: string;
  ip_address: string; user_agent: string; created_at: string;
}

export interface InvestorDoc {
  id: string; user_id: string; name: string; email: string; company: string; country: string; pledge_usd: number; capital_usd: number;
  method: string; status: string; lang: string; message: string; note: string; created_at: string; verified_at: string; verified_by: string;
  returned_at: string;
}

export interface InvestorPayoutDoc { id: string; investor_id: string; period: string; amount_usd: number; reference: string; paid_at: string; created_by: string }

/** A licence auction lot (docs/BLUEPRINT-V4.md §26.5, lib/auction.ts). Every change is a compare-and-swap on this document. */
export interface AuctionLotDoc {
  id: string; cycle: string; pkg: string; kind: string; app: string; title: string;
  edition_code: string; billing: string; scope: string; product: string; devices: number;
  normal_usd: number; open_usd: number; step_usd: number; starts_at: string; ends_at: string; status: string;
  bids_count: number; high_usd: number; high_seq: number; high_user: string; high_name: string;
  winner_user: string; winner_email: string; winner_name: string; winner_seq: number; winner_usd: number;
  pay_by: string; order_id: string; passed: string[]; closed_at: string; paid_at: string;
  note: string; created_by: string; created_at: string; updated_at: string;
}
/** What a lot's index entries carry (well under R2's 2 KB of custom metadata): enough to show and close it. */
export const lotSummary = (l: AuctionLotDoc) => ({
  cycle: l.cycle, pkg: l.pkg, kind: l.kind, app: l.app, title: l.title, normal_usd: l.normal_usd, open_usd: l.open_usd, step_usd: l.step_usd,
  starts_at: l.starts_at, ends_at: l.ends_at, status: l.status, bids_count: l.bids_count, high_usd: l.high_usd, high_user: l.high_user, high_name: l.high_name,
  winner_user: l.winner_user, winner_email: l.winner_email, winner_name: l.winner_name, winner_usd: l.winner_usd, pay_by: l.pay_by, order_id: l.order_id,
  passed_n: l.passed.length, closed_at: l.closed_at, paid_at: l.paid_at,
});
/** One bid, created once under "<lot>.<seq>" — never changed. */
export interface AuctionBidDoc { id: string; lot_id: string; seq: number; user_id: string; email: string; display_name: string; amount_usd: number; created_at: string }
/** A member allowed to bid: e-mail verified with a code, and the name shown when they win. Id = user id. */
export interface AuctionBidderDoc {
  id: string; email: string; display_name: string; verified_at: string;
  code_hash: string; code_expires: string; code_attempts: number; code_sent_at: string; created_at: string; updated_at: string;
}

/**
 * One round of the site-sale auction (docs/BLUEPRINT-V4.md §34, lib/sale-auction.ts). Every bid is a
 * compare-and-swap on this document; the next round's id is "sr_<no>" created once (with a claim nonce).
 */
export interface SaleRoundDoc {
  id: string; no: number; status: string; open_usd: number; step_usd: number; snipe_minutes: number; pay_days: number;
  starts_at: string; ends_at: string; bids_count: number; high_usd: number; high_seq: number; high_user: string; high_name: string;
  winner_user: string; winner_email: string; winner_name: string; winner_seq: number; winner_usd: number; pay_by: string;
  order_id: string; passed: string[]; closed_at: string; paid_at: string; note: string; claim: string;
  created_by: string; created_at: string; updated_at: string;
}
const roundSummary = (r: SaleRoundDoc) => ({
  no: r.no, status: r.status, open_usd: r.open_usd, step_usd: r.step_usd, starts_at: r.starts_at, ends_at: r.ends_at, bids_count: r.bids_count,
  high_usd: r.high_usd, high_name: r.high_name, winner_name: r.winner_name, winner_usd: r.winner_usd, pay_by: r.pay_by, closed_at: r.closed_at, paid_at: r.paid_at,
});
/** One bid in a sale round, created once under "<round>.<seq>" — never changed. */
export interface SaleBidDoc { id: string; round_id: string; seq: number; user_id: string; email: string; display_name: string; company: string; amount_usd: number; created_at: string }
/** A member registered to bid for the site (id = user id); approved by the owner unless approval is switched off. */
export interface SaleBidderDoc {
  id: string; email: string; display_name: string; company: string; country: string; phone: string; message: string;
  status: string; decided_by: string; decided_at: string; created_at: string; updated_at: string;
}

/**
 * One LinkedIn post by the auto-poster (docs/BLUEPRINT-V4.md §35). A daily post's id is
 * "li_<brand>_<YYYYMMDD>" and is created once, so overlapping cron ticks never post twice;
 * a post made by hand is "li_<brand>_m_<ulid>".
 */
export interface SocialPostDoc {
  id: string; network: string; brand: string; day: string; kind: string; post_id: string; org: string;
  status: string; attempts: number; definite: number; urn: string; url: string; error: string;
  /** Random per claim: the store treats an identical re-create as the same write, so two ticks never both "create" it. */
  claim: string;
  by: string; created_at: string; updated_at: string;
}
/* ---- the affiliate programme (docs/BUSINESS-MASTER-BLUEPRINT.md §4, §7.1) ---- */
/** An affiliate: one per member (id = user id). The payout destination is stored encrypted; `payout_label` is the masked hint. */
export interface AffiliateDoc {
  id: string; user_id: string; email: string; name: string; code: string; status: "active" | "suspended" | "banned";
  terms_version: string; accepted_at: string; join_ip: string; payout_method: "" | "paypal" | "usdt" | "wire"; payout_enc: string; payout_label: string;
  note: string; created_at: string; updated_at: string;
}
/** A referred member (id = the referred user id): created once at sign-up, never moved to another affiliate. */
export interface ReferralDoc {
  id: string; affiliate_id: string; code: string; email: string; attributed_at: string; until: string; ip: string; flagged: string; created_at: string;
}
/** A commission, created once per paid order ("cm_<order>"); a clawback of a paid one is "cm_<order>_cb" with a negative amount. */
export interface CommissionDoc {
  id: string; affiliate_id: string; order_id: string; user_id: string; kind: "customer" | "partner_fee" | "clawback";
  base_usd: number; pct: number; amount_usd: number; status: "held" | "review" | "payable" | "paid" | "reversed";
  hold_until: string; payout_id: string; reason: string; created_at: string; updated_at: string;
}
/** A monthly payout ("po_<affiliate>_<YYYYMM>"), created once. */
export interface AffPayoutDoc {
  id: string; affiliate_id: string; period: string; amount_usd: number; method: string; label: string;
  status: "approval" | "processing" | "paid" | "failed"; commission_ids: string[]; reference: string; failure: string;
  created_at: string; paid_at: string; updated_at: string;
}
/** An application to the reseller or white-label programme ("<program>_<user>"), one per member and programme. */
export interface PartnerAppDoc {
  id: string; program: "reseller" | "whitelabel"; user_id: string; email: string; name: string; company: string; country: string;
  website: string; languages: string; volume: string; message: string; status: "new" | "contacted" | "invited" | "declined";
  terms_version: string; ip: string; note: string; created_at: string; updated_at: string;
}
const commissionSummary = (c: CommissionDoc) => ({ affiliate_id: c.affiliate_id, order_id: c.order_id, user_id: c.user_id, kind: c.kind, amount_usd: c.amount_usd, status: c.status, hold_until: c.hold_until, payout_id: c.payout_id, created_at: c.created_at });
const payoutSummary = (p: AffPayoutDoc) => ({ affiliate_id: p.affiliate_id, period: p.period, amount_usd: p.amount_usd, method: p.method, label: p.label, status: p.status, reference: p.reference, created_at: p.created_at, paid_at: p.paid_at });

const socialSummary = (p: SocialPostDoc) => ({ brand: p.brand, day: p.day, kind: p.kind, post_id: p.post_id, org: p.org, status: p.status, attempts: p.attempts, url: p.url, error: (p.error || "").slice(0, 300), by: p.by, created_at: p.created_at, updated_at: p.updated_at });

/** Pending orders oldest first; paid orders by the moment they were paid (revenue, investor statements). */
const isSandbox = (o: OrderDoc) => { try { return JSON.parse(o.meta || "{}").env === "sandbox"; } catch { return false; } };

export function collections(store: Store) {
  return {
    users: store.collection<UserDoc>({
      name: "users",
      unique: [{ name: "email", value: (u) => u.email }],
      indexes: [
        { name: "all", key: () => "all", meta: (u) => ({ email: u.email, name: u.name, role: u.role, status: u.status, organization: u.organization, country: u.country, created_at: u.created_at, last_login_at: u.last_login_at, storage_bytes: u.storage_bytes }) },
        { name: "role", key: (u) => u.role, sort: (u) => oldestFirst(u.created_at) },
      ],
    }),
    subscriptions: store.collection<SubscriptionDoc>({
      name: "subscriptions",
      indexes: [{ name: "all", key: () => "all", meta: (s) => ({ user_id: s.user_id, plan: s.plan, cycle: s.cycle, status: s.status, current_period_end: s.current_period_end, last_order_id: s.last_order_id, reminded_at: s.reminded_at }) }],
    }),
    orders: store.collection<OrderDoc>({
      name: "orders",
      unique: [{ name: "invoice_no", value: (o) => o.invoice_no }],
      indexes: [
        { name: "user", key: (o) => o.user_id },
        // Enough for Admin → Orders to filter and search (status, e-mail, id, invoice, gateway reference, IDR amount) without reading orders.
        {
          name: "all", key: () => "all",
          meta: (o) => ({ status: o.status, plan: o.plan, cycle: o.cycle, gateway: o.gateway, amount_usd: o.amount_usd, amount_local: o.amount_local, email: o.email, invoice_no: o.invoice_no, gateway_ref: (o.gateway_ref || "").slice(0, 120), created_at: o.created_at, paid_at: o.paid_at, sandbox: isSandbox(o) ? 1 : 0 }),
        },
        { name: "pending", key: (o) => (o.status === "pending" ? o.gateway : null), sort: (o) => oldestFirst(o.created_at), meta: (o) => ({ amount_local: o.amount_local, amount_usd: o.amount_usd, created_at: o.created_at }) },
        { name: "paid", key: (o) => (o.status === "paid" && o.paid_at ? "all" : null), sort: (o) => oldestFirst(o.paid_at), meta: (o) => ({ plan: o.plan, amount_usd: o.amount_usd, paid_at: o.paid_at, sandbox: isSandbox(o) ? 1 : 0 }) },
        { name: "plan", key: (o) => o.plan },
      ],
    }),
    shLicenses: store.collection<ShLicenseDoc>({
      name: "sh_licenses",
      unique: [
        { name: "license_key", value: (l) => l.license_key },
        // One licence per member, app and source (D1: UNIQUE(user_id, product, source)).
        { name: "slot", value: (l) => (l.user_id ? `${l.user_id}|${l.product}|${l.source}` : "") },
      ],
      indexes: [
        { name: "user", key: (l) => l.user_id },
        // Everything Admin → Licences lists, so the list is a few list calls (last_seen_at changes at most hourly per licence).
        {
          name: "all", key: () => "all",
          meta: (l) => ({ user_id: l.user_id, product: l.product, source: l.source, license_key: l.license_key, package_code: l.package_code, status: l.status, expires_at: l.expires_at, max_nodes: l.max_nodes, bound_machine_id: l.bound_machine_id, last_seen_at: l.last_seen_at, last_version: l.last_version, last_ip: l.last_ip, reset_count: l.reset_count, notes: (l.notes || "").slice(0, 200), created_at: l.created_at }),
        },
        { name: "trial_machine", key: (l) => (l.source === "trial" && l.bound_machine_id ? `${l.product}|${l.bound_machine_id}` : null) },
      ],
    }),
    shTrials: store.collection<ShTrialDoc>({
      name: "sh_trials",
      indexes: [
        { name: "product_status", key: (t) => `${t.product}|${t.status}`, sort: (t) => `${oldestFirst(t.created_at)}_${t.code}` },
        { name: "user", key: (t) => t.user_id || null },
        { name: "email", key: (t) => lower(t.email) || null },
        { name: "ip_product", key: (t) => (t.ip ? `${t.ip}|${t.product}` : null) },
        { name: "batch", key: (t) => t.batch, sort: (t) => t.code, meta: (t) => ({ status: t.status, product: t.product }) },
        // Everything Admin → Trials shows and exports, so the screen and the CSV need no document reads.
        {
          name: "all", key: () => "all", sort: (t) => `${t.product}_${oldestFirst(t.created_at)}_${t.code}`,
          meta: (t) => ({ product: t.product, batch: t.batch, status: t.status, created_at: t.created_at, email: t.email, ip: t.ip, claimed_at: t.claimed_at, rating: t.rating, converted: t.converted, license_id: t.license_id }),
        },
      ],
    }),
    lifetimeLicenses: store.collection<LifetimeLicenseDoc>({
      name: "lifetime_licenses",
      unique: [
        { name: "order_id", value: (l) => l.order_id },
        { name: "install_key", value: (l) => l.install_key },
      ],
      indexes: [
        { name: "user", key: (l) => l.user_id },
        { name: "all", key: () => "all" },
      ],
    }),
    lifetimeActivations: store.collection<LifetimeActivationDoc>({
      name: "lifetime_activations",
      unique: [
        // One live activation per machine, and at most `devices` live seats per licence and app.
        { name: "machine", value: (a) => (a.revoked_at ? "" : `${a.license_id}|${a.product}|${a.machine_id}`) },
        { name: "seat", value: (a) => (a.revoked_at ? "" : `${a.license_id}|${a.product}|${a.slot}`) },
      ],
      indexes: [
        { name: "license", key: (a) => a.license_id, sort: (a) => oldestFirst(a.created_at) },
        { name: "all", key: () => "all", sort: (a) => oldestFirst(a.created_at) },
      ],
    }),
    paymentProofs: store.collection<PaymentProofDoc>({ name: "payment_proofs", indexes: [{ name: "order", key: (p) => p.order_id }] }),
    supportThreads: store.collection<SupportThreadDoc>({
      name: "support_threads",
      indexes: [
        {
          name: "recent", key: () => "all", sort: (t) => newestFirst(t.last_message_at || t.created_at),
          meta: (t) => ({ user_id: t.user_id, name: t.name, email: t.email, topic: t.topic, source: t.source, status: t.status, needs_admin: t.needs_admin, ai_enabled: t.ai_enabled, subject: t.subject, last_from: t.last_from, last_preview: t.last_preview, unread_admin: t.unread_admin, message_count: t.message_count, last_message_at: t.last_message_at, created_at: t.created_at }),
        },
        { name: "user", key: (t) => t.user_id || null },
        { name: "email", key: (t) => lower(t.email) || null },
      ],
    }),
    connectEvents: store.collection<ConnectEventDoc>({
      name: "connect_events",
      indexes: [
        { name: "user", key: (e) => e.user_id, sort: (e) => pad(e.seq), meta: (e) => ({ seq: e.seq, channel: e.channel, created_at: e.created_at }) },
        { name: "all", key: () => "all", sort: (e) => oldestFirst(e.created_at), meta: (e) => ({ user_id: e.user_id, size: e.size, created_at: e.created_at }) },
      ],
    }),
    webhooks: store.collection<WebhookDoc>({
      name: "webhooks",
      indexes: [
        { name: "user", key: (w) => w.user_id },
        { name: "all", key: () => "all", meta: (w) => ({ user_id: w.user_id, active: w.active, failures: w.failures }) },
      ],
    }),
    webhookDeliveries: store.collection<WebhookDeliveryDoc>({
      name: "webhook_deliveries",
      indexes: [
        { name: "webhook", key: (d) => d.webhook_id },
        { name: "due", key: (d) => (d.done ? null : "all"), sort: (d) => oldestFirst(d.next_at || d.created_at) },
        { name: "all", key: () => "all", sort: (d) => oldestFirst(d.created_at), meta: (d) => ({ status: d.status, done: d.done, created_at: d.created_at }) },
      ],
    }),
    apiKeys: store.collection<ApiKeyDoc>({
      name: "api_keys",
      unique: [{ name: "hash", value: (k) => k.hash }],
      indexes: [
        { name: "user", key: (k) => k.user_id },
        // What Admin → Connect lists (never the hash). last_used_at is written at most once a minute per key.
        { name: "all", key: () => "all", meta: (k) => ({ user_id: k.user_id, name: k.name, prefix: k.prefix, scopes: k.scopes, origins: k.origins, created_at: k.created_at, last_used_at: k.last_used_at, revoked_at: k.revoked_at }) },
      ],
    }),
    userAiKeys: store.collection<UserAiKeyDoc>({
      name: "user_ai_keys",
      indexes: [{ name: "user", key: (k) => k.user_id, sort: (k) => oldestFirst(k.created_at) }],
    }),
    aiProviderKeys: store.collection<AiProviderKeyDoc>({
      name: "ai_provider_keys",
      indexes: [{ name: "all", key: () => "all", sort: (k) => newestFirst(k.updated_at) }],
    }),
    byoxUsage: store.collection<ByoxUsageDoc>({
      name: "byox_usage",
      indexes: [{ name: "month", key: (u) => u.month, sort: (u) => u.user_id, meta: (u) => ({ requests: u.requests, clipper_videos: u.clipper_videos }) }],
    }),
    // Member → Clipper usage reads "user"; Admin → Clipper reads "month". Both newest first, summaries only.
    clipperUsage: store.collection<ClipperUsageDoc>({
      name: "clipper_usage",
      indexes: [
        { name: "user", key: (e) => e.user_id, sort: (e) => newestFirst(e.created_at), meta: (e) => ({ event: e.event, project_id: e.project_id, bytes: e.bytes, detail: e.detail.slice(0, 200), created_at: e.created_at }) },
        { name: "month", key: (e) => e.month, sort: (e) => newestFirst(e.created_at), meta: (e) => ({ user_id: e.user_id, event: e.event, project_id: e.project_id, bytes: e.bytes, created_at: e.created_at }) },
      ],
    }),
    managedUsage: store.collection<ManagedUsageDoc>({ name: "managed_usage" }),
    managedSubscriptions: store.collection<ManagedSubscriptionDoc>({ name: "managed_subscriptions" }),
    passwordResets: store.collection<PasswordResetDoc>({ name: "password_resets", indexes: [{ name: "email", key: (r) => lower(r.email) }] }),
    audit: store.collection<AuditDoc>({
      name: "audit_log",
      indexes: [
        // The summary carries what the audit page shows and searches, so a page of the log is one list call.
        { name: "all", key: () => "all", meta: (a) => ({ actor_email: a.actor_email, action: a.action, entity_type: a.entity_type, entity_id: a.entity_id.slice(0, 120), ip_address: a.ip_address, created_at: a.created_at, metadata: (a.metadata || "").slice(0, 600) }) },
        { name: "action", key: (a) => a.action },
        { name: "actor", key: (a) => lower(a.actor_email) || null },
        { name: "entity", key: (a) => (a.entity_type ? `${a.entity_type}|${a.entity_id}` : null) },
      ],
    }),
    investors: store.collection<InvestorDoc>({
      name: "investors",
      indexes: [
        { name: "all", key: () => "all" },
        { name: "email", key: (i) => lower(i.email), sort: (i) => newestFirst(i.verified_at || i.created_at) },
        { name: "status", key: (i) => i.status },
      ],
    }),
    investorPayouts: store.collection<InvestorPayoutDoc>({
      name: "investor_payouts",
      indexes: [
        { name: "investor", key: (p) => p.investor_id, sort: (p) => `${p.period}_${oldestFirst(p.paid_at)}` },
        { name: "all", key: () => "all", sort: (p) => `${p.period}_${oldestFirst(p.paid_at)}` },
      ],
    }),
    // Every list (the public board, the portals, the tick, the admin desk) reads the summaries on the index
    // entries — 103 lots per auction are never read one document at a time (lotSummary below).
    auctionLots: store.collection<AuctionLotDoc>({
      name: "auction_lots",
      indexes: [
        { name: "all", key: () => "all", meta: lotSummary },
        { name: "status", key: (l) => l.status, sort: (l) => oldestFirst(l.status === "awaiting_payment" ? l.pay_by : l.ends_at), meta: lotSummary },
        { name: "cycle", key: (l) => l.cycle, sort: (l) => l.title, meta: lotSummary },
        { name: "winner", key: (l) => l.winner_user || null, sort: (l) => newestFirst(l.closed_at || l.created_at) },
        // Every win, paid or not yet paid (owner: an unpaid winner stays listed), newest first.
        { name: "won", key: (l) => (l.status === "sold" || l.status === "awaiting_payment" ? "all" : null), sort: (l) => newestFirst(l.closed_at || l.created_at), meta: lotSummary },
      ],
    }),
    auctionBids: store.collection<AuctionBidDoc>({
      name: "auction_bids",
      indexes: [
        // Highest first: whole dollars fill 10 digits, inverted; the earlier bid wins a tie.
        { name: "lot", key: (b) => b.lot_id, sort: (b) => `${String(9_999_999_999 - Math.round(b.amount_usd)).padStart(10, "0")}_${String(b.seq).padStart(6, "0")}` },
        { name: "user", key: (b) => b.user_id, sort: (b) => newestFirst(b.created_at) },
      ],
    }),
    auctionBidders: store.collection<AuctionBidderDoc>({ name: "auction_bidders" }),
    saleRounds: store.collection<SaleRoundDoc>({
      name: "sale_rounds",
      indexes: [
        { name: "all", key: () => "all", sort: (r) => String(9_999_999 - r.no).padStart(7, "0"), meta: roundSummary },
        { name: "status", key: (r) => r.status, meta: roundSummary },
      ],
    }),
    saleBids: store.collection<SaleBidDoc>({
      name: "sale_bids",
      indexes: [
        // Highest first: whole dollars fill 12 digits, inverted; the earlier bid wins a tie.
        { name: "round", key: (b) => b.round_id, sort: (b) => `${String(999_999_999_999 - Math.round(b.amount_usd)).padStart(12, "0")}_${String(b.seq).padStart(6, "0")}` },
        { name: "user", key: (b) => b.user_id, sort: (b) => newestFirst(b.created_at) },
      ],
    }),
    saleBidders: store.collection<SaleBidderDoc>({
      name: "sale_bidders",
      indexes: [{ name: "status", key: (b) => b.status, sort: (b) => newestFirst(b.created_at), meta: (b) => ({ email: b.email, display_name: b.display_name, company: b.company, country: b.country, phone: b.phone, message: b.message.slice(0, 300), created_at: b.created_at }) }],
    }),
    affiliates: store.collection<AffiliateDoc>({
      name: "affiliates",
      unique: [{ name: "code", value: (a) => a.code }],
      indexes: [{ name: "status", key: (a) => a.status, sort: (a) => newestFirst(a.created_at), meta: (a) => ({ email: a.email, name: a.name, code: a.code, payout_method: a.payout_method, created_at: a.created_at }) }],
    }),
    referrals: store.collection<ReferralDoc>({
      name: "referrals",
      indexes: [{ name: "affiliate", key: (r) => r.affiliate_id, sort: (r) => newestFirst(r.created_at), meta: (r) => ({ email: r.email, attributed_at: r.attributed_at, until: r.until, flagged: r.flagged }) }],
    }),
    commissions: store.collection<CommissionDoc>({
      name: "commissions",
      indexes: [
        { name: "affiliate", key: (c) => c.affiliate_id, sort: (c) => newestFirst(c.created_at), meta: commissionSummary },
        { name: "status", key: (c) => c.status, sort: (c) => `${c.hold_until}_${c.id}`, meta: commissionSummary },
      ],
    }),
    affPayouts: store.collection<AffPayoutDoc>({
      name: "aff_payouts",
      indexes: [
        { name: "affiliate", key: (p) => p.affiliate_id, sort: (p) => newestFirst(p.created_at), meta: payoutSummary },
        { name: "status", key: (p) => p.status, sort: (p) => newestFirst(p.created_at), meta: payoutSummary },
      ],
    }),
    partnerApps: store.collection<PartnerAppDoc>({
      name: "partner_apps",
      indexes: [{ name: "program", key: (a) => a.program, sort: (a) => newestFirst(a.created_at), meta: (a) => ({ email: a.email, name: a.name, company: a.company, country: a.country, status: a.status, created_at: a.created_at }) }],
    }),
    // Admin → LinkedIn reads the log from the summaries, newest first.
    socialPosts: store.collection<SocialPostDoc>({
      name: "social_posts",
      indexes: [{ name: "all", key: () => "all", sort: (p) => newestFirst(p.created_at), meta: socialSummary }],
    }),
  };
}

export type Collections = ReturnType<typeof collections>;

/** Deterministic ids for tables whose D1 key was not `id`. */
export const ids = {
  subscription: (userId: string) => userId,
  usage: (userId: string, month: string) => `${userId}_${month}`,
  aiKey: (userId: string, provider: string) => `${userId}_${provider}`,
  /** Transaction hashes become ids as they are; anything outside [\w.:-] is hex-escaped so the key stays valid. */
  proof: (txHash: string) => txHash.replace(/[^\w.:-]/g, (c) => `%${c.charCodeAt(0).toString(16)}`),
};
