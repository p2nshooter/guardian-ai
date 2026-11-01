/* ==============================================================================
 * Copyright (c) 2024-2026 AXTO Digital Global. All rights reserved.
 * ==============================================================================
 * The words of the site-sale AUCTION on /acquire and the homepage band (English;
 * the other nine languages are in lib/i18n-pages/sale-auction.ts, loaded on
 * demand). Owner, 28 Oct 2026 (REQUESTS 120): make it feel like the chance to get
 * the best price — and act now. Every line is true of lib/sale-auction.ts: real
 * bids, a real deadline, no hidden reserve, and (REQUESTS 132) offers from
 * US$500,000, the same for everyone. The "rises every week" lines (openingNoteRising,
 * ruleRising) are shown only when the admin sets a weekly rise. {open} appears once
 * in openingNote (the panel shows the price in bold there).
 * ============================================================================ */

export const SALE_AUC_EN = {
  eyebrow: "Live auction · one buyer · complete transfer",
  round: "Round {n}",
  openingBid: "Opening bid",
  currentBid: "Current bid",
  winningBid: "Winning bid",
  endsIn: "Ends in",
  bids: "Bids: {n}",
  noBids: "No bids yet — a bid at the opening price can win.",
  placeBid: "Place a bid",
  noReserve: "No hidden reserve: the highest bid when the clock stops buys the whole of AXTO.",
  openingNote: "Offers start at {open}, the opening price, the same for every bidder: no bid below it is accepted, and there is no hidden reserve above it.",
  openingNoteRising: "The opening bid rises by {weekly} every week, the same for every bidder — a bid placed now can win at a price no later bid is allowed.",
  rises: "Rises to {next} on {date}",
  urgency: "An opportunity measured in days: when this round closes, the price is whatever the best bid says.",

  boardTitle: "The auction",
  boardLead: "Real bids, a real deadline and one winner. Every bid appears here the moment it is placed.",
  rulesTitle: "How it works",
  rules: [
    "Every bid is at least the opening price of {open}; after the first bid, also at least the current bid plus {step}. You may bid higher at once.",
    "A bid in the last {min} minutes extends the round by {min} minutes, so every bidder gets a fair last word.",
    "Every bid is binding: the winner completes the purchase within {days} days — bank wire (escrow can be arranged), crypto or PayPal.",
    "Administrator access is granted the moment the payment is verified; the domain, code and accounts follow the handover checklist.",
  ] as string[],
  /** Replaces rules[0] while a weekly rise is set. */
  ruleRising: "Every bid is at least the opening bid of the day, which rises by {weekly} every week; after the first bid, also at least the current bid plus {step}. You may bid higher at once.",
  ruleApproval: "The owner verifies every bidder before they can bid. Names are shown masked.",
  ruleOpen: "Any signed-in member can register and bid. Names are shown masked.",
  latestBids: "Latest bids",
  noneYet: "No bids in this round yet.",

  signInToBid: "Sign in or create an account to register as a bidder.",
  signIn: "Sign in",
  register: "Create account",
  registerTitle: "Register to bid",
  registerLead: "Tell the owner who is bidding. Your name appears masked on this page; your company and contact details are seen only by the owner.",
  displayName: "Name shown with your bids",
  company: "Company (optional)",
  country: "Country",
  phone: "Phone / WhatsApp",
  message: "Message to the owner (optional)",
  registerBtn: "Register as a bidder",
  pending: "Thank you — your registration is waiting for the owner's approval. You will receive an e-mail.",
  rejected: "Your registration was not approved. Contact the owner to discuss.",
  adminNote: "Administrators run the auction and cannot bid — sign in with the bidder's account.",

  yourBid: "Your bid in US dollars (whole dollars)",
  bidBtn: "Bid {amount}",
  bidding: "Placing your bid…",
  bidPlaced: "Your bid is placed — you hold the highest bid.",
  extended: "Your late bid extended the round.",
  leading: "You hold the highest bid.",
  outbid: "You have been outbid — your best bid was {amount}.",
  binding: "By bidding you commit to buy at that price if your bid wins.",

  endedTitle: "This round has ended",
  awaiting: "Won at {amount} — awaiting the winner's payment.",
  youWon: "You won with {amount}. Please complete the purchase by {date}.",
  payNow: "Complete the purchase",
  sold: "AXTO has been sold at auction.",
  nextRound: "A new round opens shortly.",
  checkoutWinnerOnly: "The checkout opens for the winning bidder when the round ends. Until then, place your bid above.",

  steps: [
    ["Register as a bidder", "Create or sign in to the account that will own AXTO, then register; the owner verifies bidders."],
    ["Win the auction", "Bid before the clock stops. The highest bid wins — there is no hidden reserve."],
    ["Pay and take over", "Pay the winning bid; administrator access is granted the moment the payment is verified."],
  ] as [string, string][],

  homeTitle: "AXTO is for sale — live auction",
  homeCurrent: "Current bid {amount}",
  homeOpening: "Opening bid {amount}",
  homeCta: "Bid now",
};

export type SaleAucCopy = typeof SALE_AUC_EN;
