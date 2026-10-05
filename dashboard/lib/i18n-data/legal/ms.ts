/* Legal AI catalogue — Bahasa Melayu (see lib/legal/catalog.ts). Loaded only when the portal is in Malay. */
import type { LegalCatalog } from "@/lib/legal/catalog";

const c: LegalCatalog = {
  clauseTypes: {
    confidentiality: "Kerahsiaan",
    liability: "Had liabiliti",
    indemnity: "Indemniti",
    termination: "Penamatan",
    "governing-law": "Undang-undang yang mentadbir",
    disputes: "Penyelesaian pertikaian",
    ip: "Harta intelek",
    "data-protection": "Perlindungan data",
    payment: "Terma pembayaran",
    renewal: "Pembaharuan",
    assignment: "Penyerahhakan",
    "non-compete": "Larangan bersaing",
    "non-solicit": "Larangan memujuk",
    warranty: "Waranti",
    "force-majeure": "Kuasa luar jangkaan (force majeure)",
    audit: "Hak audit",
    insurance: "Insurans",
    sla: "Tahap perkhidmatan",
    term: "Tempoh",
    notice: "Notis",
  },
  playbooks: {
    "nda-mutual": {
      name: "NDA bersama",
      side: "Mana-mana pihak",
      positions: [
        ["Kewajipan bersama; pengecualian standard (awam, sudah diketahui, dibangunkan secara bebas, diterima daripada pihak ketiga); pendedahan hanya atas dasar perlu tahu.", "Perlindungan sehala hanya boleh diterima jika kami satu-satunya pihak yang mendedahkan."],
        ["Kerahsiaan berkuat kuasa 2–5 tahun selepas pendedahan (rahsia dagangan: selagi masih rahsia).", "Sehingga 7 tahun bagi maklumat yang sangat sensitif."],
        ["Tiada larangan memujuk dalam NDA; jika pihak lawan berkeras, maksimum 12 bulan dan pekerja sahaja.", "12 bulan, tidak termasuk iklan jawatan kosong umum."],
        ["Tiada larangan bersaing dalam NDA.", "Buang."],
        ["Pendedahan tidak membayangkan sebarang lesen atau pemindahan harta intelek.", "—"],
        ["Undang-undang dan mahkamah negara kami.", "Undang-undang neutral (cth. England & Wales atau Singapura) dengan timbang tara."],
      ],
    },
    "saas-customer": {
      name: "SaaS / perkhidmatan — kami pelanggan",
      side: "Pelanggan",
      positions: [
        ["Had liabiliti pembekal ≥ fi 12 bulan; tanpa had (atau had super) bagi pelanggaran data, kerahsiaan, indemniti HI, kecuaian melampau dan salah laku sengaja.", "Had ≥ fi 12 bulan dengan had super 2–3× bagi pelanggaran data."],
        ["Pembekal memberi indemniti bagi pelanggaran HI pihak ketiga dan pelanggaran undang-undang perlindungan data.", "Sekurang-kurangnya indemniti HI."],
        ["Pembayaran dalam 30–60 hari daripada invois yang betul; amaun yang dipertikaikan boleh ditahan dengan suci hati.", "30 hari."],
        ["Tiada pembaharuan automatik, atau pembaharuan dengan notis ≥ 30 hari dan had kenaikan harga.", "Pembaharuan automatik dengan notis pembatalan 60 hari dan kenaikan harga dihadkan kepada CPI atau 5 %."],
        ["Penamatan atas kemudahan dengan notis 30–90 hari; atas sebab munasabah dengan tempoh pembetulan 30 hari.", "Atas sebab munasabah sahaja, dengan bayaran balik pro rata fi yang dibayar terdahulu."],
        ["DPA yang memenuhi GDPR Perkara 28 / UU PDP; notis pelanggaran ≤ 48 jam; senarai subpemproses dan notis perubahan; data dipulangkan atau dipadam pada akhirnya.", "Notis pelanggaran ≤ 72 jam."],
        ["Masa operasi ≥ 99.9 % dengan kredit perkhidmatan dan hak menamatkan jika kegagalan berulang.", "99.5 % dengan kredit."],
        ["Tiada pihak boleh menyerahhakkan tanpa persetujuan, kecuali kepada syarikat sekutu atau pengganti.", "Pembekal memerlukan persetujuan kami; kami boleh menyerahhakkan kepada syarikat sekutu."],
        ["Undang-undang dan mahkamah negara kami, atau timbang tara di tempat neutral.", "Undang-undang neutral dengan timbang tara (SIAC / ICC)."],
      ],
    },
    "saas-vendor": {
      name: "SaaS / perkhidmatan — kami pembekal",
      side: "Pembekal",
      positions: [
        ["Had kami = fi yang dibayar dalam 12 bulan sebelumnya; tiada liabiliti bagi kerugian tidak langsung atau berbangkit atau kehilangan keuntungan.", "Had sehingga fi 24 bulan; had super pelanggaran data ≤ 3×."],
        ["Perkhidmatan dilaksanakan dengan kemahiran dan penjagaan yang munasabah; semua waranti lain dikecualikan setakat yang dibenarkan undang-undang.", "Tambah waranti prestasi dengan pelaksanaan semula sebagai satu-satunya remedi."],
        ["Pembayaran dalam 30 hari; faedah lewat bayar; hak menggantung selepas notis jika tidak dibayar.", "45 hari."],
        ["Kami memegang semua HI dalam platform; pelanggan memiliki datanya; lesen terhad untuk menggunakan perkhidmatan.", "Pelanggan memiliki hasil kerja yang dibuat khusus untuknya, kami memegang HI sedia ada."],
        ["Tiada penamatan atas kemudahan dalam tempoh komitmen; atas sebab munasabah dengan tempoh pembetulan 30 hari.", "Penamatan atas kemudahan dengan bayaran baki fi."],
        ["Audit paling banyak sekali setahun, dengan notis 30 hari, melalui pensijilan kami (SOC 2 / ISO 27001) terlebih dahulu.", "Audit di premis hanya selepas insiden yang didokumenkan."],
      ],
    },
    "dpa-controller": {
      name: "Perjanjian pemprosesan data — kami pengawal",
      side: "Pengawal",
      positions: [
        ["Pemprosesan hanya atas arahan bertulis; kerahsiaan kakitangan; langkah keselamatan; persetujuan subpemproses; bantuan bagi hak subjek data dan DPIA; pemadaman atau pemulangan pada akhirnya; hak audit.", "Kebenaran bertulis am bagi subpemproses dengan notis dan hak membantah."],
        ["Pelanggaran data peribadi dimaklumkan tanpa kelewatan yang tidak wajar dan dalam 24–48 jam.", "Dalam 72 jam — terlalu ketat berbanding tarikh akhir kami sendiri (72 jam GDPR / 3 × 24 jam UU PDP), jadi minta lebih cepat."],
        ["Hak mengaudit atau menerima laporan audit pihak ketiga.", "Laporan dahulu, audit di premis selepas insiden."],
        ["Liabiliti pemproses bagi pelanggarannya tidak dihadkan di bawah had pelanggaran data perjanjian utama.", "Had yang sama seperti perjanjian utama."],
      ],
    },
    employment: {
      name: "Kontrak pekerjaan — kami majikan",
      side: "Majikan",
      positions: [
        ["Kerahsiaan semasa dan selepas pekerjaan.", "—"],
        ["Semua hasil kerja yang dicipta dalam perjalanan pekerjaan adalah milik majikan (tertakluk kepada undang-undang tempatan).", "—"],
        ["Hanya jika boleh dikuatkuasakan di peringkat tempatan; ≤ 12 bulan, kawasan dan peranan terhad, dengan balasan jika dikehendaki undang-undang.", "Bergantung pada kerahsiaan dan larangan memujuk sebagai gantinya."],
        ["Tempoh notis dan alasan yang memenuhi minimum statutori tempatan.", "—"],
        ["Undang-undang tempatan di tempat kerja.", "—"],
      ],
    },
  },
  clauses: {
    confidentiality: {
      name: "Kerahsiaan",
      notes: "Semak pengecualian dan berapa lama kewajipan berterusan; rahsia dagangan mungkin memerlukan perlindungan tanpa had masa.",
      variants: {
        "confidentiality-bal": "Setiap pihak hendaklah merahsiakan semua Maklumat Sulit yang didedahkan oleh pihak yang satu lagi dan menggunakannya hanya untuk melaksanakan atau menerima manfaat Perjanjian ini. Maklumat Sulit tidak termasuk maklumat yang (a) telah atau menjadi maklumat awam selain melalui pelanggaran Perjanjian ini, (b) telah diketahui secara sah oleh penerima sebelum pendedahan, (c) dibangunkan secara bebas tanpa menggunakan Maklumat Sulit, atau (d) diterima secara sah daripada pihak ketiga tanpa kewajipan kerahsiaan. Penerima boleh mendedahkan Maklumat Sulit kepada pekerja dan penasihatnya yang perlu mengetahuinya dan terikat dengan kewajipan yang setara, atau apabila dikehendaki oleh undang-undang, dengan memberi notis segera jika dibenarkan undang-undang. Kewajipan ini berterusan selama [3] tahun selepas penamatan Perjanjian ini.",
        "confidentiality-short": "Setiap pihak hendaklah merahsiakan maklumat sulit pihak yang satu lagi, menggunakannya hanya untuk Perjanjian ini dan mendedahkannya hanya kepada mereka yang perlu mengetahuinya dan terikat dengan kewajipan yang setara, kecuali sebagaimana dikehendaki oleh undang-undang. Fasal ini terus berkuat kuasa selama [3] tahun selepas penamatan.",
      },
    },
    liability: {
      name: "Had liabiliti",
      notes: "Undang-undang tempatan mungkin tidak membenarkan pengecualian liabiliti bagi kematian, kecederaan diri, penipuan atau kecuaian melampau.",
      variants: {
        "liability-bal": "Tiada pihak mengecualikan atau mengehadkan liabiliti bagi kematian atau kecederaan diri yang disebabkan oleh kecuaiannya, penipuan, atau apa-apa liabiliti yang tidak boleh dihadkan oleh undang-undang. Tertakluk kepada perkara itu, tiada pihak bertanggungan bagi apa-apa kerugian tidak langsung atau berbangkit, atau kehilangan keuntungan, hasil atau muhibah. Jumlah agregat liabiliti setiap pihak yang timbul daripada atau berkaitan dengan Perjanjian ini tidak boleh melebihi jumlah fi yang dibayar dan kena dibayar di bawah Perjanjian ini dalam tempoh [12] bulan sebelum peristiwa yang menimbulkan tuntutan, kecuali liabiliti bagi pelanggaran fasal perlindungan data dan kerahsiaan yang tidak boleh melebihi [3] kali ganda amaun tersebut.",
        "liability-supplier": "Jumlah agregat liabiliti Pembekal yang timbul daripada atau berkaitan dengan Perjanjian ini, sama ada dalam kontrak, tort (termasuk kecuaian) atau selainnya, tidak boleh melebihi fi yang dibayar oleh Pelanggan dalam tempoh [12] bulan sebelum tuntutan. Pembekal tidak mempunyai liabiliti bagi apa-apa kehilangan data, keuntungan, perniagaan atau muhibah, atau apa-apa kerugian tidak langsung atau berbangkit, setakat yang dibenarkan sepenuhnya oleh undang-undang.",
        "liability-customer": "Jumlah agregat liabiliti Pembekal tidak boleh melebihi [yang lebih besar antara [amaun] dan fi [24] bulan]. Had dalam fasal ini tidak terpakai kepada liabiliti Pembekal bagi pelanggaran kewajipan kerahsiaan atau perlindungan data, indemnitinya, atau kecuaian melampau atau salah laku sengajanya.",
      },
    },
    indemnity: {
      name: "Indemniti (pelanggaran HI)",
      notes: "Gandingkan dengan prosedur pengendalian tuntutan; pertimbangkan had dan pengecualian.",
      variants: {
        "indemnity-bal": "Pembekal hendaklah membela Pelanggan terhadap apa-apa tuntutan pihak ketiga bahawa Perkhidmatan melanggar hak harta intelek pihak ketiga tersebut, dan menanggung rugi Pelanggan bagi ganti rugi dan kos yang akhirnya diawardkan atau dipersetujui dalam penyelesaian, dengan syarat Pelanggan (a) segera memaklumkan Pembekal, (b) membenarkan Pembekal mengawal pembelaan dan penyelesaian, dan (c) memberikan bantuan yang munasabah atas kos Pembekal. Pembekal tidak mempunyai kewajipan bagi tuntutan yang timbul daripada pengubahsuaian yang tidak dibuat olehnya, gabungan dengan item yang tidak dibekalkan olehnya, atau penggunaan yang bertentangan dengan Perjanjian ini. Jika tuntutan dibuat atau berkemungkinan dibuat, Pembekal boleh mendapatkan hak untuk terus menggunakan, mengubah suai Perkhidmatan supaya tidak melanggar, atau menamatkan dan membayar balik fi prabayar bagi Perkhidmatan yang terjejas.",
      },
    },
    payment: {
      name: "Terma pembayaran",
      notes: "Semak peraturan faedah lewat bayar dan perkataan cukai (SST/VAT, pegangan cukai) bagi bidang kuasa berkenaan.",
      variants: {
        "payment-bal": "Pembekal hendaklah mengeluarkan invois fi [bulanan secara pendahuluan]. Pelanggan hendaklah membayar setiap invois yang tidak dipertikaikan dalam [30] hari dari tarikh penerimaan. Fi tidak termasuk VAT dan cukai yang serupa, yang hendaklah dibayar oleh Pelanggan sebagai tambahan pada kadar yang terpakai. Jika Pelanggan mempertikaikan sesuatu invois dengan suci hati, ia hendaklah memaklumkan Pembekal dalam [15] hari berserta alasan dan membayar bahagian yang tidak dipertikaikan. Amaun lewat dikenakan faedah pada kadar [1]% sebulan (atau kadar maksimum yang sah, jika lebih rendah) dari tarikh matang sehingga dibayar.",
        "payment-supplier": "Pelanggan hendaklah membayar semua invois dalam [14] hari dalam mata wang yang diinvoiskan, tanpa tolakan atau potongan. Jika mana-mana amaun tertunggak, Pembekal boleh, selepas notis bertulis [7] hari, menggantung Perkhidmatan sehingga bayaran diterima dan mengenakan faedah pada kadar [1.5]% sebulan.",
      },
    },
    "term-renewal": {
      name: "Tempoh dan pembaharuan",
      notes: "Banyak undang-undang pengguna dan sesetengah undang-undang B2B menyekat pembaharuan automatik tanpa notis yang jelas.",
      variants: {
        "term-bal": "Perjanjian ini bermula pada Tarikh Berkuat Kuasa dan berterusan bagi tempoh awal [12] bulan. Perjanjian ini kemudiannya diperbaharui bagi tempoh berturut-turut selama [12] bulan melainkan mana-mana pihak memberi notis bertulis tidak memperbaharui sekurang-kurangnya [60] hari sebelum tamat tempoh semasa. Sebarang kenaikan fi semasa pembaharuan tidak boleh melebihi [5]% dan mesti dimaklumkan sekurang-kurangnya [90] hari sebelum tarikh pembaharuan.",
        "term-customer": "Perjanjian ini berterusan selama [12] bulan dan kemudiannya tamat secara automatik melainkan pihak-pihak bersetuju secara bertulis untuk memperbaharuinya.",
      },
    },
    termination: {
      name: "Penamatan",
      notes: "Selaraskan dengan undang-undang insolvensi (sesetengah bidang kuasa menyekat penamatan semata-mata kerana insolvensi).",
      variants: {
        "termination-bal": "Mana-mana pihak boleh menamatkan Perjanjian ini melalui notis bertulis jika pihak yang satu lagi (a) melakukan pelanggaran material yang tidak diremedikan dalam [30] hari dari notis bertulis yang menghendaki ia diremedikan, atau (b) menjadi insolven, memasuki pembubaran atau perkiraan dengan pemiutangnya, atau berhenti menjalankan perniagaan, setakat yang dibenarkan oleh undang-undang. Pelanggan juga boleh menamatkan atas kemudahan dengan notis bertulis [90] hari. Apabila penamatan, hak yang telah terakru dipelihara dan fasal yang bertujuan untuk terus berkuat kuasa (termasuk kerahsiaan, liabiliti dan pembayaran fi terakru) terus berkuat kuasa.",
      },
    },
    "governing-law": {
      name: "Undang-undang yang mentadbir",
      notes: "Pilih undang-undang yang boleh anda gunakan; peraturan tempatan yang mandatori (pengguna, pekerjaan, data) mungkin masih terpakai.",
      variants: {
        "law-bal": "Perjanjian ini dan apa-apa kewajipan bukan kontrak yang timbul daripada atau berkaitan dengannya ditadbir oleh undang-undang [Republik Indonesia / Singapura / England dan Wales].",
      },
    },
    arbitration: {
      name: "Penyelesaian pertikaian — timbang tara",
      notes: "Gunakan fasal model institusi; pastikan tempat timbang tara menyokong penguatkuasaan di bawah Konvensyen New York.",
      variants: {
        "arb-siac": "Apa-apa pertikaian yang timbul daripada atau berkaitan dengan Perjanjian ini, termasuk apa-apa persoalan mengenai kewujudan, kesahan atau penamatannya, hendaklah dirujuk kepada dan diselesaikan secara muktamad melalui timbang tara yang ditadbir oleh [Singapore International Arbitration Centre (SIAC) / Badan Arbitrase Nasional Indonesia (BANI)] mengikut peraturannya yang berkuat kuasa pada masa itu. Tempat timbang tara ialah [Singapura / Jakarta]. Tribunal hendaklah terdiri daripada [seorang / tiga orang] penimbang tara. Bahasa timbang tara ialah [bahasa Inggeris / bahasa Indonesia].",
        "arb-escalation": "Pihak-pihak hendaklah terlebih dahulu cuba menyelesaikan apa-apa pertikaian melalui rundingan dengan suci hati antara pengurus kanan dalam [30] hari dari notis pertikaian bertulis, kemudian melalui pengantaraan di bawah peraturan [institusi], sebelum mana-mana pihak memulakan timbang tara atau prosiding mahkamah, kecuali bagi relif interim yang mendesak.",
      },
    },
    courts: {
      name: "Penyelesaian pertikaian — mahkamah",
      notes: "Fasal bidang kuasa eksklusif memberi kepastian; semak pengiktirafan penghakiman asing di tempat aset berada.",
      variants: {
        "courts-bal": "Mahkamah [Jakarta / Singapura / England dan Wales] mempunyai bidang kuasa eksklusif untuk menyelesaikan apa-apa pertikaian yang timbul daripada atau berkaitan dengan Perjanjian ini, dan setiap pihak tunduk secara tidak boleh batal kepada bidang kuasa tersebut.",
      },
    },
    "force-majeure": {
      name: "Kuasa luar jangkaan (force majeure)",
      notes: "Senaraikan peristiwa dengan teliti; sertakan hak menamatkan selepas force majeure yang berpanjangan.",
      variants: {
        "fm-bal": "Tiada pihak melanggar Perjanjian ini atau bertanggungan atas kelewatan atau kegagalan melaksanakan kewajipannya setakat yang disebabkan oleh peristiwa di luar kawalan munasabahnya, termasuk bencana alam, wabak, perang, keganasan, rusuhan, tindakan kerajaan, atau kegagalan utiliti atau rangkaian awam (\"Peristiwa Force Majeure\"), dengan syarat ia segera memaklumkan pihak yang satu lagi dan menggunakan usaha yang munasabah untuk mengurangkan kesannya. Kewajipan pembayaran tidak dikecualikan. Jika Peristiwa Force Majeure menghalang pelaksanaan selama lebih daripada [60] hari berturut-turut, mana-mana pihak boleh menamatkan Perjanjian ini melalui notis bertulis.",
      },
    },
    assignment: {
      name: "Penyerahhakan dan subkontrak",
      notes: "Pertimbangkan peruntukan perubahan kawalan secara berasingan.",
      variants: {
        "assign-bal": "Tiada pihak boleh menyerahhakkan, memindahkan atau mensubkontrakkan mana-mana hak atau kewajipannya di bawah Perjanjian ini tanpa persetujuan bertulis terlebih dahulu daripada pihak yang satu lagi, yang tidak akan ditahan secara tidak munasabah, kecuali bahawa mana-mana pihak boleh menyerahhakkan Perjanjian ini kepada syarikat sekutu atau kepada pengganti bagi semua atau sebahagian besar perniagaannya dengan notis bertulis. Sesuatu pihak kekal bertanggungjawab atas perbuatan dan peninggalan subkontraktornya.",
      },
    },
    "data-protection": {
      name: "Perlindungan data (terma pemproses)",
      notes: "GDPR Perkara 28 dan UU PDP memerlukan terma pemproses tertentu — gunakan DPA penuh bagi pemprosesan yang ketara.",
      variants: {
        "dp-bal": "Jika Pembekal memproses data peribadi bagi pihak Pelanggan, ia hendaklah: (a) memprosesnya hanya atas arahan bertulis Pelanggan; (b) memastikan orang yang diberi kuasa untuk memprosesnya terikat dengan kerahsiaan; (c) melaksanakan langkah keselamatan teknikal dan organisasi yang sesuai; (d) tidak melantik pemproses lain tanpa kebenaran bertulis terlebih dahulu daripada Pelanggan, dan mengenakan kewajipan yang setara ke atasnya; (e) membantu Pelanggan dengan permintaan subjek data, keselamatan, pemberitahuan pelanggaran dan penilaian impak; (f) memaklumkan Pelanggan tanpa kelewatan yang tidak wajar, dan dalam apa jua keadaan dalam [48] jam, selepas mengetahui tentang pelanggaran data peribadi; (g) memadam atau memulangkan semua data peribadi pada akhir Perkhidmatan melainkan undang-undang menghendaki penyimpanan; dan (h) menyediakan maklumat yang perlu untuk membuktikan pematuhan dan membenarkan audit. Pemindahan antarabangsa memerlukan perlindungan yang sesuai.",
      },
    },
    "ip-ownership": {
      name: "Pemilikan harta intelek",
      notes: "Bezakan HI sedia ada daripada hasil kerja; sesetengah bidang kuasa memerlukan penyerahhakan bertulis atau pendaftaran.",
      variants: {
        "ip-bal": "Setiap pihak mengekalkan semua hak harta intelek yang dimilikinya sebelum Perjanjian ini atau yang dibangunkannya secara bebas daripadanya. Hak harta intelek dalam hasil kerja yang dicipta khusus untuk Pelanggan di bawah Perjanjian ini terletak hak pada Pelanggan apabila bayaran penuh dibuat, kecuali bahan sedia ada Pembekal yang digabungkan di dalamnya, yang mana Pembekal memberikan kepada Pelanggan lesen bukan eksklusif, kekal dan bebas royalti untuk menggunakannya sebagai sebahagian daripada hasil kerja tersebut.",
        "ip-supplier": "Pembekal dan pemberi lesennya memiliki semua hak harta intelek dalam Perkhidmatan, perisian dan semua penambahbaikan kepadanya. Pelanggan memiliki datanya. Pembekal memberikan kepada Pelanggan lesen bukan eksklusif yang tidak boleh dipindah milik untuk menggunakan Perkhidmatan sepanjang tempoh bagi tujuan perniagaan dalamannya.",
      },
    },
    warranties: {
      name: "Waranti",
      notes: "Undang-undang pengguna mungkin membayangkan waranti yang tidak boleh dikecualikan.",
      variants: {
        "warranty-bal": "Pembekal menjamin bahawa Perkhidmatan akan dilaksanakan dengan kemahiran dan penjagaan yang munasabah selaras dengan amalan industri yang baik dan secara material mematuhi dokumentasi. Jika Perkhidmatan tidak mematuhi, Pembekal hendaklah, atas pilihan dan kosnya, membetulkan ketidakpatuhan itu atau melaksanakan semula Perkhidmatan dalam masa yang munasabah; jika tidak dapat, Pelanggan boleh menamatkan Perkhidmatan yang terjejas dan menerima bayaran balik fi prabayar baginya. Kecuali sebagaimana dinyatakan dengan nyata, semua waranti lain dikecualikan setakat yang dibenarkan oleh undang-undang.",
      },
    },
    sla: {
      name: "Tahap perkhidmatan dan kredit",
      notes: "Tentukan cara pengukuran, pengecualian dan proses tuntutan dengan tepat.",
      variants: {
        "sla-bal": "Pembekal hendaklah menyediakan Perkhidmatan [99.9]% daripada masa dalam setiap bulan kalendar, tidak termasuk penyelenggaraan berjadual yang dimaklumkan sekurang-kurangnya [48] jam lebih awal dan peristiwa di luar kawalan munasabahnya. Jika ketersediaan jatuh di bawah tahap itu, Pelanggan berhak mendapat kredit perkhidmatan sebanyak [5]% daripada fi bulanan bagi setiap kekurangan [0.5]%, sehingga [30]% daripada fi bulanan, yang dituntut dalam [30] hari. Jika ketersediaan jatuh di bawah [99]% dalam mana-mana [tiga] bulan dalam tempoh bergilir [enam] bulan, Pelanggan boleh menamatkan Perkhidmatan yang terjejas tanpa penalti.",
      },
    },
    audit: {
      name: "Hak audit",
      notes: "Imbangkan jaminan dengan kos; benarkan pergantungan pada pensijilan bebas.",
      variants: {
        "audit-bal": "Dengan notis bertulis sekurang-kurangnya [30] hari dan tidak lebih daripada sekali dalam mana-mana tempoh [12] bulan (kecuali selepas insiden keselamatan atau permintaan pengawal selia), Pelanggan atau juruaudit bebasnya boleh mengaudit pematuhan Pembekal terhadap Perjanjian ini semasa waktu perniagaan biasa, tertakluk kepada keperluan kerahsiaan dan keselamatan yang munasabah. Pembekal boleh memenuhi permintaan audit terlebih dahulu dengan memberikan pensijilan atau laporan bebas semasa (seperti ISO/IEC 27001 atau SOC 2 Type II). Setiap pihak menanggung kos auditnya sendiri melainkan audit mendedahkan ketidakpatuhan yang material.",
      },
    },
    insurance: {
      name: "Insurans",
      notes: "Padankan jenis dan amaun perlindungan dengan risiko perkhidmatan.",
      variants: {
        "insurance-bal": "Sepanjang tempoh dan selama [satu] tahun selepasnya, Pembekal hendaklah mengekalkan dengan penanggung insurans yang bereputasi: insurans indemniti profesional sekurang-kurangnya [amaun] bagi setiap tuntutan, insurans liabiliti awam dan produk sekurang-kurangnya [amaun], dan insurans liabiliti siber sekurang-kurangnya [amaun], dan hendaklah memberikan bukti perlindungan apabila diminta.",
      },
    },
    "anti-bribery": {
      name: "Antirasuah dan sekatan",
      notes: "Rujuk undang-undang yang benar-benar terpakai (cth. UK Bribery Act, FCPA, Akta SPRM 2009).",
      variants: {
        "abc-bal": "Setiap pihak hendaklah mematuhi semua undang-undang antirasuah, antikorupsi dan sekatan yang terpakai, tidak boleh menawarkan, memberi, meminta atau menerima apa-apa rasuah atau bayaran yang tidak wajar berkaitan dengan Perjanjian ini, dan hendaklah mengekalkan prosedur yang mencukupi untuk mencegah kelakuan sedemikian oleh orang yang berkaitan dengannya. Mana-mana pihak boleh menamatkan Perjanjian ini serta-merta melalui notis bertulis jika pihak yang satu lagi melanggar fasal ini.",
      },
    },
    "non-solicit": {
      name: "Larangan memujuk pekerja",
      notes: "Pastikan ringkas dan munasabah; mahkamah mungkin tidak menguatkuasakan sekatan yang luas.",
      variants: {
        "nonsolicit-bal": "Sepanjang tempoh dan selama [12] bulan selepasnya, tiada pihak boleh secara langsung atau tidak langsung memujuk untuk menggaji mana-mana pekerja pihak yang satu lagi yang terlibat secara material dalam Perkhidmatan, tanpa persetujuan bertulis terlebih dahulu daripada pihak yang satu lagi. Iklan pengambilan umum yang tidak disasarkan kepada pekerja tersebut bukan suatu pelanggaran.",
      },
    },
    "non-compete": {
      name: "Larangan bersaing (pekerjaan)",
      notes: "Kebolehkuatkuasaan sangat berbeza; sesetengah bidang kuasa memerlukan pampasan atau melarang larangan bersaing.",
      variants: {
        "noncompete-emp": "Selama [6] bulan selepas penamatan pekerjaan, Pekerja tidak boleh, dalam [wilayah], diambil bekerja oleh atau memberikan perkhidmatan kepada perniagaan yang bersaing dengan perniagaan Syarikat yang melibatkan Pekerja secara material dalam [12] bulan terakhir pekerjaannya, setakat sekatan ini munasabah dan boleh dikuatkuasakan di bawah undang-undang yang terpakai. [Balasan: Syarikat hendaklah membayar [amaun] sebulan sepanjang tempoh sekatan, jika dikehendaki oleh undang-undang.]",
      },
    },
    notices: {
      name: "Notis",
      notes: "Nyatakan bila notis berkuat kuasa dan sama ada e-mel memadai bagi notis rasmi.",
      variants: {
        "notices-bal": "Apa-apa notis di bawah Perjanjian ini hendaklah dibuat secara bertulis dan diserahkan sendiri, melalui kurier atau melalui e-mel ke alamat yang dinyatakan dalam Perjanjian ini (atau alamat lain yang dimaklumkan secara bertulis). Notis dianggap diterima: jika diserahkan sendiri atau melalui kurier, semasa penyerahan; jika dihantar melalui e-mel, pada masa penghantaran melainkan penghantar menerima mesej kegagalan automatik, dengan syarat notis pelanggaran atau penamatan yang dihantar melalui e-mel juga dihantar melalui kurier.",
      },
    },
    "entire-agreement": {
      name: "Keseluruhan perjanjian",
      notes: "Lazimnya tidak mengecualikan liabiliti bagi salah nyataan secara fraud.",
      variants: {
        "entire-bal": "Perjanjian ini merupakan keseluruhan perjanjian antara pihak-pihak berhubung perkara pokoknya dan menggantikan semua perjanjian, perkiraan dan persefahaman terdahulu antara mereka. Setiap pihak mengakui bahawa ia tidak bergantung pada apa-apa kenyataan, representasi atau waranti yang tidak dinyatakan dalam Perjanjian ini. Tiada apa-apa dalam fasal ini mengehadkan liabiliti bagi penipuan.",
      },
    },
    severability: {
      name: "Kebolehasingan, penepian dan salinan",
      notes: "Peruntukan standard — semak formaliti tempatan bagi tandatangan elektronik.",
      variants: {
        "boiler-bal": "Jika mana-mana peruntukan Perjanjian ini didapati tidak sah atau tidak boleh dikuatkuasakan, ia hendaklah diubah suai setakat minimum yang perlu untuk menjadikannya sah, dan baki Perjanjian ini kekal berkuat kuasa. Kegagalan atau kelewatan menggunakan apa-apa hak bukan penepian hak tersebut. Perjanjian ini boleh dilaksanakan dalam beberapa salinan dan melalui tandatangan elektronik, setiap satunya adalah asal dan bersama-sama membentuk satu perjanjian.",
      },
    },
    language: {
      name: "Bahasa (Indonesia)",
      notes: "Undang-undang Indonesia No. 24 Tahun 2009 mewajibkan Bahasa Indonesia bagi perjanjian yang melibatkan pihak Indonesia — sahkan peraturan dan kes undang-undang semasa.",
      variants: {
        "language-id": "Perjanjian ini dibuat dalam bahasa Indonesia dan bahasa Inggeris. Kedua-dua versi adalah sama sahihnya. Sekiranya terdapat ketidakselarasan atau tafsiran yang berbeza, versi [bahasa Indonesia / bahasa Inggeris] hendaklah diguna pakai, setakat yang dibenarkan oleh undang-undang.",
      },
    },
  },
  rules: {
    "id-banding-perdata": { name: "Rayuan — kes sivil (banding)", trigger: "Penghakiman diumumkan atau disampaikan", note: "" },
    "id-kasasi-perdata": { name: "Kasasi — kes sivil", trigger: "Penghakiman rayuan disampaikan", note: "" },
    "id-pk": { name: "Semakan semula kes (peninjauan kembali)", trigger: "Penghakiman muktamad / bukti baharu (novum) ditemui", note: "Permulaan tempoh bergantung pada alasan semakan (Pasal 67)." },
    "id-verzet": { name: "Bantahan terhadap penghakiman ingkar (verzet)", trigger: "Penghakiman ingkar disampaikan", note: "" },
    "id-ptun": { name: "Tuntutan mahkamah pentadbiran (gugatan TUN)", trigger: "Keputusan pentadbiran diterima atau diumumkan", note: "" },
    "id-pdp-breach": { name: "Pemberitahuan pelanggaran data peribadi (UU PDP)", trigger: "Kegagalan perlindungan data diketahui", note: "" },
    "id-daluwarsa-30": { name: "Had masa am tuntutan sivil (daluwarsa)", trigger: "Hak tindakan timbul", note: "" },
    "us-answer": { name: "Jawapan kepada aduan (AS)", trigger: "Penyampaian saman dan aduan", note: "60 hari jika penyampaian diketepikan (Rule 12(a)(1)(A)(ii))." },
    "us-new-trial": { name: "Usul perbicaraan baharu / mengubah penghakiman (AS)", trigger: "Pemasukan penghakiman", note: "" },
    "us-appeal": { name: "Notis rayuan sivil (AS)", trigger: "Pemasukan penghakiman atau perintah", note: "60 hari apabila Amerika Syarikat menjadi pihak (Rule 4(a)(1)(B))." },
    "gb-aos": { name: "Akuan penyampaian (acknowledgment of service)", trigger: "Penyampaian butiran tuntutan", note: "" },
    "gb-defence": { name: "Pembelaan (akuan telah difailkan)", trigger: "Penyampaian butiran tuntutan", note: "" },
    "gb-appeal": { name: "Notis perayu (appellant's notice)", trigger: "Tarikh keputusan", note: "Melainkan mahkamah rendah menetapkan tempoh lain." },
    "gb-limitation-contract": { name: "Had masa — kontrak biasa / tort", trigger: "Kausa tindakan terakru", note: "" },
    "gb-limitation-pi": { name: "Had masa — kecederaan diri", trigger: "Terakru atau tarikh pengetahuan", note: "" },
    "sg-limitation": { name: "Had masa — kontrak / tort", trigger: "Kausa tindakan terakru", note: "" },
    "eu-gdpr-breach": { name: "Pemberitahuan pelanggaran GDPR kepada pihak berkuasa", trigger: "Pengawal mengetahui pelanggaran", note: "" },
    "eu-gdpr-dsar": { name: "Permintaan subjek data GDPR", trigger: "Penerimaan permintaan", note: "Boleh dilanjutkan dua bulan lagi bagi permintaan yang kompleks." },
    "eu-nis2-warning": { name: "Amaran awal NIS2 bagi insiden ketara", trigger: "Mengetahui insiden", note: "" },
  },
};
export default c;
