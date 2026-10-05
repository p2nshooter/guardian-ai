/* Legal AI catalogue — Bahasa Indonesia (see lib/legal/catalog.ts). Loaded only when the portal is in Indonesian. */
import type { LegalCatalog } from "@/lib/legal/catalog";

const c: LegalCatalog = {
  clauseTypes: {
    confidentiality: "Kerahasiaan",
    liability: "Batasan tanggung jawab",
    indemnity: "Ganti rugi (indemnitas)",
    termination: "Pengakhiran",
    "governing-law": "Hukum yang berlaku",
    disputes: "Penyelesaian sengketa",
    ip: "Kekayaan intelektual",
    "data-protection": "Pelindungan data",
    payment: "Ketentuan pembayaran",
    renewal: "Perpanjangan",
    assignment: "Pengalihan",
    "non-compete": "Larangan bersaing",
    "non-solicit": "Larangan merekrut",
    warranty: "Jaminan",
    "force-majeure": "Keadaan kahar",
    audit: "Hak audit",
    insurance: "Asuransi",
    sla: "Tingkat layanan",
    term: "Jangka waktu",
    notice: "Pemberitahuan",
  },
  playbooks: {
    "nda-mutual": {
      name: "NDA timbal balik",
      side: "Salah satu pihak",
      positions: [
        ["Kewajiban timbal balik; pengecualian standar (informasi publik, sudah diketahui, dikembangkan sendiri, diterima dari pihak ketiga); pengungkapan hanya atas dasar perlu tahu.", "Perlindungan satu arah hanya dapat diterima jika hanya kami yang mengungkapkan informasi."],
        ["Kerahasiaan berlaku 2–5 tahun setelah pengungkapan (rahasia dagang: selama masih rahasia).", "Hingga 7 tahun untuk informasi yang sangat sensitif."],
        ["Tidak ada larangan merekrut dalam NDA; jika pihak lawan bersikeras, paling lama 12 bulan dan hanya untuk karyawan.", "12 bulan, tidak termasuk iklan lowongan umum."],
        ["Tidak ada larangan bersaing dalam NDA.", "Hapus."],
        ["Pengungkapan tidak berarti adanya lisensi atau pengalihan kekayaan intelektual.", "—"],
        ["Hukum dan pengadilan di negara kami.", "Hukum netral (mis. Inggris & Wales atau Singapura) dengan arbitrase."],
      ],
    },
    "saas-customer": {
      name: "SaaS / jasa — kami pelanggan",
      side: "Pelanggan",
      positions: [
        ["Batas tanggung jawab pemasok ≥ biaya 12 bulan; tanpa batas (atau batas super) untuk kebocoran data, kerahasiaan, indemnitas KI, kelalaian berat dan kesengajaan.", "Batas ≥ biaya 12 bulan dengan batas super 2–3× untuk kebocoran data."],
        ["Pemasok memberi ganti rugi atas pelanggaran KI pihak ketiga dan pelanggaran hukum pelindungan data.", "Minimal indemnitas KI."],
        ["Pembayaran dalam 30–60 hari sejak faktur yang benar; jumlah yang disengketakan dapat ditahan dengan iktikad baik.", "30 hari."],
        ["Tanpa perpanjangan otomatis, atau perpanjangan dengan pemberitahuan ≥ 30 hari dan batas kenaikan harga.", "Perpanjangan otomatis dengan pemberitahuan pembatalan 60 hari dan kenaikan harga dibatasi pada inflasi (CPI) atau 5 %."],
        ["Pengakhiran tanpa alasan dengan pemberitahuan 30–90 hari; karena wanprestasi dengan masa perbaikan 30 hari.", "Hanya karena wanprestasi, dengan pengembalian pro-rata biaya yang sudah dibayar di muka."],
        ["DPA yang memenuhi GDPR Pasal 28 / UU PDP; pemberitahuan kebocoran ≤ 48 jam; daftar subpemroses dan pemberitahuan perubahannya; data dikembalikan atau dihapus di akhir.", "Pemberitahuan kebocoran ≤ 72 jam."],
        ["Ketersediaan ≥ 99,9 % dengan kredit layanan dan hak mengakhiri bila gangguan berulang.", "99,5 % dengan kredit."],
        ["Tidak ada pihak yang boleh mengalihkan tanpa persetujuan, kecuali kepada afiliasi atau penerus usaha.", "Pemasok memerlukan persetujuan kami; kami boleh mengalihkan kepada afiliasi."],
        ["Hukum dan pengadilan di negara kami, atau arbitrase di tempat netral.", "Hukum netral dengan arbitrase (SIAC / ICC)."],
      ],
    },
    "saas-vendor": {
      name: "SaaS / jasa — kami pemasok",
      side: "Pemasok",
      positions: [
        ["Batas tanggung jawab kami = biaya yang dibayar dalam 12 bulan terakhir; tidak bertanggung jawab atas kerugian tidak langsung atau konsekuensial maupun kehilangan keuntungan.", "Batas hingga biaya 24 bulan; batas super kebocoran data ≤ 3×."],
        ["Layanan dilaksanakan dengan keahlian dan kehati-hatian yang wajar; semua jaminan lain dikecualikan sejauh diizinkan hukum.", "Tambahkan jaminan kinerja dengan pelaksanaan ulang sebagai satu-satunya upaya pemulihan."],
        ["Pembayaran dalam 30 hari; bunga keterlambatan; hak menangguhkan layanan setelah pemberitahuan jika tidak dibayar.", "45 hari."],
        ["Kami memegang semua KI atas platform; pelanggan memiliki datanya; lisensi terbatas untuk menggunakan layanan.", "Pelanggan memiliki hasil kerja yang dibuat khusus untuknya, kami memegang KI yang sudah ada sebelumnya."],
        ["Tidak ada pengakhiran tanpa alasan selama masa komitmen; karena wanprestasi dengan masa perbaikan 30 hari.", "Pengakhiran tanpa alasan dengan membayar sisa biaya."],
        ["Audit paling banyak sekali setahun, dengan pemberitahuan 30 hari, terlebih dahulu melalui sertifikasi kami (SOC 2 / ISO 27001).", "Audit di lokasi hanya setelah insiden yang terdokumentasi."],
      ],
    },
    "dpa-controller": {
      name: "Perjanjian pemrosesan data — kami pengendali",
      side: "Pengendali",
      positions: [
        ["Pemrosesan hanya atas instruksi tertulis; kerahasiaan personel; langkah keamanan; persetujuan subpemroses; bantuan untuk hak subjek data dan DPIA; penghapusan atau pengembalian di akhir; hak audit.", "Otorisasi tertulis umum untuk subpemroses dengan pemberitahuan dan hak keberatan."],
        ["Kegagalan pelindungan data pribadi diberitahukan tanpa penundaan dan dalam 24–48 jam.", "Dalam 72 jam — terlalu mepet dengan tenggat kami sendiri (72 jam GDPR / 3 × 24 jam UU PDP), jadi upayakan lebih cepat."],
        ["Hak mengaudit atau menerima laporan audit pihak ketiga.", "Laporan terlebih dahulu, audit di lokasi setelah insiden."],
        ["Tanggung jawab pemroses atas pelanggarannya tidak dibatasi di bawah batas kebocoran data perjanjian induk.", "Batas yang sama dengan perjanjian induk."],
      ],
    },
    employment: {
      name: "Kontrak kerja — kami pemberi kerja",
      side: "Pemberi kerja",
      positions: [
        ["Kerahasiaan selama dan setelah hubungan kerja.", "—"],
        ["Semua hasil kerja yang dibuat dalam rangka hubungan kerja menjadi milik pemberi kerja (dengan memperhatikan hukum setempat).", "—"],
        ["Hanya jika dapat diberlakukan menurut hukum setempat; ≤ 12 bulan, wilayah dan jabatan terbatas, dengan kompensasi bila diwajibkan hukum.", "Andalkan kerahasiaan dan larangan merekrut sebagai gantinya."],
        ["Masa pemberitahuan dan alasan pengakhiran yang memenuhi ketentuan minimum undang-undang setempat.", "—"],
        ["Hukum setempat di tempat kerja.", "—"],
      ],
    },
  },
  clauses: {
    confidentiality: {
      name: "Kerahasiaan",
      notes: "Periksa pengecualian dan berapa lama kewajiban berlaku; rahasia dagang mungkin perlu perlindungan tanpa batas waktu.",
      variants: {
        "confidentiality-bal": "Masing-masing pihak wajib merahasiakan seluruh Informasi Rahasia yang diungkapkan oleh pihak lainnya dan hanya menggunakannya untuk melaksanakan atau menerima manfaat dari Perjanjian ini. Informasi Rahasia tidak mencakup informasi yang (a) telah atau menjadi milik publik bukan karena pelanggaran Perjanjian ini, (b) telah diketahui secara sah oleh penerima sebelum pengungkapan, (c) dikembangkan secara mandiri tanpa menggunakan Informasi Rahasia, atau (d) diterima secara sah dari pihak ketiga tanpa kewajiban kerahasiaan. Penerima dapat mengungkapkan Informasi Rahasia kepada karyawan dan penasihatnya yang perlu mengetahuinya dan terikat kewajiban yang setara, atau apabila diwajibkan oleh hukum, dengan segera memberitahukannya sejauh diperbolehkan hukum. Kewajiban ini tetap berlaku selama [3] tahun setelah berakhirnya Perjanjian ini.",
        "confidentiality-short": "Masing-masing pihak wajib merahasiakan informasi rahasia pihak lainnya, hanya menggunakannya untuk Perjanjian ini dan hanya mengungkapkannya kepada pihak yang perlu mengetahuinya dan terikat kewajiban yang setara, kecuali diwajibkan oleh hukum. Ketentuan ini tetap berlaku selama [3] tahun setelah pengakhiran.",
      },
    },
    liability: {
      name: "Batasan tanggung jawab",
      notes: "Hukum setempat mungkin tidak mengizinkan pengecualian tanggung jawab atas kematian, cedera badan, penipuan atau kelalaian berat.",
      variants: {
        "liability-bal": "Tidak ada pihak yang mengecualikan atau membatasi tanggung jawab atas kematian atau cedera badan yang disebabkan oleh kelalaiannya, penipuan, atau tanggung jawab apa pun yang tidak dapat dibatasi menurut hukum. Dengan memperhatikan hal tersebut, tidak ada pihak yang bertanggung jawab atas kerugian tidak langsung atau konsekuensial, atau kehilangan keuntungan, pendapatan atau nama baik. Jumlah keseluruhan tanggung jawab masing-masing pihak yang timbul dari atau sehubungan dengan Perjanjian ini tidak melebihi total biaya yang telah dibayar dan terutang berdasarkan Perjanjian ini dalam [12] bulan sebelum peristiwa yang menimbulkan klaim, kecuali tanggung jawab atas pelanggaran ketentuan pelindungan data dan kerahasiaan yang tidak melebihi [3] kali jumlah tersebut.",
        "liability-supplier": "Jumlah keseluruhan tanggung jawab Pemasok yang timbul dari atau sehubungan dengan Perjanjian ini, baik berdasarkan kontrak, perbuatan melawan hukum (termasuk kelalaian) maupun dasar lainnya, tidak melebihi biaya yang dibayar oleh Pelanggan dalam [12] bulan sebelum klaim. Pemasok tidak bertanggung jawab atas kehilangan data, keuntungan, usaha atau nama baik, atau kerugian tidak langsung atau konsekuensial apa pun, sejauh diizinkan oleh hukum.",
        "liability-customer": "Jumlah keseluruhan tanggung jawab Pemasok tidak melebihi [jumlah yang lebih besar antara [jumlah] dan biaya [24] bulan]. Batasan dalam ketentuan ini tidak berlaku bagi tanggung jawab Pemasok atas pelanggaran kewajiban kerahasiaan atau pelindungan data, indemnitasnya, atau kelalaian berat atau kesengajaannya.",
      },
    },
    indemnity: {
      name: "Ganti rugi (pelanggaran KI)",
      notes: "Pasangkan dengan prosedur penanganan klaim; pertimbangkan batas dan pengecualian.",
      variants: {
        "indemnity-bal": "Pemasok wajib membela Pelanggan terhadap setiap klaim pihak ketiga bahwa Layanan melanggar hak kekayaan intelektual pihak ketiga tersebut, dan mengganti kerugian Pelanggan atas ganti rugi dan biaya yang diputuskan secara final atau disepakati dalam perdamaian, dengan syarat Pelanggan (a) segera memberitahu Pemasok, (b) memberi Pemasok kendali atas pembelaan dan perdamaian, dan (c) memberikan bantuan yang wajar atas biaya Pemasok. Pemasok tidak berkewajiban atas klaim yang timbul dari modifikasi yang tidak dilakukannya, penggabungan dengan barang yang tidak dipasoknya, atau penggunaan yang bertentangan dengan Perjanjian ini. Apabila klaim diajukan atau kemungkinan akan diajukan, Pemasok dapat memperoleh hak untuk melanjutkan penggunaan, memodifikasi Layanan agar tidak melanggar, atau mengakhiri dan mengembalikan biaya yang telah dibayar di muka untuk Layanan yang terdampak.",
      },
    },
    payment: {
      name: "Ketentuan pembayaran",
      notes: "Periksa aturan bunga keterlambatan dan rumusan pajak (PPN/VAT, pemotongan pajak) untuk yurisdiksi terkait.",
      variants: {
        "payment-bal": "Pemasok akan menagih biaya [bulanan di muka]. Pelanggan wajib membayar setiap faktur yang tidak disengketakan dalam [30] hari sejak diterima. Biaya belum termasuk PPN dan pajak sejenis, yang wajib dibayar Pelanggan sebagai tambahan sesuai tarif yang berlaku. Apabila Pelanggan menyengketakan suatu faktur dengan iktikad baik, Pelanggan wajib memberitahu Pemasok dalam [15] hari disertai alasannya dan membayar bagian yang tidak disengketakan. Jumlah yang terlambat dikenakan bunga [1]% per bulan (atau tarif maksimum yang sah, jika lebih rendah) sejak tanggal jatuh tempo hingga dibayar.",
        "payment-supplier": "Pelanggan wajib membayar semua faktur dalam [14] hari dalam mata uang faktur, tanpa kompensasi atau potongan. Apabila ada jumlah yang terlambat, Pemasok dapat, setelah pemberitahuan tertulis [7] hari, menangguhkan Layanan sampai pembayaran diterima dan mengenakan bunga [1,5]% per bulan.",
      },
    },
    "term-renewal": {
      name: "Jangka waktu dan perpanjangan",
      notes: "Banyak undang-undang konsumen dan sebagian ketentuan B2B membatasi perpanjangan otomatis tanpa pemberitahuan yang jelas.",
      variants: {
        "term-bal": "Perjanjian ini mulai berlaku pada Tanggal Efektif dan berlangsung untuk jangka waktu awal [12] bulan. Selanjutnya Perjanjian ini diperpanjang untuk periode berturut-turut masing-masing [12] bulan, kecuali salah satu pihak memberikan pemberitahuan tertulis untuk tidak memperpanjang paling lambat [60] hari sebelum berakhirnya jangka waktu yang sedang berjalan. Kenaikan biaya pada saat perpanjangan tidak boleh melebihi [5]% dan harus diberitahukan paling lambat [90] hari sebelum tanggal perpanjangan.",
        "term-customer": "Perjanjian ini berlaku selama [12] bulan dan kemudian berakhir secara otomatis, kecuali para pihak sepakat secara tertulis untuk memperpanjangnya.",
      },
    },
    termination: {
      name: "Pengakhiran",
      notes: "Selaraskan dengan hukum kepailitan (sebagian yurisdiksi membatasi pengakhiran karena kepailitan semata).",
      variants: {
        "termination-bal": "Masing-masing pihak dapat mengakhiri Perjanjian ini dengan pemberitahuan tertulis apabila pihak lainnya (a) melakukan pelanggaran material yang tidak diperbaiki dalam [30] hari sejak pemberitahuan tertulis yang meminta perbaikan, atau (b) menjadi pailit, memasuki likuidasi atau perdamaian dengan para krediturnya, atau menghentikan usahanya, sejauh diizinkan oleh hukum. Pelanggan juga dapat mengakhiri tanpa alasan dengan pemberitahuan tertulis [90] hari. Pada saat pengakhiran, hak-hak yang telah timbul tetap dilindungi dan ketentuan yang dimaksudkan untuk tetap berlaku (termasuk kerahasiaan, tanggung jawab dan pembayaran biaya yang telah timbul) tetap berlaku.",
      },
    },
    "governing-law": {
      name: "Hukum yang berlaku",
      notes: "Pilih hukum yang dapat Anda tangani; ketentuan wajib setempat (konsumen, ketenagakerjaan, data) mungkin tetap berlaku.",
      variants: {
        "law-bal": "Perjanjian ini dan setiap kewajiban non-kontraktual yang timbul dari atau sehubungan dengannya tunduk pada hukum [Republik Indonesia / Singapura / Inggris dan Wales].",
      },
    },
    arbitration: {
      name: "Penyelesaian sengketa — arbitrase",
      notes: "Gunakan klausul model dari lembaga arbitrase; pastikan tempat arbitrase mendukung pelaksanaan putusan berdasarkan Konvensi New York.",
      variants: {
        "arb-siac": "Setiap sengketa yang timbul dari atau sehubungan dengan Perjanjian ini, termasuk setiap pertanyaan mengenai keberadaan, keabsahan atau pengakhirannya, wajib diajukan dan diselesaikan secara final melalui arbitrase yang diselenggarakan oleh [Singapore International Arbitration Centre (SIAC) / Badan Arbitrase Nasional Indonesia (BANI)] sesuai dengan peraturannya yang berlaku pada saat itu. Tempat arbitrase adalah [Singapura / Jakarta]. Majelis arbitrase terdiri dari [satu / tiga] arbiter. Bahasa arbitrase adalah [bahasa Inggris / bahasa Indonesia].",
        "arb-escalation": "Para pihak terlebih dahulu wajib berupaya menyelesaikan setiap sengketa melalui negosiasi dengan iktikad baik antara manajer senior dalam [30] hari sejak pemberitahuan sengketa secara tertulis, kemudian melalui mediasi berdasarkan peraturan [lembaga], sebelum salah satu pihak memulai arbitrase atau proses pengadilan, kecuali untuk upaya sementara yang mendesak.",
      },
    },
    courts: {
      name: "Penyelesaian sengketa — pengadilan",
      notes: "Klausul yurisdiksi eksklusif memberi kepastian; periksa pengakuan putusan asing di tempat aset berada.",
      variants: {
        "courts-bal": "Pengadilan [Jakarta / Singapura / Inggris dan Wales] berwenang secara eksklusif untuk menyelesaikan setiap sengketa yang timbul dari atau sehubungan dengan Perjanjian ini, dan masing-masing pihak tunduk tanpa syarat pada yurisdiksi tersebut.",
      },
    },
    "force-majeure": {
      name: "Keadaan kahar",
      notes: "Rinci peristiwanya dengan cermat; sertakan hak mengakhiri setelah keadaan kahar yang berkepanjangan.",
      variants: {
        "fm-bal": "Tidak ada pihak yang dianggap melanggar Perjanjian ini atau bertanggung jawab atas keterlambatan atau kegagalan melaksanakan kewajibannya sejauh disebabkan oleh peristiwa di luar kendali wajarnya, termasuk bencana alam, wabah, perang, terorisme, kerusuhan, tindakan pemerintah, atau kegagalan utilitas atau jaringan publik (\"Keadaan Kahar\"), dengan syarat pihak tersebut segera memberitahu pihak lainnya dan melakukan upaya yang wajar untuk mengurangi dampaknya. Kewajiban pembayaran tidak dikecualikan. Apabila Keadaan Kahar menghalangi pelaksanaan lebih dari [60] hari berturut-turut, masing-masing pihak dapat mengakhiri Perjanjian ini dengan pemberitahuan tertulis.",
      },
    },
    assignment: {
      name: "Pengalihan dan subkontrak",
      notes: "Pertimbangkan ketentuan perubahan pengendalian secara terpisah.",
      variants: {
        "assign-bal": "Tidak ada pihak yang boleh mengalihkan, memindahkan atau mensubkontrakkan hak atau kewajibannya berdasarkan Perjanjian ini tanpa persetujuan tertulis terlebih dahulu dari pihak lainnya, yang tidak akan ditolak tanpa alasan yang wajar, kecuali bahwa masing-masing pihak dapat mengalihkan Perjanjian ini kepada afiliasi atau kepada penerus atas seluruh atau sebagian besar usahanya dengan pemberitahuan tertulis. Suatu pihak tetap bertanggung jawab atas tindakan dan kelalaian subkontraktornya.",
      },
    },
    "data-protection": {
      name: "Pelindungan data (ketentuan pemroses)",
      notes: "GDPR Pasal 28 dan UU PDP mensyaratkan ketentuan pemroses tertentu — gunakan DPA lengkap untuk pemrosesan yang signifikan.",
      variants: {
        "dp-bal": "Apabila Pemasok memproses data pribadi atas nama Pelanggan, Pemasok wajib: (a) memprosesnya hanya berdasarkan instruksi tertulis Pelanggan; (b) memastikan orang yang berwenang memprosesnya terikat kewajiban kerahasiaan; (c) menerapkan langkah keamanan teknis dan organisasi yang memadai; (d) tidak melibatkan pemroses lain tanpa otorisasi tertulis terlebih dahulu dari Pelanggan, dan membebankan kewajiban yang setara kepadanya; (e) membantu Pelanggan dalam permintaan subjek data, keamanan, pemberitahuan kegagalan pelindungan data dan penilaian dampak; (f) memberitahu Pelanggan tanpa penundaan yang tidak semestinya, dan dalam hal apa pun dalam [48] jam, setelah mengetahui terjadinya kegagalan pelindungan data pribadi; (g) menghapus atau mengembalikan seluruh data pribadi pada akhir Layanan kecuali hukum mewajibkan penyimpanan; dan (h) menyediakan informasi yang diperlukan untuk membuktikan kepatuhan dan mengizinkan audit. Transfer internasional memerlukan perlindungan yang memadai.",
      },
    },
    "ip-ownership": {
      name: "Kepemilikan kekayaan intelektual",
      notes: "Bedakan KI yang sudah ada dari hasil kerja; sebagian yurisdiksi mensyaratkan pengalihan tertulis atau pencatatan.",
      variants: {
        "ip-bal": "Masing-masing pihak tetap memiliki seluruh hak kekayaan intelektual yang dimilikinya sebelum Perjanjian ini atau yang dikembangkannya secara terpisah dari Perjanjian ini. Hak kekayaan intelektual atas hasil kerja yang dibuat khusus untuk Pelanggan berdasarkan Perjanjian ini beralih kepada Pelanggan setelah pembayaran lunas, kecuali materi milik Pemasok yang sudah ada sebelumnya dan tergabung di dalamnya, yang untuknya Pemasok memberikan kepada Pelanggan lisensi non-eksklusif, berlaku selamanya dan bebas royalti untuk menggunakannya sebagai bagian dari hasil kerja tersebut.",
        "ip-supplier": "Pemasok dan para pemberi lisensinya memiliki seluruh hak kekayaan intelektual atas Layanan, perangkat lunak dan seluruh penyempurnaannya. Pelanggan memiliki datanya. Pemasok memberikan kepada Pelanggan lisensi non-eksklusif yang tidak dapat dialihkan untuk menggunakan Layanan selama jangka waktu Perjanjian untuk keperluan usaha internalnya.",
      },
    },
    warranties: {
      name: "Jaminan",
      notes: "Undang-undang perlindungan konsumen dapat menyiratkan jaminan yang tidak dapat dikecualikan.",
      variants: {
        "warranty-bal": "Pemasok menjamin bahwa Layanan akan dilaksanakan dengan keahlian dan kehati-hatian yang wajar sesuai praktik industri yang baik dan secara material sesuai dengan dokumentasi. Apabila Layanan tidak sesuai, Pemasok wajib, atas pilihan dan biayanya, memperbaiki ketidaksesuaian tersebut atau melaksanakan ulang Layanan dalam waktu yang wajar; jika tidak dapat, Pelanggan dapat mengakhiri Layanan yang terdampak dan menerima pengembalian biaya yang telah dibayar di muka untuk Layanan tersebut. Kecuali dinyatakan secara tegas, semua jaminan lain dikecualikan sejauh diizinkan oleh hukum.",
      },
    },
    sla: {
      name: "Tingkat layanan dan kredit",
      notes: "Tetapkan cara pengukuran, pengecualian dan proses klaim secara tepat.",
      variants: {
        "sla-bal": "Pemasok wajib menyediakan Layanan [99,9]% dari waktu dalam setiap bulan kalender, tidak termasuk pemeliharaan terjadwal yang diberitahukan paling lambat [48] jam sebelumnya dan peristiwa di luar kendali wajarnya. Apabila ketersediaan berada di bawah tingkat tersebut, Pelanggan berhak atas kredit layanan sebesar [5]% dari biaya bulanan untuk setiap kekurangan [0,5]%, paling banyak [30]% dari biaya bulanan, yang diklaim dalam [30] hari. Apabila ketersediaan berada di bawah [99]% dalam [tiga] bulan mana pun dalam periode bergulir [enam] bulan, Pelanggan dapat mengakhiri Layanan yang terdampak tanpa penalti.",
      },
    },
    audit: {
      name: "Hak audit",
      notes: "Seimbangkan kepastian dengan biaya; izinkan penggunaan sertifikasi independen.",
      variants: {
        "audit-bal": "Dengan pemberitahuan tertulis paling lambat [30] hari dan tidak lebih dari sekali dalam periode [12] bulan (kecuali setelah insiden keamanan atau permintaan regulator), Pelanggan atau auditor independennya dapat mengaudit kepatuhan Pemasok terhadap Perjanjian ini pada jam kerja normal, dengan memperhatikan persyaratan kerahasiaan dan keselamatan yang wajar. Pemasok dapat memenuhi permintaan audit terlebih dahulu dengan menyerahkan sertifikasi atau laporan independen yang berlaku (seperti ISO/IEC 27001 atau SOC 2 Type II). Masing-masing pihak menanggung biaya auditnya sendiri, kecuali audit mengungkap ketidakpatuhan yang material.",
      },
    },
    insurance: {
      name: "Asuransi",
      notes: "Sesuaikan jenis dan nilai pertanggungan dengan risiko layanan.",
      variants: {
        "insurance-bal": "Selama jangka waktu Perjanjian dan [satu] tahun setelahnya, Pemasok wajib memiliki pada perusahaan asuransi yang bereputasi: asuransi tanggung gugat profesi paling sedikit [jumlah] per klaim, asuransi tanggung gugat umum dan produk paling sedikit [jumlah], serta asuransi tanggung gugat siber paling sedikit [jumlah], dan wajib memberikan bukti pertanggungan apabila diminta.",
      },
    },
    "anti-bribery": {
      name: "Antisuap dan sanksi",
      notes: "Rujuk undang-undang yang benar-benar berlaku (mis. UK Bribery Act, FCPA, UU Pemberantasan Tindak Pidana Korupsi).",
      variants: {
        "abc-bal": "Masing-masing pihak wajib mematuhi seluruh peraturan antisuap, antikorupsi dan sanksi yang berlaku, tidak menawarkan, memberikan, meminta atau menerima suap atau pembayaran yang tidak patut sehubungan dengan Perjanjian ini, dan memiliki prosedur yang memadai untuk mencegah perbuatan tersebut oleh orang-orang yang terkait dengannya. Masing-masing pihak dapat segera mengakhiri Perjanjian ini dengan pemberitahuan tertulis apabila pihak lainnya melanggar ketentuan ini.",
      },
    },
    "non-solicit": {
      name: "Larangan merekrut karyawan",
      notes: "Buat singkat dan wajar; pengadilan mungkin tidak memberlakukan larangan yang terlalu luas.",
      variants: {
        "nonsolicit-bal": "Selama jangka waktu Perjanjian dan [12] bulan setelahnya, tidak ada pihak yang boleh secara langsung maupun tidak langsung merekrut karyawan pihak lainnya yang terlibat secara material dalam Layanan, tanpa persetujuan tertulis terlebih dahulu dari pihak lainnya. Iklan lowongan umum yang tidak ditujukan kepada karyawan tersebut bukan merupakan pelanggaran.",
      },
    },
    "non-compete": {
      name: "Larangan bersaing (ketenagakerjaan)",
      notes: "Keberlakuannya sangat bervariasi; sebagian yurisdiksi mewajibkan kompensasi atau melarang klausul larangan bersaing.",
      variants: {
        "noncompete-emp": "Selama [6] bulan setelah berakhirnya hubungan kerja, Karyawan tidak boleh, di dalam [wilayah], bekerja pada atau memberikan jasa kepada usaha yang bersaing dengan bidang usaha Perusahaan yang melibatkan Karyawan secara material selama [12] bulan terakhir masa kerjanya, sejauh pembatasan ini wajar dan dapat diberlakukan menurut hukum yang berlaku. [Kompensasi: Perusahaan akan membayar [jumlah] per bulan selama masa pembatasan, apabila diwajibkan oleh hukum.]",
      },
    },
    notices: {
      name: "Pemberitahuan",
      notes: "Nyatakan kapan pemberitahuan berlaku dan apakah e-mail cukup untuk pemberitahuan resmi.",
      variants: {
        "notices-bal": "Setiap pemberitahuan berdasarkan Perjanjian ini wajib dibuat secara tertulis dan disampaikan langsung, melalui kurir atau melalui e-mail ke alamat yang tercantum dalam Perjanjian ini (atau alamat lain yang diberitahukan secara tertulis). Pemberitahuan dianggap diterima: jika disampaikan langsung atau melalui kurir, pada saat diserahkan; jika dikirim melalui e-mail, pada saat pengiriman kecuali pengirim menerima pesan kegagalan otomatis, dengan ketentuan bahwa pemberitahuan pelanggaran atau pengakhiran yang dikirim melalui e-mail juga dikirim melalui kurir.",
      },
    },
    "entire-agreement": {
      name: "Keseluruhan perjanjian",
      notes: "Biasanya tidak mengecualikan tanggung jawab atas pernyataan menyesatkan yang bersifat penipuan.",
      variants: {
        "entire-bal": "Perjanjian ini merupakan keseluruhan kesepakatan antara para pihak mengenai pokok perjanjiannya dan menggantikan seluruh perjanjian, pengaturan dan pemahaman sebelumnya di antara mereka. Masing-masing pihak mengakui bahwa ia tidak mengandalkan pernyataan, keterangan atau jaminan apa pun yang tidak tercantum dalam Perjanjian ini. Tidak ada ketentuan dalam pasal ini yang membatasi tanggung jawab atas penipuan.",
      },
    },
    severability: {
      name: "Keterpisahan, pengesampingan hak dan rangkap",
      notes: "Ketentuan standar — periksa formalitas setempat untuk tanda tangan elektronik.",
      variants: {
        "boiler-bal": "Apabila suatu ketentuan dalam Perjanjian ini dinyatakan tidak sah atau tidak dapat dilaksanakan, ketentuan tersebut akan diubah seminimal mungkin agar menjadi sah, dan bagian lain Perjanjian ini tetap berlaku. Tidak dilaksanakannya atau tertundanya pelaksanaan suatu hak tidak berarti pengesampingan hak tersebut. Perjanjian ini dapat ditandatangani dalam beberapa rangkap dan dengan tanda tangan elektronik, yang masing-masing merupakan asli dan bersama-sama membentuk satu perjanjian.",
      },
    },
    language: {
      name: "Bahasa (Indonesia)",
      notes: "UU No. 24 Tahun 2009 mewajibkan Bahasa Indonesia untuk perjanjian yang melibatkan pihak Indonesia — periksa aturan dan yurisprudensi terkini.",
      variants: {
        "language-id": "Perjanjian ini dibuat dalam bahasa Indonesia dan bahasa Inggris. Kedua versi sama-sama sah. Apabila terdapat ketidaksesuaian atau perbedaan penafsiran, versi [bahasa Indonesia / bahasa Inggris] yang berlaku, sejauh diizinkan oleh hukum.",
      },
    },
  },
  rules: {
    "id-banding-perdata": { name: "Banding (perkara perdata)", trigger: "Putusan diucapkan / diberitahukan", note: "" },
    "id-kasasi-perdata": { name: "Kasasi (perkara perdata)", trigger: "Putusan banding diberitahukan", note: "" },
    "id-pk": { name: "Peninjauan kembali", trigger: "Putusan berkekuatan hukum tetap / novum ditemukan", note: "Awal tenggat bergantung pada alasan peninjauan kembali (Pasal 67)." },
    "id-verzet": { name: "Verzet (perlawanan putusan verstek)", trigger: "Pemberitahuan putusan verstek", note: "" },
    "id-ptun": { name: "Gugatan Tata Usaha Negara", trigger: "Keputusan TUN diterima / diumumkan", note: "" },
    "id-pdp-breach": { name: "Pemberitahuan kegagalan pelindungan data pribadi", trigger: "Kegagalan pelindungan data diketahui", note: "" },
    "id-daluwarsa-30": { name: "Daluwarsa umum tuntutan perdata", trigger: "Timbulnya hak tuntut", note: "" },
    "us-answer": { name: "Jawaban atas gugatan (AS)", trigger: "Penyampaian panggilan dan gugatan", note: "60 hari jika penyampaian panggilan dikesampingkan (Rule 12(a)(1)(A)(ii))." },
    "us-new-trial": { name: "Permohonan sidang ulang / perubahan putusan (AS)", trigger: "Pencatatan putusan", note: "" },
    "us-appeal": { name: "Pemberitahuan banding perdata (AS)", trigger: "Pencatatan putusan atau penetapan", note: "60 hari jika Amerika Serikat menjadi pihak (Rule 4(a)(1)(B))." },
    "gb-aos": { name: "Pernyataan penerimaan gugatan (acknowledgment of service)", trigger: "Penyampaian rincian gugatan", note: "" },
    "gb-defence": { name: "Jawaban (setelah pernyataan penerimaan diajukan)", trigger: "Penyampaian rincian gugatan", note: "" },
    "gb-appeal": { name: "Pemberitahuan banding (appellant's notice)", trigger: "Tanggal putusan", note: "Kecuali pengadilan tingkat pertama menetapkan jangka waktu lain." },
    "gb-limitation-contract": { name: "Daluwarsa — kontrak biasa / perbuatan melawan hukum", trigger: "Timbulnya dasar gugatan", note: "" },
    "gb-limitation-pi": { name: "Daluwarsa — cedera badan", trigger: "Timbulnya dasar gugatan atau tanggal diketahui", note: "" },
    "sg-limitation": { name: "Daluwarsa — kontrak / perbuatan melawan hukum", trigger: "Timbulnya dasar gugatan", note: "" },
    "eu-gdpr-breach": { name: "Pemberitahuan kebocoran data GDPR ke otoritas", trigger: "Pengendali mengetahui kebocoran", note: "" },
    "eu-gdpr-dsar": { name: "Permintaan subjek data GDPR", trigger: "Permintaan diterima", note: "Dapat diperpanjang dua bulan lagi untuk permintaan yang kompleks." },
    "eu-nis2-warning": { name: "Peringatan dini NIS2 atas insiden signifikan", trigger: "Insiden diketahui", note: "" },
  },
};
export default c;
