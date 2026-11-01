/* AXTO — the investor round (/invest) and the investor's statement (/app/investor),
 * English. Rendered statically; the nine other languages live in
 * lib/i18n-pages/invest.ts and load on demand. AXTO only — the round shares no
 * revenue with xaa.es or any other site (owner, 19 Oct 2026). Placeholders in
 * {curly braces} are filled in by the page. */

export interface InvCopy {
  eyebrow: string; title: string; lead: string;
  terms: { label: string; target: string; min: string; pool: string; poolNote: string; payout: string; payoutV: string; until: string; untilV: string; raised: string };
  apply: string; whatsapp: string; waText: string; mine: string;
  closedT: string; closedB: string; pausedT: string; pausedB: string;
  howTitle: string; howLead: string; exHead: string[]; exNote: string;
  countTitle: string; counts: string[][];
  todayTitle: string; today: string[]; buildTitle: string; build: string[];
  stepsTitle: string; steps: string[][];
  aloneT: string; aloneB: string;
  riskTitle: string; risks: string[];
  formTitle: string; formLead: string;
  form: {
    name: string; email: string; company: string; country: string; amount: string; amountHint: string;
    method: string; wire: string; paypal: string; message: string; messagePh: string; ack: string; send: string; sending: string;
    ok: string; err: { name: string; email: string; ack: string; min: string; max: string; closed: string; paused: string; other: string };
  };
  faqTitle: string; faq: string[][];
  wholeT: string; wholeB: string; wholeLink: string;
  me: {
    title: string; lead: string; none: string; noneB: string; apply: string;
    share: string; revenue: string; earnedPaid: string; open: string;
    month: string; rev: string; yours: string; paid: string; empty: string; verified: string; returned: string; foot: string;
  };
}

export const INV_EN: InvCopy = {
  eyebrow: "Investor round · AXTO only",
  title: "Invest in AXTO — a share of every sale, from the day your capital arrives.",
  lead: "AXTO is a live AI platform: seven cloud apps, a self-hosted product line for Linux and Windows, a real-time developer platform and payments in ten languages. This round funds the next stage and pays investors a monthly share of every paid AXTO order — until the business is acquired and the capital is returned in full.",
  terms: {
    label: "Terms of the round", target: "Round", min: "Minimum ticket", pool: "Revenue pool", poolNote: "of every paid AXTO order",
    payout: "Paid", payoutV: "Monthly, in US dollars", until: "Until", untilV: "A full acquisition of AXTO — then 100 % of the capital is returned", raised: "Raised so far",
  },
  apply: "Apply to invest", whatsapp: "Talk to the owner on WhatsApp", waText: "Hello, I am interested in the AXTO investor round.",
  mine: "Already an investor? See your statement",
  closedT: "The round is complete", closedB: "Thank you to everyone who took part. New applications are no longer accepted.",
  pausedT: "Applications are paused", pausedB: "The owner is not taking new applications at the moment — you are welcome to write in the meantime.",
  howTitle: "A simple, proportional revenue share",
  howLead: "Investors share {pool} of every paid AXTO order. Your part of that pool is your capital divided by the {target} round, so every dollar earns the same — first investor or last.",
  exHead: ["Capital", "Your share of each sale", "On $10,000 of revenue"],
  exNote: "An illustration of the formula only. Revenue changes month to month and can be nil; nothing here is a forecast or a promise.",
  countTitle: "What counts as revenue",
  counts: [
    ["Counted", "Every axto.io order that is paid — subscriptions, editions, lifetime licences and add-ons — in US dollars, on the day it is paid."],
    ["Never counted", "Test (sandbox) payments, refunded orders, investment and acquisition payments, anything pending or failed."],
    ["Your statement", "A private page in your account shows each month's revenue, your share, what has been paid and what is still due — never customer data."],
  ],
  todayTitle: "Built and live today",
  today: [
    "Seven cloud AI apps: Legal AI, AI Chat, Clipper, Privacy Vault, Compliance Center, Security Analyst and the Prompt Library",
    "A self-hosted product line for Linux and Windows, with editions, trial licences and offline lifetime licences",
    "AXTO Connect, a real-time developer platform",
    "Local Mode: AI that runs entirely on the member's own device",
    "Worldwide payments — PayPal, cards, crypto and bank wire — with invoices, in ten languages",
  ],
  buildTitle: "What the capital is for",
  build: [
    "Taking the self-hosted line to enterprise grade on Linux and Windows, starting with automatic GPU detection for Orchestra (NVIDIA, AMD, Intel, CPU)",
    "The independent assurance enterprise buyers ask for: penetration testing, SOC 2 and ISO 27001 audits, an EV code-signing certificate",
    "Deeper apps: more Legal AI jurisdictions and workspaces, new Studio and Clipper features, a broader Connect platform",
    "Sales and partnerships in South-East Asia, Europe and the Middle East",
  ],
  stepsTitle: "From application to your first statement",
  steps: [
    ["Apply", "Tell us who you are and what you intend to invest. Two minutes, and no commitment."],
    ["Memorandum and agreement", "Within one business day you receive the investor memorandum, an NDA and the draft investment agreement."],
    ["Sign", "Questions answered and terms agreed, both sides sign the agreement."],
    ["Send the capital", "By bank wire in USD or EUR to the company account named in your agreement, or by PayPal. Payment details are never published on this page."],
    ["Verified — your share starts", "We confirm receipt. From that day your share of every paid order is computed and appears in your account."],
    ["Paid monthly", "Each month's share is paid and recorded, so your statement always shows what is earned, paid and open."],
    ["Acquisition", "When AXTO is acquired in full, your capital is returned in full and the revenue share ends."],
  ],
  aloneT: "AXTO, and only AXTO",
  aloneB: "This round concerns AXTO alone. It shares no revenue, capital or obligations with xaa.es or any other site — each business raises separately, on its own merits.",
  riskTitle: "Risk notice",
  risks: [
    "This is a private placement in a growing business. Your capital is at risk.",
    "Revenue can rise, fall or be nil in any month; the revenue share is not a fixed return, and nothing on this page is a forecast.",
    "Capital is returned at a full acquisition of AXTO. An acquisition may not happen, or may take longer than you expect.",
    "Your written agreement governs every term; where it differs from this page, the agreement prevails.",
    "This page is not an offer of securities where such an offer would be unlawful. You confirm you may invest under the laws of your country, and you should take independent financial, legal and tax advice.",
  ],
  formTitle: "Start the conversation",
  formLead: "Applications go to the owner personally. You will hear back within one business day.",
  form: {
    name: "Full name", email: "Email", company: "Company or fund", country: "Country of residence",
    amount: "Intended investment (USD)", amountHint: "Whole dollars, from {min}",
    method: "How you would send the capital", wire: "Bank wire (USD or EUR)", paypal: "PayPal",
    message: "Questions or context", messagePh: "Your background, your timing, what you would like to see in the memorandum…",
    ack: "I have read the risk notice and understand that this is an application, not a payment.",
    send: "Apply to invest", sending: "Sending…",
    ok: "Thank you — your application for {amount} is with the owner. The memorandum and the draft agreement follow within one business day; capital is sent only after both are signed.",
    err: {
      name: "Please enter your name.", email: "Please enter a valid email address.", ack: "Please confirm that you have read the risk notice.",
      min: "The minimum ticket is {min}.", max: "The whole round is {target} — please enter an amount up to that.",
      closed: "The round is complete. Thank you for your interest.", paused: "Applications are paused at the moment.", other: "Something went wrong — please try again.",
    },
  },
  faqTitle: "Questions investors ask",
  faq: [
    ["Am I buying shares?", "The round is a revenue-sharing investment governed by a written agreement, as described above. Its exact legal form, and any security over your capital, is set out in the agreement you receive before anything is signed."],
    ["How is my share calculated?", "Your capital divided by the round, multiplied by the revenue pool. With today's terms, the minimum ticket carries the share shown in the table above and the full round carries the whole pool."],
    ["When does my share start?", "On the day we verify that your capital has arrived. Revenue paid before that day is not shared."],
    ["Can I see the figures?", "Yes. Your statement shows paid revenue month by month and your share of it. Detailed accounts are available in the data room under NDA."],
    ["Is this connected to xaa.es?", "No. AXTO raises on its own and shares its own revenue only. xaa.es runs a separate round on its own site."],
    ["Can I buy the whole of AXTO instead?", "Yes — the business itself is offered for acquisition on a separate page."],
  ],
  wholeT: "Prefer the whole to a share?", wholeB: "AXTO itself — domain, code, apps, payments and brand — is offered for outright acquisition.", wholeLink: "See the acquisition offer",
  me: {
    title: "Your investment in AXTO",
    lead: "Your share of {pool} of every paid AXTO order, pro rata to your capital against the {target} round. Revenue counts from the day your capital was verified; test payments, refunds and investment or acquisition payments never count. Payouts are monthly until a full acquisition of AXTO, when your capital is returned in full.",
    none: "No verified investment on this account",
    noneB: "A stake appears here once we have verified the capital we received, under the email you applied with ({email}).",
    apply: "See the investor round",
    share: "Your share", revenue: "AXTO revenue", earnedPaid: "Earned / paid", open: "Still to be paid",
    month: "Month", rev: "Revenue", yours: "Your share", paid: "Paid",
    empty: "No paid revenue since your capital was verified yet — your first month appears here as soon as there is.",
    verified: "Verified {date}", returned: "capital returned {date}",
    foot: "Figures are computed from paid orders and are not audited accounts. Your written agreement governs.",
  },
};
