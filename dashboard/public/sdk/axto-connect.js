/*! AXTO Connect SDK v1 — https://axto.io/developers
 *  Realtime for browsers and Node 18+: WebSocket → Server-Sent Events → long polling,
 *  chosen automatically, resuming from the last event id after every drop.
 *
 *  import { AxtoConnect } from "https://axto.io/sdk/axto-connect.js";
 *  const axto = new AxtoConnect({ token });          // browser: a stream token from YOUR server
 *  const axto = new AxtoConnect({ apiKey });         // server: the secret key (never in a browser)
 *  const sub = axto.subscribe(["orders*"], (event) => …, { transport: "auto" });  sub.close();
 *  await axto.publish("orders", { id: 42 }, "order.paid");
 *  for await (const chunk of axto.ai.stream({ prompt: "Hello" })) process.stdout.write(chunk);
 *  const call = await axto.rtc.join(room, { stream, onTrack, onMessage });  call.send("hi");
 */
export class AxtoConnect {
  constructor({ token = "", apiKey = "", baseUrl = "https://axto.io" } = {}) {
    if (!token && !apiKey) throw new Error("AxtoConnect: pass a stream token (browser) or an API key (server).");
    this.base = baseUrl.replace(/\/+$/, "");
    this.token = token;
    this.apiKey = apiKey;
    this.ai = { stream: (o) => this.#aiStream(o), run: (o) => this.#aiRun(o) };
    this.rtc = { join: (room, o) => this.#rtcJoin(room, o), createRoom: () => this.#json("POST", "/api/v1/rtc/rooms", {}) };
  }

  #auth() { return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : { Authorization: `Bearer ${this.token}` }; }
  #q(params) { const u = new URLSearchParams(params); if (!this.apiKey && this.token) u.set("token", this.token); return u.toString(); }
  async #json(method, path, body) {
    const r = await fetch(this.base + path, { method, headers: { ...this.#auth(), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j?.error?.message || `HTTP ${r.status}`); e.status = r.status; e.code = j?.error?.code; throw e; }
    return j;
  }

  /** Publish an event on a channel. Resolves to the stored event (with its id). */
  async publish(channel, data, type = "message") { return (await this.#json("POST", "/api/v1/events", { channel, type, data })).event; }
  /** Events after a cursor (plain polling). */
  async list(channels = ["*"], after = 0, limit = 100) { return this.#json("GET", `/api/v1/events?${new URLSearchParams({ channels: channels.join(","), after: String(after), limit: String(limit) })}`); }
  async me() { return this.#json("GET", "/api/v1/me"); }

  /** Live subscription. transport: "auto" | "ws" | "sse" | "poll". Returns { close(), get cursor() }. */
  subscribe(channels, onEvent, { transport = "auto", after = "now", onStatus = () => {} } = {}) {
    const chans = Array.isArray(channels) ? channels : [channels];
    let cursor = after, closed = false, current = null, retry = 0;
    const order = transport === "auto" ? (typeof WebSocket !== "undefined" ? ["ws", "sse", "poll"] : ["poll"]) : [transport];
    const deliver = (e) => { if (typeof e?.id === "number") cursor = e.id; onEvent(e); };
    const next = (i) => {
      if (closed) return;
      const kind = order[Math.min(i, order.length - 1)];
      onStatus({ transport: kind, state: "connecting" });
      const fail = () => { if (closed) return; retry++; setTimeout(() => next(retry > 2 ? i + 1 : i), Math.min(10_000, 500 * 2 ** Math.min(retry, 5))); };
      const ok = () => { retry = 0; onStatus({ transport: kind, state: "open" }); };
      if (kind === "ws") current = this.#openWs(chans, () => cursor, deliver, ok, fail);
      else if (kind === "sse") current = this.#openSse(chans, () => cursor, deliver, ok, fail);
      else current = this.#openPoll(chans, () => cursor, (c) => (cursor = c), deliver, ok, fail);
    };
    next(0);
    return { close: () => { closed = true; current?.close(); onStatus({ state: "closed" }); }, get cursor() { return cursor; } };
  }

  #openWs(chans, cursor, deliver, ok, fail) {
    const url = `${this.base.replace(/^http/, "ws")}/api/v1/ws`;
    let ws;
    try { ws = new WebSocket(url, ["axto.v1", `axto.token.${this.apiKey || this.token}`]); } catch { fail(); return { close() {} }; }
    let done = false;
    ws.onopen = () => { ok(); const c = cursor(); ws.send(JSON.stringify({ op: "subscribe", channels: chans, ...(c !== "now" ? { after: c } : {}) })); };
    ws.onmessage = (m) => { try { const x = JSON.parse(m.data); if (x.op === "event") deliver(x.event); } catch {} };
    ws.onclose = () => { if (!done) fail(); };
    ws.onerror = () => {};
    const ping = setInterval(() => { try { ws.readyState === 1 && ws.send('{"op":"ping"}'); } catch {} }, 25_000);
    return { close() { done = true; clearInterval(ping); try { ws.close(); } catch {} } };
  }

  #openSse(chans, cursor, deliver, ok, fail) {
    if (typeof EventSource === "undefined") { fail(); return { close() {} }; }
    const c = cursor();
    const es = new EventSource(`${this.base}/api/v1/events/stream?${this.#q({ channels: chans.join(","), after: String(c) })}`);
    let done = false;
    es.onopen = ok;
    es.onmessage = (m) => { try { deliver(JSON.parse(m.data)); } catch {} };
    es.onerror = () => { if (es.readyState === 2 && !done) fail(); };   // CLOSED: fall back; CONNECTING: the browser retries itself
    return { close() { done = true; es.close(); } };
  }

  #openPoll(chans, cursor, setCursor, deliver, ok, fail) {
    let done = false, ctl = null;
    (async () => {
      ok();
      while (!done) {
        ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
        try {
          const r = await fetch(`${this.base}/api/v1/events/poll?${this.#q({ channels: chans.join(","), after: String(cursor()), wait: "25" })}`, { headers: this.apiKey ? this.#auth() : {}, signal: ctl?.signal });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = await r.json();
          j.events.forEach(deliver);
          setCursor(j.cursor);
        } catch { if (!done) { fail(); return; } }
      }
    })();
    return { close() { done = true; ctl?.abort(); } };
  }

  /** Stream an AI answer (NDJSON over HTTP/2 / HTTP/3). Yields text chunks. */
  async *#aiStream({ prompt, messages, app = "studio", task, provider, model, options } = {}) {
    const r = await fetch(`${this.base}/api/v1/ai/run`, { method: "POST", headers: { ...this.#auth(), "Content-Type": "application/json", Accept: "application/x-ndjson" }, body: JSON.stringify({ prompt, messages, app, task, provider, model, options }) });
    if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw new Error(j?.error?.message || `HTTP ${r.status}`); }
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        if (!line.trim()) continue;
        const m = JSON.parse(line);
        if (m.type === "delta") yield m.text;
        else if (m.type === "error") throw new Error(m.message);
      }
    }
  }
  async #aiRun(o) { let s = ""; for await (const c of this.#aiStream(o)) s += c; return s; }

  /** Join a WebRTC room: signalling over AXTO events, media and data peer to peer. Browser only. */
  async #rtcJoin(room, { stream = null, onTrack = () => {}, onMessage = () => {}, onState = () => {} } = {}) {
    const info = await this.#json("POST", "/api/v1/rtc/rooms", { room });
    const channel = info.channel, me = Math.random().toString(36).slice(2, 10);
    const pc = new RTCPeerConnection({ iceServers: info.iceServers });
    let dc = null;
    const wire = (c) => { dc = c; c.onmessage = (e) => onMessage(e.data); };
    stream?.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => onTrack(e.streams[0]);
    pc.ondatachannel = (e) => wire(e.channel);
    pc.onconnectionstatechange = () => onState(pc.connectionState);
    const signal = (type, data = {}) => this.publish(channel, { from: me, ...data }, type);
    pc.onicecandidate = (e) => { if (e.candidate) signal("candidate", { candidate: e.candidate.toJSON() }); };
    const sub = this.subscribe([channel], async (ev) => {
      const d = ev.data || {};
      if (d.from === me) return;
      if (ev.type === "join") {
        if (me < d.from && !pc.remoteDescription && pc.signalingState === "stable") { wire(pc.createDataChannel("chat")); await pc.setLocalDescription(await pc.createOffer()); await signal("offer", { sdp: pc.localDescription }); }
        else if (me > d.from) await signal("join");
      } else if (ev.type === "offer") { await pc.setRemoteDescription(d.sdp); await pc.setLocalDescription(await pc.createAnswer()); await signal("answer", { sdp: pc.localDescription }); }
      else if (ev.type === "answer" && pc.signalingState === "have-local-offer") await pc.setRemoteDescription(d.sdp);
      else if (ev.type === "candidate") await pc.addIceCandidate(d.candidate).catch(() => {});
    }, { transport: "auto" });
    setTimeout(() => signal("join"), 400);
    return { pc, room: info.room, send: (text) => dc?.readyState === "open" && dc.send(text), leave: () => { signal("leave").catch(() => {}); sub.close(); pc.close(); } };
  }
}
export default AxtoConnect;
