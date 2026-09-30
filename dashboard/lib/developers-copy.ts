/* Public /developers page copy — English and Indonesian (other languages see English). */
export type DevLang = "en" | "id";

export const DEVCOPY = {
  en: {
    eyebrow: "AXTO Connect · developer API",
    title: "Connect any website, app or AI agent to AXTO — live",
    lead: "One realtime layer for everything you build around AXTO: publish events from your backend and see them in every browser within a second, stream AI answers from your own model keys, place peer-to-peer calls, and give AI agents direct tools — over the transport that fits each client.",
    ctaKeys: "Get an API key",
    ctaPricing: "Plans & limits",
    transportsTitle: "Every way to connect",
    th: ["Transport", "Best for", "Endpoint"],
    transports: [
      ["REST (HTTPS + JSON)", "Publish and list events, run AI, mint tokens", "POST /api/v1/events"],
      ["Server-Sent Events", "Live feeds in the browser; auto-reconnect and resume with Last-Event-ID", "GET /api/v1/events/stream"],
      ["WebSocket", "Two-way apps: chat, collaboration, dashboards", "GET /api/v1/ws"],
      ["Long polling", "Networks that block streaming; answers the moment an event arrives", "GET /api/v1/events/poll"],
      ["HTTP/2 & HTTP/3 streaming", "AI answers token by token as NDJSON or SSE", "POST /api/v1/ai/run"],
      ["Connect protocol (gRPC-compatible)", "Typed clients from a .proto: connect-es, connect-go, Swift, Kotlin", "POST /api/v1/connect/…"],
      ["WebRTC", "Peer-to-peer audio, video and data; AXTO signals and provides STUN / TURN", "POST /api/v1/rtc/rooms"],
      ["Webhooks", "Your server reacts to events; HMAC-SHA256 signed, retried for 24 h", "Developers → Webhooks"],
      ["MCP (Model Context Protocol)", "AI agents — Claude Desktop, Cursor, VS Code — use AXTO tools", "POST /api/v1/mcp"],
    ] as [string, string, string][],
    honestTitle: "What we do not claim",
    honest: [
      "WebTransport is not offered: Cloudflare's edge, where AXTO runs, does not support it yet. The SDK falls back to WebSocket, then Server-Sent Events, then long polling.",
      "Native gRPC needs HTTP/2 trailers that an edge runtime cannot send, so AXTO speaks the Connect protocol — gRPC-compatible, generated from the same .proto — instead.",
      "WebRTC media flows directly between devices. On very strict networks a TURN relay is needed; it is available when the operator has configured one.",
    ],
    startTitle: "Quick start",
    securityTitle: "Security by design",
    security: [
      ["Keys stored as fingerprints", "A key is shown once; AXTO keeps only its SHA-256 digest. Revoke it and it stops at once."],
      ["Scopes and allowed origins", "Each key can run AI, read or publish events, open WebRTC rooms and call MCP tools — only what you tick. Browser calls work only from origins you list."],
      ["Short-lived stream tokens", "Mint on your server, hand to the browser: channel-scoped, expiring, and never your secret key in a URL."],
      ["Encrypted events, short retention", "Event payloads are encrypted with your account's key and deleted after the retention period (7 days by default)."],
      ["Signed webhooks, no SSRF", "HTTPS public hosts only, no redirects followed, HMAC-SHA256 signature with a timestamp."],
      ["Your AI, your keys", "AI calls run on the model keys you saved in AXTO; AXTO relays them and stores nothing."],
    ] as [string, string][],
    limitsTitle: "Included in every paid plan",
    limitsTh: ["Plan", "API keys", "Requests / min", "Webhooks"],
    faqTitle: "Questions",
    faq: [
      ["Which transport should I use?", "Browsers: Server-Sent Events for feeds, WebSocket when the page also sends. Servers: REST to publish, webhooks to react. Unreliable networks: long polling. AI answers: NDJSON streaming. Typed services: the Connect protocol. The SDK picks WebSocket → SSE → long polling for you."],
      ["Can a browser use my API key?", "No — keep the secret key on your server. Your server mints a short-lived stream token (POST /api/v1/tokens) for the channels the page needs, and the browser uses that."],
      ["Do I miss events if the connection drops?", "No. Every event has an increasing id; SSE resumes with Last-Event-ID, WebSocket and long polling with the last cursor, within the retention period."],
      ["Is it gRPC?", "It is the Connect protocol, which is gRPC-compatible and generated from the same .proto (download it at /api/v1/axto.proto). Native gRPC over HTTP/2 trailers is not possible on an edge runtime."],
      ["How do AI agents connect?", "Add https://axto.io/api/v1/mcp as a remote MCP server with your API key. Agents get tools for your AI, legal deadlines, citations, redlines, privacy scans, the prompt library and realtime events."],
      ["What does it cost?", "The developer API is included in every paid plan; the plan sets the number of keys, requests per minute and webhooks. AI usage runs on your own keys."],
    ] as [string, string][],
  },
  id: {
    eyebrow: "AXTO Connect · API developer",
    title: "Hubungkan website, aplikasi, atau agen AI apa pun ke AXTO — secara live",
    lead: "Satu lapisan realtime untuk semua yang Anda bangun di sekitar AXTO: kirim event dari backend Anda dan lihat di setiap browser dalam hitungan detik, alirkan jawaban AI dari kunci model Anda sendiri, lakukan panggilan peer-to-peer, dan beri agen AI akses langsung ke alat AXTO — lewat transport yang paling cocok untuk setiap klien.",
    ctaKeys: "Dapatkan kunci API",
    ctaPricing: "Paket & batas",
    transportsTitle: "Semua cara terhubung",
    th: ["Transport", "Paling cocok untuk", "Endpoint"],
    transports: [
      ["REST (HTTPS + JSON)", "Kirim dan baca event, jalankan AI, buat token", "POST /api/v1/events"],
      ["Server-Sent Events", "Feed live di browser; sambung ulang otomatis dan lanjut dengan Last-Event-ID", "GET /api/v1/events/stream"],
      ["WebSocket", "Aplikasi dua arah: chat, kolaborasi, dasbor", "GET /api/v1/ws"],
      ["Long polling", "Jaringan yang memblokir streaming; menjawab begitu event tiba", "GET /api/v1/events/poll"],
      ["Streaming HTTP/2 & HTTP/3", "Jawaban AI token demi token sebagai NDJSON atau SSE", "POST /api/v1/ai/run"],
      ["Protokol Connect (kompatibel gRPC)", "Klien bertipe dari .proto: connect-es, connect-go, Swift, Kotlin", "POST /api/v1/connect/…"],
      ["WebRTC", "Audio, video, dan data peer-to-peer; AXTO mengurus signaling serta STUN / TURN", "POST /api/v1/rtc/rooms"],
      ["Webhook", "Server Anda bereaksi pada event; ditandatangani HMAC-SHA256, dicoba ulang selama 24 jam", "Developer → Webhook"],
      ["MCP (Model Context Protocol)", "Agen AI — Claude Desktop, Cursor, VS Code — memakai alat AXTO", "POST /api/v1/mcp"],
    ] as [string, string, string][],
    honestTitle: "Yang tidak kami klaim",
    honest: [
      "WebTransport belum tersedia: edge Cloudflare, tempat AXTO berjalan, belum mendukungnya. SDK otomatis beralih ke WebSocket, lalu Server-Sent Events, lalu long polling.",
      "gRPC native membutuhkan HTTP/2 trailer yang tidak bisa dikirim runtime edge, jadi AXTO memakai protokol Connect — kompatibel gRPC dan dibuat dari .proto yang sama.",
      "Media WebRTC mengalir langsung antar-perangkat. Di jaringan yang sangat ketat diperlukan relay TURN; tersedia bila operator sudah mengaturnya.",
    ],
    startTitle: "Mulai cepat",
    securityTitle: "Aman sejak rancangan",
    security: [
      ["Kunci disimpan sebagai sidik jari", "Kunci hanya ditampilkan sekali; AXTO hanya menyimpan digest SHA-256. Cabut kunci dan ia langsung berhenti."],
      ["Izin dan origin yang diizinkan", "Setiap kunci bisa menjalankan AI, membaca atau mengirim event, membuka room WebRTC, dan memanggil alat MCP — hanya yang Anda centang. Panggilan dari browser hanya dari origin yang Anda daftarkan."],
      ["Token stream berumur pendek", "Dibuat di server Anda lalu diberikan ke browser: terbatas pada kanal tertentu, kedaluwarsa, dan kunci rahasia tidak pernah muncul di URL."],
      ["Event terenkripsi, retensi singkat", "Isi event dienkripsi dengan kunci akun Anda dan dihapus setelah masa retensi (bawaan 7 hari)."],
      ["Webhook bertanda tangan, tanpa SSRF", "Hanya host publik HTTPS, tanpa mengikuti redirect, tanda tangan HMAC-SHA256 dengan stempel waktu."],
      ["AI Anda, kunci Anda", "Panggilan AI memakai kunci model yang Anda simpan di AXTO; AXTO hanya meneruskan dan tidak menyimpan apa pun."],
    ] as [string, string][],
    limitsTitle: "Termasuk di setiap paket berbayar",
    limitsTh: ["Paket", "Kunci API", "Permintaan / menit", "Webhook"],
    faqTitle: "Pertanyaan",
    faq: [
      ["Transport mana yang sebaiknya saya pakai?", "Browser: Server-Sent Events untuk feed, WebSocket bila halaman juga mengirim. Server: REST untuk mengirim, webhook untuk bereaksi. Jaringan tidak stabil: long polling. Jawaban AI: streaming NDJSON. Layanan bertipe: protokol Connect. SDK memilih WebSocket → SSE → long polling untuk Anda."],
      ["Bolehkah browser memakai kunci API saya?", "Tidak — simpan kunci rahasia di server Anda. Server Anda membuat token stream berumur pendek (POST /api/v1/tokens) untuk kanal yang dibutuhkan halaman, dan browser memakai token itu."],
      ["Apakah event hilang bila koneksi terputus?", "Tidak. Setiap event memiliki id yang terus naik; SSE melanjutkan dengan Last-Event-ID, WebSocket dan long polling dengan kursor terakhir, selama masa retensi."],
      ["Apakah ini gRPC?", "Ini protokol Connect, yang kompatibel dengan gRPC dan dibuat dari .proto yang sama (unduh di /api/v1/axto.proto). gRPC native lewat HTTP/2 trailer tidak mungkin di runtime edge."],
      ["Bagaimana agen AI terhubung?", "Tambahkan https://axto.io/api/v1/mcp sebagai server MCP remote dengan kunci API Anda. Agen mendapat alat untuk AI Anda, tenggat hukum, sitasi, redline, pemindaian privasi, pustaka prompt, dan event realtime."],
      ["Berapa biayanya?", "API developer termasuk di setiap paket berbayar; paket menentukan jumlah kunci, permintaan per menit, dan webhook. Pemakaian AI memakai kunci Anda sendiri."],
    ] as [string, string][],
  },
};

export const DEV_SNIPPET = (base: string) => `# Publish from your server
curl -X POST ${base}/api/v1/events \\
  -H "Authorization: Bearer $AXTO_KEY" -H "Content-Type: application/json" \\
  -d '{"channel":"orders","type":"order.paid","data":{"id":42}}'

// Receive in the browser (token minted by your server with POST /api/v1/tokens)
import { AxtoConnect } from "${base}/sdk/axto-connect.js";
new AxtoConnect({ token }).subscribe(["orders*"], (event) => render(event));

# Stream an AI answer on your own model key (NDJSON over HTTP/2)
curl -N ${base}/api/v1/ai/run -H "Authorization: Bearer $AXTO_KEY" \\
  -H "Accept: application/x-ndjson" -H "Content-Type: application/json" -d '{"prompt":"Hello"}'`;
