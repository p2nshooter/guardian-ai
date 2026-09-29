/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Support topics — the dropdown in the chat widget, the contact form and the
 * admin inbox. `handoff` topics always need a person (prices are negotiated,
 * payments confirmed and deals signed by the team — never by the AI).
 * ============================================================================ */
import type { Lang } from "../i18n-shared";

export type TopicId = "quote" | "lifetime" | "crypto" | "bank" | "enterprise" | "billing" | "technical" | "account" | "other";

export interface Topic {
  id: TopicId;
  label: Record<Lang, string>;   // every portal language (the widget follows the visitor's language)
  hint: Record<Lang, string>;
  handoff: boolean;
}

export const TOPICS: Topic[] = [
  { id: "quote", handoff: true,
    label: { en: "Request an offer / quotation", id: "Minta penawaran / quotation", ms: "Minta tawaran / sebut harga", de: "Angebot anfordern", fr: "Demander une offre / un devis", it: "Richiedi un'offerta / un preventivo", zh: "索取报价", ja: "見積もりを依頼", hi: "ऑफ़र / कोटेशन माँगें", ar: "طلب عرض / عرض سعر" },
    hint: { en: "Tell us the apps, number of users or devices and your timeline.", id: "Sebutkan aplikasi, jumlah pengguna/perangkat, dan timeline Anda.", ms: "Beritahu kami aplikasi, bilangan pengguna atau peranti dan garis masa anda.", de: "Nennen Sie uns die Apps, die Zahl der Nutzer oder Geräte und Ihren Zeitplan.", fr: "Indiquez les applications, le nombre d'utilisateurs ou d'appareils et votre calendrier.", it: "Indicaci le app, il numero di utenti o dispositivi e le tue tempistiche.", zh: "请告诉我们所需应用、用户或设备数量以及时间安排。", ja: "必要なアプリ、ユーザー数またはデバイス数、スケジュールをお知らせください。", hi: "ऐप, उपयोगकर्ताओं या डिवाइस की संख्या और अपनी समय-सीमा बताएँ।", ar: "أخبرنا بالتطبيقات وعدد المستخدمين أو الأجهزة والجدول الزمني." } },
  { id: "lifetime", handoff: true,
    label: { en: "Lifetime licence — price & negotiation", id: "Lisensi Lifetime — harga & negosiasi", ms: "Lesen seumur hidup — harga & rundingan", de: "Lifetime-Lizenz — Preis & Verhandlung", fr: "Licence à vie — prix et négociation", it: "Licenza a vita — prezzo e trattativa", zh: "终身许可证——价格与洽谈", ja: "買い切りライセンス — 価格と交渉", hi: "लाइफ़टाइम लाइसेंस — कीमत और बातचीत", ar: "ترخيص مدى الحياة — السعر والتفاوض" },
    hint: { en: "Which apps, how many devices (1–100), and your budget. Our team replies with a proposal.", id: "Aplikasi apa, berapa perangkat (1–100), dan budget Anda. Tim kami membalas dengan proposal.", ms: "Aplikasi mana, berapa peranti (1–100) dan bajet anda. Pasukan kami membalas dengan cadangan.", de: "Welche Apps, wie viele Geräte (1–100) und Ihr Budget. Unser Team antwortet mit einem Angebot.", fr: "Quelles applications, combien d'appareils (1 à 100) et votre budget. Notre équipe répond avec une proposition.", it: "Quali app, quanti dispositivi (1–100) e il tuo budget. Il nostro team risponde con una proposta.", zh: "需要哪些应用、多少台设备（1–100）以及预算。我们的团队会回复方案。", ja: "必要なアプリ、デバイス数（1〜100）、ご予算をお知らせください。担当チームが提案書でお返事します。", hi: "कौन-से ऐप, कितने डिवाइस (1–100) और आपका बजट। हमारी टीम प्रस्ताव के साथ जवाब देगी।", ar: "ما التطبيقات، وكم جهازًا (1–100)، وما ميزانيتك. يرد فريقنا بعرض." } },
  { id: "crypto", handoff: true,
    label: { en: "Pay with crypto (USDT, BTC, ETH…)", id: "Bayar dengan crypto (USDT, BTC, ETH…)", ms: "Bayar dengan kripto (USDT, BTC, ETH…)", de: "Mit Krypto bezahlen (USDT, BTC, ETH…)", fr: "Payer en crypto (USDT, BTC, ETH…)", it: "Paga in crypto (USDT, BTC, ETH…)", zh: "使用加密货币付款（USDT、BTC、ETH…）", ja: "暗号資産で支払う（USDT・BTC・ETH…）", hi: "क्रिप्टो से भुगतान (USDT, BTC, ETH…)", ar: "الدفع بالعملات المشفرة (USDT وBTC وETH…)" },
    hint: { en: "Ask for wallet details or send your transaction hash for confirmation.", id: "Minta detail wallet atau kirim hash transaksi untuk konfirmasi.", ms: "Minta butiran dompet atau hantar hash transaksi untuk pengesahan.", de: "Fragen Sie nach den Wallet-Daten oder senden Sie Ihren Transaktions-Hash zur Bestätigung.", fr: "Demandez les coordonnées du portefeuille ou envoyez le hash de votre transaction pour confirmation.", it: "Chiedi i dati del wallet o invia l'hash della transazione per la conferma.", zh: "索取钱包信息，或发送交易哈希以便确认。", ja: "ウォレット情報をお尋ねいただくか、確認のためトランザクションハッシュをお送りください。", hi: "वॉलेट विवरण माँगें या पुष्टि के लिए अपना ट्रांज़ैक्शन हैश भेजें।", ar: "اطلب تفاصيل المحفظة أو أرسل رمز معاملتك للتأكيد." } },
  { id: "bank", handoff: true,
    label: { en: "Pay by bank transfer (BNI / wire)", id: "Bayar via transfer bank (BNI / wire)", ms: "Bayar melalui pindahan bank (BNI / wayar)", de: "Per Banküberweisung zahlen (BNI / Auslandsüberweisung)", fr: "Payer par virement (BNI / international)", it: "Paga con bonifico (BNI / internazionale)", zh: "银行转账付款（BNI / 电汇）", ja: "銀行振込で支払う（BNI / 海外送金）", hi: "बैंक ट्रांसफ़र से भुगतान (BNI / वायर)", ar: "الدفع بالتحويل البنكي (BNI / دولي)" },
    hint: { en: "Ask for the invoice or send your transfer receipt for confirmation.", id: "Minta invoice atau kirim bukti transfer untuk konfirmasi.", ms: "Minta invois atau hantar resit pindahan untuk pengesahan.", de: "Fordern Sie die Rechnung an oder senden Sie Ihren Überweisungsbeleg zur Bestätigung.", fr: "Demandez la facture ou envoyez votre preuve de virement pour confirmation.", it: "Richiedi la fattura o invia la ricevuta del bonifico per la conferma.", zh: "索取发票，或发送转账凭证以便确认。", ja: "請求書をご依頼いただくか、確認のため振込控えをお送りください。", hi: "इनवॉइस माँगें या पुष्टि के लिए ट्रांसफ़र रसीद भेजें।", ar: "اطلب الفاتورة أو أرسل إيصال التحويل للتأكيد." } },
  { id: "enterprise", handoff: true,
    label: { en: "Enterprise / custom contract", id: "Enterprise / kontrak khusus", ms: "Enterprise / kontrak khas", de: "Enterprise / individueller Vertrag", fr: "Enterprise / contrat sur mesure", it: "Enterprise / contratto personalizzato", zh: "企业版 / 定制合同", ja: "Enterprise / 個別契約", hi: "Enterprise / कस्टम अनुबंध", ar: "Enterprise / عقد مخصص" },
    hint: { en: "SLA, on-premise, procurement, security review, reseller.", id: "SLA, on-premise, procurement, security review, reseller.", ms: "SLA, di premis, perolehan, semakan keselamatan, penjual semula.", de: "SLA, On-Premise, Beschaffung, Sicherheitsprüfung, Reseller.", fr: "SLA, on-premise, achats, revue de sécurité, revendeur.", it: "SLA, on-premise, procurement, revisione di sicurezza, rivenditori.", zh: "SLA、本地部署、采购、安全评审、经销商。", ja: "SLA、オンプレミス、調達、セキュリティ審査、リセラー。", hi: "SLA, ऑन-प्रिमाइस, ख़रीद, सुरक्षा समीक्षा, रीसेलर।", ar: "اتفاقية مستوى الخدمة، التثبيت المحلي، المشتريات، المراجعة الأمنية، إعادة البيع." } },
  { id: "billing", handoff: false,
    label: { en: "Billing, invoices & plans", id: "Tagihan, invoice & paket", ms: "Pengebilan, invois & pelan", de: "Abrechnung, Rechnungen & Tarife", fr: "Facturation, factures et offres", it: "Fatturazione, fatture e piani", zh: "账单、发票与套餐", ja: "請求・請求書・プラン", hi: "बिलिंग, इनवॉइस और प्लान", ar: "الفوترة والفواتير والباقات" },
    hint: { en: "Upgrades, renewals, invoices, refunds.", id: "Upgrade, perpanjangan, invoice, refund.", ms: "Naik taraf, pembaharuan, invois, bayaran balik.", de: "Upgrades, Verlängerungen, Rechnungen, Erstattungen.", fr: "Changements d'offre, renouvellements, factures, remboursements.", it: "Upgrade, rinnovi, fatture, rimborsi.", zh: "升级、续订、发票、退款。", ja: "アップグレード、更新、請求書、返金。", hi: "अपग्रेड, नवीनीकरण, इनवॉइस, रिफ़ंड।", ar: "الترقيات والتجديدات والفواتير والمبالغ المستردة." } },
  { id: "technical", handoff: false,
    label: { en: "Technical support", id: "Bantuan teknis", ms: "Sokongan teknikal", de: "Technischer Support", fr: "Support technique", it: "Supporto tecnico", zh: "技术支持", ja: "テクニカルサポート", hi: "तकनीकी सहायता", ar: "الدعم الفني" },
    hint: { en: "Web apps, BYOK keys, Docker / Windows installation, licence activation.", id: "Aplikasi web, key BYOK, instalasi Docker / Windows, aktivasi lisensi.", ms: "Aplikasi web, kunci BYOK, pemasangan Docker / Windows, pengaktifan lesen.", de: "Web-Apps, BYOK-Schlüssel, Docker-/Windows-Installation, Lizenzaktivierung.", fr: "Applications web, clés BYOK, installation Docker / Windows, activation de licence.", it: "App web, chiavi BYOK, installazione Docker / Windows, attivazione licenza.", zh: "网页应用、BYOK 密钥、Docker / Windows 安装、许可证激活。", ja: "Web アプリ、BYOK キー、Docker / Windows のインストール、ライセンス有効化。", hi: "वेब ऐप्स, BYOK कुंजियाँ, Docker / Windows इंस्टॉलेशन, लाइसेंस सक्रियण।", ar: "تطبيقات الويب ومفاتيح BYOK وتثبيت Docker / Windows وتفعيل التراخيص." } },
  { id: "account", handoff: false,
    label: { en: "Account & sign-in", id: "Akun & login", ms: "Akaun & log masuk", de: "Konto & Anmeldung", fr: "Compte et connexion", it: "Account e accesso", zh: "账户与登录", ja: "アカウントとサインイン", hi: "खाता और साइन-इन", ar: "الحساب وتسجيل الدخول" },
    hint: { en: "Password, e-mail, team access.", id: "Password, e-mail, akses tim.", ms: "Kata laluan, e-mel, akses pasukan.", de: "Passwort, E-Mail, Teamzugang.", fr: "Mot de passe, e-mail, accès équipe.", it: "Password, e-mail, accesso del team.", zh: "密码、邮箱、团队访问。", ja: "パスワード、メール、チームアクセス。", hi: "पासवर्ड, ई-मेल, टीम एक्सेस।", ar: "كلمة المرور والبريد الإلكتروني ووصول الفريق." } },
  { id: "other", handoff: false,
    label: { en: "Something else", id: "Lainnya", ms: "Lain-lain", de: "Etwas anderes", fr: "Autre chose", it: "Altro", zh: "其他", ja: "その他", hi: "कुछ और", ar: "شيء آخر" },
    hint: { en: "Anything else — we're happy to help.", id: "Apa pun — dengan senang hati kami bantu.", ms: "Apa-apa sahaja — kami sedia membantu.", de: "Alles andere — wir helfen gern.", fr: "Tout le reste — nous sommes là pour vous aider.", it: "Qualsiasi altra cosa: siamo felici di aiutarti.", zh: "其他任何问题——我们乐意帮忙。", ja: "その他何でも、お気軽にどうぞ。", hi: "कुछ भी और — हमें मदद करके ख़ुशी होगी।", ar: "أي شيء آخر — يسعدنا مساعدتك." } },
];

export function getTopic(id: unknown): Topic {
  return TOPICS.find((t) => t.id === id) || TOPICS[TOPICS.length - 1];
}
