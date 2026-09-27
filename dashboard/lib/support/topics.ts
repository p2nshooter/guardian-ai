/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Support topics — the dropdown in the chat widget, the contact form and the
 * admin inbox. `handoff` topics always need a person (prices are negotiated,
 * payments confirmed and deals signed by the team — never by the AI).
 * ============================================================================ */
export type TopicId = "quote" | "lifetime" | "crypto" | "bank" | "enterprise" | "billing" | "technical" | "account" | "other";

export interface Topic {
  id: TopicId;
  label: { en: string; id: string };
  hint: { en: string; id: string };
  handoff: boolean;
}

export const TOPICS: Topic[] = [
  { id: "quote", handoff: true,
    label: { en: "Request an offer / quotation", id: "Minta penawaran / quotation" },
    hint: { en: "Tell us the apps, number of users or devices and your timeline.", id: "Sebutkan aplikasi, jumlah pengguna/perangkat, dan timeline Anda." } },
  { id: "lifetime", handoff: true,
    label: { en: "Lifetime licence — price & negotiation", id: "Lisensi Lifetime — harga & negosiasi" },
    hint: { en: "Which apps, how many devices (1–100), and your budget. Our team replies with a proposal.", id: "Aplikasi apa, berapa perangkat (1–100), dan budget Anda. Tim kami membalas dengan proposal." } },
  { id: "crypto", handoff: true,
    label: { en: "Pay with crypto (USDT, BTC, ETH…)", id: "Bayar dengan crypto (USDT, BTC, ETH…)" },
    hint: { en: "Ask for wallet details or send your transaction hash for confirmation.", id: "Minta detail wallet atau kirim hash transaksi untuk konfirmasi." } },
  { id: "bank", handoff: true,
    label: { en: "Pay by bank transfer (BNI / wire)", id: "Bayar via transfer bank (BNI / wire)" },
    hint: { en: "Ask for the invoice or send your transfer receipt for confirmation.", id: "Minta invoice atau kirim bukti transfer untuk konfirmasi." } },
  { id: "enterprise", handoff: true,
    label: { en: "Enterprise / custom contract", id: "Enterprise / kontrak khusus" },
    hint: { en: "SLA, on-premise, procurement, security review, reseller.", id: "SLA, on-premise, procurement, security review, reseller." } },
  { id: "billing", handoff: false,
    label: { en: "Billing, invoices & plans", id: "Tagihan, invoice & paket" },
    hint: { en: "Upgrades, renewals, invoices, refunds.", id: "Upgrade, perpanjangan, invoice, refund." } },
  { id: "technical", handoff: false,
    label: { en: "Technical support", id: "Bantuan teknis" },
    hint: { en: "Web apps, BYOK keys, Docker / Windows installation, licence activation.", id: "Aplikasi web, key BYOK, instalasi Docker / Windows, aktivasi lisensi." } },
  { id: "account", handoff: false,
    label: { en: "Account & sign-in", id: "Akun & login" },
    hint: { en: "Password, e-mail, team access.", id: "Password, e-mail, akses tim." } },
  { id: "other", handoff: false,
    label: { en: "Something else", id: "Lainnya" },
    hint: { en: "Anything else — we're happy to help.", id: "Apa pun — dengan senang hati kami bantu." } },
];

export function getTopic(id: unknown): Topic {
  return TOPICS.find((t) => t.id === id) || TOPICS[TOPICS.length - 1];
}
