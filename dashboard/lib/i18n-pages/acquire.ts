/* AXTO — the site-sale offer (/acquire) in 10 languages. English lives in
 * lib/acquire-copy.ts (rendered statically for search engines); this module is
 * loaded only when a visitor reads the page in another language. */
import type { Lang } from "../i18n-shared";
import { ACQ_EN, type AcqCopy } from "../acquire-copy";

const en = ACQ_EN;

export const ACQ: Record<Lang, AcqCopy> = {
  en,
  id: {
    "eyebrow": "Akuisisi privat · satu pembeli · serah terima penuh",
    "title": "Akuisisi AXTO — platform AI kelas enterprise, lengkap dan sudah berjalan.",
    "lead": "Tujuh aplikasi AI yang sudah live, lini sepuluh produk self-hosted, platform developer realtime, pembayaran dan lisensi untuk seluruh dunia, sepuluh bahasa, serta merek axto.io — diserahkan kepada satu pemilik. Akses administrator diberikan begitu pembayaran Anda terverifikasi; sisanya mengikuti serah terima yang terdokumentasi langkah demi langkah.",
    "price": "Harga penawaran",
    "priceNote": "Akuisisi satu kali atas seluruh bisnis. Escrow dan pembayaran bertahap dapat diatur.",
    "buy": "Mulai akuisisi",
    "guideCta": "Baca panduan pembeli",
    "talk": "Hubungi pemilik",
    "sold": "Penawaran ini sudah diterima — AXTO telah terjual.",
    "paused": "Penawaran sedang dijeda. Hubungi pemilik untuk berdiskusi.",
    "stats": {
      "apps": "aplikasi cloud live",
      "selfHosted": "produk self-hosted",
      "langs": "bahasa",
      "gateways": "metode pembayaran",
      "jurisdictions": "yurisdiksi hukum",
      "tests": "tes otomatis",
      "transports": "cara terhubung"
    },
    "highlightsTitle": "Mengapa platform ini layak dimiliki",
    "highlightsLead": "Produk yang sudah jadi beserta operasionalnya — bukan prototipe, bukan template.",
    "highlights": [
      [
        "🏛️",
        "Tujuh aplikasi AI unggulan",
        "Legal AI dengan 36 workspace ahli dan alat hukum di perangkat, Clipper untuk video pendek viral, AI Studio, Privacy Vault, Compliance Center, Security Analyst, dan pustaka 240 prompt ahli — live di setiap perangkat."
      ],
      [
        "🛡️",
        "Arsitektur privasi yang bisa diverifikasi pembeli",
        "File diproses di perangkat member, AI berjalan dengan kunci milik member atau model di komputernya sendiri (Mode Lokal), dan pekerjaan yang disimpan dienkripsi per akun."
      ],
      [
        "⚙️",
        "Operasi tanpa sentuhan",
        "Pembayaran, aktivasi paket, lisensi, unduhan — dan penjualan ini sendiri — selesai otomatis begitu pembayaran terverifikasi. Portal admin menangani sisanya."
      ],
      [
        "⚡",
        "Platform developer realtime",
        "AXTO Connect: REST, Server-Sent Events, WebSocket, long polling, streaming HTTP/2, API Connect yang kompatibel gRPC, WebRTC, webhook bertanda tangan, dan server MCP untuk agen AI."
      ],
      [
        "🌍",
        "Global sejak hari pertama",
        "Sepuluh bahasa, 200+ yurisdiksi hukum hingga tingkat provinsi dan negara bagian, serta jalur pembayaran dari PayPal dan kartu hingga QRIS, kripto, dan transfer bank."
      ],
      [
        "🐳",
        "Lini produk self-hosted",
        "Edisi Docker untuk Windows, macOS, dan Linux di x86-64 dan ARM64, dengan installer AXTO Setup dan lisensi offline bertanda tangan Ed25519."
      ]
    ],
    "promiseTitle": "Sisi klien sejak rancangan — jaminan privasi kami",
    "promiseLead": "AXTO dibangun agar data member tetap bersama member. Inilah yang dijamin hari ini, secara tepat:",
    "promise": [
      [
        "File tidak pernah meninggalkan perangkat",
        "Dokumen, PDF, spreadsheet, gambar, hasil pindaian, dan video dibuka, dibaca (OCR), diedit, disamarkan, dirender, dan diekspor di browser — PDF.js, Tesseract, ffmpeg.wasm, dan pelacakan wajah di perangkat. Tidak ada yang diunggah untuk diproses."
      ],
      [
        "Kunci, model, atau endpoint milik Anda sendiri",
        "BYOK, BYOX, dan BYOM: setiap permintaan AI berjalan dengan kunci milik member ke penyedia pilihannya (atau server modelnya sendiri). AXTO hanya meneruskan permintaan di edge — tidak menyimpannya dan tidak melatih model dengannya. Kunci disimpan terenkripsi."
      ],
      [
        "Mode Lokal — AI di perangkat member sendiri",
        "Member dapat menghubungkan Ollama, LM Studio, atau server lain yang kompatibel OpenAI di komputernya: prompt dirakit di browser dan permintaan AI tidak pernah melewati server AXTO."
      ],
      [
        "Pekerjaan terenkripsi, satu kunci per akun",
        "Obrolan, proyek, perkara, laporan, dan hasil penyamaran yang disimpan dienkripsi dengan kunci unik untuk setiap akun."
      ],
      [
        "Managed AI — segera hadir",
        "Model yang disediakan AXTO sudah disiapkan tetapi dikunci. Model ini hanya dinyalakan manual saat layanannya siap dan sempurna — tidak ada yang dijual sebelum itu."
      ]
    ],
    "appsTitle": "Semua yang termasuk",
    "appsLead": "Setiap aplikasi di bawah ini sudah live di produksi, di setiap perangkat, dalam sepuluh bahasa.",
    "selfHostedTitle": "Lini produk self-hosted",
    "selfHostedLead": "Image Docker untuk x86-64 dan ARM64, installer AXTO Setup untuk Windows, macOS, dan Linux, lisensi bertanda tangan, dan aktivasi offline.",
    "engineTitle": "Mesin bisnis",
    "engine": [
      [
        "Pembayaran ke seluruh dunia",
        "PayPal, kartu kredit / debit yang diproses di Indonesia dan dicairkan ke rekening bank perusahaan (Xendit atau Midtrans; juga Stripe bila tersedia), QRIS / virtual account / e-wallet Indonesia, kripto lewat NOWPayments, transfer dompet langsung yang dikonfirmasi on-chain, dan transfer bank — masing-masing dengan kredensial live dan sandbox terpisah, terenkripsi."
      ],
      [
        "Langganan dan lisensi seumur hidup",
        "Empat paket dengan prorata berbasis waktu, invoice, dan pengingat perpanjangan; lisensi permanen untuk 1–100 perangkat dengan aktivasi offline bertanda tangan Ed25519."
      ],
      [
        "Platform developer",
        "AXTO Connect memberi setiap paket berbayar kunci API, kanal event live, streaming AI, room WebRTC, webhook bertanda tangan, dan alat MCP — dengan batas paket, enkripsi, dan saklar admin."
      ],
      [
        "Portal admin",
        "Member, pesanan dan pembayaran, lisensi, lisensi seumur hidup, kotak masuk dukungan dengan asisten AI, paket dan harga, API developer, pengaturan pembayaran dan email, rilis, serta log audit lengkap."
      ],
      [
        "Pertumbuhan",
        "Situs publik dengan halaman SEO untuk setiap aplikasi dan yurisdiksi, blog, panduan bantuan, data terstruktur, PWA yang bisa dipasang, dan halaman publik siap iklan."
      ],
      [
        "Kualitas rekayasa",
        "Bertipe dari ujung ke ujung, rangkaian unit test dan end-to-end di CI pada setiap perubahan, pengerasan keamanan, batas laju, dan blueprint arsitektur tertulis."
      ]
    ],
    "stackTitle": "Teknologi",
    "stack": "Next.js 15 di edge global Cloudflare (Pages, Workers, KV, R2) · TypeScript · installer Go · Docker (multi-arsitektur) · perkakas AI di sisi browser (PDF.js, Tesseract, ffmpeg.wasm, MediaPipe) · realtime WebRTC dan WebSocket.",
    "guideTitle": "Panduan pembeli — dari panggilan pertama hingga kepemilikan penuh",
    "guideLead": "Jalur yang jelas untuk transaksi sebesar ini. Setiap langkah bisa dipercepat; tidak ada yang dilewati demi keamanan.",
    "guide": [
      [
        "Panggilan perkenalan",
        "Bertemu pemilik lewat WhatsApp atau video. Sepakati cakupan, jadwal, dan cara pembayaran yang Anda inginkan.",
        "Hari 1"
      ],
      [
        "Tinjau platform",
        "Repositori, blueprint arsitektur, riwayat tes, dan daftar akun yang diserahkan disediakan untuk Anda tinjau; NDA timbal balik dapat ditandatangani lebih dulu.",
        "Hari 1–3"
      ],
      [
        "Uji tuntas teknis",
        "Jalankan sendiri: kodenya bisa di-build, rangkaian unit test dan end-to-end berjalan di CI, dan salinan lokal lengkap menyala dengan satu perintah.",
        "Hari 3–14"
      ],
      [
        "Perjanjian dan escrow",
        "Tanda tangani perjanjian jual beli. Untuk transaksi sebesar ini kami menyarankan agen escrow berlisensi atau pembayaran bertahap.",
        "Hari 7–21"
      ],
      [
        "Pembayaran",
        "Transfer bank ke BNI (SWIFT BNINIDJA), pencairan escrow, kripto, atau PayPal untuk jumlah yang diizinkannya. Pembayaran dicocokkan ke pesanan Anda secara otomatis.",
        "Hari penutupan"
      ],
      [
        "Serah terima otomatis",
        "Akun Anda menjadi administrator begitu pembayaran terverifikasi; domain, Cloudflare, GitHub, dan akun penyedia kemudian diserahkan sesuai daftar periksa.",
        "Penutupan + 1–7 hari"
      ]
    ],
    "timelineTitle": "Jadwal serah terima",
    "timeline": [
      [
        "Menit 0",
        "Akses administrator",
        "Diberikan otomatis saat pembayaran terverifikasi, dikonfirmasi lewat email dan dicatat di log audit."
      ],
      [
        "Hari 1",
        "Kode dan infrastruktur",
        "Repositori GitHub beserta seluruh riwayatnya, akun Cloudflare (Pages, KV, R2, DNS), dan otorisasi transfer domain."
      ],
      [
        "Minggu 1",
        "Pembayaran dan email",
        "Penyedia pembayaran dipindahkan ke perusahaan Anda atau dialihkan ke akun Anda sendiri; pengiriman email dan kotak masuk dukungan."
      ],
      [
        "Minggu 2–4",
        "Alih pengetahuan",
        "Penjelasan arsitektur, pipeline rilis, runbook admin, dan build self-hosted, dengan jawaban tertulis."
      ]
    ],
    "transitionNote": "Dukungan transisi setelah penutupan dapat disepakati dalam perjanjian jual beli.",
    "dataRoomTitle": "Tersedia untuk Anda tinjau",
    "dataRoomLead": "Semua yang dibutuhkan pembeli untuk memverifikasi klaim di halaman ini:",
    "dataRoom": [
      "Kode sumber lengkap beserta riwayatnya — dashboard, engine, installer, CI/CD",
      "Blueprint arsitektur dan keputusan desain, per aplikasi",
      "Rangkaian unit test dan end-to-end beserta riwayat jalannya di CI",
      "Model keamanan: enkripsi per akun, penanganan rahasia, batas laju, log audit",
      "Runbook admin: pembayaran, penjualan situs, lisensi, rilis, self-hosting",
      "Daftar lengkap akun dan aset yang diserahkan"
    ],
    "handoverTitle": "Yang diserahkan kepada Anda",
    "handoverLead": "Akses administrator diberikan otomatis begitu pembayaran Anda terverifikasi. Sisanya menyusul dalam daftar periksa yang tertib bersama pemilik:",
    "handover": [
      "Akses administrator portal AXTO — otomatis saat pembayaran terverifikasi",
      "Domain axto.io di registrar",
      "Akun / zona Cloudflare: proyek Pages, KV, bucket R2, Workers, dan DNS",
      "Repositori GitHub (dashboard, engine, installer, CI/CD) beserta seluruh riwayatnya",
      "Akun penyedia pembayaran — atau peralihan rapi ke akun Anda sendiri (PayPal, Stripe, Xendit, Midtrans, NOWPayments, dompet kripto)",
      "Pengiriman email (Resend) dan kotak masuk dukungan",
      "Image Docker dan pipeline rilis (x86-64 dan ARM64), installer AXTO Setup",
      "Merek, logo, konten, blog, halaman SEO, dan terjemahan (10 bahasa)",
      "Dokumentasi: blueprint arsitektur, runbook admin, panduan CI/CD dan self-hosting"
    ],
    "stepsTitle": "Akuisisi dalam tiga langkah",
    "steps": [
      [
        "Buat atau masuk ke akun Anda",
        "Akun ini akan menjadi administrator."
      ],
      [
        "Bayar harga penawaran",
        "Untuk nilai sebesar ini disarankan transfer bank atau escrow; kripto dan PayPal juga tersedia."
      ],
      [
        "Terima akses administrator",
        "Langsung saat pembayaran terverifikasi — lalu domain, Cloudflare, GitHub, dan akun penyedia diserahkan."
      ]
    ],
    "checkoutTitle": "Checkout aman",
    "escrowNote": "Untuk transaksi sebesar ini kami menyarankan transfer bank atau agen escrow berlisensi. PayPal membatasi pembayaran tunggal.",
    "signInFirst": "Masuk atau buat akun yang akan memiliki AXTO, lalu kembali ke sini untuk membayar.",
    "signIn": "Masuk",
    "register": "Buat akun",
    "company": "Perusahaan (opsional)",
    "name": "Nama Anda",
    "phone": "Telepon / WhatsApp",
    "message": "Pesan untuk pemilik (opsional)",
    "method": "Metode pembayaran",
    "pay": "Bayar {amount}",
    "paying": "Memulai pembayaran aman…",
    "noMethods": "Metode pembayaran online sedang diaktifkan. Hubungi pemilik lewat WhatsApp untuk melanjutkan dengan transfer bank.",
    "paypalLimit": "PayPal membatasi satu kali pembayaran (biasanya hingga {max}). Jika PayPal menolak jumlah penuh, pilih kripto atau transfer bank.",
    "test": "Mode uji",
    "adminNote": "Anda masuk sebagai administrator — masuklah dengan akun pembeli untuk membeli.",
    "wireTitle": "Transfer bank ke BNI — langkah demi langkah",
    "wireIntro": "Transfer tepat sebesar jumlah di bawah. Referensi pesanan Anda menandai pembayaran ini.",
    "amount": "Jumlah",
    "bank": "Bank",
    "holder": "Penerima",
    "swift": "SWIFT / BIC",
    "code": "Kode bank (Indonesia)",
    "account": "Nomor rekening",
    "reference": "Referensi / berita transfer",
    "otherCurrencies": "Rekening dalam mata uang lain",
    "wireSteps": [
      "Buka bank atau layanan transfer Anda dan pilih transfer internasional (SWIFT) ke Bank Negara Indonesia (BNI), SWIFT BNINIDJA. Dari bank di Indonesia pilih “Transfer ke Bank BNI” (kode bank 009) dan gunakan rekening IDR.",
      "Masukkan nomor rekening untuk mata uang yang Anda kirim (disarankan USD) dan nama penerima persis seperti tertera.",
      "Tulis referensi pesanan di berita transfer agar transfer cocok dengan pesanan Anda.",
      "Setelah mengirim, klik “Saya sudah transfer” di bawah dan kirim bukti transfer lewat WhatsApp ke pemilik.",
      "Pemilik memverifikasi dana dan mengonfirmasi pesanan — akun Anda otomatis menjadi administrator dan Anda menerima email."
    ],
    "sentBtn": "Saya sudah transfer",
    "sentPh": "Referensi transfer bank Anda atau nama pengirim",
    "proofSent": "Terima kasih — pemilik memverifikasi transfer (biasanya dalam satu hari kerja) dan akses administrator Anda diberikan begitu terkonfirmasi. Mohon kirim juga buktinya lewat WhatsApp {wa}.",
    "whatsappProof": "Kirim bukti lewat WhatsApp",
    "cryptoTitle": "Bayar dengan kripto",
    "cryptoIntro": "Kirim tepat sejumlah yang ditampilkan di jaringan yang ditampilkan. Pembayaran stablecoin (USDT / USDC) terdeteksi dan dikonfirmasi otomatis; untuk BTC, ETH, atau SOL tempel hash transaksi Anda setelah mengirim.",
    "sendExact": "Kirim tepat",
    "to": "Ke alamat",
    "txPh": "Hash transaksi (TXID)",
    "verify": "Verifikasi pembayaran",
    "waiting": "Menunggu konfirmasi pembayaran — halaman ini diperbarui sendiri.",
    "back": "Pilih metode lain",
    "canceled": "Pembayaran dibatalkan — silakan pilih metode lagi.",
    "proofWa": "Halo, saya sudah transfer untuk akuisisi AXTO. Referensi pesanan: {id}. Berikut bukti transfernya.",
    "handoverWaText": "Halo, pembayaran akuisisi AXTO saya sudah terverifikasi (pesanan {id}). Mari atur serah terima.",
    "paidTitle": "Pembayaran terverifikasi — selamat datang, pemilik AXTO.",
    "paidAdmin": "Akun Anda kini administrator seluruh platform.",
    "paidPending": "Pembayaran Anda tercatat. Akses administrator sedang diberikan oleh pemilik.",
    "paidTest": "Ini pembayaran uji (sandbox) — tidak ada akses yang diubah.",
    "openAdmin": "Buka portal admin",
    "handoverWa": "Koordinasikan serah terima lewat WhatsApp",
    "invoice": "Invoice",
    "faqTitle": "Pertanyaan yang sering diajukan pembeli",
    "faq": [
      [
        "Apa persisnya yang saya miliki setelah pembelian?",
        "Seluruh bisnis sebagaimana adanya: domain, kode sumber dan riwayatnya, aplikasi, produk self-hosted, merek dan konten, serta akun operasional yang tercantum di daftar serah terima. Hak kekayaan intelektual atas kode dan merek beralih kepada Anda."
      ],
      [
        "Bisakah saya meninjau platform sebelum membayar?",
        "Ya. Kode, blueprint arsitektur, riwayat tes, dan daftar akun yang diserahkan disediakan untuk ditinjau sebelum Anda berkomitmen, dan Anda dapat menjalankan salinan lengkapnya sendiri."
      ],
      [
        "Apakah harga bisa dinegosiasikan, atau bisa memakai escrow?",
        "Bicarakan dengan pemilik lewat WhatsApp. Agen escrow berlisensi atau pembayaran bertahap dapat diatur sebelum membayar lewat halaman ini."
      ],
      [
        "Berapa biaya operasionalnya?",
        "Platform berjalan di edge serverless Cloudflare (bayar sesuai pemakaian) ditambah penyedia email. Member membayar penyedia AI mereka sendiri, sehingga pemakaian AI tidak membebani perusahaan."
      ],
      [
        "Bagaimana dengan member yang ada dan datanya?",
        "Akun, paket, dan pekerjaan terenkripsi mereka tetap seperti apa adanya; Anda menjadi operatornya. File mereka tidak pernah diunggah, jadi tidak ada arsip dokumen yang perlu dimigrasikan."
      ],
      [
        "Mengapa PayPal kadang menolak jumlah ini?",
        "PayPal membatasi pembayaran tunggal untuk sebagian besar akun. Transfer bank, escrow, atau kripto dapat menampung harga penuh."
      ],
      [
        "Seberapa cepat akses administrator diberikan?",
        "Langsung untuk pembayaran yang terkonfirmasi otomatis (capture PayPal, kartu, NOWPayments, stablecoin on-chain). Untuk transfer bank atau escrow, segera setelah dana terverifikasi."
      ]
    ]
  },
  ms: {
    "eyebrow": "Pemerolehan persendirian · seorang pembeli · pindah milik penuh",
    "title": "Ambil alih AXTO — platform AI bertaraf perusahaan, lengkap dan sedang beroperasi.",
    "lead": "Tujuh aplikasi AI yang sedang beroperasi, barisan sepuluh produk hos sendiri, platform pembangun masa nyata, pembayaran dan pelesenan seluruh dunia, sepuluh bahasa dan jenama axto.io — dipindahkan kepada seorang pemilik. Akses pentadbir diberikan sebaik pembayaran anda disahkan; selebihnya mengikut penyerahan yang didokumentasikan langkah demi langkah.",
    "price": "Harga tawaran",
    "priceNote": "Pemerolehan sekali gus bagi keseluruhan perniagaan. Escrow dan bayaran berperingkat boleh diatur.",
    "buy": "Mulakan pemerolehan",
    "guideCta": "Baca panduan pembeli",
    "talk": "Hubungi pemilik",
    "sold": "Tawaran ini telah diterima — AXTO telah dijual.",
    "paused": "Tawaran ini sedang dijeda. Hubungi pemilik untuk berbincang.",
    "stats": {
      "apps": "aplikasi awan aktif",
      "selfHosted": "produk hos sendiri",
      "langs": "bahasa",
      "gateways": "kaedah pembayaran",
      "jurisdictions": "bidang kuasa undang-undang",
      "tests": "ujian automatik",
      "transports": "cara bersambung"
    },
    "highlightsTitle": "Mengapa platform ini berbaloi dimiliki",
    "highlightsLead": "Produk yang siap beserta operasinya — bukan prototaip, bukan templat.",
    "highlights": [
      [
        "🏛️",
        "Tujuh aplikasi AI utama",
        "Legal AI dengan 36 ruang kerja pakar dan alat undang-undang pada peranti, Clipper untuk video pendek tular, AI Studio, Privacy Vault, Compliance Center, Security Analyst dan pustaka 240 prompt pakar — aktif pada setiap peranti."
      ],
      [
        "🛡️",
        "Seni bina privasi yang boleh disahkan pembeli",
        "Fail diproses pada peranti ahli, AI berjalan dengan kunci ahli sendiri atau model pada komputernya sendiri (Mod Tempatan), dan kerja yang disimpan disulitkan bagi setiap akaun."
      ],
      [
        "⚙️",
        "Operasi tanpa sentuhan",
        "Pembayaran, pengaktifan pelan, lesen, muat turun — dan jualan ini sendiri — selesai secara automatik sebaik pembayaran disahkan. Portal pentadbir mengurus selebihnya."
      ],
      [
        "⚡",
        "Platform pembangun masa nyata",
        "AXTO Connect: REST, Server-Sent Events, WebSocket, long polling, penstriman HTTP/2, API Connect yang serasi gRPC, WebRTC, webhook bertandatangan dan pelayan MCP untuk ejen AI."
      ],
      [
        "🌍",
        "Global sejak hari pertama",
        "Sepuluh bahasa, 200+ bidang kuasa undang-undang hingga peringkat negeri dan wilayah, serta saluran pembayaran daripada PayPal dan kad hingga QRIS, kripto dan pindahan bank."
      ],
      [
        "🐳",
        "Barisan produk hos sendiri",
        "Edisi Docker untuk Windows, macOS dan Linux pada x86-64 dan ARM64, dengan pemasang AXTO Setup dan lesen luar talian bertandatangan Ed25519."
      ]
    ],
    "promiseTitle": "Di sisi klien sejak reka bentuk — jaminan privasi kami",
    "promiseLead": "AXTO dibina supaya data ahli kekal bersama ahli. Inilah yang dijamin hari ini, dengan tepat:",
    "promise": [
      [
        "Fail tidak pernah meninggalkan peranti",
        "Dokumen, PDF, hamparan, imej, imbasan dan video dibuka, dibaca (OCR), disunting, disamarkan, dirender dan dieksport dalam pelayar — PDF.js, Tesseract, ffmpeg.wasm dan penjejakan wajah pada peranti. Tiada apa-apa dimuat naik untuk diproses."
      ],
      [
        "Kunci, model atau titik akhir anda sendiri",
        "BYOK, BYOX dan BYOM: setiap permintaan AI berjalan dengan kunci ahli sendiri kepada penyedia pilihannya (atau pelayan modelnya sendiri). AXTO hanya menghantar semula permintaan di edge — tidak menyimpannya dan tidak melatih model dengannya. Kunci disimpan tersulit."
      ],
      [
        "Mod Tempatan — AI pada peranti ahli sendiri",
        "Ahli boleh menyambungkan Ollama, LM Studio atau pelayan lain yang serasi OpenAI pada komputer mereka: prompt dibina dalam pelayar dan permintaan AI tidak pernah melalui pelayan AXTO."
      ],
      [
        "Kerja tersulit, satu kunci bagi setiap akaun",
        "Sembang, projek, perkara, laporan dan penyamaran yang disimpan disulitkan dengan kunci unik bagi setiap akaun."
      ],
      [
        "Managed AI — akan datang",
        "Model yang disediakan AXTO telah disiapkan tetapi dikunci. Ia hanya dihidupkan secara manual apabila perkhidmatan sedia dan sempurna — tiada apa-apa dijual sebelum itu."
      ]
    ],
    "appsTitle": "Semua yang disertakan",
    "appsLead": "Setiap aplikasi di bawah sedang beroperasi dalam pengeluaran, pada setiap peranti, dalam sepuluh bahasa.",
    "selfHostedTitle": "Barisan produk hos sendiri",
    "selfHostedLead": "Imej Docker untuk x86-64 dan ARM64, pemasang AXTO Setup untuk Windows, macOS dan Linux, lesen bertandatangan dan pengaktifan luar talian.",
    "engineTitle": "Enjin perniagaan",
    "engine": [
      [
        "Pembayaran, seluruh dunia",
        "PayPal, kad kredit / debit yang diproses di Indonesia dan dibayar ke akaun bank syarikat (Xendit atau Midtrans; juga Stripe jika tersedia), QRIS / akaun maya / e-dompet Indonesia, kripto melalui NOWPayments, pindahan dompet terus yang disahkan on-chain dan pindahan bank — setiap satu dengan kelayakan live dan sandbox berasingan, tersulit."
      ],
      [
        "Langganan dan lesen seumur hidup",
        "Empat pelan dengan prorata berasaskan masa, invois dan peringatan pembaharuan; lesen kekal untuk 1–100 peranti dengan pengaktifan luar talian bertandatangan Ed25519."
      ],
      [
        "Platform pembangun",
        "AXTO Connect memberi setiap pelan berbayar kunci API, saluran acara langsung, penstriman AI, bilik WebRTC, webhook bertandatangan dan alat MCP — dengan had pelan, penyulitan dan suis pentadbir."
      ],
      [
        "Portal pentadbir",
        "Ahli, pesanan dan pembayaran, lesen, lesen seumur hidup, peti masuk sokongan dengan pembantu AI, pelan dan harga, API pembangun, tetapan pembayaran dan e-mel, keluaran serta log audit lengkap."
      ],
      [
        "Pertumbuhan",
        "Laman awam dengan halaman SEO untuk setiap aplikasi dan bidang kuasa, blog, panduan bantuan, data berstruktur, PWA yang boleh dipasang dan halaman awam sedia iklan."
      ],
      [
        "Kualiti kejuruteraan",
        "Bertip dari hujung ke hujung, suite ujian unit dan hujung ke hujung dalam CI pada setiap perubahan, pengukuhan keselamatan, had kadar dan blueprint seni bina bertulis."
      ]
    ],
    "stackTitle": "Teknologi",
    "stack": "Next.js 15 di edge global Cloudflare (Pages, Workers, KV, R2) · TypeScript · pemasang Go · Docker (pelbagai seni bina) · alat AI di sisi pelayar (PDF.js, Tesseract, ffmpeg.wasm, MediaPipe) · masa nyata WebRTC dan WebSocket.",
    "guideTitle": "Panduan pembeli — daripada panggilan pertama hingga pemilikan penuh",
    "guideLead": "Laluan yang jelas untuk transaksi sebesar ini. Setiap langkah boleh dipercepat; tiada yang dilangkau atas nama keselamatan.",
    "guide": [
      [
        "Panggilan perkenalan",
        "Bertemu pemilik melalui WhatsApp atau video. Persetujui skop, garis masa dan cara anda mahu membayar.",
        "Hari 1"
      ],
      [
        "Semak platform",
        "Repositori, blueprint seni bina, sejarah ujian dan senarai akaun yang dipindahkan disediakan untuk semakan anda; NDA bersama boleh ditandatangani dahulu.",
        "Hari 1–3"
      ],
      [
        "Usaha wajar teknikal",
        "Jalankannya sendiri: kod boleh dibina, suite ujian unit dan hujung ke hujung berjalan dalam CI, dan salinan tempatan penuh bermula dengan satu arahan.",
        "Hari 3–14"
      ],
      [
        "Perjanjian dan escrow",
        "Tandatangani perjanjian jual beli. Untuk transaksi sebesar ini kami mengesyorkan ejen escrow berlesen atau bayaran berperingkat.",
        "Hari 7–21"
      ],
      [
        "Pembayaran",
        "Pindahan bank ke BNI (SWIFT BNINIDJA), pelepasan escrow, kripto atau PayPal bagi jumlah yang dibenarkannya. Pembayaran dipadankan dengan pesanan anda secara automatik.",
        "Hari penutupan"
      ],
      [
        "Penyerahan automatik",
        "Akaun anda menjadi pentadbir sebaik pembayaran disahkan; domain, Cloudflare, GitHub dan akaun penyedia kemudian dipindahkan mengikut senarai semak.",
        "Penutupan + 1–7 hari"
      ]
    ],
    "timelineTitle": "Garis masa penyerahan",
    "timeline": [
      [
        "Minit 0",
        "Akses pentadbir",
        "Diberikan secara automatik apabila pembayaran disahkan, disahkan melalui e-mel dan direkodkan dalam log audit."
      ],
      [
        "Hari 1",
        "Kod dan infrastruktur",
        "Repositori GitHub dengan sejarah penuh, akaun Cloudflare (Pages, KV, R2, DNS) dan kebenaran pemindahan domain."
      ],
      [
        "Minggu 1",
        "Pembayaran dan e-mel",
        "Penyedia pembayaran dipindahkan ke syarikat anda atau ditukar ke akaun anda sendiri; penghantaran e-mel dan peti masuk sokongan."
      ],
      [
        "Minggu 2–4",
        "Pemindahan pengetahuan",
        "Penerangan seni bina, saluran keluaran, runbook pentadbir dan binaan hos sendiri, dengan jawapan bertulis."
      ]
    ],
    "transitionNote": "Sokongan peralihan selepas penutupan boleh dipersetujui dalam perjanjian jual beli.",
    "dataRoomTitle": "Tersedia untuk semakan anda",
    "dataRoomLead": "Semua yang diperlukan pembeli untuk mengesahkan dakwaan di halaman ini:",
    "dataRoom": [
      "Kod sumber penuh dengan sejarah — dashboard, enjin, pemasang, CI/CD",
      "Blueprint seni bina dan keputusan reka bentuk, aplikasi demi aplikasi",
      "Suite ujian unit dan hujung ke hujung dengan sejarah larian CI",
      "Model keselamatan: penyulitan setiap akaun, pengendalian rahsia, had kadar, log audit",
      "Runbook pentadbir: pembayaran, jualan laman, lesen, keluaran, hos sendiri",
      "Senarai lengkap akaun dan aset yang dipindahkan"
    ],
    "handoverTitle": "Apa yang dipindahkan kepada anda",
    "handoverLead": "Akses pentadbir diberikan secara automatik sebaik pembayaran anda disahkan. Selebihnya menyusul dalam senarai semak yang teratur bersama pemilik:",
    "handover": [
      "Akses pentadbir ke portal AXTO — automatik apabila pembayaran disahkan",
      "Domain axto.io di pendaftar",
      "Akaun / zon Cloudflare: projek Pages, KV, baldi R2, Workers dan DNS",
      "Repositori GitHub (dashboard, enjin, pemasang, CI/CD) dengan sejarah penuh",
      "Akaun penyedia pembayaran — atau pertukaran kemas ke akaun anda sendiri (PayPal, Stripe, Xendit, Midtrans, NOWPayments, dompet kripto)",
      "Penghantaran e-mel (Resend) dan peti masuk sokongan",
      "Imej Docker dan saluran keluaran (x86-64 dan ARM64), pemasang AXTO Setup",
      "Jenama, logo, kandungan, blog, halaman SEO dan terjemahan (10 bahasa)",
      "Dokumentasi: blueprint seni bina, runbook pentadbir, panduan CI/CD dan hos sendiri"
    ],
    "stepsTitle": "Ambil alih dalam tiga langkah",
    "steps": [
      [
        "Cipta atau log masuk ke akaun anda",
        "Akaun ini akan menjadi pentadbir."
      ],
      [
        "Bayar harga tawaran",
        "Pindahan bank atau escrow disyorkan bagi nilai sebesar ini; kripto dan PayPal juga tersedia."
      ],
      [
        "Terima akses pentadbir",
        "Serta-merta apabila pembayaran disahkan — kemudian domain, Cloudflare, GitHub dan akaun penyedia dipindahkan."
      ]
    ],
    "checkoutTitle": "Pembayaran selamat",
    "escrowNote": "Untuk transaksi sebesar ini kami mengesyorkan pindahan bank atau ejen escrow berlesen. PayPal mengehadkan bayaran tunggal.",
    "signInFirst": "Log masuk atau cipta akaun yang akan memiliki AXTO, kemudian kembali ke sini untuk membayar.",
    "signIn": "Log masuk",
    "register": "Cipta akaun",
    "company": "Syarikat (pilihan)",
    "name": "Nama anda",
    "phone": "Telefon / WhatsApp",
    "message": "Mesej kepada pemilik (pilihan)",
    "method": "Kaedah pembayaran",
    "pay": "Bayar {amount}",
    "paying": "Memulakan pembayaran selamat…",
    "noMethods": "Kaedah pembayaran dalam talian sedang dihidupkan. Hubungi pemilik melalui WhatsApp untuk meneruskan dengan pindahan bank.",
    "paypalLimit": "PayPal mengehadkan bayaran tunggal (biasanya sehingga {max}). Jika PayPal menolak jumlah penuh, pilih kripto atau pindahan bank.",
    "test": "Mod ujian",
    "adminNote": "Anda log masuk sebagai pentadbir — log masuk dengan akaun pembeli untuk membeli.",
    "wireTitle": "Pindahan bank ke BNI — langkah demi langkah",
    "wireIntro": "Pindahkan tepat jumlah di bawah. Rujukan pesanan anda mengenal pasti pembayaran.",
    "amount": "Jumlah",
    "bank": "Bank",
    "holder": "Penerima",
    "swift": "SWIFT / BIC",
    "code": "Kod bank (Indonesia)",
    "account": "Nombor akaun",
    "reference": "Rujukan / nota pembayaran",
    "otherCurrencies": "Akaun dalam mata wang lain",
    "wireSteps": [
      "Buka bank atau perkhidmatan pindahan anda dan pilih pindahan antarabangsa (SWIFT) ke Bank Negara Indonesia (BNI), SWIFT BNINIDJA. Dari bank Indonesia pilih “Transfer ke Bank BNI” (kod bank 009) dan gunakan akaun IDR.",
      "Masukkan nombor akaun bagi mata wang yang anda hantar (USD disyorkan) dan nama penerima tepat seperti dipaparkan.",
      "Tulis rujukan pesanan dalam nota pembayaran supaya pindahan dipadankan dengan pesanan anda.",
      "Selepas menghantar, klik “Saya telah membuat pindahan” di bawah dan hantar resit pindahan melalui WhatsApp kepada pemilik.",
      "Pemilik mengesahkan dana dan pesanan — akaun anda menjadi pentadbir secara automatik dan anda menerima e-mel."
    ],
    "sentBtn": "Saya telah membuat pindahan",
    "sentPh": "Rujukan pindahan bank anda atau nama pengirim",
    "proofSent": "Terima kasih — pemilik mengesahkan pindahan (biasanya dalam satu hari bekerja) dan akses pentadbir anda diberikan sebaik disahkan. Sila hantar juga resit melalui WhatsApp {wa}.",
    "whatsappProof": "Hantar resit melalui WhatsApp",
    "cryptoTitle": "Bayar dengan kripto",
    "cryptoIntro": "Hantar tepat jumlah yang dipaparkan pada rangkaian yang dipaparkan. Bayaran stablecoin (USDT / USDC) dikesan dan disahkan secara automatik; untuk BTC, ETH atau SOL tampal hash transaksi anda selepas menghantar.",
    "sendExact": "Hantar tepat",
    "to": "Ke alamat",
    "txPh": "Hash transaksi (TXID)",
    "verify": "Sahkan pembayaran",
    "waiting": "Menunggu pembayaran disahkan — halaman ini dikemas kini sendiri.",
    "back": "Pilih kaedah lain",
    "canceled": "Pembayaran dibatalkan — pilih kaedah sekali lagi.",
    "proofWa": "Hai, saya telah membuat pindahan untuk pemerolehan AXTO. Rujukan pesanan: {id}. Ini resit pindahannya.",
    "handoverWaText": "Hai, pembayaran pemerolehan AXTO saya telah disahkan (pesanan {id}). Mari atur penyerahan.",
    "paidTitle": "Pembayaran disahkan — selamat datang, pemilik AXTO.",
    "paidAdmin": "Akaun anda kini pentadbir bagi keseluruhan platform.",
    "paidPending": "Pembayaran anda direkodkan. Akses pentadbir sedang diberikan oleh pemilik.",
    "paidTest": "Ini bayaran ujian (sandbox) — tiada akses diubah.",
    "openAdmin": "Buka portal pentadbir",
    "handoverWa": "Selaraskan penyerahan melalui WhatsApp",
    "invoice": "Invois",
    "faqTitle": "Soalan yang ditanya pembeli",
    "faq": [
      [
        "Apa sebenarnya yang saya miliki selepas pembelian?",
        "Keseluruhan perniagaan sebagaimana adanya: domain, kod sumber dan sejarahnya, aplikasi, produk hos sendiri, jenama dan kandungan, serta akaun operasi yang disenaraikan dalam senarai semak penyerahan. Harta intelek dalam kod dan jenama berpindah kepada anda."
      ],
      [
        "Bolehkah saya menyemak platform sebelum membayar?",
        "Ya. Kod, blueprint seni bina, sejarah ujian dan senarai akaun yang dipindahkan disediakan untuk semakan sebelum anda komited, dan anda boleh menjalankan salinan penuh sendiri."
      ],
      [
        "Adakah harga boleh dirunding, atau bolehkah kami menggunakan escrow?",
        "Berbincang dengan pemilik melalui WhatsApp. Ejen escrow berlesen atau bayaran berperingkat boleh diatur sebelum membayar melalui halaman ini."
      ],
      [
        "Berapakah kos operasinya?",
        "Platform berjalan di edge tanpa pelayan Cloudflare (bayar ikut guna) serta penyedia e-mel. Ahli membayar penyedia AI mereka sendiri, jadi penggunaan AI tidak membebankan syarikat."
      ],
      [
        "Apa yang berlaku kepada ahli sedia ada dan data mereka?",
        "Akaun, pelan dan kerja tersulit mereka kekal seperti sedia ada; anda menjadi pengendali. Fail mereka tidak pernah dimuat naik, jadi tiada arkib dokumen untuk dipindahkan."
      ],
      [
        "Mengapa PayPal kadangkala menolak jumlah ini?",
        "PayPal mengehadkan bayaran tunggal bagi kebanyakan akaun. Pindahan bank, escrow atau kripto boleh menampung harga penuh."
      ],
      [
        "Berapa cepat akses pentadbir diberikan?",
        "Serta-merta untuk bayaran yang disahkan secara automatik (tangkapan PayPal, kad, NOWPayments, stablecoin on-chain). Untuk pindahan bank atau escrow, sebaik dana disahkan."
      ]
    ]
  },
  de: {
    "eyebrow": "Private Übernahme · ein Käufer · vollständige Übergabe",
    "title": "Übernehmen Sie AXTO — eine KI-Plattform auf Enterprise-Niveau, vollständig und im Betrieb.",
    "lead": "Sieben produktive KI-Anwendungen, eine Selfhosting-Linie mit zehn Produkten, eine Echtzeit-Entwicklerplattform, weltweite Zahlungen und Lizenzierung, zehn Sprachen und die Marke axto.io — übertragen an einen einzigen Eigentümer. Der Administratorzugang wird freigeschaltet, sobald Ihre Zahlung verifiziert ist; alles Weitere folgt einer dokumentierten Übergabe Schritt für Schritt.",
    "price": "Kaufpreis",
    "priceNote": "Einmaliger Erwerb des gesamten Unternehmens. Treuhand und Ratenzahlung sind möglich.",
    "buy": "Übernahme starten",
    "guideCta": "Leitfaden für Käufer lesen",
    "talk": "Mit dem Eigentümer sprechen",
    "sold": "Dieses Angebot wurde angenommen — AXTO ist verkauft.",
    "paused": "Das Angebot ist derzeit pausiert. Wenden Sie sich an den Eigentümer.",
    "stats": {
      "apps": "aktive Cloud-Apps",
      "selfHosted": "Selfhosting-Produkte",
      "langs": "Sprachen",
      "gateways": "Zahlungsarten",
      "jurisdictions": "Rechtsordnungen",
      "tests": "automatisierte Tests",
      "transports": "Anbindungswege"
    },
    "highlightsTitle": "Warum sich diese Plattform lohnt",
    "highlightsLead": "Ein fertiges Produkt mit dem Betrieb drumherum — kein Prototyp, keine Vorlage.",
    "highlights": [
      [
        "🏛️",
        "Sieben KI-Flaggschiff-Anwendungen",
        "Legal AI mit 36 Experten-Arbeitsbereichen und Rechtswerkzeugen auf dem Gerät, Clipper für virale Kurzvideos, AI Studio, Privacy Vault, Compliance Center, Security Analyst und eine Bibliothek mit 240 Experten-Prompts — produktiv auf jedem Gerät."
      ],
      [
        "🛡️",
        "Eine überprüfbare Datenschutzarchitektur",
        "Dateien werden auf dem Gerät des Mitglieds verarbeitet, KI läuft mit den eigenen Schlüsseln des Mitglieds oder mit einem Modell auf seinem eigenen Computer (Lokaler Modus), und gespeicherte Arbeit wird pro Konto verschlüsselt."
      ],
      [
        "⚙️",
        "Betrieb ohne Handgriffe",
        "Zahlungen, Tarifaktivierung, Lizenzen, Downloads — und dieser Verkauf selbst — laufen nach verifizierter Zahlung automatisch ab. Das Admin-Portal deckt den Rest ab."
      ],
      [
        "⚡",
        "Eine Echtzeit-Entwicklerplattform",
        "AXTO Connect: REST, Server-Sent Events, WebSocket, Long Polling, HTTP/2-Streaming, eine gRPC-kompatible Connect-API, WebRTC, signierte Webhooks und ein MCP-Server für KI-Agenten."
      ],
      [
        "🌍",
        "Global vom ersten Tag an",
        "Zehn Sprachen, über 200 Rechtsordnungen bis auf Bundesland- und Provinzebene und Zahlungswege von PayPal und Karten bis QRIS, Krypto und Banküberweisung."
      ],
      [
        "🐳",
        "Eine Selfhosting-Produktlinie",
        "Docker-Editionen für Windows, macOS und Linux auf x86-64 und ARM64, mit dem Installer AXTO Setup und Ed25519-signierten Offline-Lizenzen."
      ]
    ],
    "promiseTitle": "Clientseitig konzipiert — unser Datenschutzversprechen",
    "promiseLead": "AXTO wurde so gebaut, dass die Daten des Mitglieds beim Mitglied bleiben. Das ist heute garantiert, genau so:",
    "promise": [
      [
        "Dateien verlassen nie das Gerät",
        "Dokumente, PDFs, Tabellen, Bilder, Scans und Videos werden im Browser geöffnet, gelesen (OCR), bearbeitet, geschwärzt, gerendert und exportiert — mit PDF.js, Tesseract, ffmpeg.wasm und Gesichtserkennung auf dem Gerät. Nichts wird zur Verarbeitung hochgeladen."
      ],
      [
        "Eigener Schlüssel, eigenes Modell, eigener Endpunkt",
        "BYOK, BYOX und BYOM: Jede KI-Anfrage läuft mit dem eigenen Schlüssel des Mitglieds beim gewählten Anbieter (oder auf seinem eigenen Modellserver). AXTO leitet die Anfrage am Edge nur weiter — speichert sie nie und trainiert nie damit. Schlüssel werden verschlüsselt gespeichert."
      ],
      [
        "Lokaler Modus — KI auf dem eigenen Gerät",
        "Mitglieder können Ollama, LM Studio oder einen anderen OpenAI-kompatiblen Server auf ihrem Computer anbinden: Der Prompt entsteht im Browser, und die KI-Anfrage läuft nie über die Server von AXTO."
      ],
      [
        "Verschlüsselte Arbeit, ein Schlüssel pro Konto",
        "Gespeicherte Chats, Projekte, Mandate, Berichte und Schwärzungen werden mit einem für jedes Konto eigenen Schlüssel verschlüsselt."
      ],
      [
        "Managed AI — demnächst",
        "Von AXTO bereitgestellte Modelle sind vorbereitet, aber gesperrt. Sie werden erst manuell freigeschaltet, wenn der Dienst bereit und ausgereift ist — vorher wird nichts verkauft."
      ]
    ],
    "appsTitle": "Alles, was enthalten ist",
    "appsLead": "Jede App unten ist produktiv im Einsatz, auf jedem Gerät, in zehn Sprachen.",
    "selfHostedTitle": "Selfhosting-Produktlinie",
    "selfHostedLead": "Docker-Images für x86-64 und ARM64, der Installer AXTO Setup für Windows, macOS und Linux, signierte Lizenzen und Offline-Aktivierung.",
    "engineTitle": "Der Geschäftsmotor",
    "engine": [
      [
        "Zahlungen weltweit",
        "PayPal, in Indonesien verarbeitete Kredit- und Debitkarten mit Auszahlung auf das Firmenkonto (Xendit oder Midtrans; Stripe, wo verfügbar), indonesisches QRIS / virtuelle Konten / E-Wallets, Krypto über NOWPayments, direkte Wallet-Überweisungen mit On-Chain-Bestätigung und Banküberweisung — jeweils mit getrennten, verschlüsselten Live- und Sandbox-Zugangsdaten."
      ],
      [
        "Abonnements und Lifetime-Lizenzen",
        "Vier Tarife mit zeitanteiliger Abrechnung, Rechnungen und Verlängerungserinnerungen; unbefristete Lizenzen für 1–100 Geräte mit Ed25519-signierter Offline-Aktivierung."
      ],
      [
        "Entwicklerplattform",
        "AXTO Connect gibt jedem bezahlten Tarif API-Schlüssel, Live-Ereigniskanäle, KI-Streaming, WebRTC-Räume, signierte Webhooks und MCP-Werkzeuge — mit Tariflimits, Verschlüsselung und einem Admin-Schalter."
      ],
      [
        "Admin-Portal",
        "Mitglieder, Bestellungen und Zahlungen, Lizenzen, Lifetime-Lizenzen, Support-Postfach mit KI-Assistent, Tarife und Preise, Entwickler-API, Zahlungs- und E-Mail-Einstellungen, Releases und ein vollständiges Audit-Log."
      ],
      [
        "Wachstum",
        "Öffentliche Website mit SEO-Seiten für jede App und Rechtsordnung, Blog, Hilfe-Leitfäden, strukturierte Daten, installierbare PWA und werbefähige öffentliche Seiten."
      ],
      [
        "Engineering-Qualität",
        "Durchgehend typisiert, Unit- und End-to-End-Tests in der CI bei jeder Änderung, Sicherheitshärtung, Ratenbegrenzung und ein schriftliches Architektur-Blueprint."
      ]
    ],
    "stackTitle": "Technologie",
    "stack": "Next.js 15 am globalen Edge von Cloudflare (Pages, Workers, KV, R2) · TypeScript · Go-Installer · Docker (Multi-Arch) · KI-Werkzeuge im Browser (PDF.js, Tesseract, ffmpeg.wasm, MediaPipe) · Echtzeit über WebRTC und WebSocket.",
    "guideTitle": "Leitfaden für Käufer — vom ersten Gespräch zum vollen Eigentum",
    "guideLead": "Ein klarer Weg für eine Transaktion dieser Größe. Jeder Schritt lässt sich beschleunigen; keiner wird zulasten der Sicherheit übersprungen.",
    "guide": [
      [
        "Kennenlerngespräch",
        "Treffen Sie den Eigentümer per WhatsApp oder Video. Vereinbaren Sie Umfang, Zeitplan und Zahlungsweg.",
        "Tag 1"
      ],
      [
        "Plattform prüfen",
        "Repositories, Architektur-Blueprint, Testhistorie und die Liste der zu übertragenden Konten werden Ihnen zur Prüfung bereitgestellt; vorab kann eine gegenseitige Geheimhaltungsvereinbarung unterzeichnet werden.",
        "Tag 1–3"
      ],
      [
        "Technische Due Diligence",
        "Testen Sie selbst: Der Code lässt sich bauen, die Unit- und End-to-End-Tests laufen in der CI, und eine vollständige lokale Kopie startet mit einem Befehl.",
        "Tag 3–14"
      ],
      [
        "Vertrag und Treuhand",
        "Unterzeichnen Sie den Kaufvertrag. Für eine Transaktion dieser Größe empfehlen wir einen lizenzierten Treuhänder oder eine Zahlung in Raten.",
        "Tag 7–21"
      ],
      [
        "Zahlung",
        "Banküberweisung an die BNI (SWIFT BNINIDJA), Freigabe aus der Treuhand, Krypto oder PayPal für die zulässigen Beträge. Die Zahlung wird Ihrer Bestellung automatisch zugeordnet.",
        "Abschlusstag"
      ],
      [
        "Automatische Übergabe",
        "Ihr Konto wird Administrator, sobald die Zahlung verifiziert ist; Domain, Cloudflare, GitHub und Anbieterkonten werden anschließend nach Checkliste übertragen.",
        "Abschluss + 1–7 Tage"
      ]
    ],
    "timelineTitle": "Zeitplan der Übergabe",
    "timeline": [
      [
        "Minute 0",
        "Administratorzugang",
        "Automatisch freigeschaltet, wenn die Zahlung verifiziert ist, per E-Mail bestätigt und im Audit-Log protokolliert."
      ],
      [
        "Tag 1",
        "Code und Infrastruktur",
        "GitHub-Repositories mit vollständiger Historie, das Cloudflare-Konto (Pages, KV, R2, DNS) und die Freigabe zum Domain-Transfer."
      ],
      [
        "Woche 1",
        "Zahlungen und E-Mail",
        "Zahlungsanbieter werden auf Ihr Unternehmen übertragen oder auf Ihre eigenen Konten umgestellt; E-Mail-Versand und Support-Postfächer."
      ],
      [
        "Woche 2–4",
        "Wissenstransfer",
        "Durchgänge durch Architektur, Release-Pipeline, Admin-Runbooks und den Selfhosting-Build, mit schriftlichen Antworten."
      ]
    ],
    "transitionNote": "Optionale Übergangsunterstützung nach dem Abschluss kann im Kaufvertrag vereinbart werden.",
    "dataRoomTitle": "Zur Prüfung bereitgestellt",
    "dataRoomLead": "Alles, was ein Käufer braucht, um die Aussagen auf dieser Seite zu überprüfen:",
    "dataRoom": [
      "Vollständiger Quellcode mit Historie — Dashboard, Engines, Installer, CI/CD",
      "Architektur-Blueprint und Designentscheidungen, App für App",
      "Unit- und End-to-End-Tests mit ihrer CI-Laufhistorie",
      "Sicherheitsmodell: Verschlüsselung pro Konto, Umgang mit Geheimnissen, Ratenbegrenzung, Audit-Log",
      "Admin-Runbooks: Zahlungen, Website-Verkauf, Lizenzen, Releases, Selfhosting",
      "Die vollständige Liste der übertragenen Konten und Vermögenswerte"
    ],
    "handoverTitle": "Was auf Sie übergeht",
    "handoverLead": "Der Administratorzugang wird automatisch freigeschaltet, sobald Ihre Zahlung verifiziert ist. Der Rest folgt in einer geordneten Checkliste mit dem Eigentümer:",
    "handover": [
      "Administratorzugang zum AXTO-Portal — automatisch nach verifizierter Zahlung",
      "Domain axto.io beim Registrar",
      "Cloudflare-Konto / Zone: Pages-Projekt, KV, R2-Buckets, Workers und DNS",
      "GitHub-Repositories (Dashboard, Engines, Installer, CI/CD) mit vollständiger Historie",
      "Konten der Zahlungsanbieter — oder ein sauberer Wechsel zu Ihren eigenen (PayPal, Stripe, Xendit, Midtrans, NOWPayments, Krypto-Wallets)",
      "E-Mail-Versand (Resend) und Support-Postfächer",
      "Docker-Images und die Release-Pipeline (x86-64 und ARM64), Installer AXTO Setup",
      "Marke, Logo, Inhalte, Blog, SEO-Seiten und Übersetzungen (10 Sprachen)",
      "Dokumentation: Architektur-Blueprint, Admin-Runbooks, CI/CD- und Selfhosting-Leitfäden"
    ],
    "stepsTitle": "Übernahme in drei Schritten",
    "steps": [
      [
        "Konto erstellen oder anmelden",
        "Dieses Konto wird der Administrator."
      ],
      [
        "Kaufpreis zahlen",
        "Bei dieser Größenordnung empfehlen sich Banküberweisung oder Treuhand; Krypto und PayPal stehen ebenfalls zur Verfügung."
      ],
      [
        "Administratorzugang erhalten",
        "Sofort nach verifizierter Zahlung — danach werden Domain, Cloudflare, GitHub und Anbieterkonten übertragen."
      ]
    ],
    "checkoutTitle": "Sicherer Checkout",
    "escrowNote": "Für eine Transaktion dieser Größe empfehlen wir eine Banküberweisung oder einen lizenzierten Treuhänder. PayPal begrenzt Einzelzahlungen.",
    "signInFirst": "Melden Sie sich an oder erstellen Sie das Konto, dem AXTO gehören soll, und kehren Sie dann zum Bezahlen hierher zurück.",
    "signIn": "Anmelden",
    "register": "Konto erstellen",
    "company": "Unternehmen (optional)",
    "name": "Ihr Name",
    "phone": "Telefon / WhatsApp",
    "message": "Nachricht an den Eigentümer (optional)",
    "method": "Zahlungsart",
    "pay": "{amount} bezahlen",
    "paying": "Sichere Zahlung wird gestartet…",
    "noMethods": "Online-Zahlungsarten werden gerade freigeschaltet. Kontaktieren Sie den Eigentümer per WhatsApp, um per Banküberweisung fortzufahren.",
    "paypalLimit": "PayPal begrenzt eine Einzelzahlung (meist bis {max}). Lehnt PayPal den vollen Betrag ab, wählen Sie Krypto oder eine Banküberweisung.",
    "test": "Testmodus",
    "adminNote": "Sie sind als Administrator angemeldet — melden Sie sich mit dem Konto des Käufers an, um zu kaufen.",
    "wireTitle": "Banküberweisung an die BNI — Schritt für Schritt",
    "wireIntro": "Überweisen Sie genau den unten stehenden Betrag. Ihre Bestellreferenz ordnet die Zahlung zu.",
    "amount": "Betrag",
    "bank": "Bank",
    "holder": "Empfänger",
    "swift": "SWIFT / BIC",
    "code": "Bankcode (Indonesien)",
    "account": "Kontonummer",
    "reference": "Referenz / Verwendungszweck",
    "otherCurrencies": "Konten in anderen Währungen",
    "wireSteps": [
      "Öffnen Sie Ihre Bank oder Ihren Überweisungsdienst und wählen Sie eine internationale (SWIFT-)Überweisung an die Bank Negara Indonesia (BNI), SWIFT BNINIDJA. Von einer indonesischen Bank wählen Sie „Transfer ke Bank BNI“ (Bankcode 009) und das IDR-Konto.",
      "Geben Sie die Kontonummer für die gesendete Währung (USD empfohlen) und den Empfängernamen genau wie angezeigt ein.",
      "Schreiben Sie die Bestellreferenz in den Verwendungszweck, damit die Überweisung Ihrer Bestellung zugeordnet wird.",
      "Klicken Sie nach dem Senden unten auf „Ich habe überwiesen“ und senden Sie den Überweisungsbeleg per WhatsApp an den Eigentümer.",
      "Der Eigentümer prüft den Geldeingang und bestätigt die Bestellung — Ihr Konto wird automatisch Administrator, und Sie erhalten eine E-Mail."
    ],
    "sentBtn": "Ich habe überwiesen",
    "sentPh": "Überweisungsreferenz Ihrer Bank oder Name des Absenders",
    "proofSent": "Vielen Dank — der Eigentümer prüft die Überweisung (meist innerhalb eines Werktags), und Ihr Administratorzugang wird freigeschaltet, sobald sie bestätigt ist. Bitte senden Sie den Beleg auch per WhatsApp {wa}.",
    "whatsappProof": "Beleg per WhatsApp senden",
    "cryptoTitle": "Mit Krypto bezahlen",
    "cryptoIntro": "Senden Sie genau den angezeigten Betrag im angezeigten Netzwerk. Stablecoin-Zahlungen (USDT / USDC) werden automatisch erkannt und bestätigt; für BTC, ETH oder SOL fügen Sie nach dem Senden Ihren Transaktions-Hash ein.",
    "sendExact": "Genau senden",
    "to": "An Adresse",
    "txPh": "Transaktions-Hash (TXID)",
    "verify": "Zahlung prüfen",
    "waiting": "Warte auf die Bestätigung der Zahlung — diese Seite aktualisiert sich selbst.",
    "back": "Andere Zahlungsart wählen",
    "canceled": "Die Zahlung wurde abgebrochen — bitte wählen Sie erneut eine Zahlungsart.",
    "proofWa": "Hallo, ich habe die Überweisung für die Übernahme von AXTO gesendet. Bestellreferenz: {id}. Hier ist der Überweisungsbeleg.",
    "handoverWaText": "Hallo, meine Zahlung für die Übernahme von AXTO ist verifiziert (Bestellung {id}). Lassen Sie uns die Übergabe planen.",
    "paidTitle": "Zahlung verifiziert — willkommen, Eigentümer von AXTO.",
    "paidAdmin": "Ihr Konto ist jetzt Administrator der gesamten Plattform.",
    "paidPending": "Ihre Zahlung ist erfasst. Der Administratorzugang wird vom Eigentümer freigeschaltet.",
    "paidTest": "Dies war eine Testzahlung (Sandbox) — es wurden keine Zugänge geändert.",
    "openAdmin": "Admin-Portal öffnen",
    "handoverWa": "Übergabe per WhatsApp abstimmen",
    "invoice": "Rechnung",
    "faqTitle": "Fragen von Käufern",
    "faq": [
      [
        "Was genau besitze ich nach dem Kauf?",
        "Das gesamte Unternehmen im aktuellen Zustand: Domain, Quellcode und dessen Historie, Apps, Selfhosting-Produkte, Marke und Inhalte sowie die in der Übergabe-Checkliste aufgeführten Betriebskonten. Die Rechte am geistigen Eigentum an Code und Marke gehen auf Sie über."
      ],
      [
        "Kann ich die Plattform vor der Zahlung prüfen?",
        "Ja. Code, Architektur-Blueprint, Testhistorie und die Liste der übertragenen Konten werden vor Ihrer Entscheidung zur Prüfung bereitgestellt, und Sie können selbst eine vollständige Kopie betreiben."
      ],
      [
        "Ist der Preis verhandelbar, oder können wir eine Treuhand nutzen?",
        "Sprechen Sie mit dem Eigentümer per WhatsApp. Ein lizenzierter Treuhänder oder eine Ratenzahlung kann vereinbart werden, bevor Sie über diese Seite bezahlen."
      ],
      [
        "Was kostet der Betrieb?",
        "Die Plattform läuft am serverlosen Edge von Cloudflare (nutzungsabhängig) plus einem E-Mail-Anbieter. Mitglieder bezahlen ihre KI-Anbieter selbst, daher kostet die KI-Nutzung das Unternehmen nichts."
      ],
      [
        "Was passiert mit bestehenden Mitgliedern und ihren Daten?",
        "Ihre Konten, Tarife und verschlüsselten Arbeiten bleiben genau so, wie sie sind; Sie werden der Betreiber. Ihre Dateien wurden nie hochgeladen, daher gibt es kein Dokumentenarchiv zu migrieren."
      ],
      [
        "Warum lehnt PayPal diesen Betrag manchmal ab?",
        "PayPal begrenzt Einzelzahlungen für die meisten Konten. Banküberweisung, Treuhand oder Krypto tragen den vollen Preis."
      ],
      [
        "Wie schnell gibt es den Administratorzugang?",
        "Sofort bei automatisch bestätigten Zahlungen (PayPal-Capture, Karte, NOWPayments, Stablecoins on-chain). Bei Banküberweisung oder Treuhand, sobald der Geldeingang verifiziert ist."
      ]
    ]
  },
  fr: {
    "eyebrow": "Acquisition privée · un seul acheteur · transfert complet",
    "title": "Acquérez AXTO — une plateforme d'IA de niveau entreprise, complète et en production.",
    "lead": "Sept applications d'IA en ligne, une gamme de dix produits auto-hébergés, une plateforme développeur temps réel, des paiements et licences dans le monde entier, dix langues et la marque axto.io — transférés à un seul propriétaire. L'accès administrateur est accordé dès que votre paiement est vérifié ; tout le reste suit une passation documentée, étape par étape.",
    "price": "Prix demandé",
    "priceNote": "Acquisition unique de l'ensemble de l'activité. Un séquestre et un paiement échelonné peuvent être organisés.",
    "buy": "Lancer l'acquisition",
    "guideCta": "Lire le guide de l'acheteur",
    "talk": "Parler au propriétaire",
    "sold": "Cette offre a été acceptée — AXTO a été vendu.",
    "paused": "L'offre est suspendue pour le moment. Contactez le propriétaire pour en discuter.",
    "stats": {
      "apps": "applications cloud en ligne",
      "selfHosted": "produits auto-hébergés",
      "langs": "langues",
      "gateways": "moyens de paiement",
      "jurisdictions": "juridictions",
      "tests": "tests automatisés",
      "transports": "modes de connexion"
    },
    "highlightsTitle": "Pourquoi cette plateforme vaut d'être possédée",
    "highlightsLead": "Un produit fini, avec toute l'exploitation qui l'entoure — ni un prototype, ni un modèle.",
    "highlights": [
      [
        "🏛️",
        "Sept applications d'IA phares",
        "Legal AI avec 36 espaces de travail experts et des outils juridiques sur l'appareil, Clipper pour les vidéos courtes virales, AI Studio, Privacy Vault, Compliance Center, Security Analyst et une bibliothèque de 240 prompts d'experts — en ligne, sur tous les appareils."
      ],
      [
        "🛡️",
        "Une architecture de confidentialité vérifiable par l'acheteur",
        "Les fichiers sont traités sur l'appareil du membre, l'IA fonctionne avec les propres clés du membre ou sur un modèle installé sur son propre ordinateur (Local Mode), et le travail enregistré est chiffré par compte."
      ],
      [
        "⚙️",
        "Une exploitation sans intervention",
        "Paiements, activation des formules, licences, téléchargements — et cette vente elle-même — se finalisent automatiquement dès qu'un paiement est vérifié. Le portail d'administration couvre tout le reste."
      ],
      [
        "⚡",
        "Une plateforme développeur temps réel",
        "AXTO Connect : REST, Server-Sent Events, WebSocket, long polling, streaming HTTP/2, une API Connect compatible gRPC, WebRTC, des webhooks signés et un serveur MCP pour les agents d'IA."
      ],
      [
        "🌍",
        "Mondiale dès le premier jour",
        "Dix langues, plus de 200 juridictions jusqu'au niveau de l'État et de la province, et des moyens de paiement allant de PayPal et des cartes au QRIS, aux cryptomonnaies et au virement bancaire."
      ],
      [
        "🐳",
        "Une gamme de produits auto-hébergés",
        "Éditions Docker pour Windows, macOS et Linux sur x86-64 et ARM64, avec l'installateur AXTO Setup et des licences hors ligne signées Ed25519."
      ]
    ],
    "promiseTitle": "Côté client par conception — notre garantie de confidentialité",
    "promiseLead": "AXTO a été conçu pour que les données du membre restent chez le membre. Voici précisément ce qui est garanti aujourd'hui :",
    "promise": [
      [
        "Les fichiers ne quittent jamais l'appareil",
        "Documents, PDF, tableurs, images, numérisations et vidéos sont ouverts, lus (OCR), modifiés, caviardés, rendus et exportés dans le navigateur — PDF.js, Tesseract, ffmpeg.wasm et suivi du visage sur l'appareil. Rien n'est téléversé pour être traité."
      ],
      [
        "Apportez votre propre clé, modèle ou point d'accès",
        "BYOK, BYOX et BYOM : chaque requête d'IA s'exécute avec la propre clé du membre et le fournisseur qu'il a choisi (ou son propre serveur de modèles). AXTO ne fait que relayer la requête en périphérie — il ne la stocke jamais et ne s'en sert jamais pour l'entraînement. Les clés sont chiffrées au repos."
      ],
      [
        "Local Mode — l'IA sur l'appareil du membre",
        "Les membres peuvent connecter Ollama, LM Studio ou tout serveur compatible OpenAI sur leur ordinateur : le prompt est construit dans le navigateur et la requête d'IA ne passe jamais par les serveurs d'AXTO."
      ],
      [
        "Travail chiffré, une clé par compte",
        "Les conversations, projets, dossiers, rapports et caviardages enregistrés sont chiffrés avec une clé propre à chaque compte."
      ],
      [
        "IA gérée — bientôt disponible",
        "Les modèles fournis par AXTO sont prêts mais verrouillés. Ils ne seront activés manuellement que lorsque le service sera prêt et abouti — rien n'est vendu avant cela."
      ]
    ],
    "appsTitle": "Tout ce qui est inclus",
    "appsLead": "Chaque application ci-dessous est en production, sur tous les appareils, en dix langues.",
    "selfHostedTitle": "Gamme de produits auto-hébergés",
    "selfHostedLead": "Images Docker pour x86-64 et ARM64, l'installateur AXTO Setup pour Windows, macOS et Linux, licences signées et activation hors ligne.",
    "engineTitle": "Le moteur de l'activité",
    "engine": [
      [
        "Paiements dans le monde entier",
        "PayPal, cartes de crédit / débit traitées en Indonésie et versées sur le compte bancaire de la société (Xendit ou Midtrans ; Stripe aussi là où il est disponible), QRIS / comptes virtuels / portefeuilles électroniques indonésiens, cryptomonnaies via NOWPayments, transferts directs de portefeuille confirmés on-chain, et virement bancaire — chacun avec des identifiants réels et sandbox distincts, chiffrés."
      ],
      [
        "Abonnements et licences à vie",
        "Quatre formules avec prorata temporel, factures et rappels de renouvellement ; licences perpétuelles pour 1 à 100 appareils avec activation hors ligne signée Ed25519."
      ],
      [
        "Plateforme développeur",
        "AXTO Connect donne à chaque formule payante des clés d'API, des canaux d'événements en direct, le streaming d'IA, des salles WebRTC, des webhooks signés et des outils MCP — avec limites par formule, chiffrement et interrupteur d'administration."
      ],
      [
        "Portail d'administration",
        "Membres, commandes et paiements, licences, licences à vie, boîte de support avec assistant IA, formules et tarifs, API développeur, paramètres de paiement et d'e-mail, versions et journal d'audit complet."
      ],
      [
        "Croissance",
        "Site public avec des pages SEO pour chaque application et chaque juridiction, un blog, des guides d'aide, des données structurées, une PWA installable et des pages publiques prêtes pour la publicité."
      ],
      [
        "Qualité d'ingénierie",
        "Typage de bout en bout, suites de tests unitaires et de bout en bout en CI à chaque modification, durcissement de la sécurité, limites de débit et un blueprint d'architecture rédigé."
      ]
    ],
    "stackTitle": "Technologie",
    "stack": "Next.js 15 sur le réseau périphérique mondial de Cloudflare (Pages, Workers, KV, R2) · TypeScript · installateur en Go · Docker (multi-architecture) · outils d'IA côté navigateur (PDF.js, Tesseract, ffmpeg.wasm, MediaPipe) · temps réel WebRTC et WebSocket.",
    "guideTitle": "Guide de l'acheteur — du premier appel à la pleine propriété",
    "guideLead": "Un chemin clair pour une transaction de cette taille. Chaque étape peut être accélérée ; aucune n'est sacrifiée sur le plan de la sécurité.",
    "guide": [
      [
        "Appel de présentation",
        "Rencontrez le propriétaire sur WhatsApp ou en visio. Convenez du périmètre, du calendrier et de la manière dont vous souhaitez payer.",
        "Jour 1"
      ],
      [
        "Examen de la plateforme",
        "Les dépôts, le blueprint d'architecture, l'historique des tests et la liste des comptes transférés sont mis à votre disposition pour examen ; un accord de confidentialité mutuel peut être signé au préalable.",
        "Jours 1–3"
      ],
      [
        "Audit technique",
        "Vérifiez par vous-même : le code se compile, ses suites unitaires et de bout en bout tournent en CI, et une copie locale complète démarre en une seule commande.",
        "Jours 3–14"
      ],
      [
        "Contrat et séquestre",
        "Signez le contrat d'acquisition. Pour une transaction de cette taille, nous recommandons un agent de séquestre agréé ou des paiements échelonnés.",
        "Jours 7–21"
      ],
      [
        "Paiement",
        "Virement bancaire vers BNI (SWIFT BNINIDJA), libération du séquestre, cryptomonnaies, ou PayPal pour les montants qu'il autorise. Le paiement est rapproché automatiquement de votre commande.",
        "Jour de la clôture"
      ],
      [
        "Passation automatique",
        "Votre compte devient administrateur dès que le paiement est vérifié ; le domaine, Cloudflare, GitHub et les comptes des fournisseurs sont ensuite transférés selon la liste de contrôle.",
        "Clôture + 1 à 7 jours"
      ]
    ],
    "timelineTitle": "Calendrier de la passation",
    "timeline": [
      [
        "Minute 0",
        "Accès administrateur",
        "Accordé automatiquement lorsque le paiement est vérifié, confirmé par e-mail et consigné dans le journal d'audit."
      ],
      [
        "Jour 1",
        "Code et infrastructure",
        "Dépôts GitHub avec l'historique complet, le compte Cloudflare (Pages, KV, R2, DNS) et l'autorisation de transfert du domaine."
      ],
      [
        "Semaine 1",
        "Paiements et e-mail",
        "Fournisseurs de paiement transférés à votre société ou basculés vers vos propres comptes ; envoi d'e-mails et boîtes de support."
      ],
      [
        "Semaines 2–4",
        "Transfert de connaissances",
        "Présentations détaillées de l'architecture, de la chaîne de publication, des procédures d'administration et de la version auto-hébergée, avec des réponses par écrit."
      ]
    ],
    "transitionNote": "Un accompagnement de transition optionnel après la clôture peut être convenu dans le contrat d'acquisition.",
    "dataRoomTitle": "À votre disposition pour examen",
    "dataRoomLead": "Tout ce dont un acheteur a besoin pour vérifier les affirmations de cette page :",
    "dataRoom": [
      "Code source complet avec historique — tableau de bord, moteurs, installateur, CI/CD",
      "Blueprint d'architecture et choix de conception, application par application",
      "Suites de tests unitaires et de bout en bout avec l'historique de leurs exécutions en CI",
      "Modèle de sécurité : chiffrement par compte, gestion des secrets, limites de débit, journal d'audit",
      "Procédures d'administration : paiements, vente du site, licences, versions, auto-hébergement",
      "La liste complète des comptes et actifs transférés"
    ],
    "handoverTitle": "Ce qui vous est transféré",
    "handoverLead": "L'accès administrateur est accordé automatiquement dès que votre paiement est vérifié. Le reste suit une liste de contrôle ordonnée avec le propriétaire :",
    "handover": [
      "Accès administrateur au portail AXTO — automatique lorsque le paiement est vérifié",
      "Le domaine axto.io auprès du registraire",
      "Compte / zone Cloudflare : projet Pages, KV, buckets R2, Workers et DNS",
      "Dépôts GitHub (tableau de bord, moteurs, installateur, CI/CD) avec l'historique complet",
      "Comptes des fournisseurs de paiement — ou un basculement propre vers les vôtres (PayPal, Stripe, Xendit, Midtrans, NOWPayments, portefeuilles crypto)",
      "Envoi d'e-mails (Resend) et boîtes de support",
      "Images Docker et chaîne de publication (x86-64 et ARM64), installateur AXTO Setup",
      "Marque, logo, contenus, blog, pages SEO et traductions (10 langues)",
      "Documentation : blueprint d'architecture, procédures d'administration, guides CI/CD et d'auto-hébergement"
    ],
    "stepsTitle": "Acquérir en trois étapes",
    "steps": [
      [
        "Créez votre compte ou connectez-vous",
        "Ce compte devient l'administrateur."
      ],
      [
        "Payez le prix demandé",
        "À ce niveau, le virement bancaire ou le séquestre est recommandé ; les cryptomonnaies et PayPal sont aussi disponibles."
      ],
      [
        "Recevez l'accès administrateur",
        "Instantanément après vérification du paiement — puis le domaine, Cloudflare, GitHub et les comptes des fournisseurs sont transférés."
      ]
    ],
    "checkoutTitle": "Paiement sécurisé",
    "escrowNote": "Pour une transaction de cette taille, nous recommandons un virement bancaire ou un agent de séquestre agréé. PayPal limite les paiements uniques.",
    "signInFirst": "Connectez-vous ou créez le compte qui sera propriétaire d'AXTO, puis revenez ici pour payer.",
    "signIn": "Se connecter",
    "register": "Créer un compte",
    "company": "Société (facultatif)",
    "name": "Votre nom",
    "phone": "Téléphone / WhatsApp",
    "message": "Message au propriétaire (facultatif)",
    "method": "Moyen de paiement",
    "pay": "Payer {amount}",
    "paying": "Ouverture du paiement sécurisé…",
    "noMethods": "Les moyens de paiement en ligne sont en cours d'activation. Contactez le propriétaire sur WhatsApp pour procéder par virement bancaire.",
    "paypalLimit": "PayPal limite le montant d'un paiement unique (généralement jusqu'à {max}). Si PayPal refuse le montant total, choisissez les cryptomonnaies ou un virement bancaire.",
    "test": "Mode test",
    "adminNote": "Vous êtes connecté en tant qu'administrateur — connectez-vous avec le compte de l'acheteur pour effectuer l'achat.",
    "wireTitle": "Virement bancaire vers BNI — étape par étape",
    "wireIntro": "Virez exactement le montant ci-dessous. La référence de votre commande permet d'identifier le paiement.",
    "amount": "Montant",
    "bank": "Banque",
    "holder": "Bénéficiaire",
    "swift": "SWIFT / BIC",
    "code": "Code banque (Indonésie)",
    "account": "Numéro de compte",
    "reference": "Référence / motif du paiement",
    "otherCurrencies": "Comptes dans d'autres devises",
    "wireSteps": [
      "Ouvrez votre banque ou votre service de virement et choisissez un virement international (SWIFT) vers Bank Negara Indonesia (BNI), SWIFT BNINIDJA. Depuis une banque indonésienne, choisissez « Transfer ke Bank BNI » (code banque 009) et utilisez le compte en IDR.",
      "Saisissez le numéro de compte correspondant à la devise envoyée (USD recommandé) et le nom du bénéficiaire exactement comme indiqué.",
      "Indiquez la référence de la commande dans le motif du paiement afin que le virement soit rapproché de votre commande.",
      "Après l'envoi, cliquez sur « J'ai envoyé le virement » ci-dessous et envoyez le justificatif de virement au propriétaire sur WhatsApp.",
      "Le propriétaire vérifie les fonds et confirme la commande — votre compte devient automatiquement administrateur et vous recevez un e-mail."
    ],
    "sentBtn": "J'ai envoyé le virement",
    "sentPh": "Référence du virement de votre banque ou nom de l'émetteur",
    "proofSent": "Merci — le propriétaire vérifie le virement (généralement sous un jour ouvré) et votre accès administrateur est accordé dès sa confirmation. Envoyez aussi le justificatif sur WhatsApp {wa}.",
    "whatsappProof": "Envoyer le justificatif sur WhatsApp",
    "cryptoTitle": "Payer en cryptomonnaies",
    "cryptoIntro": "Envoyez exactement le montant affiché sur le réseau indiqué. Les paiements en stablecoins (USDT / USDC) sont détectés et confirmés automatiquement ; pour BTC, ETH ou SOL, collez le hash de votre transaction après l'envoi.",
    "sendExact": "Envoyez exactement",
    "to": "Adresse de destination",
    "txPh": "Hash de la transaction (TXID)",
    "verify": "Vérifier le paiement",
    "waiting": "En attente de la confirmation du paiement — cette page se met à jour toute seule.",
    "back": "Choisir un autre moyen",
    "canceled": "Le paiement a été annulé — choisissez à nouveau un moyen de paiement.",
    "proofWa": "Bonjour, j'ai envoyé le virement pour l'acquisition d'AXTO. Référence de la commande : {id}. Voici le justificatif de virement.",
    "handoverWaText": "Bonjour, mon paiement pour l'acquisition d'AXTO est vérifié (commande {id}). Organisons la passation.",
    "paidTitle": "Paiement vérifié — bienvenue, propriétaire d'AXTO.",
    "paidAdmin": "Votre compte est désormais administrateur de toute la plateforme.",
    "paidPending": "Votre paiement est enregistré. L'accès administrateur est en cours d'attribution par le propriétaire.",
    "paidTest": "Il s'agissait d'un paiement de test (sandbox) — aucun accès n'a été modifié.",
    "openAdmin": "Ouvrir le portail d'administration",
    "handoverWa": "Coordonner la passation sur WhatsApp",
    "invoice": "Facture",
    "faqTitle": "Les questions des acheteurs",
    "faq": [
      [
        "Que vais-je posséder exactement après l’achat ?",
        "L'ensemble de l'activité en l'état : le domaine, le code source et son historique, les applications, les produits auto-hébergés, la marque et les contenus, ainsi que les comptes d'exploitation figurant dans la liste de passation. La propriété intellectuelle du code et de la marque vous est transférée."
      ],
      [
        "Puis-je examiner la plateforme avant de payer ?",
        "Oui. Le code, le blueprint d'architecture, l'historique des tests et la liste des comptes transférés sont mis à disposition pour examen avant votre engagement, et vous pouvez faire tourner vous-même une copie complète."
      ],
      [
        "Le prix est-il négociable, ou pouvons-nous passer par un séquestre ?",
        "Parlez au propriétaire sur WhatsApp. Un agent de séquestre agréé ou un paiement échelonné peut être organisé avant de payer via cette page."
      ],
      [
        "Combien coûte son fonctionnement ?",
        "La plateforme fonctionne sur le réseau périphérique serverless de Cloudflare (paiement à l'usage) plus un fournisseur d'e-mail. Les membres paient leurs propres fournisseurs d'IA, l'usage de l'IA ne coûte donc rien à la société."
      ],
      [
        "Qu'advient-il des membres existants et de leurs données ?",
        "Leurs comptes, formules et travaux chiffrés restent exactement tels quels ; vous en devenez l'opérateur. Leurs fichiers n'ont jamais été téléversés, il n'y a donc aucune archive de documents à migrer."
      ],
      [
        "Pourquoi PayPal refuse-t-il parfois ce montant ?",
        "PayPal plafonne les paiements uniques pour la plupart des comptes. Un virement bancaire, un séquestre ou les cryptomonnaies permettent de régler le prix total."
      ],
      [
        "En combien de temps l'accès administrateur est-il accordé ?",
        "Instantanément pour les paiements confirmés automatiquement (capture PayPal, carte, NOWPayments, stablecoins on-chain). Pour un virement bancaire ou un séquestre, dès que les fonds sont vérifiés."
      ]
    ]
  },
  it: {
    "eyebrow": "Acquisizione privata · un solo acquirente · trasferimento completo",
    "title": "Acquisisci AXTO — una piattaforma di IA di livello enterprise, completa e operativa.",
    "lead": "Sette applicazioni di IA attive, una linea di dieci prodotti self-hosted, una piattaforma per sviluppatori in tempo reale, pagamenti e licenze in tutto il mondo, dieci lingue e il marchio axto.io — trasferiti a un unico proprietario. L'accesso da amministratore viene concesso nel momento in cui il pagamento è verificato; tutto il resto segue un passaggio di consegne documentato, passo dopo passo.",
    "price": "Prezzo richiesto",
    "priceNote": "Acquisizione una tantum dell'intera attività. È possibile organizzare un deposito a garanzia (escrow) e un pagamento a rate.",
    "buy": "Avvia l'acquisizione",
    "guideCta": "Leggi la guida per l'acquirente",
    "talk": "Parla con il proprietario",
    "sold": "Questa offerta è stata accettata — AXTO è stata venduta.",
    "paused": "L'offerta è al momento sospesa. Contatta il proprietario per parlarne.",
    "stats": {
      "apps": "app cloud attive",
      "selfHosted": "prodotti self-hosted",
      "langs": "lingue",
      "gateways": "metodi di pagamento",
      "jurisdictions": "giurisdizioni legali",
      "tests": "test automatizzati",
      "transports": "modi per connettersi"
    },
    "highlightsTitle": "Perché vale la pena possedere questa piattaforma",
    "highlightsLead": "Un prodotto finito, con tutta l'operatività che lo circonda — non un prototipo, non un template.",
    "highlights": [
      [
        "🏛️",
        "Sette applicazioni di IA di punta",
        "Legal AI con 36 spazi di lavoro esperti e strumenti legali sul dispositivo, Clipper per video brevi virali, AI Studio, Privacy Vault, Compliance Center, Security Analyst e una libreria di 240 prompt esperti — attive, su ogni dispositivo."
      ],
      [
        "🛡️",
        "Un'architettura della privacy verificabile dall'acquirente",
        "I file vengono elaborati sul dispositivo del membro, l'IA funziona con le chiavi del membro o con un modello sul suo computer (Local Mode) e il lavoro salvato è cifrato per ogni account."
      ],
      [
        "⚙️",
        "Operatività senza interventi manuali",
        "Pagamenti, attivazione dei piani, licenze, download — e questa stessa vendita — si completano automaticamente non appena un pagamento è verificato. Il portale di amministrazione copre tutto il resto."
      ],
      [
        "⚡",
        "Una piattaforma per sviluppatori in tempo reale",
        "AXTO Connect: REST, Server-Sent Events, WebSocket, long polling, streaming HTTP/2, un'API Connect compatibile con gRPC, WebRTC, webhook firmati e un server MCP per gli agenti di IA."
      ],
      [
        "🌍",
        "Globale fin dal primo giorno",
        "Dieci lingue, oltre 200 giurisdizioni legali fino al livello di stato e provincia, e canali di pagamento da PayPal e carte a QRIS, criptovalute e bonifico bancario."
      ],
      [
        "🐳",
        "Una linea di prodotti self-hosted",
        "Edizioni Docker per Windows, macOS e Linux su x86-64 e ARM64, con il programma di installazione AXTO Setup e licenze offline firmate Ed25519."
      ]
    ],
    "promiseTitle": "Lato client per progettazione — la nostra garanzia di privacy",
    "promiseLead": "AXTO è stata costruita perché i dati del membro restino al membro. Ecco con precisione ciò che è garantito oggi:",
    "promise": [
      [
        "I file non lasciano mai il dispositivo",
        "Documenti, PDF, fogli di calcolo, immagini, scansioni e video vengono aperti, letti (OCR), modificati, oscurati, renderizzati ed esportati nel browser — PDF.js, Tesseract, ffmpeg.wasm e tracciamento del volto sul dispositivo. Nulla viene caricato per l'elaborazione."
      ],
      [
        "Porta la tua chiave, il tuo modello o il tuo endpoint",
        "BYOK, BYOX e BYOM: ogni richiesta di IA usa la chiave del membro e il provider che ha scelto (o il suo server di modelli). AXTO si limita a inoltrare la richiesta all'edge — non la conserva mai e non la usa mai per l'addestramento. Le chiavi sono cifrate a riposo."
      ],
      [
        "Local Mode — l'IA sul dispositivo del membro",
        "I membri possono collegare Ollama, LM Studio o qualsiasi server compatibile con OpenAI sul proprio computer: il prompt viene costruito nel browser e la richiesta di IA non passa mai dai server di AXTO."
      ],
      [
        "Lavoro cifrato, una chiave per account",
        "Chat, progetti, pratiche, report e oscuramenti salvati sono cifrati con una chiave unica per ogni account."
      ],
      [
        "IA gestita — in arrivo",
        "I modelli forniti da AXTO sono pronti ma bloccati. Verranno attivati manualmente solo quando il servizio sarà pronto e perfezionato — nulla viene venduto prima di allora."
      ]
    ],
    "appsTitle": "Tutto ciò che è incluso",
    "appsLead": "Ogni app qui sotto è in produzione, su ogni dispositivo, in dieci lingue.",
    "selfHostedTitle": "Linea di prodotti self-hosted",
    "selfHostedLead": "Immagini Docker per x86-64 e ARM64, il programma di installazione AXTO Setup per Windows, macOS e Linux, licenze firmate e attivazione offline.",
    "engineTitle": "Il motore dell'attività",
    "engine": [
      [
        "Pagamenti in tutto il mondo",
        "PayPal, carte di credito / debito elaborate in Indonesia e accreditate sul conto bancario della società (Xendit o Midtrans; anche Stripe dove disponibile), QRIS / conti virtuali / e-wallet indonesiani, criptovalute tramite NOWPayments, trasferimenti diretti da wallet confermati on-chain e bonifico bancario — ciascuno con credenziali live e sandbox separate, cifrate."
      ],
      [
        "Abbonamenti e licenze a vita",
        "Quattro piani con calcolo pro rata in base al tempo, fatture e promemoria di rinnovo; licenze perpetue per 1–100 dispositivi con attivazione offline firmata Ed25519."
      ],
      [
        "Piattaforma per sviluppatori",
        "AXTO Connect offre a ogni piano a pagamento chiavi API, canali di eventi in tempo reale, streaming di IA, stanze WebRTC, webhook firmati e strumenti MCP — con limiti per piano, cifratura e un interruttore di amministrazione."
      ],
      [
        "Portale di amministrazione",
        "Membri, ordini e pagamenti, licenze, licenze a vita, casella di assistenza con assistente IA, piani e prezzi, API per sviluppatori, impostazioni di pagamento ed e-mail, release e un registro di audit completo."
      ],
      [
        "Crescita",
        "Sito pubblico con pagine SEO per ogni app e giurisdizione, un blog, guide di aiuto, dati strutturati, una PWA installabile e pagine pubbliche pronte per la pubblicità."
      ],
      [
        "Qualità ingegneristica",
        "Tipizzazione end-to-end, suite di test unitari ed end-to-end in CI a ogni modifica, rafforzamento della sicurezza, limiti di frequenza e un blueprint architetturale scritto."
      ]
    ],
    "stackTitle": "Tecnologia",
    "stack": "Next.js 15 sull'edge globale di Cloudflare (Pages, Workers, KV, R2) · TypeScript · programma di installazione in Go · Docker (multi-architettura) · strumenti di IA lato browser (PDF.js, Tesseract, ffmpeg.wasm, MediaPipe) · tempo reale con WebRTC e WebSocket.",
    "guideTitle": "Guida per l'acquirente — dalla prima chiamata alla piena proprietà",
    "guideLead": "Un percorso chiaro per una transazione di queste dimensioni. Ogni passaggio può essere accelerato; nessuno viene saltato a scapito della sicurezza.",
    "guide": [
      [
        "Chiamata introduttiva",
        "Incontra il proprietario su WhatsApp o in videochiamata. Concordate perimetro, tempistiche e modalità di pagamento.",
        "Giorno 1"
      ],
      [
        "Esame della piattaforma",
        "I repository, il blueprint architetturale, lo storico dei test e l'elenco degli account trasferiti vengono messi a disposizione per il tuo esame; è possibile firmare prima un NDA reciproco.",
        "Giorni 1–3"
      ],
      [
        "Due diligence tecnica",
        "Verifica di persona: il codice si compila, le suite unitarie ed end-to-end girano in CI e una copia locale completa si avvia con un solo comando.",
        "Giorni 3–14"
      ],
      [
        "Contratto ed escrow",
        "Firma il contratto di acquisto. Per una transazione di queste dimensioni consigliamo un agente di escrow autorizzato o pagamenti a rate.",
        "Giorni 7–21"
      ],
      [
        "Pagamento",
        "Bonifico bancario a BNI (SWIFT BNINIDJA), rilascio dell'escrow, criptovalute o PayPal per gli importi che consente. Il pagamento viene abbinato automaticamente al tuo ordine.",
        "Giorno del closing"
      ],
      [
        "Passaggio di consegne automatico",
        "Il tuo account diventa amministratore nel momento in cui il pagamento è verificato; dominio, Cloudflare, GitHub e account dei fornitori vengono poi trasferiti secondo la checklist.",
        "Closing + 1–7 giorni"
      ]
    ],
    "timelineTitle": "Tempistiche del passaggio di consegne",
    "timeline": [
      [
        "Minuto 0",
        "Accesso da amministratore",
        "Concesso automaticamente quando il pagamento è verificato, confermato via e-mail e registrato nel registro di audit."
      ],
      [
        "Giorno 1",
        "Codice e infrastruttura",
        "Repository GitHub con lo storico completo, l'account Cloudflare (Pages, KV, R2, DNS) e l'autorizzazione al trasferimento del dominio."
      ],
      [
        "Settimana 1",
        "Pagamenti ed e-mail",
        "Fornitori di pagamento trasferiti alla tua società o passati ai tuoi account; invio e-mail e caselle di assistenza."
      ],
      [
        "Settimane 2–4",
        "Trasferimento di conoscenze",
        "Presentazioni guidate dell'architettura, della pipeline di rilascio, delle procedure di amministrazione e della build self-hosted, con risposte per iscritto."
      ]
    ],
    "transitionNote": "Un supporto opzionale per la transizione dopo il closing può essere concordato nel contratto di acquisto.",
    "dataRoomTitle": "A disposizione per il tuo esame",
    "dataRoomLead": "Tutto ciò che serve a un acquirente per verificare quanto affermato in questa pagina:",
    "dataRoom": [
      "Codice sorgente completo con lo storico — dashboard, motori, programma di installazione, CI/CD",
      "Blueprint architetturale e decisioni di progettazione, app per app",
      "Suite di test unitari ed end-to-end con lo storico delle esecuzioni in CI",
      "Modello di sicurezza: cifratura per account, gestione dei segreti, limiti di frequenza, registro di audit",
      "Procedure di amministrazione: pagamenti, vendita del sito, licenze, release, self-hosting",
      "L'elenco completo degli account e dei beni trasferiti"
    ],
    "handoverTitle": "Cosa ti viene trasferito",
    "handoverLead": "L'accesso da amministratore viene concesso automaticamente nel momento in cui il pagamento è verificato. Il resto segue una checklist ordinata con il proprietario:",
    "handover": [
      "Accesso da amministratore al portale AXTO — automatico quando il pagamento è verificato",
      "Il dominio axto.io presso il registrar",
      "Account / zona Cloudflare: progetto Pages, KV, bucket R2, Workers e DNS",
      "Repository GitHub (dashboard, motori, programma di installazione, CI/CD) con lo storico completo",
      "Account dei fornitori di pagamento — o un passaggio pulito ai tuoi (PayPal, Stripe, Xendit, Midtrans, NOWPayments, wallet crypto)",
      "Invio e-mail (Resend) e caselle di assistenza",
      "Immagini Docker e pipeline di rilascio (x86-64 e ARM64), programma di installazione AXTO Setup",
      "Marchio, logo, contenuti, blog, pagine SEO e traduzioni (10 lingue)",
      "Documentazione: blueprint architetturale, procedure di amministrazione, guide CI/CD e self-hosting"
    ],
    "stepsTitle": "Acquisisci in tre passaggi",
    "steps": [
      [
        "Crea il tuo account o accedi",
        "Questo account diventa l'amministratore."
      ],
      [
        "Paga il prezzo richiesto",
        "Per questo importo si consiglia il bonifico bancario o l'escrow; sono disponibili anche criptovalute e PayPal."
      ],
      [
        "Ricevi l'accesso da amministratore",
        "Immediatamente, a pagamento verificato — poi vengono trasferiti dominio, Cloudflare, GitHub e account dei fornitori."
      ]
    ],
    "checkoutTitle": "Pagamento sicuro",
    "escrowNote": "Per una transazione di queste dimensioni consigliamo un bonifico bancario o un agente di escrow autorizzato. PayPal limita i pagamenti singoli.",
    "signInFirst": "Accedi o crea l'account che sarà proprietario di AXTO, poi torna qui per pagare.",
    "signIn": "Accedi",
    "register": "Crea account",
    "company": "Società (facoltativo)",
    "name": "Il tuo nome",
    "phone": "Telefono / WhatsApp",
    "message": "Messaggio al proprietario (facoltativo)",
    "method": "Metodo di pagamento",
    "pay": "Paga {amount}",
    "paying": "Avvio del pagamento sicuro…",
    "noMethods": "I metodi di pagamento online sono in fase di attivazione. Contatta il proprietario su WhatsApp per procedere con bonifico bancario.",
    "paypalLimit": "PayPal limita il singolo pagamento (di solito fino a {max}). Se PayPal rifiuta l'importo totale, scegli le criptovalute o un bonifico bancario.",
    "test": "Modalità test",
    "adminNote": "Hai effettuato l'accesso come amministratore — accedi con l'account dell'acquirente per effettuare l'acquisto.",
    "wireTitle": "Bonifico bancario a BNI — passo dopo passo",
    "wireIntro": "Trasferisci esattamente l'importo indicato qui sotto. Il riferimento del tuo ordine identifica il pagamento.",
    "amount": "Importo",
    "bank": "Banca",
    "holder": "Beneficiario",
    "swift": "SWIFT / BIC",
    "code": "Codice banca (Indonesia)",
    "account": "Numero di conto",
    "reference": "Riferimento / causale del pagamento",
    "otherCurrencies": "Conti in altre valute",
    "wireSteps": [
      "Apri la tua banca o il tuo servizio di bonifici e scegli un bonifico internazionale (SWIFT) a Bank Negara Indonesia (BNI), SWIFT BNINIDJA. Da una banca indonesiana scegli “Transfer ke Bank BNI” (codice banca 009) e usa il conto in IDR.",
      "Inserisci il numero di conto della valuta che invii (consigliato USD) e il nome del beneficiario esattamente come indicato.",
      "Scrivi il riferimento dell'ordine nella causale, così il bonifico viene abbinato al tuo ordine.",
      "Dopo l'invio, fai clic su “Ho inviato il bonifico” qui sotto e invia la ricevuta del bonifico al proprietario su WhatsApp.",
      "Il proprietario verifica i fondi e conferma l'ordine — il tuo account diventa automaticamente amministratore e ricevi un'e-mail."
    ],
    "sentBtn": "Ho inviato il bonifico",
    "sentPh": "Riferimento del bonifico della tua banca o nome dell'ordinante",
    "proofSent": "Grazie — il proprietario verifica il bonifico (di solito entro un giorno lavorativo) e il tuo accesso da amministratore viene concesso non appena è confermato. Invia anche la ricevuta su WhatsApp {wa}.",
    "whatsappProof": "Invia la ricevuta su WhatsApp",
    "cryptoTitle": "Paga con criptovalute",
    "cryptoIntro": "Invia esattamente l'importo indicato sulla rete indicata. I pagamenti in stablecoin (USDT / USDC) vengono rilevati e confermati automaticamente; per BTC, ETH o SOL incolla l'hash della transazione dopo l'invio.",
    "sendExact": "Invia esattamente",
    "to": "All'indirizzo",
    "txPh": "Hash della transazione (TXID)",
    "verify": "Verifica il pagamento",
    "waiting": "In attesa della conferma del pagamento — questa pagina si aggiorna da sola.",
    "back": "Scegli un altro metodo",
    "canceled": "Il pagamento è stato annullato — scegli di nuovo un metodo.",
    "proofWa": "Buongiorno, ho inviato il bonifico per l'acquisizione di AXTO. Riferimento dell'ordine: {id}. Ecco la ricevuta del bonifico.",
    "handoverWaText": "Buongiorno, il mio pagamento per l'acquisizione di AXTO è verificato (ordine {id}). Organizziamo il passaggio di consegne.",
    "paidTitle": "Pagamento verificato — benvenuto, proprietario di AXTO.",
    "paidAdmin": "Il tuo account è ora amministratore dell'intera piattaforma.",
    "paidPending": "Il tuo pagamento è registrato. L'accesso da amministratore è in fase di concessione da parte del proprietario.",
    "paidTest": "Si trattava di un pagamento di prova (sandbox) — nessun accesso è stato modificato.",
    "openAdmin": "Apri il portale di amministrazione",
    "handoverWa": "Coordina il passaggio di consegne su WhatsApp",
    "invoice": "Fattura",
    "faqTitle": "Le domande degli acquirenti",
    "faq": [
      [
        "Che cosa possiedo esattamente dopo l'acquisto?",
        "L'intera attività così com'è: dominio, codice sorgente e relativo storico, app, prodotti self-hosted, marchio e contenuti, e gli account operativi elencati nella checklist del passaggio di consegne. La proprietà intellettuale del codice e del marchio ti viene trasferita."
      ],
      [
        "Posso esaminare la piattaforma prima di pagare?",
        "Sì. Il codice, il blueprint architetturale, lo storico dei test e l'elenco degli account trasferiti vengono messi a disposizione per l'esame prima del tuo impegno, e puoi eseguire tu stesso una copia completa."
      ],
      [
        "Il prezzo è trattabile, o possiamo usare un escrow?",
        "Parla con il proprietario su WhatsApp. Un agente di escrow autorizzato o un pagamento a rate può essere organizzato prima di pagare tramite questa pagina."
      ],
      [
        "Quanto costa gestirla?",
        "La piattaforma gira sull'edge serverless di Cloudflare (a consumo) più un fornitore di e-mail. I membri pagano i propri provider di IA, quindi l'uso dell'IA non costa nulla alla società."
      ],
      [
        "Che cosa succede ai membri esistenti e ai loro dati?",
        "I loro account, piani e lavori cifrati restano esattamente come sono; tu diventi il gestore. I loro file non sono mai stati caricati, quindi non c'è alcun archivio di documenti da migrare."
      ],
      [
        "Perché a volte PayPal rifiuta questo importo?",
        "PayPal pone un tetto ai pagamenti singoli per la maggior parte degli account. Un bonifico bancario, un escrow o le criptovalute coprono l'intero prezzo."
      ],
      [
        "Quanto è rapido l'accesso da amministratore?",
        "Immediato per i pagamenti confermati automaticamente (cattura PayPal, carta, NOWPayments, stablecoin on-chain). Per un bonifico bancario o un escrow, non appena i fondi sono verificati."
      ]
    ]
  },
  zh: {
    "eyebrow": "私下收购 · 唯一买家 · 完整转让",
    "title": "收购 AXTO——一个完整且正在运营的企业级 AI 平台。",
    "lead": "七款在线 AI 应用、十款自托管产品线、实时开发者平台、全球支付与许可证体系、十种语言以及 axto.io 品牌——整体转让给唯一的所有者。付款经验证的那一刻即授予管理员权限；其余一切按照有文档记录的分步交接流程进行。",
    "price": "要价",
    "priceNote": "一次性收购整个业务。可安排第三方托管（escrow）和分期付款。",
    "buy": "开始收购",
    "guideCta": "阅读买家指南",
    "talk": "联系所有者",
    "sold": "此报价已被接受——AXTO 已售出。",
    "paused": "此报价目前已暂停。请联系所有者洽谈。",
    "stats": {
      "apps": "款在线云应用",
      "selfHosted": "款自托管产品",
      "langs": "种语言",
      "gateways": "种支付方式",
      "jurisdictions": "个法律辖区",
      "tests": "项自动化测试",
      "transports": "种连接方式"
    },
    "highlightsTitle": "为什么这个平台值得拥有",
    "highlightsLead": "一个已完成的产品，连同其周边的全部运营体系——不是原型，也不是模板。",
    "highlights": [
      [
        "🏛️",
        "七款旗舰 AI 应用",
        "Legal AI（含 36 个专家工作区和设备端法律工具）、用于病毒式短视频的 Clipper、AI Studio、Privacy Vault、Compliance Center、Security Analyst，以及包含 240 条专家提示词的提示词库——全部在线运行，支持所有设备。"
      ],
      [
        "🛡️",
        "买家可验证的隐私架构",
        "文件在会员自己的设备上处理，AI 使用会员自己的密钥或其电脑上的模型运行（Local Mode），保存的工作按账户加密。"
      ],
      [
        "⚙️",
        "零人工运营",
        "付款、套餐激活、许可证、下载——以及本次出售本身——在付款经验证后自动完成。其余一切都由管理后台覆盖。"
      ],
      [
        "⚡",
        "实时开发者平台",
        "AXTO Connect：REST、Server-Sent Events、WebSocket、长轮询、HTTP/2 流式传输、兼容 gRPC 的 Connect API、WebRTC、签名 Webhook，以及面向 AI 智能体的 MCP 服务器。"
      ],
      [
        "🌍",
        "从第一天起即面向全球",
        "十种语言、200 多个法律辖区（细化到州和省），支付渠道涵盖 PayPal、银行卡、QRIS、加密货币和银行电汇。"
      ],
      [
        "🐳",
        "自托管产品线",
        "适用于 Windows、macOS 和 Linux 的 Docker 版本，支持 x86-64 和 ARM64，配有 AXTO Setup 安装程序和 Ed25519 签名的离线许可证。"
      ]
    ],
    "promiseTitle": "设计即客户端处理——我们的隐私保证",
    "promiseLead": "AXTO 的设计初衷是让会员的数据留在会员手中。以下是目前所保证的内容，准确如下：",
    "promise": [
      [
        "文件从不离开设备",
        "文档、PDF、电子表格、图片、扫描件和视频都在浏览器中打开、识别（OCR）、编辑、脱敏、渲染和导出——借助 PDF.js、Tesseract、ffmpeg.wasm 和设备端人脸跟踪。没有任何内容会被上传处理。"
      ],
      [
        "自带密钥、模型或端点",
        "BYOK、BYOX 和 BYOM：每个 AI 请求都使用会员自己的密钥和所选的服务商（或其自己的模型服务器）。AXTO 只在边缘中转请求——从不存储，也从不用于训练。密钥以加密方式存储。"
      ],
      [
        "Local Mode——AI 在会员自己的设备上运行",
        "会员可以在自己的电脑上连接 Ollama、LM Studio 或任何兼容 OpenAI 的服务器：提示词在浏览器中构建，AI 请求从不经过 AXTO 的服务器。"
      ],
      [
        "工作加密，每个账户一把密钥",
        "保存的对话、项目、案件、报告和脱敏结果都使用每个账户独有的密钥加密。"
      ],
      [
        "托管 AI——即将推出",
        "由 AXTO 提供的模型已准备就绪但处于锁定状态。只有在服务准备就绪并臻于完善时才会手动开启——在此之前不会出售任何相关服务。"
      ]
    ],
    "appsTitle": "包含的全部内容",
    "appsLead": "以下每款应用均已在生产环境上线，支持所有设备和十种语言。",
    "selfHostedTitle": "自托管产品线",
    "selfHostedLead": "适用于 x86-64 和 ARM64 的 Docker 镜像，适用于 Windows、macOS 和 Linux 的 AXTO Setup 安装程序，签名许可证和离线激活。",
    "engineTitle": "业务引擎",
    "engine": [
      [
        "全球支付",
        "PayPal；在印度尼西亚处理并结算到公司银行账户的信用卡 / 借记卡（Xendit 或 Midtrans；可用地区也支持 Stripe）；印尼 QRIS / 虚拟账户 / 电子钱包；通过 NOWPayments 的加密货币；链上确认的钱包直接转账；以及银行转账——每种方式都有独立的正式和沙盒凭据，并经过加密。"
      ],
      [
        "订阅与终身许可证",
        "四种套餐，按时间折算、开具发票并发送续费提醒；适用于 1–100 台设备的永久许可证，支持 Ed25519 签名的离线激活。"
      ],
      [
        "开发者平台",
        "AXTO Connect 为每个付费套餐提供 API 密钥、实时事件频道、AI 流式输出、WebRTC 房间、签名 Webhook 和 MCP 工具——并配有套餐限额、加密和管理开关。"
      ],
      [
        "管理后台",
        "会员、订单与付款、许可证、终身许可证、带 AI 助手的支持收件箱、套餐与定价、开发者 API、支付与邮件设置、版本发布以及完整的审计日志。"
      ],
      [
        "增长",
        "公开网站，为每款应用和每个辖区提供 SEO 页面，另有博客、帮助指南、结构化数据、可安装的 PWA 以及可投放广告的公开页面。"
      ],
      [
        "工程质量",
        "端到端类型化，每次变更都在 CI 中运行单元测试和端到端测试套件，安全加固，速率限制，以及成文的架构蓝图。"
      ]
    ],
    "stackTitle": "技术",
    "stack": "运行在 Cloudflare 全球边缘网络上的 Next.js 15（Pages、Workers、KV、R2）· TypeScript · Go 安装程序 · Docker（多架构）· 浏览器端 AI 工具（PDF.js、Tesseract、ffmpeg.wasm、MediaPipe）· WebRTC 与 WebSocket 实时通信。",
    "guideTitle": "买家指南——从第一次通话到完全拥有",
    "guideLead": "为这一规模的交易提供清晰路径。每一步都可以加快，但没有任何一步会在安全上打折扣。",
    "guide": [
      [
        "初次通话",
        "通过 WhatsApp 或视频与所有者会面，商定范围、时间表和付款方式。",
        "第 1 天"
      ],
      [
        "审阅平台",
        "代码仓库、架构蓝图、测试历史以及将要转让的账户清单将提供给您审阅；可先签署双向保密协议（NDA）。",
        "第 1–3 天"
      ],
      [
        "技术尽职调查",
        "亲自验证：代码可以构建，其单元测试和端到端测试套件在 CI 中运行，一条命令即可启动完整的本地副本。",
        "第 3–14 天"
      ],
      [
        "协议与托管",
        "签署收购协议。对于这一规模的交易，我们建议使用持牌第三方托管机构或分期付款。",
        "第 7–21 天"
      ],
      [
        "付款",
        "电汇至 BNI（SWIFT BNINIDJA）、托管放款、加密货币，或在 PayPal 允许的金额范围内使用 PayPal。付款会自动匹配到您的订单。",
        "交割日"
      ],
      [
        "自动交接",
        "付款经验证的那一刻，您的账户即成为管理员；随后按清单转让域名、Cloudflare、GitHub 和各服务商账户。",
        "交割后 1–7 天"
      ]
    ],
    "timelineTitle": "交接时间表",
    "timeline": [
      [
        "第 0 分钟",
        "管理员权限",
        "付款经验证后自动授予，通过电子邮件确认并记录在审计日志中。"
      ],
      [
        "第 1 天",
        "代码与基础设施",
        "包含完整历史的 GitHub 仓库、Cloudflare 账户（Pages、KV、R2、DNS）以及域名转移授权。"
      ],
      [
        "第 1 周",
        "支付与邮件",
        "支付服务商转移至您的公司或切换到您自己的账户；邮件发送和支持收件箱。"
      ],
      [
        "第 2–4 周",
        "知识转移",
        "逐步讲解架构、发布流水线、管理运维手册和自托管构建，并提供书面答复。"
      ]
    ],
    "transitionNote": "交割后的可选过渡支持可在收购协议中约定。",
    "dataRoomTitle": "可供您审阅",
    "dataRoomLead": "买家核实本页所述内容所需的一切：",
    "dataRoom": [
      "包含历史记录的完整源代码——控制台、引擎、安装程序、CI/CD",
      "架构蓝图与设计决策，按应用逐一说明",
      "单元测试和端到端测试套件及其 CI 运行历史",
      "安全模型：按账户加密、密钥管理、速率限制、审计日志",
      "管理运维手册：支付、网站出售、许可证、版本发布、自托管",
      "将要转让的账户和资产的完整清单"
    ],
    "handoverTitle": "转让给您的内容",
    "handoverLead": "付款经验证的那一刻自动授予管理员权限。其余内容将与所有者按有序清单进行：",
    "handover": [
      "AXTO 门户的管理员权限——付款经验证后自动授予",
      "注册商处的 axto.io 域名",
      "Cloudflare 账户 / 区域：Pages 项目、KV、R2 存储桶、Workers 和 DNS",
      "包含完整历史的 GitHub 仓库（控制台、引擎、安装程序、CI/CD）",
      "支付服务商账户——或干净地切换到您自己的账户（PayPal、Stripe、Xendit、Midtrans、NOWPayments、加密钱包）",
      "邮件发送（Resend）和支持收件箱",
      "Docker 镜像和发布流水线（x86-64 和 ARM64）、AXTO Setup 安装程序",
      "品牌、标志、内容、博客、SEO 页面和翻译（10 种语言）",
      "文档：架构蓝图、管理运维手册、CI/CD 和自托管指南"
    ],
    "stepsTitle": "三步完成收购",
    "steps": [
      [
        "创建或登录您的账户",
        "此账户将成为管理员。"
      ],
      [
        "支付要价",
        "这一规模建议使用银行电汇或第三方托管；也可使用加密货币和 PayPal。"
      ],
      [
        "获得管理员权限",
        "付款经验证后立即生效——随后转让域名、Cloudflare、GitHub 和各服务商账户。"
      ]
    ],
    "checkoutTitle": "安全结账",
    "escrowNote": "对于这一规模的交易，我们建议使用银行电汇或持牌第三方托管机构。PayPal 对单笔付款有限额。",
    "signInFirst": "请登录或创建将拥有 AXTO 的账户，然后返回此处付款。",
    "signIn": "登录",
    "register": "创建账户",
    "company": "公司（可选）",
    "name": "您的姓名",
    "phone": "电话 / WhatsApp",
    "message": "给所有者的留言（可选）",
    "method": "付款方式",
    "pay": "支付 {amount}",
    "paying": "正在启动安全付款…",
    "noMethods": "在线付款方式正在开通中。请通过 WhatsApp 联系所有者，以银行电汇方式进行。",
    "paypalLimit": "PayPal 对单笔付款有限额（通常最高 {max}）。如果 PayPal 拒绝全额付款，请选择加密货币或银行电汇。",
    "test": "测试模式",
    "adminNote": "您当前以管理员身份登录——请使用买家账户登录后购买。",
    "wireTitle": "电汇至 BNI——分步说明",
    "wireIntro": "请准确转账以下金额。您的订单参考号用于识别这笔付款。",
    "amount": "金额",
    "bank": "银行",
    "holder": "收款人",
    "swift": "SWIFT / BIC",
    "code": "银行代码（印度尼西亚）",
    "account": "账号",
    "reference": "参考号 / 付款附言",
    "otherCurrencies": "其他币种账户",
    "wireSteps": [
      "打开您的银行或汇款服务，选择国际（SWIFT）汇款至 Bank Negara Indonesia（BNI），SWIFT BNINIDJA。如从印尼银行汇款，请选择“Transfer ke Bank BNI”（银行代码 009）并使用 IDR 账户。",
      "输入与您汇出币种对应的账号（建议使用 USD），并按所示准确填写收款人姓名。",
      "在付款附言中填写订单参考号，以便将这笔汇款与您的订单匹配。",
      "汇出后，点击下方的“我已汇款”，并通过 WhatsApp 将汇款凭证发送给所有者。",
      "所有者核实资金并确认订单——您的账户将自动成为管理员，并会收到一封电子邮件。"
    ],
    "sentBtn": "我已汇款",
    "sentPh": "您银行的汇款参考号或汇款人姓名",
    "proofSent": "谢谢——所有者会核实这笔电汇（通常在一个工作日内），一经确认即授予您管理员权限。也请通过 WhatsApp {wa} 发送汇款凭证。",
    "whatsappProof": "通过 WhatsApp 发送凭证",
    "cryptoTitle": "使用加密货币付款",
    "cryptoIntro": "请在所示网络上准确发送所示金额。稳定币付款（USDT / USDC）会被自动检测并确认；如使用 BTC、ETH 或 SOL，请在发送后粘贴您的交易哈希。",
    "sendExact": "请准确发送",
    "to": "收款地址",
    "txPh": "交易哈希（TXID）",
    "verify": "验证付款",
    "waiting": "正在等待付款确认——此页面会自动更新。",
    "back": "选择其他方式",
    "canceled": "付款已取消——请重新选择付款方式。",
    "proofWa": "您好，我已为收购 AXTO 汇款。订单参考号：{id}。这是汇款凭证。",
    "handoverWaText": "您好，我收购 AXTO 的付款已验证（订单 {id}）。我们来安排交接吧。",
    "paidTitle": "付款已验证——欢迎您，AXTO 的新所有者。",
    "paidAdmin": "您的账户现已成为整个平台的管理员。",
    "paidPending": "您的付款已记录。所有者正在为您授予管理员权限。",
    "paidTest": "这是一笔测试（沙盒）付款——未更改任何权限。",
    "openAdmin": "打开管理后台",
    "handoverWa": "通过 WhatsApp 协调交接",
    "invoice": "发票",
    "faqTitle": "买家常见问题",
    "faq": [
      [
        "购买后我究竟拥有什么？",
        "现状下的整个业务：域名、源代码及其历史、应用、自托管产品、品牌和内容，以及交接清单中列出的运营账户。代码和品牌的知识产权转让给您。"
      ],
      [
        "付款前我能审阅平台吗？",
        "可以。在您做出承诺之前，代码、架构蓝图、测试历史和将要转让的账户清单都会提供给您审阅，您也可以亲自运行一份完整副本。"
      ],
      [
        "价格可以商量吗？能否使用第三方托管？",
        "请通过 WhatsApp 联系所有者。在通过本页付款之前，可以安排持牌第三方托管机构或分期付款。"
      ],
      [
        "运营成本是多少？",
        "平台运行在 Cloudflare 的无服务器边缘网络上（按量付费），另加一个邮件服务商。会员自行向其 AI 服务商付费，因此 AI 使用不会给公司带来任何成本。"
      ],
      [
        "现有会员及其数据会怎样？",
        "他们的账户、套餐和加密工作保持原样；您成为运营方。他们的文件从未被上传，因此不存在需要迁移的文档存档。"
      ],
      [
        "为什么 PayPal 有时会拒绝这笔金额？",
        "PayPal 对大多数账户的单笔付款设有上限。银行电汇、第三方托管或加密货币可以支付全额。"
      ],
      [
        "管理员权限多快到位？",
        "自动确认的付款（PayPal 收款、银行卡、NOWPayments、链上稳定币）即时到位。银行电汇或第三方托管则在资金核实后立即到位。"
      ]
    ]
  },
  ja: {
    "eyebrow": "非公開の譲渡 · 買い手は1社のみ · 一括譲渡",
    "title": "AXTO を取得する — 完成し、稼働しているエンタープライズ級 AI プラットフォーム。",
    "lead": "稼働中の7つの AI アプリ、10製品のセルフホスト製品ライン、リアルタイム開発者プラットフォーム、世界対応の決済とライセンス、10言語、そして axto.io ブランド — これらすべてを一人のオーナーに譲渡します。お支払いが確認された瞬間に管理者権限が付与され、それ以外はすべて文書化された段階的な引き継ぎに沿って進みます。",
    "price": "希望価格",
    "priceNote": "事業全体の一括取得です。エスクローや分割払いもご相談いただけます。",
    "buy": "取得手続きを始める",
    "guideCta": "購入者ガイドを読む",
    "talk": "オーナーに相談する",
    "sold": "このオファーは成約しました — AXTO は売却済みです。",
    "paused": "このオファーは現在一時停止中です。ご相談はオーナーまでご連絡ください。",
    "stats": {
      "apps": "稼働中のクラウドアプリ",
      "selfHosted": "セルフホスト製品",
      "langs": "言語",
      "gateways": "決済手段",
      "jurisdictions": "法域",
      "tests": "自動テスト",
      "transports": "接続方式"
    },
    "highlightsTitle": "このプラットフォームを所有する価値",
    "highlightsLead": "周辺の運用まで含めて完成した製品です — プロトタイプでもテンプレートでもありません。",
    "highlights": [
      [
        "🏛️",
        "7つの主力 AI アプリ",
        "36の専門ワークスペースとデバイス上の法務ツールを備えた Legal AI、バイラルなショート動画のための Clipper、AI Studio、Privacy Vault、Compliance Center、Security Analyst、そして240件の専門プロンプトライブラリ — すべて稼働中で、あらゆるデバイスに対応。"
      ],
      [
        "🛡️",
        "買い手が検証できるプライバシー設計",
        "ファイルはメンバーのデバイス上で処理され、AI はメンバー自身のキー、またはメンバー自身のコンピューター上のモデル（Local Mode）で動作し、保存した作業はアカウントごとに暗号化されます。"
      ],
      [
        "⚙️",
        "人手を介さない運用",
        "決済、プランの有効化、ライセンス、ダウンロード — そしてこの売却自体も — 支払いが確認されると自動的に完了します。その他はすべて管理ポータルで対応できます。"
      ],
      [
        "⚡",
        "リアルタイム開発者プラットフォーム",
        "AXTO Connect：REST、Server-Sent Events、WebSocket、ロングポーリング、HTTP/2 ストリーミング、gRPC 互換の Connect API、WebRTC、署名付き Webhook、AI エージェント向けの MCP サーバー。"
      ],
      [
        "🌍",
        "初日からグローバル",
        "10言語、州・省レベルまでの200以上の法域、そして PayPal やカードから QRIS、暗号資産、銀行送金までの決済手段。"
      ],
      [
        "🐳",
        "セルフホスト製品ライン",
        "x86-64 と ARM64 に対応した Windows・macOS・Linux 向け Docker エディション。AXTO Setup インストーラーと Ed25519 署名付きオフラインライセンスを備えています。"
      ]
    ],
    "promiseTitle": "設計からクライアントサイド — プライバシーの保証",
    "promiseLead": "AXTO は、メンバーのデータがメンバーの手元に留まるように作られています。現時点で保証している内容を正確に示します：",
    "promise": [
      [
        "ファイルはデバイスの外に出ません",
        "文書、PDF、スプレッドシート、画像、スキャン、動画は、ブラウザ内で開き、読み取り（OCR）、編集、墨消し、レンダリング、書き出しを行います — PDF.js、Tesseract、ffmpeg.wasm、デバイス上の顔トラッキングを使用。処理のためにアップロードされるものは一切ありません。"
      ],
      [
        "自分のキー・モデル・エンドポイントを持ち込み",
        "BYOK・BYOX・BYOM：すべての AI リクエストは、メンバー自身のキーと選んだプロバイダー（またはメンバー自身のモデルサーバー）で実行されます。AXTO はエッジでリクエストを中継するだけで、保存も学習への利用も一切しません。キーは保存時に暗号化されます。"
      ],
      [
        "Local Mode — メンバー自身のデバイスで AI を実行",
        "メンバーは自分のコンピューター上の Ollama、LM Studio、または OpenAI 互換サーバーを接続できます。プロンプトはブラウザ内で組み立てられ、AI リクエストが AXTO のサーバーを経由することはありません。"
      ],
      [
        "作業は暗号化、アカウントごとに1つの鍵",
        "保存されたチャット、プロジェクト、案件、レポート、墨消し結果は、アカウントごとに固有の鍵で暗号化されます。"
      ],
      [
        "マネージド AI — 近日提供",
        "AXTO が提供するモデルは準備済みですがロックされています。サービスが準備・完成した段階で初めて手動で有効化され、それまでは何も販売しません。"
      ]
    ],
    "appsTitle": "含まれるすべてのもの",
    "appsLead": "以下のアプリはすべて本番稼働中で、あらゆるデバイスと10言語に対応しています。",
    "selfHostedTitle": "セルフホスト製品ライン",
    "selfHostedLead": "x86-64 と ARM64 向けの Docker イメージ、Windows・macOS・Linux 向けの AXTO Setup インストーラー、署名付きライセンスとオフライン認証。",
    "engineTitle": "事業を動かす仕組み",
    "engine": [
      [
        "世界中での決済",
        "PayPal、インドネシアで処理され会社の銀行口座に入金されるクレジット／デビットカード（Xendit または Midtrans。利用可能な地域では Stripe も）、インドネシアの QRIS／バーチャル口座／電子ウォレット、NOWPayments 経由の暗号資産、オンチェーンで確認されるウォレット直接送金、そして銀行振込 — それぞれ本番用とサンドボックス用の認証情報を分けて暗号化して保管。"
      ],
      [
        "サブスクリプションと永久ライセンス",
        "期間に応じた日割り計算、請求書、更新リマインダーを備えた4つのプラン。1〜100台向けの永久ライセンスは Ed25519 署名付きのオフライン認証に対応。"
      ],
      [
        "開発者プラットフォーム",
        "AXTO Connect はすべての有料プランに API キー、ライブイベントチャンネル、AI ストリーミング、WebRTC ルーム、署名付き Webhook、MCP ツールを提供 — プランごとの上限、暗号化、管理者用スイッチ付き。"
      ],
      [
        "管理ポータル",
        "メンバー、注文と決済、ライセンス、永久ライセンス、AI アシスタント付きサポート受信箱、プランと料金、開発者 API、決済・メール設定、リリース、そして完全な監査ログ。"
      ],
      [
        "成長",
        "すべてのアプリと法域の SEO ページを備えた公開サイト、ブログ、ヘルプガイド、構造化データ、インストール可能な PWA、広告掲載に対応した公開ページ。"
      ],
      [
        "エンジニアリング品質",
        "エンドツーエンドの型付け、変更ごとに CI で実行されるユニットテストと E2E テスト、セキュリティ強化、レート制限、そして文書化されたアーキテクチャのブループリント。"
      ]
    ],
    "stackTitle": "技術",
    "stack": "Cloudflare のグローバルエッジ上の Next.js 15（Pages、Workers、KV、R2）· TypeScript · Go 製インストーラー · Docker（マルチアーキテクチャ）· ブラウザ側 AI ツール（PDF.js、Tesseract、ffmpeg.wasm、MediaPipe）· WebRTC と WebSocket によるリアルタイム通信。",
    "guideTitle": "購入者ガイド — 最初の通話から完全な所有まで",
    "guideLead": "この規模の取引のための明確な道筋です。どのステップも短縮できますが、安全面で省略されるステップはありません。",
    "guide": [
      [
        "顔合わせの通話",
        "WhatsApp またはビデオ通話でオーナーと話し、範囲、スケジュール、支払い方法を決めます。",
        "1日目"
      ],
      [
        "プラットフォームの確認",
        "リポジトリ、アーキテクチャのブループリント、テスト履歴、譲渡されるアカウントの一覧をご確認いただけます。事前に相互 NDA を締結することも可能です。",
        "1〜3日目"
      ],
      [
        "技術デューデリジェンス",
        "ご自身で確認できます：コードはビルドでき、ユニットテストと E2E テストは CI で実行され、完全なローカルコピーはコマンド1つで起動します。",
        "3〜14日目"
      ],
      [
        "契約とエスクロー",
        "譲渡契約に署名します。この規模の取引では、認可を受けたエスクロー業者の利用または分割払いをお勧めします。",
        "7〜21日目"
      ],
      [
        "お支払い",
        "BNI（SWIFT BNINIDJA）への銀行送金、エスクローの解放、暗号資産、または PayPal が許容する金額での PayPal。お支払いは自動的にご注文と照合されます。",
        "クロージング日"
      ],
      [
        "自動引き継ぎ",
        "お支払いが確認された瞬間にあなたのアカウントが管理者になり、その後ドメイン、Cloudflare、GitHub、各プロバイダーのアカウントがチェックリストに沿って移管されます。",
        "クロージング後1〜7日"
      ]
    ],
    "timelineTitle": "引き継ぎのタイムライン",
    "timeline": [
      [
        "0分",
        "管理者権限",
        "お支払いの確認時に自動的に付与され、メールで通知され、監査ログに記録されます。"
      ],
      [
        "1日目",
        "コードとインフラ",
        "全履歴付きの GitHub リポジトリ、Cloudflare アカウント（Pages、KV、R2、DNS）、ドメイン移管の承認コード。"
      ],
      [
        "1週目",
        "決済とメール",
        "決済プロバイダーを貴社へ移管、またはご自身のアカウントへ切り替え。メール送信とサポート受信箱。"
      ],
      [
        "2〜4週目",
        "ナレッジトランスファー",
        "アーキテクチャ、リリースパイプライン、管理運用手順書、セルフホストのビルドを順を追って説明し、回答は書面でお渡しします。"
      ]
    ],
    "transitionNote": "クロージング後の移行サポートは、任意で譲渡契約に定めることができます。",
    "dataRoomTitle": "ご確認いただける資料",
    "dataRoomLead": "このページの記載内容を買い手が検証するために必要なものすべて：",
    "dataRoom": [
      "履歴付きの全ソースコード — ダッシュボード、エンジン、インストーラー、CI/CD",
      "アプリごとのアーキテクチャのブループリントと設計判断",
      "ユニットテストと E2E テストのスイート、およびその CI 実行履歴",
      "セキュリティモデル：アカウントごとの暗号化、シークレットの取り扱い、レート制限、監査ログ",
      "管理運用手順書：決済、サイト売却、ライセンス、リリース、セルフホスト",
      "譲渡されるアカウントと資産の完全な一覧"
    ],
    "handoverTitle": "あなたに譲渡されるもの",
    "handoverLead": "管理者権限は、お支払いが確認された瞬間に自動的に付与されます。残りはオーナーと一緒に整理されたチェックリストに沿って進めます：",
    "handover": [
      "AXTO ポータルの管理者権限 — お支払いの確認時に自動付与",
      "レジストラにある axto.io ドメイン",
      "Cloudflare アカウント／ゾーン：Pages プロジェクト、KV、R2 バケット、Workers、DNS",
      "全履歴付きの GitHub リポジトリ（ダッシュボード、エンジン、インストーラー、CI/CD）",
      "決済プロバイダーのアカウント — またはご自身のアカウントへのクリーンな切り替え（PayPal、Stripe、Xendit、Midtrans、NOWPayments、暗号資産ウォレット）",
      "メール送信（Resend）とサポート受信箱",
      "Docker イメージとリリースパイプライン（x86-64 と ARM64）、AXTO Setup インストーラー",
      "ブランド、ロゴ、コンテンツ、ブログ、SEO ページ、翻訳（10言語）",
      "ドキュメント：アーキテクチャのブループリント、管理運用手順書、CI/CD とセルフホストのガイド"
    ],
    "stepsTitle": "3ステップで取得",
    "steps": [
      [
        "アカウントを作成またはサインイン",
        "このアカウントが管理者になります。"
      ],
      [
        "希望価格を支払う",
        "この金額では銀行送金またはエスクローをお勧めします。暗号資産と PayPal もご利用いただけます。"
      ],
      [
        "管理者権限を受け取る",
        "お支払いの確認後すぐに付与 — その後、ドメイン、Cloudflare、GitHub、各プロバイダーのアカウントが移管されます。"
      ]
    ],
    "checkoutTitle": "安全なチェックアウト",
    "escrowNote": "この規模の取引では、銀行送金または認可を受けたエスクロー業者の利用をお勧めします。PayPal は1回あたりの支払額に上限があります。",
    "signInFirst": "AXTO を所有するアカウントでサインインするか作成してから、こちらに戻ってお支払いください。",
    "signIn": "サインイン",
    "register": "アカウントを作成",
    "company": "会社名（任意）",
    "name": "お名前",
    "phone": "電話 / WhatsApp",
    "message": "オーナーへのメッセージ（任意）",
    "method": "お支払い方法",
    "pay": "{amount} を支払う",
    "paying": "安全な決済を開始しています…",
    "noMethods": "オンライン決済手段は現在有効化の準備中です。銀行送金で進める場合は WhatsApp でオーナーにご連絡ください。",
    "paypalLimit": "PayPal は1回の支払額に上限があります（通常 {max} まで）。PayPal で全額が拒否された場合は、暗号資産または銀行送金をお選びください。",
    "test": "テストモード",
    "adminNote": "管理者としてサインインしています — 購入するには買い手のアカウントでサインインしてください。",
    "wireTitle": "BNI への銀行送金 — 手順",
    "wireIntro": "以下の金額を正確にお振り込みください。注文番号でお支払いを識別します。",
    "amount": "金額",
    "bank": "銀行",
    "holder": "受取人",
    "swift": "SWIFT / BIC",
    "code": "銀行コード（インドネシア）",
    "account": "口座番号",
    "reference": "参照番号 / 送金メモ",
    "otherCurrencies": "その他の通貨の口座",
    "wireSteps": [
      "ご利用の銀行または送金サービスを開き、Bank Negara Indonesia（BNI）、SWIFT BNINIDJA への国際送金（SWIFT）を選びます。インドネシアの銀行からは「Transfer ke Bank BNI」（銀行コード 009）を選び、IDR 口座をご利用ください。",
      "送金する通貨の口座番号（USD 推奨）と、表示どおりの受取人名を正確に入力します。",
      "送金がご注文と照合されるよう、送金メモに注文番号を記入します。",
      "送金後、下の「送金しました」をクリックし、送金明細を WhatsApp でオーナーに送ってください。",
      "オーナーが入金を確認して注文を確定すると、あなたのアカウントが自動的に管理者になり、メールが届きます。"
    ],
    "sentBtn": "送金しました",
    "sentPh": "銀行の送金参照番号または送金者名",
    "proofSent": "ありがとうございます — オーナーが送金を確認し（通常1営業日以内）、確認された時点で管理者権限が付与されます。送金明細を WhatsApp {wa} にもお送りください。",
    "whatsappProof": "WhatsApp で明細を送る",
    "cryptoTitle": "暗号資産で支払う",
    "cryptoIntro": "表示されたネットワークで、表示された金額を正確に送金してください。ステーブルコイン（USDT / USDC）での支払いは自動で検出・確認されます。BTC、ETH、SOL の場合は送金後にトランザクションハッシュを貼り付けてください。",
    "sendExact": "正確な送金額",
    "to": "送金先アドレス",
    "txPh": "トランザクションハッシュ（TXID）",
    "verify": "支払いを確認",
    "waiting": "お支払いの確認を待っています — このページは自動で更新されます。",
    "back": "別の方法を選ぶ",
    "canceled": "お支払いはキャンセルされました — もう一度お支払い方法を選んでください。",
    "proofWa": "こんにちは。AXTO の取得のための送金を行いました。注文番号：{id}。送金明細をお送りします。",
    "handoverWaText": "こんにちは。AXTO 取得のお支払いが確認されました（注文 {id}）。引き継ぎの段取りをお願いします。",
    "paidTitle": "お支払いを確認しました — AXTO の新しいオーナー様、ようこそ。",
    "paidAdmin": "あなたのアカウントはプラットフォーム全体の管理者になりました。",
    "paidPending": "お支払いは記録されました。オーナーが管理者権限を付与しています。",
    "paidTest": "これはテスト（サンドボックス）決済でした — 権限は変更されていません。",
    "openAdmin": "管理ポータルを開く",
    "handoverWa": "WhatsApp で引き継ぎを調整する",
    "invoice": "請求書",
    "faqTitle": "買い手からのよくある質問",
    "faq": [
      [
        "購入後、具体的に何を所有することになりますか？",
        "現状のままの事業全体です：ドメイン、ソースコードとその履歴、アプリ、セルフホスト製品、ブランドとコンテンツ、そして引き継ぎチェックリストに記載された運用アカウント。コードとブランドの知的財産権はあなたに移転します。"
      ],
      [
        "支払い前にプラットフォームを確認できますか？",
        "はい。ご契約前に、コード、アーキテクチャのブループリント、テスト履歴、譲渡されるアカウントの一覧をご確認いただけます。完全なコピーをご自身で動かすこともできます。"
      ],
      [
        "価格交渉やエスクローの利用は可能ですか？",
        "WhatsApp でオーナーにご相談ください。このページからお支払いいただく前に、認可を受けたエスクロー業者や分割払いを手配できます。"
      ],
      [
        "運営コストはどのくらいですか？",
        "プラットフォームは Cloudflare のサーバーレスエッジ（従量課金）とメールプロバイダーで動作します。メンバーは自分の AI プロバイダーに支払うため、AI の利用に会社の費用はかかりません。"
      ],
      [
        "既存のメンバーとそのデータはどうなりますか？",
        "メンバーのアカウント、プラン、暗号化された作業はそのまま残り、あなたが運営者になります。メンバーのファイルは一度もアップロードされていないため、移行すべき文書アーカイブはありません。"
      ],
      [
        "PayPal がこの金額を拒否することがあるのはなぜですか？",
        "PayPal はほとんどのアカウントで1回あたりの支払額に上限を設けています。銀行送金、エスクロー、暗号資産なら全額をお支払いいただけます。"
      ],
      [
        "管理者権限はどのくらいで付与されますか？",
        "自動で確認される支払い（PayPal キャプチャ、カード、NOWPayments、オンチェーンのステーブルコイン）は即時です。銀行送金やエスクローの場合は、入金が確認され次第付与されます。"
      ]
    ]
  },
  hi: {
    "eyebrow": "निजी अधिग्रहण · एक ही ख़रीदार · पूर्ण हस्तांतरण",
    "title": "AXTO का अधिग्रहण करें — एक एंटरप्राइज़-स्तरीय AI प्लेटफ़ॉर्म, पूरा और चालू।",
    "lead": "सात लाइव AI ऐप्लिकेशन, दस उत्पादों की सेल्फ़-होस्टेड लाइन, एक रीयल-टाइम डेवलपर प्लेटफ़ॉर्म, दुनिया भर में भुगतान और लाइसेंसिंग, दस भाषाएँ और axto.io ब्रांड — सब एक ही मालिक को हस्तांतरित। जिस क्षण आपका भुगतान सत्यापित होता है, एडमिनिस्ट्रेटर एक्सेस दे दिया जाता है; बाक़ी सब कुछ एक दस्तावेज़ीकृत, चरण-दर-चरण हैंडओवर के अनुसार होता है।",
    "price": "माँगी गई कीमत",
    "priceNote": "पूरे व्यवसाय का एकमुश्त अधिग्रहण। एस्क्रो और किस्तों में भुगतान की व्यवस्था की जा सकती है।",
    "buy": "अधिग्रहण शुरू करें",
    "guideCta": "ख़रीदार गाइड पढ़ें",
    "talk": "मालिक से बात करें",
    "sold": "यह प्रस्ताव स्वीकार कर लिया गया है — AXTO बिक चुका है।",
    "paused": "यह प्रस्ताव फ़िलहाल रोका गया है। चर्चा के लिए मालिक से संपर्क करें।",
    "stats": {
      "apps": "लाइव क्लाउड ऐप",
      "selfHosted": "सेल्फ़-होस्टेड उत्पाद",
      "langs": "भाषाएँ",
      "gateways": "भुगतान के तरीके",
      "jurisdictions": "क़ानूनी क्षेत्राधिकार",
      "tests": "स्वचालित टेस्ट",
      "transports": "कनेक्ट करने के तरीके"
    },
    "highlightsTitle": "यह प्लेटफ़ॉर्म रखने लायक क्यों है",
    "highlightsLead": "अपने पूरे संचालन के साथ एक तैयार उत्पाद — न प्रोटोटाइप, न टेम्पलेट।",
    "highlights": [
      [
        "🏛️",
        "सात प्रमुख AI ऐप्लिकेशन",
        "36 विशेषज्ञ वर्कस्पेस और डिवाइस पर चलने वाले क़ानूनी टूल के साथ Legal AI, वायरल शॉर्ट वीडियो के लिए Clipper, AI Studio, Privacy Vault, Compliance Center, Security Analyst और 240 विशेषज्ञ प्रॉम्प्ट की लाइब्रेरी — सब लाइव, हर डिवाइस पर।"
      ],
      [
        "🛡️",
        "ऐसी गोपनीयता संरचना जिसे ख़रीदार ख़ुद जाँच सकें",
        "फ़ाइलें सदस्य के डिवाइस पर प्रोसेस होती हैं, AI सदस्य की अपनी कुंजियों पर या उसके अपने कंप्यूटर के मॉडल पर (Local Mode) चलता है, और सहेजा गया काम हर खाते के लिए अलग से एन्क्रिप्ट होता है।"
      ],
      [
        "⚙️",
        "बिना मैनुअल हस्तक्षेप का संचालन",
        "भुगतान, प्लान सक्रियण, लाइसेंस, डाउनलोड — और यह बिक्री भी — भुगतान सत्यापित होते ही अपने-आप पूरे हो जाते हैं। बाक़ी सब कुछ एडमिन पोर्टल में है।"
      ],
      [
        "⚡",
        "एक रीयल-टाइम डेवलपर प्लेटफ़ॉर्म",
        "AXTO Connect: REST, Server-Sent Events, WebSocket, लॉन्ग पोलिंग, HTTP/2 स्ट्रीमिंग, gRPC-संगत Connect API, WebRTC, साइन किए गए वेबहुक और AI एजेंटों के लिए MCP सर्वर।"
      ],
      [
        "🌍",
        "पहले दिन से वैश्विक",
        "दस भाषाएँ, राज्य और प्रांत स्तर तक 200+ क़ानूनी क्षेत्राधिकार, और PayPal व कार्ड से लेकर QRIS, क्रिप्टो और बैंक वायर तक भुगतान के माध्यम।"
      ],
      [
        "🐳",
        "सेल्फ़-होस्टेड उत्पाद लाइन",
        "x86-64 और ARM64 पर Windows, macOS और Linux के लिए Docker संस्करण, AXTO Setup इंस्टॉलर और Ed25519-हस्ताक्षरित ऑफ़लाइन लाइसेंस के साथ।"
      ]
    ],
    "promiseTitle": "डिज़ाइन से ही क्लाइंट-साइड — हमारी गोपनीयता गारंटी",
    "promiseLead": "AXTO इस तरह बनाया गया है कि सदस्य का डेटा सदस्य के पास ही रहे। आज जो सटीक रूप से गारंटीड है, वह यह है:",
    "promise": [
      [
        "फ़ाइलें कभी डिवाइस से बाहर नहीं जातीं",
        "दस्तावेज़, PDF, स्प्रेडशीट, इमेज, स्कैन और वीडियो ब्राउज़र में ही खोले, पढ़े (OCR), संपादित, रिडैक्ट, रेंडर और एक्सपोर्ट किए जाते हैं — PDF.js, Tesseract, ffmpeg.wasm और डिवाइस पर फ़ेस ट्रैकिंग के साथ। प्रोसेसिंग के लिए कुछ भी अपलोड नहीं होता।"
      ],
      [
        "अपनी कुंजी, मॉडल या एंडपॉइंट लाएँ",
        "BYOK, BYOX और BYOM: हर AI अनुरोध सदस्य की अपनी कुंजी और उसके चुने हुए प्रदाता (या उसके अपने मॉडल सर्वर) पर चलता है। AXTO अनुरोध को केवल एज पर आगे भेजता है — उसे कभी संग्रहीत नहीं करता और कभी उस पर ट्रेनिंग नहीं करता। कुंजियाँ संग्रहीत अवस्था में एन्क्रिप्ट रहती हैं।"
      ],
      [
        "Local Mode — सदस्य के अपने डिवाइस पर AI",
        "सदस्य अपने कंप्यूटर पर Ollama, LM Studio या कोई भी OpenAI-संगत सर्वर जोड़ सकते हैं: प्रॉम्प्ट ब्राउज़र में बनता है और AI अनुरोध कभी AXTO के सर्वरों से होकर नहीं गुज़रता।"
      ],
      [
        "एन्क्रिप्टेड काम, हर खाते की अपनी कुंजी",
        "सहेजी गई चैट, प्रोजेक्ट, मामले, रिपोर्ट और रिडैक्शन हर खाते की अनूठी कुंजी से एन्क्रिप्ट होते हैं।"
      ],
      [
        "प्रबंधित AI — जल्द आ रहा है",
        "AXTO द्वारा दिए जाने वाले मॉडल तैयार हैं लेकिन लॉक हैं। सेवा पूरी तरह तैयार और परिपूर्ण होने पर ही इन्हें मैन्युअल रूप से चालू किया जाएगा — उससे पहले कुछ भी नहीं बेचा जाता।"
      ]
    ],
    "appsTitle": "इसमें शामिल सब कुछ",
    "appsLead": "नीचे दिया हर ऐप प्रोडक्शन में लाइव है, हर डिवाइस पर, दस भाषाओं में।",
    "selfHostedTitle": "सेल्फ़-होस्टेड उत्पाद लाइन",
    "selfHostedLead": "x86-64 और ARM64 के लिए Docker इमेज, Windows, macOS और Linux के लिए AXTO Setup इंस्टॉलर, हस्ताक्षरित लाइसेंस और ऑफ़लाइन सक्रियण।",
    "engineTitle": "व्यवसाय का इंजन",
    "engine": [
      [
        "दुनिया भर में भुगतान",
        "PayPal, इंडोनेशिया में प्रोसेस होकर कंपनी के बैंक खाते में जमा होने वाले क्रेडिट / डेबिट कार्ड (Xendit या Midtrans; जहाँ उपलब्ध हो वहाँ Stripe भी), इंडोनेशियाई QRIS / वर्चुअल अकाउंट / ई-वॉलेट, NOWPayments के ज़रिए क्रिप्टो, ऑन-चेन पुष्ट होने वाले सीधे वॉलेट ट्रांसफ़र, और बैंक ट्रांसफ़र — हर एक के लिए अलग लाइव और सैंडबॉक्स क्रेडेंशियल, एन्क्रिप्टेड।"
      ],
      [
        "सब्सक्रिप्शन और आजीवन लाइसेंस",
        "समय-आधारित प्रो-रेटिंग, इनवॉइस और नवीनीकरण रिमाइंडर के साथ चार प्लान; 1–100 डिवाइस के लिए स्थायी लाइसेंस, Ed25519-हस्ताक्षरित ऑफ़लाइन सक्रियण के साथ।"
      ],
      [
        "डेवलपर प्लेटफ़ॉर्म",
        "AXTO Connect हर पेड प्लान को API कुंजियाँ, लाइव इवेंट चैनल, AI स्ट्रीमिंग, WebRTC रूम, साइन किए गए वेबहुक और MCP टूल देता है — प्लान सीमाओं, एन्क्रिप्शन और एडमिन स्विच के साथ।"
      ],
      [
        "एडमिन पोर्टल",
        "सदस्य, ऑर्डर और भुगतान, लाइसेंस, आजीवन लाइसेंस, AI सहायक वाला सपोर्ट इनबॉक्स, प्लान और मूल्य, डेवलपर API, भुगतान और ई-मेल सेटिंग, रिलीज़ और पूरा ऑडिट लॉग।"
      ],
      [
        "विकास",
        "हर ऐप और क्षेत्राधिकार के लिए SEO पेजों वाली सार्वजनिक साइट, एक ब्लॉग, सहायता गाइड, संरचित डेटा, इंस्टॉल करने योग्य PWA और विज्ञापन के लिए तैयार सार्वजनिक पेज।"
      ],
      [
        "इंजीनियरिंग गुणवत्ता",
        "शुरू से अंत तक टाइप्ड, हर बदलाव पर CI में यूनिट और एंड-टू-एंड टेस्ट सूट, सुरक्षा सुदृढ़ीकरण, रेट लिमिट और एक लिखित आर्किटेक्चर ब्लूप्रिंट।"
      ]
    ],
    "stackTitle": "टेक्नोलॉजी",
    "stack": "Cloudflare के वैश्विक एज पर Next.js 15 (Pages, Workers, KV, R2) · TypeScript · Go इंस्टॉलर · Docker (मल्टी-आर्किटेक्चर) · ब्राउज़र-साइड AI टूलिंग (PDF.js, Tesseract, ffmpeg.wasm, MediaPipe) · WebRTC और WebSocket रीयल-टाइम।",
    "guideTitle": "ख़रीदार गाइड — पहली कॉल से पूर्ण स्वामित्व तक",
    "guideLead": "इस आकार के लेन-देन के लिए एक स्पष्ट रास्ता। हर चरण तेज़ किया जा सकता है; सुरक्षा के मामले में कोई चरण छोड़ा नहीं जाता।",
    "guide": [
      [
        "परिचय कॉल",
        "WhatsApp या वीडियो पर मालिक से मिलें। दायरा, समय-सीमा और भुगतान का तरीका तय करें।",
        "दिन 1"
      ],
      [
        "प्लेटफ़ॉर्म की समीक्षा",
        "रिपॉज़िटरी, आर्किटेक्चर ब्लूप्रिंट, टेस्ट इतिहास और हस्तांतरित होने वाले खातों की सूची आपकी समीक्षा के लिए उपलब्ध कराई जाती है; पहले आपसी NDA पर हस्ताक्षर किए जा सकते हैं।",
        "दिन 1–3"
      ],
      [
        "तकनीकी ड्यू डिलिजेंस",
        "इसे ख़ुद चलाकर देखें: कोड बिल्ड होता है, उसके यूनिट और एंड-टू-एंड सूट CI में चलते हैं, और एक ही कमांड से पूरी लोकल कॉपी शुरू हो जाती है।",
        "दिन 3–14"
      ],
      [
        "समझौता और एस्क्रो",
        "ख़रीद समझौते पर हस्ताक्षर करें। इस आकार के लेन-देन के लिए हम लाइसेंसशुदा एस्क्रो एजेंट या किस्तों में भुगतान की सलाह देते हैं।",
        "दिन 7–21"
      ],
      [
        "भुगतान",
        "BNI (SWIFT BNINIDJA) को बैंक वायर, एस्क्रो रिलीज़, क्रिप्टो, या PayPal जितनी राशि की अनुमति देता है उसके लिए PayPal। भुगतान अपने-आप आपके ऑर्डर से मिलाया जाता है।",
        "क्लोज़िंग का दिन"
      ],
      [
        "स्वचालित हैंडओवर",
        "भुगतान सत्यापित होते ही आपका खाता एडमिनिस्ट्रेटर बन जाता है; फिर डोमेन, Cloudflare, GitHub और प्रदाता खाते चेकलिस्ट के अनुसार हस्तांतरित होते हैं।",
        "क्लोज़िंग + 1–7 दिन"
      ]
    ],
    "timelineTitle": "हैंडओवर की समय-सीमा",
    "timeline": [
      [
        "मिनट 0",
        "एडमिनिस्ट्रेटर एक्सेस",
        "भुगतान सत्यापित होने पर अपने-आप दिया जाता है, ई-मेल से पुष्टि की जाती है और ऑडिट लॉग में दर्ज होता है।"
      ],
      [
        "दिन 1",
        "कोड और इंफ्रास्ट्रक्चर",
        "पूरे इतिहास के साथ GitHub रिपॉज़िटरी, Cloudflare खाता (Pages, KV, R2, DNS) और डोमेन ट्रांसफ़र प्राधिकरण।"
      ],
      [
        "सप्ताह 1",
        "भुगतान और ई-मेल",
        "भुगतान प्रदाता आपकी कंपनी को हस्तांतरित या आपके अपने खातों पर स्विच; ई-मेल भेजना और सपोर्ट इनबॉक्स।"
      ],
      [
        "सप्ताह 2–4",
        "ज्ञान हस्तांतरण",
        "आर्किटेक्चर, रिलीज़ पाइपलाइन, एडमिन रनबुक और सेल्फ़-होस्टेड बिल्ड का विस्तृत परिचय, लिखित उत्तरों के साथ।"
      ]
    ],
    "transitionNote": "क्लोज़िंग के बाद वैकल्पिक ट्रांज़िशन सहायता ख़रीद समझौते में तय की जा सकती है।",
    "dataRoomTitle": "आपकी समीक्षा के लिए उपलब्ध",
    "dataRoomLead": "इस पेज के दावों की जाँच के लिए ख़रीदार को जो कुछ चाहिए:",
    "dataRoom": [
      "इतिहास सहित पूरा सोर्स कोड — डैशबोर्ड, इंजन, इंस्टॉलर, CI/CD",
      "आर्किटेक्चर ब्लूप्रिंट और डिज़ाइन निर्णय, ऐप-दर-ऐप",
      "यूनिट और एंड-टू-एंड टेस्ट सूट, उनके CI रन इतिहास के साथ",
      "सुरक्षा मॉडल: प्रति-खाता एन्क्रिप्शन, सीक्रेट प्रबंधन, रेट लिमिट, ऑडिट लॉग",
      "एडमिन रनबुक: भुगतान, साइट बिक्री, लाइसेंस, रिलीज़, सेल्फ़-होस्टिंग",
      "हस्तांतरित होने वाले खातों और परिसंपत्तियों की पूरी सूची"
    ],
    "handoverTitle": "आपको क्या हस्तांतरित होता है",
    "handoverLead": "भुगतान सत्यापित होते ही एडमिनिस्ट्रेटर एक्सेस अपने-आप दे दिया जाता है। बाक़ी सब मालिक के साथ एक व्यवस्थित चेकलिस्ट के अनुसार होता है:",
    "handover": [
      "AXTO पोर्टल का एडमिनिस्ट्रेटर एक्सेस — भुगतान सत्यापित होने पर स्वचालित",
      "रजिस्ट्रार पर axto.io डोमेन",
      "Cloudflare खाता / ज़ोन: Pages प्रोजेक्ट, KV, R2 बकेट, Workers और DNS",
      "पूरे इतिहास के साथ GitHub रिपॉज़िटरी (डैशबोर्ड, इंजन, इंस्टॉलर, CI/CD)",
      "भुगतान प्रदाता खाते — या आपके अपने खातों पर साफ़ स्विच (PayPal, Stripe, Xendit, Midtrans, NOWPayments, क्रिप्टो वॉलेट)",
      "ई-मेल भेजना (Resend) और सपोर्ट इनबॉक्स",
      "Docker इमेज और रिलीज़ पाइपलाइन (x86-64 और ARM64), AXTO Setup इंस्टॉलर",
      "ब्रांड, लोगो, सामग्री, ब्लॉग, SEO पेज और अनुवाद (10 भाषाएँ)",
      "दस्तावेज़: आर्किटेक्चर ब्लूप्रिंट, एडमिन रनबुक, CI/CD और सेल्फ़-होस्टिंग गाइड"
    ],
    "stepsTitle": "तीन चरणों में अधिग्रहण",
    "steps": [
      [
        "अपना खाता बनाएँ या साइन इन करें",
        "यही खाता एडमिनिस्ट्रेटर बनता है।"
      ],
      [
        "माँगी गई कीमत चुकाएँ",
        "इस राशि के लिए बैंक वायर या एस्क्रो की सलाह दी जाती है; क्रिप्टो और PayPal भी उपलब्ध हैं।"
      ],
      [
        "एडमिनिस्ट्रेटर एक्सेस प्राप्त करें",
        "भुगतान सत्यापित होते ही तुरंत — फिर डोमेन, Cloudflare, GitHub और प्रदाता खाते हस्तांतरित किए जाते हैं।"
      ]
    ],
    "checkoutTitle": "सुरक्षित चेकआउट",
    "escrowNote": "इस आकार के लेन-देन के लिए हम बैंक वायर या लाइसेंसशुदा एस्क्रो एजेंट की सलाह देते हैं। PayPal एकल भुगतान को सीमित करता है।",
    "signInFirst": "उस खाते से साइन इन करें या वह खाता बनाएँ जो AXTO का मालिक होगा, फिर भुगतान के लिए यहाँ लौटें।",
    "signIn": "साइन इन करें",
    "register": "खाता बनाएँ",
    "company": "कंपनी (वैकल्पिक)",
    "name": "आपका नाम",
    "phone": "फ़ोन / WhatsApp",
    "message": "मालिक के लिए संदेश (वैकल्पिक)",
    "method": "भुगतान का तरीका",
    "pay": "{amount} का भुगतान करें",
    "paying": "सुरक्षित भुगतान शुरू हो रहा है…",
    "noMethods": "ऑनलाइन भुगतान के तरीके चालू किए जा रहे हैं। बैंक वायर से आगे बढ़ने के लिए WhatsApp पर मालिक से संपर्क करें।",
    "paypalLimit": "PayPal एकल भुगतान को सीमित करता है (आमतौर पर {max} तक)। यदि PayPal पूरी राशि अस्वीकार करता है, तो क्रिप्टो या बैंक वायर चुनें।",
    "test": "टेस्ट मोड",
    "adminNote": "आप एडमिनिस्ट्रेटर के रूप में साइन इन हैं — ख़रीदने के लिए ख़रीदार के खाते से साइन इन करें।",
    "wireTitle": "BNI को बैंक वायर — चरण-दर-चरण",
    "wireIntro": "ठीक नीचे दी गई राशि ट्रांसफ़र करें। आपका ऑर्डर संदर्भ भुगतान की पहचान करता है।",
    "amount": "राशि",
    "bank": "बैंक",
    "holder": "लाभार्थी",
    "swift": "SWIFT / BIC",
    "code": "बैंक कोड (इंडोनेशिया)",
    "account": "खाता संख्या",
    "reference": "संदर्भ / भुगतान नोट",
    "otherCurrencies": "अन्य मुद्राओं के खाते",
    "wireSteps": [
      "अपना बैंक या वायर सेवा खोलें और Bank Negara Indonesia (BNI), SWIFT BNINIDJA को अंतरराष्ट्रीय (SWIFT) ट्रांसफ़र चुनें। किसी इंडोनेशियाई बैंक से “Transfer ke Bank BNI” (बैंक कोड 009) चुनें और IDR खाता इस्तेमाल करें।",
      "जिस मुद्रा में आप भेज रहे हैं उसकी खाता संख्या (USD की सलाह दी जाती है) और लाभार्थी का नाम ठीक वैसा ही दर्ज करें जैसा दिखाया गया है।",
      "भुगतान नोट में ऑर्डर संदर्भ लिखें ताकि ट्रांसफ़र आपके ऑर्डर से मिलाया जा सके।",
      "भेजने के बाद नीचे “मैंने वायर भेज दिया है” पर क्लिक करें और ट्रांसफ़र रसीद WhatsApp पर मालिक को भेजें।",
      "मालिक राशि की जाँच करके ऑर्डर की पुष्टि करता है — आपका खाता अपने-आप एडमिनिस्ट्रेटर बन जाता है और आपको एक ई-मेल मिलता है।"
    ],
    "sentBtn": "मैंने वायर भेज दिया है",
    "sentPh": "आपके बैंक का ट्रांसफ़र संदर्भ या भेजने वाले का नाम",
    "proofSent": "धन्यवाद — मालिक वायर की जाँच करता है (आमतौर पर एक कार्य-दिवस के भीतर) और पुष्टि होते ही आपको एडमिनिस्ट्रेटर एक्सेस दे दिया जाता है। कृपया रसीद WhatsApp {wa} पर भी भेजें।",
    "whatsappProof": "रसीद WhatsApp पर भेजें",
    "cryptoTitle": "क्रिप्टो से भुगतान करें",
    "cryptoIntro": "दिखाए गए नेटवर्क पर ठीक दिखाई गई राशि भेजें। स्टेबलकॉइन भुगतान (USDT / USDC) अपने-आप पहचाने और पुष्ट किए जाते हैं; BTC, ETH या SOL के लिए भेजने के बाद अपना ट्रांज़ैक्शन हैश पेस्ट करें।",
    "sendExact": "ठीक इतना भेजें",
    "to": "पता (प्राप्तकर्ता)",
    "txPh": "ट्रांज़ैक्शन हैश (TXID)",
    "verify": "भुगतान सत्यापित करें",
    "waiting": "भुगतान की पुष्टि का इंतज़ार है — यह पेज अपने-आप अपडेट होता है।",
    "back": "दूसरा तरीका चुनें",
    "canceled": "भुगतान रद्द कर दिया गया — कृपया फिर से कोई तरीका चुनें।",
    "proofWa": "नमस्ते, मैंने AXTO अधिग्रहण के लिए वायर भेज दिया है। ऑर्डर संदर्भ: {id}। यह रही ट्रांसफ़र रसीद।",
    "handoverWaText": "नमस्ते, मेरा AXTO अधिग्रहण भुगतान सत्यापित हो गया है (ऑर्डर {id})। आइए हैंडओवर की व्यवस्था करें।",
    "paidTitle": "भुगतान सत्यापित — AXTO के मालिक, आपका स्वागत है।",
    "paidAdmin": "आपका खाता अब पूरे प्लेटफ़ॉर्म का एडमिनिस्ट्रेटर है।",
    "paidPending": "आपका भुगतान दर्ज हो गया है। मालिक द्वारा एडमिनिस्ट्रेटर एक्सेस दिया जा रहा है।",
    "paidTest": "यह एक टेस्ट (सैंडबॉक्स) भुगतान था — कोई एक्सेस नहीं बदला गया।",
    "openAdmin": "एडमिन पोर्टल खोलें",
    "handoverWa": "WhatsApp पर हैंडओवर का समन्वय करें",
    "invoice": "इनवॉइस",
    "faqTitle": "ख़रीदारों के सवाल",
    "faq": [
      [
        "ख़रीद के बाद ठीक-ठीक मेरा क्या होगा?",
        "पूरा व्यवसाय, जैसा वह है: डोमेन, सोर्स कोड और उसका इतिहास, ऐप, सेल्फ़-होस्टेड उत्पाद, ब्रांड और सामग्री, और हैंडओवर चेकलिस्ट में सूचीबद्ध संचालन खाते। कोड और ब्रांड की बौद्धिक संपदा आपको हस्तांतरित होती है।"
      ],
      [
        "क्या मैं भुगतान से पहले प्लेटफ़ॉर्म की समीक्षा कर सकता/सकती हूँ?",
        "हाँ। प्रतिबद्ध होने से पहले कोड, आर्किटेक्चर ब्लूप्रिंट, टेस्ट इतिहास और हस्तांतरित होने वाले खातों की सूची समीक्षा के लिए उपलब्ध कराई जाती है, और आप पूरी कॉपी ख़ुद चला सकते हैं।"
      ],
      [
        "क्या कीमत पर बातचीत हो सकती है, या हम एस्क्रो का उपयोग कर सकते हैं?",
        "WhatsApp पर मालिक से बात करें। इस पेज से भुगतान करने से पहले लाइसेंसशुदा एस्क्रो एजेंट या किस्तों में भुगतान की व्यवस्था की जा सकती है।"
      ],
      [
        "इसे चलाने में कितना ख़र्च आता है?",
        "प्लेटफ़ॉर्म Cloudflare के सर्वरलेस एज (जितना उपयोग, उतना भुगतान) और एक ई-मेल प्रदाता पर चलता है। सदस्य अपने AI प्रदाताओं को ख़ुद भुगतान करते हैं, इसलिए AI उपयोग से कंपनी पर कोई ख़र्च नहीं आता।"
      ],
      [
        "मौजूदा सदस्यों और उनके डेटा का क्या होगा?",
        "उनके खाते, प्लान और एन्क्रिप्टेड काम बिल्कुल वैसे ही रहते हैं; आप संचालक बन जाते हैं। उनकी फ़ाइलें कभी अपलोड नहीं हुईं, इसलिए माइग्रेट करने के लिए कोई दस्तावेज़ संग्रह नहीं है।"
      ],
      [
        "PayPal कभी-कभी यह राशि अस्वीकार क्यों करता है?",
        "अधिकांश खातों के लिए PayPal एकल भुगतान की सीमा तय करता है। बैंक वायर, एस्क्रो या क्रिप्टो से पूरी कीमत चुकाई जा सकती है।"
      ],
      [
        "एडमिनिस्ट्रेटर एक्सेस कितनी जल्दी मिलता है?",
        "अपने-आप पुष्ट होने वाले भुगतानों (PayPal कैप्चर, कार्ड, NOWPayments, ऑन-चेन स्टेबलकॉइन) के लिए तुरंत। बैंक वायर या एस्क्रो के लिए, राशि सत्यापित होते ही।"
      ]
    ]
  },
  ar: {
    "eyebrow": "استحواذ خاص · مشترٍ واحد · نقل كامل",
    "title": "استحوذ على AXTO — منصة ذكاء اصطناعي بمستوى المؤسسات، مكتملة وتعمل.",
    "lead": "سبعة تطبيقات ذكاء اصطناعي تعمل فعليًا، وخط من عشرة منتجات للاستضافة الذاتية، ومنصة مطوّرين فورية، ومدفوعات وتراخيص حول العالم، وعشر لغات، وعلامة axto.io — تُنقل كلها إلى مالك واحد. تُمنح صلاحيات المسؤول لحظة التحقق من دفعتك؛ وكل ما عدا ذلك يتبع عملية تسليم موثّقة خطوة بخطوة.",
    "price": "السعر المطلوب",
    "priceNote": "استحواذ لمرة واحدة على النشاط التجاري بأكمله. يمكن ترتيب حساب ضمان (escrow) ودفع على مراحل.",
    "buy": "ابدأ الاستحواذ",
    "guideCta": "اقرأ دليل المشتري",
    "talk": "تحدّث إلى المالك",
    "sold": "تم قبول هذا العرض — لقد بيعت AXTO.",
    "paused": "العرض متوقف مؤقتًا في الوقت الحالي. تواصل مع المالك للنقاش.",
    "stats": {
      "apps": "تطبيقات سحابية عاملة",
      "selfHosted": "منتجات للاستضافة الذاتية",
      "langs": "لغات",
      "gateways": "طرق دفع",
      "jurisdictions": "ولاية قضائية",
      "tests": "اختبار آلي",
      "transports": "طرق للاتصال"
    },
    "highlightsTitle": "لماذا تستحق هذه المنصة أن تمتلكها",
    "highlightsLead": "منتج مكتمل مع كل العمليات المحيطة به — ليس نموذجًا أوليًا ولا قالبًا جاهزًا.",
    "highlights": [
      [
        "🏛️",
        "سبعة تطبيقات ذكاء اصطناعي رائدة",
        "Legal AI مع 36 مساحة عمل متخصصة وأدوات قانونية تعمل على الجهاز، وClipper لمقاطع الفيديو القصيرة الرائجة، وAI Studio، وPrivacy Vault، وCompliance Center، وSecurity Analyst، ومكتبة من 240 موجّهًا احترافيًا — تعمل كلها، وعلى كل جهاز."
      ],
      [
        "🛡️",
        "بنية خصوصية يستطيع المشتري التحقق منها",
        "تُعالج الملفات على جهاز العضو، ويعمل الذكاء الاصطناعي بمفاتيح العضو نفسه أو بنموذج على حاسوبه الخاص (Local Mode)، ويُشفَّر العمل المحفوظ لكل حساب على حدة."
      ],
      [
        "⚙️",
        "تشغيل دون أي تدخل يدوي",
        "المدفوعات وتفعيل الخطط والتراخيص والتنزيلات — وهذا البيع نفسه — تكتمل تلقائيًا بمجرد التحقق من الدفعة. وتغطي بوابة الإدارة كل ما عدا ذلك."
      ],
      [
        "⚡",
        "منصة مطوّرين فورية",
        "AXTO Connect: ‏REST، وServer-Sent Events، وWebSocket، والاستطلاع الطويل (long polling)، والبث عبر HTTP/2، وواجهة Connect API متوافقة مع gRPC، وWebRTC، وwebhooks موقّعة، وخادم MCP لوكلاء الذكاء الاصطناعي."
      ],
      [
        "🌍",
        "عالمية منذ اليوم الأول",
        "عشر لغات، وأكثر من 200 ولاية قضائية حتى مستوى الولاية والمقاطعة، وقنوات دفع من PayPal والبطاقات إلى QRIS والعملات المشفرة والتحويل البنكي."
      ],
      [
        "🐳",
        "خط منتجات للاستضافة الذاتية",
        "إصدارات Docker لأنظمة Windows وmacOS وLinux على x86-64 وARM64، مع مُثبّت AXTO Setup وتراخيص دون اتصال موقّعة بـ Ed25519."
      ]
    ],
    "promiseTitle": "من جهة العميل بالتصميم — ضمان الخصوصية لدينا",
    "promiseLead": "بُنيت AXTO بحيث تبقى بيانات العضو مع العضو. هذا ما هو مضمون اليوم، بدقة:",
    "promise": [
      [
        "الملفات لا تغادر الجهاز أبدًا",
        "تُفتح المستندات وملفات PDF وجداول البيانات والصور والمسوحات الضوئية ومقاطع الفيديو وتُقرأ (OCR) وتُحرَّر وتُحجب وتُعرض وتُصدَّر داخل المتصفح — باستخدام PDF.js وTesseract وffmpeg.wasm وتتبّع الوجه على الجهاز. لا يُرفع أي شيء للمعالجة."
      ],
      [
        "أحضر مفتاحك أو نموذجك أو نقطة الاتصال الخاصة بك",
        "BYOK وBYOX وBYOM: يُنفَّذ كل طلب ذكاء اصطناعي بمفتاح العضو نفسه ومزوّده المختار (أو خادم النماذج الخاص به). تكتفي AXTO بتمرير الطلب عند الحافة — لا تخزّنه أبدًا ولا تدرّب عليه أبدًا. والمفاتيح مشفّرة أثناء التخزين."
      ],
      [
        "Local Mode — الذكاء الاصطناعي على جهاز العضو نفسه",
        "يمكن للأعضاء توصيل Ollama أو LM Studio أو أي خادم متوافق مع OpenAI على حواسيبهم: يُبنى الموجّه داخل المتصفح ولا يمر طلب الذكاء الاصطناعي أبدًا عبر خوادم AXTO."
      ],
      [
        "عمل مشفّر، ومفتاح واحد لكل حساب",
        "المحادثات والمشاريع والقضايا والتقارير وعمليات الحجب المحفوظة مشفّرة بمفتاح فريد لكل حساب."
      ],
      [
        "ذكاء اصطناعي مُدار — قريبًا",
        "النماذج التي توفّرها AXTO جاهزة لكنها مقفلة. لن تُفعَّل يدويًا إلا عندما تصبح الخدمة جاهزة ومتقنة — ولا يُباع شيء قبل ذلك."
      ]
    ],
    "appsTitle": "كل ما هو مشمول",
    "appsLead": "كل تطبيق أدناه يعمل في بيئة الإنتاج، على كل جهاز، وبعشر لغات.",
    "selfHostedTitle": "خط منتجات الاستضافة الذاتية",
    "selfHostedLead": "صور Docker لمعماريتي x86-64 وARM64، ومُثبّت AXTO Setup لأنظمة Windows وmacOS وLinux، وتراخيص موقّعة وتفعيل دون اتصال.",
    "engineTitle": "محرّك النشاط التجاري",
    "engine": [
      [
        "مدفوعات حول العالم",
        "PayPal، وبطاقات الائتمان / الخصم المعالَجة في إندونيسيا والمودَعة في الحساب البنكي للشركة (Xendit أو Midtrans؛ وStripe أيضًا حيث يتوفر)، وQRIS / الحسابات الافتراضية / المحافظ الإلكترونية الإندونيسية، والعملات المشفرة عبر NOWPayments، والتحويلات المباشرة من المحافظ المؤكَّدة على السلسلة، والتحويل البنكي — لكلٍّ منها بيانات اعتماد منفصلة للتشغيل الفعلي والاختبار (sandbox)، مشفّرة."
      ],
      [
        "اشتراكات وتراخيص مدى الحياة",
        "أربع خطط مع احتساب تناسبي بحسب المدة، وفواتير، وتذكيرات بالتجديد؛ وتراخيص دائمة من جهاز واحد إلى 100 جهاز مع تفعيل دون اتصال موقّع بـ Ed25519."
      ],
      [
        "منصة المطوّرين",
        "يمنح AXTO Connect كل خطة مدفوعة مفاتيح API وقنوات أحداث مباشرة وبث الذكاء الاصطناعي وغرف WebRTC وwebhooks موقّعة وأدوات MCP — مع حدود لكل خطة وتشفير ومفتاح تحكم إداري."
      ],
      [
        "بوابة الإدارة",
        "الأعضاء، والطلبات والمدفوعات، والتراخيص، والتراخيص مدى الحياة، وصندوق دعم مع مساعد ذكاء اصطناعي، والخطط والأسعار، وواجهة API للمطوّرين، وإعدادات الدفع والبريد الإلكتروني، والإصدارات، وسجل تدقيق كامل."
      ],
      [
        "النمو",
        "موقع عام بصفحات SEO لكل تطبيق ولكل ولاية قضائية، ومدونة، وأدلة مساعدة، وبيانات منظَّمة، وتطبيق PWA قابل للتثبيت، وصفحات عامة جاهزة للإعلانات."
      ],
      [
        "جودة هندسية",
        "أنواع بيانات صارمة من البداية إلى النهاية، ومجموعات اختبارات وحدة واختبارات شاملة في CI مع كل تغيير، وتحصين أمني، وحدود للمعدّل، ومخطط معماري مكتوب."
      ]
    ],
    "stackTitle": "التقنية",
    "stack": "Next.js 15 على شبكة Cloudflare الطرفية العالمية (Pages وWorkers وKV وR2) · TypeScript · مُثبّت بلغة Go · Docker (متعدد المعماريات) · أدوات ذكاء اصطناعي في المتصفح (PDF.js وTesseract وffmpeg.wasm وMediaPipe) · اتصال فوري عبر WebRTC وWebSocket.",
    "guideTitle": "دليل المشتري — من المكالمة الأولى إلى الملكية الكاملة",
    "guideLead": "مسار واضح لصفقة بهذا الحجم. يمكن تسريع كل خطوة؛ ولا تُتجاوز أي خطوة على حساب الأمان.",
    "guide": [
      [
        "مكالمة تعارف",
        "التقِ بالمالك عبر WhatsApp أو مكالمة فيديو. اتفقا على النطاق والجدول الزمني وطريقة الدفع التي تفضّلها.",
        "اليوم 1"
      ],
      [
        "مراجعة المنصة",
        "تُتاح لك المستودعات والمخطط المعماري وسجل الاختبارات وقائمة الحسابات التي ستُنقل للمراجعة؛ ويمكن توقيع اتفاقية عدم إفصاح متبادلة أولًا.",
        "الأيام 1–3"
      ],
      [
        "الفحص النافي للجهالة التقني",
        "شغّلها بنفسك: الشيفرة تُبنى، ومجموعات اختبارات الوحدة والاختبارات الشاملة تعمل في CI، ونسخة محلية كاملة تبدأ بأمر واحد.",
        "الأيام 3–14"
      ],
      [
        "الاتفاقية والضمان",
        "وقّع اتفاقية الشراء. لصفقة بهذا الحجم نوصي بوكيل ضمان مرخَّص أو بالدفع على مراحل.",
        "الأيام 7–21"
      ],
      [
        "الدفع",
        "تحويل بنكي إلى BNI ‏(SWIFT BNINIDJA)، أو الإفراج عن مبلغ الضمان، أو العملات المشفرة، أو PayPal للمبالغ التي يسمح بها. تُطابَق الدفعة مع طلبك تلقائيًا.",
        "يوم الإغلاق"
      ],
      [
        "تسليم تلقائي",
        "يصبح حسابك مسؤولًا لحظة التحقق من الدفعة؛ ثم تُنقل النطاق وCloudflare وGitHub وحسابات المزوّدين وفق قائمة التحقق.",
        "الإغلاق + 1–7 أيام"
      ]
    ],
    "timelineTitle": "الجدول الزمني للتسليم",
    "timeline": [
      [
        "الدقيقة 0",
        "صلاحيات المسؤول",
        "تُمنح تلقائيًا عند التحقق من الدفعة، ويُؤكَّد ذلك بالبريد الإلكتروني ويُسجَّل في سجل التدقيق."
      ],
      [
        "اليوم 1",
        "الشيفرة والبنية التحتية",
        "مستودعات GitHub بسجلها الكامل، وحساب Cloudflare ‏(Pages وKV وR2 وDNS)، وتفويض نقل النطاق."
      ],
      [
        "الأسبوع 1",
        "المدفوعات والبريد الإلكتروني",
        "نقل مزوّدي الدفع إلى شركتك أو التحويل إلى حساباتك الخاصة؛ وإرسال البريد الإلكتروني وصناديق الدعم."
      ],
      [
        "الأسابيع 2–4",
        "نقل المعرفة",
        "شروحات تفصيلية للبنية المعمارية وخط الإصدار وأدلة تشغيل الإدارة وبناء الاستضافة الذاتية، مع إجابات مكتوبة."
      ]
    ],
    "transitionNote": "يمكن الاتفاق في اتفاقية الشراء على دعم انتقالي اختياري بعد الإغلاق.",
    "dataRoomTitle": "متاح لمراجعتك",
    "dataRoomLead": "كل ما يحتاجه المشتري للتحقق من الادعاءات الواردة في هذه الصفحة:",
    "dataRoom": [
      "الشيفرة المصدرية الكاملة مع سجلها — لوحة التحكم، والمحركات، والمُثبّت، وCI/CD",
      "المخطط المعماري وقرارات التصميم، تطبيقًا تلو الآخر",
      "مجموعات اختبارات الوحدة والاختبارات الشاملة مع سجل تشغيلها في CI",
      "النموذج الأمني: تشفير لكل حساب، وإدارة الأسرار، وحدود المعدّل، وسجل التدقيق",
      "أدلة تشغيل الإدارة: المدفوعات، وبيع الموقع، والتراخيص، والإصدارات، والاستضافة الذاتية",
      "القائمة الكاملة للحسابات والأصول التي تُنقل"
    ],
    "handoverTitle": "ما الذي يُنقل إليك",
    "handoverLead": "تُمنح صلاحيات المسؤول تلقائيًا لحظة التحقق من دفعتك. ويتبع الباقي قائمة تحقق منظَّمة مع المالك:",
    "handover": [
      "صلاحيات المسؤول على بوابة AXTO — تلقائيًا عند التحقق من الدفعة",
      "النطاق axto.io لدى جهة التسجيل",
      "حساب / منطقة Cloudflare: مشروع Pages، وKV، وحاويات R2، وWorkers، وDNS",
      "مستودعات GitHub (لوحة التحكم، والمحركات، والمُثبّت، وCI/CD) بسجلها الكامل",
      "حسابات مزوّدي الدفع — أو تحويل نظيف إلى حساباتك (PayPal وStripe وXendit وMidtrans وNOWPayments ومحافظ العملات المشفرة)",
      "إرسال البريد الإلكتروني (Resend) وصناديق الدعم",
      "صور Docker وخط الإصدار (x86-64 وARM64)، ومُثبّت AXTO Setup",
      "العلامة التجارية والشعار والمحتوى والمدونة وصفحات SEO والترجمات (10 لغات)",
      "التوثيق: المخطط المعماري، وأدلة تشغيل الإدارة، وأدلة CI/CD والاستضافة الذاتية"
    ],
    "stepsTitle": "استحوذ في ثلاث خطوات",
    "steps": [
      [
        "أنشئ حسابك أو سجّل الدخول",
        "هذا الحساب يصبح المسؤول."
      ],
      [
        "ادفع السعر المطلوب",
        "يُنصح بالتحويل البنكي أو الضمان لمبلغ بهذا الحجم؛ وتتوفر العملات المشفرة وPayPal أيضًا."
      ],
      [
        "احصل على صلاحيات المسؤول",
        "فورًا عند التحقق من الدفعة — ثم تُنقل النطاق وCloudflare وGitHub وحسابات المزوّدين."
      ]
    ],
    "checkoutTitle": "دفع آمن",
    "escrowNote": "لصفقة بهذا الحجم نوصي بالتحويل البنكي أو بوكيل ضمان مرخَّص. يفرض PayPal حدًا على الدفعة الواحدة.",
    "signInFirst": "سجّل الدخول أو أنشئ الحساب الذي سيمتلك AXTO، ثم عُد إلى هنا للدفع.",
    "signIn": "تسجيل الدخول",
    "register": "إنشاء حساب",
    "company": "الشركة (اختياري)",
    "name": "اسمك",
    "phone": "الهاتف / WhatsApp",
    "message": "رسالة إلى المالك (اختياري)",
    "method": "طريقة الدفع",
    "pay": "ادفع {amount}",
    "paying": "جارٍ بدء الدفع الآمن…",
    "noMethods": "يجري تفعيل طرق الدفع عبر الإنترنت. تواصل مع المالك عبر WhatsApp للمتابعة بالتحويل البنكي.",
    "paypalLimit": "يفرض PayPal حدًا على الدفعة الواحدة (عادةً حتى {max}). إذا رفض PayPal المبلغ كاملًا، فاختر العملات المشفرة أو التحويل البنكي.",
    "test": "وضع الاختبار",
    "adminNote": "أنت مسجّل الدخول بصفتك مسؤولًا — سجّل الدخول بحساب المشتري لإتمام الشراء.",
    "wireTitle": "تحويل بنكي إلى BNI — خطوة بخطوة",
    "wireIntro": "حوّل المبلغ المبيَّن أدناه بالضبط. مرجع طلبك هو ما يحدّد الدفعة.",
    "amount": "المبلغ",
    "bank": "البنك",
    "holder": "المستفيد",
    "swift": "SWIFT / BIC",
    "code": "رمز البنك (إندونيسيا)",
    "account": "رقم الحساب",
    "reference": "المرجع / ملاحظة الدفع",
    "otherCurrencies": "حسابات بعملات أخرى",
    "wireSteps": [
      "افتح تطبيق بنكك أو خدمة التحويل واختر تحويلًا دوليًا (SWIFT) إلى Bank Negara Indonesia ‏(BNI)، ‏SWIFT BNINIDJA. ومن بنك إندونيسي اختر «Transfer ke Bank BNI» (رمز البنك 009) واستخدم حساب IDR.",
      "أدخل رقم الحساب الخاص بالعملة التي ترسلها (يُنصح بـ USD) واسم المستفيد تمامًا كما هو معروض.",
      "اكتب مرجع الطلب في ملاحظة الدفع حتى يُطابَق التحويل مع طلبك.",
      "بعد الإرسال، انقر «لقد أرسلت التحويل» أدناه وأرسل إيصال التحويل إلى المالك عبر WhatsApp.",
      "يتحقق المالك من وصول المبلغ ويؤكد الطلب — فيصبح حسابك مسؤولًا تلقائيًا وتتلقى رسالة بريد إلكتروني."
    ],
    "sentBtn": "لقد أرسلت التحويل",
    "sentPh": "مرجع التحويل لدى بنكك أو اسم المُرسِل",
    "proofSent": "شكرًا — يتحقق المالك من التحويل (عادةً خلال يوم عمل واحد) وتُمنح صلاحيات المسؤول لحظة تأكيده. يُرجى أيضًا إرسال الإيصال عبر WhatsApp ‏{wa}.",
    "whatsappProof": "أرسل الإيصال عبر WhatsApp",
    "cryptoTitle": "الدفع بالعملات المشفرة",
    "cryptoIntro": "أرسل المبلغ المعروض بالضبط على الشبكة المعروضة. تُكتشف مدفوعات العملات المستقرة (USDT / USDC) وتُؤكَّد تلقائيًا؛ أما BTC أو ETH أو SOL فالصق تجزئة المعاملة بعد الإرسال.",
    "sendExact": "أرسل بالضبط",
    "to": "إلى العنوان",
    "txPh": "تجزئة المعاملة (TXID)",
    "verify": "تحقّق من الدفعة",
    "waiting": "بانتظار تأكيد الدفعة — تتحدّث هذه الصفحة تلقائيًا.",
    "back": "اختر طريقة أخرى",
    "canceled": "أُلغيت الدفعة — اختر طريقة الدفع مرة أخرى.",
    "proofWa": "مرحبًا، لقد أرسلت التحويل الخاص بالاستحواذ على AXTO. مرجع الطلب: {id}. هذا إيصال التحويل.",
    "handoverWaText": "مرحبًا، تم التحقق من دفعتي للاستحواذ على AXTO (الطلب {id}). لنرتّب عملية التسليم.",
    "paidTitle": "تم التحقق من الدفعة — مرحبًا بك، مالك AXTO.",
    "paidAdmin": "أصبح حسابك الآن مسؤولًا عن المنصة بأكملها.",
    "paidPending": "تم تسجيل دفعتك. يقوم المالك بمنح صلاحيات المسؤول.",
    "paidTest": "كانت هذه دفعة اختبارية (sandbox) — لم يتغيّر أي وصول.",
    "openAdmin": "افتح بوابة الإدارة",
    "handoverWa": "نسّق عملية التسليم عبر WhatsApp",
    "invoice": "الفاتورة",
    "faqTitle": "أسئلة يطرحها المشترون",
    "faq": [
      [
        "ما الذي أمتلكه بالضبط بعد الشراء؟",
        "النشاط التجاري بأكمله كما هو: النطاق، والشيفرة المصدرية وسجلها، والتطبيقات، ومنتجات الاستضافة الذاتية، والعلامة التجارية والمحتوى، وحسابات التشغيل المدرجة في قائمة التسليم. وتنتقل إليك الملكية الفكرية للشيفرة والعلامة التجارية."
      ],
      [
        "هل يمكنني مراجعة المنصة قبل الدفع؟",
        "نعم. تُتاح الشيفرة والمخطط المعماري وسجل الاختبارات وقائمة الحسابات المنقولة للمراجعة قبل التزامك، ويمكنك تشغيل نسخة كاملة بنفسك."
      ],
      [
        "هل السعر قابل للتفاوض، أو هل يمكننا استخدام الضمان؟",
        "تحدّث إلى المالك عبر WhatsApp. يمكن ترتيب وكيل ضمان مرخَّص أو دفع على مراحل قبل الدفع عبر هذه الصفحة."
      ],
      [
        "كم تكلفة تشغيلها؟",
        "تعمل المنصة على الشبكة الطرفية بلا خوادم من Cloudflare (الدفع حسب الاستخدام) إضافة إلى مزوّد للبريد الإلكتروني. يدفع الأعضاء لمزوّدي الذكاء الاصطناعي الخاصين بهم، لذا لا يكلّف استخدام الذكاء الاصطناعي الشركة شيئًا."
      ],
      [
        "ماذا يحدث للأعضاء الحاليين وبياناتهم؟",
        "تبقى حساباتهم وخططهم وأعمالهم المشفّرة كما هي تمامًا؛ وتصبح أنت المشغّل. لم تُرفع ملفاتهم قط، لذا لا يوجد أرشيف مستندات يحتاج إلى ترحيل."
      ],
      [
        "لماذا يرفض PayPal هذا المبلغ أحيانًا؟",
        "يضع PayPal سقفًا للدفعة الواحدة في معظم الحسابات. أما التحويل البنكي أو الضمان أو العملات المشفرة فتغطي السعر كاملًا."
      ],
      [
        "ما سرعة الحصول على صلاحيات المسؤول؟",
        "فورية للمدفوعات المؤكَّدة تلقائيًا (التحصيل عبر PayPal، والبطاقة، وNOWPayments، والعملات المستقرة على السلسلة). وفي حالة التحويل البنكي أو الضمان، بمجرد التحقق من وصول الأموال."
      ]
    ]
  },
};
