/* i18n for the member Apps page (app/app/apps) — the four headline features of
 * each cloud app, in all 10 portal languages. English comes from lib/apps.ts,
 * so the public /apps pages and this list can never drift apart.
 * Keys and array shapes must match `en` exactly (tests/i18n-pages.test.ts). */
import type { Lang } from "../i18n-shared";
import { CLOUD_APPS } from "../apps";

/** [title, description] */
type Feat = [string, string];
type Feats = Record<string, Feat[]>;

const en: Feats = Object.fromEntries(CLOUD_APPS.map((a) => [a.slug, a.features.slice(0, 4).map((f): Feat => [f.title, f.desc])]));

export const APP_FEATURES: Record<Lang, Feats> = {
  en,
  id: {
    legal: [
      ["200+ yurisdiksi, hingga tingkat provinsi", "Setiap negara plus hukum Uni Eropa dan internasional; negara bagian, provinsi dan kekhususan daerah (Aceh, Québec, Skotlandia, DIFC, Louisiana…) hingga kota atau kabupaten Anda."],
      ["Case Builder", "Unggah berkas perkara dan dapatkan para pihak, kronologi bersumber, isu hukum, hukum yang berlaku dari konstitusi ke bawah, analisis unsur demi unsur, celah bukti, tenggat dan strategi."],
      ["36 workspace ahli", "Memo riset, telaah & penyusunan kontrak, due diligence, gugatan, arbitrase, analisis pidana, kepatuhan, privasi, APU-PPT, ketenagakerjaan, HKI, pajak, ESG, tata kelola AI dan lainnya."],
      ["Redline, playbook, klausa, tenggat & sitasi", "Di perangkat Anda: bandingkan versi kontrak kata demi kata, periksa terhadap playbook Anda, isi templat klausa, hitung tenggat dengan hari libur (ekspor .ics), verifikasi setiap sitasi, dan cari di seluruh dokumen perkara."],
    ],
    prompts: [
      ["240 prompt, 24 bidang, 4 level", "Sepuluh prompt ahli per bidang, dari tugas harian Basic hingga pekerjaan Elite setingkat direksi dan lintas negara — masing-masing dengan variabel isian yang jelas."],
      ["Jalankan dan bandingkan di tempat", "Hasil streaming dari model Anda sendiri, pertanyaan lanjutan, dan prompt yang sama di hingga tiga model berdampingan."],
      ["Prompt milik Anda dan optimizer", "Tulis prompt dengan {{variables}}, simpan di koleksi dan favorit, dan biarkan AI mengoptimalkannya."],
      ["Workflow dan profil", "Rangkai langkah sehingga tiap langkah memakai hasil sebelumnya, dan simpan profil variabel yang mengisi prompt otomatis; ekspor atau impor semuanya sebagai JSON."],
    ],
    studio: [
      ["Semua model terbaik, berdampingan", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity dan lainnya — atau endpoint Anda sendiri — dan satu pesan ke hingga tiga model sekaligus."],
      ["File, gambar dan suara", "Lampirkan PDF, file Word, kode dan gambar (dibaca di perangkat Anda), tempel atau seret, atau dikte dengan suara."],
      ["Kode dan artefak langsung", "Kode ber-highlight dengan salin dan unduh; jawaban HTML, SVG dan Mermaid tampil di pratinjau yang terisolasi."],
      ["Asisten milik Anda", "Persona tersimpan dengan instruksi dan kreativitasnya sendiri, plus template untuk engineering, pemasaran, kontrak, data, tutor dan terjemahan."],
    ],
    clipper: [
      ["Skor viral dengan empat sub-skor", "Setiap momen dinilai dari hook, alur, nilai dan tren, lengkap dengan alasan, judul penghenti scroll, caption dan hashtag."],
      ["8 gaya caption animasi", "Bold Pop, Karaoke, Highlight Box, Neon, Typewriter, Emoji dan lainnya — kata demi kata dari timing presisi, dengan font dan warna Anda."],
      ["Auto-reframe dengan pelacakan wajah", "Pelacakan wajah di perangkat menjaga pembicara tetap di bingkai untuk 9:16, 4:5, 1:1 atau 16:9 — plus layar terbagi untuk dua pembicara dan mode utuh dengan latar blur."],
      ["Privat sejak awal", "Video tidak pernah keluar dari perangkat Anda; hanya trek suara terkompresi yang dikirim ke penyedia transkripsi milik Anda."],
    ],
    vault: [
      ["65 jenis data, dengan skor", "Email, telepon, kartu dan IBAN (divalidasi checksum), rahasia dan kunci API, serta identitas resmi dari 19 negara — masing-masing dengan skor keyakinan dari validasi dan kata kunci di sekitarnya."],
      ["Redaksi sejati untuk berkas", "Word dan Excel diredaksi langsung di tempat; PDF dibangun ulang sebagai gambar dengan kotak hitam sehingga tidak ada yang bisa disalin kembali; pindaian dan foto dibaca dengan OCR di perangkat."],
      ["AI Aman", "Tanyakan AI Anda sendiri tentang teks yang sudah diredaksi — AI hanya melihat placeholder, dan browser Anda mengembalikan data asli ke dalam jawaban."],
      ["Berjalan di perangkat Anda", "Deteksi, OCR, dan redaksi berlangsung di browser Anda. Hanya versi yang sudah diredaksi yang pernah dikirim atau disimpan."],
    ],
    compliance: [
      ["342 kontrol nyata, 7 framework", "ISO/IEC 27001:2022 Annex A (93), SOC 2 TSC, NIST CSF 2.0 (22 kategori), PCI DSS v4.0.1, HIPAA Security Rule, GDPR dan UU PDP — dengan status, pemilik, tenggat, catatan dan justifikasi N/A."],
      ["Bukti dan pemetaan lintas framework", "Lampirkan file bukti yang disimpan terenkripsi di akun Anda; kontrol dipetakan antar-framework sehingga pekerjaan yang selesai bisa disalin ke kontrol setara untuk ditinjau."],
      ["Risiko, kebijakan dan vendor", "Risk register dengan heatmap 5×5 inheren / residual, 26 templat kebijakan dengan draf AI, versi dan persetujuan, serta kuesioner vendor berbobot dengan tier risiko."],
      ["Laporan kesiapan dan ekspor", "Kesiapan per framework dan domain, kontrol yang lewat tenggat, laporan kesiapan (Markdown, Word, PDF), Statement of Applicability ISO 27001, serta ekspor CSV / JSON."],
    ],
    security: [
      ["Analitik log di perangkat Anda", "Sembilan format log di-parse di browser menjadi satu tabel event dengan linimasa, host, pengguna dan sumber teratas, filter tingkat keparahan, dan deteksi brute force."],
      ["Matriks MITRE ATT&CK", "46 rule perilaku memetakan aktivitas ke 14 taktik dan 130+ teknik; tambahkan temuan Anda sendiri, plus teknik yang disebut AI Anda."],
      ["IOC dan analisis phishing", "IP, domain, URL, hash dan e-mail diekstrak dan di-defang, dengan putusan dan tautan cek; analisis .eml memeriksa SPF, DKIM, DMARC, tautan dan lampiran."],
      ["Laporan dan rule deteksi", "Laporan insiden (Markdown, Word, PDF), bundle STIX 2.1, blocklist, serta rule Sigma, KQL, SPL, YARA dan Suricata yang dibuat dari kasus."],
    ],
  },
  ms: {
    legal: [
      ["200+ bidang kuasa, hingga peringkat wilayah", "Setiap negara serta undang-undang EU dan antarabangsa; negeri, wilayah dan rejim khas (Aceh, Québec, Scotland, DIFC, Louisiana…) hingga bandar atau daerah anda."],
      ["Case Builder", "Muat naik fail kes dan dapatkan pihak-pihak, kronologi bersumber, isu undang-undang, undang-undang terpakai dari perlembagaan ke bawah, analisis elemen demi elemen, jurang bukti, tarikh akhir dan strategi."],
      ["36 ruang kerja pakar", "Memo penyelidikan, semakan & perangkaan kontrak, usaha wajar, pliding, timbang tara, analisis jenayah, pematuhan, privasi, AML, pekerjaan, IP, cukai, ESG, tadbir urus AI dan banyak lagi."],
      ["Redline, playbook, klausa, tarikh akhir & petikan", "Pada peranti anda: bandingkan versi kontrak perkataan demi perkataan, semak berbanding playbook anda, isi templat klausa, kira tarikh akhir dengan cuti umum (eksport .ics), sahkan setiap petikan dan cari merentas dokumen perkara."],
    ],
    prompts: [
      ["240 prom, 24 bidang, 4 tahap", "Sepuluh prom pakar setiap bidang, daripada tugas harian Basic hingga kerja Elite peringkat lembaga dan pelbagai negara — setiap satu dengan pemboleh ubah isian yang jelas."],
      ["Jalankan dan bandingkan di tempat", "Hasil penstriman daripada model anda sendiri, soalan susulan, dan prom yang sama pada sehingga tiga model bersebelahan."],
      ["Prom anda sendiri dan pengoptimum", "Tulis prom dengan {{variables}}, simpan dalam koleksi dan kegemaran, dan biar AI mengoptimumkannya."],
      ["Aliran kerja dan profil", "Rantaikan langkah supaya setiap satu dibina atas hasil sebelumnya, dan simpan profil pemboleh ubah yang mengisi prom secara automatik; eksport atau import semuanya sebagai JSON."],
    ],
    studio: [
      ["Setiap model terkemuka, bersebelahan", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity dan lagi — atau endpoint anda sendiri — dan satu mesej kepada sehingga tiga model serentak."],
      ["Fail, imej dan suara", "Lampirkan PDF, fail Word, kod dan imej (dibaca pada peranti anda), tampal atau seret, atau imlak dengan suara."],
      ["Kod dan artifak secara langsung", "Kod berwarna dengan salin dan muat turun; jawapan HTML, SVG dan Mermaid dipaparkan dalam pratonton terasing."],
      ["Pembantu anda sendiri", "Persona tersimpan dengan arahan dan kreativiti tersendiri, serta templat untuk kejuruteraan, pemasaran, kontrak, data, tunjuk ajar dan terjemahan."],
    ],
    clipper: [
      ["Skor tular dengan empat sub-skor", "Setiap detik dinilai dari cangkuk, aliran, nilai dan trend, berserta sebab, tajuk yang menghentikan tatalan, kapsyen dan tanda pagar."],
      ["8 gaya kapsyen beranimasi", "Bold Pop, Karaoke, Highlight Box, Neon, Typewriter, Emoji dan lagi — perkataan demi perkataan daripada masa yang tepat, dengan fon dan warna anda."],
      ["Auto-reframe dengan penjejakan wajah", "Penjejakan wajah pada peranti memastikan penutur kekal dalam bingkai untuk 9:16, 4:5, 1:1 atau 16:9 — serta skrin pisah untuk dua penutur dan mod muat dengan latar kabur."],
      ["Privasi sejak awal", "Video tidak pernah meninggalkan peranti anda; hanya trek suara termampat dihantar kepada penyedia transkripsi anda sendiri."],
    ],
    vault: [
      ["65 jenis data, berskor", "E-mel, telefon, kad dan IBAN (disahkan checksum), rahsia dan kunci API, serta ID kebangsaan dari 19 negara — setiap satu dengan skor keyakinan daripada pengesahan dan kata kunci berdekatan."],
      ["Redaksi sebenar untuk fail", "Word dan Excel diredaksi di tempatnya; PDF dibina semula sebagai imej dengan kotak hitam supaya tiada apa boleh disalin semula; imbasan dan foto dibaca dengan OCR pada peranti."],
      ["AI Selamat", "Tanya AI anda sendiri tentang teks yang diredaksi — ia hanya melihat pemegang tempat, dan pelayar anda memulihkan data asal dalam jawapan."],
      ["Berjalan pada peranti anda", "Pengesanan, OCR dan redaksi berlaku dalam pelayar anda. Hanya versi yang diredaksi pernah dihantar atau disimpan."],
    ],
    compliance: [
      ["342 kawalan sebenar, 7 rangka kerja", "ISO/IEC 27001:2022 Annex A (93), SOC 2 TSC, NIST CSF 2.0 (22 kategori), PCI DSS v4.0.1, HIPAA Security Rule, GDPR dan UU PDP — dengan status, pemilik, tarikh akhir, nota dan justifikasi N/A."],
      ["Bukti dan pemetaan rentas rangka kerja", "Lampirkan fail bukti yang disimpan tersulit dalam akaun anda; kawalan dipetakan merentas rangka kerja supaya kerja yang siap boleh disalin ke kawalan setara untuk semakan."],
      ["Risiko, dasar dan vendor", "Daftar risiko dengan peta haba 5×5 inheren / baki, 26 templat dasar dengan draf AI, versi dan kelulusan, serta soal selidik vendor berpemberat dengan tahap risiko."],
      ["Laporan kesediaan dan eksport", "Kesediaan setiap rangka kerja dan domain, kawalan tertunggak, laporan kesediaan (Markdown, Word, PDF), Statement of Applicability ISO 27001, dan eksport CSV / JSON."],
    ],
    security: [
      ["Analitik log pada peranti anda", "Sembilan format log dihurai dalam pelayar menjadi satu jadual peristiwa dengan garis masa, hos, pengguna dan sumber teratas, penapis keterukan dan pengesanan brute force."],
      ["Matriks MITRE ATT&CK", "46 peraturan tingkah laku memetakan aktiviti kepada 14 taktik dan 130+ teknik; tambah dapatan anda sendiri, serta teknik yang dinamakan oleh AI anda."],
      ["IOC dan analisis phishing", "IP, domain, URL, cincangan dan e-mel diekstrak dan di-defang, dengan keputusan dan semakan; analisis .eml menyemak SPF, DKIM, DMARC, pautan dan lampiran."],
      ["Laporan dan peraturan pengesanan", "Laporan insiden (Markdown, Word, PDF), bundle STIX 2.1, senarai sekatan serta peraturan Sigma, KQL, SPL, YARA dan Suricata yang dijana daripada kes."],
    ],
  },
  de: {
    legal: [
      ["200+ Rechtsordnungen, bis zur Provinz", "Jedes Land plus EU- und Völkerrecht; Bundesstaaten, Provinzen und Sonderregime (Aceh, Québec, Schottland, DIFC, Louisiana…) bis hin zu Ihrer Stadt oder Ihrem Landkreis."],
      ["Case Builder", "Laden Sie eine Fallakte hoch und erhalten Sie Parteien, eine belegte Chronologie, Rechtsfragen, das anwendbare Recht von der Verfassung abwärts, eine Prüfung Tatbestandsmerkmal für Tatbestandsmerkmal, Beweislücken, Fristen und eine Strategie."],
      ["36 Experten-Workspaces", "Rechercheberichte, Vertragsprüfung & -entwurf, Due Diligence, Schriftsätze, Schiedsverfahren, Strafrechtsanalyse, Compliance, Datenschutz, Geldwäsche, Arbeitsrecht, IP, Steuern, ESG, AI Governance und mehr."],
      ["Redline, Playbook, Klauseln, Fristen & Zitate", "Auf Ihrem Gerät: Vertragsfassungen Wort für Wort vergleichen, gegen Ihr Playbook prüfen, Klauselvorlagen ausfüllen, Fristen mit Feiertagen berechnen (.ics-Export), jedes Zitat prüfen und alle Dokumente der Akte durchsuchen."],
    ],
    prompts: [
      ["240 Prompts, 24 Bereiche, 4 Stufen", "Zehn Experten-Prompts pro Bereich, von Basic-Alltagsaufgaben bis zu Elite-Arbeit auf Vorstands- und Länderebene — jeweils mit klaren Ausfüllvariablen."],
      ["Direkt ausführen und vergleichen", "Ergebnisse Ihres eigenen Modells streamen, nachfragen und denselben Prompt auf bis zu drei Modellen nebeneinander ausführen."],
      ["Eigene Prompts und Optimierer", "Prompts mit {{variables}} schreiben, in Sammlungen und Favoriten ablegen und von der KI optimieren lassen."],
      ["Workflows und Profile", "Schritte verketten, die auf dem vorherigen Ergebnis aufbauen, und Variablenprofile speichern, die Prompts automatisch ausfüllen; alles als JSON exportieren oder importieren."],
    ],
    studio: [
      ["Alle führenden Modelle, nebeneinander", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity und mehr — oder Ihr eigener Endpunkt — und eine Nachricht an bis zu drei Modelle gleichzeitig."],
      ["Dateien, Bilder und Sprache", "Hängen Sie PDFs, Word-Dateien, Code und Bilder an (auf Ihrem Gerät gelesen), fügen Sie sie ein oder ziehen Sie sie hinein, oder diktieren Sie."],
      ["Live-Code und Artefakte", "Hervorgehobener Code zum Kopieren und Herunterladen; HTML-, SVG- und Mermaid-Antworten erscheinen in einer isolierten Vorschau."],
      ["Eigene Assistenten", "Gespeicherte Personas mit eigenen Anweisungen und Kreativität, dazu Vorlagen für Entwicklung, Marketing, Verträge, Daten, Nachhilfe und Übersetzung."],
    ],
    clipper: [
      ["Viralitäts-Score mit vier Teilwerten", "Jeder Moment wird nach Hook, Fluss, Nutzen und Trend bewertet — mit Begründung, einem Titel, der das Scrollen stoppt, Beitragstext und Hashtags."],
      ["8 animierte Untertitelstile", "Bold Pop, Karaoke, Highlight Box, Neon, Typewriter, Emoji und mehr — Wort für Wort nach exakten Zeitmarken, in Ihren Schriften und Farben."],
      ["Auto-Reframe mit Gesichtsverfolgung", "Gesichtsverfolgung auf dem Gerät hält den Sprecher im Bild für 9:16, 4:5, 1:1 oder 16:9 — plus Splitscreen für zwei Sprecher und Einpassen mit unscharfem Hintergrund."],
      ["Privat von Grund auf", "Das Video verlässt Ihr Gerät nie; nur eine komprimierte Sprachspur geht an Ihren eigenen Transkriptionsanbieter."],
    ],
    vault: [
      ["65 Datentypen mit Bewertung", "E-Mails, Telefonnummern, Karten und IBANs (prüfsummenvalidiert), Geheimnisse und API-Schlüssel sowie amtliche Kennungen aus 19 Ländern — jeweils mit einem Sicherheitswert aus Validierung und Schlüsselwörtern im Umfeld."],
      ["Echte Schwärzung für Dateien", "Word und Excel werden direkt geschwärzt; PDFs werden als Bilder mit schwarzen Balken neu aufgebaut, sodass nichts zurückkopiert werden kann; Scans und Fotos werden per OCR auf dem Gerät gelesen."],
      ["Sichere KI", "Fragen Sie Ihre eigene KI zum geschwärzten Text — sie sieht nur Platzhalter, und Ihr Browser setzt die Originale in die Antwort wieder ein."],
      ["Läuft auf Ihrem Gerät", "Erkennung, OCR und Schwärzung geschehen in Ihrem Browser. Gesendet oder gespeichert wird immer nur die geschwärzte Fassung."],
    ],
    compliance: [
      ["342 echte Controls, 7 Frameworks", "ISO/IEC 27001:2022 Anhang A (93), SOC 2 TSC, NIST CSF 2.0 (22 Kategorien), PCI DSS v4.0.1, HIPAA Security Rule, DSGVO und UU PDP — mit Status, Verantwortlichem, Fälligkeit, Notizen und N/A-Begründung."],
      ["Nachweise und Framework-Mapping", "Nachweisdateien anhängen, verschlüsselt in Ihrem Konto gespeichert; Controls sind frameworkübergreifend gemappt, sodass erledigte Arbeit zur Prüfung auf Entsprechungen übertragen werden kann."],
      ["Risiken, Richtlinien und Lieferanten", "Risikoregister mit 5×5-Heatmap (inhärent / residual), 26 Richtlinienvorlagen mit KI-Entwürfen, Versionen und Freigaben sowie ein gewichteter Lieferantenfragebogen mit Risikostufen."],
      ["Reifeberichte und Exporte", "Reifegrad je Framework und Domäne, überfällige Controls, ein Reifebericht (Markdown, Word, PDF), eine ISO-27001-Anwendbarkeitserklärung (SoA) sowie CSV- / JSON-Exporte."],
    ],
    security: [
      ["Log-Analyse auf Ihrem Gerät", "Neun Log-Formate werden im Browser zu einer Ereignistabelle mit Zeitachse, Top-Hosts, -Benutzern und -Quellen, Schweregradfiltern und Brute-Force-Erkennung verarbeitet."],
      ["MITRE-ATT&CK-Matrix", "46 Verhaltensregeln ordnen Aktivitäten 14 Taktiken und über 130 Techniken zu; ergänzen Sie eigene Befunde sowie die Techniken, die Ihre KI nennt."],
      ["IOCs und Phishing-Analyse", "IPs, Domains, URLs, Hashes und E-Mail-Adressen werden extrahiert und entschärft, mit Bewertungen und Nachschlagen; die .eml-Analyse prüft SPF, DKIM, DMARC, Links und Anhänge."],
      ["Berichte und Erkennungsregeln", "Vorfallbericht (Markdown, Word, PDF), STIX-2.1-Bundle, Sperrlisten sowie Sigma-, KQL-, SPL-, YARA- und Suricata-Regeln aus dem Fall."],
    ],
  },
  fr: {
    legal: [
      ["200+ juridictions, jusqu'à la province", "Chaque pays plus le droit européen et international ; États, provinces et régimes spéciaux (Aceh, Québec, Écosse, DIFC, Louisiane…) jusqu'à votre ville ou district."],
      ["Case Builder", "Téléversez un dossier et obtenez les parties, une chronologie sourcée, les questions juridiques, le droit applicable depuis la constitution, une analyse élément par élément, les lacunes de preuve, les délais et une stratégie."],
      ["36 espaces experts", "Notes de recherche, revue et rédaction de contrats, due diligence, actes de procédure, arbitrage, analyse pénale, conformité, vie privée, LCB-FT, droit du travail, PI, fiscalité, ESG, gouvernance de l'IA et plus."],
      ["Comparaison, playbook, clauses, délais et citations", "Sur votre appareil : comparez les versions d'un contrat mot à mot, vérifiez-les par rapport à votre playbook, remplissez des modèles de clauses, calculez les délais avec les jours fériés (export .ics), vérifiez chaque citation et cherchez dans tous les documents du dossier."],
    ],
    prompts: [
      ["240 prompts, 24 domaines, 4 niveaux", "Dix prompts experts par domaine, des tâches Basic du quotidien au travail Elite de niveau direction et multi-pays — chacun avec des variables claires à compléter."],
      ["Exécuter et comparer sur place", "Résultats en streaming depuis votre propre modèle, questions de suivi, et le même prompt sur jusqu’à trois modèles côte à côte."],
      ["Vos prompts et l’optimiseur", "Écrivez des prompts avec des {{variables}}, rangez-les en collections et favoris, et laissez l’IA les optimiser."],
      ["Workflows et profils", "Enchaînez des étapes qui s’appuient sur le résultat précédent et enregistrez des profils de variables qui remplissent les prompts automatiquement ; exportez ou importez tout en JSON."],
    ],
    studio: [
      ["Tous les grands modèles, côte à côte", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity et plus — ou votre propre endpoint — et un message à jusqu'à trois modèles à la fois."],
      ["Fichiers, images et voix", "Joignez des PDF, fichiers Word, code et images (lus sur votre appareil), collez-les ou glissez-les, ou dictez à la voix."],
      ["Code et artefacts en direct", "Code coloré avec copie et téléchargement ; les réponses HTML, SVG et Mermaid s'affichent dans un aperçu isolé."],
      ["Vos propres assistants", "Des personas enregistrés avec leurs instructions et leur créativité, plus des modèles pour l'ingénierie, le marketing, les contrats, les données, le tutorat et la traduction."],
    ],
    clipper: [
      ["Score de viralité avec quatre sous-scores", "Chaque moment est noté pour l'accroche, la fluidité, la valeur et la tendance, avec la raison, un titre qui arrête le défilement, une légende et des hashtags."],
      ["8 styles de sous-titres animés", "Bold Pop, Karaoké, Highlight Box, Néon, Typewriter, Emoji et plus — mot à mot à partir de minutages précis, avec vos polices et couleurs."],
      ["Recadrage auto avec suivi du visage", "Le suivi du visage sur l'appareil garde l'intervenant dans le cadre en 9:16, 4:5, 1:1 ou 16:9 — plus l'écran scindé pour deux intervenants et l'ajustement sur fond flouté."],
      ["Privé par conception", "La vidéo ne quitte jamais votre appareil ; seule une piste vocale compressée est envoyée à votre propre fournisseur de transcription."],
    ],
    vault: [
      ["65 types de données, notés", "E-mails, téléphones, cartes et IBAN (validés par somme de contrôle), secrets et clés d'API, et identifiants officiels de 19 pays — chacun avec un score de confiance issu de la validation et des mots-clés voisins."],
      ["Un vrai masquage des fichiers", "Word et Excel sont masqués sur place ; les PDF sont reconstruits en images avec des bandes noires pour que rien ne puisse être recopié ; scans et photos sont lus par OCR sur l'appareil."],
      ["IA sécurisée", "Interrogez votre propre IA sur le texte masqué — elle ne voit que des espaces réservés, et votre navigateur remet les originaux dans la réponse."],
      ["Fonctionne sur votre appareil", "Détection, OCR et masquage se font dans votre navigateur. Seule la version masquée est jamais envoyée ou enregistrée."],
    ],
    compliance: [
      ["342 contrôles réels, 7 référentiels", "ISO/IEC 27001:2022 Annexe A (93), SOC 2 TSC, NIST CSF 2.0 (22 catégories), PCI DSS v4.0.1, HIPAA Security Rule, RGPD et UU PDP — avec statut, responsable, échéance, notes et justification de non-applicabilité."],
      ["Preuves et correspondances entre référentiels", "Joignez des preuves stockées chiffrées dans votre compte ; les contrôles sont reliés entre référentiels pour reporter le travail fait vers leurs équivalents, à revoir."],
      ["Risques, politiques et fournisseurs", "Registre des risques avec carte de chaleur 5×5 inhérente / résiduelle, 26 modèles de politiques avec brouillons IA, versions et approbations, et questionnaire fournisseur pondéré avec niveaux de risque."],
      ["Rapports de maturité et exports", "Maturité par référentiel et domaine, contrôles en retard, rapport de maturité (Markdown, Word, PDF), Déclaration d’applicabilité ISO 27001 et exports CSV / JSON."],
    ],
    security: [
      ["Analyse de logs sur votre appareil", "Neuf formats de logs analysés dans le navigateur en une seule table d’événements avec chronologie, principaux hôtes, utilisateurs et sources, filtres de gravité et détection de force brute."],
      ["Matrice MITRE ATT&CK", "46 règles comportementales relient l’activité à 14 tactiques et plus de 130 techniques ; ajoutez vos propres constats et les techniques citées par votre IA."],
      ["IOC et analyse de phishing", "IP, domaines, URL, empreintes et e-mails extraits et neutralisés, avec verdicts et recherches ; l’analyse .eml vérifie SPF, DKIM, DMARC, liens et pièces jointes."],
      ["Rapports et règles de détection", "Rapport d’incident (Markdown, Word, PDF), bundle STIX 2.1, listes de blocage et règles Sigma, KQL, SPL, YARA et Suricata générées à partir du dossier."],
    ],
  },
  it: {
    legal: [
      ["200+ giurisdizioni, fino alla provincia", "Ogni paese più il diritto UE e internazionale; stati, province e regimi speciali (Aceh, Québec, Scozia, DIFC, Louisiana…) fino alla tua città o distretto."],
      ["Case Builder", "Carica un fascicolo e ottieni parti, una cronologia con fonti, questioni giuridiche, il diritto applicabile dalla costituzione in giù, un'analisi elemento per elemento, lacune probatorie, scadenze e strategia."],
      ["36 workspace esperti", "Memo di ricerca, revisione e redazione di contratti, due diligence, atti processuali, arbitrato, analisi penale, compliance, privacy, antiriciclaggio, lavoro, PI, fisco, ESG, governance dell'IA e altro."],
      ["Confronto, playbook, clausole, scadenze e citazioni", "Sul tuo dispositivo: confronta le versioni di un contratto parola per parola, verificale rispetto al tuo playbook, compila modelli di clausole, calcola le scadenze con le festività (export .ics), verifica ogni citazione e cerca in tutti i documenti della pratica."],
    ],
    prompts: [
      ["240 prompt, 24 settori, 4 livelli", "Dieci prompt esperti per settore, dalle attività quotidiane Basic al lavoro Elite da consiglio di amministrazione e multi-paese — ognuno con variabili chiare da compilare."],
      ["Esegui e confronta sul posto", "Risultati in streaming dal tuo modello, domande di approfondimento e lo stesso prompt su un massimo di tre modelli affiancati."],
      ["I tuoi prompt e l’ottimizzatore", "Scrivi prompt con {{variables}}, organizzali in raccolte e preferiti e lascia che l’IA li ottimizzi."],
      ["Workflow e profili", "Concatena passaggi che partono dal risultato precedente e salva profili di variabili che compilano i prompt automaticamente; esporta o importa tutto in JSON."],
    ],
    studio: [
      ["Tutti i principali modelli, affiancati", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity e altri — o il tuo endpoint — e un messaggio fino a tre modelli contemporaneamente."],
      ["File, immagini e voce", "Allega PDF, file Word, codice e immagini (letti sul tuo dispositivo), incollali o trascinali, oppure detta a voce."],
      ["Codice e artefatti dal vivo", "Codice evidenziato con copia e download; le risposte HTML, SVG e Mermaid appaiono in un'anteprima isolata."],
      ["I tuoi assistenti", "Persona salvate con istruzioni e creatività proprie, più modelli per sviluppo, marketing, contratti, dati, tutoraggio e traduzione."],
    ],
    clipper: [
      ["Punteggio di viralità con quattro sotto-punteggi", "Ogni momento è valutato per gancio, flusso, valore e tendenza, con il motivo, un titolo che ferma lo scroll, una didascalia e gli hashtag."],
      ["8 stili di sottotitoli animati", "Bold Pop, Karaoke, Highlight Box, Neon, Typewriter, Emoji e altri — parola per parola da tempi precisi, con i tuoi font e colori."],
      ["Auto-reframe con tracciamento del volto", "Il tracciamento del volto sul dispositivo tiene l'oratore nell'inquadratura in 9:16, 4:5, 1:1 o 16:9 — più lo schermo diviso per due oratori e l'adattamento con sfondo sfocato."],
      ["Privato per progettazione", "Il video non lascia mai il tuo dispositivo; solo una traccia vocale compressa va al tuo fornitore di trascrizione."],
    ],
    vault: [
      ["65 tipi di dati, con punteggio", "E-mail, telefoni, carte e IBAN (convalidati con checksum), segreti e chiavi API e documenti ufficiali di 19 paesi — ciascuno con un punteggio di affidabilità da convalida e parole chiave vicine."],
      ["Vero oscuramento dei file", "Word ed Excel vengono oscurati sul posto; i PDF vengono ricostruiti come immagini con riquadri neri, così nulla può essere ricopiato; scansioni e foto vengono lette con OCR sul dispositivo."],
      ["IA sicura", "Chiedi alla tua IA del testo oscurato — vede solo segnaposto, e il tuo browser rimette gli originali nella risposta."],
      ["Funziona sul tuo dispositivo", "Rilevamento, OCR e oscuramento avvengono nel tuo browser. Viene inviata o salvata solo la versione oscurata."],
    ],
    compliance: [
      ["342 controlli reali, 7 framework", "ISO/IEC 27001:2022 Allegato A (93), SOC 2 TSC, NIST CSF 2.0 (22 categorie), PCI DSS v4.0.1, HIPAA Security Rule, GDPR e UU PDP — con stato, responsabile, scadenza, note e giustificazione di non applicabilità."],
      ["Evidenze e mappatura tra framework", "Allega file di evidenza salvati cifrati nel tuo account; i controlli sono mappati tra framework per copiare il lavoro fatto sui controlli equivalenti, da rivedere."],
      ["Rischi, policy e fornitori", "Registro dei rischi con heat map 5×5 inerente / residua, 26 modelli di policy con bozze IA, versioni e approvazioni, e questionario fornitori pesato con livelli di rischio."],
      ["Report di readiness ed esportazioni", "Readiness per framework e dominio, controlli scaduti, report di readiness (Markdown, Word, PDF), Dichiarazione di Applicabilità ISO 27001 ed esportazioni CSV / JSON."],
    ],
    security: [
      ["Analisi dei log sul tuo dispositivo", "Nove formati di log elaborati nel browser in un’unica tabella di eventi con cronologia, host, utenti e sorgenti principali, filtri di gravità e rilevamento brute force."],
      ["Matrice MITRE ATT&CK", "46 regole comportamentali collegano l’attività a 14 tattiche e oltre 130 tecniche; aggiungi i tuoi rilievi e le tecniche indicate dalla tua IA."],
      ["IOC e analisi del phishing", "IP, domini, URL, hash ed e-mail estratti e disinnescati, con verdetti e verifiche; l’analisi .eml controlla SPF, DKIM, DMARC, link e allegati."],
      ["Report e regole di rilevamento", "Report d’incidente (Markdown, Word, PDF), bundle STIX 2.1, blocklist e regole Sigma, KQL, SPL, YARA e Suricata generate dal caso."],
    ],
  },
  zh: {
    legal: [
      ["200+ 司法辖区，细至省级", "覆盖每个国家以及欧盟法和国际法；州、省及特别制度（亚齐、魁北克、苏格兰、DIFC、路易斯安那……），直至您所在的城市或县。"],
      ["Case Builder", "上传案卷，即可获得当事人、附来源的时间线、法律争点、从宪法到下位法的适用法律、逐要件分析、证据缺口、期限与策略。"],
      ["36 个专家工作区", "研究备忘录、合同审查与起草、尽职调查、诉状、仲裁、刑事分析、合规、隐私、反洗钱、劳动、知识产权、税务、ESG、AI 治理等。"],
      ["修订对比、Playbook、条款、期限与引用", "在您的设备上：逐词比较合同版本，按您的 Playbook 审查，填写条款模板，按公众假期计算期限（导出 .ics），核实每条引用，并在案件的全部文件中搜索。"],
    ],
    prompts: [
      ["240 个提示词，24 个领域，4 个级别", "每个领域 10 个专家提示词，从 Basic 日常任务到 Elite 董事会级与跨国工作——每个都有清晰的填空变量。"],
      ["就地运行与对比", "用您自己的模型流式生成结果、继续追问，并在最多三个模型上并排运行同一提示词。"],
      ["自有提示词与优化器", "用 {{variables}} 编写提示词，放入合集和收藏，并让 AI 优化它们。"],
      ["工作流与变量档案", "串联多个步骤，每一步基于上一步的输出；保存可自动填充提示词的变量档案；以 JSON 导出或导入全部内容。"],
    ],
    studio: [
      ["所有主流模型，并排对比", "Anthropic、OpenAI、Google Gemini、Groq、OpenRouter、Mistral、DeepSeek、xAI、Perplexity 等——或您自己的端点——一条消息可同时发给最多三个模型。"],
      ["文件、图片与语音", "附加 PDF、Word 文件、代码和图片（在您的设备上读取），粘贴或拖入，或用语音输入。"],
      ["实时代码与作品预览", "代码高亮并可复制下载；HTML、SVG 和 Mermaid 回答在隔离的预览中呈现。"],
      ["您自己的助手", "保存带有专属指令和创造力的角色，并提供工程、营销、合同、数据、辅导和翻译模板。"],
    ],
    clipper: [
      ["带四项子评分的爆款指数", "每个片段都按开场、连贯、价值和热度打分，并附上理由、让人停下滑动的标题、文案和话题标签。"],
      ["8 种动态字幕样式", "Bold Pop、卡拉 OK、高亮框、霓虹、打字机、表情等——基于精确时间逐词显示，使用您的字体和颜色。"],
      ["人脸追踪自动重构画面", "设备端人脸追踪让发言人始终在 9:16、4:5、1:1 或 16:9 画面中——另有双人分屏和模糊背景完整画面。"],
      ["隐私为先", "视频永远不会离开您的设备；只有压缩的语音轨会发送到您自己的转写服务商。"],
    ],
    vault: [
      ["65 种数据类型，带评分", "电子邮件、电话、银行卡和 IBAN（经校验和验证）、机密与 API 密钥，以及 19 个国家的官方证件——每项都有基于校验和上下文关键词的置信度评分。"],
      ["真正的文件脱敏", "Word 和 Excel 原地脱敏；PDF 重建为带黑色遮挡框的图像，任何内容都无法再复制出来；扫描件和照片通过设备端 OCR 识别。"],
      ["安全 AI", "就脱敏后的文本询问您自己的 AI——它只看到占位符，您的浏览器会把原始内容还原到回答中。"],
      ["在您的设备上运行", "检测、OCR 和脱敏都在您的浏览器中完成。发送或保存的永远只是脱敏后的版本。"],
    ],
    compliance: [
      ["342 项真实控制、7 个框架", "ISO/IEC 27001:2022 附录 A（93 项）、SOC 2 TSC、NIST CSF 2.0（22 个类别）、PCI DSS v4.0.1、HIPAA 安全规则、GDPR 和印尼 UU PDP——含状态、负责人、截止日期、备注和不适用理由。"],
      ["证据与跨框架映射", "附加证据文件并加密保存在您的账户中；控制项在框架之间相互映射，已完成的工作可复制到对应控制项供复核。"],
      ["风险、政策与供应商", "带 5×5 固有/剩余风险热图的风险登记册，26 个政策模板（AI 起草、版本与审批），以及带风险分级的加权供应商问卷。"],
      ["就绪报告与导出", "按框架和领域的就绪度、逾期控制项、就绪报告（Markdown、Word、PDF）、ISO 27001 适用性声明，以及 CSV / JSON 导出。"],
    ],
    security: [
      ["在您的设备上分析日志", "在浏览器中将九种日志格式解析为统一的事件表，提供时间线、主要主机/用户/来源、严重程度筛选和暴力破解检测。"],
      ["MITRE ATT&CK 矩阵", "46 条行为规则将活动映射到 14 个战术和 130 多项技术；可添加您自己的结论，以及 AI 提到的技术。"],
      ["IOC 与钓鱼邮件分析", "提取并去活化 IP、域名、URL、哈希和邮箱地址，支持判定与查询；.eml 分析会检查 SPF、DKIM、DMARC、链接和附件。"],
      ["报告与检测规则", "根据案件生成事件报告（Markdown、Word、PDF）、STIX 2.1 数据包、阻止列表，以及 Sigma、KQL、SPL、YARA 和 Suricata 规则。"],
    ],
  },
  ja: {
    legal: [
      ["200 以上の法域、州・県レベルまで", "すべての国に加え EU 法・国際法、州・県・特別制度（アチェ、ケベック、スコットランド、DIFC、ルイジアナ…）から市区町村まで。"],
      ["Case Builder", "事件記録をアップロードすると、当事者、出典付き時系列、法的争点、憲法から下位法令までの適用法、要件ごとの分析、証拠の不足、期限、戦略が得られます。"],
      ["36 の専門ワークスペース", "リサーチメモ、契約書レビュー・作成、デューデリジェンス、訴状、仲裁、刑事分析、コンプライアンス、プライバシー、AML、労働、知財、税務、ESG、AI ガバナンスなど。"],
      ["差分比較・プレイブック・条項・期限・引用", "お使いの端末で：契約の版を語単位で比較し、プレイブックで審査し、条項テンプレートを埋め、祝日を考慮して期限を計算（.ics 出力）し、すべての引用を確認し、案件の全文書を検索できます。"],
    ],
    prompts: [
      ["240 のプロンプト、24 分野、4 レベル", "分野ごとに 10 の専門プロンプト。Basic の日常業務から Elite の取締役会・多国間レベルまで、すべて明確な入力変数付き。"],
      ["その場で実行・比較", "ご自身のモデルでストリーミング実行し、追加質問も可能。同じプロンプトを最大 3 つのモデルで並べて比較できます。"],
      ["マイプロンプトと最適化", "{{variables}} 付きのプロンプトを作成し、コレクションやお気に入りに整理、AI に最適化させられます。"],
      ["ワークフローとプロフィール", "前のステップの出力を次に渡すステップをつなぎ、プロンプトを自動入力する変数プロフィールを保存。すべて JSON で入出力できます。"],
    ],
    studio: [
      ["主要モデルを並べて比較", "Anthropic、OpenAI、Google Gemini、Groq、OpenRouter、Mistral、DeepSeek、xAI、Perplexity など、またはご自身のエンドポイント。1 つのメッセージを最大 3 モデルに同時送信できます。"],
      ["ファイル・画像・音声", "PDF、Word、コード、画像を添付（端末上で読み込み）、貼り付けやドラッグ、音声入力にも対応。"],
      ["コードと成果物をその場で", "ハイライト付きコードをコピー・ダウンロード。HTML・SVG・Mermaid の回答は隔離されたプレビューで表示されます。"],
      ["自分だけのアシスタント", "独自の指示と創造性を持つペルソナを保存。エンジニアリング、マーケティング、契約、データ、家庭教師、翻訳のテンプレートも用意。"],
    ],
    clipper: [
      ["4 つの内訳付きバイラルスコア", "各場面をフック・流れ・価値・トレンドで採点し、理由、スクロールを止めるタイトル、キャプション、ハッシュタグを添えます。"],
      ["8 種類のアニメーション字幕", "Bold Pop、カラオケ、ハイライトボックス、ネオン、タイプライター、絵文字など——正確なタイミングで単語ごとに、お好みのフォントと色で。"],
      ["顔追跡による自動リフレーム", "端末上の顔追跡で話者を 9:16・4:5・1:1・16:9 の画面内に保ちます——2 人用の分割画面や、ぼかし背景のフィットも。"],
      ["設計段階からプライベート", "動画は端末から出ません。圧縮した音声トラックだけが、ご自身の文字起こしプロバイダーに送られます。"],
    ],
    vault: [
      ["65 種類のデータをスコア付きで", "メール、電話番号、カードや IBAN（チェックサム検証済み）、シークレットや API キー、19 か国の公的 ID — それぞれ検証結果と周辺キーワードから信頼度スコアを算出します。"],
      ["ファイルの本当の墨消し", "Word と Excel はその場で墨消し。PDF は黒塗りした画像として再構成されるため何もコピーし直せず、スキャンや写真はデバイス上の OCR で読み取ります。"],
      ["セーフ AI", "墨消ししたテキストについて自分の AI に質問できます。AI が見るのはプレースホルダーだけで、ブラウザが回答に元の値を戻します。"],
      ["あなたのデバイスで動作", "検出、OCR、墨消しはブラウザ内で行われます。送信・保存されるのは常に墨消し版だけです。"],
    ],
    compliance: [
      ["342 の実在する管理策、7 フレームワーク", "ISO/IEC 27001:2022 附属書 A（93）、SOC 2 TSC、NIST CSF 2.0（22 カテゴリ）、PCI DSS v4.0.1、HIPAA セキュリティ規則、GDPR、UU PDP — ステータス、担当者、期限、メモ、適用除外の理由付き。"],
      ["証拠とフレームワーク間マッピング", "証拠ファイルを添付し、アカウント内に暗号化して保存。管理策はフレームワーク間で対応付けられ、完了した作業を同等の管理策へコピーしてレビューできます。"],
      ["リスク・ポリシー・ベンダー", "5×5 の固有／残存リスクヒートマップ付きリスク台帳、AI 下書き・版管理・承認付きの 26 のポリシーテンプレート、リスク区分付きの重み付けベンダー質問票。"],
      ["準備状況レポートとエクスポート", "フレームワーク・領域別の準備度、期限超過の管理策、準備状況レポート（Markdown、Word、PDF）、ISO 27001 適用宣言書（SoA）、CSV / JSON エクスポート。"],
    ],
    security: [
      ["デバイス上でのログ分析", "9 種類のログ形式をブラウザ内で 1 つのイベント表に変換。タイムライン、上位ホスト・ユーザー・送信元、重大度フィルター、ブルートフォース検知付き。"],
      ["MITRE ATT&CK マトリクス", "46 の振る舞いルールが活動を 14 の戦術と 130 以上のテクニックに対応付け。独自の所見や AI が挙げたテクニックも追加できます。"],
      ["IOC とフィッシング分析", "IP、ドメイン、URL、ハッシュ、メールアドレスを抽出・無害化し、判定と照会が可能。.eml 分析では SPF、DKIM、DMARC、リンク、添付を確認します。"],
      ["レポートと検知ルール", "ケースからインシデントレポート（Markdown、Word、PDF）、STIX 2.1 バンドル、ブロックリスト、Sigma・KQL・SPL・YARA・Suricata ルールを生成。"],
    ],
  },
  hi: {
    legal: [
      ["200+ क्षेत्राधिकार, प्रांत स्तर तक", "हर देश के साथ EU और अंतरराष्ट्रीय कानून; राज्य, प्रांत और विशेष व्यवस्थाएँ (आचे, क्यूबेक, स्कॉटलैंड, DIFC, लुइज़ियाना…) और आपका शहर या ज़िला।"],
      ["Case Builder", "केस फ़ाइल अपलोड करें और पाएँ पक्षकार, स्रोत-सहित घटनाक्रम, कानूनी मुद्दे, संविधान से नीचे तक लागू कानून, तत्व-दर-तत्व विश्लेषण, साक्ष्य की कमियाँ, समय-सीमाएँ और रणनीति।"],
      ["36 विशेषज्ञ वर्कस्पेस", "रिसर्च मेमो, अनुबंध समीक्षा व ड्राफ़्टिंग, ड्यू डिलिजेंस, याचिकाएँ, मध्यस्थता, आपराधिक विश्लेषण, अनुपालन, गोपनीयता, AML, रोज़गार, IP, कर, ESG, AI गवर्नेंस और बहुत कुछ।"],
      ["रेडलाइन, प्लेबुक, क्लॉज़, समय-सीमाएँ और उद्धरण", "आपके डिवाइस पर: अनुबंध संस्करणों की शब्द-दर-शब्द तुलना करें, अपनी प्लेबुक से जाँचें, क्लॉज़ टेम्पलेट भरें, छुट्टियों सहित समय-सीमा गिनें (.ics निर्यात), हर उद्धरण सत्यापित करें और मामले के सभी दस्तावेज़ों में खोजें।"],
    ],
    prompts: [
      ["240 प्रॉम्प्ट, 24 क्षेत्र, 4 स्तर", "हर क्षेत्र में 10 विशेषज्ञ प्रॉम्प्ट, Basic रोज़मर्रा के कामों से Elite बोर्ड-स्तर और बहु-देशीय काम तक — हर एक में स्पष्ट भरने योग्य वेरिएबल।"],
      ["यहीं चलाएँ और तुलना करें", "अपने मॉडल से स्ट्रीमिंग परिणाम पाएँ, आगे सवाल पूछें, और एक ही प्रॉम्प्ट को तीन मॉडलों तक साथ-साथ चलाएँ।"],
      ["आपके अपने प्रॉम्प्ट और ऑप्टिमाइज़र", "{{variables}} के साथ प्रॉम्प्ट लिखें, संग्रह और पसंदीदा में रखें, और AI से उन्हें बेहतर करवाएँ।"],
      ["वर्कफ़्लो और प्रोफ़ाइल", "चरणों को जोड़ें ताकि हर चरण पिछले परिणाम पर बने, और वेरिएबल प्रोफ़ाइल सहेजें जो प्रॉम्प्ट अपने-आप भरें; सब कुछ JSON में एक्सपोर्ट या इम्पोर्ट करें।"],
    ],
    studio: [
      ["हर प्रमुख मॉडल, साथ-साथ", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity और भी — या आपका अपना एंडपॉइंट — और एक संदेश एक साथ तीन मॉडलों तक।"],
      ["फ़ाइलें, चित्र और आवाज़", "PDF, Word फ़ाइलें, कोड और चित्र जोड़ें (आपके डिवाइस पर पढ़े जाते हैं), पेस्ट करें या खींचकर लाएँ, या बोलकर लिखें।"],
      ["लाइव कोड और आर्टिफ़ैक्ट", "कॉपी और डाउनलोड के साथ हाइलाइट किया गया कोड; HTML, SVG और Mermaid जवाब अलग-थलग प्रीव्यू में दिखते हैं।"],
      ["आपके अपने सहायक", "अपने निर्देशों और रचनात्मकता वाले सहेजे गए पर्सोना, साथ में इंजीनियरिंग, मार्केटिंग, अनुबंध, डेटा, ट्यूशन और अनुवाद के टेम्पलेट।"],
    ],
    clipper: [
      ["चार उप-स्कोर के साथ वायरल स्कोर", "हर पल को हुक, प्रवाह, मूल्य और ट्रेंड पर आँका जाता है — कारण, स्क्रॉल रोकने वाला शीर्षक, कैप्शन और हैशटैग के साथ।"],
      ["8 एनिमेटेड कैप्शन स्टाइल", "Bold Pop, Karaoke, Highlight Box, Neon, Typewriter, Emoji और भी — सटीक समय से शब्द-दर-शब्द, आपके फ़ॉन्ट और रंगों में।"],
      ["चेहरा ट्रैकिंग से ऑटो-रीफ़्रेम", "डिवाइस पर चेहरा ट्रैकिंग वक्ता को 9:16, 4:5, 1:1 या 16:9 फ़्रेम में रखती है — साथ ही दो वक्ताओं के लिए स्प्लिट-स्क्रीन और धुंधली पृष्ठभूमि वाला फ़िट।"],
      ["शुरू से निजी", "वीडियो कभी आपके डिवाइस से बाहर नहीं जाता; केवल संपीड़ित आवाज़ ट्रैक आपके अपने ट्रांसक्रिप्शन प्रदाता को जाता है।"],
    ],
    vault: [
      ["65 डेटा प्रकार, स्कोर के साथ", "ईमेल, फ़ोन, कार्ड और IBAN (चेकसम से सत्यापित), गोपनीय जानकारी और API कुंजियाँ, और 19 देशों की सरकारी पहचान — हर एक के साथ सत्यापन और आसपास के कीवर्ड से भरोसे का स्कोर।"],
      ["फ़ाइलों के लिए असली रिडैक्शन", "Word और Excel वहीं छिपाए जाते हैं; PDF को काले बॉक्स वाली छवियों के रूप में दोबारा बनाया जाता है ताकि कुछ भी वापस कॉपी न हो सके; स्कैन और फ़ोटो डिवाइस पर OCR से पढ़े जाते हैं।"],
      ["सुरक्षित AI", "छिपाए गए टेक्स्ट के बारे में अपने AI से पूछें — उसे केवल प्लेसहोल्डर दिखते हैं, और आपका ब्राउज़र जवाब में मूल मान वापस लगा देता है।"],
      ["आपके डिवाइस पर चलता है", "पहचान, OCR और रिडैक्शन आपके ब्राउज़र में होते हैं। केवल छिपाया गया संस्करण ही भेजा या सहेजा जाता है।"],
    ],
    compliance: [
      ["342 वास्तविक कंट्रोल, 7 फ़्रेमवर्क", "ISO/IEC 27001:2022 Annex A (93), SOC 2 TSC, NIST CSF 2.0 (22 श्रेणियाँ), PCI DSS v4.0.1, HIPAA Security Rule, GDPR और UU PDP — स्थिति, स्वामी, नियत तिथि, नोट्स और N/A औचित्य के साथ।"],
      ["साक्ष्य और फ़्रेमवर्क-पार मैपिंग", "साक्ष्य फ़ाइलें जोड़ें, जो आपके खाते में एन्क्रिप्टेड रहती हैं; कंट्रोल फ़्रेमवर्क के बीच मैप हैं, इसलिए पूरा काम समीक्षा के लिए समकक्ष कंट्रोल में कॉपी किया जा सकता है।"],
      ["जोखिम, नीतियाँ और वेंडर", "5×5 अंतर्निहित / अवशिष्ट हीट मैप वाला जोखिम रजिस्टर, AI ड्राफ़्ट, संस्करण और स्वीकृति वाले 26 नीति टेम्पलेट, और जोखिम स्तर वाली भारित वेंडर प्रश्नावली।"],
      ["तैयारी रिपोर्ट और एक्सपोर्ट", "फ़्रेमवर्क और डोमेन के अनुसार तैयारी, विलंबित कंट्रोल, तैयारी रिपोर्ट (Markdown, Word, PDF), ISO 27001 Statement of Applicability, और CSV / JSON एक्सपोर्ट।"],
    ],
    security: [
      ["आपके डिवाइस पर लॉग एनालिटिक्स", "नौ लॉग फ़ॉर्मैट ब्राउज़र में ही एक इवेंट टेबल में बदले जाते हैं — टाइमलाइन, शीर्ष होस्ट, उपयोगकर्ता और स्रोत, गंभीरता फ़िल्टर और ब्रूट-फ़ोर्स डिटेक्शन के साथ।"],
      ["MITRE ATT&CK मैट्रिक्स", "46 व्यवहार नियम गतिविधि को 14 टैक्टिक्स और 130+ तकनीकों से जोड़ते हैं; अपने निष्कर्ष और आपके AI द्वारा बताई गई तकनीकें भी जोड़ें।"],
      ["IOC और फ़िशिंग विश्लेषण", "IP, डोमेन, URL, हैश और ई-मेल निकाले और डीफ़ैंग किए जाते हैं, निर्णय और जाँच के साथ; .eml विश्लेषण SPF, DKIM, DMARC, लिंक और अटैचमेंट जाँचता है।"],
      ["रिपोर्ट और डिटेक्शन नियम", "केस से घटना रिपोर्ट (Markdown, Word, PDF), STIX 2.1 बंडल, ब्लॉकलिस्ट और Sigma, KQL, SPL, YARA तथा Suricata नियम बनते हैं।"],
    ],
  },
  ar: {
    legal: [
      ["أكثر من 200 ولاية قضائية، حتى مستوى المقاطعة", "كل دولة إضافةً إلى قانون الاتحاد الأوروبي والقانون الدولي؛ الولايات والمقاطعات والأنظمة الخاصة (آتشيه، كيبيك، اسكتلندا، مركز دبي المالي العالمي، لويزيانا…) وصولًا إلى مدينتك أو محافظتك."],
      ["Case Builder", "ارفع ملف القضية واحصل على الأطراف، وتسلسل زمني موثّق المصادر، والمسائل القانونية، والقانون الواجب التطبيق من الدستور نزولًا، وتحليل عنصرًا بعنصر، وثغرات الأدلة، والمواعيد النهائية، والاستراتيجية."],
      ["36 مساحة عمل متخصصة", "مذكرات بحثية، ومراجعة العقود وصياغتها، والعناية الواجبة، واللوائح القضائية، والتحكيم، والتحليل الجنائي، والامتثال، والخصوصية، ومكافحة غسل الأموال، والعمل، والملكية الفكرية، والضرائب، وESG، وحوكمة الذكاء الاصطناعي وغيرها."],
      ["مقارنة النسخ والدليل والبنود والمواعيد والاستشهادات", "على جهازك: قارن نسخ العقد كلمة بكلمة، وافحصها وفق دليلك، واملأ قوالب البنود، واحسب المواعيد مع العطل الرسمية (تصدير .ics)، وتحقّق من كل استشهاد، وابحث في جميع مستندات القضية."],
    ],
    prompts: [
      ["240 موجّهًا و24 مجالًا و4 مستويات", "عشرة موجّهات خبيرة لكل مجال، من مهام Basic اليومية إلى أعمال Elite على مستوى مجالس الإدارة وعبر الدول — لكلٍّ منها متغيرات واضحة للتعبئة."],
      ["التشغيل والمقارنة في المكان", "نتائج متدفقة من نموذجك الخاص، وأسئلة متابعة، وتشغيل الموجّه نفسه على ما يصل إلى ثلاثة نماذج جنبًا إلى جنب."],
      ["موجّهاتك الخاصة والمُحسِّن", "اكتب موجّهات تحتوي {{variables}}، ونظّمها في مجموعات ومفضلة، ودع الذكاء الاصطناعي يحسّنها."],
      ["سير العمل والملفات التعريفية", "اربط خطوات يبني كلٌّ منها على نتيجة سابقه، واحفظ ملفات متغيرات تملأ الموجّهات تلقائيًا؛ وصدّر أو استورد كل شيء بصيغة JSON."],
    ],
    studio: [
      ["كل النماذج الرائدة جنبًا إلى جنب", "Anthropic وOpenAI وGoogle Gemini وGroq وOpenRouter وMistral وDeepSeek وxAI وPerplexity وغيرها — أو نقطة النهاية الخاصة بك — ورسالة واحدة إلى ما يصل إلى ثلاثة نماذج معًا."],
      ["ملفات وصور وصوت", "أرفق ملفات PDF وWord وأكوادًا وصورًا (تُقرأ على جهازك)، أو الصقها أو اسحبها، أو أملِها بصوتك."],
      ["أكواد ومخرجات حية", "أكواد ملوّنة مع النسخ والتنزيل؛ وتظهر إجابات HTML وSVG وMermaid في معاينة معزولة."],
      ["مساعدوك الخاصون", "شخصيات محفوظة بتعليماتها وإبداعها الخاص، مع قوالب للهندسة والتسويق والعقود والبيانات والتعليم والترجمة."],
    ],
    clipper: [
      ["مؤشر انتشار مع أربعة مؤشرات فرعية", "تُقيَّم كل لحظة حسب الافتتاح والتسلسل والقيمة والرواج، مع السبب وعنوان يوقف التمرير ونص للمنشور ووسوم."],
      ["8 أنماط ترجمة نصية متحركة", "Bold Pop وKaraoke وHighlight Box وNeon وTypewriter وEmoji وغيرها — كلمة بكلمة وفق توقيت دقيق، بخطوطك وألوانك."],
      ["إعادة تأطير تلقائية بتتبع الوجه", "يُبقي تتبع الوجه على الجهاز المتحدث داخل الإطار بمقاسات 9:16 و4:5 و1:1 و16:9 — مع شاشة مقسومة لمتحدثين واحتواء فوق خلفية ضبابية."],
      ["الخصوصية أولًا", "لا يغادر الفيديو جهازك أبدًا؛ يُرسَل فقط مسار صوتي مضغوط إلى مزوّد التفريغ الخاص بك."],
    ],
    vault: [
      ["65 نوعًا من البيانات مع تقييم", "البريد الإلكتروني والهواتف والبطاقات وأرقام IBAN (مع التحقق بالمجموع الاختباري)، والأسرار ومفاتيح API، والهويات الرسمية من 19 دولة — لكل منها درجة ثقة من التحقق والكلمات المفتاحية المجاورة."],
      ["إخفاء حقيقي للملفات", "تُخفى ملفات Word وExcel في مكانها؛ ويُعاد بناء ملفات PDF كصور بمربعات سوداء فلا يمكن نسخ أي شيء منها؛ وتُقرأ المستندات الممسوحة والصور بتقنية OCR على الجهاز."],
      ["ذكاء اصطناعي آمن", "اسأل ذكاءك الاصطناعي عن النص المُخفى — فهو لا يرى إلا العناصر النائبة، ويعيد متصفحك القيم الأصلية إلى الإجابة."],
      ["يعمل على جهازك", "يجري الكشف وOCR والإخفاء داخل متصفحك. لا يُرسل ولا يُحفظ إلا الإصدار المُخفى."],
    ],
    compliance: [
      ["342 ضابطًا حقيقيًا و7 أُطر", "ISO/IEC 27001:2022 الملحق A ‏(93)، وSOC 2 TSC، وNIST CSF 2.0 ‏(22 فئة)، وPCI DSS v4.0.1، وقاعدة أمن HIPAA، وGDPR، وUU PDP — مع الحالة والمسؤول والموعد والملاحظات ومبرر عدم الانطباق."],
      ["الأدلة والربط بين الأُطر", "أرفق ملفات الأدلة المخزنة مشفرة في حسابك؛ الضوابط مربوطة بين الأُطر بحيث يمكن نسخ العمل المنجز إلى الضوابط المكافئة لمراجعته."],
      ["المخاطر والسياسات والموردون", "سجل مخاطر بخريطة حرارية 5×5 للمخاطر الكامنة والمتبقية، و26 قالب سياسة بمسودات ذكاء اصطناعي وإصدارات وموافقات، واستبيان موردين موزون بمستويات مخاطر."],
      ["تقارير الجاهزية والتصدير", "الجاهزية لكل إطار ومجال، والضوابط المتأخرة، وتقرير جاهزية (Markdown وWord وPDF)، وبيان الانطباق لـ ISO 27001، وتصدير CSV / JSON."],
    ],
    security: [
      ["تحليل السجلات على جهازك", "تسعة تنسيقات سجلات تُحلَّل في المتصفح ضمن جدول أحداث واحد مع خط زمني، وأكثر الأجهزة والمستخدمين والمصادر، ومرشحات الخطورة، وكشف هجمات التخمين."],
      ["مصفوفة MITRE ATT&CK", "46 قاعدة سلوكية تربط النشاط بـ 14 تكتيكًا وأكثر من 130 تقنية؛ أضف استنتاجاتك والتقنيات التي يذكرها الذكاء الاصطناعي."],
      ["المؤشرات وتحليل التصيّد", "استخراج عناوين IP والنطاقات والروابط والبصمات والعناوين البريدية وتعطيلها، مع الأحكام والبحث؛ ويفحص تحليل ‎.eml ‏SPF وDKIM وDMARC والروابط والمرفقات."],
      ["التقارير وقواعد الكشف", "تقرير حادثة (Markdown وWord وPDF)، وحزمة STIX 2.1، وقوائم حظر، وقواعد Sigma وKQL وSPL وYARA وSuricata مولَّدة من القضية."],
    ],
  },
};
