/* AXTO — the partner programmes in English: the hub (/partners), the affiliate,
 * reseller and white-label pages, the application form and the member's affiliate
 * portal (/app/affiliate). Rendered statically for SEO; the nine other languages
 * live in lib/i18n-pages/partners.ts and load on demand. Numbers come from Admin →
 * Programs and fill the {placeholders}. Public terms only — nothing about how the
 * business runs inside (docs/BUSINESS-MASTER-BLUEPRINT.md §9). */
import type { PublicPrograms, Tier } from "./programs";

export interface PartnersCopy {
  common: {
    back: string; open: string; closed: string; portalLater: string; signIn: string; register: string; faqTitle: string;
    termsTitle: string; tiersTitle: string; apply: string; tierRow: string; tierNames: string[];
  };
  hub: {
    eyebrow: string; title: string; lead: string;
    cards: { name: string; tag: string; points: string[]; cta: string }[];
    compareTitle: string; compareHead: string[]; compare: string[][];
    promiseTitle: string; promises: string[][];
    faq: string[][];
  };
  affiliate: {
    eyebrow: string; title: string; lead: string;
    terms: string[][];
    howTitle: string; steps: string[][];
    calcTitle: string; calcCustomers: string; calcSpend: string; calcResult: string; calcNote: string;
    rulesTitle: string; rules: string[];
    join: string; portal: string;
    faq: string[][];
  };
  reseller: {
    eyebrow: string; title: string; lead: string;
    terms: string[][];
    includesTitle: string; includes: string[];
    yoursTitle: string; yours: string[];
    exampleTitle: string; example: string; exampleNote: string;
    stepsTitle: string; steps: string[][];
    faq: string[][];
  };
  whitelabel: {
    eyebrow: string; title: string; lead: string;
    terms: string[][];
    brandTitle: string; brand: string[];
    includedTitle: string; included: string[];
    manageTitle: string; manageBody: string;
    ownTitle: string; own: string[];
    exampleTitle: string; example: string; exampleNote: string;
    stepsTitle: string; steps: string[][];
    faq: string[][];
  };
  form: {
    title: string; lead: string; programs: { reseller: string; whitelabel: string };
    name: string; company: string; country: string; website: string; languages: string; languagesHint: string;
    volume: string; message: string; ack: string; send: string; sending: string; signIn: string;
    ok: string; okB: string; already: string; statuses: { new: string; contacted: string; invited: string; declined: string };
    err: { name: string; company: string; country: string; ack: string; closed: string; admin: string; rate: string; other: string };
  };
  me: {
    title: string; lead: string;
    joinTitle: string; joinB: string; accept: string; join: string; joining: string; termsLink: string;
    closed: string; hidden: string; admin: string; suspended: string; banned: string; frozen: string;
    linkTitle: string; copy: string; copied: string; code: string; shareHint: string;
    stats: { clicks: string; signups: string; customers: string; held: string; payable: string; paid: string };
    payoutTitle: string; payoutNone: string; payoutCurrent: string; change: string;
    methods: { paypal: string; usdt: string; wire: string };
    paypalEmail: string; usdtAddress: string; bankName: string; bankHolder: string; bankAccount: string; bankSwift: string; bankCountry: string;
    save: string; saving: string; saved: string; cancel: string; payoutNote: string;
    commTitle: string; commEmpty: string; cols: { date: string; kind: string; amount: string; status: string; until: string };
    kinds: { customer: string; partner_fee: string; clawback: string };
    statuses: { held: string; review: string; payable: string; paid: string; reversed: string };
    refTitle: string; refEmpty: string; refUntil: string;
    payTitle: string; payEmpty: string; period: string;
    payStatuses: { approval: string; processing: string; paid: string; failed: string };
  };
}

export const PARTNERS_EN: PartnersCopy = {
  common: {
    back: "All partner programmes",
    open: "Open now",
    closed: "This programme is not taking new members at the moment.",
    portalLater: "Applications are open now. The partner portal opens in stages: you receive an invitation by e-mail as soon as yours is ready, with the agreement and the payment options. Nothing is paid before that.",
    signIn: "Sign in",
    register: "Create a free account",
    faqTitle: "Questions and answers",
    termsTitle: "The terms",
    tiersTitle: "Wholesale discount",
    apply: "Apply now",
    tierRow: "{name}: {pct}% off list price — from {from} of purchases in the last 12 months",
    tierNames: ["Silver", "Gold", "Platinum", "Diamond", "Elite", "Crown"],
  },
  hub: {
    eyebrow: "Partner programmes",
    title: "Grow with AXTO — from a single link to a platform under your own brand.",
    lead: "Recommend AXTO and earn a commission, resell it at a wholesale discount, or run the whole platform under your own name. Every programme has clear, published terms and is built to be profitable for you from your first sale.",
    cards: [
      { name: "Affiliate", tag: "Free to join · commission", points: ["{pct}% of every paid order for {months} months", "{fee}% of a referred partner's entry fee", "Paid monthly, from {min}"], cta: "Become an affiliate" },
      { name: "Reseller", tag: "AXTO brand · wholesale", points: ["Up to {max}% off list price", "Entry {entry}, of which {credit} is credit", "Your prices, your clients"], cta: "Become a reseller" },
      { name: "White label", tag: "Your brand · your platform", points: ["The whole platform under your name and domain", "Up to {max}% off list price, plus Manage AI", "English plus your own language"], cta: "Explore white label" },
    ],
    compareTitle: "Which programme fits you?",
    compareHead: ["", "Affiliate", "Reseller", "White label"],
    compare: [
      ["Brand your clients see", "AXTO", "AXTO", "Yours"],
      ["Who supports the client", "AXTO", "You", "You"],
      ["How you earn", "Commission", "Wholesale discount", "Wholesale discount and your own services"],
      ["Entry", "Free", "{rEntry}", "{wEntry}"],
      ["Best for", "Creators, consultants, communities", "IT resellers, agencies, integrators", "Software companies, telcos, distributors"],
    ],
    promiseTitle: "Four promises behind every programme",
    promises: [
      ["Prepaid and simple", "Partners buy credit before they sell. No invoices to chase, no revenue to split, no surprises on either side."],
      ["Strict licences", "Every licence is signed, bound to its machines and revocable, so your clients' keys cannot be copied or resold."],
      ["Your clients stay yours", "Resellers and white-label partners handle their clients' setup, support, renewals and complaints — and keep the relationship."],
      ["Published, equal terms", "Discounts follow the tiers on these pages, for every partner alike. No side deals, no negotiation."],
    ],
    faq: [
      ["Can I join more than one programme?", "Yes. Many partners start as affiliates and later become resellers or white-label partners. Each programme has its own terms."],
      ["Do I need technical staff?", "Affiliates don't. Resellers and white-label partners should be able to install and support the products for their clients; self-paced training and an automatic certification prepare your team."],
      ["In which currency are the terms?", "All programme amounts are in US dollars."],
    ],
  },
  affiliate: {
    eyebrow: "Affiliate programme · free to join",
    title: "Recommend AXTO. Earn {pct}% of every sale for {months} months.",
    lead: "Share your link with your audience, your clients or your team. When someone signs up through it and pays for AXTO, you earn {pct}% of every paid order they make for {months} months — and {fee}% once when you bring a reseller or white-label partner.",
    terms: [
      ["Commission", "{pct}% of every paid order"],
      ["For", "{months} months after sign-up"],
      ["Partner referral", "{fee}% of their entry fee, once"],
      ["Link remembered", "{days} days"],
      ["Refund window", "{hold} days, then payable"],
      ["Payout", "Monthly from the 5th · minimum {min}"],
    ],
    howTitle: "How it works",
    steps: [
      ["Join for free", "Sign in, accept the affiliate terms and get your personal link in one click."],
      ["Share your link", "Anyone who opens it is remembered for {days} days. When they create an account, it is tied to you for good."],
      ["They pay, you earn", "Every paid order of a customer you referred earns you {pct}% for {months} months. You see each one in your portal."],
      ["Get paid", "After the {hold}-day refund window, commissions are paid every month from the 5th — by PayPal, USDT (TRC20) or bank wire, from {min}."],
    ],
    calcTitle: "What could you earn?",
    calcCustomers: "Customers you refer",
    calcSpend: "Their spend per month",
    calcResult: "Your commission over {months} months",
    calcNote: "An illustration of the formula only: {pct}% × monthly spend × {months} months × customers. What you earn depends on what your customers really buy.",
    rulesTitle: "Fair-play rules",
    rules: [
      "Self-referrals never earn: your own account or e-mail address, however it is written.",
      "Only real, paid orders count. Refunded orders are reversed — after a payout, the amount is deducted from the next one.",
      "No ads on the AXTO name, no spam, no coupon sites and no misleading claims.",
      "Large commissions, and sign-ups from your own network, are checked once before they are paid.",
      "The sale of the site and investments never earn a commission.",
    ],
    join: "Become an affiliate",
    portal: "Open your affiliate portal",
    faq: [
      ["Who can join?", "Anyone with a free AXTO account. Joining costs nothing and there is no target to meet."],
      ["How long is a visitor remembered?", "{days} days after they open your link. If they open another affiliate's link later, the most recent link counts. Once they sign up, the account stays tied to you."],
      ["Which orders earn?", "Every paid order of the customers you referred during the {months} months after they signed up: subscriptions, editions, lifetime licences and add-ons. Test payments, the sale of the site and investments do not count."],
      ["When and how am I paid?", "Each commission waits {hold} days for the refund window, then joins the monthly payout from the 5th. Choose PayPal, USDT (TRC20) or bank wire in your portal; the minimum is {min} — a smaller balance rolls over to the next month."],
      ["What happens on a refund?", "The commission is reversed. If it was already paid, the amount is deducted from your next payout."],
      ["Do I have to support the customers?", "No. AXTO supports the customers you refer; you simply recommend."],
    ],
  },
  reseller: {
    eyebrow: "Reseller programme · AXTO brand",
    title: "Sell AXTO to your clients — at up to {max}% off list price.",
    lead: "For IT resellers, agencies and integrators who want a premium AI platform in their catalogue. You buy licences at a wholesale discount from prepaid credit, set your own prices and look after your clients yourself.",
    terms: [
      ["Entry fee", "{entry}"],
      ["Included credit", "{credit} to spend on licences"],
      ["Net cost of joining", "{net}"],
      ["Annual fee", "{annual} from the second year — waived from {waived} of purchases in 12 months"],
      ["Advertised prices", "At least list price minus {map}%"],
      ["Credit validity", "{creditMonths} months from purchase, oldest credit used first"],
      ["Payment", "Bank wire, escrow or crypto"],
    ],
    includesTitle: "What you get",
    includes: [
      "Every AXTO product at a wholesale price: cloud plans, self-hosted editions and lifetime licences",
      "A partner portal to issue, renew and revoke your clients' licences",
      "A discount that rises with your purchases, by the published tiers",
      "Sales material, self-paced product training and a partner badge",
      "Partner support for you and your team: a partner assistant, the knowledge base and the status page",
    ],
    yoursTitle: "Your clients, your responsibility",
    yours: [
      "Setup and onboarding of your clients",
      "First-line support and complaints",
      "Renewals, upgrades, revocations and bans",
      "Invoicing your clients at your own prices",
    ],
    exampleTitle: "A worked example",
    example: "You sell 40 Pro plans a month at list price ({list} a month each). At a {pct}% discount you pay {cost} and keep {gain} every month — {year} a year, before your own services.",
    exampleNote: "An illustration at the first tier and the current list price. Your prices and volumes are your own.",
    stepsTitle: "How to become a reseller",
    steps: [
      ["Apply", "Tell us about your company and your market below."],
      ["Accept the agreement", "Accept the reseller agreement electronically when your invitation arrives."],
      ["Pay the entry fee", "By bank wire, escrow or crypto; {credit} of it becomes your credit at once."],
      ["Start selling", "Your partner portal opens: buy licences from your credit and issue them to your clients."],
    ],
    faq: [
      ["Can I set my own prices?", "Yes, you sell at any price you choose. Prices you advertise publicly stay at least list price minus {map}%, which keeps the market healthy for every partner."],
      ["How does my discount rise?", "It follows your purchases over the last 12 months, by the tiers on this page — no negotiation needed."],
      ["What does the annual fee cover?", "Your partner portal, the programme and partner support from the second year: {annual} a year, waived once your purchases over 12 months reach {waived}."],
      ["Can credit be paid out?", "Credit is prepaid value for buying AXTO licences, valid for {creditMonths} months from purchase; it is not exchanged for cash."],
      ["Who supports my clients?", "You do: setup, support, renewals and complaints are yours. AXTO supports you, the partner."],
    ],
  },
  whitelabel: {
    eyebrow: "White-label programme · your own brand",
    title: "Your brand. Your platform. Powered by AXTO.",
    lead: "Launch a complete AI platform under your own name, logo, colours and domain — cloud apps, self-hosted editions, licences and AI for your clients — without building it. You own the client relationship from setup to renewal, and your clients see only your brand.",
    terms: [
      ["Entry fee (first year)", "{entry}"],
      ["Included wholesale credit", "{credit}, ready to sell"],
      ["Platform fee", "{annual} a year from the second year ({reduced} from {reducedFrom} of purchases)"],
      ["Minimum purchases", "{minAnnual} a year from the second year — any shortfall is issued to you as credit"],
      ["Combined discounts", "Never above {cap}% of list price"],
      ["Credit validity", "{creditMonths} months from purchase, oldest credit used first"],
      ["Payment", "Bank wire, escrow or crypto"],
    ],
    brandTitle: "Everything under your brand",
    brand: [
      "Your name, logo, colours and icon",
      "Your own domain, with its certificate issued for you",
      "E-mails from your own address",
      "English plus one more language of your choice — Arabic, German, Indonesian and more",
      "Your support contacts and an AI chat in your name",
    ],
    includedTitle: "Included in the entry fee",
    included: [
      "{credit} of wholesale credit to sell at once",
      "A one-year brand licence",
      "A dedicated, isolated instance",
      "Manage: AI provided for your clients, from your prepaid AI wallet",
      "The partner portal, the partner API and licence issuing",
      "{demo} demo licences of {demoDays} days to show your clients",
      "Self-paced onboarding guides and an automatic certification for your team",
    ],
    manageTitle: "Manage — only for white-label partners",
    manageBody: "On axto.io every member brings their own AI keys. Your clients don't have to: with Manage you offer AI that simply works, drawn from your prepaid AI wallet, at the price you set. Manage is available only inside white label.",
    ownTitle: "You own your clients completely",
    own: ["Setup and onboarding", "Support and complaints", "Renewals and upgrades", "Revocations and bans", "Your prices, your contracts, your invoices"],
    exampleTitle: "A worked example",
    example: "At a {pct}% discount, selling at list price doubles your money. {clients} clients on Business ({list} a year each) bring you about {gain} of gross profit in a year — more than the net cost of the brand licence in the first year ({net}) — before your own setup, support and AI services.",
    exampleNote: "An illustration at the first tier and the current list price. Your prices and volumes are your own.",
    stepsTitle: "How to launch",
    steps: [
      ["Apply", "Tell us about your company, your market and your second language."],
      ["Sign and pay", "Accept the white-label agreement electronically and pay the entry fee by bank wire, escrow or crypto."],
      ["Brand it", "Upload your logo and choose your colours, your domain and your second language in the brand studio."],
      ["Go live", "Point your domain to your instance; its certificate is issued and your platform opens to your clients."],
    ],
    faq: [
      ["Will my clients see AXTO?", "No. Your clients see your brand, your domain, your e-mails and your support contacts."],
      ["Which languages can my platform use?", "English plus one more language of your choice — for example Arabic and English, or German and English."],
      ["What happens from the second year?", "A platform fee of {annual} a year ({reduced} from {reducedFrom} of purchases) and minimum purchases of {minAnnual} a year. Any shortfall is issued to you as credit, so you keep its full value."],
      ["How is Manage priced?", "You buy AI usage for your prepaid AI wallet at wholesale and set your own price to your clients. When the wallet is empty, AI requests pause — there is never a debt."],
      ["Who supports my clients?", "You do, completely. AXTO supports your team automatically: a partner assistant, the knowledge base, diagnostics for your instance and the status page."],
      ["Does credit expire?", "Wholesale credit is valid for {creditMonths} months from purchase and the oldest is used first; your portal reminds you 30 days before any of it expires."],
      ["What if I stop?", "Your clients are never stranded: if you leave the programme, or your account stays suspended for more than {continuity} days, each client is offered to continue directly with AXTO, with their data."],
      ["Can I issue licences myself?", "Yes. Your clients' licences are issued from your credit in the partner portal or through the partner API. Every licence is signed, bound to your client's machines and can be revoked by you."],
    ],
  },
  form: {
    title: "Apply for the {program} programme",
    lead: "We read every application. When your partner portal is ready you receive an invitation by e-mail with the agreement and the payment options.",
    programs: { reseller: "reseller", whitelabel: "white-label" },
    name: "Your name", company: "Company", country: "Country", website: "Website (optional)",
    languages: "Second language for your brand", languagesHint: "Besides English — for example Arabic, German or Indonesian.",
    volume: "Clients or sales you expect in the first year (optional)", message: "Anything else we should know? (optional)",
    ack: "I have read the programme terms on this page.", send: "Send my application", sending: "Sending…",
    signIn: "Sign in or create a free account to apply — your partner portal will live in that account.",
    ok: "Thank you — your application has been received.",
    okB: "We will write to {email} as soon as your partner portal is ready. Nothing is due before you accept the agreement.",
    already: "You applied on {date}. Status: {status}.",
    statuses: { new: "received", contacted: "in conversation", invited: "invited", declined: "declined" },
    err: {
      name: "Please enter your name.", company: "Please enter your company.", country: "Please enter your country.",
      ack: "Please confirm that you have read the terms.", closed: "This programme is not taking applications at the moment.",
      admin: "Administrator accounts cannot apply.", rate: "Too many attempts — please try again later.", other: "Something went wrong. Please try again.",
    },
  },
  me: {
    title: "Affiliate programme",
    lead: "Earn {pct}% of every paid order of the customers you refer, for {months} months after they sign up.",
    joinTitle: "Join the affiliate programme",
    joinB: "Free, in one click. You get a personal link, and your sign-ups, commissions and payouts appear here.",
    accept: "I accept the affiliate terms (version {version}): the fair-play rules, the {hold}-day refund window and the minimum payout of {min}.",
    join: "Join now", joining: "Joining…", termsLink: "Read the programme terms",
    closed: "The affiliate programme is not taking new members at the moment.",
    hidden: "The affiliate programme is not available at the moment.",
    admin: "Administrator accounts cannot join the affiliate programme.",
    suspended: "Your affiliate account is suspended. Your link does not earn while it is. Contact us if you think this is a mistake.",
    banned: "Your affiliate account is closed.",
    frozen: "Payouts are paused at the moment. Your commissions are safe and keep counting.",
    linkTitle: "Your link", copy: "Copy", copied: "Copied", code: "Your code: {code}",
    shareHint: "Add ?ref={code} to the address of any axto.io page to link straight to it.",
    stats: { clicks: "Clicks (30 days)", signups: "Sign-ups", customers: "Paying customers", held: "Pending", payable: "Ready for payout", paid: "Paid to you" },
    payoutTitle: "How you are paid", payoutNone: "Add a payout method to receive your commissions.", payoutCurrent: "Payouts go to {label}.", change: "Change",
    methods: { paypal: "PayPal", usdt: "USDT (TRC20)", wire: "Bank wire" },
    paypalEmail: "PayPal e-mail address", usdtAddress: "USDT address (TRC20)", bankName: "Bank", bankHolder: "Account holder",
    bankAccount: "Account number or IBAN", bankSwift: "SWIFT / BIC", bankCountry: "Country of the bank",
    save: "Save", saving: "Saving…", saved: "Saved. Your details are stored encrypted.", cancel: "Cancel",
    payoutNote: "Payouts are made every month from the 5th, once your ready balance reaches {min}.",
    commTitle: "Commissions", commEmpty: "No commissions yet — share your link to get started.",
    cols: { date: "Date", kind: "Type", amount: "Amount", status: "Status", until: "Payable from" },
    kinds: { customer: "Customer order", partner_fee: "Partner entry fee", clawback: "Refund deducted" },
    statuses: { held: "Pending", review: "Being checked", payable: "Ready", paid: "Paid", reversed: "Reversed" },
    refTitle: "Sign-ups through your link", refEmpty: "No sign-ups yet.", refUntil: "Earning until {date}",
    payTitle: "Payouts", payEmpty: "No payouts yet.", period: "Month",
    payStatuses: { approval: "Being sent", processing: "Processing", paid: "Paid", failed: "Not sent — returns to the next payout" },
  },
};

/* ---- the numbers that fill the {placeholders}: one source for the page and its JSON-LD ---- */

type Money = (n: number) => string;
export const fillCopy = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k]! : m));
export const maxTier = (list: Tier[]) => list.reduce((n, x) => Math.max(n, x.pct), 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function affiliateVars(a: NonNullable<PublicPrograms["affiliate"]>, money: Money): Record<string, string> {
  return { pct: String(a.commissionPct), months: String(a.months), fee: String(a.partnerFeePct), days: String(a.cookieDays), hold: String(a.holdDays), min: money(a.minPayoutUsd) };
}

/** The reseller example: 40 Pro plans a month at list price, bought at the first tier. */
export function resellerVars(r: NonNullable<PublicPrograms["reseller"]>, money: Money, proMonthlyUsd: number): Record<string, string> {
  const first = r.tiers[0]!;
  const gain = r2((40 * proMonthlyUsd * first.pct) / 100);
  return {
    max: String(maxTier(r.tiers)), entry: money(r.entryUsd), credit: money(r.includedCreditUsd), net: money(r.entryUsd - r.includedCreditUsd),
    annual: money(r.annualUsd), waived: money(r.annualWaivedFromUsd), map: String(r.mapPct), creditMonths: String(r.creditMonths),
    list: money(proMonthlyUsd), pct: String(first.pct), cost: money(r2(40 * proMonthlyUsd - gain)), gain: money(gain), year: money(r2(gain * 12)),
  };
}

/** The clients on Business (yearly, list price, first tier) whose margin first covers the net cost of the brand licence, in tens. */
export function whitelabelClients(w: Pick<NonNullable<PublicPrograms["whitelabel"]>, "entryUsd" | "includedCreditUsd" | "tiers">, businessYearlyUsd: number): number {
  const perClient = (businessYearlyUsd * w.tiers[0]!.pct) / 100;
  const net = w.entryUsd - w.includedCreditUsd;
  return Math.max(10, Math.ceil((net + 1) / Math.max(perClient, 1) / 10) * 10);
}

/** The white-label example: enough Business clients for a year, at list price, bought at the first tier, to cover the brand licence. */
export function whitelabelVars(w: NonNullable<PublicPrograms["whitelabel"]>, money: Money, businessYearlyUsd: number): Record<string, string> {
  const first = w.tiers[0]!;
  const clients = whitelabelClients(w, businessYearlyUsd);
  return {
    max: String(maxTier(w.tiers)), entry: money(w.entryUsd), credit: money(w.includedCreditUsd), net: money(w.entryUsd - w.includedCreditUsd),
    annual: money(w.annualUsd), reduced: money(w.annualReducedUsd), reducedFrom: money(w.annualReducedFromUsd), minAnnual: money(w.minAnnualUsd),
    cap: String(w.maxCombinedDiscountPct), list: money(businessYearlyUsd), pct: String(first.pct), clients: String(clients),
    gain: money(r2((clients * businessYearlyUsd * first.pct) / 100)),
    creditMonths: String(w.creditMonths), demo: String(w.demoLicences), demoDays: String(w.demoDays), continuity: String(w.continuityDays),
  };
}

export const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
