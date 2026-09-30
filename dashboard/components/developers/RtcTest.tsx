/* AXTO — Developers → WebRTC test: two devices join a room; signalling over the event log
 * (POST /api/v1/events + SSE), media and chat go peer to peer (RTCPeerConnection). */
"use client";
import { useEffect, useRef, useState } from "react";
import type { DevelopersDict } from "@/lib/i18n-pages/developers";
import { Alert } from "@/components/ui";
import { badge } from "./shared";

type Status = "idle" | "waiting" | "connecting" | "connected" | "failed";

export default function RtcTest({ t }: { t: DevelopersDict }) {
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [turn, setTurn] = useState<boolean | null>(null);
  const [media, setMedia] = useState(false);
  const [chat, setChat] = useState<{ who: "you" | "peer"; text: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const es = useRef<EventSource | null>(null);
  const me = useRef(Math.random().toString(36).slice(2, 10));
  const localV = useRef<HTMLVideoElement>(null);
  const remoteV = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => { const r = new URLSearchParams(window.location.search).get("room"); if (r) setRoom(r); return () => leave(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signal = (type: string, data: unknown) => fetch("/api/v1/events", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel: `rtc.${room}`, type, data: { from: me.current, ...(data as object) } }) });

  function wireChannel(ch: RTCDataChannel) {
    dc.current = ch;
    ch.onmessage = (e) => setChat((c) => [...c, { who: "peer", text: String(e.data) }]);
    ch.onopen = () => setStatus("connected");
  }

  async function newRoom() {
    setErr("");
    const r = await fetch("/api/v1/rtc/rooms", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
    const j = await r.json();
    if (!r.ok) { setErr(j?.error?.message || `HTTP ${r.status}`); return; }
    setRoom(j.room);
  }

  async function join() {
    if (!room) return;
    setErr(""); setChat([]);
    const r = await fetch("/api/v1/rtc/rooms", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room }) });
    const j = await r.json();
    if (!r.ok) { setErr(j?.error?.message || `HTTP ${r.status}`); return; }
    setTurn(!!j.turn);
    const peer = new RTCPeerConnection({ iceServers: j.iceServers });
    pc.current = peer;
    if (media) {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.current.getTracks().forEach((tr) => peer.addTrack(tr, stream.current!));
        if (localV.current) localV.current.srcObject = stream.current;
      } catch (e: any) { setErr(String(e?.message || e)); }
    }
    peer.ontrack = (e) => { if (remoteV.current) remoteV.current.srcObject = e.streams[0]; };
    peer.ondatachannel = (e) => wireChannel(e.channel);
    peer.onicecandidate = (e) => { if (e.candidate) signal("candidate", { candidate: e.candidate.toJSON() }); };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === "connected") setStatus("connected");
      if (peer.connectionState === "failed") setStatus("failed");
    };
    setStatus("waiting");
    const src = new EventSource(`/api/v1/events/stream?channels=${encodeURIComponent(`rtc.${room}`)}&after=now`, { withCredentials: true });
    es.current = src;
    src.onopen = () => signal("join", {});
    src.onmessage = async (m) => {
      let ev: any; try { ev = JSON.parse(m.data); } catch { return; }
      const d = ev.data || {};
      if (d.from === me.current) return;
      try {
        if (ev.type === "join") {
          // The peer with the smaller id makes the offer, so exactly one side does.
          if (me.current < d.from && peer.signalingState === "stable" && !peer.remoteDescription) {
            setStatus("connecting");
            wireChannel(peer.createDataChannel("chat"));
            await peer.setLocalDescription(await peer.createOffer());
            await signal("offer", { sdp: peer.localDescription });
          } else if (me.current > d.from) await signal("join", {});
        } else if (ev.type === "offer" && d.sdp) {
          setStatus("connecting");
          await peer.setRemoteDescription(d.sdp);
          await peer.setLocalDescription(await peer.createAnswer());
          await signal("answer", { sdp: peer.localDescription });
        } else if (ev.type === "answer" && d.sdp && peer.signalingState === "have-local-offer") {
          await peer.setRemoteDescription(d.sdp);
        } else if (ev.type === "candidate" && d.candidate) {
          await peer.addIceCandidate(d.candidate).catch(() => {});
        } else if (ev.type === "leave") {
          setStatus("waiting");
        }
      } catch (e: any) { setErr(String(e?.message || e)); }
    };
  }

  function leave() {
    try { if (room && pc.current) signal("leave", {}); } catch {}
    es.current?.close(); es.current = null;
    dc.current?.close(); dc.current = null;
    pc.current?.close(); pc.current = null;
    stream.current?.getTracks().forEach((tr) => tr.stop()); stream.current = null;
    setStatus("idle");
  }

  function send() {
    const text = msg.trim();
    if (!text || dc.current?.readyState !== "open") return;
    dc.current.send(text);
    setChat((c) => [...c, { who: "you", text }]);
    setMsg("");
  }

  const tone: Record<Status, string> = { idle: "bg-slate-100 text-slate-600", waiting: "bg-amber-100 text-amber-900", connecting: "bg-sky-100 text-sky-800", connected: "bg-emerald-100 text-emerald-800", failed: "bg-rose-100 text-rose-800" };
  return (
    <section className="card-pad" data-testid="dev-rtc">
      <p className="mb-4 max-w-3xl text-sm text-slate-600">{t.rtc.intro}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1"><span className="label">{t.rtc.room}</span><input className="input font-mono" value={room} onChange={(e) => setRoom(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))} disabled={status !== "idle"} data-testid="rtc-room" /></label>
        {status === "idle" ? (
          <>
            <button type="button" className="btn-secondary" onClick={newRoom} data-testid="rtc-new">＋ {t.rtc.create}</button>
            <button type="button" className="btn-primary" onClick={join} disabled={room.length < 4} data-testid="rtc-join">{t.rtc.join}</button>
          </>
        ) : <button type="button" className="btn-secondary" onClick={leave}>{t.rtc.leave}</button>}
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={media} disabled={status !== "idle"} onChange={(e) => setMedia(e.target.checked)} /> {t.rtc.camera}</label>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`${badge} ${tone[status]}`} data-testid="rtc-status">{t.rtc.status[status]}</span>
        {turn !== null ? <span className={`${badge} bg-slate-100 text-slate-600`}>{turn ? t.rtc.turn : t.rtc.noTurn}</span> : null}
      </div>
      {err ? <div className="mt-3"><Alert tone="error">{err}</Alert></div> : null}
      {media ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <video ref={localV} autoPlay playsInline muted className="aspect-video w-full rounded-lg bg-ink-900" />
          <video ref={remoteV} autoPlay playsInline className="aspect-video w-full rounded-lg bg-ink-900" />
        </div>
      ) : null}
      <div className="mt-4 rounded-xl border border-slate-200 p-3">
        <ul className="max-h-56 space-y-1 overflow-y-auto text-sm" data-testid="rtc-chat">
          {chat.map((c, i) => <li key={i} className={c.who === "you" ? "text-right" : ""}><span className={`inline-block rounded-lg px-2 py-1 ${c.who === "you" ? "bg-brand-600 text-white" : "bg-slate-100"}`}>{c.text}</span></li>)}
        </ul>
        <div className="mt-2 flex gap-2">
          <input className="input min-w-0 flex-1" value={msg} placeholder={t.rtc.message} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} disabled={status !== "connected"} data-testid="rtc-msg" />
          <button type="button" className="btn-primary" onClick={send} disabled={status !== "connected"} data-testid="rtc-send">{t.rtc.send}</button>
        </div>
      </div>
    </section>
  );
}
