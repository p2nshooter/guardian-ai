/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * Portal strings added in v3.2 (Managed AI page, My files, Lifetime licences,
 * and the copy that used to be hard-coded as English/Indonesian only).
 * EVERY key here is required in ALL 10 languages — the Record<K32, string>
 * types make a missing translation a compile error, so no page can fall back
 * to a mixed-language screen. Placeholders in {curly braces} stay as they are.
 * ============================================================================ */
import type { Lang } from "./i18n-shared";

export const V32_EN = {
  // Managed AI (member page)
  "managed.plansTitle": "Planned Managed AI plans",
  "managed.credits": "{n} AI credits / month",
  "managed.useOwn": "Use your own AI keys now",
  "managed.useOwnSub": "Every app already works with your own key. Google Gemini and Groq both have free tiers.",
  "managed.enabledTitle": "Managed AI is available",
  "managed.enabledSub": "Choose a plan and our team will activate it on your account.",
  "managed.contact": "Ask to activate",
  "managed.how": "How Managed AI works",
  "managed.how1": "AXTO provides the AI models — no API keys needed.",
  "managed.how2": "A monthly credit allowance: one credit is one AI run.",
  "managed.how3": "Completely separate from your own keys (BYOX) — nothing is shared between the two.",
} as const;

export type K32 = keyof typeof V32_EN;
type D = Record<K32, string>;

const id: D = {
  "managed.plansTitle": "Rencana paket Managed AI",
  "managed.credits": "{n} kredit AI / bulan",
  "managed.useOwn": "Pakai kunci AI Anda sekarang",
  "managed.useOwnSub": "Semua aplikasi sudah berjalan dengan kunci Anda sendiri. Google Gemini dan Groq sama-sama punya paket gratis.",
  "managed.enabledTitle": "Managed AI sudah tersedia",
  "managed.enabledSub": "Pilih paket, tim kami akan mengaktifkannya di akun Anda.",
  "managed.contact": "Minta aktivasi",
  "managed.how": "Cara kerja Managed AI",
  "managed.how1": "AXTO menyediakan model AI — tanpa perlu API key.",
  "managed.how2": "Jatah kredit bulanan: satu kredit = satu kali jalankan AI.",
  "managed.how3": "Terpisah total dari kunci Anda sendiri (BYOX) — tidak ada yang dipakai bersama.",
};

const ms: D = {
  "managed.plansTitle": "Pelan Managed AI yang dirancang",
  "managed.credits": "{n} kredit AI / bulan",
  "managed.useOwn": "Gunakan kunci AI anda sekarang",
  "managed.useOwnSub": "Setiap aplikasi sudah berfungsi dengan kunci anda sendiri. Google Gemini dan Groq kedua-duanya ada peringkat percuma.",
  "managed.enabledTitle": "Managed AI kini tersedia",
  "managed.enabledSub": "Pilih pelan dan pasukan kami akan mengaktifkannya pada akaun anda.",
  "managed.contact": "Minta pengaktifan",
  "managed.how": "Cara Managed AI berfungsi",
  "managed.how1": "AXTO menyediakan model AI — tiada kunci API diperlukan.",
  "managed.how2": "Peruntukan kredit bulanan: satu kredit ialah satu larian AI.",
  "managed.how3": "Terpisah sepenuhnya daripada kunci anda sendiri (BYOX) — tiada apa-apa dikongsi antara kedua-duanya.",
};

const de: D = {
  "managed.plansTitle": "Geplante Managed-AI-Tarife",
  "managed.credits": "{n} AI-Credits / Monat",
  "managed.useOwn": "Jetzt eigene AI-Schlüssel nutzen",
  "managed.useOwnSub": "Jede App funktioniert bereits mit Ihrem eigenen Schlüssel. Google Gemini und Groq bieten beide einen kostenlosen Tarif.",
  "managed.enabledTitle": "Managed AI ist verfügbar",
  "managed.enabledSub": "Wählen Sie einen Tarif – unser Team schaltet ihn für Ihr Konto frei.",
  "managed.contact": "Freischaltung anfragen",
  "managed.how": "So funktioniert Managed AI",
  "managed.how1": "AXTO stellt die AI-Modelle bereit – keine API-Schlüssel nötig.",
  "managed.how2": "Ein monatliches Credit-Kontingent: ein Credit entspricht einem AI-Lauf.",
  "managed.how3": "Vollständig getrennt von Ihren eigenen Schlüsseln (BYOX) – zwischen beiden wird nichts geteilt.",
};

const fr: D = {
  "managed.plansTitle": "Offres d'IA gérée prévues",
  "managed.credits": "{n} crédits IA / mois",
  "managed.useOwn": "Utiliser vos propres clés IA dès maintenant",
  "managed.useOwnSub": "Chaque application fonctionne déjà avec votre propre clé. Google Gemini et Groq proposent tous deux une offre gratuite.",
  "managed.enabledTitle": "L'IA gérée est disponible",
  "managed.enabledSub": "Choisissez une offre : notre équipe l'activera sur votre compte.",
  "managed.contact": "Demander l'activation",
  "managed.how": "Comment fonctionne l'IA gérée",
  "managed.how1": "AXTO fournit les modèles d'IA — aucune clé API nécessaire.",
  "managed.how2": "Un quota mensuel de crédits : un crédit correspond à une exécution d'IA.",
  "managed.how3": "Entièrement séparée de vos propres clés (BYOX) — rien n'est partagé entre les deux.",
};

const it: D = {
  "managed.plansTitle": "Piani di IA gestita previsti",
  "managed.credits": "{n} crediti IA / mese",
  "managed.useOwn": "Usa subito le tue chiavi IA",
  "managed.useOwnSub": "Ogni app funziona già con la tua chiave. Google Gemini e Groq offrono entrambi un piano gratuito.",
  "managed.enabledTitle": "L'IA gestita è disponibile",
  "managed.enabledSub": "Scegli un piano e il nostro team lo attiverà sul tuo account.",
  "managed.contact": "Richiedi l'attivazione",
  "managed.how": "Come funziona l'IA gestita",
  "managed.how1": "AXTO fornisce i modelli di IA: non servono chiavi API.",
  "managed.how2": "Un'allocazione mensile di crediti: un credito equivale a un'esecuzione IA.",
  "managed.how3": "Completamente separata dalle tue chiavi (BYOX): tra le due non viene condiviso nulla.",
};

const zh: D = {
  "managed.plansTitle": "规划中的托管 AI 套餐",
  "managed.credits": "每月 {n} 个 AI 积分",
  "managed.useOwn": "立即使用您自己的 AI 密钥",
  "managed.useOwnSub": "所有应用都已支持使用您自己的密钥。Google Gemini 和 Groq 均提供免费额度。",
  "managed.enabledTitle": "托管 AI 已开放",
  "managed.enabledSub": "选择一个套餐，我们的团队会为您的账户开通。",
  "managed.contact": "申请开通",
  "managed.how": "托管 AI 的工作方式",
  "managed.how1": "由 AXTO 提供 AI 模型，无需 API 密钥。",
  "managed.how2": "每月积分额度：一个积分等于一次 AI 运行。",
  "managed.how3": "与您自己的密钥（BYOX）完全分离，两者之间不共享任何内容。",
};

const ja: D = {
  "managed.plansTitle": "予定しているマネージド AI プラン",
  "managed.credits": "月 {n} AI クレジット",
  "managed.useOwn": "今すぐご自身の AI キーを使う",
  "managed.useOwnSub": "すべてのアプリはすでにご自身のキーで動作します。Google Gemini と Groq にはどちらも無料枠があります。",
  "managed.enabledTitle": "マネージド AI をご利用いただけます",
  "managed.enabledSub": "プランをお選びください。担当チームがアカウントで有効化します。",
  "managed.contact": "有効化を依頼する",
  "managed.how": "マネージド AI の仕組み",
  "managed.how1": "AXTO が AI モデルを提供するため、API キーは不要です。",
  "managed.how2": "毎月のクレジット枠：1 クレジット = AI 実行 1 回。",
  "managed.how3": "ご自身のキー（BYOX）とは完全に分離されており、両者で共有されるものはありません。",
};

const hi: D = {
  "managed.plansTitle": "प्रस्तावित मैनेज्ड AI प्लान",
  "managed.credits": "{n} AI क्रेडिट / माह",
  "managed.useOwn": "अभी अपनी AI कुंजियाँ इस्तेमाल करें",
  "managed.useOwnSub": "हर ऐप पहले से आपकी अपनी कुंजी से चलता है। Google Gemini और Groq दोनों में मुफ़्त टियर है।",
  "managed.enabledTitle": "मैनेज्ड AI उपलब्ध है",
  "managed.enabledSub": "प्लान चुनें, हमारी टीम उसे आपके खाते पर सक्रिय कर देगी।",
  "managed.contact": "सक्रिय करने का अनुरोध करें",
  "managed.how": "मैनेज्ड AI कैसे काम करता है",
  "managed.how1": "AI मॉडल AXTO देता है — किसी API कुंजी की ज़रूरत नहीं।",
  "managed.how2": "हर महीने क्रेडिट का कोटा: एक क्रेडिट = एक AI रन।",
  "managed.how3": "आपकी अपनी कुंजियों (BYOX) से पूरी तरह अलग — दोनों के बीच कुछ भी साझा नहीं होता।",
};

const ar: D = {
  "managed.plansTitle": "باقات الذكاء الاصطناعي المُدار المخطط لها",
  "managed.credits": "{n} رصيد ذكاء اصطناعي / شهريًا",
  "managed.useOwn": "استخدم مفاتيح الذكاء الاصطناعي الخاصة بك الآن",
  "managed.useOwnSub": "كل تطبيق يعمل بالفعل بمفتاحك الخاص. يوفّر كلٌّ من Google Gemini وGroq فئة مجانية.",
  "managed.enabledTitle": "الذكاء الاصطناعي المُدار متاح",
  "managed.enabledSub": "اختر باقة وسيقوم فريقنا بتفعيلها على حسابك.",
  "managed.contact": "اطلب التفعيل",
  "managed.how": "كيف يعمل الذكاء الاصطناعي المُدار",
  "managed.how1": "توفّر AXTO نماذج الذكاء الاصطناعي — لا حاجة إلى مفاتيح API.",
  "managed.how2": "رصيد شهري: الرصيد الواحد يساوي تشغيلًا واحدًا للذكاء الاصطناعي.",
  "managed.how3": "منفصل تمامًا عن مفاتيحك الخاصة (BYOX) — لا يُشارَك أي شيء بينهما.",
};

export const V32: Record<Exclude<Lang, "en">, D> = { id, ms, de, fr, it, zh, ja, hi, ar };
