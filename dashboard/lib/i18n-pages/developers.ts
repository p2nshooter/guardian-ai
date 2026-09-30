/* AXTO — Developers (AXTO Connect) member screens in 10 languages. */
import type { Lang } from "../i18n-shared";

const en = {
  title: "Developers",
  sub: "Connect other websites, apps and AI agents to AXTO in real time — REST, SSE, WebSocket, long polling, streaming, gRPC-compatible Connect, WebRTC, webhooks and MCP.",
  tabs: { overview: "Overview", keys: "API keys", webhooks: "Webhooks", console: "Live console", rtc: "WebRTC test" },
  needPlan: "The developer API is included from the Starter plan.",
  upgrade: "See plans",
  off: "The developer API is switched off by the operator at the moment.",
  limits: "Your plan: {keys} API keys · {rpm} requests per minute · {hooks} webhooks",
  usage: "{n} events in the last 24 hours",
  retention: "Events are kept for {days} days, encrypted with your account's key.",
  docs: "Full documentation",
  openapi: "OpenAPI",
  proto: "gRPC .proto",
  transports: "Transports",
  transportList: [
    ["REST", "Publish and list events, run AI, mint tokens — JSON over HTTPS."],
    ["Server-Sent Events", "One-way live stream; the browser reconnects and resumes by itself (Last-Event-ID)."],
    ["WebSocket", "Two-way: subscribe and publish on one connection."],
    ["Long polling", "Works through any proxy or firewall; answers as soon as an event arrives."],
    ["HTTP/2 & HTTP/3 streaming", "AI answers as NDJSON or SSE while they are generated."],
    ["Connect (gRPC-compatible)", "Unary and server-streaming RPCs for connect-es, connect-go, Swift and Kotlin."],
    ["WebRTC", "Peer-to-peer audio, video and data; AXTO does the signalling and gives STUN / TURN."],
    ["Webhooks", "Signed HTTPS callbacks to your server, retried for 24 hours."],
    ["MCP", "AI agents (Claude Desktop, Cursor, VS Code…) use AXTO tools directly."],
  ],
  webtransport: "WebTransport is not offered: Cloudflare's edge does not support it yet. The SDK uses WebSocket, then SSE, then long polling instead.",
  quickstart: "Quick start",
  copy: "Copy",
  copied: "Copied ✓",
  keys: {
    new: "New API key",
    name: "Name",
    namePh: "e.g. Shop backend",
    scopes: "Permissions",
    scopeNames: { "ai:run": "Run AI", "events:read": "Read events", "events:write": "Publish events", rtc: "WebRTC rooms", mcp: "MCP tools" },
    origins: "Allowed browser origins (one per line)",
    originsHint: "Leave empty for server-side use only. Add https://your-site.com to call from that site's browser code, or * for any site.",
    create: "Create key",
    shownOnce: "Copy this key now — it is shown only once. AXTO keeps only a fingerprint of it.",
    none: "No API keys yet.",
    prefix: "Key",
    created: "Created",
    lastUsed: "Last used",
    never: "never",
    revoke: "Revoke",
    revoked: "Revoked",
    confirmRevoke: "Revoke this key? Apps using it stop working at once.",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    done: "Done",
  },
  hooks: {
    new: "New webhook",
    url: "Endpoint URL (https://…)",
    channels: "Channels (comma separated, * for all, orders.* for a prefix)",
    types: "Event types (comma separated, * for all)",
    create: "Add webhook",
    secretOnce: "Signing secret — copy it now; it is shown only once. Verify X-AXTO-Signature with it.",
    none: "No webhooks yet.",
    active: "Active",
    paused: "Paused",
    failures: "{n} failures in a row",
    lastStatus: "Last delivery: {status}",
    test: "Send test",
    testResult: "Test delivery: HTTP {status} in {ms} ms",
    rotate: "New secret",
    deliveries: "Deliveries",
    noDeliveries: "No deliveries yet.",
    del: "Delete",
    confirmDel: "Delete this webhook?",
    enable: "Switch on",
    disable: "Pause",
    attempt: "attempt {n}",
    retryAt: "retry {at}",
    verify: "How to verify a delivery",
  },
  console: {
    channels: "Channels",
    connect: "Connect",
    disconnect: "Disconnect",
    transport: "Transport",
    live: "Live · {n} events",
    idle: "Not connected",
    publish: "Publish an event",
    channel: "Channel",
    type: "Type",
    data: "Data (JSON)",
    send: "Publish",
    badJson: "Data must be valid JSON.",
    empty: "Events appear here as they arrive.",
    clear: "Clear",
  },
  rtc: {
    intro: "Open this page on two devices (or two tabs), join the same room and talk peer to peer. Media goes directly between the devices.",
    room: "Room",
    create: "New room",
    join: "Join",
    leave: "Leave",
    camera: "Use camera & microphone",
    status: { idle: "Not joined", waiting: "Waiting for the other peer…", connecting: "Connecting…", connected: "Connected peer to peer", failed: "Could not connect (a TURN server may be needed on this network)" },
    message: "Message",
    send: "Send",
    turn: "TURN relay available",
    noTurn: "STUN only (works on most networks)",
    you: "You",
    peer: "Peer",
  },
  errors: { generic: "Something went wrong: {msg}" },
};

export type DevelopersDict = typeof en;

export const DEV: Record<Lang, DevelopersDict> = {
  en,
  id: {
    "title": "Developer",
    "sub": "Hubungkan website, aplikasi, dan agen AI lain ke AXTO secara realtime — REST, SSE, WebSocket, long polling, streaming, Connect kompatibel gRPC, WebRTC, webhook, dan MCP.",
    "tabs": {
      "overview": "Ringkasan",
      "keys": "Kunci API",
      "webhooks": "Webhook",
      "console": "Konsol live",
      "rtc": "Uji WebRTC"
    },
    "needPlan": "API developer tersedia mulai paket Starter.",
    "upgrade": "Lihat paket",
    "off": "API developer sedang dimatikan oleh operator.",
    "limits": "Paket Anda: {keys} kunci API · {rpm} permintaan per menit · {hooks} webhook",
    "usage": "{n} event dalam 24 jam terakhir",
    "retention": "Event disimpan selama {days} hari, dienkripsi dengan kunci akun Anda.",
    "docs": "Dokumentasi lengkap",
    "openapi": "OpenAPI",
    "proto": ".proto gRPC",
    "transports": "Transport",
    "transportList": [
      [
        "REST",
        "Kirim dan baca event, jalankan AI, buat token — JSON lewat HTTPS."
      ],
      [
        "Server-Sent Events",
        "Stream live satu arah; browser menyambung ulang dan melanjutkan sendiri (Last-Event-ID)."
      ],
      [
        "WebSocket",
        "Dua arah: berlangganan dan mengirim lewat satu koneksi."
      ],
      [
        "Long polling",
        "Tembus proxy atau firewall apa pun; menjawab begitu event tiba."
      ],
      [
        "Streaming HTTP/2 & HTTP/3",
        "Jawaban AI sebagai NDJSON atau SSE selagi dibuat."
      ],
      [
        "Connect (kompatibel gRPC)",
        "RPC unary dan server-streaming untuk connect-es, connect-go, Swift, dan Kotlin."
      ],
      [
        "WebRTC",
        "Audio, video, dan data peer-to-peer; AXTO mengurus signaling dan memberi STUN / TURN."
      ],
      [
        "Webhook",
        "Callback HTTPS bertanda tangan ke server Anda, dicoba ulang selama 24 jam."
      ],
      [
        "MCP",
        "Agen AI (Claude Desktop, Cursor, VS Code…) memakai alat AXTO secara langsung."
      ]
    ],
    "webtransport": "WebTransport belum tersedia: edge Cloudflare belum mendukungnya. SDK memakai WebSocket, lalu SSE, lalu long polling sebagai gantinya.",
    "quickstart": "Mulai cepat",
    "copy": "Salin",
    "copied": "Tersalin ✓",
    "keys": {
      "new": "Kunci API baru",
      "name": "Nama",
      "namePh": "mis. Backend toko",
      "scopes": "Izin",
      "scopeNames": {
        "ai:run": "Jalankan AI",
        "events:read": "Baca event",
        "events:write": "Kirim event",
        "rtc": "Room WebRTC",
        "mcp": "Alat MCP"
      },
      "origins": "Origin browser yang diizinkan (satu per baris)",
      "originsHint": "Kosongkan untuk pemakaian di server saja. Tambahkan https://situs-anda.com untuk memanggil dari kode browser situs itu, atau * untuk situs mana pun.",
      "create": "Buat kunci",
      "shownOnce": "Salin kunci ini sekarang — hanya ditampilkan sekali. AXTO hanya menyimpan sidik jarinya.",
      "none": "Belum ada kunci API.",
      "prefix": "Kunci",
      "created": "Dibuat",
      "lastUsed": "Terakhir dipakai",
      "never": "belum pernah",
      "revoke": "Cabut",
      "revoked": "Dicabut",
      "confirmRevoke": "Cabut kunci ini? Aplikasi yang memakainya langsung berhenti bekerja.",
      "edit": "Ubah",
      "save": "Simpan",
      "cancel": "Batal",
      "done": "Selesai"
    },
    "hooks": {
      "new": "Webhook baru",
      "url": "URL endpoint (https://…)",
      "channels": "Kanal (pisahkan dengan koma, * untuk semua, orders.* untuk awalan)",
      "types": "Jenis event (pisahkan dengan koma, * untuk semua)",
      "create": "Tambah webhook",
      "secretOnce": "Rahasia penandatanganan — salin sekarang; hanya ditampilkan sekali. Verifikasi X-AXTO-Signature dengannya.",
      "none": "Belum ada webhook.",
      "active": "Aktif",
      "paused": "Dijeda",
      "failures": "{n} kali gagal berturut-turut",
      "lastStatus": "Pengiriman terakhir: {status}",
      "test": "Kirim uji",
      "testResult": "Pengiriman uji: HTTP {status} dalam {ms} ms",
      "rotate": "Rahasia baru",
      "deliveries": "Pengiriman",
      "noDeliveries": "Belum ada pengiriman.",
      "del": "Hapus",
      "confirmDel": "Hapus webhook ini?",
      "enable": "Aktifkan",
      "disable": "Jeda",
      "attempt": "percobaan {n}",
      "retryAt": "coba ulang {at}",
      "verify": "Cara memverifikasi pengiriman"
    },
    "console": {
      "channels": "Kanal",
      "connect": "Hubungkan",
      "disconnect": "Putuskan",
      "transport": "Transport",
      "live": "Live · {n} event",
      "idle": "Tidak terhubung",
      "publish": "Kirim event",
      "channel": "Kanal",
      "type": "Jenis",
      "data": "Data (JSON)",
      "send": "Kirim",
      "badJson": "Data harus JSON yang valid.",
      "empty": "Event muncul di sini begitu tiba.",
      "clear": "Bersihkan"
    },
    "rtc": {
      "intro": "Buka halaman ini di dua perangkat (atau dua tab), masuk ke room yang sama, dan bicara peer-to-peer. Media mengalir langsung antar-perangkat.",
      "room": "Room",
      "create": "Room baru",
      "join": "Masuk",
      "leave": "Keluar",
      "camera": "Pakai kamera & mikrofon",
      "status": {
        "idle": "Belum masuk",
        "waiting": "Menunggu peer lain…",
        "connecting": "Menghubungkan…",
        "connected": "Terhubung peer-to-peer",
        "failed": "Tidak bisa terhubung (jaringan ini mungkin butuh server TURN)"
      },
      "message": "Pesan",
      "send": "Kirim",
      "turn": "Relay TURN tersedia",
      "noTurn": "Hanya STUN (berfungsi di sebagian besar jaringan)",
      "you": "Anda",
      "peer": "Peer"
    },
    "errors": {
      "generic": "Terjadi kesalahan: {msg}"
    }
  },
  ms: {
    "title": "Pembangun",
    "sub": "Sambungkan laman web, aplikasi dan ejen AI lain kepada AXTO secara masa nyata — REST, SSE, WebSocket, long polling, penstriman, Connect serasi gRPC, WebRTC, webhook dan MCP.",
    "tabs": {
      "overview": "Gambaran",
      "keys": "Kunci API",
      "webhooks": "Webhook",
      "console": "Konsol langsung",
      "rtc": "Ujian WebRTC"
    },
    "needPlan": "API pembangun disertakan bermula pelan Starter.",
    "upgrade": "Lihat pelan",
    "off": "API pembangun sedang dimatikan oleh pengendali.",
    "limits": "Pelan anda: {keys} kunci API · {rpm} permintaan seminit · {hooks} webhook",
    "usage": "{n} acara dalam 24 jam lalu",
    "retention": "Acara disimpan selama {days} hari, disulitkan dengan kunci akaun anda.",
    "docs": "Dokumentasi penuh",
    "openapi": "OpenAPI",
    "proto": ".proto gRPC",
    "transports": "Pengangkutan",
    "transportList": [
      [
        "REST",
        "Terbit dan senaraikan acara, jalankan AI, jana token — JSON melalui HTTPS."
      ],
      [
        "Server-Sent Events",
        "Strim langsung sehala; pelayar menyambung semula dan menyambung sendiri (Last-Event-ID)."
      ],
      [
        "WebSocket",
        "Dua hala: langgan dan terbit dalam satu sambungan."
      ],
      [
        "Long polling",
        "Berfungsi melalui mana-mana proksi atau tembok api; menjawab sebaik acara tiba."
      ],
      [
        "Penstriman HTTP/2 & HTTP/3",
        "Jawapan AI sebagai NDJSON atau SSE semasa ia dijana."
      ],
      [
        "Connect (serasi gRPC)",
        "RPC unary dan server-streaming untuk connect-es, connect-go, Swift dan Kotlin."
      ],
      [
        "WebRTC",
        "Audio, video dan data rakan ke rakan; AXTO mengurus isyarat dan memberi STUN / TURN."
      ],
      [
        "Webhook",
        "Panggilan balik HTTPS bertandatangan ke pelayan anda, dicuba semula selama 24 jam."
      ],
      [
        "MCP",
        "Ejen AI (Claude Desktop, Cursor, VS Code…) menggunakan alat AXTO secara terus."
      ]
    ],
    "webtransport": "WebTransport tidak ditawarkan: edge Cloudflare belum menyokongnya. SDK menggunakan WebSocket, kemudian SSE, kemudian long polling sebagai ganti.",
    "quickstart": "Mula pantas",
    "copy": "Salin",
    "copied": "Disalin ✓",
    "keys": {
      "new": "Kunci API baharu",
      "name": "Nama",
      "namePh": "cth. Backend kedai",
      "scopes": "Kebenaran",
      "scopeNames": {
        "ai:run": "Jalankan AI",
        "events:read": "Baca acara",
        "events:write": "Terbit acara",
        "rtc": "Bilik WebRTC",
        "mcp": "Alat MCP"
      },
      "origins": "Asal pelayar yang dibenarkan (satu setiap baris)",
      "originsHint": "Biarkan kosong untuk kegunaan pelayan sahaja. Tambah https://laman-anda.com untuk memanggil daripada kod pelayar laman itu, atau * untuk mana-mana laman.",
      "create": "Cipta kunci",
      "shownOnce": "Salin kunci ini sekarang — ia hanya dipaparkan sekali. AXTO hanya menyimpan cap jarinya.",
      "none": "Belum ada kunci API.",
      "prefix": "Kunci",
      "created": "Dicipta",
      "lastUsed": "Terakhir digunakan",
      "never": "tidak pernah",
      "revoke": "Batalkan",
      "revoked": "Dibatalkan",
      "confirmRevoke": "Batalkan kunci ini? Aplikasi yang menggunakannya berhenti serta-merta.",
      "edit": "Sunting",
      "save": "Simpan",
      "cancel": "Batal",
      "done": "Selesai"
    },
    "hooks": {
      "new": "Webhook baharu",
      "url": "URL titik akhir (https://…)",
      "channels": "Saluran (dipisahkan koma, * untuk semua, orders.* untuk awalan)",
      "types": "Jenis acara (dipisahkan koma, * untuk semua)",
      "create": "Tambah webhook",
      "secretOnce": "Rahsia tandatangan — salin sekarang; ia hanya dipaparkan sekali. Sahkan X-AXTO-Signature dengannya.",
      "none": "Belum ada webhook.",
      "active": "Aktif",
      "paused": "Dijeda",
      "failures": "{n} kegagalan berturut-turut",
      "lastStatus": "Penghantaran terakhir: {status}",
      "test": "Hantar ujian",
      "testResult": "Penghantaran ujian: HTTP {status} dalam {ms} ms",
      "rotate": "Rahsia baharu",
      "deliveries": "Penghantaran",
      "noDeliveries": "Belum ada penghantaran.",
      "del": "Padam",
      "confirmDel": "Padam webhook ini?",
      "enable": "Hidupkan",
      "disable": "Jeda",
      "attempt": "cubaan {n}",
      "retryAt": "cuba semula {at}",
      "verify": "Cara mengesahkan penghantaran"
    },
    "console": {
      "channels": "Saluran",
      "connect": "Sambung",
      "disconnect": "Putus",
      "transport": "Pengangkutan",
      "live": "Langsung · {n} acara",
      "idle": "Tidak bersambung",
      "publish": "Terbitkan acara",
      "channel": "Saluran",
      "type": "Jenis",
      "data": "Data (JSON)",
      "send": "Terbit",
      "badJson": "Data mesti JSON yang sah.",
      "empty": "Acara muncul di sini sebaik ia tiba.",
      "clear": "Kosongkan"
    },
    "rtc": {
      "intro": "Buka halaman ini pada dua peranti (atau dua tab), sertai bilik yang sama dan bercakap rakan ke rakan. Media mengalir terus antara peranti.",
      "room": "Bilik",
      "create": "Bilik baharu",
      "join": "Sertai",
      "leave": "Keluar",
      "camera": "Guna kamera & mikrofon",
      "status": {
        "idle": "Belum menyertai",
        "waiting": "Menunggu rakan lain…",
        "connecting": "Menyambung…",
        "connected": "Bersambung rakan ke rakan",
        "failed": "Tidak dapat bersambung (rangkaian ini mungkin memerlukan pelayan TURN)"
      },
      "message": "Mesej",
      "send": "Hantar",
      "turn": "Geganti TURN tersedia",
      "noTurn": "STUN sahaja (berfungsi pada kebanyakan rangkaian)",
      "you": "Anda",
      "peer": "Rakan"
    },
    "errors": {
      "generic": "Sesuatu tidak kena: {msg}"
    }
  },
  de: {
    "title": "Entwickler",
    "sub": "Verbinden Sie andere Websites, Apps und KI-Agenten in Echtzeit mit AXTO — REST, SSE, WebSocket, Long Polling, Streaming, gRPC-kompatibles Connect, WebRTC, Webhooks und MCP.",
    "tabs": {
      "overview": "Übersicht",
      "keys": "API-Schlüssel",
      "webhooks": "Webhooks",
      "console": "Live-Konsole",
      "rtc": "WebRTC-Test"
    },
    "needPlan": "Die Entwickler-API ist ab dem Starter-Tarif enthalten.",
    "upgrade": "Tarife ansehen",
    "off": "Die Entwickler-API ist derzeit vom Betreiber abgeschaltet.",
    "limits": "Ihr Tarif: {keys} API-Schlüssel · {rpm} Anfragen pro Minute · {hooks} Webhooks",
    "usage": "{n} Ereignisse in den letzten 24 Stunden",
    "retention": "Ereignisse werden {days} Tage aufbewahrt, verschlüsselt mit dem Schlüssel Ihres Kontos.",
    "docs": "Vollständige Dokumentation",
    "openapi": "OpenAPI",
    "proto": "gRPC-.proto",
    "transports": "Transporte",
    "transportList": [
      [
        "REST",
        "Ereignisse veröffentlichen und abrufen, KI ausführen, Tokens erzeugen — JSON über HTTPS."
      ],
      [
        "Server-Sent Events",
        "Einseitiger Live-Stream; der Browser verbindet sich selbst neu und setzt fort (Last-Event-ID)."
      ],
      [
        "WebSocket",
        "Bidirektional: abonnieren und veröffentlichen über eine Verbindung."
      ],
      [
        "Long Polling",
        "Funktioniert durch jeden Proxy und jede Firewall; antwortet, sobald ein Ereignis eintrifft."
      ],
      [
        "HTTP/2- & HTTP/3-Streaming",
        "KI-Antworten als NDJSON oder SSE, während sie entstehen."
      ],
      [
        "Connect (gRPC-kompatibel)",
        "Unäre und Server-Streaming-RPCs für connect-es, connect-go, Swift und Kotlin."
      ],
      [
        "WebRTC",
        "Peer-to-Peer-Audio, -Video und -Daten; AXTO übernimmt die Signalisierung und stellt STUN / TURN."
      ],
      [
        "Webhooks",
        "Signierte HTTPS-Rückrufe an Ihren Server, 24 Stunden lang wiederholt."
      ],
      [
        "MCP",
        "KI-Agenten (Claude Desktop, Cursor, VS Code…) nutzen AXTO-Werkzeuge direkt."
      ]
    ],
    "webtransport": "WebTransport wird nicht angeboten: Das Cloudflare-Edge unterstützt es noch nicht. Das SDK nutzt stattdessen WebSocket, dann SSE, dann Long Polling.",
    "quickstart": "Schnellstart",
    "copy": "Kopieren",
    "copied": "Kopiert ✓",
    "keys": {
      "new": "Neuer API-Schlüssel",
      "name": "Name",
      "namePh": "z. B. Shop-Backend",
      "scopes": "Berechtigungen",
      "scopeNames": {
        "ai:run": "KI ausführen",
        "events:read": "Ereignisse lesen",
        "events:write": "Ereignisse veröffentlichen",
        "rtc": "WebRTC-Räume",
        "mcp": "MCP-Werkzeuge"
      },
      "origins": "Erlaubte Browser-Origins (eine pro Zeile)",
      "originsHint": "Leer lassen, wenn nur ein Server den Schlüssel nutzt. Fügen Sie https://ihre-seite.de hinzu, um aus dem Browser-Code dieser Seite aufzurufen, oder * für jede Seite.",
      "create": "Schlüssel erstellen",
      "shownOnce": "Kopieren Sie diesen Schlüssel jetzt — er wird nur einmal angezeigt. AXTO speichert nur einen Fingerabdruck davon.",
      "none": "Noch keine API-Schlüssel.",
      "prefix": "Schlüssel",
      "created": "Erstellt",
      "lastUsed": "Zuletzt genutzt",
      "never": "nie",
      "revoke": "Widerrufen",
      "revoked": "Widerrufen",
      "confirmRevoke": "Diesen Schlüssel widerrufen? Apps, die ihn nutzen, funktionieren sofort nicht mehr.",
      "edit": "Bearbeiten",
      "save": "Speichern",
      "cancel": "Abbrechen",
      "done": "Fertig"
    },
    "hooks": {
      "new": "Neuer Webhook",
      "url": "Endpunkt-URL (https://…)",
      "channels": "Kanäle (kommagetrennt, * für alle, orders.* für ein Präfix)",
      "types": "Ereignistypen (kommagetrennt, * für alle)",
      "create": "Webhook hinzufügen",
      "secretOnce": "Signaturgeheimnis — jetzt kopieren; es wird nur einmal angezeigt. Prüfen Sie damit X-AXTO-Signature.",
      "none": "Noch keine Webhooks.",
      "active": "Aktiv",
      "paused": "Pausiert",
      "failures": "{n} Fehlschläge in Folge",
      "lastStatus": "Letzte Zustellung: {status}",
      "test": "Test senden",
      "testResult": "Testzustellung: HTTP {status} in {ms} ms",
      "rotate": "Neues Geheimnis",
      "deliveries": "Zustellungen",
      "noDeliveries": "Noch keine Zustellungen.",
      "del": "Löschen",
      "confirmDel": "Diesen Webhook löschen?",
      "enable": "Einschalten",
      "disable": "Pausieren",
      "attempt": "Versuch {n}",
      "retryAt": "erneut {at}",
      "verify": "So prüfen Sie eine Zustellung"
    },
    "console": {
      "channels": "Kanäle",
      "connect": "Verbinden",
      "disconnect": "Trennen",
      "transport": "Transport",
      "live": "Live · {n} Ereignisse",
      "idle": "Nicht verbunden",
      "publish": "Ereignis veröffentlichen",
      "channel": "Kanal",
      "type": "Typ",
      "data": "Daten (JSON)",
      "send": "Veröffentlichen",
      "badJson": "Die Daten müssen gültiges JSON sein.",
      "empty": "Ereignisse erscheinen hier, sobald sie eintreffen.",
      "clear": "Leeren"
    },
    "rtc": {
      "intro": "Öffnen Sie diese Seite auf zwei Geräten (oder in zwei Tabs), treten Sie demselben Raum bei und sprechen Sie Peer-to-Peer. Die Medien laufen direkt zwischen den Geräten.",
      "room": "Raum",
      "create": "Neuer Raum",
      "join": "Beitreten",
      "leave": "Verlassen",
      "camera": "Kamera & Mikrofon verwenden",
      "status": {
        "idle": "Nicht beigetreten",
        "waiting": "Warte auf den anderen Teilnehmer…",
        "connecting": "Verbinde…",
        "connected": "Peer-to-Peer verbunden",
        "failed": "Verbindung nicht möglich (in diesem Netz wird eventuell ein TURN-Server benötigt)"
      },
      "message": "Nachricht",
      "send": "Senden",
      "turn": "TURN-Relay verfügbar",
      "noTurn": "Nur STUN (funktioniert in den meisten Netzen)",
      "you": "Sie",
      "peer": "Gegenüber"
    },
    "errors": {
      "generic": "Etwas ist schiefgelaufen: {msg}"
    }
  },
  fr: {
    "title": "Développeurs",
    "sub": "Connectez d'autres sites, applications et agents IA à AXTO en temps réel — REST, SSE, WebSocket, long polling, streaming, Connect compatible gRPC, WebRTC, webhooks et MCP.",
    "tabs": {
      "overview": "Vue d'ensemble",
      "keys": "Clés API",
      "webhooks": "Webhooks",
      "console": "Console en direct",
      "rtc": "Test WebRTC"
    },
    "needPlan": "L'API développeur est incluse à partir de l'offre Starter.",
    "upgrade": "Voir les offres",
    "off": "L'API développeur est actuellement désactivée par l'opérateur.",
    "limits": "Votre offre : {keys} clés API · {rpm} requêtes par minute · {hooks} webhooks",
    "usage": "{n} événements ces dernières 24 heures",
    "retention": "Les événements sont conservés {days} jours, chiffrés avec la clé de votre compte.",
    "docs": "Documentation complète",
    "openapi": "OpenAPI",
    "proto": ".proto gRPC",
    "transports": "Transports",
    "transportList": [
      [
        "REST",
        "Publier et lister des événements, lancer l'IA, émettre des jetons — JSON sur HTTPS."
      ],
      [
        "Server-Sent Events",
        "Flux en direct à sens unique ; le navigateur se reconnecte et reprend seul (Last-Event-ID)."
      ],
      [
        "WebSocket",
        "Bidirectionnel : s'abonner et publier sur une seule connexion."
      ],
      [
        "Long polling",
        "Passe par n'importe quel proxy ou pare-feu ; répond dès qu'un événement arrive."
      ],
      [
        "Streaming HTTP/2 et HTTP/3",
        "Réponses IA en NDJSON ou SSE pendant leur génération."
      ],
      [
        "Connect (compatible gRPC)",
        "RPC unaires et en streaming serveur pour connect-es, connect-go, Swift et Kotlin."
      ],
      [
        "WebRTC",
        "Audio, vidéo et données en pair à pair ; AXTO assure la signalisation et fournit STUN / TURN."
      ],
      [
        "Webhooks",
        "Rappels HTTPS signés vers votre serveur, réessayés pendant 24 heures."
      ],
      [
        "MCP",
        "Les agents IA (Claude Desktop, Cursor, VS Code…) utilisent directement les outils AXTO."
      ]
    ],
    "webtransport": "WebTransport n'est pas proposé : l'edge Cloudflare ne le prend pas encore en charge. Le SDK utilise à la place WebSocket, puis SSE, puis le long polling.",
    "quickstart": "Démarrage rapide",
    "copy": "Copier",
    "copied": "Copié ✓",
    "keys": {
      "new": "Nouvelle clé API",
      "name": "Nom",
      "namePh": "ex. Backend de la boutique",
      "scopes": "Autorisations",
      "scopeNames": {
        "ai:run": "Lancer l'IA",
        "events:read": "Lire les événements",
        "events:write": "Publier des événements",
        "rtc": "Salles WebRTC",
        "mcp": "Outils MCP"
      },
      "origins": "Origines navigateur autorisées (une par ligne)",
      "originsHint": "Laissez vide pour un usage côté serveur uniquement. Ajoutez https://votre-site.fr pour appeler depuis le code navigateur de ce site, ou * pour tout site.",
      "create": "Créer la clé",
      "shownOnce": "Copiez cette clé maintenant — elle n'est affichée qu'une fois. AXTO n'en conserve qu'une empreinte.",
      "none": "Aucune clé API pour l'instant.",
      "prefix": "Clé",
      "created": "Créée",
      "lastUsed": "Dernière utilisation",
      "never": "jamais",
      "revoke": "Révoquer",
      "revoked": "Révoquée",
      "confirmRevoke": "Révoquer cette clé ? Les applications qui l'utilisent cessent immédiatement de fonctionner.",
      "edit": "Modifier",
      "save": "Enregistrer",
      "cancel": "Annuler",
      "done": "Terminé"
    },
    "hooks": {
      "new": "Nouveau webhook",
      "url": "URL du point de terminaison (https://…)",
      "channels": "Canaux (séparés par des virgules, * pour tous, orders.* pour un préfixe)",
      "types": "Types d'événements (séparés par des virgules, * pour tous)",
      "create": "Ajouter le webhook",
      "secretOnce": "Secret de signature — copiez-le maintenant ; il n'est affiché qu'une fois. Vérifiez X-AXTO-Signature avec lui.",
      "none": "Aucun webhook pour l'instant.",
      "active": "Actif",
      "paused": "En pause",
      "failures": "{n} échecs d'affilée",
      "lastStatus": "Dernière livraison : {status}",
      "test": "Envoyer un test",
      "testResult": "Livraison de test : HTTP {status} en {ms} ms",
      "rotate": "Nouveau secret",
      "deliveries": "Livraisons",
      "noDeliveries": "Aucune livraison pour l'instant.",
      "del": "Supprimer",
      "confirmDel": "Supprimer ce webhook ?",
      "enable": "Activer",
      "disable": "Mettre en pause",
      "attempt": "tentative {n}",
      "retryAt": "nouvel essai {at}",
      "verify": "Comment vérifier une livraison"
    },
    "console": {
      "channels": "Canaux",
      "connect": "Se connecter",
      "disconnect": "Se déconnecter",
      "transport": "Transport",
      "live": "En direct · {n} événements",
      "idle": "Non connecté",
      "publish": "Publier un événement",
      "channel": "Canal",
      "type": "Type",
      "data": "Données (JSON)",
      "send": "Publier",
      "badJson": "Les données doivent être un JSON valide.",
      "empty": "Les événements apparaissent ici dès leur arrivée.",
      "clear": "Effacer"
    },
    "rtc": {
      "intro": "Ouvrez cette page sur deux appareils (ou deux onglets), rejoignez la même salle et parlez en pair à pair. Les médias passent directement d'un appareil à l'autre.",
      "room": "Salle",
      "create": "Nouvelle salle",
      "join": "Rejoindre",
      "leave": "Quitter",
      "camera": "Utiliser la caméra et le micro",
      "status": {
        "idle": "Pas encore rejoint",
        "waiting": "En attente de l'autre pair…",
        "connecting": "Connexion…",
        "connected": "Connecté en pair à pair",
        "failed": "Connexion impossible (ce réseau nécessite peut-être un serveur TURN)"
      },
      "message": "Message",
      "send": "Envoyer",
      "turn": "Relais TURN disponible",
      "noTurn": "STUN uniquement (fonctionne sur la plupart des réseaux)",
      "you": "Vous",
      "peer": "Pair"
    },
    "errors": {
      "generic": "Une erreur est survenue : {msg}"
    }
  },
  it: {
    "title": "Sviluppatori",
    "sub": "Collega altri siti, app e agenti IA ad AXTO in tempo reale — REST, SSE, WebSocket, long polling, streaming, Connect compatibile gRPC, WebRTC, webhook e MCP.",
    "tabs": {
      "overview": "Panoramica",
      "keys": "Chiavi API",
      "webhooks": "Webhook",
      "console": "Console live",
      "rtc": "Test WebRTC"
    },
    "needPlan": "L'API per sviluppatori è inclusa dal piano Starter.",
    "upgrade": "Vedi i piani",
    "off": "L'API per sviluppatori è al momento disattivata dall'operatore.",
    "limits": "Il tuo piano: {keys} chiavi API · {rpm} richieste al minuto · {hooks} webhook",
    "usage": "{n} eventi nelle ultime 24 ore",
    "retention": "Gli eventi sono conservati per {days} giorni, cifrati con la chiave del tuo account.",
    "docs": "Documentazione completa",
    "openapi": "OpenAPI",
    "proto": ".proto gRPC",
    "transports": "Trasporti",
    "transportList": [
      [
        "REST",
        "Pubblica ed elenca eventi, esegui l'IA, emetti token — JSON su HTTPS."
      ],
      [
        "Server-Sent Events",
        "Stream live unidirezionale; il browser si riconnette e riprende da solo (Last-Event-ID)."
      ],
      [
        "WebSocket",
        "Bidirezionale: iscriviti e pubblica su un'unica connessione."
      ],
      [
        "Long polling",
        "Funziona attraverso qualsiasi proxy o firewall; risponde appena arriva un evento."
      ],
      [
        "Streaming HTTP/2 e HTTP/3",
        "Risposte IA in NDJSON o SSE mentre vengono generate."
      ],
      [
        "Connect (compatibile gRPC)",
        "RPC unarie e server-streaming per connect-es, connect-go, Swift e Kotlin."
      ],
      [
        "WebRTC",
        "Audio, video e dati peer-to-peer; AXTO gestisce la segnalazione e fornisce STUN / TURN."
      ],
      [
        "Webhook",
        "Callback HTTPS firmate verso il tuo server, ritentate per 24 ore."
      ],
      [
        "MCP",
        "Gli agenti IA (Claude Desktop, Cursor, VS Code…) usano direttamente gli strumenti di AXTO."
      ]
    ],
    "webtransport": "WebTransport non è offerto: l'edge di Cloudflare non lo supporta ancora. L'SDK usa invece WebSocket, poi SSE, poi il long polling.",
    "quickstart": "Avvio rapido",
    "copy": "Copia",
    "copied": "Copiato ✓",
    "keys": {
      "new": "Nuova chiave API",
      "name": "Nome",
      "namePh": "es. Backend del negozio",
      "scopes": "Permessi",
      "scopeNames": {
        "ai:run": "Esegui IA",
        "events:read": "Leggi eventi",
        "events:write": "Pubblica eventi",
        "rtc": "Stanze WebRTC",
        "mcp": "Strumenti MCP"
      },
      "origins": "Origini browser consentite (una per riga)",
      "originsHint": "Lascia vuoto per uso solo lato server. Aggiungi https://tuo-sito.it per chiamare dal codice browser di quel sito, oppure * per qualsiasi sito.",
      "create": "Crea chiave",
      "shownOnce": "Copia subito questa chiave — viene mostrata una sola volta. AXTO ne conserva solo un'impronta.",
      "none": "Nessuna chiave API.",
      "prefix": "Chiave",
      "created": "Creata",
      "lastUsed": "Ultimo uso",
      "never": "mai",
      "revoke": "Revoca",
      "revoked": "Revocata",
      "confirmRevoke": "Revocare questa chiave? Le app che la usano smettono subito di funzionare.",
      "edit": "Modifica",
      "save": "Salva",
      "cancel": "Annulla",
      "done": "Fatto"
    },
    "hooks": {
      "new": "Nuovo webhook",
      "url": "URL dell'endpoint (https://…)",
      "channels": "Canali (separati da virgole, * per tutti, orders.* per un prefisso)",
      "types": "Tipi di evento (separati da virgole, * per tutti)",
      "create": "Aggiungi webhook",
      "secretOnce": "Segreto di firma — copialo ora; viene mostrato una sola volta. Verifica X-AXTO-Signature con esso.",
      "none": "Nessun webhook.",
      "active": "Attivo",
      "paused": "In pausa",
      "failures": "{n} errori consecutivi",
      "lastStatus": "Ultima consegna: {status}",
      "test": "Invia test",
      "testResult": "Consegna di prova: HTTP {status} in {ms} ms",
      "rotate": "Nuovo segreto",
      "deliveries": "Consegne",
      "noDeliveries": "Nessuna consegna.",
      "del": "Elimina",
      "confirmDel": "Eliminare questo webhook?",
      "enable": "Attiva",
      "disable": "Metti in pausa",
      "attempt": "tentativo {n}",
      "retryAt": "nuovo tentativo {at}",
      "verify": "Come verificare una consegna"
    },
    "console": {
      "channels": "Canali",
      "connect": "Connetti",
      "disconnect": "Disconnetti",
      "transport": "Trasporto",
      "live": "Live · {n} eventi",
      "idle": "Non connesso",
      "publish": "Pubblica un evento",
      "channel": "Canale",
      "type": "Tipo",
      "data": "Dati (JSON)",
      "send": "Pubblica",
      "badJson": "I dati devono essere JSON valido.",
      "empty": "Gli eventi compaiono qui appena arrivano.",
      "clear": "Svuota"
    },
    "rtc": {
      "intro": "Apri questa pagina su due dispositivi (o due schede), entra nella stessa stanza e parla peer-to-peer. I media passano direttamente tra i dispositivi.",
      "room": "Stanza",
      "create": "Nuova stanza",
      "join": "Entra",
      "leave": "Esci",
      "camera": "Usa fotocamera e microfono",
      "status": {
        "idle": "Non collegato",
        "waiting": "In attesa dell'altro partecipante…",
        "connecting": "Connessione…",
        "connected": "Connesso peer-to-peer",
        "failed": "Impossibile connettersi (questa rete potrebbe richiedere un server TURN)"
      },
      "message": "Messaggio",
      "send": "Invia",
      "turn": "Relay TURN disponibile",
      "noTurn": "Solo STUN (funziona sulla maggior parte delle reti)",
      "you": "Tu",
      "peer": "Interlocutore"
    },
    "errors": {
      "generic": "Qualcosa è andato storto: {msg}"
    }
  },
  zh: {
    "title": "开发者",
    "sub": "将其他网站、应用和 AI 智能体实时连接到 AXTO —— REST、SSE、WebSocket、长轮询、流式传输、兼容 gRPC 的 Connect、WebRTC、Webhook 和 MCP。",
    "tabs": {
      "overview": "概览",
      "keys": "API 密钥",
      "webhooks": "Webhook",
      "console": "实时控制台",
      "rtc": "WebRTC 测试"
    },
    "needPlan": "开发者 API 从 Starter 套餐起提供。",
    "upgrade": "查看套餐",
    "off": "开发者 API 目前已被运营方关闭。",
    "limits": "您的套餐：{keys} 个 API 密钥 · 每分钟 {rpm} 次请求 · {hooks} 个 Webhook",
    "usage": "过去 24 小时内 {n} 个事件",
    "retention": "事件保留 {days} 天，并使用您账户的密钥加密。",
    "docs": "完整文档",
    "openapi": "OpenAPI",
    "proto": "gRPC .proto",
    "transports": "传输方式",
    "transportList": [
      [
        "REST",
        "发布和列出事件、运行 AI、签发令牌 —— 基于 HTTPS 的 JSON。"
      ],
      [
        "Server-Sent Events",
        "单向实时流；浏览器会自动重连并续传（Last-Event-ID）。"
      ],
      [
        "WebSocket",
        "双向：在同一连接上订阅和发布。"
      ],
      [
        "长轮询",
        "可穿过任何代理或防火墙；事件一到即返回。"
      ],
      [
        "HTTP/2 与 HTTP/3 流式传输",
        "AI 回答在生成过程中以 NDJSON 或 SSE 形式输出。"
      ],
      [
        "Connect（兼容 gRPC）",
        "适用于 connect-es、connect-go、Swift 和 Kotlin 的一元与服务端流式 RPC。"
      ],
      [
        "WebRTC",
        "点对点音频、视频和数据；AXTO 负责信令并提供 STUN / TURN。"
      ],
      [
        "Webhook",
        "发送到您服务器的签名 HTTPS 回调，24 小时内自动重试。"
      ],
      [
        "MCP",
        "AI 智能体（Claude Desktop、Cursor、VS Code…）可直接使用 AXTO 工具。"
      ]
    ],
    "webtransport": "暂不提供 WebTransport：Cloudflare 边缘网络尚不支持。SDK 会依次改用 WebSocket、SSE 和长轮询。",
    "quickstart": "快速开始",
    "copy": "复制",
    "copied": "已复制 ✓",
    "keys": {
      "new": "新建 API 密钥",
      "name": "名称",
      "namePh": "例如：商店后端",
      "scopes": "权限",
      "scopeNames": {
        "ai:run": "运行 AI",
        "events:read": "读取事件",
        "events:write": "发布事件",
        "rtc": "WebRTC 房间",
        "mcp": "MCP 工具"
      },
      "origins": "允许的浏览器来源（每行一个）",
      "originsHint": "仅供服务器端使用时请留空。添加 https://your-site.com 即可从该网站的浏览器代码调用，填 * 表示允许任何网站。",
      "create": "创建密钥",
      "shownOnce": "请立即复制此密钥 —— 它只显示一次。AXTO 只保存它的指纹。",
      "none": "还没有 API 密钥。",
      "prefix": "密钥",
      "created": "创建时间",
      "lastUsed": "最近使用",
      "never": "从未",
      "revoke": "吊销",
      "revoked": "已吊销",
      "confirmRevoke": "吊销此密钥？使用它的应用将立即停止工作。",
      "edit": "编辑",
      "save": "保存",
      "cancel": "取消",
      "done": "完成"
    },
    "hooks": {
      "new": "新建 Webhook",
      "url": "端点 URL（https://…）",
      "channels": "频道（逗号分隔，* 表示全部，orders.* 表示前缀）",
      "types": "事件类型（逗号分隔，* 表示全部）",
      "create": "添加 Webhook",
      "secretOnce": "签名密钥 —— 请立即复制；它只显示一次。用它验证 X-AXTO-Signature。",
      "none": "还没有 Webhook。",
      "active": "启用中",
      "paused": "已暂停",
      "failures": "连续失败 {n} 次",
      "lastStatus": "最近一次投递：{status}",
      "test": "发送测试",
      "testResult": "测试投递：HTTP {status}，耗时 {ms} 毫秒",
      "rotate": "新密钥",
      "deliveries": "投递记录",
      "noDeliveries": "还没有投递记录。",
      "del": "删除",
      "confirmDel": "删除此 Webhook？",
      "enable": "启用",
      "disable": "暂停",
      "attempt": "第 {n} 次尝试",
      "retryAt": "{at} 重试",
      "verify": "如何验证投递"
    },
    "console": {
      "channels": "频道",
      "connect": "连接",
      "disconnect": "断开",
      "transport": "传输方式",
      "live": "实时 · {n} 个事件",
      "idle": "未连接",
      "publish": "发布事件",
      "channel": "频道",
      "type": "类型",
      "data": "数据（JSON）",
      "send": "发布",
      "badJson": "数据必须是有效的 JSON。",
      "empty": "事件到达后会显示在这里。",
      "clear": "清空"
    },
    "rtc": {
      "intro": "在两台设备（或两个标签页）上打开此页面，加入同一个房间即可点对点通话。媒体直接在设备之间传输。",
      "room": "房间",
      "create": "新建房间",
      "join": "加入",
      "leave": "离开",
      "camera": "使用摄像头和麦克风",
      "status": {
        "idle": "未加入",
        "waiting": "正在等待另一方…",
        "connecting": "正在连接…",
        "connected": "已点对点连接",
        "failed": "无法连接（此网络可能需要 TURN 服务器）"
      },
      "message": "消息",
      "send": "发送",
      "turn": "TURN 中继可用",
      "noTurn": "仅 STUN（适用于大多数网络）",
      "you": "您",
      "peer": "对方"
    },
    "errors": {
      "generic": "出错了：{msg}"
    }
  },
  ja: {
    "title": "開発者",
    "sub": "他のウェブサイト、アプリ、AI エージェントを AXTO にリアルタイムで接続 — REST、SSE、WebSocket、ロングポーリング、ストリーミング、gRPC 互換の Connect、WebRTC、Webhook、MCP。",
    "tabs": {
      "overview": "概要",
      "keys": "API キー",
      "webhooks": "Webhook",
      "console": "ライブコンソール",
      "rtc": "WebRTC テスト"
    },
    "needPlan": "開発者 API は Starter プランから利用できます。",
    "upgrade": "プランを見る",
    "off": "開発者 API は現在、運営者によって停止されています。",
    "limits": "ご利用のプラン：API キー {keys} 個 · 毎分 {rpm} リクエスト · Webhook {hooks} 個",
    "usage": "過去 24 時間のイベント {n} 件",
    "retention": "イベントはアカウントの鍵で暗号化され、{days} 日間保存されます。",
    "docs": "詳細なドキュメント",
    "openapi": "OpenAPI",
    "proto": "gRPC .proto",
    "transports": "トランスポート",
    "transportList": [
      [
        "REST",
        "イベントの発行と一覧、AI の実行、トークンの発行 — HTTPS 上の JSON。"
      ],
      [
        "Server-Sent Events",
        "一方向のライブストリーム。ブラウザが自動で再接続し続きから再開します（Last-Event-ID）。"
      ],
      [
        "WebSocket",
        "双方向：1 本の接続で購読と発行ができます。"
      ],
      [
        "ロングポーリング",
        "どんなプロキシやファイアウォールでも動作し、イベントが届いた瞬間に応答します。"
      ],
      [
        "HTTP/2・HTTP/3 ストリーミング",
        "AI の回答を生成しながら NDJSON または SSE で配信します。"
      ],
      [
        "Connect（gRPC 互換）",
        "connect-es、connect-go、Swift、Kotlin 向けの単項・サーバーストリーミング RPC。"
      ],
      [
        "WebRTC",
        "ピアツーピアの音声・映像・データ。AXTO がシグナリングを行い STUN / TURN を提供します。"
      ],
      [
        "Webhook",
        "署名付き HTTPS コールバックをサーバーへ送信し、24 時間再試行します。"
      ],
      [
        "MCP",
        "AI エージェント（Claude Desktop、Cursor、VS Code…）が AXTO のツールを直接使えます。"
      ]
    ],
    "webtransport": "WebTransport は提供していません：Cloudflare のエッジがまだ対応していないためです。SDK は代わりに WebSocket、次に SSE、次にロングポーリングを使います。",
    "quickstart": "クイックスタート",
    "copy": "コピー",
    "copied": "コピーしました ✓",
    "keys": {
      "new": "新しい API キー",
      "name": "名前",
      "namePh": "例：ショップのバックエンド",
      "scopes": "権限",
      "scopeNames": {
        "ai:run": "AI の実行",
        "events:read": "イベントの読み取り",
        "events:write": "イベントの発行",
        "rtc": "WebRTC ルーム",
        "mcp": "MCP ツール"
      },
      "origins": "許可するブラウザのオリジン（1 行に 1 つ）",
      "originsHint": "サーバー側だけで使う場合は空欄のままにします。https://your-site.com を追加するとそのサイトのブラウザコードから呼び出せます。* はすべてのサイトです。",
      "create": "キーを作成",
      "shownOnce": "今すぐこのキーをコピーしてください — 表示されるのは一度だけです。AXTO が保存するのはその指紋だけです。",
      "none": "API キーはまだありません。",
      "prefix": "キー",
      "created": "作成日",
      "lastUsed": "最終使用",
      "never": "未使用",
      "revoke": "無効化",
      "revoked": "無効化済み",
      "confirmRevoke": "このキーを無効化しますか？ 使用中のアプリはすぐに動作しなくなります。",
      "edit": "編集",
      "save": "保存",
      "cancel": "キャンセル",
      "done": "完了"
    },
    "hooks": {
      "new": "新しい Webhook",
      "url": "エンドポイント URL（https://…）",
      "channels": "チャンネル（カンマ区切り、* はすべて、orders.* は前方一致）",
      "types": "イベントの種類（カンマ区切り、* はすべて）",
      "create": "Webhook を追加",
      "secretOnce": "署名シークレット — 今すぐコピーしてください。表示されるのは一度だけです。これで X-AXTO-Signature を検証します。",
      "none": "Webhook はまだありません。",
      "active": "有効",
      "paused": "一時停止中",
      "failures": "{n} 回連続で失敗",
      "lastStatus": "最終配信：{status}",
      "test": "テスト送信",
      "testResult": "テスト配信：HTTP {status}（{ms} ミリ秒）",
      "rotate": "新しいシークレット",
      "deliveries": "配信履歴",
      "noDeliveries": "配信履歴はまだありません。",
      "del": "削除",
      "confirmDel": "この Webhook を削除しますか？",
      "enable": "有効にする",
      "disable": "一時停止",
      "attempt": "{n} 回目の試行",
      "retryAt": "{at} に再試行",
      "verify": "配信を検証する方法"
    },
    "console": {
      "channels": "チャンネル",
      "connect": "接続",
      "disconnect": "切断",
      "transport": "トランスポート",
      "live": "ライブ · {n} 件のイベント",
      "idle": "未接続",
      "publish": "イベントを発行",
      "channel": "チャンネル",
      "type": "種類",
      "data": "データ（JSON）",
      "send": "発行",
      "badJson": "データは有効な JSON である必要があります。",
      "empty": "イベントは届いた順にここに表示されます。",
      "clear": "クリア"
    },
    "rtc": {
      "intro": "このページを 2 台の端末（または 2 つのタブ）で開き、同じルームに参加すればピアツーピアで通話できます。メディアは端末間で直接やり取りされます。",
      "room": "ルーム",
      "create": "新しいルーム",
      "join": "参加",
      "leave": "退出",
      "camera": "カメラとマイクを使う",
      "status": {
        "idle": "未参加",
        "waiting": "相手の参加を待っています…",
        "connecting": "接続中…",
        "connected": "ピアツーピアで接続済み",
        "failed": "接続できませんでした（このネットワークでは TURN サーバーが必要な場合があります）"
      },
      "message": "メッセージ",
      "send": "送信",
      "turn": "TURN リレー利用可能",
      "noTurn": "STUN のみ（ほとんどのネットワークで動作）",
      "you": "あなた",
      "peer": "相手"
    },
    "errors": {
      "generic": "問題が発生しました：{msg}"
    }
  },
  hi: {
    "title": "डेवलपर",
    "sub": "दूसरी वेबसाइटों, ऐप्स और AI एजेंटों को AXTO से रियल-टाइम में जोड़ें — REST, SSE, WebSocket, लॉन्ग पोलिंग, स्ट्रीमिंग, gRPC-संगत Connect, WebRTC, वेबहुक और MCP।",
    "tabs": {
      "overview": "अवलोकन",
      "keys": "API कुंजियाँ",
      "webhooks": "वेबहुक",
      "console": "लाइव कंसोल",
      "rtc": "WebRTC परीक्षण"
    },
    "needPlan": "डेवलपर API Starter प्लान से शामिल है।",
    "upgrade": "प्लान देखें",
    "off": "डेवलपर API को अभी ऑपरेटर ने बंद किया हुआ है।",
    "limits": "आपका प्लान: {keys} API कुंजियाँ · {rpm} अनुरोध प्रति मिनट · {hooks} वेबहुक",
    "usage": "पिछले 24 घंटों में {n} इवेंट",
    "retention": "इवेंट {days} दिनों तक रखे जाते हैं, आपके खाते की कुंजी से एन्क्रिप्ट करके।",
    "docs": "पूरा दस्तावेज़",
    "openapi": "OpenAPI",
    "proto": "gRPC .proto",
    "transports": "ट्रांसपोर्ट",
    "transportList": [
      [
        "REST",
        "इवेंट प्रकाशित करें और सूची देखें, AI चलाएँ, टोकन बनाएँ — HTTPS पर JSON।"
      ],
      [
        "Server-Sent Events",
        "एकतरफ़ा लाइव स्ट्रीम; ब्राउज़र खुद फिर से जुड़ता है और वहीं से जारी रखता है (Last-Event-ID)।"
      ],
      [
        "WebSocket",
        "दोतरफ़ा: एक ही कनेक्शन पर सब्सक्राइब और प्रकाशित करें।"
      ],
      [
        "लॉन्ग पोलिंग",
        "किसी भी प्रॉक्सी या फ़ायरवॉल से होकर काम करता है; इवेंट आते ही जवाब देता है।"
      ],
      [
        "HTTP/2 और HTTP/3 स्ट्रीमिंग",
        "AI के जवाब बनते समय ही NDJSON या SSE के रूप में।"
      ],
      [
        "Connect (gRPC-संगत)",
        "connect-es, connect-go, Swift और Kotlin के लिए यूनरी और सर्वर-स्ट्रीमिंग RPC।"
      ],
      [
        "WebRTC",
        "पीयर-टू-पीयर ऑडियो, वीडियो और डेटा; AXTO सिग्नलिंग करता है और STUN / TURN देता है।"
      ],
      [
        "वेबहुक",
        "आपके सर्वर पर हस्ताक्षरित HTTPS कॉलबैक, 24 घंटे तक दोबारा प्रयास।"
      ],
      [
        "MCP",
        "AI एजेंट (Claude Desktop, Cursor, VS Code…) AXTO के टूल सीधे इस्तेमाल करते हैं।"
      ]
    ],
    "webtransport": "WebTransport उपलब्ध नहीं है: Cloudflare एज अभी इसका समर्थन नहीं करता। SDK इसकी जगह WebSocket, फिर SSE, फिर लॉन्ग पोलिंग इस्तेमाल करता है।",
    "quickstart": "त्वरित शुरुआत",
    "copy": "कॉपी करें",
    "copied": "कॉपी हो गया ✓",
    "keys": {
      "new": "नई API कुंजी",
      "name": "नाम",
      "namePh": "जैसे, दुकान का बैकएंड",
      "scopes": "अनुमतियाँ",
      "scopeNames": {
        "ai:run": "AI चलाएँ",
        "events:read": "इवेंट पढ़ें",
        "events:write": "इवेंट प्रकाशित करें",
        "rtc": "WebRTC रूम",
        "mcp": "MCP टूल"
      },
      "origins": "अनुमत ब्राउज़र ऑरिजिन (हर पंक्ति में एक)",
      "originsHint": "सिर्फ़ सर्वर पर इस्तेमाल के लिए खाली छोड़ें। उस साइट के ब्राउज़र कोड से कॉल करने के लिए https://your-site.com जोड़ें, या किसी भी साइट के लिए *।",
      "create": "कुंजी बनाएँ",
      "shownOnce": "यह कुंजी अभी कॉपी करें — यह सिर्फ़ एक बार दिखाई जाती है। AXTO केवल इसका फ़िंगरप्रिंट रखता है।",
      "none": "अभी कोई API कुंजी नहीं है।",
      "prefix": "कुंजी",
      "created": "बनाई गई",
      "lastUsed": "पिछला उपयोग",
      "never": "कभी नहीं",
      "revoke": "रद्द करें",
      "revoked": "रद्द",
      "confirmRevoke": "यह कुंजी रद्द करें? इसका इस्तेमाल करने वाले ऐप तुरंत काम करना बंद कर देंगे।",
      "edit": "संपादित करें",
      "save": "सहेजें",
      "cancel": "रद्द करें",
      "done": "हो गया"
    },
    "hooks": {
      "new": "नया वेबहुक",
      "url": "एंडपॉइंट URL (https://…)",
      "channels": "चैनल (कॉमा से अलग, सभी के लिए *, प्रीफ़िक्स के लिए orders.*)",
      "types": "इवेंट प्रकार (कॉमा से अलग, सभी के लिए *)",
      "create": "वेबहुक जोड़ें",
      "secretOnce": "साइनिंग सीक्रेट — इसे अभी कॉपी करें; यह सिर्फ़ एक बार दिखाया जाता है। इससे X-AXTO-Signature की जाँच करें।",
      "none": "अभी कोई वेबहुक नहीं है।",
      "active": "सक्रिय",
      "paused": "रुका हुआ",
      "failures": "लगातार {n} विफलताएँ",
      "lastStatus": "पिछली डिलीवरी: {status}",
      "test": "परीक्षण भेजें",
      "testResult": "परीक्षण डिलीवरी: HTTP {status}, {ms} ms में",
      "rotate": "नया सीक्रेट",
      "deliveries": "डिलीवरी",
      "noDeliveries": "अभी कोई डिलीवरी नहीं।",
      "del": "हटाएँ",
      "confirmDel": "यह वेबहुक हटाएँ?",
      "enable": "चालू करें",
      "disable": "रोकें",
      "attempt": "प्रयास {n}",
      "retryAt": "फिर से {at}",
      "verify": "डिलीवरी की जाँच कैसे करें"
    },
    "console": {
      "channels": "चैनल",
      "connect": "कनेक्ट करें",
      "disconnect": "डिस्कनेक्ट करें",
      "transport": "ट्रांसपोर्ट",
      "live": "लाइव · {n} इवेंट",
      "idle": "कनेक्ट नहीं है",
      "publish": "इवेंट प्रकाशित करें",
      "channel": "चैनल",
      "type": "प्रकार",
      "data": "डेटा (JSON)",
      "send": "प्रकाशित करें",
      "badJson": "डेटा मान्य JSON होना चाहिए।",
      "empty": "इवेंट आते ही यहाँ दिखाई देंगे।",
      "clear": "साफ़ करें"
    },
    "rtc": {
      "intro": "यह पेज दो डिवाइस (या दो टैब) पर खोलें, एक ही रूम में शामिल हों और पीयर-टू-पीयर बात करें। मीडिया सीधे डिवाइसों के बीच जाता है।",
      "room": "रूम",
      "create": "नया रूम",
      "join": "शामिल हों",
      "leave": "छोड़ें",
      "camera": "कैमरा और माइक्रोफ़ोन इस्तेमाल करें",
      "status": {
        "idle": "शामिल नहीं",
        "waiting": "दूसरे पीयर का इंतज़ार…",
        "connecting": "कनेक्ट हो रहा है…",
        "connected": "पीयर-टू-पीयर कनेक्ट",
        "failed": "कनेक्ट नहीं हो सका (इस नेटवर्क पर TURN सर्वर की ज़रूरत हो सकती है)"
      },
      "message": "संदेश",
      "send": "भेजें",
      "turn": "TURN रिले उपलब्ध",
      "noTurn": "सिर्फ़ STUN (ज़्यादातर नेटवर्क पर काम करता है)",
      "you": "आप",
      "peer": "पीयर"
    },
    "errors": {
      "generic": "कुछ गलत हो गया: {msg}"
    }
  },
  ar: {
    "title": "المطوّرون",
    "sub": "اربط المواقع والتطبيقات ووكلاء الذكاء الاصطناعي الأخرى بـ AXTO في الوقت الفعلي — REST وSSE وWebSocket والاستطلاع الطويل والبث وConnect المتوافق مع gRPC وWebRTC وخطافات الويب وMCP.",
    "tabs": {
      "overview": "نظرة عامة",
      "keys": "مفاتيح API",
      "webhooks": "خطافات الويب",
      "console": "وحدة التحكم المباشرة",
      "rtc": "اختبار WebRTC"
    },
    "needPlan": "واجهة المطوّرين متاحة بدءًا من خطة Starter.",
    "upgrade": "عرض الخطط",
    "off": "أوقف المشغّل واجهة المطوّرين في الوقت الحالي.",
    "limits": "خطتك: {keys} مفاتيح API · {rpm} طلبًا في الدقيقة · {hooks} خطافات ويب",
    "usage": "{n} حدثًا في آخر 24 ساعة",
    "retention": "تُحفظ الأحداث لمدة {days} يومًا، مشفّرة بمفتاح حسابك.",
    "docs": "التوثيق الكامل",
    "openapi": "OpenAPI",
    "proto": "ملف gRPC ‏.proto",
    "transports": "وسائل الاتصال",
    "transportList": [
      [
        "REST",
        "نشر الأحداث وعرضها وتشغيل الذكاء الاصطناعي وإصدار الرموز — JSON عبر HTTPS."
      ],
      [
        "Server-Sent Events",
        "بث مباشر باتجاه واحد؛ يعيد المتصفح الاتصال ويستأنف تلقائيًا (Last-Event-ID)."
      ],
      [
        "WebSocket",
        "باتجاهين: اشترك وانشر عبر اتصال واحد."
      ],
      [
        "الاستطلاع الطويل",
        "يعمل عبر أي وكيل أو جدار حماية؛ يجيب فور وصول حدث."
      ],
      [
        "بث HTTP/2 وHTTP/3",
        "إجابات الذكاء الاصطناعي بصيغة NDJSON أو SSE أثناء توليدها."
      ],
      [
        "Connect (متوافق مع gRPC)",
        "استدعاءات RPC أحادية وبث من الخادم لـ connect-es وconnect-go وSwift وKotlin."
      ],
      [
        "WebRTC",
        "صوت وفيديو وبيانات من نظير إلى نظير؛ يتولى AXTO الإشارات ويوفّر STUN / TURN."
      ],
      [
        "خطافات الويب",
        "استدعاءات HTTPS موقّعة إلى خادمك، مع إعادة المحاولة لمدة 24 ساعة."
      ],
      [
        "MCP",
        "يستخدم وكلاء الذكاء الاصطناعي (Claude Desktop وCursor وVS Code…) أدوات AXTO مباشرة."
      ]
    ],
    "webtransport": "لا نقدّم WebTransport: شبكة Cloudflare الطرفية لا تدعمه بعد. تستخدم حزمة SDK بدلًا منه WebSocket ثم SSE ثم الاستطلاع الطويل.",
    "quickstart": "بدء سريع",
    "copy": "نسخ",
    "copied": "تم النسخ ✓",
    "keys": {
      "new": "مفتاح API جديد",
      "name": "الاسم",
      "namePh": "مثال: الخادم الخلفي للمتجر",
      "scopes": "الأذونات",
      "scopeNames": {
        "ai:run": "تشغيل الذكاء الاصطناعي",
        "events:read": "قراءة الأحداث",
        "events:write": "نشر الأحداث",
        "rtc": "غرف WebRTC",
        "mcp": "أدوات MCP"
      },
      "origins": "أصول المتصفح المسموح بها (واحد في كل سطر)",
      "originsHint": "اتركه فارغًا للاستخدام من الخادم فقط. أضف https://your-site.com للاستدعاء من شيفرة المتصفح في ذلك الموقع، أو * لأي موقع.",
      "create": "إنشاء المفتاح",
      "shownOnce": "انسخ هذا المفتاح الآن — يُعرض مرة واحدة فقط. لا يحتفظ AXTO إلا ببصمته.",
      "none": "لا توجد مفاتيح API بعد.",
      "prefix": "المفتاح",
      "created": "تاريخ الإنشاء",
      "lastUsed": "آخر استخدام",
      "never": "أبدًا",
      "revoke": "إلغاء",
      "revoked": "ملغى",
      "confirmRevoke": "إلغاء هذا المفتاح؟ ستتوقف التطبيقات التي تستخدمه عن العمل فورًا.",
      "edit": "تعديل",
      "save": "حفظ",
      "cancel": "إلغاء الأمر",
      "done": "تم"
    },
    "hooks": {
      "new": "خطاف ويب جديد",
      "url": "عنوان URL لنقطة النهاية (https://…)",
      "channels": "القنوات (مفصولة بفواصل، * للكل، orders.* لبادئة)",
      "types": "أنواع الأحداث (مفصولة بفواصل، * للكل)",
      "create": "إضافة خطاف ويب",
      "secretOnce": "سر التوقيع — انسخه الآن؛ يُعرض مرة واحدة فقط. تحقّق به من X-AXTO-Signature.",
      "none": "لا توجد خطافات ويب بعد.",
      "active": "نشط",
      "paused": "متوقف مؤقتًا",
      "failures": "{n} إخفاقات متتالية",
      "lastStatus": "آخر تسليم: {status}",
      "test": "إرسال اختبار",
      "testResult": "تسليم تجريبي: HTTP {status} خلال {ms} مللي ثانية",
      "rotate": "سر جديد",
      "deliveries": "عمليات التسليم",
      "noDeliveries": "لا توجد عمليات تسليم بعد.",
      "del": "حذف",
      "confirmDel": "حذف خطاف الويب هذا؟",
      "enable": "تشغيل",
      "disable": "إيقاف مؤقت",
      "attempt": "المحاولة {n}",
      "retryAt": "إعادة المحاولة {at}",
      "verify": "كيفية التحقق من التسليم"
    },
    "console": {
      "channels": "القنوات",
      "connect": "اتصال",
      "disconnect": "قطع الاتصال",
      "transport": "وسيلة الاتصال",
      "live": "مباشر · {n} حدثًا",
      "idle": "غير متصل",
      "publish": "نشر حدث",
      "channel": "القناة",
      "type": "النوع",
      "data": "البيانات (JSON)",
      "send": "نشر",
      "badJson": "يجب أن تكون البيانات JSON صالحًا.",
      "empty": "تظهر الأحداث هنا فور وصولها.",
      "clear": "مسح"
    },
    "rtc": {
      "intro": "افتح هذه الصفحة على جهازين (أو علامتي تبويب)، وانضم إلى الغرفة نفسها، وتحدّث من نظير إلى نظير. تنتقل الوسائط مباشرة بين الأجهزة.",
      "room": "الغرفة",
      "create": "غرفة جديدة",
      "join": "انضمام",
      "leave": "مغادرة",
      "camera": "استخدام الكاميرا والميكروفون",
      "status": {
        "idle": "لم تنضم بعد",
        "waiting": "بانتظار الطرف الآخر…",
        "connecting": "جارٍ الاتصال…",
        "connected": "متصل من نظير إلى نظير",
        "failed": "تعذّر الاتصال (قد تحتاج هذه الشبكة إلى خادم TURN)"
      },
      "message": "رسالة",
      "send": "إرسال",
      "turn": "مُرحِّل TURN متاح",
      "noTurn": "STUN فقط (يعمل على معظم الشبكات)",
      "you": "أنت",
      "peer": "الطرف الآخر"
    },
    "errors": {
      "generic": "حدث خطأ ما: {msg}"
    }
  },
};
