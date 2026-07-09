/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
"use client";
/**
 * AXTO Global Locale Context
 * Auto-detects language from:
 *  1. localStorage (user's previous preference)
 *  2. Browser navigator.language
 *  3. Cloudflare CF-IPCountry header (via /api/fx-rates)
 * Default: English
 * No navbar toggle needed — fully automatic.
 */
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ── Supported locales ────────────────────────────────────────────────────────
export type Locale = "en"|"id"|"zh"|"ar"|"de"|"fr"|"es"|"pt"|"ja"|"ko"|"ms"|"th"|"vi"|"hi"|"tr"|"ru"|"nl"|"pl"|"it"|"sv";

export interface LocaleInfo {
  code:    Locale;
  label:   string;
  flag:    string;
  dir:     "ltr"|"rtl";
  country: string; // primary country
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code:"en", label:"English",    flag:"🇺🇸", dir:"ltr", country:"US" },
  { code:"id", label:"Indonesia",  flag:"🇮🇩", dir:"ltr", country:"ID" },
  { code:"zh", label:"中文",        flag:"🇨🇳", dir:"ltr", country:"CN" },
  { code:"ar", label:"العربية",    flag:"🇸🇦", dir:"rtl", country:"SA" },
  { code:"de", label:"Deutsch",    flag:"🇩🇪", dir:"ltr", country:"DE" },
  { code:"fr", label:"Français",   flag:"🇫🇷", dir:"ltr", country:"FR" },
  { code:"es", label:"Español",    flag:"🇪🇸", dir:"ltr", country:"ES" },
  { code:"pt", label:"Português",  flag:"🇧🇷", dir:"ltr", country:"BR" },
  { code:"ja", label:"日本語",      flag:"🇯🇵", dir:"ltr", country:"JP" },
  { code:"ko", label:"한국어",      flag:"🇰🇷", dir:"ltr", country:"KR" },
  { code:"ms", label:"Melayu",     flag:"🇲🇾", dir:"ltr", country:"MY" },
  { code:"th", label:"ไทย",        flag:"🇹🇭", dir:"ltr", country:"TH" },
  { code:"vi", label:"Tiếng Việt", flag:"🇻🇳", dir:"ltr", country:"VN" },
  { code:"hi", label:"हिन्दी",     flag:"🇮🇳", dir:"ltr", country:"IN" },
  { code:"tr", label:"Türkçe",     flag:"🇹🇷", dir:"ltr", country:"TR" },
  { code:"ru", label:"Русский",    flag:"🇷🇺", dir:"ltr", country:"RU" },
  { code:"nl", label:"Nederlands", flag:"🇳🇱", dir:"ltr", country:"NL" },
  { code:"it", label:"Italiano",   flag:"🇮🇹", dir:"ltr", country:"IT" },
  { code:"pl", label:"Polski",     flag:"🇵🇱", dir:"ltr", country:"PL" },
  { code:"sv", label:"Svenska",    flag:"🇸🇪", dir:"ltr", country:"SE" },
];

// Locales offered in the language picker. This is intentionally a SUBSET of
// SUPPORTED_LOCALES (which stays complete for currency/country detection):
// offering a locale whose TRANSLATIONS coverage is incomplete produces a
// page that is part-translated, part-English — worse than not offering it
// at all. As each locale reaches full key coverage for a given surface, add
// it here. Today: en/id are fully keyed for the public landing page.
export const ENABLED_LOCALES: Locale[] = ["en", "id"];

// ── Country → locale mapping ──────────────────────────────────────────────
const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  // Southeast Asia
  ID:"id", MY:"ms", SG:"en", TH:"th", VN:"vi", PH:"en", MM:"en",
  // East Asia
  CN:"zh", TW:"zh", HK:"zh", MO:"zh", JP:"ja", KR:"ko",
  // South Asia
  IN:"hi", PK:"en", BD:"en", LK:"en",
  // Middle East
  SA:"ar", AE:"ar", EG:"ar", KW:"ar", QA:"ar", BH:"ar", OM:"ar", IQ:"ar", JO:"ar", LB:"ar", SY:"ar", YE:"ar",
  // Europe - Western
  DE:"de", AT:"de", CH:"de",
  FR:"fr", BE:"fr", LU:"fr",
  ES:"es", MX:"es", AR:"es", CO:"es", CL:"es", PE:"es",
  PT:"pt", BR:"pt",
  IT:"it", NL:"nl", PL:"pl", SE:"sv", NO:"sv", DK:"sv",
  TR:"tr", RU:"ru", UA:"ru", BY:"ru",
  // Africa
  NG:"en", ZA:"en", GH:"en", KE:"en", ET:"en",
  // Anglosphere
  US:"en", GB:"en", CA:"en", AU:"en", NZ:"en", IE:"en",
};

// ── Currency mapping ──────────────────────────────────────────────────────
export const COUNTRY_CURRENCY: Record<string, string> = {
  // Southeast Asia
  ID:"IDR", MY:"MYR", SG:"SGD", TH:"THB", VN:"VND", PH:"PHP", MM:"MMK", KH:"KHR", LA:"LAK",
  // East Asia
  JP:"JPY", KR:"KRW", CN:"CNY", TW:"TWD", HK:"HKD", MO:"MOP",
  // South Asia
  IN:"INR", PK:"PKR", BD:"BDT", LK:"LKR", NP:"NPR",
  // Middle East
  SA:"SAR", AE:"AED", EG:"EGP", QA:"QAR", KW:"KWD", BH:"BHD", OM:"OMR", JO:"JOD", LB:"LBP", IQ:"IQD",
  // Europe
  DE:"EUR", FR:"EUR", ES:"EUR", IT:"EUR", NL:"EUR", PT:"EUR", BE:"EUR", AT:"EUR", IE:"EUR", FI:"EUR", GR:"EUR", LU:"EUR",
  GB:"GBP", CH:"CHF", SE:"SEK", NO:"NOK", DK:"DKK", PL:"PLN", CZ:"CZK", HU:"HUF", RO:"RON",
  // Americas
  US:"USD", CA:"CAD", MX:"MXN", BR:"BRL", AR:"ARS", CO:"COP", CL:"CLP", PE:"PEN",
  // Oceania
  AU:"AUD", NZ:"NZD",
  // Other
  RU:"RUB", TR:"TRY", UA:"UAH",
  NG:"NGN", ZA:"ZAR", GH:"GHS", KE:"KES",
};

// ── RTL locales ───────────────────────────────────────────────────────────
const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

// ── Context ───────────────────────────────────────────────────────────────
interface LocaleContextType {
  locale:   Locale;
  setLocale: (l: Locale) => void;
  currency:  string;
  fxRate:    number;
  fxSymbol:  string;
  isRTL:     boolean;
  country:   string;
  t:         (key: string) => string;
  fmtPrice:  (usd: number) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en", setLocale: () => {}, currency: "USD", fxRate: 1,
  fxSymbol: "$", isRTL: false, country: "",
  t: (k) => k, fmtPrice: (n) => "$" + n.toLocaleString(),
});

export function useLocale() { return useContext(LocaleContext); }

// ── All translations ──────────────────────────────────────────────────────
// Format: key → { en: "...", id: "...", zh: "...", ... }
// Fallback: always "en"
const TRANSLATIONS: Record<string, Partial<Record<Locale, string>>> = {
  // ── Navigation ──
  "nav.features":    { en:"Features",      id:"Fitur",        zh:"功能",     ar:"المميزات",  de:"Funktionen",  fr:"Fonctionnalités", es:"Características", pt:"Recursos",    ja:"機能",     ko:"기능" },
  "nav.pricing":     { en:"Pricing",       id:"Harga",        zh:"定价",     ar:"الأسعار",   de:"Preise",       fr:"Tarifs",          es:"Precios",         pt:"Preços",      ja:"料金",     ko:"요금" },
  "nav.guide":       { en:"📖 Guide",      id:"📖 Panduan",   zh:"📖 指南",  ar:"📖 الدليل", de:"📖 Anleitung", fr:"📖 Guide",        es:"📖 Guía",         pt:"📖 Guia",     ja:"📖 ガイド", ko:"📖 가이드" },
  "nav.portal":      { en:"Client Portal →", id:"Portal Client →", zh:"客户门户 →", ar:"بوابة العميل →", de:"Kundenportal →", fr:"Portail Client →", es:"Portal Cliente →", pt:"Portal →", ja:"クライアントポータル →", ko:"클라이언트 포털 →" },
  "nav.login":       { en:"Login",         id:"Masuk",        zh:"登录",     ar:"تسجيل الدخول", de:"Anmelden", fr:"Connexion",      es:"Iniciar sesión",  pt:"Entrar",      ja:"ログイン", ko:"로그인" },
  "nav.register":    { en:"Register",      id:"Daftar",       zh:"注册",     ar:"التسجيل",   de:"Registrieren", fr:"S'inscrire",      es:"Registrarse",     pt:"Registrar",   ja:"登録",     ko:"등록" },

  // ── Hero ──
  "hero.badge":      { en:"AI Security & Orchestration · Self-Hosted · 100% BYOK", id:"Keamanan AI & Orkestrasi · Self-Hosted · 100% BYOK", zh:"AI安全与编排 · 自托管 · 100% BYOK", ar:"أمان وتنسيق الذكاء الاصطناعي · مستضاف ذاتياً · BYOK 100٪", de:"KI-Sicherheit & Orchestrierung · Self-Hosted · 100% BYOK", fr:"Sécurité IA & Orchestration · Auto-hébergé · 100% BYOK", es:"Seguridad IA y Orquestación · Auto-alojado · 100% BYOK", pt:"Segurança IA & Orquestração · Self-Hosted · 100% BYOK", ja:"AIセキュリティ＆オーケストレーション · セルフホスト · 100% BYOK", ko:"AI 보안 & 오케스트레이션 · 셀프호스팅 · 100% BYOK" },
  "hero.cta":        { en:"Get Started →", id:"Mulai Sekarang →", zh:"立即开始 →", ar:"ابدأ الآن →", de:"Jetzt starten →", fr:"Commencer →", es:"Empezar →", pt:"Começar →", ja:"今すぐ始める →", ko:"시작하기 →" },
  "hero.demo":       { en:"View Demo",     id:"Lihat Demo",   zh:"查看演示",  ar:"عرض تجريبي", de:"Demo ansehen", fr:"Voir la démo",   es:"Ver demo",        pt:"Ver demo",    ja:"デモを見る", ko:"데모 보기" },
  "hero.setup_time": { en:"~15-30 min setup · No vendor lock-in", id:"Setup ~15-30 menit · Bebas vendor lock-in", zh:"~15-30分钟设置 · 无供应商锁定", ar:"~15-30 دقيقة للإعداد · بدون قيود مزود", de:"~15-30 Min. Einrichtung · Kein Vendor Lock-in", fr:"~15-30 min d'installation · Pas de verrouillage fournisseur", es:"~15-30 min de configuración · Sin bloqueo de proveedor", pt:"~15-30 min de configuração · Sem lock-in", ja:"約15-30分でセットアップ · ベンダーロックインなし", ko:"~15-30분 설치 · 벤더 종속 없음" },

  // ── Pricing ──
  "pricing.title":   { en:"Simple, Transparent Pricing", id:"Harga Sederhana dan Transparan", zh:"简单透明的定价", ar:"تسعير بسيط وشفاف", de:"Einfache, transparente Preise", fr:"Tarification simple et transparente", es:"Precios simples y transparentes", pt:"Preços simples e transparentes", ja:"シンプルで透明な価格設定", ko:"간단하고 투명한 요금제" },
  "pricing.per_yr":  { en:"/year",    id:"/tahun",   zh:"/年",   ar:"/سنة",  de:"/Jahr",  fr:"/an",   es:"/año",  pt:"/ano",  ja:"/年",   ko:"/년" },
  "pricing.per_mo":  { en:"/mo",      id:"/bln",     zh:"/月",   ar:"/شهر",  de:"/Mo.",   fr:"/mois", es:"/mes",  pt:"/mês",  ja:"/月",   ko:"/월" },
  "pricing.popular": { en:"MOST POPULAR", id:"PALING POPULER", zh:"最受欢迎", ar:"الأكثر شعبية", de:"AM BELIEBTESTEN", fr:"LE PLUS POPULAIRE", es:"MÁS POPULAR", pt:"MAIS POPULAR", ja:"最人気", ko:"가장 인기" },
  "pricing.get":     { en:"Get Started →", id:"Mulai →",   zh:"开始使用 →", ar:"ابدأ الآن →", de:"Starten →", fr:"Commencer →", es:"Empezar →", pt:"Começar →", ja:"始める →", ko:"시작하기 →" },
  "pricing.save":    { en:"Save",     id:"Hemat",    zh:"节省",   ar:"وفر",    de:"Spare",  fr:"Économisez", es:"Ahorra", pt:"Poupa",  ja:"節約",  ko:"절약" },
  "pricing.bundle":  { en:"Bundle — best value", id:"Bundle — harga terbaik", zh:"套餐 — 最佳价值", ar:"حزمة — أفضل قيمة", de:"Bundle — bestes Preis-Leistungs-Verhältnis", fr:"Pack — meilleur rapport qualité-prix", es:"Bundle — mejor valor", pt:"Bundle — melhor custo-benefício", ja:"バンドル — 最高のコスパ", ko:"번들 — 최고의 가성비" },

  // ── Setup / Download flow ──
  "setup.step1.title": { en:"1. Purchase License",   id:"1. Beli Lisensi",          zh:"1. 购买许可证",     ar:"1. شراء الترخيص",       de:"1. Lizenz kaufen",          fr:"1. Acheter une licence",  es:"1. Comprar Licencia",       pt:"1. Comprar Licença",     ja:"1. ライセンス購入",   ko:"1. 라이선스 구매" },
  "setup.step1.desc":  { en:"Choose your plan at axto.io. Pay via Stripe, PayPal, Xendit, or Midtrans. License key sent to your email instantly.", id:"Pilih paket di axto.io. Bayar via Stripe, PayPal, Xendit, atau Midtrans. License key dikirim ke email Anda langsung.", zh:"在axto.io选择您的计划。通过Stripe、PayPal等支付。许可证密钥立即发送到您的电子邮件。", ar:"اختر خطتك في axto.io. ادفع عبر Stripe أو PayPal. مفتاح الترخيص يُرسل فوراً إلى بريدك الإلكتروني.", de:"Wählen Sie Ihren Plan auf axto.io. Zahlen Sie per Stripe, PayPal oder Xendit. Lizenzschlüssel sofort per E-Mail.", fr:"Choisissez votre plan sur axto.io. Payez via Stripe, PayPal, Xendit. Clé de licence envoyée immédiatement.", es:"Elige tu plan en axto.io. Paga con Stripe, PayPal, Xendit. Clave de licencia enviada inmediatamente.", pt:"Escolha seu plano em axto.io. Pague via Stripe, PayPal, Xendit. Chave enviada imediatamente por email.", ja:"axto.ioでプランを選択。Stripe、PayPal等で支払い。ライセンスキーが即座にメールで届きます。", ko:"axto.io에서 플랜 선택. Stripe, PayPal 등으로 결제. 라이선스 키가 즉시 이메일로 전송됩니다." },

  "setup.step2.title": { en:"2. Download Package",    id:"2. Download Paket",        zh:"2. 下载软件包",     ar:"2. تنزيل الحزمة",        de:"2. Paket herunterladen",    fr:"2. Télécharger le paquet", es:"2. Descargar Paquete",      pt:"2. Baixar Pacote",       ja:"2. パッケージのダウンロード", ko:"2. 패키지 다운로드" },
  "setup.step2.desc":  { en:"Login to portal → Licenses tab → click ⬇ Download. One ZIP contains all Docker images + installer. Works offline.", id:"Login ke portal → tab Licenses → klik ⬇ Download. Satu ZIP berisi semua Docker images + installer. Tidak butuh internet saat install.", zh:"登录门户 → 许可证选项卡 → 点击⬇下载。一个ZIP包含所有Docker镜像+安装程序。离线安装。", ar:"سجّل دخولك للبوابة ← تبويب التراخيص ← انقر ⬇ تنزيل. ملف ZIP واحد يحتوي على جميع صور Docker + المثبت. يعمل دون اتصال.", de:"Portal anmelden → Lizenzen-Tab → ⬇ Herunterladen. Eine ZIP enthält alle Docker-Images + Installer. Offline nutzbar.", fr:"Connectez-vous au portail → onglet Licences → cliquez ⬇ Télécharger. Un ZIP contient toutes les images Docker + installateur.", es:"Inicia sesión en el portal → pestaña Licencias → clic ⬇ Descargar. Un ZIP con todas las imágenes Docker + instalador.", pt:"Login no portal → aba Licenças → clique ⬇ Download. Um ZIP com todas as imagens Docker + instalador.", ja:"ポータルにログイン → ライセンスタブ → ⬇ダウンロード。1つのZIPに全Dockerイメージ+インストーラー。", ko:"포털 로그인 → 라이선스 탭 → ⬇ 다운로드. Docker 이미지 + 설치 프로그램이 포함된 ZIP 1개." },

  "setup.step3.title": { en:"3. Activate License",    id:"3. Aktifkan Lisensi",      zh:"3. 激活许可证",     ar:"3. تفعيل الترخيص",       de:"3. Lizenz aktivieren",      fr:"3. Activer la licence",    es:"3. Activar Licencia",       pt:"3. Ativar Licença",      ja:"3. ライセンス認証",   ko:"3. 라이선스 활성화" },
  "setup.step3.desc":  { en:"Run install.sh → open browser → http://YOUR_SERVER:8080 → activation wizard appears automatically → paste license key → click Activate. No file editing required.", id:"Jalankan install.sh → buka browser → http://YOUR_SERVER:8080 → wizard aktivasi muncul otomatis → paste license key → klik Activate. Tidak perlu edit file apapun.", zh:"运行install.sh → 打开浏览器 → http://YOUR_SERVER:8080 → 激活向导自动出现 → 粘贴许可证密钥 → 点击激活。无需编辑文件。", ar:"شغّل install.sh ← افتح المتصفح ← http://YOUR_SERVER:8080 ← يظهر معالج التفعيل تلقائياً ← الصق مفتاح الترخيص ← انقر تفعيل. لا حاجة لتعديل أي ملف.", de:"install.sh ausführen → Browser öffnen → http://IHR_SERVER:8080 → Aktivierungsassistent erscheint automatisch → Lizenzschlüssel einfügen → Aktivieren.", fr:"Exécutez install.sh → ouvrez le navigateur → http://VOTRE_SERVEUR:8080 → l'assistant d'activation apparaît automatiquement → collez la clé → Activer.", es:"Ejecuta install.sh → abre el navegador → http://TU_SERVIDOR:8080 → el asistente de activación aparece automáticamente → pega la clave → Activar.", pt:"Execute install.sh → abra o navegador → http://SEU_SERVIDOR:8080 → assistente de ativação aparece automaticamente → cole a chave → Ativar.", ja:"install.shを実行 → ブラウザを開く → http://YOUR_SERVER:8080 → アクティベーションウィザードが自動表示 → ライセンスキーを貼り付け → 有効化。", ko:"install.sh 실행 → 브라우저 열기 → http://YOUR_SERVER:8080 → 활성화 마법사 자동 표시 → 라이선스 키 붙여넣기 → 활성화." },

  "setup.step4.title": { en:"4. Deploy & Start",      id:"4. Deploy & Mulai",        zh:"4. 部署并启动",     ar:"4. النشر والبدء",         de:"4. Deployen & Starten",     fr:"4. Déployer et démarrer",  es:"4. Desplegar e iniciar",    pt:"4. Implantar e Iniciar",  ja:"4. デプロイ＆開始",   ko:"4. 배포 및 시작" },
  "setup.step4.desc":  { en:"docker compose up -d → dashboard live at port 8080. All features unlocked after license activation. Add AI API keys in Settings for full BYOK mode.", id:"docker compose up -d → dashboard aktif di port 8080. Semua fitur aktif setelah aktivasi lisensi. Tambah AI API key di Settings untuk mode BYOK.", zh:"docker compose up -d → 仪表板在8080端口上线。许可证激活后所有功能解锁。在设置中添加AI API密钥。", ar:"docker compose up -d → لوحة التحكم تعمل على المنفذ 8080. جميع الميزات مفعّلة بعد تفعيل الترخيص.", de:"docker compose up -d → Dashboard auf Port 8080 aktiv. Alle Funktionen nach Lizenzaktivierung freigeschaltet.", fr:"docker compose up -d → tableau de bord actif sur le port 8080. Toutes les fonctionnalités débloquées.", es:"docker compose up -d → dashboard activo en el puerto 8080. Todas las funciones desbloqueadas.", pt:"docker compose up -d → dashboard ativo na porta 8080. Todos os recursos desbloqueados.", ja:"docker compose up -d → ポート8080でダッシュボードが起動。ライセンス認証後、全機能が利用可能。", ko:"docker compose up -d → 포트 8080에서 대시보드 활성화. 라이선스 활성화 후 모든 기능 사용 가능." },

  // ── Setup step detail lines (d1–d6) ──
  "setup.step3.d1": { en:"Run: sudo bash install.sh (loads Docker images offline — no internet required)", id:"Jalankan: sudo bash install.sh (memuat Docker images offline — tidak butuh internet)", zh:"运行：sudo bash install.sh（离线加载Docker镜像—无需联网）", ar:"شغّل: sudo bash install.sh (يحمّل صور Docker بلا إنترنت)", de:"Ausführen: sudo bash install.sh (lädt Docker-Images offline)", fr:"Exécuter: sudo bash install.sh (charge les images Docker hors ligne)", es:"Ejecutar: sudo bash install.sh (carga imágenes Docker sin internet)", pt:"Executar: sudo bash install.sh (carrega imagens Docker offline)", ja:"実行: sudo bash install.sh（オフラインでDockerイメージをロード）", ko:"실행: sudo bash install.sh (오프라인으로 Docker 이미지 로드)" },
  "setup.step3.d2": { en:"Run: docker compose up -d", id:"Jalankan: docker compose up -d", zh:"运行：docker compose up -d", ar:"شغّل: docker compose up -d", de:"Ausführen: docker compose up -d", fr:"Exécuter: docker compose up -d", es:"Ejecutar: docker compose up -d", pt:"Executar: docker compose up -d", ja:"実行: docker compose up -d", ko:"실행: docker compose up -d" },
  "setup.step3.d3": { en:"Open browser: http://YOUR_SERVER_IP:8080", id:"Buka browser: http://YOUR_SERVER_IP:8080", zh:"打开浏览器：http://YOUR_SERVER_IP:8080", ar:"افتح المتصفح: http://YOUR_SERVER_IP:8080", de:"Browser öffnen: http://IHR_SERVER_IP:8080", fr:"Ouvrir le navigateur: http://VOTRE_SERVEUR_IP:8080", es:"Abrir navegador: http://TU_SERVIDOR_IP:8080", pt:"Abrir navegador: http://SEU_SERVIDOR_IP:8080", ja:"ブラウザを開く: http://YOUR_SERVER_IP:8080", ko:"브라우저 열기: http://YOUR_SERVER_IP:8080" },
  "setup.step3.d4": { en:"Activation wizard appears automatically — no file editing needed", id:"Wizard aktivasi muncul otomatis — tidak perlu edit file apapun", zh:"激活向导自动出现—无需编辑任何文件", ar:"يظهر معالج التفعيل تلقائياً — لا حاجة لتعديل أي ملف", de:"Aktivierungsassistent erscheint automatisch — keine Dateibearbeitung nötig", fr:"L'assistant d'activation apparaît automatiquement — aucune édition de fichier", es:"El asistente de activación aparece automáticamente — no se necesita editar archivos", pt:"Assistente de ativação aparece automaticamente — sem edição de arquivos", ja:"アクティベーションウィザードが自動表示—ファイル編集不要", ko:"활성화 마법사 자동 표시 — 파일 편집 불필요" },
  "setup.step3.d5": { en:"Paste your license key from the portal → click Activate & Start", id:"Tempel license key dari portal → klik Activate & Start", zh:"粘贴门户中的许可证密钥 → 点击激活并开始", ar:"الصق مفتاح الترخيص من البوابة ← انقر تفعيل والبدء", de:"Lizenzschlüssel aus dem Portal einfügen → Aktivieren & Starten klicken", fr:"Collez la clé de licence du portail → cliquez Activer et démarrer", es:"Pega la clave de licencia del portal → haz clic en Activar e Iniciar", pt:"Cole a chave de licença do portal → clique em Ativar e Iniciar", ja:"ポータルからライセンスキーを貼り付け → アクティベートして開始をクリック", ko:"포털의 라이선스 키 붙여넣기 → 활성화 및 시작 클릭" },
  "setup.step3.d6": { en:"You are redirected to the dashboard — all features are immediately active", id:"Anda diarahkan ke dashboard — semua fitur langsung aktif", zh:"您将被重定向到仪表板—所有功能立即激活", ar:"ستُحوَّل إلى لوحة التحكم — جميع الميزات مفعّلة فوراً", de:"Sie werden zum Dashboard weitergeleitet — alle Funktionen sofort aktiv", fr:"Vous êtes redirigé vers le tableau de bord — toutes les fonctionnalités sont actives", es:"Eres redirigido al dashboard — todas las funciones están activas inmediatamente", pt:"Você é redirecionado ao dashboard — todos os recursos estão ativos imediatamente", ja:"ダッシュボードにリダイレクト—すべての機能がすぐに利用可能", ko:"대시보드로 리디렉션 — 모든 기능이 즉시 활성화됨" },

  "setup.step4.d1": { en:"Make sure Docker Engine is installed on your server (Docker 20.10+)", id:"Pastikan Docker Engine terinstall di server Anda (Docker 20.10+)", zh:"确保服务器已安装Docker Engine（Docker 20.10+）", ar:"تأكد من تثبيت Docker Engine على خادمك (Docker 20.10+)", de:"Stellen Sie sicher, dass Docker Engine installiert ist (Docker 20.10+)", fr:"Assurez-vous que Docker Engine est installé (Docker 20.10+)", es:"Asegúrate de tener Docker Engine instalado (Docker 20.10+)", pt:"Certifique-se de ter o Docker Engine instalado (Docker 20.10+)", ja:"Docker Engineがインストールされていることを確認（Docker 20.10+）", ko:"Docker Engine이 설치되어 있는지 확인 (Docker 20.10+)" },
  "setup.step4.d2": { en:"Extract ZIP: unzip axto-guardian-bundle-docker-linux.zip", id:"Ekstrak ZIP: unzip axto-guardian-bundle-docker-linux.zip", zh:"解压ZIP：unzip axto-guardian-bundle-docker-linux.zip", ar:"استخرج ZIP: unzip axto-guardian-bundle-docker-linux.zip", de:"ZIP entpacken: unzip axto-guardian-bundle-docker-linux.zip", fr:"Extraire ZIP: unzip axto-guardian-bundle-docker-linux.zip", es:"Extraer ZIP: unzip axto-guardian-bundle-docker-linux.zip", pt:"Extrair ZIP: unzip axto-guardian-bundle-docker-linux.zip", ja:"ZIP展開: unzip axto-guardian-bundle-docker-linux.zip", ko:"ZIP 압축 해제: unzip axto-guardian-bundle-docker-linux.zip" },
  "setup.step4.d3": { en:"Run: sudo bash install.sh (loads Docker images offline, ~2–3 min)", id:"Jalankan: sudo bash install.sh (muat Docker images offline, ~2–3 menit)", zh:"运行：sudo bash install.sh（离线加载Docker镜像，约2–3分钟）", ar:"شغّل: sudo bash install.sh (يحمّل صور Docker بلا إنترنت، ~2–3 دقائق)", de:"Ausführen: sudo bash install.sh (~2–3 Min. offline)", fr:"Exécuter: sudo bash install.sh (~2–3 min hors ligne)", es:"Ejecutar: sudo bash install.sh (~2–3 min sin internet)", pt:"Executar: sudo bash install.sh (~2–3 min offline)", ja:"実行: sudo bash install.sh（オフライン~2–3分）", ko:"실행: sudo bash install.sh (오프라인 ~2–3분)" },
  "setup.step4.d4": { en:"Run: docker compose up -d", id:"Jalankan: docker compose up -d", zh:"运行：docker compose up -d", ar:"شغّل: docker compose up -d", de:"Ausführen: docker compose up -d", fr:"Exécuter: docker compose up -d", es:"Ejecutar: docker compose up -d", pt:"Executar: docker compose up -d", ja:"実行: docker compose up -d", ko:"실행: docker compose up -d" },
  "setup.step4.d5": { en:"Wait ~60 seconds until all containers report healthy", id:"Tunggu ~60 detik hingga semua container healthy", zh:"等待约60秒直到所有容器显示healthy", ar:"انتظر ~60 ثانية حتى تظهر جميع الحاويات healthy", de:"~60 Sekunden warten bis alle Container healthy sind", fr:"Attendre ~60 secondes que tous les conteneurs soient healthy", es:"Esperar ~60 segundos hasta que todos los contenedores estén healthy", pt:"Aguardar ~60 segundos até todos os containers estarem healthy", ja:"すべてのコンテナがhealthyになるまで~60秒待機", ko:"모든 컨테이너가 healthy 상태가 될 때까지 ~60초 대기" },
  "setup.step4.d6": { en:"Open browser: http://YOUR_SERVER:8080 → activation wizard appears", id:"Buka browser: http://YOUR_SERVER:8080 → wizard aktivasi muncul", zh:"打开浏览器: http://YOUR_SERVER:8080 → 激活向导出现", ar:"افتح المتصفح: http://YOUR_SERVER:8080 ← يظهر معالج التفعيل", de:"Browser öffnen: http://IHR_SERVER:8080 → Assistent erscheint", fr:"Ouvrir le navigateur: http://VOTRE_SERVEUR:8080 → l'assistant apparaît", es:"Abrir navegador: http://TU_SERVIDOR:8080 → aparece el asistente", pt:"Abrir navegador: http://SEU_SERVIDOR:8080 → assistente aparece", ja:"ブラウザ: http://YOUR_SERVER:8080 → ウィザード表示", ko:"브라우저: http://YOUR_SERVER:8080 → 마법사 표시" },

  "setup.step5.title": { en:"5. Or Use EXE Binary (No Docker)", id:"5. Atau Gunakan EXE Binary (Tanpa Docker)", zh:"5. 或使用EXE二进制文件（无需Docker）", ar:"5. أو استخدم EXE Binary (بدون Docker)", de:"5. Oder EXE Binary nutzen (ohne Docker)", fr:"5. Ou utiliser le binaire EXE (sans Docker)", es:"5. O usar EXE binario (sin Docker)", pt:"5. Ou usar EXE binário (sem Docker)", ja:"5. またはEXEバイナリを使用（Dockerなし）", ko:"5. 또는 EXE 바이너리 사용 (Docker 없이)" },
  "setup.step5.desc": { en:"Download EXE binary for Linux or Windows from your portal. Run install.sh / install.bat — the binary starts automatically as a systemd service. Docker is not required.", id:"Download EXE binary Linux atau Windows dari portal. Jalankan install.sh / install.bat — binary langsung berjalan sebagai systemd service. Tidak butuh Docker.", zh:"从门户下载Linux或Windows EXE二进制文件。运行install.sh/install.bat — 二进制文件自动作为systemd服务启动。不需要Docker。", ar:"نزّل ملف EXE لـ Linux أو Windows من البوابة. شغّل install.sh / install.bat — يبدأ الملف تلقائياً كـ systemd service. لا حاجة لـ Docker.", de:"EXE-Binary für Linux oder Windows aus dem Portal herunterladen. install.sh / install.bat ausführen — Binary startet automatisch als systemd-Dienst. Docker nicht erforderlich.", fr:"Téléchargez le binaire EXE pour Linux ou Windows depuis le portail. Exécutez install.sh / install.bat — le binaire démarre automatiquement en tant que service systemd. Docker n'est pas requis.", es:"Descarga el binario EXE para Linux o Windows desde el portal. Ejecuta install.sh / install.bat — el binario arranca automáticamente como servicio systemd. No se requiere Docker.", pt:"Baixe o binário EXE para Linux ou Windows do portal. Execute install.sh / install.bat — o binário inicia automaticamente como serviço systemd. Docker não é necessário.", ja:"ポータルからLinuxまたはWindows EXEバイナリをダウンロード。install.sh/install.batを実行 — バイナリはsystemdサービスとして自動起動。Dockerは不要。", ko:"포털에서 Linux 또는 Windows EXE 바이너리 다운로드. install.sh / install.bat 실행 — 바이너리가 자동으로 systemd 서비스로 시작. Docker 불필요." },
  "setup.step5.d1": { en:"Download EXE ZIP from portal (e.g. axto-guardian-bundle-exe-linux.zip)", id:"Download EXE ZIP dari portal (misal: axto-guardian-bundle-exe-linux.zip)", zh:"从门户下载EXE ZIP（如：axto-guardian-bundle-exe-linux.zip）", ar:"نزّل ZIP من البوابة (مثل: axto-guardian-bundle-exe-linux.zip)", de:"EXE ZIP aus dem Portal herunterladen", fr:"Télécharger le ZIP EXE depuis le portail", es:"Descargar ZIP EXE desde el portal", pt:"Baixar ZIP EXE do portal", ja:"ポータルからEXE ZIPをダウンロード", ko:"포털에서 EXE ZIP 다운로드" },
  "setup.step5.d2": { en:"Extract and run: sudo bash install.sh", id:"Ekstrak dan jalankan: sudo bash install.sh", zh:"解压并运行：sudo bash install.sh", ar:"استخرج وشغّل: sudo bash install.sh", de:"Entpacken und ausführen: sudo bash install.sh", fr:"Extraire et exécuter: sudo bash install.sh", es:"Extraer y ejecutar: sudo bash install.sh", pt:"Extrair e executar: sudo bash install.sh", ja:"展開して実行: sudo bash install.sh", ko:"압축 해제 후 실행: sudo bash install.sh" },
  "setup.step5.d3": { en:"Windows: run install.bat as Administrator", id:"Windows: jalankan install.bat sebagai Administrator", zh:"Windows：以管理员身份运行install.bat", ar:"ويندوز: شغّل install.bat كمسؤول", de:"Windows: install.bat als Administrator ausführen", fr:"Windows: exécuter install.bat en tant qu'Administrateur", es:"Windows: ejecutar install.bat como Administrador", pt:"Windows: executar install.bat como Administrador", ja:"Windows: install.batを管理者として実行", ko:"Windows: Administrator로 install.bat 실행" },
  "setup.step5.d4": { en:"Binary automatically registers as a systemd service (Linux) or Windows Service", id:"Binary otomatis terdaftar sebagai systemd service (Linux) atau Windows Service", zh:"二进制文件自动注册为systemd服务（Linux）或Windows Service", ar:"يُسجَّل الملف تلقائياً كـ systemd service (Linux) أو Windows Service", de:"Binary registriert sich automatisch als systemd-Dienst oder Windows-Dienst", fr:"Le binaire s'enregistre automatiquement comme service systemd ou Windows", es:"El binario se registra automáticamente como servicio systemd o Windows Service", pt:"O binário registra-se automaticamente como serviço systemd ou Windows Service", ja:"バイナリはsystemdサービス（Linux）またはWindowsサービスとして自動登録", ko:"바이너리가 자동으로 systemd 서비스(Linux) 또는 Windows 서비스로 등록" },
  "setup.step5.d5": { en:"Open browser: http://YOUR_SERVER:8080 → activation wizard", id:"Buka browser: http://YOUR_SERVER:8080 → wizard aktivasi", zh:"打开浏览器: http://YOUR_SERVER:8080 → 激活向导", ar:"افتح المتصفح: http://YOUR_SERVER:8080 ← معالج التفعيل", de:"Browser öffnen: http://IHR_SERVER:8080 → Aktivierungsassistent", fr:"Navigateur: http://VOTRE_SERVEUR:8080 → assistant d'activation", es:"Navegador: http://TU_SERVIDOR:8080 → asistente de activación", pt:"Navegador: http://SEU_SERVIDOR:8080 → assistente de ativação", ja:"ブラウザ: http://YOUR_SERVER:8080 → アクティベーションウィザード", ko:"브라우저: http://YOUR_SERVER:8080 → 활성화 마법사" },
  "setup.step5.d6": { en:"Docker is not required — standalone binary with all dependencies bundled", id:"Docker tidak diperlukan — binary standalone dengan semua dependensi terpacked", zh:"不需要Docker — 独立二进制文件包含所有依赖项", ar:"لا حاجة لـ Docker — ملف مستقل يحتوي على جميع التبعيات", de:"Docker nicht erforderlich — standalone Binary mit allen Abhängigkeiten", fr:"Docker non requis — binaire autonome avec toutes les dépendances", es:"Docker no requerido — binario independiente con todas las dependencias", pt:"Docker não necessário — binário independente com todas as dependências", ja:"Docker不要 — すべての依存関係が含まれたスタンドアロンバイナリ", ko:"Docker 불필요 — 모든 종속성이 포함된 독립 실행형 바이너리" },

  "setup.step6.title": { en:"6. Connect Your AI API Keys", id:"6. Hubungkan API Key AI Anda", zh:"6. 连接您的AI API密钥", ar:"6. اربط مفاتيح API الذكاء الاصطناعي", de:"6. Ihre KI API-Schlüssel verbinden", fr:"6. Connecter vos clés API AI", es:"6. Conectar tus claves API de IA", pt:"6. Conectar suas chaves de API de IA", ja:"6. AI APIキーを接続する", ko:"6. AI API 키 연결" },
  "setup.step6.desc": { en:"Orchestra AI is a drop-in replacement for the OpenAI API. Change base_url in your app to the Orchestra endpoint. Requests are automatically routed to the best provider.", id:"Orchestra AI adalah pengganti drop-in untuk OpenAI API. Ubah base_url di aplikasi Anda ke endpoint Orchestra. Request otomatis diarahkan ke provider terbaik.", zh:"Orchestra AI是OpenAI API的即插即用替代品。将应用中的base_url改为Orchestra端点。请求自动路由到最佳提供商。", ar:"Orchestra AI بديل مباشر لـ OpenAI API. غيّر base_url في تطبيقك إلى نقطة Orchestra. يتم توجيه الطلبات تلقائياً للمزود الأفضل.", de:"Orchestra AI ist ein Drop-in-Ersatz für die OpenAI API. Ändern Sie base_url in Ihrer App zum Orchestra-Endpunkt.", fr:"Orchestra AI est un remplacement direct de l'API OpenAI. Changez base_url dans votre app vers l'endpoint Orchestra.", es:"Orchestra AI es un reemplazo directo de la API de OpenAI. Cambia base_url en tu app al endpoint de Orchestra.", pt:"Orchestra AI é um substituto direto da API OpenAI. Mude base_url no seu app para o endpoint Orchestra.", ja:"Orchestra AIはOpenAI APIのドロップイン代替品。アプリのbase_urlをOrchestraエンドポイントに変更。", ko:"Orchestra AI는 OpenAI API의 드롭인 대체품입니다. 앱의 base_url을 Orchestra 엔드포인트로 변경하세요." },
  "setup.step6.d1": { en:"Orchestra endpoint: http://YOUR_SERVER:8080/v1/chat/completions", id:"Endpoint Orchestra: http://YOUR_SERVER:8080/v1/chat/completions", zh:"Orchestra端点：http://YOUR_SERVER:8080/v1/chat/completions", ar:"نقطة Orchestra: http://YOUR_SERVER:8080/v1/chat/completions", de:"Orchestra-Endpunkt: http://IHR_SERVER:8080/v1/chat/completions", fr:"Endpoint Orchestra: http://VOTRE_SERVEUR:8080/v1/chat/completions", es:"Endpoint Orchestra: http://TU_SERVIDOR:8080/v1/chat/completions", pt:"Endpoint Orchestra: http://SEU_SERVIDOR:8080/v1/chat/completions", ja:"Orchestraエンドポイント: http://YOUR_SERVER:8080/v1/chat/completions", ko:"Orchestra 엔드포인트: http://YOUR_SERVER:8080/v1/chat/completions" },
  "setup.step6.d2": { en:"Change base_url in your app — no other code changes needed", id:"Ubah base_url di aplikasi Anda — tidak perlu ubah kode lain", zh:"更改应用中的base_url — 无需其他代码更改", ar:"غيّر base_url في تطبيقك — لا حاجة لتغييرات أخرى", de:"base_url in Ihrer App ändern — keine anderen Codeänderungen nötig", fr:"Changez base_url dans votre app — aucune autre modification nécessaire", es:"Cambia base_url en tu app — no se necesitan otros cambios", pt:"Mude base_url no seu app — sem outras alterações necessárias", ja:"アプリのbase_urlを変更 — 他のコード変更不要", ko:"앱의 base_url 변경 — 다른 코드 변경 불필요" },
  "setup.step6.d3": { en:"Orchestra automatically routes to the cheapest / fastest available provider", id:"Orchestra otomatis memilih provider termurah/tercepat yang tersedia", zh:"Orchestra自动路由到最便宜/最快的可用提供商", ar:"يوجّه Orchestra تلقائياً للمزود الأرخص والأسرع", de:"Orchestra leitet automatisch zum günstigsten/schnellsten Anbieter", fr:"Orchestra route automatiquement vers le fournisseur le moins cher/rapide", es:"Orchestra enruta automáticamente al proveedor más barato/rápido", pt:"Orchestra roteia automaticamente para o provedor mais barato/rápido", ja:"Orchestraが最安/最速のプロバイダに自動ルーティング", ko:"Orchestra가 가장 저렴하고 빠른 제공업체로 자동 라우팅" },
  "setup.step6.d4": { en:"All requests logged in Console: cost, latency, provider used", id:"Semua request tercatat di Console: biaya, latency, provider yang digunakan", zh:"所有请求记录在Console中：成本、延迟、使用的提供商", ar:"جميع الطلبات مسجّلة في Console: التكلفة، الكمون، المزود المستخدم", de:"Alle Anfragen im Console protokolliert: Kosten, Latenz, genutzter Anbieter", fr:"Toutes les requêtes journalisées dans la Console: coût, latence, fournisseur", es:"Todas las solicitudes registradas en la Consola: coste, latencia, proveedor", pt:"Todas as requisições registradas no Console: custo, latência, provedor", ja:"すべてのリクエストをConsoleに記録：コスト、レイテンシ、使用プロバイダ", ko:"모든 요청이 콘솔에 기록됨: 비용, 지연시간, 사용된 제공업체" },
  "setup.step6.d5": { en:"BYOK: your API keys stay on your server and never leave it", id:"BYOK: API key Anda tetap di server Anda dan tidak pernah keluar", zh:"BYOK：您的API密钥保留在您的服务器上，永不离开", ar:"BYOK: مفاتيح API تبقى على خادمك ولا تغادره أبداً", de:"BYOK: Ihre API-Schlüssel bleiben auf Ihrem Server", fr:"BYOK: vos clés API restent sur votre serveur et n'en partent jamais", es:"BYOK: tus claves API se quedan en tu servidor y nunca lo abandonan", pt:"BYOK: suas chaves de API ficam no seu servidor e nunca o deixam", ja:"BYOK：APIキーはサーバー上に留まり、外部に送信されません", ko:"BYOK: API 키는 서버에 유지되며 절대 외부로 나가지 않습니다" },

  // ── Portal ──
  "portal.welcome":  { en:"Welcome",       id:"Selamat datang", zh:"欢迎",     ar:"مرحباً",    de:"Willkommen",   fr:"Bienvenue",       es:"Bienvenido",      pt:"Bem-vindo",    ja:"ようこそ",   ko:"환영합니다" },
  "portal.licenses": { en:"Licenses",      id:"Lisensi",        zh:"许可证",   ar:"التراخيص",  de:"Lizenzen",     fr:"Licences",        es:"Licencias",       pt:"Licenças",     ja:"ライセンス", ko:"라이선스" },
  "portal.download": { en:"⬇ Download Package", id:"⬇ Download Paket", zh:"⬇ 下载软件包", ar:"⬇ تنزيل الحزمة", de:"⬇ Paket herunterladen", fr:"⬇ Télécharger le paquet", es:"⬇ Descargar Paquete", pt:"⬇ Baixar Pacote", ja:"⬇ パッケージダウンロード", ko:"⬇ 패키지 다운로드" },
  "portal.copy_key": { en:"Copy Key",      id:"Salin Key",      zh:"复制密钥", ar:"نسخ المفتاح", de:"Schlüssel kopieren", fr:"Copier la clé", es:"Copiar clave",  pt:"Copiar chave", ja:"キーをコピー", ko:"키 복사" },
  "portal.copied":   { en:"✓ Copied",      id:"✓ Tersalin",     zh:"✓ 已复制", ar:"✓ تم النسخ", de:"✓ Kopiert",   fr:"✓ Copié",         es:"✓ Copiado",       pt:"✓ Copiado",    ja:"✓ コピー済み", ko:"✓ 복사됨" },
  "portal.no_lic":   { en:"No licenses yet. Purchase a plan to get started.", id:"Belum ada lisensi. Beli paket untuk memulai.", zh:"还没有许可证。购买计划即可开始。", ar:"لا توجد تراخيص بعد. اشترِ خطة للبدء.", de:"Noch keine Lizenzen. Kaufen Sie einen Plan.", fr:"Pas encore de licences. Achetez un plan pour commencer.", es:"Sin licencias aún. Compra un plan para empezar.", pt:"Nenhuma licença ainda. Compre um plano para começar.", ja:"ライセンスがありません。プランを購入してください。", ko:"라이선스가 없습니다. 플랜을 구매하세요." },
  "portal.how_works": { en:"How it works: Download ZIP → run install.sh → open http://YOUR_SERVER:8080 → enter license key above → all features unlock.", id:"Cara pakai: Download ZIP → jalankan install.sh → buka http://YOUR_SERVER:8080 → masukkan license key di atas → semua fitur aktif.", zh:"使用方法：下载ZIP → 运行install.sh → 打开http://YOUR_SERVER:8080 → 输入上方许可证密钥 → 所有功能解锁。", ar:"طريقة الاستخدام: نزّل ZIP ← شغّل install.sh ← افتح http://YOUR_SERVER:8080 ← أدخل مفتاح الترخيص أعلاه ← جميع الميزات مفعّلة.", de:"Verwendung: ZIP herunterladen → install.sh ausführen → http://IHR_SERVER:8080 öffnen → Lizenzschlüssel eingeben → alle Funktionen freigeschaltet.", fr:"Utilisation: Télécharger ZIP → exécuter install.sh → ouvrir http://VOTRE_SERVEUR:8080 → saisir la clé de licence → toutes les fonctionnalités déverrouillées.", es:"Cómo funciona: Descarga ZIP → ejecuta install.sh → abre http://TU_SERVIDOR:8080 → ingresa la clave de licencia → todas las funciones desbloqueadas.", pt:"Como usar: Baixe o ZIP → execute install.sh → abra http://SEU_SERVIDOR:8080 → insira a chave de licença → todas as funções desbloqueadas.", ja:"使い方：ZIPをダウンロード → install.shを実行 → http://YOUR_SERVER:8080を開く → ライセンスキーを入力 → 全機能利用可能。", ko:"사용 방법: ZIP 다운로드 → install.sh 실행 → http://YOUR_SERVER:8080 열기 → 라이선스 키 입력 → 모든 기능 활성화." },
  "portal.setup_guide": { en:"📖 Setup Guide", id:"📖 Panduan Setup", zh:"📖 设置指南", ar:"📖 دليل الإعداد", de:"📖 Einrichtungsanleitung", fr:"📖 Guide de configuration", es:"📖 Guía de configuración", pt:"📖 Guia de configuração", ja:"📖 セットアップガイド", ko:"📖 설치 가이드" },
  "portal.invoices":    { en:"Invoices", id:"Faktur", zh:"发票", ar:"الفواتير", de:"Rechnungen", fr:"Factures", es:"Facturas", pt:"Faturas", ja:"請求書", ko:"청구서" },
  "portal.playbooks":   { en:"Playbooks", id:"Playbook", zh:"剧本", ar:"الكتيبات", de:"Playbooks", fr:"Playbooks", es:"Playbooks", pt:"Playbooks", ja:"プレイブック", ko:"플레이북" },
  "portal.shop":        { en:"🛒 Buy Products", id:"🛒 Beli Produk", zh:"🛒 购买产品", ar:"🛒 شراء المنتجات", de:"🛒 Produkte kaufen", fr:"🛒 Acheter des produits", es:"🛒 Comprar Productos", pt:"🛒 Comprar Produtos", ja:"🛒 製品を購入", ko:"🛒 제품 구매" },
  "portal.docs":        { en:"📖 Docs & Guide", id:"📖 Docs & Panduan", zh:"📖 文档和指南", ar:"📖 المستندات والدليل", de:"📖 Docs & Anleitung", fr:"📖 Docs & Guide", es:"📖 Docs & Guía", pt:"📖 Docs & Guia", ja:"📖 ドキュメント＆ガイド", ko:"📖 문서 및 가이드" },
  "portal.build_ready":  { en:"✅ Package Ready", id:"✅ Paket Siap", zh:"✅ 软件包就绪", ar:"✅ الحزمة جاهزة", de:"✅ Paket bereit", fr:"✅ Paquet prêt", es:"✅ Paquete listo", pt:"✅ Pacote pronto", ja:"✅ パッケージ準備完了", ko:"✅ 패키지 준비됨" },
  "portal.build_pending":{ en:"⏳ Build Pending", id:"⏳ Build Pending", zh:"⏳ 构建中", ar:"⏳ جارٍ البناء", de:"⏳ Build ausstehend", fr:"⏳ Build en attente", es:"⏳ Build pendiente", pt:"⏳ Build pendente", ja:"⏳ ビルド待ち", ko:"⏳ 빌드 대기 중" },
  "portal.active":      { en:"ACTIVE",  id:"AKTIF",  zh:"有效", ar:"نشط",   de:"AKTIV",  fr:"ACTIF",  es:"ACTIVO", pt:"ATIVO",  ja:"有効", ko:"활성" },
  "portal.expired":     { en:"EXPIRED", id:"KEDALUWARSA", zh:"已过期", ar:"منتهي", de:"ABGELAUFEN", fr:"EXPIRÉ", es:"EXPIRADO", pt:"EXPIRADO", ja:"期限切れ", ko:"만료됨" },
  "portal.nodes_left":  { en:"nodes left", id:"node tersisa", zh:"节点剩余", ar:"العقد المتبقية", de:"Knoten übrig", fr:"nœuds restants", es:"nodos restantes", pt:"nós restantes", ja:"ノード残り", ko:"노드 남음" },
  "portal.expires":     { en:"Expires", id:"Kedaluwarsa", zh:"到期", ar:"ينتهي", de:"Läuft ab", fr:"Expire", es:"Vence", pt:"Vence", ja:"有効期限", ko:"만료일" },
  "portal.license_key_label": { en:"LICENSE KEY — enter this in the activation wizard", id:"LICENSE KEY — masukkan ini di wizard aktivasi", zh:"许可证密钥 — 在激活向导中输入", ar:"مفتاح الترخيص — أدخله في معالج التفعيل", de:"LIZENZSCHLÜSSEL — im Aktivierungsassistenten eingeben", fr:"CLÉ DE LICENCE — saisir dans l'assistant d'activation", es:"CLAVE DE LICENCIA — ingresar en el asistente de activación", pt:"CHAVE DE LICENÇA — inserir no assistente de ativação", ja:"ライセンスキー — アクティベーションウィザードで入力", ko:"라이선스 키 — 활성화 마법사에서 입력" },
  "portal.quick_start_docker": { en:"Quick Start (Docker):\n1. Download ZIP → extract to server\n2. sudo bash install.sh\n3. docker compose up -d\n4. Open http://YOUR_SERVER:8080\n5. Enter license key → Activate ✓", id:"Quick Start (Docker):\n1. Download ZIP → extract ke server\n2. sudo bash install.sh\n3. docker compose up -d\n4. Buka http://YOUR_SERVER:8080\n5. Masukkan license key → Aktifkan ✓", zh:"快速开始 (Docker):\n1. 下载ZIP → 解压到服务器\n2. sudo bash install.sh\n3. docker compose up -d\n4. 打开 http://YOUR_SERVER:8080\n5. 输入许可证密钥 → 激活 ✓", ar:"البدء السريع (Docker):\n1. نزّل ZIP ← فك الضغط على الخادم\n2. sudo bash install.sh\n3. docker compose up -d\n4. افتح http://YOUR_SERVER:8080\n5. أدخل مفتاح الترخيص ← فعّل ✓", de:"Schnellstart (Docker):\n1. ZIP herunterladen → auf Server entpacken\n2. sudo bash install.sh\n3. docker compose up -d\n4. http://IHR_SERVER:8080 öffnen\n5. Lizenzschlüssel eingeben → Aktivieren ✓", fr:"Démarrage rapide (Docker):\n1. Télécharger ZIP → extraire sur le serveur\n2. sudo bash install.sh\n3. docker compose up -d\n4. Ouvrir http://VOTRE_SERVEUR:8080\n5. Saisir la clé de licence → Activer ✓", es:"Inicio rápido (Docker):\n1. Descarga ZIP → extrae en el servidor\n2. sudo bash install.sh\n3. docker compose up -d\n4. Abre http://TU_SERVIDOR:8080\n5. Ingresa la clave de licencia → Activar ✓", pt:"Início rápido (Docker):\n1. Baixar ZIP → extrair no servidor\n2. sudo bash install.sh\n3. docker compose up -d\n4. Abrir http://SEU_SERVIDOR:8080\n5. Inserir chave de licença → Ativar ✓", ja:"クイックスタート (Docker):\n1. ZIPをダウンロード → サーバーに展開\n2. sudo bash install.sh\n3. docker compose up -d\n4. http://YOUR_SERVER:8080を開く\n5. ライセンスキーを入力 → 有効化 ✓", ko:"빠른 시작 (Docker):\n1. ZIP 다운로드 → 서버에 압축 해제\n2. sudo bash install.sh\n3. docker compose up -d\n4. http://YOUR_SERVER:8080 열기\n5. 라이선스 키 입력 → 활성화 ✓" },

  // ── Admin panel ──
  "admin.title":     { en:"Admin Dashboard", id:"Dashboard Admin", zh:"管理员仪表板", ar:"لوحة تحكم المشرف", de:"Admin-Dashboard", fr:"Tableau de bord admin", es:"Panel de administración", pt:"Painel de administração", ja:"管理者ダッシュボード", ko:"관리자 대시보드" },
  "admin.builds":    { en:"Engine Builds",  id:"Engine Builds",  zh:"构建引擎",  ar:"بناء المحرك",       de:"Engine-Builds",    fr:"Builds moteur",      es:"Builds del motor",  pt:"Builds do motor",   ja:"エンジンビルド", ko:"엔진 빌드" },
  "admin.releases":  { en:"☁️ Releases",    id:"☁️ Rilis",        zh:"☁️ 发布",  ar:"☁️ الإصدارات",     de:"☁️ Releases",      fr:"☁️ Versions",        es:"☁️ Lanzamientos",  pt:"☁️ Lançamentos",  ja:"☁️ リリース",  ko:"☁️ 릴리스" },
  "admin.licenses":  { en:"Licenses",       id:"Lisensi",         zh:"许可证",   ar:"التراخيص",          de:"Lizenzen",         fr:"Licences",           es:"Licencias",         pt:"Licenças",          ja:"ライセンス",    ko:"라이선스" },
  "admin.clients":   { en:"Clients",        id:"Klien",           zh:"客户",     ar:"العملاء",           de:"Kunden",           fr:"Clients",            es:"Clientes",          pt:"Clientes",          ja:"クライアント",  ko:"클라이언트" },
  "admin.revenue":   { en:"Revenue",        id:"Pendapatan",      zh:"收入",     ar:"الإيرادات",         de:"Einnahmen",        fr:"Revenus",            es:"Ingresos",          pt:"Receita",           ja:"収益",          ko:"수익" },
  "admin.gateways":  { en:"Gateways",       id:"Gateway",         zh:"支付网关", ar:"بوابات الدفع",      de:"Zahlungsgateways", fr:"Passerelles",        es:"Pasarelas de pago", pt:"Gateways",          ja:"決済ゲートウェイ", ko:"결제 게이트웨이" },
  "admin.create_lic":{ en:"Create License", id:"Buat Lisensi",    zh:"创建许可证", ar:"إنشاء ترخيص",     de:"Lizenz erstellen", fr:"Créer une licence",  es:"Crear licencia",    pt:"Criar licença",     ja:"ライセンス作成", ko:"라이선스 생성" },

  // ── Auth ──
  "auth.login_title":  { en:"Login to AXTO", id:"Masuk ke AXTO", zh:"登录 AXTO", ar:"تسجيل الدخول إلى AXTO", de:"Bei AXTO anmelden", fr:"Connexion à AXTO", es:"Iniciar sesión en AXTO", pt:"Entrar no AXTO", ja:"AXTOにログイン", ko:"AXTO 로그인" },
  "auth.email":        { en:"Email address",  id:"Alamat email",  zh:"电子邮件地址", ar:"عنوان البريد الإلكتروني", de:"E-Mail-Adresse", fr:"Adresse e-mail", es:"Dirección de correo", pt:"Endereço de email", ja:"メールアドレス", ko:"이메일 주소" },
  "auth.password":     { en:"Password",       id:"Kata sandi",    zh:"密码",    ar:"كلمة المرور",  de:"Passwort",     fr:"Mot de passe",  es:"Contraseña",     pt:"Senha",       ja:"パスワード",  ko:"비밀번호" },
  "auth.magic_link":   { en:"Send Magic Link", id:"Kirim Magic Link", zh:"发送魔法链接", ar:"إرسال رابط سحري", de:"Magic Link senden", fr:"Envoyer un Magic Link", es:"Enviar enlace mágico", pt:"Enviar Magic Link", ja:"マジックリンクを送信", ko:"매직 링크 전송" },
  "auth.or":           { en:"or",             id:"atau",          zh:"或",      ar:"أو",           de:"oder",         fr:"ou",            es:"o",              pt:"ou",           ja:"または",      ko:"또는" },
  "auth.no_account":   { en:"Don't have an account?", id:"Belum punya akun?", zh:"没有账号？", ar:"ليس لديك حساب؟", de:"Kein Konto?", fr:"Pas de compte?", es:"¿No tienes cuenta?", pt:"Não tem conta?", ja:"アカウントをお持ちでないですか？", ko:"계정이 없으신가요?" },
  "auth.sign_up":      { en:"Sign up",         id:"Daftar",        zh:"注册",    ar:"سجّل الآن",   de:"Registrieren", fr:"S'inscrire",    es:"Registrarse",    pt:"Cadastrar",   ja:"登録",        ko:"회원가입" },

  // ── Register ──
  "reg.title":         { en:"Get Started with AXTO", id:"Mulai dengan AXTO", zh:"开始使用 AXTO", ar:"ابدأ مع AXTO", de:"Starten Sie mit AXTO", fr:"Commencer avec AXTO", es:"Empieza con AXTO", pt:"Comece com AXTO", ja:"AXTOを始める", ko:"AXTO 시작하기" },
  "reg.full_name":     { en:"Full Name",        id:"Nama Lengkap",  zh:"全名",    ar:"الاسم الكامل", de:"Vollständiger Name", fr:"Nom complet", es:"Nombre completo", pt:"Nome completo", ja:"フルネーム", ko:"전체 이름" },
  "reg.organization":  { en:"Organization (optional)", id:"Organisasi (opsional)", zh:"组织（可选）", ar:"المنظمة (اختياري)", de:"Organisation (optional)", fr:"Organisation (facultatif)", es:"Organización (opcional)", pt:"Organização (opcional)", ja:"組織（任意）", ko:"조직 (선택사항)" },
  "reg.select_plan":   { en:"Select Plan",      id:"Pilih Paket",   zh:"选择计划", ar:"اختر الخطة", de:"Plan wählen",  fr:"Choisir un plan", es:"Seleccionar plan", pt:"Selecionar plano", ja:"プランを選択", ko:"플랜 선택" },
  "reg.select_gateway":{ en:"Payment Method",   id:"Metode Pembayaran", zh:"支付方式", ar:"طريقة الدفع", de:"Zahlungsmethode", fr:"Méthode de paiement", es:"Método de pago", pt:"Método de pagamento", ja:"支払い方法", ko:"결제 방법" },
  "reg.checkout":      { en:"Proceed to Checkout →", id:"Lanjut ke Pembayaran →", zh:"前往结账 →", ar:"المتابعة إلى الدفع →", de:"Zur Kasse →", fr:"Passer à la caisse →", es:"Proceder al pago →", pt:"Ir para o pagamento →", ja:"チェックアウトへ →", ko:"결제하기 →" },

  // ── FAQ ──
  "faq.title":         { en:"Frequently Asked Questions", id:"Pertanyaan yang Sering Diajukan", zh:"常见问题", ar:"الأسئلة الشائعة", de:"Häufig gestellte Fragen", fr:"Questions fréquentes", es:"Preguntas frecuentes", pt:"Perguntas frequentes", ja:"よくある質問", ko:"자주 묻는 질문" },

  // ── Common ──
  "common.loading":    { en:"Loading...",    id:"Memuat...",     zh:"加载中...", ar:"جارٍ التحميل...", de:"Laden...",   fr:"Chargement...", es:"Cargando...",  pt:"Carregando...", ja:"読み込み中...", ko:"로딩 중..." },
  "common.save":       { en:"Save",          id:"Simpan",        zh:"保存",     ar:"حفظ",            de:"Speichern",  fr:"Enregistrer",  es:"Guardar",     pt:"Salvar",       ja:"保存",         ko:"저장" },
  "common.cancel":     { en:"Cancel",        id:"Batal",         zh:"取消",     ar:"إلغاء",           de:"Abbrechen",  fr:"Annuler",      es:"Cancelar",    pt:"Cancelar",     ja:"キャンセル",   ko:"취소" },
  "common.delete":     { en:"Delete",        id:"Hapus",         zh:"删除",     ar:"حذف",             de:"Löschen",    fr:"Supprimer",    es:"Eliminar",    pt:"Excluir",      ja:"削除",         ko:"삭제" },
  "common.confirm":    { en:"Confirm",       id:"Konfirmasi",    zh:"确认",     ar:"تأكيد",           de:"Bestätigen", fr:"Confirmer",    es:"Confirmar",   pt:"Confirmar",    ja:"確認",         ko:"확인" },
  "common.back":       { en:"← Back",        id:"← Kembali",    zh:"← 返回",  ar:"→ رجوع",          de:"← Zurück",   fr:"← Retour",     es:"← Atrás",    pt:"← Voltar",    ja:"← 戻る",      ko:"← 뒤로" },
  "common.view_all":   { en:"View All →",    id:"Lihat Semua →", zh:"查看全部 →", ar:"عرض الكل →",   de:"Alle ansehen →", fr:"Tout voir →", es:"Ver todo →", pt:"Ver todos →",  ja:"すべて見る →", ko:"모두 보기 →" },
  "common.days_left":  { en:"days left",     id:"hari tersisa",  zh:"天剩余",  ar:"أيام متبقية",      de:"Tage übrig", fr:"jours restants", es:"días restantes", pt:"dias restantes", ja:"日残り",  ko:"일 남음" },
  "common.per_year":   { en:"/year",         id:"/tahun",        zh:"/年",     ar:"/سنة",             de:"/Jahr",      fr:"/an",          es:"/año",        pt:"/ano",         ja:"/年",         ko:"/년" },
  // ── Landing page (new — batch 1: EN+ID verified, other locales fall back to EN) ──
  "landing.nav.promo": { en:"🎁 Trial Promo", id:"🎁 Promo Trial" },
  "landing.nav.products": { en:"Products", id:"Produk" },
  "landing.nav.bundles": { en:"Bundles", id:"Bundle" },
  "landing.nav.playbooks": { en:"Playbooks", id:"Playbook" },
  "landing.nav.byok": { en:"BYOK", id:"BYOK" },
  "landing.nav.faq": { en:"FAQ", id:"FAQ" },
  "landing.hero.title1": { en:"AI eXecution & Tools Orchestration", id:"AI eXecution & Tools Orchestration" },
  "landing.hero.title2": { en:"You Own & Control", id:"Yang Anda Miliki & Kendalikan Sepenuhnya" },
  "landing.hero.subtitle": { en:"Secure your servers and run every AI model in one place — fully self-hosted, so your keys and data never leave your own infrastructure.", id:"Amankan server Anda dan jalankan semua model AI dalam satu tempat — sepenuhnya self-hosted, sehingga key dan data Anda tidak pernah keluar dari infrastruktur Anda sendiri." },
  "landing.hero.cta1": { en:"Explore Plans →", id:"Lihat Paket →" },
  "landing.hero.cta2": { en:"See How It Works", id:"Lihat Cara Kerjanya" },
  "landing.hero.stat1": { en:"BYOK — Your Keys Only", id:"BYOK — Hanya Key Anda" },
  "landing.hero.stat2": { en:"Data Sent to AXTO", id:"Data yang Dikirim ke AXTO" },
  "landing.hero.stat3": { en:"Deployment Time", id:"Waktu Deployment" },
  "landing.hero.stat4": { en:"Complete Platform", id:"Platform Lengkap" },
  "landing.hero.stat4val": { en:"10 products", id:"10 produk" },
  "landing.products.eyebrow": { en:"The Products", id:"Produk Kami" },
  "landing.products.title1": { en:"Ten AI products.", id:"Sepuluh produk AI." },
  "landing.products.title2": { en:"One sovereign platform.", id:"Satu platform yang sepenuhnya Anda kuasai." },
  "landing.products.subtitle": { en:"Every product is self-hosted via Docker and bring-your-own-key. Your servers, your keys, your data — nothing leaves your network. Click any product to see plans.", id:"Setiap produk berjalan self-hosted via Docker dan bring-your-own-key. Server Anda, key Anda, data Anda — tidak ada yang keluar dari jaringan Anda. Klik produk mana pun untuk melihat paketnya." },
  "landing.products.available": { en:"from", id:"mulai" },
  "landing.products.comingsoon": { en:"🔜 Coming soon", id:"🔜 Segera Hadir" },
  "landing.products.viewplans": { en:"View plans →", id:"Lihat paket →" },
  "landing.products.notifyme": { en:"Notify me →", id:"Beri tahu saya →" },
  "landing.products.trialcta": { en:"▶ Start Free Trial — 7 Days", id:"▶ Mulai Trial Gratis — 7 Hari" },
  "landing.products.comparecta": { en:"Compare all pricing ↓", id:"Bandingkan semua harga ↓" },
  "landing.why.eyebrow": { en:"WHY AXTO", id:"MENGAPA AXTO" },
  "landing.why.title": { en:"One Platform. Fully Yours.", id:"Satu Platform. Sepenuhnya Milik Anda." },
  "landing.why.subtitle": { en:"Replace a stack of disconnected tools with a single self-hosted platform — clear, predictable pricing and complete ownership of your data.", id:"Ganti tumpukan tools yang terpisah-pisah dengan satu platform self-hosted — harga yang jelas dan bisa diprediksi, serta kepemilikan penuh atas data Anda." },
  "landing.why.c1t": { en:"100% Self-Hosted", id:"100% Self-Hosted" },
  "landing.why.c1b": { en:"Runs entirely on your own servers. Your data never leaves your infrastructure — no third-party custody.", id:"Berjalan sepenuhnya di server Anda sendiri. Data Anda tidak pernah keluar dari infrastruktur Anda — tanpa penyimpanan oleh pihak ketiga." },
  "landing.why.c2t": { en:"One Unified Platform", id:"Satu Platform Terpadu" },
  "landing.why.c2b": { en:"Endpoint security, AI orchestration, privacy and compliance — consolidated into a single platform instead of a dozen separate tools.", id:"Keamanan endpoint, orkestrasi AI, privasi, dan kepatuhan — digabungkan dalam satu platform, bukan belasan tools terpisah." },
  "landing.why.c3t": { en:"Transparent Pricing", id:"Harga Transparan" },
  "landing.why.c3b": { en:"Straightforward annual or lifetime licenses. No per-request cloud fees, no hidden usage bills, no surprises.", id:"Lisensi tahunan atau seumur hidup yang jelas. Tanpa biaya cloud per-request, tanpa tagihan tersembunyi, tanpa kejutan." },
  "landing.why.c4t": { en:"No Lock-In", id:"Tanpa Lock-In" },
  "landing.why.c4b": { en:"Open standards and OpenAI-compatible APIs. Keep full ownership of your data and leave whenever you choose.", id:"Standar terbuka dan API yang kompatibel dengan OpenAI. Anda tetap memiliki penuh data Anda dan bebas berhenti kapan saja." },
  "landing.why.footer": { en:"Self-hosted by design — zero per-request cloud fees, zero data custody, zero lock-in.", id:"Self-hosted sejak awal dirancang — nol biaya cloud per-request, nol penyimpanan data oleh pihak lain, nol lock-in." },
  "landing.why.footercta": { en:"Talk to us about enterprise plans →", id:"Hubungi kami untuk paket enterprise →" },
  "landing.byok.eyebrow": { en:"🔑 BYOK — BRING YOUR OWN KEYS", id:"🔑 BYOK — BAWA KEY ANDA SENDIRI" },
  "landing.byok.title1": { en:"Your Credentials.", id:"Kredensial Anda." },
  "landing.byok.title2": { en:"Never Leave Your Server.", id:"Tidak Pernah Keluar dari Server Anda." },
  "landing.byok.paragraph": { en:"AXTO operates on a strict architectural principle: zero data custody. Your AI provider API keys, server telemetry, and operational data are stored exclusively within your own infrastructure. AXTO's only contact with your environment is a lightweight, periodic license heartbeat — nothing more.", id:"AXTO beroperasi dengan prinsip arsitektur yang ketat: nol penyimpanan data. API key provider AI, telemetri server, dan data operasional Anda tersimpan sepenuhnya di infrastruktur Anda sendiri. Satu-satunya kontak AXTO dengan lingkungan Anda adalah heartbeat lisensi ringan secara berkala — tidak lebih." },
  "landing.byok.b1": { en:"API keys stored in your config file — never transmitted", id:"API key tersimpan di file konfigurasi Anda — tidak pernah dikirim" },
  "landing.byok.b2": { en:"Deploy on your VPS, bare metal, or private cloud", id:"Deploy di VPS, bare metal, atau private cloud Anda" },
  "landing.byok.b3": { en:"License validation sends only a machine fingerprint hash", id:"Validasi lisensi hanya mengirim hash fingerprint mesin" },
  "landing.byok.b4": { en:"AXTO has zero visibility into your AI queries or responses", id:"AXTO tidak memiliki akses sama sekali ke query atau respons AI Anda" },
  "landing.byok.b5": { en:"Fully auditable — open architecture, no hidden callbacks", id:"Sepenuhnya bisa diaudit — arsitektur terbuka, tanpa callback tersembunyi" },
  "landing.byok.t1l": { en:"E2E Encrypted", id:"Terenkripsi End-to-End" },
  "landing.byok.t1s": { en:"All comms over TLS 1.3", id:"Semua komunikasi via TLS 1.3" },
  "landing.byok.t2l": { en:"Self-Hosted", id:"Self-Hosted" },
  "landing.byok.t2s": { en:"Your server, your rules", id:"Server Anda, aturan Anda" },
  "landing.byok.t3l": { en:"Auditable", id:"Bisa Diaudit" },
  "landing.byok.t3s": { en:"Open architecture", id:"Arsitektur terbuka" },
  "landing.byok.t4l": { en:"No Tracking", id:"Tanpa Pelacakan" },
  "landing.byok.t4s": { en:"Zero telemetry to AXTO", id:"Nol telemetri ke AXTO" },
  "landing.bundle.eyebrow": { en:"BUNDLES · USD", id:"BUNDLE · USD" },
  "landing.bundle.title": { en:"Bundle & Save", id:"Bundle & Hemat" },
  "landing.bundle.subtitle": { en:"Deploy Guardian and Orchestra together at a significant discount over buying separately.", id:"Deploy Guardian dan Orchestra bersamaan dengan diskon signifikan dibanding membeli terpisah." },
  "landing.bundle.innereyebrow": { en:"🎁 BUNDLE & SAVE", id:"🎁 BUNDLE & HEMAT" },
  "landing.bundle.innertitle": { en:"Guardian + Orchestra Combined", id:"Guardian + Orchestra Digabung" },
  "landing.bundle.innersub": { en:"Deploy both products together at a significant discount.", id:"Deploy kedua produk bersamaan dengan diskon signifikan." },
  "landing.bundle.bestvalue": { en:"BEST VALUE", id:"NILAI TERBAIK" },
  "landing.bundle.billed": { en:"per year · billed annually", id:"per tahun · ditagih tahunan" },
  "landing.bundle.getbundle": { en:"Get Bundle", id:"Ambil Bundle" },
  "landing.playbooks.eyebrow": { en:"📦 NEW — AXTO PLAYBOOKS", id:"📦 BARU — AXTO PLAYBOOKS" },
  "landing.playbooks.title": { en:"AI Prompt Playbooks", id:"Playbook Prompt AI" },
  "landing.playbooks.subtitle": { en:"Ready-to-use prompt collections for ChatGPT, Claude, and Gemini. Crafted by professionals, tested across 100+ real projects. Download and use instantly.", id:"Koleksi prompt siap pakai untuk ChatGPT, Claude, dan Gemini. Disusun oleh profesional, teruji di 100+ proyek nyata. Download dan langsung pakai." },
  "landing.playbooks.megatitle": { en:"Mega Bundle — All Access", id:"Mega Bundle — Akses Penuh" },
  "landing.playbooks.megasubtitle": { en:"Every playbook in our catalog. 400+ prompts. Lifetime access.", id:"Semua playbook dalam katalog kami. 400+ prompt. Akses seumur hidup." },
  "landing.playbooks.megacta": { en:"Get All Playbooks →", id:"Ambil Semua Playbook →" },
  "landing.faq.subtitle": { en:"Everything you need to know before you deploy", id:"Semua yang perlu Anda ketahui sebelum deploy" },
  "landing.faq.q1": { en:"Does AXTO have access to my server data or AI responses?", id:"Apakah AXTO bisa mengakses data server atau respons AI saya?" },
  "landing.faq.a1": { en:"Absolutely not. Guardian and Orchestra are fully self-hosted on your infrastructure. AXTO only validates your license — we never see or store your data, API keys, or AI responses.", id:"Tidak sama sekali. Guardian dan Orchestra berjalan 100% self-hosted di infrastruktur Anda. AXTO hanya memvalidasi lisensi — kami tidak pernah melihat atau menyimpan data, API key, atau respons AI Anda." },
  "landing.faq.q2": { en:"What does BYOK (Bring Your Own Keys) mean?", id:"Apa itu BYOK (Bring Your Own Keys)?" },
  "landing.faq.a2": { en:"Your AI provider credentials (OpenAI, Anthropic, etc.) are stored on your server. Orchestra reads them locally. AXTO has no copy of your keys.", id:"Kredensial provider AI Anda (OpenAI, Anthropic, dll) disimpan di server Anda sendiri. Orchestra membacanya secara lokal. AXTO tidak memiliki salinan key Anda." },
  "landing.faq.q3": { en:"How long does initial setup take?", id:"Berapa lama setup awal berlangsung?" },
  "landing.faq.a3": { en:"Under 30 minutes. Download ZIP from portal → run install.sh → open browser → enter license key. Admin dashboard is live immediately.", id:"Kurang dari 30 menit. Download ZIP dari portal → jalankan install.sh → buka browser → masukkan license key. Dashboard admin langsung aktif." },
  "landing.faq.q4": { en:"Can I run Guardian and Orchestra on the same server?", id:"Bisakah Guardian dan Orchestra dijalankan di server yang sama?" },
  "landing.faq.a4": { en:"Yes. Both products run as separate Docker Compose stacks on the same host. For large deployments, separate hosts are recommended.", id:"Bisa. Keduanya berjalan sebagai Docker Compose stack terpisah di host yang sama. Untuk deployment skala besar, server terpisah disarankan." },
  "landing.faq.q5": { en:"Is there a free trial?", id:"Apakah ada trial gratis?" },
  "landing.faq.a5": { en:"Yes. Every product offers a free 7-day trial — core features, capability-limited (no API, watermarked exports), locked to one server/IP. Register at axto.io, select any Trial plan, and your license key is delivered instantly. One trial per product per email. No credit card required.", id:"Ya. Setiap produk menawarkan trial gratis 7 hari — fitur inti, kapasitas terbatas (tanpa API, hasil ekspor berwatermark), terkunci ke 1 server/IP. Daftar di axto.io, pilih paket Trial mana pun, license key langsung dikirim. Satu trial per produk per email. Tanpa kartu kredit." },
  "landing.faq.q6": { en:"What happens if my license expires?", id:"Apa yang terjadi jika lisensi saya kedaluwarsa?" },
  "landing.faq.a6": { en:"Automated renewal reminders are sent at 30, 14, and 3 days before expiry. Each engine checks in with axto.io roughly every 30 minutes; if it can't reach axto.io, it keeps running on its last verified state for up to a 4-hour offline grace period — capped so it never runs past your license's actual expiry date. Once axto.io confirms expiry (or that offline window lapses), the engine stops until you renew — there's no reduced or read-only mode, so renewing before expiry is the way to avoid any interruption.", id:"Pengingat perpanjangan otomatis dikirim 30, 14, dan 3 hari sebelum kedaluwarsa. Setiap engine melakukan pengecekan ke axto.io kurang lebih setiap 30 menit; jika tidak bisa terhubung ke axto.io, engine tetap berjalan menggunakan status terverifikasi terakhir selama maksimal 4 jam (masa tenggang offline) — dan ini tidak akan pernah melewati tanggal kedaluwarsa lisensi Anda yang sebenarnya. Begitu axto.io mengonfirmasi kedaluwarsa (atau masa tenggang offline itu habis), engine akan berhenti sampai Anda memperpanjang — tidak ada mode terbatas atau read-only, jadi cara terbaik menghindari gangguan adalah memperpanjang sebelum kedaluwarsa." },
  "landing.faq.q7": { en:"Why doesn't AXTO offer a traditional SLA?", id:"Mengapa AXTO tidak menawarkan SLA (Service Level Agreement) tradisional?" },
  "landing.faq.a7": { en:"Because every AXTO product runs self-hosted on your own infrastructure, there's no shared system for us to guarantee uptime on — your server, your rules. We designed the platform to be genuinely easy to operate: guided setup, plain-language documentation, and a responsive support inbox. Most teams find their own IT can run it comfortably, which keeps your costs down and puts you in full control — no waiting on a support queue.", id:"Karena setiap produk AXTO berjalan self-hosted di infrastruktur Anda sendiri, tidak ada sistem bersama yang bisa kami jamin uptime-nya — server Anda, kendali penuh di tangan Anda. Platform ini kami rancang agar benar-benar mudah dioperasikan: panduan setup yang jelas, dokumentasi berbahasa sederhana, dan tim support yang responsif. Sebagian besar tim menemukan bahwa IT internal mereka sudah cukup untuk mengoperasikannya sendiri — ini menghemat biaya sekaligus memberi kendali penuh, tanpa perlu menunggu antrean tiket support." },
  "landing.delivery.eyebrow": { en:"📦 WHAT YOU GET", id:"📦 YANG ANDA DAPATKAN" },
  "landing.delivery.title1": { en:"Every License Includes", id:"Setiap Lisensi Termasuk" },
  "landing.delivery.title2": { en:"A Production-Ready Docker Image", id:"Docker Image Siap Produksi" },
  "landing.delivery.subtitle": { en:"Purchase any plan — from Starter to Enterprise — and receive the complete product package. No feature gates hidden behind upsells. What your tier includes is exactly what you get.", id:"Beli paket apa pun — dari Starter hingga Enterprise — dan Anda menerima paket produk yang lengkap. Tidak ada fitur yang disembunyikan di balik upsell. Apa yang tercantum di paket Anda, itulah yang Anda dapatkan." },
  "landing.delivery.c1t": { en:"Docker Image (Linux)", id:"Docker Image (Linux)" },
  "landing.delivery.c1d": { en:"Production-ready Docker Compose stack. Pull from your private registry, run `docker compose up -d`, and your product is live in under 5 minutes. Includes health checks, auto-restart, and log rotation.", id:"Docker Compose stack yang siap produksi. Pull dari private registry Anda, jalankan `docker compose up -d`, dan produk Anda langsung aktif dalam waktu kurang dari 5 menit. Termasuk health check, auto-restart, dan log rotation." },
  "landing.delivery.c2t": { en:"Windows EXE — In Development", id:"Windows EXE — Masih Dikembangkan" },
  "landing.delivery.c2d": { en:"A portable single-file Windows executable is in active development and not yet available for production use. Deploy via Docker today; your portal will show live per-format availability the moment the Windows build is verified and enabled.", id:"Executable Windows satu-file sedang dalam tahap pengembangan aktif dan belum tersedia untuk produksi. Untuk saat ini deploy menggunakan Docker; portal Anda akan menampilkan status ketersediaan real-time begitu build Windows terverifikasi dan diaktifkan." },
  "landing.delivery.c3t": { en:"Interactive Setup Guide", id:"Panduan Setup Interaktif" },
  "landing.delivery.c3d": { en:"Step-by-step guide in 10 languages (EN, ID, AR, ZH, FR, DE, ES, PT, RU, JA). Covers installation, configuration, AI provider setup, and production hardening. Downloadable as PDF.", id:"Panduan langkah demi langkah dalam 10 bahasa (EN, ID, AR, ZH, FR, DE, ES, PT, RU, JA). Mencakup instalasi, konfigurasi, setup provider AI, dan pengamanan produksi. Bisa diunduh sebagai PDF." },
  "landing.delivery.c4t": { en:"License Key (Instant)", id:"License Key (Instan)" },
  "landing.delivery.c4d": { en:"Delivered to your email within 60 seconds of purchase. Locked to 1 server (machine-id + IP). Enter in YAML config, restart, and your product activates immediately.", id:"Dikirim ke email Anda dalam 60 detik setelah pembelian. Terkunci ke 1 server (machine-id + IP). Masukkan ke konfigurasi YAML, restart, dan produk Anda langsung aktif." },
  "landing.delivery.c5t": { en:"7-Day Free Trial", id:"Trial Gratis 7 Hari" },
  "landing.delivery.c5d": { en:"Every product offers a free 7-day trial — core features, capability-limited (no API, watermarked exports), locked to one server. No credit card required. One trial per product per email address.", id:"Setiap produk menawarkan trial gratis 7 hari — fitur inti, kapasitas terbatas (tanpa API, hasil ekspor berwatermark), terkunci ke 1 server. Tanpa kartu kredit. Satu trial per produk per alamat email." },
  "landing.delivery.c6t": { en:"All Updates Included", id:"Semua Update Termasuk" },
  "landing.delivery.c6d": { en:"Your annual license includes every update released during the license period. New features, security patches, and performance improvements — all included at no extra cost.", id:"Lisensi tahunan Anda termasuk setiap update yang dirilis selama masa lisensi. Fitur baru, patch keamanan, dan peningkatan performa — semua termasuk tanpa biaya tambahan." },
  "landing.delivery.enforce_title": { en:"License Enforcement", id:"Penegakan Lisensi" },
  "landing.delivery.enforce_body": { en:"Each license key is cryptographically bound to a single machine (machine-id + IP address + instance). License validation occurs every 30 minutes with a 4-hour offline grace period. Attempting to run on multiple servers or share keys will result in automatic suspension. This ensures every client receives the full value of their investment without unfair usage.", id:"Setiap license key terikat secara kriptografis ke satu mesin (machine-id + alamat IP + instance). Validasi lisensi berjalan setiap 30 menit dengan masa tenggang offline 4 jam. Menjalankan di banyak server atau berbagi key akan mengakibatkan suspend otomatis. Ini memastikan setiap klien mendapatkan nilai penuh dari investasinya tanpa penyalahgunaan." },
  "landing.trial.title": { en:"Try Any Product Free for 7 Days", id:"Coba Produk Apa Pun Gratis 7 Hari" },
  "landing.trial.subtitle": { en:"Core features. No credit card. One click to activate. Experience the AXTO platform on your own infrastructure before you commit.", id:"Fitur inti. Tanpa kartu kredit. Satu klik untuk aktivasi. Rasakan platform AXTO di infrastruktur Anda sendiri sebelum berkomitmen." },
  "landing.trial.comingsoon": { en:"Coming Soon", id:"Segera Hadir" },
  "landing.trial.ctasuffix": { en:"Trial →", id:"Trial →" },
  "landing.cta.title1": { en:"Ready to Take Control of", id:"Siap Mengambil Kendali Penuh atas" },
  "landing.cta.title2": { en:"Your AI Infrastructure?", id:"Infrastruktur AI Anda?" },
  "landing.cta.subtitle": { en:"Deploy in under 30 minutes. No vendor lock-in. No data sharing. Just powerful, enterprise-grade AI infrastructure — fully under your control.", id:"Deploy dalam waktu kurang dari 30 menit. Tanpa vendor lock-in. Tanpa berbagi data. Cukup infrastruktur AI kelas enterprise yang kuat — sepenuhnya di bawah kendali Anda." },
  "landing.cta.contact": { en:"Contact Us", id:"Hubungi Kami" },
  "landing.footer.tagline": { en:"AI eXecution & Tools Orchestration that you own, control, and deploy on your own servers. Zero data custody. 100% BYOK.", id:"AI eXecution & Tools Orchestration yang Anda miliki, kendalikan, dan deploy di server Anda sendiri. Nol penyimpanan data. 100% BYOK." },
  "landing.footer.products": { en:"Products", id:"Produk" },
  "landing.footer.resources": { en:"Resources", id:"Sumber Daya" },
  "landing.footer.legal": { en:"Legal", id:"Legal" },
  "landing.footer.setupguide": { en:"Setup Guide", id:"Panduan Setup" },
  "landing.footer.playbooks": { en:"Playbooks", id:"Playbook" },
  "landing.footer.tos": { en:"Terms of Service", id:"Syarat Layanan" },
  "landing.footer.privacy": { en:"Privacy Policy", id:"Kebijakan Privasi" },
  "landing.footer.security": { en:"Security", id:"Keamanan" },
  "landing.footer.copyright": { en:"AXTO. All rights reserved. Prices in USD.", id:"AXTO. Hak cipta dilindungi. Harga dalam USD." },
  "landing.footer.byoktag": { en:"100% BYOK — Your keys never leave your server", id:"100% BYOK — Key Anda tidak pernah keluar dari server Anda" },
  // ── Landing stats bar (batch 1b) ──
  "landing.statsbar.s1": { en:"Security Products", id:"Produk Keamanan" },
  "landing.statsbar.s2": { en:"Pricing Tiers", id:"Tingkatan Harga" },
  "landing.statsbar.s3": { en:"Self-Hosted", id:"Self-Hosted" },
  "landing.statsbar.s4": { en:"Data to AXTO", id:"Data ke AXTO" },
  "landing.statsbar.s5": { en:"Guide Languages", id:"Bahasa Panduan" },
  "landing.statsbar.s6": { en:"Cloud AI Fees", id:"Biaya Cloud AI" },
};

// ── Translation function ──────────────────────────────────────────────────
export function translate(key: string, locale: Locale): string {
  const entry = TRANSLATIONS[key];
  if (!entry) return key;
  return entry[locale] || entry["en"] || key;
}

// ── Provider ─────────────────────────────────────────────────────────────
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale,   setLocaleState] = useState<Locale>("en");
  const [currency, setCurrency]    = useState("USD");
  const [fxRate,   setFxRate]      = useState(1);
  const [fxSymbol, setFxSymbol]    = useState("$");
  const [country,  setCountry]     = useState("");
  const [ready,    setReady]       = useState(false);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("axto_locale", l); } catch {}
    // Update HTML dir for RTL
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.documentElement.dir  = RTL_LOCALES.has(l) ? "rtl" : "ltr";
    }
  }, []);

  useEffect(() => {
    // 1. Check saved preference
    let saved: Locale | null = null;
    try { saved = localStorage.getItem("axto_locale") as Locale | null; } catch {}
    if (saved && SUPPORTED_LOCALES.find(x => x.code === saved)) {
      setLocale(saved);
      setReady(true);
      return;
    }

    // 2. Auto-detect from browser language + CF country
    const detectAuto = async () => {
      try {
        // NOTE: language is intentionally NOT auto-switched. The site defaults
        // to English for a fully consistent experience; users choose their own
        // language via the selector. Only currency/country are auto-detected
        // below (for localized pricing).

        // Get CF country + FX rates (one request)
        const r = await fetch("/api/fx-rates");
        if (!r.ok) { setReady(true); return; }

        const cfCountry = r.headers.get("cf-ipcountry") || "";
        const data = await r.json();

        if (cfCountry) {
          setCountry(cfCountry);
          // Language stays user-controlled (default English). Set currency from country.
          const detectedCurrency = COUNTRY_CURRENCY[cfCountry] || "USD";
          if (detectedCurrency !== "USD") {
            // Try to get rate from live data, fallback to 1
            const rate = data.rates?.[detectedCurrency] || 1;
            if (rate > 0 && rate !== 1) {
              setCurrency(detectedCurrency);
              setFxRate(rate);
              const symbols: Record<string, string> = {
                IDR:"Rp", MYR:"RM", SGD:"S$", JPY:"¥", CNY:"¥", EUR:"€",
                GBP:"£", AUD:"A$", AED:"د.إ", KRW:"₩", THB:"฿", INR:"₹",
                BRL:"R$", MXN:"$", CAD:"C$", CHF:"Fr", SEK:"kr", NOK:"kr",
                DKK:"kr", HKD:"HK$", TWD:"NT$", RUB:"₽", TRY:"₺", ZAR:"R",
                VND:"₫", PHP:"₱", PKR:"₨", SAR:"﷼", QAR:"﷼", KWD:"د.ك",
                EGP:"E£", ARS:"$", NGN:"₦", NZD:"NZ$",
              };
              setFxSymbol(symbols[detectedCurrency] || detectedCurrency + " ");
            }
          }
        }
      } catch {}
      setReady(true);
    };

    detectAuto();
  }, [setLocale]);

  const t = useCallback((key: string) => translate(key, locale), [locale]);

  const fmtPrice = useCallback((usd: number): string => {
    if (currency === "USD" || fxRate <= 0) return "$" + usd.toLocaleString("en-US");
    const local = Math.round(usd * fxRate);
    // Special formatting for large-unit currencies
    if (currency === "IDR") return "Rp" + (local >= 1_000_000 ? (local/1_000_000).toFixed(0)+"jt" : local.toLocaleString("id-ID"));
    if (currency === "VND") return "₫" + (local >= 1_000_000 ? (local/1_000_000).toFixed(1)+"tr" : local.toLocaleString("vi-VN"));
    if (currency === "KRW") return "₩" + local.toLocaleString("ko-KR");
    if (currency === "JPY") return "¥" + local.toLocaleString("ja-JP");
    if (currency === "INR") return "₹" + (local >= 100_000 ? (local/100_000).toFixed(1)+"L" : local.toLocaleString("en-IN"));
    if (currency === "NGN") return "₦" + (local >= 1_000_000 ? (local/1_000_000).toFixed(1)+"M" : local.toLocaleString());
    // Standard formatting
    return fxSymbol + local.toLocaleString("en-US");
  }, [currency, fxRate, fxSymbol]);

  const isRTL = RTL_LOCALES.has(locale);

  // Small language selector — floating pill, auto-positioned
  const LangPicker = () => (
    <div style={{
      position:"fixed", bottom:20, right:20, zIndex:9999,
      background:"rgba(255,255,255,0.95)", backdropFilter:"blur(12px)",
      border:"1.5px solid #e2e8f0", borderRadius:50,
      boxShadow:"0 4px 24px rgba(0,0,0,0.12)",
      display:"flex", alignItems:"center", gap:4, padding:"6px 10px",
    }}>
      <span style={{fontSize:14}}>{SUPPORTED_LOCALES.find(x=>x.code===locale)?.flag||"🌐"}</span>
      <select value={locale} onChange={e => setLocale(e.target.value as Locale)}
        style={{border:"none",background:"transparent",fontSize:12,fontWeight:700,
          color:"#475569",cursor:"pointer",outline:"none",appearance:"none" as const,
          paddingRight:4}}>
        {SUPPORTED_LOCALES.filter(l => ENABLED_LOCALES.includes(l.code)).map(l => (
          <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
        ))}
      </select>
      <span style={{fontSize:10,color:"#94a3b8",pointerEvents:"none"}}>▾</span>
    </div>
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, currency, fxRate, fxSymbol, isRTL, country, t, fmtPrice }}>
      {children}
      {ready && <LangPicker />}
    </LocaleContext.Provider>
  );
}
