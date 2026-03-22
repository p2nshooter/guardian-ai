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
  ID:"IDR", MY:"MYR", SG:"SGD", TH:"THB", VN:"VND", PH:"PHP",
  JP:"JPY", KR:"KRW", CN:"CNY", TW:"TWD", HK:"HKD",
  IN:"INR", PK:"PKR",
  SA:"SAR", AE:"AED", EG:"EGP", QA:"QAR", KW:"KWD",
  DE:"EUR", FR:"EUR", ES:"EUR", IT:"EUR", NL:"EUR", PT:"EUR", BE:"EUR",
  GB:"GBP", CH:"CHF", SE:"SEK", NO:"NOK", DK:"DKK",
  BR:"BRL", MX:"MXN", AR:"ARS",
  AU:"AUD", NZ:"NZD", CA:"CAD",
  RU:"RUB", TR:"TRY",
  NG:"NGN", ZA:"ZAR",
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
        // Get browser language first (fast, no network)
        const browserLang = navigator.language?.split("-")[0]?.toLowerCase() as Locale;
        const validLangs = SUPPORTED_LOCALES.map(x => x.code);
        if (browserLang && (validLangs as string[]).includes(browserLang)) {
          setLocaleState(browserLang);
          if (typeof document !== "undefined") {
            document.documentElement.lang = browserLang;
            document.documentElement.dir = RTL_LOCALES.has(browserLang) ? "rtl" : "ltr";
          }
        }

        // Get CF country + FX rates (one request)
        const r = await fetch("/api/fx-rates");
        if (!r.ok) { setReady(true); return; }

        const cfCountry = r.headers.get("cf-ipcountry") || "";
        const data = await r.json();

        if (cfCountry) {
          setCountry(cfCountry);
          const detectedLocale = COUNTRY_TO_LOCALE[cfCountry];
          if (detectedLocale) {
            setLocaleState(detectedLocale);
            if (typeof document !== "undefined") {
              document.documentElement.lang = detectedLocale;
              document.documentElement.dir = RTL_LOCALES.has(detectedLocale) ? "rtl" : "ltr";
            }
          }
          // Set currency
          const detectedCurrency = COUNTRY_CURRENCY[cfCountry] || "USD";
          if (detectedCurrency !== "USD" && data.rates?.[detectedCurrency]) {
            setCurrency(detectedCurrency);
            setFxRate(data.rates[detectedCurrency]);
            const symbols: Record<string, string> = {
              IDR:"Rp", MYR:"RM", SGD:"S$", JPY:"¥", CNY:"¥", EUR:"€",
              GBP:"£", AUD:"A$", AED:"د.إ", KRW:"₩", THB:"฿", INR:"₹",
              BRL:"R$", MXN:"$", CAD:"C$", CHF:"Fr", SEK:"kr", NOK:"kr",
              DKK:"kr", HKD:"HK$", TWD:"NT$", RUB:"₽", TRY:"₺", ZAR:"R",
            };
            setFxSymbol(symbols[detectedCurrency] || detectedCurrency + " ");
          }
        }
      } catch {}
      setReady(true);
    };

    detectAuto();
  }, [setLocale]);

  const t = useCallback((key: string) => translate(key, locale), [locale]);

  const fmtPrice = useCallback((usd: number): string => {
    const local = Math.round(usd * fxRate);
    if (currency === "IDR") return "Rp" + (local >= 1_000_000 ? (local/1_000_000).toFixed(0)+"jt" : local.toLocaleString("id-ID"));
    if (currency === "JPY" || currency === "KRW") return fxSymbol + local.toLocaleString();
    if (currency === "INR") return "₹" + (local >= 100_000 ? (local/100_000).toFixed(1)+"L" : local.toLocaleString("en-IN"));
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
        {SUPPORTED_LOCALES.map(l => (
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
