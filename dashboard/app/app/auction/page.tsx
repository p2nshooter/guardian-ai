/* Member: Licence auction (§26.5). A signed-in member chooses the name shown on
 * a win — no e-mailed code (§27.7) — then bids on this auction's lots, follows their own
 * bids, and pay a win within the payment window through the normal checkout
 * ({kind:"auction"}) — the licence then activates by itself. In all 10
 * languages (lib/i18n-pages/auction.ts). */
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Alert, EmptyState, LoadingBlock, Modal, PageHeader, Section, Spinner } from "@/components/ui";
import PayPanel, { payFromCheckout, type Pay } from "@/components/app/PayPanel";
import { Countdown, LotCard, LotFilters, WinnersList, fill, useAucCopy, useLotFilter, type Board, type Lot } from "@/components/site/auction-ui";
import { editionGatewayAllowed } from "@/lib/editions";
import { gatewayAllowed } from "@/lib/lifetime";

type MyLot = Lot & { myBestUsd: number; leading: boolean };
type Win = Lot & { payBy: string; orderId: string };
interface Data extends Omit<Board, "lots"> {
  bidder: { verified: boolean; admin: boolean; displayName: string; email: string };
  lots: MyLot[]; myBids: MyLot[]; wins: Win[];
}
interface Gateway { id: string; label: string; methods: string; currency: string; test?: boolean }
type Msg = { tone: "success" | "error" | "info"; text: string } | null;

export default function AuctionMemberPage() {
  const { t: tt, money, when } = useAucCopy();
  const t = tt.me;
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState("");
  const [name, setName] = useState("");
  const [paying, setPaying] = useState<Win | null>(null);
  const f = useLotFilter<MyLot>(d?.lots || []);

  const load = useCallback(async () => {
    const r = await api<Data>("/api/account/auction");
    if (r.ok) { setD(r.data); setName((n) => n || r.data.bidder.displayName); } else setErr(r.error);
  }, []);
  useEffect(() => { load(); }, [load]);

  const errText = (data: any) => {
    const c = String(data?.code || "");
    return (t.errors as Record<string, string>)[c] || t.errors.other;
  };
  async function act(action: string, body: Record<string, unknown>, ok: (data: any) => string) {
    setBusy(action); setMsg(null);
    const r = await api<any>("/api/account/auction", { body: { action, ...body } });
    setBusy("");
    if (r.ok) { setMsg({ tone: "success", text: ok(r.data) }); await load(); return true; }
    setMsg({ tone: "error", text: errText(r.data) });
    return false;
  }

  if (err) return <Alert tone="error">{err}</Alert>;
  if (!d) return <LoadingBlock />;
  const vars = { open: `${d.openPct} %` };
  const b = d.bidder;

  return (
    <>
      <PageHeader eyebrow="AXTO" title={t.title} description={fill(t.lead, vars)}
        actions={d.enabled && d.cycleEnd ? <div className="text-right text-sm text-slate-500"><div className="mb-1">{tt.endsIn}</div><Countdown to={d.cycleEnd} /></div> : undefined} />
      {msg ? <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div> : null}

      {/* Wins to pay, first — they have a deadline. */}
      {d.wins.length ? (
        <div className="mb-6">
          <Section title={t.winsT}>
            <ul className="divide-y divide-slate-100" data-testid="auction-wins">
              {d.wins.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span><b className="text-slate-900">🏆 {w.title}</b>
                    <span className="block text-sm text-slate-600">{money(w.winnerUsd)} · {w.status === "sold" ? t.paid : <><b className="text-amber-700" data-testid="win-unpaid">{tt.unpaid}</b> · {fill(t.payBy, { date: when(w.payBy) })}</>}</span>
                    {w.status === "sold" ? <span className="block text-xs text-slate-500">{t.paidHint} <Link href={w.kind === "lifetime" ? "/app/lifetime" : "/app/self-hosted"}>→</Link></span> : null}
                  </span>
                  {w.status === "awaiting_payment" ? <button className="btn-primary" onClick={() => setPaying(w)} data-testid="auction-pay">{fill(t.pay, { amount: money(w.winnerUsd) })}</button> : <span className="badge-green">✓</span>}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : null}

      {/* A signed-in member bids once they have chosen the name shown on a win (owner, 27 Oct 2026: no e-mailed
          code). Admins run the auction and do not bid. */}
      <div className="mb-6">
        {b.admin ? (
          <Alert tone="info"><span data-testid="auction-admin-note">{t.adminNote}</span></Alert>
        ) : (
          <Section title={b.verified ? `✓ ${t.verified} · ${b.displayName}` : t.nameT} description={t.nameB}>
            <div className="flex flex-wrap gap-2">
              <input className="input min-w-0 flex-1" maxLength={48} value={name} onChange={(e) => setName(e.target.value)} aria-label={t.nameLabel} placeholder={t.nameLabel} data-testid="auction-name" />
              <button className={b.verified ? "btn-secondary" : "btn-primary"} disabled={!name.trim() || !!busy} onClick={() => act("name", { displayName: name }, () => t.nameSaved)} data-testid="auction-name-save">{busy === "name" ? <Spinner /> : null} {t.saveName}</button>
            </div>
          </Section>
        )}
      </div>

      {/* This auction's lots: every package. */}
      {d.upcoming ? <p className="mb-3 text-sm font-semibold text-slate-600" data-testid="auction-next-ready">{fill(tt.nextReady, { n: d.upcoming })}</p> : null}
      {d.lots.length ? <LotFilters f={f} total={d.lots.length} /> : null}
      {d.lots.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {f.shown.map((l) => {
            const ready = b.verified && !b.admin;
            const capped = l.bidsCount > 0 && l.highUsd >= l.normalUsd;
            return (
              <LotCard key={l.id} lot={l} highlight={l.leading ? "lead" : undefined}>
                {l.leading ? <p className="mb-2 text-sm font-bold text-brand-700" data-testid="auction-leading">★ {t.leading}</p>
                  : l.myBestUsd ? <p className="mb-2 text-sm font-semibold text-amber-700">{fill(t.outbid, { amount: money(l.myBestUsd) })}</p> : null}
                {/* Every bid is exactly the next price (owner: each bid +10 % of the opening bid) — one button, no amount to type. */}
                {l.status === "open" && !l.leading && !capped ? (
                  <button className="btn-primary w-full justify-center" disabled={!ready || !!busy} data-testid="auction-bid"
                    onClick={() => act("bid", { lot: l.id, amount: l.nextMinUsd }, (r) => `${fill(t.placed, { amount: money(r.highUsd) })}${r.extended ? ` ${fill(t.extendedNote, { date: when(r.endsAt) })}` : ""}`)}>
                    {busy === "bid" ? <Spinner /> : null} {fill(t.bidAt, { amount: money(l.nextMinUsd) })}
                  </button>
                ) : null}
                {l.status === "open" && !capped ? <p className="mt-1.5 text-xs text-slate-500">{fill(t.minHint, { amount: money(l.nextMinUsd) })}</p> : null}
              </LotCard>
            );
          })}
        </div>
      ) : <EmptyState icon="🔨" title={d.enabled ? tt.emptyT : tt.offT}><span>{d.enabled ? tt.emptyB : tt.offB}</span></EmptyState>}

      {/* Recent winners and the name each chose (owner: winners in the member portal too). */}
      <div className="mt-8">
        <Section title={`🏆 ${tt.winnersTitle}`} description={tt.winnersLead}><WinnersList winners={d.winners} /></Section>
      </div>

      {/* Everything this member bid on. */}
      <div className="mt-8">
        <Section title={t.myBidsT}>
          {d.myBids.length ? (
            <ul className="divide-y divide-slate-100 text-sm" data-testid="auction-my-bids">
              {d.myBids.map((l) => (
                <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span className="text-slate-800">{l.title}</span>
                  <span className={l.leading ? "font-bold text-brand-700" : "text-slate-600"}>{money(l.myBestUsd)}{l.leading ? ` · ★ ${t.leading}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">{t.noBids}</p>}
        </Section>
      </div>

      <PayWin win={paying} onClose={() => setPaying(null)} onPaid={() => { setPaying(null); load(); }} />
    </>
  );
}

/** Pay a win: the methods that can carry the amount, then the normal checkout at the winning bid. */
function PayWin({ win, onClose, onPaid }: { win: Win | null; onClose: () => void; onPaid: () => void }) {
  const { t: tt, money } = useAucCopy();
  const t = tt.me;
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [gateway, setGateway] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pay, setPay] = useState<Pay | null>(null);
  useEffect(() => { if (win) { setPay(null); setErr(""); } }, [win]);
  useEffect(() => { if (win && !gateways.length) api<{ gateways: Gateway[] }>("/api/billing/options").then((r) => { if (r.ok) setGateways(r.data.gateways); }); }, [win, gateways.length]);
  const amount = win?.winnerUsd || 0;
  const methods = useMemo(() => gateways.filter((g) => (win?.kind === "lifetime" ? gatewayAllowed(g.id, amount) : editionGatewayAllowed(g.id, amount))), [gateways, amount, win?.kind]);
  useEffect(() => { if (!methods.some((m) => m.id === gateway)) setGateway(methods[0]?.id || ""); }, [methods, gateway]);

  async function checkout() {
    if (!win) return;
    setBusy(true); setErr("");
    const r = await api<any>("/api/billing/checkout", { body: { kind: "auction", lot: win.id, gateway } });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (r.data.url) { window.location.href = r.data.url; return; }
    setPay(payFromCheckout(r.data));
  }

  return (
    <Modal open={!!win} onClose={onClose} title={t.payTitle}
      footer={pay ? <button className="btn-ghost" onClick={onClose}>{t.close}</button> : (
        <>
          <button className="btn-ghost" onClick={onClose}>{t.close}</button>
          <button className="btn-primary" onClick={checkout} disabled={busy || !gateway} data-testid="auction-checkout">{busy ? <Spinner /> : null} {fill(t.pay, { amount: money(amount) })} →</button>
        </>
      )}>
      {pay ? <PayPanel pay={pay} onBack={() => setPay(null)} onPaid={onPaid} paidText={t.paidText} requireReceipt /> : win ? (
        <div className="space-y-4">
          <p className="font-semibold text-slate-900">{win.title}</p>
          <Alert tone="info">{t.receiptNote}</Alert>
          <div>
            <div className="text-sm font-semibold text-slate-900">{t.payMethod}</div>
            {methods.length ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {methods.map((g) => (
                  <label key={g.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${gateway === g.id ? "border-brand-500 bg-brand-50/50 ring-1 ring-brand-500" : "border-slate-200"}`}>
                    <input type="radio" name="auc-gw" className="mt-1" checked={gateway === g.id} onChange={() => setGateway(g.id)} />
                    <span><span className="block font-semibold text-slate-900">{g.label}</span><span className="block text-xs text-slate-500">{g.methods}</span>{g.test ? <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">TEST</span> : null}</span>
                  </label>
                ))}
              </div>
            ) : <div className="mt-2"><Alert tone="warn">{t.noMethods}</Alert></div>}
          </div>
          {err ? <Alert tone="error">{err}</Alert> : null}
        </div>
      ) : null}
    </Modal>
  );
}
