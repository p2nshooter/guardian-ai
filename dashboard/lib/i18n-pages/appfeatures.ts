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
      ["Hukum terkini, dengan sumber", "Riset langsung memeriksa setiap undang-undang dan putusan terhadap sumber resmi dan mencantumkan apa yang diambil — serta membandingkan hukum lama dan baru untuk tanggal fakta Anda."],
      ["36 workspace ahli", "Memo riset, telaah & penyusunan kontrak, due diligence, gugatan, arbitrase, analisis pidana, kepatuhan, privasi, APU-PPT, ketenagakerjaan, HKI, pajak, ESG, tata kelola AI dan lainnya."],
    ],
    prompts: [
      ["24 bidang", "Bisnis, pemasaran, penjualan, hukum, keuangan, SDM, perangkat lunak, data, keamanan, kesehatan, pendidikan, properti dan lainnya."],
      ["4 tingkat", "Basic untuk tugas sehari-hari hingga Elite untuk pekerjaan lintas negara setingkat direksi."],
      ["Variabel isian", "Setiap prompt punya kolom isian yang jelas, sehingga hasilnya sesuai kebutuhan Anda, bukan teks umum."],
      ["Bekerja di mana saja", "Gunakan dengan AXTO AI Studio, ChatGPT, Claude, Gemini atau model apa pun."],
    ],
    studio: [
      ["Semua model utama", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity dan lainnya — atau endpoint Anda sendiri (Ollama, vLLM, LM Studio)."],
      ["Riwayat pribadi", "Percakapan disimpan di ruang penyimpanan terenkripsi milik Anda, tidak pernah dipakai untuk pelatihan."],
      ["Terhubung ke Prompt Library", "Jalankan item Prompt Library mana pun langsung di chat."],
      ["Kunci Anda sendiri", "Anda membayar penyedia langsung dengan harga mereka — tanpa markup dan tanpa batas pemakaian dari AXTO. Tier gratis (Gemini, Groq) juga bisa."],
    ],
    clipper: [
      ["Deteksi highlight dengan AI", "Setiap momen dinilai dari hook, kejelasan dan potensi dibagikan, lengkap dengan saran judul dan hashtag."],
      ["Teks animasi", "Teks kata demi kata dari stempel waktu yang presisi, dalam beberapa gaya."],
      ["Reframing cerdas", "Keluaran 9:16, 1:1 atau 16:9 dengan pembingkaian yang bisa diatur."],
      ["Privat sejak awal", "Video Anda tidak pernah meninggalkan perangkat, kecuali trek audio yang dikirim ke penyedia transkripsi Anda sendiri."],
    ],
    vault: [
      ["Berjalan di perangkat Anda", "Deteksi dan redaksi berlangsung di browser Anda — teks asli tidak pernah diunggah."],
      ["20+ jenis data", "Email, telepon, kartu pembayaran (dicek Luhn), IBAN, alamat IP, paspor, SSN AS, NIK & NPWP Indonesia, dan lainnya."],
      ["Token yang bisa dikembalikan", "Ganti nilai dengan token seperti [EMAIL_1] dan pulihkan setelah AI menjawab."],
      ["Gaya penyamaran", "Pilih token, penyamaran penuh (•••) atau sebagian (4 digit terakhir terlihat)."],
    ],
    compliance: [
      ["7 kerangka kerja", "SOC 2, ISO/IEC 27001, GDPR, HIPAA, PCI DSS v4, NIST CSF 2.0 dan UU PDP."],
      ["Analisis kesenjangan", "Temuan per kontrol dengan tingkat keparahan dan bukti yang perlu dikumpulkan."],
      ["Peta jalan perbaikan", "Rencana 30/60/90 hari dengan penanggung jawab dan estimasi upaya."],
      ["Pembuat kebijakan", "Draf kebijakan keamanan informasi, privasi, kontrol akses dan respons insiden."],
    ],
    security: [
      ["Triase alert", "Putusan (aman / mencurigakan / berbahaya), tingkat keparahan dan alasannya dalam bahasa sederhana."],
      ["Pemetaan MITRE ATT&CK", "Taktik dan ID teknik untuk setiap temuan."],
      ["Ekstraksi IOC", "IP, domain, URL, hash dan email diambil otomatis — bahkan sebelum AI berjalan."],
      ["Laporan insiden", "Ringkasan eksekutif, lini masa, dampak dan langkah berikutnya, siap dibagikan."],
    ],
  },
  ms: {
    legal: [
      ["200+ bidang kuasa, hingga peringkat wilayah", "Setiap negara serta undang-undang EU dan antarabangsa; negeri, wilayah dan rejim khas (Aceh, Québec, Scotland, DIFC, Louisiana…) hingga bandar atau daerah anda."],
      ["Case Builder", "Muat naik fail kes dan dapatkan pihak-pihak, kronologi bersumber, isu undang-undang, undang-undang terpakai dari perlembagaan ke bawah, analisis elemen demi elemen, jurang bukti, tarikh akhir dan strategi."],
      ["Undang-undang terkini, bersumber", "Penyelidikan langsung menyemak setiap statut dan keputusan dengan sumber rasmi dan menyenaraikan apa yang diperoleh — serta membandingkan undang-undang lama dan baharu mengikut tarikh fakta anda."],
      ["36 ruang kerja pakar", "Memo penyelidikan, semakan & perangkaan kontrak, usaha wajar, pliding, timbang tara, analisis jenayah, pematuhan, privasi, AML, pekerjaan, IP, cukai, ESG, tadbir urus AI dan banyak lagi."],
    ],
    prompts: [
      ["24 bidang", "Perniagaan, pemasaran, jualan, undang-undang, kewangan, HR, perisian, data, keselamatan, kesihatan, pendidikan, hartanah dan banyak lagi."],
      ["4 tahap", "Basic untuk tugasan harian hingga Elite untuk kerja pelbagai negara di peringkat lembaga."],
      ["Pemboleh ubah isian", "Setiap prompt mempunyai input yang jelas supaya hasilnya disesuaikan, bukan teks generik."],
      ["Berfungsi di mana-mana", "Gunakan dengan AXTO AI Studio, ChatGPT, Claude, Gemini atau mana-mana model."],
    ],
    studio: [
      ["Semua model utama", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity dan banyak lagi — atau endpoint anda sendiri (Ollama, vLLM, LM Studio)."],
      ["Sejarah peribadi", "Perbualan disimpan dalam ruang storan tersulit milik anda, tidak pernah digunakan untuk latihan."],
      ["Integrasi prompt", "Lancarkan mana-mana item Prompt Library terus ke dalam sembang."],
      ["Kunci anda sendiri", "Anda membayar penyedia terus pada harga mereka — tiada caj tambahan dan tiada had penggunaan daripada AXTO. Peringkat percuma (Gemini, Groq) juga berfungsi."],
    ],
    clipper: [
      ["Pengesanan sorotan AI", "Setiap detik dinilai dari segi hook, kejelasan dan potensi dikongsi, dengan cadangan tajuk dan hashtag."],
      ["Kapsyen animasi", "Kapsyen perkataan demi perkataan daripada cap masa yang tepat, dalam beberapa gaya."],
      ["Pembingkaian pintar", "Output 9:16, 1:1 atau 16:9 dengan pembingkaian boleh laras."],
      ["Peribadi secara reka bentuk", "Video anda tidak pernah meninggalkan peranti kecuali trek audio yang dihantar kepada penyedia transkripsi anda sendiri."],
    ],
    vault: [
      ["Berjalan pada peranti anda", "Pengesanan dan redaksi berlaku dalam pelayar anda — teks asal tidak pernah dimuat naik."],
      ["20+ jenis data", "E-mel, telefon, kad pembayaran (disemak Luhn), IBAN, alamat IP, pasport, SSN AS, NIK & NPWP Indonesia, dan banyak lagi."],
      ["Token boleh balik", "Gantikan nilai dengan token seperti [EMAIL_1] dan pulihkan selepas AI menjawab."],
      ["Gaya penyamaran", "Pilih token, penyamaran penuh (•••) atau separa (4 digit terakhir kelihatan)."],
    ],
    compliance: [
      ["7 rangka kerja", "SOC 2, ISO/IEC 27001, GDPR, HIPAA, PCI DSS v4, NIST CSF 2.0 dan UU PDP."],
      ["Analisis jurang", "Dapatan kawalan demi kawalan dengan tahap keterukan dan bukti untuk dikumpul."],
      ["Pelan tindakan pemulihan", "Pelan 30/60/90 hari dengan pemilik dan anggaran usaha."],
      ["Penjana dasar", "Draf dasar keselamatan maklumat, privasi, kawalan akses dan tindak balas insiden."],
    ],
    security: [
      ["Triaj amaran", "Keputusan (selamat / mencurigakan / berniat jahat), tahap keterukan dan alasan dalam bahasa mudah."],
      ["Pemetaan MITRE ATT&CK", "Taktik dan ID teknik untuk setiap dapatan."],
      ["Pengekstrakan IOC", "IP, domain, URL, hash dan e-mel diekstrak secara automatik — malah sebelum AI berjalan."],
      ["Laporan insiden", "Ringkasan eksekutif, garis masa, impak dan langkah seterusnya, sedia untuk dikongsi."],
    ],
  },
  de: {
    legal: [
      ["200+ Rechtsordnungen, bis zur Provinz", "Jedes Land plus EU- und Völkerrecht; Bundesstaaten, Provinzen und Sonderregime (Aceh, Québec, Schottland, DIFC, Louisiana…) bis hin zu Ihrer Stadt oder Ihrem Landkreis."],
      ["Case Builder", "Laden Sie eine Fallakte hoch und erhalten Sie Parteien, eine belegte Chronologie, Rechtsfragen, das anwendbare Recht von der Verfassung abwärts, eine Prüfung Tatbestandsmerkmal für Tatbestandsmerkmal, Beweislücken, Fristen und eine Strategie."],
      ["Aktuelles Recht, mit Quellen", "Die Live-Recherche prüft jedes Gesetz und jede Entscheidung gegen amtliche Quellen und listet auf, was abgerufen wurde — altes und neues Recht wird für den Zeitpunkt Ihres Sachverhalts verglichen."],
      ["36 Experten-Workspaces", "Rechercheberichte, Vertragsprüfung & -entwurf, Due Diligence, Schriftsätze, Schiedsverfahren, Strafrechtsanalyse, Compliance, Datenschutz, Geldwäsche, Arbeitsrecht, IP, Steuern, ESG, AI Governance und mehr."],
    ],
    prompts: [
      ["24 Fachbereiche", "Business, Marketing, Vertrieb, Recht, Finanzen, HR, Software, Daten, Sicherheit, Gesundheit, Bildung, Immobilien und mehr."],
      ["4 Stufen", "Basic für alltägliche Aufgaben bis Elite für länderübergreifende Arbeit auf Vorstandsebene."],
      ["Ausfüllbare Variablen", "Jeder Prompt hat klar markierte Eingaben – so erhalten Sie maßgeschneiderte statt generischer Ergebnisse."],
      ["Funktioniert überall", "Mit AXTO AI Studio, ChatGPT, Claude, Gemini oder jedem anderen Modell nutzbar."],
    ],
    studio: [
      ["Alle großen Modelle", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity und mehr – oder Ihr eigener Endpunkt (Ollama, vLLM, LM Studio)."],
      ["Privater Verlauf", "Unterhaltungen werden in Ihrem eigenen verschlüsselten Speicher abgelegt und nie zum Training verwendet."],
      ["Prompt-Integration", "Starten Sie jeden Eintrag der Prompt Library direkt in einem Chat."],
      ["Eigener Schlüssel", "Sie zahlen Ihren Anbieter direkt zu dessen Preis – ohne Aufschlag und ohne Nutzungslimit von AXTO. Kostenlose Kontingente (Gemini, Groq) funktionieren auch."],
    ],
    clipper: [
      ["KI-Highlight-Erkennung", "Momente werden nach Hook, Klarheit und Teilbarkeit bewertet, jeweils mit Titel- und Hashtag-Vorschlag."],
      ["Animierte Untertitel", "Wort-für-Wort-Untertitel aus präzisen Zeitstempeln, in mehreren Stilen."],
      ["Intelligenter Bildausschnitt", "Ausgabe in 9:16, 1:1 oder 16:9 mit einstellbarem Ausschnitt."],
      ["Privat by Design", "Ihr Video verlässt Ihr Gerät nie – nur die Tonspur geht an Ihren eigenen Transkriptionsanbieter."],
    ],
    vault: [
      ["Läuft auf Ihrem Gerät", "Erkennung und Schwärzung passieren in Ihrem Browser – der Originaltext wird nie hochgeladen."],
      ["20+ Datentypen", "E-Mails, Telefonnummern, Zahlungskarten (Luhn-geprüft), IBAN, IP-Adressen, Reisepässe, US-SSN, indonesische NIK & NPWP und mehr."],
      ["Umkehrbare Platzhalter", "Werte durch Platzhalter wie [EMAIL_1] ersetzen und nach der KI-Antwort wiederherstellen."],
      ["Maskierungsarten", "Platzhalter, vollständige Maskierung (•••) oder teilweise Maskierung (letzte 4 Ziffern sichtbar)."],
    ],
    compliance: [
      ["7 Frameworks", "SOC 2, ISO/IEC 27001, DSGVO, HIPAA, PCI DSS v4, NIST CSF 2.0 und UU PDP."],
      ["Gap-Analyse", "Feststellungen je Kontrolle mit Schweregrad und zu sammelnden Nachweisen."],
      ["Maßnahmen-Roadmap", "30/60/90-Tage-Plan mit Verantwortlichen und Aufwandsschätzung."],
      ["Richtlinien-Generator", "Entwürfe für Informationssicherheits-, Datenschutz-, Zugriffs- und Incident-Response-Richtlinien."],
    ],
    security: [
      ["Alarm-Triage", "Urteil (harmlos / verdächtig / bösartig), Schweregrad und Begründung in verständlicher Sprache."],
      ["MITRE ATT&CK-Zuordnung", "Taktiken und Technik-IDs für jede Feststellung."],
      ["IOC-Extraktion", "IPs, Domains, URLs, Hashes und E-Mails werden automatisch herausgezogen – schon bevor die KI läuft."],
      ["Vorfallberichte", "Management-Zusammenfassung, Zeitleiste, Auswirkungen und nächste Schritte, bereit zum Teilen."],
    ],
  },
  fr: {
    legal: [
      ["200+ juridictions, jusqu'à la province", "Chaque pays plus le droit européen et international ; États, provinces et régimes spéciaux (Aceh, Québec, Écosse, DIFC, Louisiane…) jusqu'à votre ville ou district."],
      ["Case Builder", "Téléversez un dossier et obtenez les parties, une chronologie sourcée, les questions juridiques, le droit applicable depuis la constitution, une analyse élément par élément, les lacunes de preuve, les délais et une stratégie."],
      ["Droit en vigueur, sourcé", "La recherche en direct vérifie chaque texte et décision auprès des sources officielles et liste ce qu'elle a récupéré — l'ancien et le nouveau droit sont comparés à la date de vos faits."],
      ["36 espaces experts", "Notes de recherche, revue et rédaction de contrats, due diligence, actes de procédure, arbitrage, analyse pénale, conformité, vie privée, LCB-FT, droit du travail, PI, fiscalité, ESG, gouvernance de l'IA et plus."],
    ],
    prompts: [
      ["24 domaines", "Business, marketing, ventes, droit, finance, RH, logiciel, données, sécurité, santé, éducation, immobilier et plus."],
      ["4 niveaux", "Basic pour les tâches courantes jusqu'à Elite pour un travail multi-pays au niveau du conseil d'administration."],
      ["Variables à compléter", "Chaque prompt comporte des champs clairement indiqués pour un résultat sur mesure, pas un texte générique."],
      ["Fonctionne partout", "À utiliser avec AXTO AI Studio, ChatGPT, Claude, Gemini ou tout autre modèle."],
    ],
    studio: [
      ["Tous les grands modèles", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity et plus — ou votre propre endpoint (Ollama, vLLM, LM Studio)."],
      ["Historique privé", "Les conversations sont stockées dans votre propre espace chiffré, jamais utilisées pour l'entraînement."],
      ["Intégration des prompts", "Lancez n'importe quel élément de la Prompt Library directement dans une discussion."],
      ["Votre propre clé", "Vous payez votre fournisseur directement à son prix — sans marge ni plafond d'usage de la part d'AXTO. Les offres gratuites (Gemini, Groq) fonctionnent aussi."],
    ],
    clipper: [
      ["Détection des temps forts par IA", "Chaque moment est noté selon l'accroche, la clarté et le potentiel de partage, avec un titre et des hashtags suggérés."],
      ["Sous-titres animés", "Sous-titres mot à mot à partir d'horodatages précis, en plusieurs styles."],
      ["Recadrage intelligent", "Sortie en 9:16, 1:1 ou 16:9 avec cadrage ajustable."],
      ["Privé par conception", "Votre vidéo ne quitte jamais votre appareil, sauf la piste audio envoyée à votre propre fournisseur de transcription."],
    ],
    vault: [
      ["Fonctionne sur votre appareil", "La détection et l'anonymisation se font dans votre navigateur — le texte original n'est jamais envoyé."],
      ["20+ types de données", "E-mails, téléphones, cartes de paiement (vérifiées Luhn), IBAN, adresses IP, passeports, SSN américain, NIK et NPWP indonésiens, et plus."],
      ["Jetons réversibles", "Remplacez les valeurs par des jetons comme [EMAIL_1] et restaurez-les après la réponse de l'IA."],
      ["Styles de masquage", "Jetons, masquage complet (•••) ou partiel (4 derniers chiffres visibles)."],
    ],
    compliance: [
      ["7 référentiels", "SOC 2, ISO/IEC 27001, RGPD, HIPAA, PCI DSS v4, NIST CSF 2.0 et UU PDP."],
      ["Analyse des écarts", "Constats contrôle par contrôle avec niveau de gravité et preuves à réunir."],
      ["Feuille de route de remédiation", "Plan à 30/60/90 jours avec responsables et estimations d'effort."],
      ["Générateur de politiques", "Projets de politiques de sécurité de l'information, de confidentialité, de contrôle d'accès et de réponse aux incidents."],
    ],
    security: [
      ["Tri des alertes", "Verdict (bénin / suspect / malveillant), gravité et raisonnement en langage clair."],
      ["Correspondance MITRE ATT&CK", "Tactiques et identifiants de techniques pour chaque constat."],
      ["Extraction d'IOC", "IP, domaines, URL, hachages et e-mails extraits automatiquement — avant même le lancement de l'IA."],
      ["Rapports d'incident", "Synthèse, chronologie, impact et prochaines étapes, prêts à partager."],
    ],
  },
  it: {
    legal: [
      ["200+ giurisdizioni, fino alla provincia", "Ogni paese più il diritto UE e internazionale; stati, province e regimi speciali (Aceh, Québec, Scozia, DIFC, Louisiana…) fino alla tua città o distretto."],
      ["Case Builder", "Carica un fascicolo e ottieni parti, una cronologia con fonti, questioni giuridiche, il diritto applicabile dalla costituzione in giù, un'analisi elemento per elemento, lacune probatorie, scadenze e strategia."],
      ["Diritto vigente, con fonti", "La ricerca in tempo reale verifica ogni norma e decisione sulle fonti ufficiali ed elenca ciò che ha recuperato — confrontando il diritto vecchio e nuovo alla data dei tuoi fatti."],
      ["36 workspace esperti", "Memo di ricerca, revisione e redazione di contratti, due diligence, atti processuali, arbitrato, analisi penale, compliance, privacy, antiriciclaggio, lavoro, PI, fisco, ESG, governance dell'IA e altro."],
    ],
    prompts: [
      ["24 settori", "Business, marketing, vendite, legale, finanza, HR, software, dati, sicurezza, sanità, istruzione, immobiliare e altro."],
      ["4 livelli", "Basic per le attività quotidiane fino a Elite per lavori multinazionali a livello di consiglio di amministrazione."],
      ["Variabili da compilare", "Ogni prompt ha campi chiaramente indicati, così ottieni un risultato su misura e non un testo generico."],
      ["Funziona ovunque", "Usalo con AXTO AI Studio, ChatGPT, Claude, Gemini o qualsiasi modello."],
    ],
    studio: [
      ["Tutti i principali modelli", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity e altri — oppure il tuo endpoint (Ollama, vLLM, LM Studio)."],
      ["Cronologia privata", "Le conversazioni sono salvate nel tuo spazio di archiviazione cifrato, mai usate per l'addestramento."],
      ["Integrazione dei prompt", "Avvia qualsiasi elemento della Prompt Library direttamente in una chat."],
      ["La tua chiave", "Paghi direttamente il tuo provider al suo prezzo — nessun ricarico e nessun limite d'uso da parte di AXTO. Funzionano anche i piani gratuiti (Gemini, Groq)."],
    ],
    clipper: [
      ["Rilevamento dei momenti salienti con IA", "Ogni momento riceve un punteggio per hook, chiarezza e condivisibilità, con titolo e hashtag suggeriti."],
      ["Sottotitoli animati", "Sottotitoli parola per parola da timestamp precisi, in diversi stili."],
      ["Reframing intelligente", "Output 9:16, 1:1 o 16:9 con inquadratura regolabile."],
      ["Privato per progettazione", "Il tuo video non lascia mai il dispositivo, tranne la traccia audio inviata al tuo provider di trascrizione."],
    ],
    vault: [
      ["Funziona sul tuo dispositivo", "Rilevamento e oscuramento avvengono nel browser — il testo originale non viene mai caricato."],
      ["20+ tipi di dati", "E-mail, telefoni, carte di pagamento (verifica Luhn), IBAN, indirizzi IP, passaporti, SSN USA, NIK e NPWP indonesiani e altro."],
      ["Token reversibili", "Sostituisci i valori con token come [EMAIL_1] e ripristinali dopo la risposta dell'IA."],
      ["Stili di mascheramento", "Token, mascheramento completo (•••) o parziale (ultime 4 cifre visibili)."],
    ],
    compliance: [
      ["7 framework", "SOC 2, ISO/IEC 27001, GDPR, HIPAA, PCI DSS v4, NIST CSF 2.0 e UU PDP."],
      ["Gap analysis", "Rilievi controllo per controllo con gravità ed evidenze da raccogliere."],
      ["Roadmap di rimedio", "Piano a 30/60/90 giorni con responsabili e stime dell'impegno."],
      ["Generatore di policy", "Bozze di policy su sicurezza delle informazioni, privacy, controllo degli accessi e risposta agli incidenti."],
    ],
    security: [
      ["Triage degli alert", "Verdetto (benigno / sospetto / malevolo), gravità e motivazione in linguaggio semplice."],
      ["Mappatura MITRE ATT&CK", "Tattiche e ID delle tecniche per ogni rilievo."],
      ["Estrazione IOC", "IP, domini, URL, hash ed e-mail estratti automaticamente — ancora prima che parta l'IA."],
      ["Report sugli incidenti", "Sintesi per il management, cronologia, impatto e prossimi passi, pronti da condividere."],
    ],
  },
  zh: {
    legal: [
      ["200+ 司法辖区，细至省级", "覆盖每个国家以及欧盟法和国际法；州、省及特别制度（亚齐、魁北克、苏格兰、DIFC、路易斯安那……），直至您所在的城市或县。"],
      ["Case Builder", "上传案卷，即可获得当事人、附来源的时间线、法律争点、从宪法到下位法的适用法律、逐要件分析、证据缺口、期限与策略。"],
      ["现行法律，附来源", "实时检索会对照官方来源核验每一部法规和判决，并列出检索到的内容——还会按您的事实发生日期对比新旧法律。"],
      ["36 个专家工作区", "研究备忘录、合同审查与起草、尽职调查、诉状、仲裁、刑事分析、合规、隐私、反洗钱、劳动、知识产权、税务、ESG、AI 治理等。"],
    ],
    prompts: [
      ["24 个领域", "商业、营销、销售、法律、财务、人力资源、软件、数据、安全、医疗、教育、房地产等。"],
      ["4 个级别", "从日常任务的 Basic 到跨国、董事会级工作的 Elite。"],
      ["可填写变量", "每个提示词都有清晰标注的输入项，输出贴合需求，而非泛泛而谈。"],
      ["随处可用", "可配合 AXTO AI Studio、ChatGPT、Claude、Gemini 或任意模型使用。"],
    ],
    studio: [
      ["所有主流模型", "Anthropic、OpenAI、Google Gemini、Groq、OpenRouter、Mistral、DeepSeek、xAI、Perplexity 等——或您自己的端点（Ollama、vLLM、LM Studio）。"],
      ["私密历史", "对话保存在您自己的加密存储空间中，绝不用于训练。"],
      ["提示词集成", "一键将任意 Prompt Library 条目发送到对话中。"],
      ["自带密钥", "您按服务商价格直接付费——AXTO 不加价、不限用量。免费额度（Gemini、Groq）同样可用。"],
    ],
    clipper: [
      ["AI 精彩片段识别", "按吸引力、清晰度和传播性为每个片段打分，并给出建议标题和话题标签。"],
      ["动态字幕", "基于精确时间戳的逐字字幕，多种样式可选。"],
      ["智能重构画面", "输出 9:16、1:1 或 16:9，构图可调。"],
      ["隐私优先设计", "视频始终留在您的设备上，只有音轨会发送给您自己的转写服务商。"],
    ],
    vault: [
      ["在您的设备上运行", "检测与脱敏都在浏览器中完成——原文绝不会上传。"],
      ["20+ 种数据类型", "电子邮件、电话、支付卡（Luhn 校验）、IBAN、IP 地址、护照、美国 SSN、印尼 NIK 与 NPWP 等。"],
      ["可还原的令牌", "用 [EMAIL_1] 等令牌替换敏感值，AI 回复后再还原。"],
      ["遮蔽方式", "可选令牌、完全遮蔽（•••）或部分遮蔽（显示后 4 位）。"],
    ],
    compliance: [
      ["7 个框架", "SOC 2、ISO/IEC 27001、GDPR、HIPAA、PCI DSS v4、NIST CSF 2.0 和 UU PDP。"],
      ["差距分析", "逐项控制的发现，附严重程度和需收集的证据。"],
      ["整改路线图", "30/60/90 天计划，含负责人和工作量估算。"],
      ["政策生成器", "起草信息安全、隐私、访问控制和事件响应政策。"],
    ],
    security: [
      ["告警分诊", "以通俗语言给出结论（良性 / 可疑 / 恶意）、严重程度和理由。"],
      ["MITRE ATT&CK 映射", "为每项发现标注战术和技术 ID。"],
      ["IOC 提取", "自动提取 IP、域名、URL、哈希和电子邮件——甚至在 AI 运行之前。"],
      ["事件报告", "管理层摘要、时间线、影响和后续步骤，可直接分享。"],
    ],
  },
  ja: {
    legal: [
      ["200 以上の法域、州・県レベルまで", "すべての国に加え EU 法・国際法、州・県・特別制度（アチェ、ケベック、スコットランド、DIFC、ルイジアナ…）から市区町村まで。"],
      ["Case Builder", "事件記録をアップロードすると、当事者、出典付き時系列、法的争点、憲法から下位法令までの適用法、要件ごとの分析、証拠の不足、期限、戦略が得られます。"],
      ["出典付きの現行法", "ライブリサーチが各法令・判例を公式ソースで確認し、取得内容を一覧表示。事実の発生日に合わせて新旧の法律も比較します。"],
      ["36 の専門ワークスペース", "リサーチメモ、契約書レビュー・作成、デューデリジェンス、訴状、仲裁、刑事分析、コンプライアンス、プライバシー、AML、労働、知財、税務、ESG、AI ガバナンスなど。"],
    ],
    prompts: [
      ["24 の分野", "ビジネス、マーケティング、営業、法務、財務、人事、ソフトウェア、データ、セキュリティ、医療、教育、不動産など。"],
      ["4 つのレベル", "日常業務向けの Basic から、多国間・取締役会レベルの Elite まで。"],
      ["入力変数", "各プロンプトに入力項目が明示されているので、汎用的ではなく状況に合った出力が得られます。"],
      ["どこでも使える", "AXTO AI Studio、ChatGPT、Claude、Gemini などあらゆるモデルで利用できます。"],
    ],
    studio: [
      ["主要モデルすべて", "Anthropic、OpenAI、Google Gemini、Groq、OpenRouter、Mistral、DeepSeek、xAI、Perplexity など。独自のエンドポイント（Ollama、vLLM、LM Studio）も利用できます。"],
      ["プライベートな履歴", "会話はご自身の暗号化ストレージに保存され、学習に使われることはありません。"],
      ["プロンプト連携", "Prompt Library の項目をそのままチャットで実行できます。"],
      ["ご自身のキー", "プロバイダーにその価格で直接お支払い。AXTO による上乗せや利用上限はありません。無料枠（Gemini、Groq）も使えます。"],
    ],
    clipper: [
      ["AI ハイライト検出", "各シーンをフック・わかりやすさ・拡散性で採点し、タイトルとハッシュタグを提案します。"],
      ["アニメーション字幕", "正確なタイムスタンプに基づく単語ごとの字幕。複数のスタイルに対応。"],
      ["スマートリフレーム", "9:16、1:1、16:9 で出力。構図は調整可能です。"],
      ["プライバシー重視の設計", "動画は端末から出ません。ご自身の文字起こしプロバイダーに送るのは音声トラックだけです。"],
    ],
    vault: [
      ["お使いの端末で実行", "検出と墨消しはブラウザ内で行われ、元のテキストはアップロードされません。"],
      ["20 種類以上のデータ", "メール、電話番号、決済カード（Luhn チェック）、IBAN、IP アドレス、パスポート、米国 SSN、インドネシアの NIK・NPWP など。"],
      ["元に戻せるトークン", "値を [EMAIL_1] などのトークンに置き換え、AI の回答後に復元します。"],
      ["マスキング方式", "トークン、完全マスク（•••）、部分マスク（末尾 4 桁を表示）から選べます。"],
    ],
    compliance: [
      ["7 つのフレームワーク", "SOC 2、ISO/IEC 27001、GDPR、HIPAA、PCI DSS v4、NIST CSF 2.0、UU PDP。"],
      ["ギャップ分析", "管理策ごとの指摘事項を、重大度と収集すべき証跡とともに提示。"],
      ["是正ロードマップ", "担当者と工数見積もり付きの 30/60/90 日計画。"],
      ["ポリシー生成", "情報セキュリティ、プライバシー、アクセス制御、インシデント対応のポリシー草案を作成。"],
    ],
    security: [
      ["アラートのトリアージ", "判定（無害 / 不審 / 悪意あり）、重大度、その理由をわかりやすく説明。"],
      ["MITRE ATT&CK マッピング", "すべての指摘に戦術とテクニック ID を付与。"],
      ["IOC 抽出", "IP、ドメイン、URL、ハッシュ、メールを自動抽出。AI の実行前から行います。"],
      ["インシデントレポート", "エグゼクティブサマリー、タイムライン、影響、次のステップをすぐ共有できる形で。"],
    ],
  },
  hi: {
    legal: [
      ["200+ क्षेत्राधिकार, प्रांत स्तर तक", "हर देश के साथ EU और अंतरराष्ट्रीय कानून; राज्य, प्रांत और विशेष व्यवस्थाएँ (आचे, क्यूबेक, स्कॉटलैंड, DIFC, लुइज़ियाना…) और आपका शहर या ज़िला।"],
      ["Case Builder", "केस फ़ाइल अपलोड करें और पाएँ पक्षकार, स्रोत-सहित घटनाक्रम, कानूनी मुद्दे, संविधान से नीचे तक लागू कानून, तत्व-दर-तत्व विश्लेषण, साक्ष्य की कमियाँ, समय-सीमाएँ और रणनीति।"],
      ["वर्तमान कानून, स्रोतों सहित", "लाइव रिसर्च हर क़ानून और निर्णय को आधिकारिक स्रोतों से जाँचता है और बताता है कि क्या प्राप्त हुआ — आपके तथ्यों की तारीख़ के अनुसार पुराने और नए कानून की तुलना भी करता है।"],
      ["36 विशेषज्ञ वर्कस्पेस", "रिसर्च मेमो, अनुबंध समीक्षा व ड्राफ़्टिंग, ड्यू डिलिजेंस, याचिकाएँ, मध्यस्थता, आपराधिक विश्लेषण, अनुपालन, गोपनीयता, AML, रोज़गार, IP, कर, ESG, AI गवर्नेंस और बहुत कुछ।"],
    ],
    prompts: [
      ["24 क्षेत्र", "व्यवसाय, मार्केटिंग, बिक्री, कानून, वित्त, HR, सॉफ़्टवेयर, डेटा, सुरक्षा, स्वास्थ्य, शिक्षा, रियल एस्टेट और बहुत कुछ।"],
      ["4 स्तर", "रोज़मर्रा के कामों के लिए Basic से लेकर बहु-देशीय, बोर्ड-स्तरीय काम के लिए Elite तक।"],
      ["भरने योग्य वेरिएबल", "हर प्रॉम्प्ट में स्पष्ट इनपुट होते हैं, ताकि आपको सामान्य नहीं, अनुकूलित परिणाम मिले।"],
      ["हर जगह काम करता है", "AXTO AI Studio, ChatGPT, Claude, Gemini या किसी भी मॉडल के साथ उपयोग करें।"],
    ],
    studio: [
      ["हर प्रमुख मॉडल", "Anthropic, OpenAI, Google Gemini, Groq, OpenRouter, Mistral, DeepSeek, xAI, Perplexity और अन्य — या आपका अपना एंडपॉइंट (Ollama, vLLM, LM Studio)।"],
      ["निजी इतिहास", "बातचीत आपके अपने एन्क्रिप्टेड स्टोरेज में रहती है, कभी प्रशिक्षण के लिए उपयोग नहीं होती।"],
      ["प्रॉम्प्ट एकीकरण", "Prompt Library का कोई भी आइटम सीधे चैट में चलाएँ।"],
      ["अपनी कुंजी", "आप प्रदाता को सीधे उनकी कीमत पर भुगतान करते हैं — AXTO की ओर से कोई मार्कअप या उपयोग-सीमा नहीं। मुफ़्त टियर (Gemini, Groq) भी काम करते हैं।"],
    ],
    clipper: [
      ["AI हाइलाइट पहचान", "हर पल को हुक, स्पष्टता और शेयर-योग्यता पर अंक मिलते हैं, साथ में सुझाया गया शीर्षक और हैशटैग।"],
      ["एनिमेटेड कैप्शन", "सटीक टाइमस्टैम्प से शब्द-दर-शब्द कैप्शन, कई शैलियों में।"],
      ["स्मार्ट रीफ़्रेमिंग", "9:16, 1:1 या 16:9 आउटपुट, समायोज्य फ़्रेमिंग के साथ।"],
      ["डिज़ाइन से निजी", "आपका वीडियो कभी आपके डिवाइस से बाहर नहीं जाता — केवल ऑडियो ट्रैक आपके अपने ट्रांसक्रिप्शन प्रदाता को भेजा जाता है।"],
    ],
    vault: [
      ["आपके डिवाइस पर चलता है", "पहचान और रिडैक्शन आपके ब्राउज़र में होते हैं — मूल टेक्स्ट कभी अपलोड नहीं होता।"],
      ["20+ डेटा प्रकार", "ईमेल, फ़ोन, भुगतान कार्ड (Luhn-जाँचे), IBAN, IP पते, पासपोर्ट, US SSN, इंडोनेशियाई NIK व NPWP और बहुत कुछ।"],
      ["वापस बदले जा सकने वाले टोकन", "मानों को [EMAIL_1] जैसे टोकन से बदलें और AI के उत्तर के बाद उन्हें बहाल करें।"],
      ["मास्किंग शैलियाँ", "टोकन, पूर्ण मास्किंग (•••) या आंशिक मास्किंग (अंतिम 4 अंक दिखें) चुनें।"],
    ],
    compliance: [
      ["7 फ़्रेमवर्क", "SOC 2, ISO/IEC 27001, GDPR, HIPAA, PCI DSS v4, NIST CSF 2.0 और UU PDP।"],
      ["गैप विश्लेषण", "हर नियंत्रण के निष्कर्ष, गंभीरता और एकत्र करने योग्य साक्ष्य के साथ।"],
      ["सुधार रोडमैप", "ज़िम्मेदारों और प्रयास अनुमानों के साथ 30/60/90-दिन की योजना।"],
      ["नीति जनरेटर", "सूचना सुरक्षा, गोपनीयता, एक्सेस-नियंत्रण और घटना-प्रतिक्रिया नीतियों के ड्राफ़्ट।"],
    ],
    security: [
      ["अलर्ट ट्राइएज", "निर्णय (हानिरहित / संदिग्ध / दुर्भावनापूर्ण), गंभीरता और तर्क, सरल भाषा में।"],
      ["MITRE ATT&CK मैपिंग", "हर निष्कर्ष के लिए टैक्टिक्स और तकनीक ID।"],
      ["IOC निष्कर्षण", "IP, डोमेन, URL, हैश और ईमेल अपने-आप निकाले जाते हैं — AI चलने से पहले ही।"],
      ["घटना रिपोर्ट", "कार्यकारी सारांश, समयरेखा, प्रभाव और अगले कदम, साझा करने के लिए तैयार।"],
    ],
  },
  ar: {
    legal: [
      ["أكثر من 200 ولاية قضائية، حتى مستوى المقاطعة", "كل دولة إضافةً إلى قانون الاتحاد الأوروبي والقانون الدولي؛ الولايات والمقاطعات والأنظمة الخاصة (آتشيه، كيبيك، اسكتلندا، مركز دبي المالي العالمي، لويزيانا…) وصولًا إلى مدينتك أو محافظتك."],
      ["Case Builder", "ارفع ملف القضية واحصل على الأطراف، وتسلسل زمني موثّق المصادر، والمسائل القانونية، والقانون الواجب التطبيق من الدستور نزولًا، وتحليل عنصرًا بعنصر، وثغرات الأدلة، والمواعيد النهائية، والاستراتيجية."],
      ["القانون الساري، مع المصادر", "يتحقق البحث المباشر من كل نص وحكم مقابل المصادر الرسمية ويعرض ما استرجعه — ويقارن القانون القديم بالجديد وفق تاريخ وقائعك."],
      ["36 مساحة عمل متخصصة", "مذكرات بحثية، ومراجعة العقود وصياغتها، والعناية الواجبة، واللوائح القضائية، والتحكيم، والتحليل الجنائي، والامتثال، والخصوصية، ومكافحة غسل الأموال، والعمل، والملكية الفكرية، والضرائب، وESG، وحوكمة الذكاء الاصطناعي وغيرها."],
    ],
    prompts: [
      ["24 مجالًا", "الأعمال، والتسويق، والمبيعات، والقانون، والمالية، والموارد البشرية، والبرمجيات، والبيانات، والأمن، والصحة، والتعليم، والعقارات وغيرها."],
      ["4 مستويات", "من Basic للمهام اليومية حتى Elite للعمل متعدد الدول على مستوى مجالس الإدارة."],
      ["متغيرات للتعبئة", "لكل موجّه مدخلات واضحة المعالم لتحصل على نتيجة مخصّصة لا نصًا عامًا."],
      ["يعمل في كل مكان", "استخدمه مع AXTO AI Studio أو ChatGPT أو Claude أو Gemini أو أي نموذج."],
    ],
    studio: [
      ["كل النماذج الرئيسية", "Anthropic وOpenAI وGoogle Gemini وGroq وOpenRouter وMistral وDeepSeek وxAI وPerplexity وغيرها — أو نقطة النهاية الخاصة بك (Ollama وvLLM وLM Studio)."],
      ["سجل خاص", "تُحفظ المحادثات في مساحة التخزين المشفّرة الخاصة بك، ولا تُستخدم أبدًا للتدريب."],
      ["تكامل الموجّهات", "شغّل أي عنصر من Prompt Library مباشرةً في محادثة."],
      ["مفتاحك الخاص", "تدفع لمزوّدك مباشرةً بسعره — بلا هامش ربح ولا حد استخدام من AXTO. الباقات المجانية (Gemini وGroq) تعمل أيضًا."],
    ],
    clipper: [
      ["اكتشاف اللقطات المميزة بالذكاء الاصطناعي", "تُقيَّم كل لحظة حسب قوة الجذب والوضوح وقابلية المشاركة، مع عنوان ووسوم مقترحة."],
      ["ترجمة نصية متحركة", "ترجمة كلمة بكلمة من طوابع زمنية دقيقة، بأنماط متعددة."],
      ["إعادة تأطير ذكية", "إخراج بنسبة 9:16 أو 1:1 أو 16:9 مع تأطير قابل للضبط."],
      ["خصوصية منذ التصميم", "لا يغادر الفيديو جهازك أبدًا، باستثناء المسار الصوتي المُرسل إلى مزوّد النسخ الخاص بك."],
    ],
    vault: [
      ["يعمل على جهازك", "يتم الاكتشاف والحجب داخل متصفحك — ولا يُرفع النص الأصلي أبدًا."],
      ["أكثر من 20 نوعًا من البيانات", "البريد الإلكتروني، والهواتف، وبطاقات الدفع (بتحقق Luhn)، وIBAN، وعناوين IP، وجوازات السفر، وSSN الأمريكي، وNIK وNPWP الإندونيسيان، وغيرها."],
      ["رموز قابلة للاسترجاع", "استبدل القيم برموز مثل [EMAIL_1] واستعِدها بعد رد الذكاء الاصطناعي."],
      ["أنماط الإخفاء", "اختر الرموز، أو الإخفاء الكامل (•••)، أو الجزئي (تظهر آخر 4 أرقام)."],
    ],
    compliance: [
      ["7 أُطر عمل", "SOC 2 وISO/IEC 27001 وGDPR وHIPAA وPCI DSS v4 وNIST CSF 2.0 وUU PDP."],
      ["تحليل الفجوات", "نتائج لكل ضابط رقابي مع درجة الخطورة والأدلة المطلوب جمعها."],
      ["خارطة طريق المعالجة", "خطة 30/60/90 يومًا مع المسؤولين وتقديرات الجهد."],
      ["مولّد السياسات", "مسودات سياسات أمن المعلومات والخصوصية والتحكم في الوصول والاستجابة للحوادث."],
    ],
    security: [
      ["فرز التنبيهات", "الحكم (سليم / مشبوه / خبيث) ودرجة الخطورة والتعليل بلغة واضحة."],
      ["مطابقة MITRE ATT&CK", "التكتيكات ومعرّفات التقنيات لكل نتيجة."],
      ["استخراج مؤشرات الاختراق", "تُستخرج عناوين IP والنطاقات والروابط والبصمات والبريد الإلكتروني تلقائيًا — حتى قبل تشغيل الذكاء الاصطناعي."],
      ["تقارير الحوادث", "ملخص تنفيذي وجدول زمني والأثر والخطوات التالية، جاهزة للمشاركة."],
    ],
  },
};
