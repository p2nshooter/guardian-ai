/**
 * AXTO — i18n (Internationalization)
 * Supported: id (Indonesia), en (English), zh (Chinese), ar (Arabic)
 * Edge-compatible — no external dependencies
 */

export type Locale = "id" | "en" | "zh" | "ar";

export const LOCALES: { code: Locale; label: string; flag: string; dir: "ltr" | "rtl" }[] = [
  { code: "id", label: "Indonesia",   flag: "🇮🇩", dir: "ltr" },
  { code: "en", label: "English",     flag: "🇺🇸", dir: "ltr" },
  { code: "zh", label: "中文",         flag: "🇨🇳", dir: "ltr" },
  { code: "ar", label: "العربية",     flag: "🇸🇦", dir: "rtl" },
];

// ── Currency config ────────────────────────────────────────────────────────
// Static metadata (symbol, locale) — rates are fetched live from /api/fx-rates.
// These fallback rates are used only when the live API + KV are both unreachable.
export const CURRENCIES = {
  IDR: { symbol: "Rp",  fallbackRate: 15_900, locale: "id-ID", decimals: 0 },
  USD: { symbol: "$",   fallbackRate: 1,       locale: "en-US", decimals: 0 },
  SGD: { symbol: "S$",  fallbackRate: 1.34,    locale: "en-SG", decimals: 0 },
  MYR: { symbol: "RM",  fallbackRate: 4.72,    locale: "ms-MY", decimals: 0 },
  EUR: { symbol: "€",   fallbackRate: 0.93,    locale: "de-DE", decimals: 0 },
  GBP: { symbol: "£",   fallbackRate: 0.79,    locale: "en-GB", decimals: 0 },
  AED: { symbol: "د.إ", fallbackRate: 3.67,    locale: "ar-AE", decimals: 0 },
  CNY: { symbol: "¥",   fallbackRate: 7.26,    locale: "zh-CN", decimals: 0 },
  JPY: { symbol: "¥",   fallbackRate: 151,     locale: "ja-JP", decimals: 0 },
  AUD: { symbol: "A$",  fallbackRate: 1.54,    locale: "en-AU", decimals: 0 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

/**
 * Convert a USD price to a formatted local-currency string using LIVE rates.
 * Fetches /api/fx-rates (cached 1h by Cloudflare CDN) in the browser.
 * Falls back to static fallbackRate if the fetch fails.
 *
 * @param usdPrice    Price in USD
 * @param currency    Target currency code
 * @returns           Formatted string, e.g. "Rp156jt" or "€46"
 */
export async function convertPriceLive(usdPrice: number, currency: CurrencyCode): Promise<string> {
  const cfg = CURRENCIES[currency] ?? CURRENCIES.USD;
  let rate: number = cfg.fallbackRate;

  try {
    const res = await fetch("/api/fx-rates");
    if (res.ok) {
      const data = await res.json() as { rates?: Record<string, number> };
      if (data.rates?.[currency] && data.rates[currency] > 0) {
        rate = data.rates[currency];
      }
    }
  } catch { /* use fallback */ }

  return _format(usdPrice, rate, currency, cfg.symbol);
}

/**
 * Synchronous version using pre-fetched rates.
 * Pass the `rates` object returned by /api/fx-rates.
 */
export function convertPriceSync(
  usdPrice: number,
  currency: CurrencyCode,
  liveRates?: Record<string, number>
): string {
  const cfg = CURRENCIES[currency] ?? CURRENCIES.USD;
  const rate: number = liveRates?.[currency] ?? cfg.fallbackRate;
  return _format(usdPrice, rate, currency, cfg.symbol);
}

function _format(usdPrice: number, rate: number, currency: string, symbol: string): string {
  const val = Math.round(usdPrice * rate);
  if (currency === "IDR") {
    if (val >= 1_000_000) return `${symbol}${(val / 1_000_000).toFixed(1)}jt`;
    if (val >= 1_000)     return `${symbol}${(val / 1_000).toFixed(0)}rb`;
  }
  return `${symbol}${val.toLocaleString()}`;
}

/** @deprecated Use convertPriceLive or convertPriceSync instead. */
export function convertPrice(usdPrice: number, currency: CurrencyCode): string {
  const cfg = CURRENCIES[currency] ?? CURRENCIES.USD;
  return _format(usdPrice, cfg.fallbackRate, currency, cfg.symbol);
}

// ── Detect locale from browser / IP ───────────────────────────────────────
export function detectLocaleFromCountry(countryCode: string): { locale: Locale; currency: CurrencyCode } {
  const map: Record<string, { locale: Locale; currency: CurrencyCode }> = {
    ID: { locale: "id", currency: "IDR" },
    SG: { locale: "en", currency: "SGD" },
    MY: { locale: "en", currency: "MYR" },
    AU: { locale: "en", currency: "AUD" },
    GB: { locale: "en", currency: "GBP" },
    DE: { locale: "en", currency: "EUR" },
    FR: { locale: "en", currency: "EUR" },
    NL: { locale: "en", currency: "EUR" },
    AE: { locale: "ar", currency: "AED" },
    SA: { locale: "ar", currency: "AED" },
    CN: { locale: "zh", currency: "CNY" },
    TW: { locale: "zh", currency: "USD" },
    HK: { locale: "zh", currency: "USD" },
    JP: { locale: "en", currency: "JPY" },
  };
  return map[countryCode] || { locale: "en", currency: "USD" };
}

// ── Translations ──────────────────────────────────────────────────────────
const T = {
  // ── Nav ─────────────────────────────────────────────────────────────────
  nav_pricing:   { id: "Harga",        en: "Pricing",      zh: "价格",    ar: "الأسعار" },
  nav_features:  { id: "Fitur",        en: "Features",     zh: "功能",    ar: "الميزات" },
  nav_login:     { id: "Masuk",        en: "Login",        zh: "登录",    ar: "دخول" },
  nav_docs:      { id: "Dokumentasi",  en: "Docs",         zh: "文档",    ar: "الوثائق" },

  // ── Hero ────────────────────────────────────────────────────────────────
  hero_badge:    { id: "AI Keamanan + Orkestrasi untuk Enterprise", en: "AI Security + Orchestration for Enterprise", zh: "企业级AI安全与编排平台", ar: "أمان الذكاء الاصطناعي والتنسيق للمؤسسات" },
  hero_title1:   { id: "Lindungi Server &", en: "Protect Servers &", zh: "保护服务器 &", ar: "احمِ الخوادم و" },
  hero_title2:   { id: "Optimalkan AI Anda", en: "Optimize Your AI", zh: "优化您的AI", ar: "حسِّن منصة AI" },
  hero_sub:      { id: "Platform AI keamanan server enterprise yang berjalan 100% di infrastruktur Anda. Data tidak pernah meninggalkan server Anda.", en: "Enterprise server security AI platform running 100% on your own infrastructure. Your data never leaves your server.", zh: "100%运行在您自己基础设施上的企业级服务器安全AI平台。您的数据永远不会离开您的服务器。", ar: "منصة أمان الخوادم بالذكاء الاصطناعي للمؤسسات تعمل 100% على بنيتك التحتية. بياناتك لا تغادر خوادمك أبدًا." },
  hero_cta1:     { id: "Lihat Harga →", en: "View Pricing →", zh: "查看价格 →", ar: "عرض الأسعار ←" },
  hero_cta2:     { id: "Masuk ke Akun", en: "Login to Account", zh: "登录账户", ar: "الدخول إلى الحساب" },

  // ── Stats ────────────────────────────────────────────────────────────────
  stat_selfhosted: { id: "Self-Hosted", en: "Self-Hosted", zh: "自托管", ar: "استضافة ذاتية" },
  stat_detect:     { id: "Deteksi Ancaman", en: "Threat Detection", zh: "威胁检测", ar: "كشف التهديدات" },
  stat_byok:       { id: "Bawa Key Anda", en: "Bring Your Own Keys", zh: "自带密钥", ar: "أحضر مفاتيحك" },
  stat_uptime:     { id: "Jaminan Uptime", en: "Uptime SLA", zh: "运行时间SLA", ar: "اتفاقية وقت التشغيل" },

  // ── Features section ────────────────────────────────────────────────────
  feat_title:    { id: "Semua yang Anda Butuhkan", en: "Everything You Need", zh: "您所需要的一切", ar: "كل ما تحتاجه" },
  feat_sub:      { id: "Dari deteksi ancaman AI hingga orkestrasi model AI — satu platform, kontrol penuh.", en: "From AI threat detection to AI model orchestration — one platform, full control.", zh: "从AI威胁检测到AI模型编排——一个平台，完全控制。", ar: "من كشف تهديدات الذكاء الاصطناعي إلى تنسيق نماذج الذكاء الاصطناعي - منصة واحدة، تحكم كامل." },

  // ── Pricing ─────────────────────────────────────────────────────────────
  price_title:   { id: "Pilih Paket Anda", en: "Choose Your Plan", zh: "选择您的方案", ar: "اختر خطتك" },
  price_sub:     { id: "Bayar sekali, gunakan selamanya. Tidak ada biaya tersembunyi.", en: "One-time payment, use forever. No hidden fees.", zh: "一次性付款，永久使用。没有隐藏费用。", ar: "دفع لمرة واحدة، استخدام للأبد. لا رسوم خفية." },
  price_yearly:  { id: "Tahunan", en: "Yearly", zh: "年付", ar: "سنوي" },
  price_monthly: { id: "Bulanan", en: "Monthly", zh: "月付", ar: "شهري" },
  price_save:    { id: "Hemat ~20%", en: "Save ~20%", zh: "节省~20%", ar: "وفر ~20٪" },
  price_popular: { id: "Paling Populer", en: "Most Popular", zh: "最受欢迎", ar: "الأكثر شعبية" },
  price_nodes:   { id: "node", en: "nodes", zh: "节点", ar: "عقدة" },
  price_unlimited: { id: "Tak terbatas", en: "Unlimited", zh: "无限制", ar: "غير محدود" },
  price_year:    { id: "tahun", en: "year", zh: "年", ar: "سنة" },
  price_month:   { id: "bulan", en: "month", zh: "月", ar: "شهر" },
  price_btn:     { id: "Bayar", en: "Pay", zh: "支付", ar: "الدفع" },

  // ── Checkout form ────────────────────────────────────────────────────────
  form_currency: { id: "Mata Uang", en: "Currency", zh: "货币", ar: "العملة" },
  form_name:     { id: "Nama Lengkap", en: "Full Name", zh: "全名", ar: "الاسم الكامل" },
  form_email:    { id: "Alamat Email", en: "Email Address", zh: "电子邮件", ar: "البريد الإلكتروني" },
  form_org:      { id: "Nama Perusahaan", en: "Company Name", zh: "公司名称", ar: "اسم الشركة" },
  form_payment:  { id: "Metode Pembayaran", en: "Payment Method", zh: "支付方式", ar: "طريقة الدفع" },
  form_secure:   { id: "🔒 Pembayaran aman. Lisensi dikirim ke email dalam 5 menit.", en: "🔒 Secure payment. License sent to email within 5 minutes.", zh: "🔒 安全付款。许可证将在5分钟内发送到您的电子邮件。", ar: "🔒 دفع آمن. يتم إرسال الترخيص إلى البريد الإلكتروني خلال 5 دقائق." },
  form_required: { id: "wajib diisi", en: "required", zh: "必填", ar: "مطلوب" },
  form_processing: { id: "Memproses...", en: "Processing...", zh: "处理中...", ar: "جارٍ المعالجة..." },

  // ── Guardian AI product ──────────────────────────────────────────────────
  guardian_name: { id: "Guardian AI", en: "Guardian AI", zh: "Guardian AI", ar: "Guardian AI" },
  guardian_desc: { id: "Keamanan server berbasis AI", en: "AI-based server security", zh: "基于AI的服务器安全", ar: "أمان الخوادم المبني على الذكاء الاصطناعي" },

  // ── Orchestra AI product ─────────────────────────────────────────────────
  orchestra_name: { id: "Orchestra AI", en: "Orchestra AI", zh: "Orchestra AI", ar: "Orchestra AI" },
  orchestra_desc: { id: "Orkestrasi AI multi-provider", en: "Multi-provider AI orchestration", zh: "多提供商AI编排", ar: "تنسيق الذكاء الاصطناعي متعدد المزودين" },

  // ── Bundle ───────────────────────────────────────────────────────────────
  bundle_name:   { id: "Bundle Hemat", en: "Bundle & Save", zh: "套餐优惠", ar: "حزمة الادخار" },
  bundle_desc:   { id: "Guardian + Orchestra dengan diskon 10%", en: "Guardian + Orchestra with 10% discount", zh: "Guardian + Orchestra，享9折优惠", ar: "Guardian + Orchestra بخصم 10٪" },

  // ── FAQ ──────────────────────────────────────────────────────────────────
  faq_title:     { id: "Pertanyaan Umum", en: "FAQ", zh: "常见问题", ar: "الأسئلة الشائعة" },

  // ── CTA section ──────────────────────────────────────────────────────────
  cta_title:     { id: "Mulai Lindungi Server Anda", en: "Start Protecting Your Servers", zh: "开始保护您的服务器", ar: "ابدأ حماية خوادمك" },
  cta_sub:       { id: "Setup dalam 15 menit. Tidak perlu keahlian khusus.", en: "Setup in 15 minutes. No special expertise needed.", zh: "15分钟内完成设置。无需专业知识。", ar: "الإعداد في 15 دقيقة. لا يلزم خبرة خاصة." },
  cta_btn:       { id: "Pilih Paket →", en: "Choose Plan →", zh: "选择方案 →", ar: "اختر الخطة ←" },
  cta_contact:   { id: "💬 Hubungi Kami", en: "💬 Contact Us", zh: "💬 联系我们", ar: "💬 اتصل بنا" },

  // ── Login page ───────────────────────────────────────────────────────────
  login_title:   { id: "Selamat Datang", en: "Welcome Back", zh: "欢迎回来", ar: "مرحباً بعودتك" },
  login_sub:     { id: "Masuk ke akun AXTO Anda", en: "Sign in to your AXTO account", zh: "登录您的AXTO账户", ar: "سجّل الدخول إلى حساب AXTO" },
  login_email:   { id: "Alamat Email", en: "Email Address", zh: "电子邮件", ar: "البريد الإلكتروني" },
  login_magic:   { id: "✉️ Link Email", en: "✉️ Email Link", zh: "✉️ 邮件链接", ar: "✉️ رابط البريد" },
  login_pass:    { id: "🔒 Password", en: "🔒 Password", zh: "🔒 密码", ar: "🔒 كلمة المرور" },
  login_send:    { id: "Kirim Link Masuk →", en: "Send Login Link →", zh: "发送登录链接 →", ar: "إرسال رابط الدخول ←" },
  login_sending: { id: "⏳ Mengirim...", en: "⏳ Sending...", zh: "⏳ 发送中...", ar: "⏳ جارٍ الإرسال..." },
  login_signin:  { id: "Masuk ke Admin →", en: "Sign In to Admin →", zh: "登录管理员 →", ar: "الدخول كمسؤول ←" },
  login_checking: { id: "⏳ Memeriksa...", en: "⏳ Checking...", zh: "⏳ 检查中...", ar: "⏳ جارٍ التحقق..." },
  login_sent_title: { id: "Cek email Anda", en: "Check your email", zh: "查看您的邮件", ar: "تحقق من بريدك الإلكتروني" },
  login_sent_sub: { id: "Kami mengirim link masuk ke", en: "We sent a login link to", zh: "我们发送了登录链接到", ar: "أرسلنا رابط الدخول إلى" },
  login_expires: { id: "Berlaku 15 menit", en: "Expires in 15 minutes", zh: "15分钟内有效", ar: "صالح لمدة 15 دقيقة" },
  login_resend:  { id: "Kirim ulang ke email lain", en: "Resend to different email", zh: "重新发送到其他邮件", ar: "إعادة الإرسال إلى بريد آخر" },
  login_spam:    { id: "Tidak menemukan? Cek folder Spam", en: "Can't find it? Check Spam folder", zh: "找不到？检查垃圾邮件", ar: "لم تجده؟ تحقق من مجلد الرسائل غير المرغوب فيها" },
  login_admin_only: { id: "Khusus akun administrator", en: "Administrator accounts only", zh: "仅限管理员账户", ar: "لحسابات المسؤولين فقط" },
  login_err_email: { id: "Masukkan email Anda", en: "Please enter your email", zh: "请输入您的邮件", ar: "الرجاء إدخال بريدك الإلكتروني" },
  login_err_creds: { id: "Email dan password wajib diisi", en: "Email and password required", zh: "邮件和密码必填", ar: "البريد الإلكتروني وكلمة المرور مطلوبان" },
  login_err_expired: { id: "Link sudah kedaluwarsa. Minta link baru.", en: "Link expired. Request a new one.", zh: "链接已过期。请求新链接。", ar: "انتهت صلاحية الرابط. اطلب رابطاً جديداً." },
  login_err_invalid: { id: "Link masuk tidak valid.", en: "Invalid login link.", zh: "无效的登录链接。", ar: "رابط الدخول غير صالح." },

  // ── Portal ───────────────────────────────────────────────────────────────
  portal_hello:  { id: "Halo,", en: "Hello,", zh: "你好，", ar: "مرحباً،" },
  portal_licenses: { id: "Lisensi Saya", en: "My Licenses", zh: "我的许可证", ar: "تراخيصي" },
  portal_invoices: { id: "Riwayat Bayar", en: "Payment History", zh: "付款记录", ar: "سجل الدفعات" },
  portal_active:   { id: "Aktif", en: "Active", zh: "活跃", ar: "نشط" },
  portal_suspended: { id: "Ditangguhkan", en: "Suspended", zh: "已暂停", ar: "معلق" },
  portal_expired:  { id: "Kedaluwarsa", en: "Expired", zh: "已过期", ar: "منتهي الصلاحية" },
  portal_revoked:  { id: "Dicabut", en: "Revoked", zh: "已撤销", ar: "ملغى" },
  portal_copy:     { id: "Salin", en: "Copy", zh: "复制", ar: "نسخ" },
  portal_copied:   { id: "✓ Disalin", en: "✓ Copied", zh: "✓ 已复制", ar: "✓ تم النسخ" },
  portal_logout:   { id: "Keluar", en: "Sign Out", zh: "退出", ar: "تسجيل الخروج" },
  portal_support:  { id: "Butuh Bantuan?", en: "Need Help?", zh: "需要帮助？", ar: "تحتاج مساعدة؟" },
  portal_contact:  { id: "📧 Hubungi Support", en: "📧 Contact Support", zh: "📧 联系支持", ar: "📧 تواصل مع الدعم" },
  portal_reset:    { id: "🔄 Reset Binding Node", en: "🔄 Reset Node Binding", zh: "🔄 重置节点绑定", ar: "🔄 إعادة تعيين ربط العقدة" },
  portal_expires_in: { id: "hari lagi", en: "days left", zh: "天后到期", ar: "أيام متبقية" },
  portal_expired_ago: { id: "hari lalu", en: "days ago", zh: "天前到期", ar: "أيام مضت" },
  portal_no_licenses: { id: "Belum ada lisensi", en: "No licenses yet", zh: "暂无许可证", ar: "لا توجد تراخيص بعد" },
  portal_no_invoices: { id: "Belum ada riwayat bayar", en: "No payment history", zh: "暂无付款记录", ar: "لا يوجد سجل دفعات" },
  portal_paid:     { id: "Lunas", en: "Paid", zh: "已支付", ar: "مدفوع" },

  // ── Admin ────────────────────────────────────────────────────────────────
  admin_dashboard: { id: "Dasbor Admin", en: "Admin Dashboard", zh: "管理员仪表板", ar: "لوحة الإدارة" },
  admin_licenses:  { id: "Semua Lisensi", en: "All Licenses", zh: "所有许可证", ar: "جميع التراخيص" },
  admin_clients:   { id: "Klien", en: "Clients", zh: "客户", ar: "العملاء" },
  admin_revenue:   { id: "Pendapatan", en: "Revenue", zh: "收入", ar: "الإيرادات" },
  admin_content:   { id: "Konten", en: "Content", zh: "内容", ar: "المحتوى" },
  admin_gateways:  { id: "Gateway", en: "Gateways", zh: "支付网关", ar: "بوابات الدفع" },
  admin_autopost:  { id: "AutoPost", en: "AutoPost", zh: "自动发布", ar: "النشر التلقائي" },
  admin_new_lic:   { id: "+ Lisensi", en: "+ License", zh: "+ 许可证", ar: "+ ترخيص" },
  admin_signout:   { id: "Keluar", en: "Sign Out", zh: "退出", ar: "تسجيل الخروج" },

  // ── Features ────────────────────────────────────────────────────────────
  feat_ai_title:   { id: "AI Behavioral Analysis", en: "AI Behavioral Analysis", zh: "AI行为分析", ar: "التحليل السلوكي بالذكاء الاصطناعي" },
  feat_ai_desc:    { id: "Sistem AI mengenali pola serangan baru yang belum pernah ada sebelumnya.", en: "AI recognizes new attack patterns never seen before.", zh: "AI识别以前从未见过的新攻击模式。", ar: "يتعرف الذكاء الاصطناعي على أنماط الهجوم الجديدة التي لم يسبق رؤيتها." },
  feat_sh_title:   { id: "100% Self-Hosted", en: "100% Self-Hosted", zh: "100%自托管", ar: "استضافة ذاتية 100٪" },
  feat_sh_desc:    { id: "Data Anda tetap di server Anda. Tidak ada cloud pihak ketiga.", en: "Your data stays on your servers. No third-party cloud.", zh: "您的数据保留在您的服务器上。没有第三方云。", ar: "تبقى بياناتك على خوادمك. لا سحابة من طرف ثالث." },
  feat_rt_title:   { id: "Respons Real-Time", en: "Real-Time Response", zh: "实时响应", ar: "استجابة فورية" },
  feat_rt_desc:    { id: "Ancaman terdeteksi dan diblokir dalam hitungan detik.", en: "Threats detected and blocked in seconds.", zh: "威胁在几秒钟内被检测并阻止。", ar: "يتم اكتشاف التهديدات وحجبها في ثوانٍ." },
  feat_orch_title: { id: "AI Orchestration", en: "AI Orchestration", zh: "AI编排", ar: "تنسيق الذكاء الاصطناعي" },
  feat_orch_desc:  { id: "Kelola puluhan AI provider dalam satu platform.", en: "Manage dozens of AI providers in one platform.", zh: "在一个平台中管理数十个AI提供商。", ar: "إدارة عشرات مزودي الذكاء الاصطناعي في منصة واحدة." },
  feat_dash_title: { id: "Dashboard Terpusat", en: "Centralized Dashboard", zh: "集中式仪表板", ar: "لوحة تحكم مركزية" },
  feat_dash_desc:  { id: "Pantau semua server dari satu dashboard.", en: "Monitor all servers from one dashboard.", zh: "从一个仪表板监控所有服务器。", ar: "مراقبة جميع الخوادم من لوحة تحكم واحدة." },
  feat_byok_title: { id: "BYOK Support", en: "BYOK Support", zh: "自带密钥支持", ar: "دعم إحضار مفاتيحك الخاصة" },
  feat_byok_desc:  { id: "Gunakan API key AI Anda sendiri.", en: "Use your own AI provider API keys.", zh: "使用您自己的AI提供商API密钥。", ar: "استخدم مفاتيح API لمزود الذكاء الاصطناعي الخاص بك." },
} as const;

type TranslationKey = keyof typeof T;

export function t(key: TranslationKey, locale: Locale): string {
  const entry = T[key];
  if (!entry) return key;
  return (entry as any)[locale] || (entry as any)["en"] || key;
}

// ── FAQ content per language ──────────────────────────────────────────────
export const FAQS: Record<Locale, { q: string; a: string }[]> = {
  id: [
    { q: "Apakah AXTO menyimpan data server saya?", a: "Tidak sama sekali. Guardian AI dan Orchestra AI berjalan 100% di server Anda sendiri. AXTO hanya memvalidasi lisensi — kami tidak pernah melihat, menyentuh, atau menyimpan data Anda." },
    { q: "Apa itu BYOK?", a: "Bring Your Own Keys — Anda menggunakan API key AI provider Anda sendiri (OpenAI, Anthropic, dll). Key tersebut disimpan di server Anda, bukan di AXTO." },
    { q: "Berapa lama proses setup?", a: "Rata-rata 15-30 menit. Jalankan docker compose up dengan file konfigurasi kami." },
    { q: "Bagaimana pembayaran untuk pengguna Indonesia?", a: "Kami mendukung transfer bank, QRIS, GoPay, OVO, Dana, BCA, Mandiri, BRI, BNI, Linkaja, dan kartu kredit via Midtrans dan Xendit." },
    { q: "Apakah ada uji coba gratis?", a: "Ya! Guardian AI dan Orchestra AI tersedia dalam lisensi trial 1–7 hari. Admin dapat mengaktifkan trial langsung dari panel admin. Garansi kepuasan 30 hari untuk semua paket berbayar." },
  ],
  en: [
    { q: "Does AXTO store my server data?", a: "Not at all. Guardian AI and Orchestra AI run 100% on your own servers. AXTO only validates your license — we never see, touch, or store your data." },
    { q: "What is BYOK?", a: "Bring Your Own Keys — you use your own AI provider API keys (OpenAI, Anthropic, etc.). Keys are stored on your server, not at AXTO." },
    { q: "How long does setup take?", a: "About 15-30 minutes on average. Run docker compose up with our configuration files." },
    { q: "Is there a free trial?", a: "Yes! Guardian AI and Orchestra AI are available as 1–7 day trial licenses. Trials can be activated directly from the admin panel. 30-day satisfaction guarantee on all paid plans." },
    { q: "What payment methods are supported?", a: "We support credit cards (Visa/Mastercard/Amex), PayPal, and local payment methods depending on your region." },
  ],
  zh: [
    { q: "AXTO会存储我的服务器数据吗？", a: "绝对不会。Guardian AI和Orchestra AI 100%运行在您自己的服务器上。AXTO只验证您的许可证——我们从不查看、触碰或存储您的数据。" },
    { q: "什么是BYOK？", a: "自带密钥——您使用自己的AI提供商API密钥（OpenAI、Anthropic等）。密钥存储在您的服务器上，而不是AXTO。" },
    { q: "设置需要多长时间？", a: "平均15-30分钟。使用我们的配置文件运行docker compose up。" },
    { q: "有免费试用吗？", a: "目前没有，但您可以联系我们的团队进行现场演示。30天满意保证。" },
  ],
  ar: [
    { q: "هل تخزن AXTO بيانات خادمي؟", a: "لا على الإطلاق. يعمل Guardian AI وOrchestra AI بنسبة 100٪ على خوادمك الخاصة. تتحقق AXTO فقط من ترخيصك - نحن لا نرى بياناتك أو نلمسها أو نخزنها." },
    { q: "ما هو BYOK؟", a: "أحضر مفاتيحك الخاصة — تستخدم مفاتيح API الخاصة بمزود الذكاء الاصطناعي (OpenAI وAnthropic وما إلى ذلك). يتم تخزين المفاتيح على خادمك وليس في AXTO." },
    { q: "كم يستغرق الإعداد؟", a: "حوالي 15-30 دقيقة في المتوسط. قم بتشغيل docker compose up مع ملفات التكوين الخاصة بنا." },
    { q: "هل هناك تجربة مجانية؟", a: "ليس حاليًا، لكن يمكنك الاتصال بفريقنا للحصول على عرض توضيحي مباشر. ضمان الرضا لمدة 30 يومًا." },
  ],
};

// ── Package names per language ─────────────────────────────────────────────
export const PACKAGE_FEATURES: Record<Locale, {
  guardian: string[][];
  orchestra: string[][];
  bundle: string[][];
}> = {
  id: {
    guardian: [
      ["1 server dilindungi","AI Behavioral Analysis","Deteksi ancaman real-time","Email notifikasi"],
      ["10 server dilindungi","Semua fitur Lite","Threat Hunting","Dashboard terpusat","API akses"],
      ["100 server dilindungi","Semua fitur Pro","mTLS + eBPF","SIEM integration","Compliance report"],
      ["1000 server dilindungi","Semua fitur Shield","Custom SLA","Dedicated support","White-label"],
    ],
    orchestra: [
      ["1 cluster AI","10 worker node","5 GPU worker","5 mode routing","OpenAI + Claude + Gemini"],
      ["3 cluster AI","50 worker node","GPU tak terbatas","Semua mode routing","Auto failover"],
      ["Cluster tak terbatas","Worker tak terbatas","GPU tak terbatas","Custom routing","White-label API"],
    ],
    bundle: [
      ["Guardian Lite + Orchestra Core","Diskon 10%","1 server + 1 cluster AI"],
      ["Guardian Pro + Orchestra Scale","Diskon 10%","10 server + 3 cluster AI","Paling populer"],
      ["Guardian Shield + Orchestra Unlimited","Diskon 10%","Skala enterprise penuh"],
    ],
  },
  en: {
    guardian: [
      ["1 server protected","AI Behavioral Analysis","Real-time threat detection","Email notifications"],
      ["10 servers protected","All Lite features","Threat Hunting","Central dashboard","API access"],
      ["100 servers protected","All Pro features","mTLS + eBPF","SIEM integration","Compliance report"],
      ["1000 servers protected","All Shield features","Custom SLA","Dedicated support","White-label"],
    ],
    orchestra: [
      ["1 AI cluster","10 worker nodes","5 GPU workers","5 routing modes","OpenAI + Claude + Gemini"],
      ["3 AI clusters","50 worker nodes","Unlimited GPU","All routing modes","Auto failover"],
      ["Unlimited clusters","Unlimited workers","Unlimited GPU","Custom routing","White-label API"],
    ],
    bundle: [
      ["Guardian Lite + Orchestra Core","10% discount","1 server + 1 AI cluster"],
      ["Guardian Pro + Orchestra Scale","10% discount","10 servers + 3 AI clusters","Most popular"],
      ["Guardian Shield + Orchestra Unlimited","10% discount","Full enterprise scale"],
    ],
  },
  zh: {
    guardian: [
      ["1台服务器保护","AI行为分析","实时威胁检测","电子邮件通知"],
      ["10台服务器保护","所有Lite功能","威胁猎杀","中央仪表板","API访问"],
      ["100台服务器保护","所有Pro功能","mTLS + eBPF","SIEM集成","合规报告"],
      ["1000台服务器保护","所有Shield功能","自定义SLA","专属支持","白标"],
    ],
    orchestra: [
      ["1个AI集群","10个工作节点","5个GPU工作节点","5种路由模式","OpenAI + Claude + Gemini"],
      ["3个AI集群","50个工作节点","无限GPU","所有路由模式","自动故障切换"],
      ["无限集群","无限工作节点","无限GPU","自定义路由","白标API"],
    ],
    bundle: [
      ["Guardian Lite + Orchestra Core","9折优惠","1台服务器 + 1个AI集群"],
      ["Guardian Pro + Orchestra Scale","9折优惠","10台服务器 + 3个AI集群","最受欢迎"],
      ["Guardian Shield + Orchestra Unlimited","9折优惠","完整企业规模"],
    ],
  },
  ar: {
    guardian: [
      ["حماية خادم واحد","تحليل سلوكي بالذكاء الاصطناعي","كشف التهديدات في الوقت الفعلي","إشعارات البريد الإلكتروني"],
      ["حماية 10 خوادم","جميع ميزات Lite","صيد التهديدات","لوحة تحكم مركزية","وصول API"],
      ["حماية 100 خادم","جميع ميزات Pro","mTLS + eBPF","تكامل SIEM","تقرير الامتثال"],
      ["حماية 1000 خادم","جميع ميزات Shield","SLA مخصص","دعم مخصص","علامة بيضاء"],
    ],
    orchestra: [
      ["مجموعة ذكاء اصطناعي واحدة","10 عُقَد عاملة","5 عُقَد GPU","5 أوضاع توجيه","OpenAI + Claude + Gemini"],
      ["3 مجموعات ذكاء اصطناعي","50 عُقْدة عاملة","GPU غير محدود","جميع أوضاع التوجيه","التبديل التلقائي"],
      ["مجموعات غير محدودة","عُقَد غير محدودة","GPU غير محدود","توجيه مخصص","API علامة بيضاء"],
    ],
    bundle: [
      ["Guardian Lite + Orchestra Core","خصم 10٪","خادم واحد + مجموعة ذكاء اصطناعي"],
      ["Guardian Pro + Orchestra Scale","خصم 10٪","10 خوادم + 3 مجموعات ذكاء اصطناعي","الأكثر شعبية"],
      ["Guardian Shield + Orchestra Unlimited","خصم 10٪","حجم المؤسسة الكامل"],
    ],
  },
};
