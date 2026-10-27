/* AXTO — the licence auction (/auction, /app/auction, the homepage winners) in
 * 10 languages. English lives in lib/auction-copy.ts (rendered statically);
 * this module loads only when a visitor reads the page in another language. */
import type { Lang } from "../i18n-shared";
import { AUC_EN, type AucCopy } from "../auction-copy";

export const AUC: Record<Lang, AucCopy> = {
  en: AUC_EN,

  id: {
    "eyebrow": "Lelang lisensi · setiap 2 minggu",
    "title": "Menangkan lisensi self-hosted AXTO mulai 25 % dari harganya.",
    "lead": "Setiap dua minggu, satu lisensi dari setiap paket yang dilelang jatuh ke penawar tertinggi. Penawaran dibuka di {open} dari harga normal dan setiap lelang berakhir hari Jumat pukul 07.00 WIB. Menang, bayar lewat checkout biasa, dan lisensi aktif dengan sendirinya.",
    "endsIn": "Lelang ini berakhir dalam",
    "all": "Semua",
    "paid": "Lunas",
    "unpaid": "Belum membayar",
    "nextReady": "{n} lot lelang berikutnya sudah siap — lelang itu dimulai begitu lelang ini berakhir.",
    "endsAt": "Berakhir {date}",
    "nextAuction": "Lelang berikutnya berakhir {date}",
    "units": {
      "d": "h",
      "h": "j",
      "m": "m",
      "s": "d"
    },
    "cta": "Masuk untuk menawar",
    "ctaMember": "Menawar di ruang kerja Anda",
    "lot": {
      "normal": "Harga normal",
      "current": "Tawaran saat ini",
      "opening": "Tawaran pembuka",
      "nextMin": "Minimum berikutnya",
      "bids": "{n} tawaran",
      "noBids": "Belum ada tawaran",
      "leader": "Teratas: {name}",
      "sold": "Dimenangkan oleh {name}",
      "unsold": "Tidak ada pemenang",
      "awaiting": "Dimenangkan {name} — belum membayar",
      "cancelled": "Dibatalkan",
      "save": "{pct} di bawah harga normal",
      "extended": "Tawaran pada {n} menit terakhir memperpanjang lot"
    },
    "kinds": {
      "edition": "Lisensi edisi",
      "lifetime": "Lisensi seumur hidup"
    },
    "emptyT": "Belum ada lot di lelang ini",
    "emptyB": "Lot berikutnya dibuka saat lelang berikutnya dimulai. Kunjungi lagi sebentar lagi.",
    "offT": "Lelang sedang dijeda",
    "offB": "Saat ini tidak ada lelang yang berjalan.",
    "howTitle": "Cara kerja lelang",
    "how": [
      [
        "Verifikasi e-mail Anda",
        "Masuk, konfirmasi kode 6 digit yang kami kirim lewat e-mail, lalu pilih nama yang ditampilkan bila Anda menang."
      ],
      [
        "Menawar",
        "Penawaran dibuka di {open} dari harga normal; setiap tawaran menaikkan harga tepat {step} dari harga awal itu. Tawaran pada {snipe} menit terakhir memperpanjang lot."
      ],
      [
        "Menang hari Jumat",
        "Setiap lelang berakhir hari Jumat pukul 07.00 WIB. Tawaran tertinggi menang."
      ],
      [
        "Bayar dalam {hours} jam",
        "Bayar lewat checkout biasa. Transfer bank wajib menyertakan screenshot bukti bayar yang disetujui admin. Sampai pembayaran terkonfirmasi, kemenangan ditampilkan sebagai belum membayar."
      ],
      [
        "Lisensi otomatis",
        "Begitu pembayaran terkonfirmasi, lisensi diterbitkan, ditandatangani dan siap dipasang — tanpa menunggu siapa pun."
      ]
    ],
    "rulesTitle": "Aturan",
    "rules": [
      "Satu lot per paket di setiap lelang; satu lisensi per lot.",
      "Tawaran pembuka {open} dari harga normal pada hari lot dibuka; setiap tawaran menaikkan harga tepat {step} dari harga awal.",
      "Tawaran tidak pernah boleh melebihi harga normal.",
      "Hanya anggota terverifikasi yang menawar; Anda tidak bisa melampaui tawaran Anda sendiri.",
      "Lisensi dikirim hanya setelah pemenang membayar; kemenangan yang belum dibayar tetap tampil dengan keterangan belum membayar. Transfer bank wajib dengan screenshot bukti bayar dan persetujuan admin.",
      "Lisensinya sama dengan yang dibeli di harga normal: fitur, pembaruan dan dukungan yang sama.",
      "Pemenang memilih nama perusahaan atau pribadi yang ditampilkan — tanpa merek perusahaan lain, tanpa data kontak, tanpa kata yang menyinggung."
    ],
    "winnersTitle": "Pemenang terbaru",
    "winnersLead": "Nama yang dipilih setiap pemenang dan paket yang dimenangkannya.",
    "noWinners": "Pemenang pertama tampil di sini setelah lelang pertama berakhir.",
    "lastTitle": "Hasil lelang sebelumnya",
    "paidFor": "{amount} (normal {normal})",
    "faqTitle": "Pertanyaan",
    "faq": [
      [
        "Apakah lisensi lelang berbeda dari lisensi biasa?",
        "Tidak. Fitur bertanda tangan, pembaruan dan dukungannya sama dengan paket yang sama yang dibeli di harga normal."
      ],
      [
        "Kapan lelang berakhir?",
        "Setiap dua minggu, selalu hari Jumat pukul 07.00 WIB. Tawaran di menit-menit terakhir memperpanjang lot agar tidak ada yang dikalahkan di detik terakhir."
      ],
      [
        "Bagaimana cara membayar bila saya menang?",
        "Di ruang kerja Anda, dengan metode pembayaran checkout biasa. Untuk transfer bank, unggah screenshot bukti bayar; admin akan menyetujuinya. Lisensi terkirim otomatis setelah pembayaran terkonfirmasi."
      ],
      [
        "Bagaimana bila saya menang tetapi tidak membayar?",
        "Lisensi tidak dikirim. Kemenangan Anda tetap tampil dengan keterangan belum membayar sampai Anda membayar; admin dapat menyerahkan lot ke penawar berikutnya."
      ],
      [
        "Mengapa e-mail saya perlu diverifikasi?",
        "Agar setiap tawaran datang dari anggota nyata yang bisa dihubungi. Cukup satu kode."
      ],
      [
        "Nama apa yang ditampilkan bila saya menang?",
        "Nama perusahaan atau pribadi yang Anda pilih. Anda bisa mengubahnya di halaman Lelang. Merek perusahaan lain dan data kontak tidak diizinkan."
      ]
    ],
    "home": {
      "title": "Lelang lisensi — setiap 2 minggu",
      "lead": "Pemenang terbaru lisensi self-hosted AXTO, dengan tawaran mulai 25 % dari harga normal.",
      "link": "Lihat lelang ini →"
    },
    "me": {
      "title": "Lelang lisensi",
      "lead": "Tawar lot di lelang ini. Penawaran dibuka di {open} dari harga normal.",
      "verifyT": "Verifikasi e-mail Anda untuk menawar",
      "verifyB": "Hanya anggota terverifikasi yang menawar. Kami mengirim kode 6 digit ke {email}.",
      "send": "Kirim kode",
      "sent": "Kode dikirim ke {email}. Berlaku 15 menit.",
      "codeLabel": "Kode 6 digit",
      "verify": "Verifikasi",
      "resend": "Kirim kode baru",
      "nameT": "Nama yang ditampilkan bila Anda menang",
      "nameB": "Nama perusahaan atau nama Anda sendiri, ditampilkan bersama kemenangan Anda di axto.io. Tanpa merek perusahaan lain, tanpa data kontak.",
      "nameLabel": "Nama tampilan",
      "saveName": "Simpan nama",
      "nameSaved": "Tersimpan.",
      "verified": "Penawar terverifikasi",
      "bidLabel": "Tawaran Anda (USD)",
      "bid": "Ajukan tawaran",
      "minHint": "Tawaran berikutnya: {amount}",
      "bidAt": "Tawar {amount}",
      "receiptNote": "Bayar lewat transfer bank? Screenshot bukti bayar wajib: unggah di panel pembayaran. Admin akan menyetujuinya dan lisensi Anda langsung terkirim.",
      "leading": "Tawaran Anda tertinggi",
      "outbid": "Tawaran Anda terlampaui — tawaran Anda {amount}",
      "placed": "Tawaran diajukan: {amount}.",
      "extendedNote": "Tawaran Anda masuk di menit-menit terakhir, jadi lot kini berakhir {date}.",
      "winsT": "Kemenangan Anda",
      "payBy": "Bayar sebelum {date}",
      "pay": "Bayar {amount}",
      "paid": "Lunas — lisensi Anda aktif",
      "paidHint": "Temukan di Self-Hosted atau Lisensi seumur hidup.",
      "payTitle": "Bayar kemenangan Anda",
      "payMethod": "Metode pembayaran",
      "noMethods": "Saat ini tidak ada metode pembayaran yang bisa membawa jumlah ini — silakan hubungi dukungan.",
      "close": "Tutup",
      "paidText": "Pembayaran terkonfirmasi — lisensi Anda aktif.",
      "myBidsT": "Tawaran Anda",
      "noBids": "Anda belum menawar.",
      "errors": {
        "closed": "Penawaran untuk lot ini sudah ditutup.",
        "not_started": "Penawaran untuk lot ini belum dimulai.",
        "ended": "Lot ini sudah berakhir.",
        "too_low": "Tawaran Anda di bawah minimum berikutnya.",
        "too_high": "Tawaran tidak boleh melebihi harga normal.",
        "already_highest": "Tawaran Anda sudah yang tertinggi di lot ini.",
        "not_next": "Ada yang menawar tepat sebelum Anda — tawaran berikutnya sudah diperbarui.",
        "receipt_required": "Unggah screenshot bukti bayar.",
        "bad_amount": "Masukkan tawaran dalam dolar AS bulat.",
        "not_found": "Lot lelang tidak ditemukan.",
        "not_verified": "Verifikasi e-mail dan pilih nama tampilan sebelum menawar.",
        "admin": "Akun admin menjalankan lelang dan tidak bisa menawar.",
        "wait": "Mohon tunggu sebentar lalu coba lagi.",
        "verified": "E-mail Anda sudah terverifikasi.",
        "no_code": "Minta kode terlebih dahulu.",
        "expired": "Kode sudah kedaluwarsa — minta kode baru.",
        "attempts": "Terlalu banyak kode salah — minta kode baru.",
        "wrong": "Kode itu salah.",
        "length": "Gunakan 2 sampai 48 karakter.",
        "chars": "Gunakan huruf, angka, spasi dan . , & ' ( ) - saja.",
        "contact": "Tanpa alamat e-mail, alamat web atau nomor telepon.",
        "abuse": "Silakan pilih nama lain.",
        "brand": "Nama itu merek milik perusahaan lain.",
        "other": "Terjadi kesalahan — silakan coba lagi."
      }
    }
  },

  ms: {
    "eyebrow": "Lelongan lesen · setiap 2 minggu",
    "title": "Menangi lesen self-hosted AXTO dari 25 % harganya.",
    "lead": "Setiap dua minggu, satu lesen bagi setiap pakej yang dilelong diberikan kepada pembida tertinggi. Bidaan dibuka pada {open} daripada harga biasa dan setiap lelongan tamat pada hari Jumaat jam 07:00 WIB (UTC+7). Menang, bayar melalui checkout biasa, dan lesen aktif dengan sendirinya.",
    "endsIn": "Lelongan ini tamat dalam",
    "all": "Semua",
    "paid": "Dibayar",
    "unpaid": "Belum dibayar",
    "nextReady": "{n} lot lelongan seterusnya sudah sedia — ia bermula sebaik sahaja lelongan ini tamat.",
    "endsAt": "Tamat {date}",
    "nextAuction": "Lelongan seterusnya tamat {date}",
    "units": {
      "d": "h",
      "h": "j",
      "m": "m",
      "s": "s"
    },
    "cta": "Log masuk untuk membida",
    "ctaMember": "Bida di ruang kerja anda",
    "lot": {
      "normal": "Harga biasa",
      "current": "Bidaan semasa",
      "opening": "Bidaan pembukaan",
      "nextMin": "Minimum seterusnya",
      "bids": "{n} bidaan",
      "noBids": "Belum ada bidaan",
      "leader": "Di hadapan: {name}",
      "sold": "Dimenangi oleh {name}",
      "unsold": "Tiada pemenang",
      "awaiting": "Dimenangi {name} — belum dibayar",
      "cancelled": "Dibatalkan",
      "save": "{pct} di bawah harga biasa",
      "extended": "Bidaan dalam {n} minit terakhir melanjutkan lot"
    },
    "kinds": {
      "edition": "Lesen edisi",
      "lifetime": "Lesen seumur hidup"
    },
    "emptyT": "Belum ada lot dalam lelongan ini",
    "emptyB": "Lot seterusnya dibuka apabila lelongan seterusnya bermula. Sila kembali tidak lama lagi.",
    "offT": "Lelongan dijeda",
    "offB": "Tiada lelongan berjalan pada masa ini.",
    "howTitle": "Cara lelongan berfungsi",
    "how": [
      [
        "Sahkan e-mel anda",
        "Log masuk, sahkan kod 6 digit yang kami e-melkan dan pilih nama yang dipaparkan jika anda menang."
      ],
      [
        "Bida",
        "Bidaan dibuka pada {open} daripada harga biasa; setiap bidaan menaikkan harga tepat {step} daripada harga pembukaan itu. Bidaan dalam {snipe} minit terakhir melanjutkan lot."
      ],
      [
        "Menang pada hari Jumaat",
        "Setiap lelongan tamat pada hari Jumaat jam 07:00 WIB (UTC+7). Bidaan tertinggi menang."
      ],
      [
        "Bayar dalam {hours} jam",
        "Bayar melalui checkout biasa. Pindahan bank memerlukan tangkapan skrin bukti bayaran yang diluluskan oleh pentadbir. Sehingga bayaran disahkan, kemenangan dipaparkan sebagai belum dibayar."
      ],
      [
        "Lesen secara automatik",
        "Sebaik sahaja bayaran disahkan, lesen dikeluarkan, ditandatangani dan sedia dipasang — tanpa menunggu sesiapa."
      ]
    ],
    "rulesTitle": "Peraturan",
    "rules": [
      "Satu lot bagi setiap pakej dalam setiap lelongan; satu lesen bagi setiap lot.",
      "Bidaan pembukaan {open} daripada harga biasa pada hari lot dibuka; setiap bidaan menaikkan harga tepat {step} daripada harga pembukaan.",
      "Bidaan tidak boleh melebihi harga biasa.",
      "Hanya ahli yang disahkan boleh membida; anda tidak boleh mengatasi bidaan anda sendiri.",
      "Lesen dihantar hanya selepas pemenang membayar; kemenangan yang belum dibayar kekal dipaparkan sebagai belum dibayar. Pindahan bank memerlukan tangkapan skrin bukti bayaran dan kelulusan pentadbir.",
      "Lesennya sama seperti yang dibeli pada harga biasa: ciri, kemas kini dan sokongan yang sama.",
      "Pemenang memilih nama syarikat atau peribadi yang dipaparkan — tiada jenama syarikat lain, tiada butiran hubungan, tiada kata yang menyinggung."
    ],
    "winnersTitle": "Pemenang terkini",
    "winnersLead": "Nama yang dipilih oleh setiap pemenang dan pakej yang dimenanginya.",
    "noWinners": "Pemenang pertama dipaparkan di sini selepas lelongan pertama tamat.",
    "lastTitle": "Keputusan lelongan lepas",
    "paidFor": "{amount} (biasa {normal})",
    "faqTitle": "Soalan",
    "faq": [
      [
        "Adakah lesen lelongan berbeza daripada lesen biasa?",
        "Tidak. Ia membawa ciri bertandatangan, kemas kini dan sokongan yang sama seperti pakej yang sama dibeli pada harga biasa."
      ],
      [
        "Bilakah lelongan tamat?",
        "Setiap dua minggu, sentiasa pada hari Jumaat jam 07:00 WIB (UTC+7). Bidaan pada minit-minit terakhir melanjutkan lot supaya tiada siapa diatasi pada saat terakhir."
      ],
      [
        "Bagaimana saya membayar jika menang?",
        "Di ruang kerja anda, dengan kaedah pembayaran checkout biasa. Untuk pindahan bank, muat naik tangkapan skrin bukti bayaran; pentadbir akan meluluskannya. Lesen dihantar secara automatik selepas bayaran disahkan."
      ],
      [
        "Bagaimana jika saya menang tetapi tidak membayar?",
        "Tiada lesen dihantar. Kemenangan anda kekal dipaparkan sebagai belum dibayar sehingga anda membayar; pentadbir boleh menyerahkan lot kepada pembida seterusnya."
      ],
      [
        "Mengapa e-mel saya perlu disahkan?",
        "Supaya setiap bidaan datang daripada ahli sebenar yang boleh dihubungi. Hanya satu kod."
      ],
      [
        "Nama apakah yang dipaparkan jika saya menang?",
        "Nama syarikat atau peribadi yang anda pilih. Anda boleh menukarnya di halaman Lelongan. Jenama syarikat lain dan butiran hubungan tidak dibenarkan."
      ]
    ],
    "home": {
      "title": "Lelongan lesen — setiap 2 minggu",
      "lead": "Pemenang terkini lesen self-hosted AXTO, dengan bidaan dari 25 % harga biasa.",
      "link": "Lihat lelongan ini →"
    },
    "me": {
      "title": "Lelongan lesen",
      "lead": "Bida lot dalam lelongan ini. Bidaan dibuka pada {open} daripada harga biasa.",
      "verifyT": "Sahkan e-mel anda untuk membida",
      "verifyB": "Hanya ahli yang disahkan boleh membida. Kami menghantar kod 6 digit ke {email}.",
      "send": "Hantar kod",
      "sent": "Kod dihantar ke {email}. Sah selama 15 minit.",
      "codeLabel": "Kod 6 digit",
      "verify": "Sahkan",
      "resend": "Hantar kod baharu",
      "nameT": "Nama yang dipaparkan jika anda menang",
      "nameB": "Nama syarikat atau nama anda sendiri, dipaparkan bersama kemenangan anda di axto.io. Tiada jenama syarikat lain, tiada butiran hubungan.",
      "nameLabel": "Nama paparan",
      "saveName": "Simpan nama",
      "nameSaved": "Disimpan.",
      "verified": "Pembida disahkan",
      "bidLabel": "Bidaan anda (USD)",
      "bid": "Hantar bidaan",
      "minHint": "Bidaan seterusnya: {amount}",
      "bidAt": "Bida {amount}",
      "receiptNote": "Bayar melalui pindahan bank? Tangkapan skrin bukti bayaran diwajibkan: muat naik di panel pembayaran. Pentadbir meluluskannya dan lesen anda terus dihantar.",
      "leading": "Bidaan anda tertinggi",
      "outbid": "Bidaan anda telah diatasi — bidaan anda {amount}",
      "placed": "Bidaan dihantar: {amount}.",
      "extendedNote": "Bidaan anda masuk pada minit-minit terakhir, jadi lot kini tamat {date}.",
      "winsT": "Kemenangan anda",
      "payBy": "Bayar sebelum {date}",
      "pay": "Bayar {amount}",
      "paid": "Dibayar — lesen anda aktif",
      "paidHint": "Cari di Self-Hosted atau Lesen seumur hidup.",
      "payTitle": "Bayar kemenangan anda",
      "payMethod": "Kaedah pembayaran",
      "noMethods": "Tiada kaedah pembayaran yang boleh membawa jumlah ini sekarang — sila hubungi sokongan.",
      "close": "Tutup",
      "paidText": "Bayaran disahkan — lesen anda aktif.",
      "myBidsT": "Bidaan anda",
      "noBids": "Anda belum membida.",
      "errors": {
        "closed": "Bidaan bagi lot ini telah ditutup.",
        "not_started": "Bidaan bagi lot ini belum bermula.",
        "ended": "Lot ini telah tamat.",
        "too_low": "Bidaan anda di bawah minimum seterusnya.",
        "too_high": "Bidaan tidak boleh melebihi harga biasa.",
        "already_highest": "Bidaan anda sudah yang tertinggi bagi lot ini.",
        "not_next": "Seseorang membida sejurus sebelum anda — bidaan seterusnya telah dikemas kini.",
        "receipt_required": "Muat naik tangkapan skrin bukti bayaran.",
        "bad_amount": "Masukkan bidaan dalam dolar AS bulat.",
        "not_found": "Lot lelongan tidak dijumpai.",
        "not_verified": "Sahkan e-mel dan pilih nama paparan sebelum membida.",
        "admin": "Akaun admin mengendalikan lelongan dan tidak boleh membida.",
        "wait": "Sila tunggu sebentar dan cuba lagi.",
        "verified": "E-mel anda sudah disahkan.",
        "no_code": "Minta kod dahulu.",
        "expired": "Kod telah tamat tempoh — minta kod baharu.",
        "attempts": "Terlalu banyak kod salah — minta kod baharu.",
        "wrong": "Kod itu tidak betul.",
        "length": "Gunakan 2 hingga 48 aksara.",
        "chars": "Gunakan huruf, nombor, ruang dan . , & ' ( ) - sahaja.",
        "contact": "Tiada alamat e-mel, alamat web atau nombor telefon.",
        "abuse": "Sila pilih nama lain.",
        "brand": "Nama itu jenama milik syarikat lain.",
        "other": "Sesuatu tidak kena — sila cuba lagi."
      }
    }
  },

  de: {
    "eyebrow": "Lizenzauktion · alle 2 Wochen",
    "title": "Gewinnen Sie eine AXTO-Self-Hosted-Lizenz ab 25 % ihres Preises.",
    "lead": "Alle zwei Wochen geht je eine Lizenz jedes versteigerten Pakets an das höchste Gebot. Die Gebote beginnen bei {open} des Normalpreises, und jede Auktion endet an einem Freitag um 07:00 WIB (UTC+7). Gewinnen, über den normalen Checkout bezahlen – die Lizenz aktiviert sich von selbst.",
    "endsIn": "Diese Auktion endet in",
    "all": "Alle",
    "paid": "Bezahlt",
    "unpaid": "Noch nicht bezahlt",
    "nextReady": "{n} Lose der nächsten Auktion stehen bereit — sie beginnt, sobald diese endet.",
    "endsAt": "Endet {date}",
    "nextAuction": "Die nächste Auktion endet {date}",
    "units": {
      "d": "T",
      "h": "Std",
      "m": "Min",
      "s": "Sek"
    },
    "cta": "Anmelden und bieten",
    "ctaMember": "In Ihrem Arbeitsbereich bieten",
    "lot": {
      "normal": "Normalpreis",
      "current": "Aktuelles Gebot",
      "opening": "Startgebot",
      "nextMin": "Nächstes Mindestgebot",
      "bids": "{n} Gebote",
      "noBids": "Noch keine Gebote",
      "leader": "Vorn: {name}",
      "sold": "Gewonnen von {name}",
      "unsold": "Kein Gewinner",
      "awaiting": "Gewonnen von {name} — noch nicht bezahlt",
      "cancelled": "Abgesagt",
      "save": "{pct} unter dem Normalpreis",
      "extended": "Ein Gebot in den letzten {n} Minuten verlängert das Los"
    },
    "kinds": {
      "edition": "Editionslizenz",
      "lifetime": "Lifetime-Lizenz"
    },
    "emptyT": "Noch keine Lose in dieser Auktion",
    "emptyB": "Die nächsten Lose öffnen mit der nächsten Auktion. Schauen Sie bald wieder vorbei.",
    "offT": "Die Auktion ist pausiert",
    "offB": "Derzeit läuft keine Auktion.",
    "howTitle": "So funktioniert die Auktion",
    "how": [
      [
        "E-Mail bestätigen",
        "Melden Sie sich an, bestätigen Sie den 6-stelligen Code aus unserer E-Mail und wählen Sie den Namen, der bei einem Gewinn angezeigt wird."
      ],
      [
        "Bieten",
        "Die Gebote beginnen bei {open} des Normalpreises; jedes Gebot erhöht genau um {step} dieses Startgebots. Ein Gebot in den letzten {snipe} Minuten verlängert das Los."
      ],
      [
        "Gewinnen am Freitag",
        "Jede Auktion endet an einem Freitag um 07:00 WIB (UTC+7). Das höchste Gebot gewinnt."
      ],
      [
        "Innerhalb von {hours} Stunden bezahlen",
        "Bezahlen Sie über den normalen Checkout. Eine Banküberweisung braucht den Zahlungs-Screenshot und die Freigabe durch einen Administrator. Bis die Zahlung bestätigt ist, wird der Gewinn als noch nicht bezahlt angezeigt."
      ],
      [
        "Lizenz automatisch",
        "Sobald die Zahlung bestätigt ist, wird die Lizenz ausgestellt, signiert und ist installationsbereit – ohne auf jemanden zu warten."
      ]
    ],
    "rulesTitle": "Die Regeln",
    "rules": [
      "Ein Los pro Paket in jeder Auktion; eine Lizenz pro Los.",
      "Startgebot {open} des Normalpreises am Tag der Losöffnung; jedes Gebot erhöht den Preis um genau {step} des Startgebots.",
      "Ein Gebot darf nie höher sein als der Normalpreis.",
      "Nur verifizierte Mitglieder bieten; Sie können sich nicht selbst überbieten.",
      "Die Lizenz wird erst gesendet, wenn der Gewinner bezahlt hat; ein unbezahlter Gewinn bleibt als „noch nicht bezahlt“ sichtbar. Eine Banküberweisung braucht den Zahlungs-Screenshot und die Freigabe eines Administrators.",
      "Die Lizenz entspricht einer zum Normalpreis gekauften: gleiche Funktionen, gleiche Updates, gleicher Support.",
      "Gewinner wählen den angezeigten Firmen- oder Personennamen – keine fremden Marken, keine Kontaktdaten, nichts Anstößiges."
    ],
    "winnersTitle": "Neueste Gewinner",
    "winnersLead": "Der Name, den jeder Gewinner gewählt hat, und das gewonnene Paket.",
    "noWinners": "Die ersten Gewinner erscheinen hier, sobald die erste Auktion endet.",
    "lastTitle": "Ergebnisse der letzten Auktion",
    "paidFor": "{amount} (normal {normal})",
    "faqTitle": "Fragen",
    "faq": [
      [
        "Unterscheidet sich eine Auktionslizenz von einer normalen Lizenz?",
        "Nein. Sie hat dieselben signierten Funktionen, Updates und denselben Support wie dasselbe Paket zum Normalpreis."
      ],
      [
        "Wann endet eine Auktion?",
        "Alle zwei Wochen, immer an einem Freitag um 07:00 WIB (UTC+7). Ein Gebot in den letzten Minuten verlängert das Los, damit niemand in der letzten Sekunde überboten wird."
      ],
      [
        "Wie bezahle ich, wenn ich gewinne?",
        "In Ihrem Arbeitsbereich mit den Zahlungsmethoden des normalen Checkouts. Bei einer Banküberweisung laden Sie den Zahlungs-Screenshot hoch; ein Administrator gibt ihn frei. Die Lizenz wird automatisch gesendet, sobald die Zahlung bestätigt ist."
      ],
      [
        "Was, wenn ich gewinne, aber nicht bezahle?",
        "Es wird keine Lizenz gesendet. Ihr Gewinn bleibt als „noch nicht bezahlt“ sichtbar, bis Sie zahlen; der Administrator kann das Los an den nächsten Bieter geben."
      ],
      [
        "Warum muss ich meine E-Mail bestätigen?",
        "Damit jedes Gebot von einem echten, erreichbaren Mitglied kommt. Es genügt ein Code."
      ],
      [
        "Welcher Name wird angezeigt, wenn ich gewinne?",
        "Der Firmen- oder Personenname, den Sie wählen. Sie können ihn auf der Auktionsseite ändern. Fremde Marken und Kontaktdaten sind nicht erlaubt."
      ]
    ],
    "home": {
      "title": "Lizenzauktion – alle 2 Wochen",
      "lead": "Die neuesten Gewinner von AXTO-Self-Hosted-Lizenzen, Gebote ab 25 % des Normalpreises.",
      "link": "Zur laufenden Auktion →"
    },
    "me": {
      "title": "Lizenzauktion",
      "lead": "Bieten Sie auf die Lose dieser Auktion. Die Gebote beginnen bei {open} des Normalpreises.",
      "verifyT": "E-Mail bestätigen, um zu bieten",
      "verifyB": "Nur verifizierte Mitglieder bieten. Wir senden einen 6-stelligen Code an {email}.",
      "send": "Code senden",
      "sent": "Code an {email} gesendet. Er gilt 15 Minuten.",
      "codeLabel": "6-stelliger Code",
      "verify": "Bestätigen",
      "resend": "Neuen Code senden",
      "nameT": "Der Name, der bei einem Gewinn angezeigt wird",
      "nameB": "Ihr Firmenname oder Ihr eigener Name, angezeigt mit Ihrem Gewinn auf axto.io. Keine fremden Marken, keine Kontaktdaten.",
      "nameLabel": "Anzeigename",
      "saveName": "Namen speichern",
      "nameSaved": "Gespeichert.",
      "verified": "Verifizierter Bieter",
      "bidLabel": "Ihr Gebot (USD)",
      "bid": "Gebot abgeben",
      "minHint": "Nächstes Gebot: {amount}",
      "bidAt": "{amount} bieten",
      "receiptNote": "Zahlung per Banküberweisung? Der Zahlungs-Screenshot ist Pflicht: Laden Sie ihn im Zahlungsfeld hoch. Ein Administrator gibt ihn frei, und Ihre Lizenz wird sofort gesendet.",
      "leading": "Sie haben das höchste Gebot",
      "outbid": "Sie wurden überboten – Ihr Gebot {amount}",
      "placed": "Gebot abgegeben: {amount}.",
      "extendedNote": "Ihr Gebot kam in den letzten Minuten, daher endet das Los jetzt {date}.",
      "winsT": "Ihre Gewinne",
      "payBy": "Zahlen bis {date}",
      "pay": "{amount} bezahlen",
      "paid": "Bezahlt – Ihre Lizenz ist aktiv",
      "paidHint": "Sie finden sie unter Self-Hosted oder Lifetime-Lizenzen.",
      "payTitle": "Ihren Gewinn bezahlen",
      "payMethod": "Zahlungsmethode",
      "noMethods": "Derzeit kann keine Zahlungsmethode diesen Betrag tragen – bitte wenden Sie sich an den Support.",
      "close": "Schließen",
      "paidText": "Zahlung bestätigt – Ihre Lizenz ist aktiv.",
      "myBidsT": "Ihre Gebote",
      "noBids": "Sie haben noch nicht geboten.",
      "errors": {
        "closed": "Die Gebote für dieses Los sind geschlossen.",
        "not_started": "Die Gebote für dieses Los haben noch nicht begonnen.",
        "ended": "Dieses Los ist beendet.",
        "too_low": "Ihr Gebot liegt unter dem nächsten Mindestgebot.",
        "too_high": "Ein Gebot darf nicht höher sein als der Normalpreis.",
        "already_highest": "Sie haben bereits das höchste Gebot für dieses Los.",
        "not_next": "Jemand hat kurz vor Ihnen geboten — das nächste Gebot wurde aktualisiert.",
        "receipt_required": "Laden Sie den Zahlungs-Screenshot hoch.",
        "bad_amount": "Geben Sie ein Gebot in ganzen US-Dollar ein.",
        "not_found": "Auktionslos nicht gefunden.",
        "not_verified": "Bestätigen Sie Ihre E-Mail und wählen Sie einen Anzeigenamen, bevor Sie bieten.",
        "admin": "Admin-Konten führen die Auktion durch und können nicht bieten.",
        "wait": "Bitte warten Sie kurz und versuchen Sie es erneut.",
        "verified": "Ihre E-Mail ist bereits bestätigt.",
        "no_code": "Fordern Sie zuerst einen Code an.",
        "expired": "Der Code ist abgelaufen – fordern Sie einen neuen an.",
        "attempts": "Zu viele falsche Codes – fordern Sie einen neuen an.",
        "wrong": "Der Code ist nicht richtig.",
        "length": "Verwenden Sie 2 bis 48 Zeichen.",
        "chars": "Verwenden Sie nur Buchstaben, Ziffern, Leerzeichen und . , & ' ( ) -.",
        "contact": "Keine E-Mail-Adressen, Webadressen oder Telefonnummern.",
        "abuse": "Bitte wählen Sie einen anderen Namen.",
        "brand": "Dieser Name ist die Marke eines anderen Unternehmens.",
        "other": "Etwas ist schiefgelaufen – bitte versuchen Sie es erneut."
      }
    }
  },

  fr: {
    "eyebrow": "Enchère de licences · toutes les 2 semaines",
    "title": "Remportez une licence auto-hébergée AXTO dès 25 % de son prix.",
    "lead": "Toutes les deux semaines, une licence de chaque formule mise aux enchères revient à la meilleure offre. Les enchères s'ouvrent à {open} du prix normal et chaque vente se termine un vendredi à 7 h 00 WIB (UTC+7). Gagnez, payez par le paiement habituel, et la licence s'active d'elle-même.",
    "endsIn": "Cette vente se termine dans",
    "all": "Tous",
    "paid": "Payé",
    "unpaid": "Non payé",
    "nextReady": "{n} lots de la prochaine vente sont prêts — elle commence dès que celle-ci se termine.",
    "endsAt": "Se termine le {date}",
    "nextAuction": "La prochaine vente se termine le {date}",
    "units": {
      "d": "j",
      "h": "h",
      "m": "min",
      "s": "s"
    },
    "cta": "Se connecter pour enchérir",
    "ctaMember": "Enchérir dans votre espace",
    "lot": {
      "normal": "Prix normal",
      "current": "Offre actuelle",
      "opening": "Mise à prix",
      "nextMin": "Prochain minimum",
      "bids": "{n} offres",
      "noBids": "Aucune offre pour l'instant",
      "leader": "En tête : {name}",
      "sold": "Remporté par {name}",
      "unsold": "Aucun gagnant",
      "awaiting": "Remporté par {name} — non payé",
      "cancelled": "Annulé",
      "save": "{pct} sous le prix normal",
      "extended": "Une offre dans les {n} dernières minutes prolonge le lot"
    },
    "kinds": {
      "edition": "Licence d'édition",
      "lifetime": "Licence à vie"
    },
    "emptyT": "Aucun lot dans cette vente pour l'instant",
    "emptyB": "Les prochains lots ouvrent avec la prochaine vente. Revenez bientôt.",
    "offT": "Les enchères sont en pause",
    "offB": "Aucune vente n'est en cours pour le moment.",
    "howTitle": "Comment fonctionne l'enchère",
    "how": [
      [
        "Vérifiez votre e-mail",
        "Connectez-vous, confirmez le code à 6 chiffres que nous vous envoyons et choisissez le nom affiché si vous gagnez."
      ],
      [
        "Enchérissez",
        "Les enchères s'ouvrent à {open} du prix normal ; chaque offre augmente le prix d'exactement {step} de cette mise à prix. Une offre dans les {snipe} dernières minutes prolonge le lot."
      ],
      [
        "Gagnez le vendredi",
        "Chaque vente se termine un vendredi à 7 h 00 WIB (UTC+7). La meilleure offre l'emporte."
      ],
      [
        "Payez sous {hours} heures",
        "Payez par le paiement habituel. Un virement bancaire exige la capture d'écran du paiement, validée par un administrateur. Tant que le paiement n'est pas confirmé, le gain apparaît comme non payé."
      ],
      [
        "Licence automatique",
        "Dès que le paiement est confirmé, la licence est émise, signée et prête à installer — sans attendre personne."
      ]
    ],
    "rulesTitle": "Les règles",
    "rules": [
      "Un lot par formule dans chaque vente ; une licence par lot.",
      "Mise à prix {open} du prix normal le jour de l'ouverture du lot ; chaque offre augmente le prix d'exactement {step} de la mise à prix.",
      "Une offre ne peut jamais dépasser le prix normal.",
      "Seuls les membres vérifiés enchérissent ; vous ne pouvez pas surenchérir sur vous-même.",
      "La licence n'est envoyée qu'après le paiement du gagnant ; un gain non payé reste affiché comme non payé. Un virement exige la capture d'écran du paiement et la validation d'un administrateur.",
      "La licence est identique à celle achetée au prix normal : mêmes fonctions, mêmes mises à jour, même support.",
      "Les gagnants choisissent le nom d'entreprise ou personnel affiché — pas de marque d'autrui, pas de coordonnées, rien d'offensant."
    ],
    "winnersTitle": "Derniers gagnants",
    "winnersLead": "Le nom choisi par chaque gagnant et la formule remportée.",
    "noWinners": "Les premiers gagnants apparaîtront ici après la fin de la première vente.",
    "lastTitle": "Résultats de la dernière vente",
    "paidFor": "{amount} (normal {normal})",
    "faqTitle": "Questions",
    "faq": [
      [
        "Une licence aux enchères est-elle différente d'une licence normale ?",
        "Non. Elle offre les mêmes fonctions signées, mises à jour et support que la même formule au prix normal."
      ],
      [
        "Quand une vente se termine-t-elle ?",
        "Toutes les deux semaines, toujours un vendredi à 7 h 00 WIB (UTC+7). Une offre dans les dernières minutes prolonge le lot pour que personne ne soit battu à la dernière seconde."
      ],
      [
        "Comment payer si je gagne ?",
        "Dans votre espace, avec les moyens du paiement habituel. Pour un virement, téléversez la capture d'écran du paiement ; un administrateur la valide. La licence est envoyée d'elle-même une fois le paiement confirmé."
      ],
      [
        "Et si je gagne sans payer ?",
        "Aucune licence n'est envoyée. Votre gain reste affiché comme non payé jusqu'à votre paiement ; l'administrateur peut attribuer le lot à l'enchérisseur suivant."
      ],
      [
        "Pourquoi vérifier mon e-mail ?",
        "Pour que chaque offre vienne d'un vrai membre joignable. Un seul code suffit."
      ],
      [
        "Quel nom est affiché si je gagne ?",
        "Le nom d'entreprise ou personnel que vous choisissez. Vous pouvez le modifier sur la page Enchères. Les marques d'autrui et les coordonnées ne sont pas autorisées."
      ]
    ],
    "home": {
      "title": "Enchère de licences — toutes les 2 semaines",
      "lead": "Les derniers gagnants de licences auto-hébergées AXTO, avec des offres dès 25 % du prix normal.",
      "link": "Voir la vente en cours →"
    },
    "me": {
      "title": "Enchère de licences",
      "lead": "Enchérissez sur les lots de cette vente. Les enchères s'ouvrent à {open} du prix normal.",
      "verifyT": "Vérifiez votre e-mail pour enchérir",
      "verifyB": "Seuls les membres vérifiés enchérissent. Nous envoyons un code à 6 chiffres à {email}.",
      "send": "Envoyer le code",
      "sent": "Code envoyé à {email}. Il est valable 15 minutes.",
      "codeLabel": "Code à 6 chiffres",
      "verify": "Vérifier",
      "resend": "Envoyer un nouveau code",
      "nameT": "Le nom affiché si vous gagnez",
      "nameB": "Le nom de votre entreprise ou le vôtre, affiché avec votre gain sur axto.io. Pas de marque d'autrui, pas de coordonnées.",
      "nameLabel": "Nom affiché",
      "saveName": "Enregistrer le nom",
      "nameSaved": "Enregistré.",
      "verified": "Enchérisseur vérifié",
      "bidLabel": "Votre offre (USD)",
      "bid": "Enchérir",
      "minHint": "Prochaine offre : {amount}",
      "bidAt": "Enchérir {amount}",
      "receiptNote": "Paiement par virement ? La capture d'écran du paiement est obligatoire : téléversez-la dans le panneau de paiement. Un administrateur la valide et votre licence est envoyée aussitôt.",
      "leading": "Vous avez la meilleure offre",
      "outbid": "Vous avez été surenchéri — votre offre {amount}",
      "placed": "Offre enregistrée : {amount}.",
      "extendedNote": "Votre offre est arrivée dans les dernières minutes : le lot se termine désormais le {date}.",
      "winsT": "Vos gains",
      "payBy": "À payer avant le {date}",
      "pay": "Payer {amount}",
      "paid": "Payé — votre licence est active",
      "paidHint": "Retrouvez-la dans Auto-hébergé ou Licences à vie.",
      "payTitle": "Payer votre gain",
      "payMethod": "Moyen de paiement",
      "noMethods": "Aucun moyen de paiement ne peut porter ce montant pour le moment — contactez le support.",
      "close": "Fermer",
      "paidText": "Paiement confirmé — votre licence est active.",
      "myBidsT": "Vos offres",
      "noBids": "Vous n'avez pas encore enchéri.",
      "errors": {
        "closed": "Les enchères sur ce lot sont closes.",
        "not_started": "Les enchères sur ce lot n'ont pas encore commencé.",
        "ended": "Ce lot est terminé.",
        "too_low": "Votre offre est inférieure au prochain minimum.",
        "too_high": "Une offre ne peut pas dépasser le prix normal.",
        "already_highest": "Vous avez déjà la meilleure offre sur ce lot.",
        "not_next": "Quelqu'un a enchéri juste avant vous — la prochaine offre a été mise à jour.",
        "receipt_required": "Téléversez la capture d'écran du paiement.",
        "bad_amount": "Saisissez une offre en dollars US entiers.",
        "not_found": "Lot introuvable.",
        "not_verified": "Vérifiez votre e-mail et choisissez un nom affiché avant d'enchérir.",
        "admin": "Les comptes administrateurs gèrent la vente et ne peuvent pas enchérir.",
        "wait": "Patientez un instant puis réessayez.",
        "verified": "Votre e-mail est déjà vérifié.",
        "no_code": "Demandez d'abord un code.",
        "expired": "Le code a expiré — demandez-en un nouveau.",
        "attempts": "Trop de codes erronés — demandez-en un nouveau.",
        "wrong": "Ce code n'est pas correct.",
        "length": "Utilisez 2 à 48 caractères.",
        "chars": "Utilisez uniquement des lettres, chiffres, espaces et . , & ' ( ) -.",
        "contact": "Pas d'adresse e-mail, d'adresse web ni de numéro de téléphone.",
        "abuse": "Veuillez choisir un autre nom.",
        "brand": "Ce nom est la marque d'une autre entreprise.",
        "other": "Une erreur est survenue — veuillez réessayer."
      }
    }
  },

  it: {
    "eyebrow": "Asta di licenze · ogni 2 settimane",
    "title": "Vinci una licenza self-hosted AXTO a partire dal 25 % del prezzo.",
    "lead": "Ogni due settimane, una licenza di ciascun pacchetto all'asta va all'offerta più alta. Le offerte partono da {open} del prezzo normale e ogni asta termina di venerdì alle 07:00 WIB (UTC+7). Vinci, paga con il checkout abituale e la licenza si attiva da sola.",
    "endsIn": "Questa asta termina tra",
    "all": "Tutti",
    "paid": "Pagato",
    "unpaid": "Non ancora pagato",
    "nextReady": "{n} lotti della prossima asta sono pronti — inizia appena termina questa.",
    "endsAt": "Termina il {date}",
    "nextAuction": "La prossima asta termina il {date}",
    "units": {
      "d": "g",
      "h": "h",
      "m": "min",
      "s": "s"
    },
    "cta": "Accedi per fare un'offerta",
    "ctaMember": "Fai un'offerta nel tuo spazio",
    "lot": {
      "normal": "Prezzo normale",
      "current": "Offerta attuale",
      "opening": "Base d'asta",
      "nextMin": "Prossimo minimo",
      "bids": "{n} offerte",
      "noBids": "Ancora nessuna offerta",
      "leader": "In testa: {name}",
      "sold": "Vinto da {name}",
      "unsold": "Nessun vincitore",
      "awaiting": "Vinto da {name} — non ancora pagato",
      "cancelled": "Annullato",
      "save": "{pct} sotto il prezzo normale",
      "extended": "Un'offerta negli ultimi {n} minuti prolunga il lotto"
    },
    "kinds": {
      "edition": "Licenza di edizione",
      "lifetime": "Licenza a vita"
    },
    "emptyT": "Ancora nessun lotto in questa asta",
    "emptyB": "I prossimi lotti si aprono con la prossima asta. Torna presto.",
    "offT": "L'asta è in pausa",
    "offB": "Al momento non c'è nessuna asta in corso.",
    "howTitle": "Come funziona l'asta",
    "how": [
      [
        "Verifica la tua e-mail",
        "Accedi, conferma il codice a 6 cifre che ti inviamo e scegli il nome mostrato se vinci."
      ],
      [
        "Fai un'offerta",
        "Le offerte partono da {open} del prezzo normale; ogni offerta aumenta il prezzo esattamente del {step} della base d'asta. Un'offerta negli ultimi {snipe} minuti prolunga il lotto."
      ],
      [
        "Vinci il venerdì",
        "Ogni asta termina di venerdì alle 07:00 WIB (UTC+7). Vince l'offerta più alta."
      ],
      [
        "Paga entro {hours} ore",
        "Paga con il checkout abituale. Un bonifico richiede lo screenshot del pagamento, approvato da un amministratore. Finché il pagamento non è confermato, la vittoria risulta non ancora pagata."
      ],
      [
        "Licenza automatica",
        "Appena il pagamento è confermato, la licenza viene emessa, firmata e pronta da installare — senza attendere nessuno."
      ]
    ],
    "rulesTitle": "Le regole",
    "rules": [
      "Un lotto per pacchetto in ogni asta; una licenza per lotto.",
      "Base d'asta {open} del prezzo normale nel giorno di apertura del lotto; ogni offerta aumenta il prezzo esattamente del {step} della base d'asta.",
      "Un'offerta non può mai superare il prezzo normale.",
      "Fanno offerte solo i membri verificati; non puoi superare la tua stessa offerta.",
      "La licenza viene inviata solo dopo il pagamento del vincitore; una vittoria non pagata resta visibile come non ancora pagata. Un bonifico richiede lo screenshot del pagamento e l'approvazione di un amministratore.",
      "La licenza è identica a quella acquistata al prezzo normale: stesse funzioni, stessi aggiornamenti, stesso supporto.",
      "I vincitori scelgono il nome aziendale o personale mostrato — niente marchi altrui, niente contatti, niente di offensivo."
    ],
    "winnersTitle": "Ultimi vincitori",
    "winnersLead": "Il nome scelto da ogni vincitore e il pacchetto vinto.",
    "noWinners": "I primi vincitori appariranno qui dopo la fine della prima asta.",
    "lastTitle": "Risultati dell'ultima asta",
    "paidFor": "{amount} (normale {normal})",
    "faqTitle": "Domande",
    "faq": [
      [
        "Una licenza vinta all'asta è diversa da una normale?",
        "No. Ha le stesse funzioni firmate, gli stessi aggiornamenti e lo stesso supporto dello stesso pacchetto al prezzo normale."
      ],
      [
        "Quando termina un'asta?",
        "Ogni due settimane, sempre di venerdì alle 07:00 WIB (UTC+7). Un'offerta negli ultimi minuti prolunga il lotto perché nessuno venga superato all'ultimo secondo."
      ],
      [
        "Come pago se vinco?",
        "Nel tuo spazio, con i metodi di pagamento del checkout abituale. Per un bonifico carica lo screenshot del pagamento; un amministratore lo approva. La licenza viene inviata da sola una volta confermato il pagamento."
      ],
      [
        "E se vinco ma non pago?",
        "Non viene inviata nessuna licenza. La tua vittoria resta visibile come non ancora pagata finché non paghi; l'amministratore può assegnare il lotto all'offerente successivo."
      ],
      [
        "Perché devo verificare la mia e-mail?",
        "Perché ogni offerta provenga da un membro reale e raggiungibile. Basta un codice."
      ],
      [
        "Quale nome viene mostrato se vinco?",
        "Il nome aziendale o personale che scegli. Puoi cambiarlo nella pagina Asta. Marchi altrui e contatti non sono ammessi."
      ]
    ],
    "home": {
      "title": "Asta di licenze — ogni 2 settimane",
      "lead": "Gli ultimi vincitori di licenze self-hosted AXTO, con offerte dal 25 % del prezzo normale.",
      "link": "Vedi l'asta in corso →"
    },
    "me": {
      "title": "Asta di licenze",
      "lead": "Fai offerte sui lotti di questa asta. Le offerte partono da {open} del prezzo normale.",
      "verifyT": "Verifica la tua e-mail per fare offerte",
      "verifyB": "Fanno offerte solo i membri verificati. Inviamo un codice a 6 cifre a {email}.",
      "send": "Invia il codice",
      "sent": "Codice inviato a {email}. Vale 15 minuti.",
      "codeLabel": "Codice a 6 cifre",
      "verify": "Verifica",
      "resend": "Invia un nuovo codice",
      "nameT": "Il nome mostrato se vinci",
      "nameB": "Il nome della tua azienda o il tuo, mostrato con la tua vittoria su axto.io. Niente marchi altrui, niente contatti.",
      "nameLabel": "Nome visualizzato",
      "saveName": "Salva il nome",
      "nameSaved": "Salvato.",
      "verified": "Offerente verificato",
      "bidLabel": "La tua offerta (USD)",
      "bid": "Fai l'offerta",
      "minHint": "Prossima offerta: {amount}",
      "bidAt": "Offri {amount}",
      "receiptNote": "Paghi con bonifico? Lo screenshot del pagamento è obbligatorio: caricalo nel pannello di pagamento. Un amministratore lo approva e la licenza ti viene inviata subito.",
      "leading": "Hai l'offerta più alta",
      "outbid": "La tua offerta è stata superata — la tua offerta {amount}",
      "placed": "Offerta registrata: {amount}.",
      "extendedNote": "La tua offerta è arrivata negli ultimi minuti, quindi il lotto ora termina il {date}.",
      "winsT": "Le tue vittorie",
      "payBy": "Paga entro il {date}",
      "pay": "Paga {amount}",
      "paid": "Pagato — la tua licenza è attiva",
      "paidHint": "La trovi in Self-hosted o Licenze a vita.",
      "payTitle": "Paga la tua vittoria",
      "payMethod": "Metodo di pagamento",
      "noMethods": "Al momento nessun metodo di pagamento può gestire questo importo — contatta il supporto.",
      "close": "Chiudi",
      "paidText": "Pagamento confermato — la tua licenza è attiva.",
      "myBidsT": "Le tue offerte",
      "noBids": "Non hai ancora fatto offerte.",
      "errors": {
        "closed": "Le offerte su questo lotto sono chiuse.",
        "not_started": "Le offerte su questo lotto non sono ancora iniziate.",
        "ended": "Questo lotto è terminato.",
        "too_low": "La tua offerta è sotto il prossimo minimo.",
        "too_high": "Un'offerta non può superare il prezzo normale.",
        "already_highest": "Hai già l'offerta più alta su questo lotto.",
        "not_next": "Qualcuno ha offerto appena prima di te — la prossima offerta è stata aggiornata.",
        "receipt_required": "Carica lo screenshot del pagamento.",
        "bad_amount": "Inserisci un'offerta in dollari USA interi.",
        "not_found": "Lotto non trovato.",
        "not_verified": "Verifica la tua e-mail e scegli un nome visualizzato prima di fare offerte.",
        "admin": "Gli account amministratore gestiscono l'asta e non possono fare offerte.",
        "wait": "Attendi un momento e riprova.",
        "verified": "La tua e-mail è già verificata.",
        "no_code": "Richiedi prima un codice.",
        "expired": "Il codice è scaduto — richiedine uno nuovo.",
        "attempts": "Troppi codici errati — richiedine uno nuovo.",
        "wrong": "Il codice non è corretto.",
        "length": "Usa da 2 a 48 caratteri.",
        "chars": "Usa solo lettere, numeri, spazi e . , & ' ( ) -.",
        "contact": "Niente indirizzi e-mail, indirizzi web o numeri di telefono.",
        "abuse": "Scegli un altro nome.",
        "brand": "Quel nome è il marchio di un'altra azienda.",
        "other": "Qualcosa è andato storto — riprova."
      }
    }
  },

  zh: {
    "eyebrow": "许可证拍卖 · 每两周一次",
    "title": "以正常价格 25 % 起拍，赢取 AXTO 自托管许可证。",
    "lead": "每两周，每个拍卖套餐各有一份许可证归出价最高者。起拍价为正常价格的 {open}，每场拍卖都在周五 07:00 WIB (UTC+7) 结束。赢得拍卖后通过常规结账付款，许可证会自动激活。",
    "endsIn": "本场拍卖结束倒计时",
    "all": "全部",
    "paid": "已付款",
    "unpaid": "尚未付款",
    "nextReady": "下一场拍卖的 {n} 件拍品已就绪——本场结束后立即开始。",
    "endsAt": "结束于 {date}",
    "nextAuction": "下一场拍卖结束于 {date}",
    "units": {
      "d": "天",
      "h": "时",
      "m": "分",
      "s": "秒"
    },
    "cta": "登录后出价",
    "ctaMember": "在工作区出价",
    "lot": {
      "normal": "正常价格",
      "current": "当前出价",
      "opening": "起拍价",
      "nextMin": "下一最低出价",
      "bids": "{n} 次出价",
      "noBids": "暂无出价",
      "leader": "领先：{name}",
      "sold": "由 {name} 赢得",
      "unsold": "无人中标",
      "awaiting": "由 {name} 中标——尚未付款",
      "cancelled": "已取消",
      "save": "比正常价格低 {pct}",
      "extended": "最后 {n} 分钟内的出价会延长该拍品"
    },
    "kinds": {
      "edition": "版本许可证",
      "lifetime": "终身许可证"
    },
    "emptyT": "本场拍卖暂无拍品",
    "emptyB": "下一批拍品将在下一场拍卖开始时开放，请稍后再来。",
    "offT": "拍卖已暂停",
    "offB": "目前没有进行中的拍卖。",
    "howTitle": "拍卖如何进行",
    "how": [
      [
        "验证邮箱",
        "登录后确认我们发送的 6 位验证码，并选择中标时显示的名称。"
      ],
      [
        "出价",
        "起拍价为正常价格的 {open}；每次出价恰好加价起拍价的 {step}。最后 {snipe} 分钟内的出价会延长该拍品。"
      ],
      [
        "周五揭晓",
        "每场拍卖都在周五 07:00 WIB (UTC+7) 结束，出价最高者中标。"
      ],
      [
        "{hours} 小时内付款",
        "通过常规结账付款。银行转账须上传付款截图，并由管理员审核通过。付款确认前，中标显示为“尚未付款”。"
      ],
      [
        "许可证自动发放",
        "付款一经确认，许可证即刻签发、签名并可安装——无需等待人工处理。"
      ]
    ],
    "rulesTitle": "拍卖规则",
    "rules": [
      "每场拍卖每个套餐一件拍品；每件拍品一份许可证。",
      "起拍价为拍品开放当日正常价格的 {open}；每次出价恰好加价起拍价的 {step}。",
      "出价不得高于正常价格。",
      "仅限已验证会员出价；不能超过自己的出价。",
      "中标者付款后才会发送许可证；未付款的中标仍会显示为“尚未付款”。银行转账须提供付款截图并经管理员审核通过。",
      "许可证与按正常价格购买的完全相同：功能、更新和支持都一样。",
      "中标者自选显示的公司或个人名称——不得使用他人品牌、联系方式或冒犯性内容。"
    ],
    "winnersTitle": "最新中标者",
    "winnersLead": "每位中标者选择的名称及其赢得的套餐。",
    "noWinners": "首场拍卖结束后，首批中标者将显示在这里。",
    "lastTitle": "上一场拍卖结果",
    "paidFor": "{amount}（正常价 {normal}）",
    "faqTitle": "常见问题",
    "faq": [
      [
        "拍卖得到的许可证与普通许可证有区别吗？",
        "没有。它与按正常价格购买的同一套餐拥有相同的签名功能、更新和支持。"
      ],
      [
        "拍卖什么时候结束？",
        "每两周一次，总在周五 07:00 WIB (UTC+7)。最后几分钟内的出价会延长拍品，避免有人在最后一秒被超越。"
      ],
      [
        "中标后如何付款？",
        "在您的工作区使用常规结账的付款方式。银行转账请上传付款截图，由管理员审核通过。付款确认后许可证会自动发送。"
      ],
      [
        "如果中标后不付款怎么办？",
        "不会发送许可证。在您付款之前，您的中标会一直显示为“尚未付款”；管理员可以将拍品转给下一位出价者。"
      ],
      [
        "为什么需要验证邮箱？",
        "确保每次出价都来自可联系的真实会员，只需一个验证码。"
      ],
      [
        "中标后显示什么名称？",
        "您选择的公司或个人名称，可在拍卖页面修改。不允许使用他人品牌和联系方式。"
      ]
    ],
    "home": {
      "title": "许可证拍卖——每两周一次",
      "lead": "AXTO 自托管许可证的最新中标者，正常价格 25 % 起拍。",
      "link": "查看本场拍卖 →"
    },
    "me": {
      "title": "许可证拍卖",
      "lead": "为本场拍卖的拍品出价。起拍价为正常价格的 {open}。",
      "verifyT": "验证邮箱后即可出价",
      "verifyB": "仅限已验证会员出价。我们会向 {email} 发送 6 位验证码。",
      "send": "发送验证码",
      "sent": "验证码已发送至 {email}，15 分钟内有效。",
      "codeLabel": "6 位验证码",
      "verify": "验证",
      "resend": "重新发送验证码",
      "nameT": "中标时显示的名称",
      "nameB": "您的公司名称或本人姓名，将与中标信息一起显示在 axto.io 上。不得使用他人品牌或联系方式。",
      "nameLabel": "显示名称",
      "saveName": "保存名称",
      "nameSaved": "已保存。",
      "verified": "已验证的出价者",
      "bidLabel": "您的出价（美元）",
      "bid": "出价",
      "minHint": "下一次出价：{amount}",
      "bidAt": "出价 {amount}",
      "receiptNote": "通过银行转账付款？必须上传付款截图：请在付款面板中上传。管理员审核通过后，许可证会立即发送。",
      "leading": "您的出价最高",
      "outbid": "您的出价已被超越——您的出价 {amount}",
      "placed": "已出价：{amount}。",
      "extendedNote": "您的出价发生在最后几分钟，拍品现在结束于 {date}。",
      "winsT": "您的中标",
      "payBy": "请于 {date} 前付款",
      "pay": "支付 {amount}",
      "paid": "已付款——许可证已激活",
      "paidHint": "可在“自托管”或“终身许可证”中找到。",
      "payTitle": "为中标付款",
      "payMethod": "付款方式",
      "noMethods": "目前没有可承载此金额的付款方式——请联系客服。",
      "close": "关闭",
      "paidText": "付款已确认——许可证已激活。",
      "myBidsT": "您的出价",
      "noBids": "您还没有出价。",
      "errors": {
        "closed": "该拍品已停止出价。",
        "not_started": "该拍品尚未开始出价。",
        "ended": "该拍品已结束。",
        "too_low": "您的出价低于下一最低出价。",
        "too_high": "出价不得高于正常价格。",
        "already_highest": "您已是该拍品的最高出价者。",
        "not_next": "有人刚刚在您之前出价——下一次出价已更新。",
        "receipt_required": "请上传付款截图。",
        "bad_amount": "请输入整数美元金额。",
        "not_found": "未找到该拍品。",
        "not_verified": "出价前请先验证邮箱并选择显示名称。",
        "admin": "管理员账户负责运营拍卖，不能出价。",
        "wait": "请稍候再试。",
        "verified": "您的邮箱已验证。",
        "no_code": "请先获取验证码。",
        "expired": "验证码已过期——请重新获取。",
        "attempts": "错误次数过多——请重新获取验证码。",
        "wrong": "验证码不正确。",
        "length": "请使用 2 至 48 个字符。",
        "chars": "只能使用字母、数字、空格以及 . , & ' ( ) -。",
        "contact": "不得包含邮箱、网址或电话号码。",
        "abuse": "请换一个名称。",
        "brand": "该名称属于其他公司的品牌。",
        "other": "出现问题——请重试。"
      }
    }
  },

  ja: {
    "eyebrow": "ライセンスオークション · 2週間ごと",
    "title": "AXTO のセルフホスト・ライセンスを通常価格の 25 % から落札。",
    "lead": "2週間ごとに、出品中の各パッケージのライセンスが1つずつ最高入札者のものになります。入札は通常価格の {open} から始まり、毎回金曜日 07:00 WIB (UTC+7) に終了します。落札したら通常のチェックアウトで支払うだけで、ライセンスは自動的に有効になります。",
    "endsIn": "このオークションの終了まで",
    "all": "すべて",
    "paid": "支払い済み",
    "unpaid": "未払い",
    "nextReady": "次回オークションの {n} ロットが準備済みです。このオークションが終わるとすぐに始まります。",
    "endsAt": "{date} に終了",
    "nextAuction": "次回のオークションは {date} に終了",
    "units": {
      "d": "日",
      "h": "時間",
      "m": "分",
      "s": "秒"
    },
    "cta": "ログインして入札",
    "ctaMember": "ワークスペースで入札",
    "lot": {
      "normal": "通常価格",
      "current": "現在の入札額",
      "opening": "開始価格",
      "nextMin": "次の最低入札額",
      "bids": "入札 {n} 件",
      "noBids": "まだ入札はありません",
      "leader": "最高入札者：{name}",
      "sold": "{name} が落札",
      "unsold": "落札者なし",
      "awaiting": "{name} が落札 — 未払い",
      "cancelled": "中止",
      "save": "通常価格より {pct} 安い",
      "extended": "残り {n} 分以内の入札でロットが延長されます"
    },
    "kinds": {
      "edition": "エディション・ライセンス",
      "lifetime": "永久ライセンス"
    },
    "emptyT": "このオークションにはまだロットがありません",
    "emptyB": "次回のオークション開始時に新しいロットが公開されます。またお越しください。",
    "offT": "オークションは一時停止中です",
    "offB": "現在開催中のオークションはありません。",
    "howTitle": "オークションの流れ",
    "how": [
      [
        "メールを確認",
        "ログインし、メールでお送りする 6 桁のコードを確認して、落札時に表示する名前を選びます。"
      ],
      [
        "入札",
        "入札は通常価格の {open} から始まり、1 回の入札ごとに開始価格の {step} ずつ上がります。残り {snipe} 分以内の入札でロットが延長されます。"
      ],
      [
        "金曜日に落札",
        "毎回のオークションは金曜日 07:00 WIB (UTC+7) に終了し、最高入札者が落札します。"
      ],
      [
        "{hours} 時間以内に支払い",
        "通常のチェックアウトで支払います。銀行振込の場合は支払いのスクリーンショットが必要で、管理者が承認します。支払いが確認されるまで、落札は「未払い」と表示されます。"
      ],
      [
        "ライセンスは自動発行",
        "支払いが確認されると、ライセンスは発行・署名され、すぐにインストールできます。担当者を待つ必要はありません。"
      ]
    ],
    "rulesTitle": "ルール",
    "rules": [
      "各オークションでパッケージごとに 1 ロット、1 ロットにつきライセンス 1 つ。",
      "開始価格はロット公開日の通常価格の {open}。入札ごとに開始価格の {step} ずつ上がります。",
      "入札額は通常価格を超えることはできません。",
      "入札できるのは確認済みメンバーのみで、自分の入札を上回ることはできません。",
      "ライセンスは落札者の支払い後にのみ送付されます。未払いの落札は「未払い」と表示されたままです。銀行振込には支払いのスクリーンショットと管理者の承認が必要です。",
      "ライセンスは通常価格で購入したものと同じです。機能・アップデート・サポートも同じです。",
      "落札者は表示する会社名または個人名を選べます。他社のブランド、連絡先、不快な表現は使えません。"
    ],
    "winnersTitle": "最近の落札者",
    "winnersLead": "各落札者が選んだ名前と、落札したパッケージ。",
    "noWinners": "最初のオークション終了後、最初の落札者がここに表示されます。",
    "lastTitle": "前回のオークション結果",
    "paidFor": "{amount}（通常 {normal}）",
    "faqTitle": "よくある質問",
    "faq": [
      [
        "オークションのライセンスは通常のライセンスと違いますか？",
        "いいえ。通常価格で購入した同じパッケージと同じ署名済み機能、アップデート、サポートが付きます。"
      ],
      [
        "オークションはいつ終了しますか？",
        "2週間ごと、必ず金曜日 07:00 WIB (UTC+7) です。終了直前の入札でロットが延長されるため、最後の 1 秒で競り負けることはありません。"
      ],
      [
        "落札したらどう支払いますか？",
        "ワークスペースで、通常のチェックアウトと同じ支払い方法を使います。銀行振込の場合は支払いのスクリーンショットをアップロードし、管理者が承認します。支払いが確認されるとライセンスが自動的に送付されます。"
      ],
      [
        "落札したのに支払わなかったら？",
        "ライセンスは送付されません。支払うまで落札は「未払い」と表示されたままで、管理者がロットを次の入札者に移すことがあります。"
      ],
      [
        "なぜメール確認が必要ですか？",
        "すべての入札が連絡の取れる実在のメンバーから行われるようにするためです。コード 1 つで完了します。"
      ],
      [
        "落札時にはどの名前が表示されますか？",
        "あなたが選んだ会社名または個人名です。オークションページで変更できます。他社のブランドや連絡先は使えません。"
      ]
    ],
    "home": {
      "title": "ライセンスオークション — 2週間ごと",
      "lead": "AXTO セルフホスト・ライセンスの最近の落札者。入札は通常価格の 25 % から。",
      "link": "開催中のオークションを見る →"
    },
    "me": {
      "title": "ライセンスオークション",
      "lead": "このオークションのロットに入札しましょう。入札は通常価格の {open} から始まります。",
      "verifyT": "入札するにはメールを確認してください",
      "verifyB": "入札できるのは確認済みメンバーのみです。{email} に 6 桁のコードをお送りします。",
      "send": "コードを送信",
      "sent": "{email} にコードを送信しました。有効期限は 15 分です。",
      "codeLabel": "6 桁のコード",
      "verify": "確認",
      "resend": "新しいコードを送信",
      "nameT": "落札時に表示する名前",
      "nameB": "会社名またはご本人の名前で、落札とともに axto.io に表示されます。他社のブランドや連絡先は使えません。",
      "nameLabel": "表示名",
      "saveName": "名前を保存",
      "nameSaved": "保存しました。",
      "verified": "確認済みの入札者",
      "bidLabel": "入札額（USD）",
      "bid": "入札する",
      "minHint": "次の入札額：{amount}",
      "bidAt": "{amount} で入札",
      "receiptNote": "銀行振込でお支払いですか？支払いのスクリーンショットが必須です。支払いパネルでアップロードしてください。管理者が承認すると、ライセンスがすぐに送付されます。",
      "leading": "あなたが最高入札者です",
      "outbid": "他の入札に上回られました — あなたの入札 {amount}",
      "placed": "入札しました：{amount}。",
      "extendedNote": "終了間際の入札のため、ロットの終了は {date} に延長されました。",
      "winsT": "落札したロット",
      "payBy": "{date} までに支払い",
      "pay": "{amount} を支払う",
      "paid": "支払い済み — ライセンスは有効です",
      "paidHint": "セルフホストまたは永久ライセンスで確認できます。",
      "payTitle": "落札分の支払い",
      "payMethod": "支払い方法",
      "noMethods": "現在この金額に対応できる支払い方法がありません。サポートにお問い合わせください。",
      "close": "閉じる",
      "paidText": "支払いが確認されました — ライセンスは有効です。",
      "myBidsT": "あなたの入札",
      "noBids": "まだ入札していません。",
      "errors": {
        "closed": "このロットの入札は締め切られました。",
        "not_started": "このロットの入札はまだ始まっていません。",
        "ended": "このロットは終了しました。",
        "too_low": "入札額が次の最低入札額を下回っています。",
        "too_high": "入札額は通常価格を超えられません。",
        "already_highest": "このロットではすでにあなたが最高入札者です。",
        "not_next": "直前に他の入札がありました。次の入札額が更新されました。",
        "receipt_required": "支払いのスクリーンショットをアップロードしてください。",
        "bad_amount": "米ドルの整数で入札額を入力してください。",
        "not_found": "ロットが見つかりません。",
        "not_verified": "入札する前にメールを確認し、表示名を選んでください。",
        "admin": "管理者アカウントはオークションを運営するため入札できません。",
        "wait": "少し待ってからもう一度お試しください。",
        "verified": "メールはすでに確認済みです。",
        "no_code": "まずコードをリクエストしてください。",
        "expired": "コードの有効期限が切れました。新しいコードをリクエストしてください。",
        "attempts": "誤ったコードが多すぎます。新しいコードをリクエストしてください。",
        "wrong": "コードが正しくありません。",
        "length": "2〜48 文字で入力してください。",
        "chars": "文字、数字、スペース、および . , & ' ( ) - のみ使えます。",
        "contact": "メールアドレス、URL、電話番号は使えません。",
        "abuse": "別の名前を選んでください。",
        "brand": "その名前は他社のブランドです。",
        "other": "問題が発生しました。もう一度お試しください。"
      }
    }
  },

  hi: {
    "eyebrow": "लाइसेंस नीलामी · हर 2 सप्ताह",
    "title": "AXTO सेल्फ-होस्टेड लाइसेंस उसकी कीमत के 25 % से जीतें।",
    "lead": "हर दो सप्ताह, नीलामी में रखे हर पैकेज का एक लाइसेंस सबसे ऊँची बोली लगाने वाले को मिलता है। बोली सामान्य कीमत के {open} से शुरू होती है और हर नीलामी शुक्रवार को 07:00 WIB (UTC+7) पर समाप्त होती है। जीतें, सामान्य चेकआउट से भुगतान करें, और लाइसेंस अपने आप सक्रिय हो जाता है।",
    "endsIn": "यह नीलामी समाप्त होगी",
    "all": "सभी",
    "paid": "भुगतान हो गया",
    "unpaid": "अभी भुगतान नहीं हुआ",
    "nextReady": "अगली नीलामी के {n} लॉट तैयार हैं — यह नीलामी समाप्त होते ही वह शुरू हो जाएगी।",
    "endsAt": "{date} को समाप्त",
    "nextAuction": "अगली नीलामी {date} को समाप्त होगी",
    "units": {
      "d": "दि",
      "h": "घं",
      "m": "मि",
      "s": "से"
    },
    "cta": "बोली लगाने के लिए साइन इन करें",
    "ctaMember": "अपने वर्कस्पेस में बोली लगाएँ",
    "lot": {
      "normal": "सामान्य कीमत",
      "current": "मौजूदा बोली",
      "opening": "प्रारंभिक बोली",
      "nextMin": "अगली न्यूनतम बोली",
      "bids": "{n} बोलियाँ",
      "noBids": "अभी कोई बोली नहीं",
      "leader": "आगे: {name}",
      "sold": "{name} ने जीता",
      "unsold": "कोई विजेता नहीं",
      "awaiting": "{name} ने जीता — अभी भुगतान नहीं हुआ",
      "cancelled": "रद्द",
      "save": "सामान्य कीमत से {pct} कम",
      "extended": "अंतिम {n} मिनट में लगी बोली लॉट को आगे बढ़ा देती है"
    },
    "kinds": {
      "edition": "एडिशन लाइसेंस",
      "lifetime": "आजीवन लाइसेंस"
    },
    "emptyT": "इस नीलामी में अभी कोई लॉट नहीं",
    "emptyB": "अगली नीलामी शुरू होने पर अगले लॉट खुलेंगे। जल्द ही फिर देखें।",
    "offT": "नीलामी रुकी हुई है",
    "offB": "इस समय कोई नीलामी नहीं चल रही है।",
    "howTitle": "नीलामी कैसे काम करती है",
    "how": [
      [
        "अपना ई-मेल सत्यापित करें",
        "साइन इन करें, हमारे भेजे 6 अंकों के कोड की पुष्टि करें और जीतने पर दिखाया जाने वाला नाम चुनें।"
      ],
      [
        "बोली लगाएँ",
        "बोली सामान्य कीमत के {open} से शुरू होती है; हर बोली कीमत को प्रारंभिक बोली के ठीक {step} से बढ़ाती है। अंतिम {snipe} मिनट में लगी बोली लॉट को आगे बढ़ा देती है।"
      ],
      [
        "शुक्रवार को जीतें",
        "हर नीलामी शुक्रवार को 07:00 WIB (UTC+7) पर समाप्त होती है। सबसे ऊँची बोली जीतती है।"
      ],
      [
        "{hours} घंटे के भीतर भुगतान करें",
        "सामान्य चेकआउट से भुगतान करें। बैंक ट्रांसफ़र के लिए भुगतान का स्क्रीनशॉट ज़रूरी है, जिसे एडमिन मंज़ूर करता है। भुगतान की पुष्टि होने तक जीत \"अभी भुगतान नहीं हुआ\" के रूप में दिखती है।"
      ],
      [
        "लाइसेंस अपने आप",
        "भुगतान की पुष्टि होते ही लाइसेंस जारी, हस्ताक्षरित और इंस्टॉल के लिए तैयार हो जाता है — किसी का इंतज़ार नहीं।"
      ]
    ],
    "rulesTitle": "नियम",
    "rules": [
      "हर नीलामी में प्रति पैकेज एक लॉट; प्रति लॉट एक लाइसेंस।",
      "लॉट खुलने के दिन की सामान्य कीमत का {open} प्रारंभिक बोली; हर बोली कीमत को प्रारंभिक बोली के ठीक {step} से बढ़ाती है।",
      "कोई बोली कभी सामान्य कीमत से अधिक नहीं हो सकती।",
      "केवल सत्यापित सदस्य बोली लगाते हैं; आप अपनी ही बोली से आगे नहीं जा सकते।",
      "विजेता के भुगतान के बाद ही लाइसेंस भेजा जाता है; बिना भुगतान वाली जीत \"अभी भुगतान नहीं हुआ\" के साथ दिखती रहती है। बैंक ट्रांसफ़र के लिए भुगतान का स्क्रीनशॉट और एडमिन की मंज़ूरी ज़रूरी है।",
      "लाइसेंस सामान्य कीमत पर खरीदे गए लाइसेंस जैसा ही है: वही सुविधाएँ, वही अपडेट, वही सहायता।",
      "विजेता दिखाया जाने वाला कंपनी या व्यक्तिगत नाम चुनते हैं — दूसरों के ब्रांड, संपर्क विवरण या आपत्तिजनक शब्द नहीं।"
    ],
    "winnersTitle": "हाल के विजेता",
    "winnersLead": "हर विजेता द्वारा चुना गया नाम और जीता गया पैकेज।",
    "noWinners": "पहली नीलामी समाप्त होने के बाद पहले विजेता यहाँ दिखेंगे।",
    "lastTitle": "पिछली नीलामी के परिणाम",
    "paidFor": "{amount} (सामान्य {normal})",
    "faqTitle": "प्रश्न",
    "faq": [
      [
        "क्या नीलामी का लाइसेंस सामान्य लाइसेंस से अलग है?",
        "नहीं। इसमें सामान्य कीमत पर खरीदे गए उसी पैकेज जैसी हस्ताक्षरित सुविधाएँ, अपडेट और सहायता मिलती है।"
      ],
      [
        "नीलामी कब समाप्त होती है?",
        "हर दो सप्ताह, हमेशा शुक्रवार को 07:00 WIB (UTC+7) पर। अंतिम मिनटों की बोली लॉट को आगे बढ़ा देती है ताकि कोई आख़िरी सेकंड में पीछे न रह जाए।"
      ],
      [
        "जीतने पर भुगतान कैसे करूँ?",
        "अपने वर्कस्पेस में, सामान्य चेकआउट के भुगतान तरीकों से। बैंक ट्रांसफ़र के लिए भुगतान का स्क्रीनशॉट अपलोड करें; एडमिन उसे मंज़ूर करता है। भुगतान की पुष्टि होते ही लाइसेंस अपने आप भेज दिया जाता है।"
      ],
      [
        "अगर मैं जीतूँ पर भुगतान न करूँ तो?",
        "कोई लाइसेंस नहीं भेजा जाता। भुगतान करने तक आपकी जीत \"अभी भुगतान नहीं हुआ\" के साथ दिखती रहती है; एडमिन लॉट अगले बोलीदाता को दे सकता है।"
      ],
      [
        "मुझे ई-मेल सत्यापित क्यों करना है?",
        "ताकि हर बोली किसी वास्तविक, संपर्क योग्य सदस्य से आए। बस एक कोड।"
      ],
      [
        "जीतने पर कौन-सा नाम दिखता है?",
        "आपके द्वारा चुना गया कंपनी या व्यक्तिगत नाम। आप इसे नीलामी पेज पर बदल सकते हैं। दूसरों के ब्रांड और संपर्क विवरण की अनुमति नहीं है।"
      ]
    ],
    "home": {
      "title": "लाइसेंस नीलामी — हर 2 सप्ताह",
      "lead": "AXTO सेल्फ-होस्टेड लाइसेंस के हाल के विजेता, बोली सामान्य कीमत के 25 % से।",
      "link": "यह नीलामी देखें →"
    },
    "me": {
      "title": "लाइसेंस नीलामी",
      "lead": "इस नीलामी के लॉट पर बोली लगाएँ। बोली सामान्य कीमत के {open} से शुरू होती है।",
      "verifyT": "बोली लगाने के लिए अपना ई-मेल सत्यापित करें",
      "verifyB": "केवल सत्यापित सदस्य बोली लगाते हैं। हम {email} पर 6 अंकों का कोड भेजते हैं।",
      "send": "कोड भेजें",
      "sent": "कोड {email} पर भेजा गया। यह 15 मिनट तक मान्य है।",
      "codeLabel": "6 अंकों का कोड",
      "verify": "सत्यापित करें",
      "resend": "नया कोड भेजें",
      "nameT": "जीतने पर दिखने वाला नाम",
      "nameB": "आपकी कंपनी का या आपका अपना नाम, जो axto.io पर आपकी जीत के साथ दिखेगा। दूसरों के ब्रांड और संपर्क विवरण नहीं।",
      "nameLabel": "प्रदर्शित नाम",
      "saveName": "नाम सहेजें",
      "nameSaved": "सहेजा गया।",
      "verified": "सत्यापित बोलीदाता",
      "bidLabel": "आपकी बोली (USD)",
      "bid": "बोली लगाएँ",
      "minHint": "अगली बोली: {amount}",
      "bidAt": "{amount} की बोली लगाएँ",
      "receiptNote": "बैंक ट्रांसफ़र से भुगतान? भुगतान का स्क्रीनशॉट ज़रूरी है: इसे भुगतान पैनल में अपलोड करें। एडमिन की मंज़ूरी के बाद आपका लाइसेंस तुरंत भेज दिया जाता है।",
      "leading": "आपकी बोली सबसे ऊँची है",
      "outbid": "आपसे ऊँची बोली लग गई — आपकी बोली {amount}",
      "placed": "बोली लगाई गई: {amount}।",
      "extendedNote": "आपकी बोली अंतिम मिनटों में आई, इसलिए लॉट अब {date} को समाप्त होगा।",
      "winsT": "आपकी जीत",
      "payBy": "{date} तक भुगतान करें",
      "pay": "{amount} भुगतान करें",
      "paid": "भुगतान हो गया — आपका लाइसेंस सक्रिय है",
      "paidHint": "इसे सेल्फ-होस्टेड या आजीवन लाइसेंस में देखें।",
      "payTitle": "अपनी जीत का भुगतान करें",
      "payMethod": "भुगतान का तरीका",
      "noMethods": "अभी कोई भुगतान तरीका यह राशि नहीं ले सकता — कृपया सहायता से संपर्क करें।",
      "close": "बंद करें",
      "paidText": "भुगतान की पुष्टि हुई — आपका लाइसेंस सक्रिय है।",
      "myBidsT": "आपकी बोलियाँ",
      "noBids": "आपने अभी तक बोली नहीं लगाई है।",
      "errors": {
        "closed": "इस लॉट पर बोली बंद हो चुकी है।",
        "not_started": "इस लॉट पर बोली अभी शुरू नहीं हुई है।",
        "ended": "यह लॉट समाप्त हो गया है।",
        "too_low": "आपकी बोली अगली न्यूनतम बोली से कम है।",
        "too_high": "कोई बोली सामान्य कीमत से अधिक नहीं हो सकती।",
        "already_highest": "इस लॉट पर आपकी बोली पहले से सबसे ऊँची है।",
        "not_next": "आपसे ठीक पहले किसी ने बोली लगाई — अगली बोली अपडेट हो गई है।",
        "receipt_required": "भुगतान का स्क्रीनशॉट अपलोड करें।",
        "bad_amount": "पूरे अमेरिकी डॉलर में बोली दर्ज करें।",
        "not_found": "नीलामी लॉट नहीं मिला।",
        "not_verified": "बोली लगाने से पहले ई-मेल सत्यापित करें और प्रदर्शित नाम चुनें।",
        "admin": "एडमिन खाते नीलामी चलाते हैं और बोली नहीं लगा सकते।",
        "wait": "कृपया थोड़ा रुककर फिर प्रयास करें।",
        "verified": "आपका ई-मेल पहले से सत्यापित है।",
        "no_code": "पहले कोड माँगें।",
        "expired": "कोड की अवधि समाप्त हो गई — नया कोड माँगें।",
        "attempts": "बहुत अधिक गलत कोड — नया कोड माँगें।",
        "wrong": "यह कोड सही नहीं है।",
        "length": "2 से 48 वर्ण उपयोग करें।",
        "chars": "केवल अक्षर, अंक, स्पेस और . , & ' ( ) - उपयोग करें।",
        "contact": "ई-मेल पते, वेब पते या फ़ोन नंबर नहीं।",
        "abuse": "कृपया कोई दूसरा नाम चुनें।",
        "brand": "यह नाम किसी दूसरी कंपनी का ब्रांड है।",
        "other": "कुछ गलत हो गया — कृपया फिर प्रयास करें।"
      }
    }
  },

  ar: {
    "eyebrow": "مزاد التراخيص · كل أسبوعين",
    "title": "اربح ترخيص AXTO للاستضافة الذاتية بدءًا من 25 % من سعره.",
    "lead": "كل أسبوعين يذهب ترخيص واحد من كل باقة معروضة في المزاد إلى صاحب أعلى عرض. تبدأ العروض من {open} من السعر العادي، وينتهي كل مزاد يوم الجمعة الساعة 07:00 بتوقيت WIB ‏(UTC+7). اربح، وادفع عبر الدفع المعتاد، ويتفعّل الترخيص تلقائيًا.",
    "endsIn": "ينتهي هذا المزاد خلال",
    "all": "الكل",
    "paid": "مدفوع",
    "unpaid": "لم يُدفع بعد",
    "nextReady": "{n} قطعة من المزاد التالي جاهزة — يبدأ فور انتهاء هذا المزاد.",
    "endsAt": "ينتهي في {date}",
    "nextAuction": "ينتهي المزاد التالي في {date}",
    "units": {
      "d": "ي",
      "h": "س",
      "m": "د",
      "s": "ث"
    },
    "cta": "سجّل الدخول للمزايدة",
    "ctaMember": "زايد من مساحة عملك",
    "lot": {
      "normal": "السعر العادي",
      "current": "العرض الحالي",
      "opening": "سعر الافتتاح",
      "nextMin": "الحد الأدنى التالي",
      "bids": "{n} عروض",
      "noBids": "لا عروض بعد",
      "leader": "في الصدارة: {name}",
      "sold": "فاز به {name}",
      "unsold": "لا فائز",
      "awaiting": "فاز به {name} — لم يُدفع بعد",
      "cancelled": "أُلغي",
      "save": "أقل من السعر العادي بنسبة {pct}",
      "extended": "العرض في آخر {n} دقائق يمدّد القطعة"
    },
    "kinds": {
      "edition": "ترخيص إصدار",
      "lifetime": "ترخيص مدى الحياة"
    },
    "emptyT": "لا توجد قطع في هذا المزاد بعد",
    "emptyB": "تُفتح القطع التالية مع بدء المزاد التالي. عُد قريبًا.",
    "offT": "المزاد متوقف مؤقتًا",
    "offB": "لا يوجد مزاد جارٍ في الوقت الحالي.",
    "howTitle": "كيف يعمل المزاد",
    "how": [
      [
        "تحقّق من بريدك",
        "سجّل الدخول وأكّد الرمز المكوّن من 6 أرقام الذي نرسله إليك، واختر الاسم الذي يظهر إذا فزت."
      ],
      [
        "زايد",
        "تبدأ العروض من {open} من السعر العادي، ويرفع كل عرض السعر بمقدار {step} من سعر الافتتاح بالضبط. العرض في آخر {snipe} دقائق يمدّد القطعة."
      ],
      [
        "الفوز يوم الجمعة",
        "ينتهي كل مزاد يوم الجمعة الساعة 07:00 بتوقيت WIB ‏(UTC+7). يفوز أعلى عرض."
      ],
      [
        "ادفع خلال {hours} ساعة",
        "ادفع عبر الدفع المعتاد. يتطلب التحويل البنكي لقطة شاشة للدفع يوافق عليها مشرف. وحتى تأكيد الدفع يظهر الفوز على أنه لم يُدفع بعد."
      ],
      [
        "الترخيص تلقائيًا",
        "بمجرد تأكيد الدفع يُصدر الترخيص ويُوقَّع ويصبح جاهزًا للتثبيت — دون انتظار أحد."
      ]
    ],
    "rulesTitle": "القواعد",
    "rules": [
      "قطعة واحدة لكل باقة في كل مزاد، وترخيص واحد لكل قطعة.",
      "سعر الافتتاح {open} من السعر العادي يوم فتح القطعة، ويرفع كل عرض السعر بمقدار {step} من سعر الافتتاح بالضبط.",
      "لا يمكن أن يتجاوز أي عرض السعر العادي.",
      "يزايد الأعضاء الموثّقون فقط، ولا يمكنك المزايدة على عرضك.",
      "لا يُرسل الترخيص إلا بعد دفع الفائز؛ ويبقى الفوز غير المدفوع معروضًا على أنه لم يُدفع بعد. يتطلب التحويل البنكي لقطة شاشة للدفع وموافقة مشرف.",
      "الترخيص مماثل لترخيص يُشترى بالسعر العادي: الميزات نفسها والتحديثات نفسها والدعم نفسه.",
      "يختار الفائزون اسم الشركة أو الاسم الشخصي المعروض — دون علامات تجارية للآخرين أو بيانات اتصال أو ألفاظ مسيئة."
    ],
    "winnersTitle": "أحدث الفائزين",
    "winnersLead": "الاسم الذي اختاره كل فائز والباقة التي فاز بها.",
    "noWinners": "سيظهر أول الفائزين هنا بعد انتهاء المزاد الأول.",
    "lastTitle": "نتائج المزاد السابق",
    "paidFor": "{amount} (العادي {normal})",
    "faqTitle": "أسئلة",
    "faq": [
      [
        "هل يختلف ترخيص المزاد عن الترخيص العادي؟",
        "لا. فيه الميزات الموقّعة والتحديثات والدعم نفسها التي في الباقة نفسها بالسعر العادي."
      ],
      [
        "متى ينتهي المزاد؟",
        "كل أسبوعين، دائمًا يوم الجمعة الساعة 07:00 بتوقيت WIB ‏(UTC+7). العرض في الدقائق الأخيرة يمدّد القطعة حتى لا يُتجاوز أحد في الثانية الأخيرة."
      ],
      [
        "كيف أدفع إذا فزت؟",
        "من مساحة عملك، بطرق الدفع المعتادة. في التحويل البنكي ارفع لقطة شاشة للدفع ليوافق عليها مشرف. يُرسل الترخيص تلقائيًا بعد تأكيد الدفع."
      ],
      [
        "ماذا لو فزت ولم أدفع؟",
        "لا يُرسل أي ترخيص. يبقى فوزك معروضًا على أنه لم يُدفع بعد حتى تدفع، ويمكن للمشرف منح القطعة للمزايد التالي."
      ],
      [
        "لماذا يجب التحقق من بريدي؟",
        "حتى يأتي كل عرض من عضو حقيقي يمكن التواصل معه. يكفي رمز واحد."
      ],
      [
        "ما الاسم الذي يظهر إذا فزت؟",
        "اسم الشركة أو الاسم الشخصي الذي تختاره، ويمكنك تغييره من صفحة المزاد. لا يُسمح بالعلامات التجارية للآخرين ولا ببيانات الاتصال."
      ]
    ],
    "home": {
      "title": "مزاد التراخيص — كل أسبوعين",
      "lead": "أحدث الفائزين بتراخيص AXTO للاستضافة الذاتية، بعروض تبدأ من 25 % من السعر العادي.",
      "link": "اطّلع على المزاد الحالي ←"
    },
    "me": {
      "title": "مزاد التراخيص",
      "lead": "زايد على قطع هذا المزاد. تبدأ العروض من {open} من السعر العادي.",
      "verifyT": "تحقّق من بريدك للمزايدة",
      "verifyB": "يزايد الأعضاء الموثّقون فقط. نرسل رمزًا من 6 أرقام إلى {email}.",
      "send": "أرسل الرمز",
      "sent": "أُرسل الرمز إلى {email}. صالح لمدة 15 دقيقة.",
      "codeLabel": "رمز من 6 أرقام",
      "verify": "تحقّق",
      "resend": "أرسل رمزًا جديدًا",
      "nameT": "الاسم الذي يظهر إذا فزت",
      "nameB": "اسم شركتك أو اسمك، ويظهر مع فوزك على axto.io. دون علامات تجارية للآخرين ودون بيانات اتصال.",
      "nameLabel": "الاسم المعروض",
      "saveName": "احفظ الاسم",
      "nameSaved": "تم الحفظ.",
      "verified": "مزايد موثّق",
      "bidLabel": "عرضك (دولار أمريكي)",
      "bid": "قدّم العرض",
      "minHint": "العرض التالي: {amount}",
      "bidAt": "زايد بـ {amount}",
      "receiptNote": "تدفع بتحويل بنكي؟ لقطة شاشة الدفع إلزامية: ارفعها في لوحة الدفع. يوافق عليها مشرف ويُرسل ترخيصك فورًا.",
      "leading": "عرضك هو الأعلى",
      "outbid": "تم تجاوز عرضك — عرضك {amount}",
      "placed": "تم تقديم العرض: {amount}.",
      "extendedNote": "وصل عرضك في الدقائق الأخيرة، لذا تنتهي القطعة الآن في {date}.",
      "winsT": "ما فزت به",
      "payBy": "ادفع قبل {date}",
      "pay": "ادفع {amount}",
      "paid": "مدفوع — ترخيصك مفعّل",
      "paidHint": "تجده في الاستضافة الذاتية أو تراخيص مدى الحياة.",
      "payTitle": "ادفع ثمن فوزك",
      "payMethod": "طريقة الدفع",
      "noMethods": "لا توجد حاليًا طريقة دفع تحمل هذا المبلغ — يُرجى التواصل مع الدعم.",
      "close": "إغلاق",
      "paidText": "تم تأكيد الدفع — ترخيصك مفعّل.",
      "myBidsT": "عروضك",
      "noBids": "لم تقدّم أي عرض بعد.",
      "errors": {
        "closed": "أُغلقت المزايدة على هذه القطعة.",
        "not_started": "لم تبدأ المزايدة على هذه القطعة بعد.",
        "ended": "انتهت هذه القطعة.",
        "too_low": "عرضك أقل من الحد الأدنى التالي.",
        "too_high": "لا يمكن أن يتجاوز العرض السعر العادي.",
        "already_highest": "عرضك هو الأعلى على هذه القطعة بالفعل.",
        "not_next": "قام أحدهم بالمزايدة قبلك مباشرة — تم تحديث العرض التالي.",
        "receipt_required": "ارفع لقطة شاشة الدفع.",
        "bad_amount": "أدخل عرضًا بالدولار الأمريكي دون كسور.",
        "not_found": "لم يتم العثور على القطعة.",
        "not_verified": "تحقّق من بريدك واختر اسمًا معروضًا قبل المزايدة.",
        "admin": "حسابات المشرفين تدير المزاد ولا يمكنها المزايدة.",
        "wait": "يُرجى الانتظار قليلًا ثم المحاولة مجددًا.",
        "verified": "بريدك موثّق بالفعل.",
        "no_code": "اطلب رمزًا أولًا.",
        "expired": "انتهت صلاحية الرمز — اطلب رمزًا جديدًا.",
        "attempts": "رموز خاطئة كثيرة — اطلب رمزًا جديدًا.",
        "wrong": "هذا الرمز غير صحيح.",
        "length": "استخدم من 2 إلى 48 حرفًا.",
        "chars": "استخدم الحروف والأرقام والمسافات و . , & ' ( ) - فقط.",
        "contact": "دون عناوين بريد أو مواقع ويب أو أرقام هواتف.",
        "abuse": "يُرجى اختيار اسم آخر.",
        "brand": "هذا الاسم علامة تجارية لشركة أخرى.",
        "other": "حدث خطأ — يُرجى المحاولة مجددًا."
      }
    }
  },
};
