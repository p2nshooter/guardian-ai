/* i18n for components/auth/AuthFrame.tsx — every language the portal offers.
 * Keys and array shapes must match `en` exactly (tests/i18n-pages.test.ts). */
import type { Lang } from "../i18n-shared";

type Point = [string, string, string];

export const HEAD: Record<Lang, { eyebrow: string; title: string }> = {
  en: { eyebrow: "The professional AI workspace", title: "Do legal, security & business work 10× faster." },
  id: { eyebrow: "Ruang kerja AI profesional", title: "Kerjakan pekerjaan hukum, keamanan & bisnis 10× lebih cepat." },
  ms: { eyebrow: "Ruang kerja AI profesional", title: "Siapkan kerja undang-undang, keselamatan & perniagaan 10× lebih pantas." },
  de: { eyebrow: "Der professionelle AI-Arbeitsplatz", title: "Erledigen Sie Rechts-, Sicherheits- und Geschäftsarbeit 10× schneller." },
  fr: { eyebrow: "L'espace de travail IA professionnel", title: "Traitez vos dossiers juridiques, sécurité et business 10× plus vite." },
  it: { eyebrow: "Lo spazio di lavoro IA professionale", title: "Svolgi il lavoro legale, di sicurezza e di business 10× più velocemente." },
  zh: { eyebrow: "专业 AI 工作空间", title: "法律、安全与商业工作，效率提升 10 倍。" },
  ja: { eyebrow: "プロフェッショナルのための AI ワークスペース", title: "法務・セキュリティ・ビジネスの仕事を 10 倍速く。" },
  hi: { eyebrow: "पेशेवर AI वर्कस्पेस", title: "कानूनी, सुरक्षा और व्यावसायिक काम 10× तेज़ी से करें।" },
  ar: { eyebrow: "مساحة العمل الاحترافية بالذكاء الاصطناعي", title: "أنجز أعمالك القانونية والأمنية والتجارية أسرع بعشر مرات." },
};

export const POINTS: Record<Lang, Point[]> = {
  en: [
    ["⚖️", "Legal AI for 200+ jurisdictions", "Filter by country, state or province; restructure a case file against current law, with sources."],
    ["🔑", "Your own AI — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter or your private model. Unlimited use, your data stays yours."],
    ["🖥️", "Self-hosted editions", "Business & Enterprise run the apps on your own servers with a signed licence."],
    ["⚡", "Instant activation", "Pay by card, PayPal, crypto or bank transfer — your plan and licences activate automatically."],
  ],
  id: [
    ["⚖️", "Legal AI untuk 200+ yurisdiksi", "Filter negara, negara bagian atau provinsi; susun ulang berkas perkara sesuai hukum terbaru, lengkap dengan sumber."],
    ["🔑", "AI milik Anda — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter atau model privat Anda. Tanpa batas, data tetap milik Anda."],
    ["🖥️", "Edisi self-hosted", "Business & Enterprise menjalankan aplikasi di server Anda sendiri dengan lisensi bertanda tangan."],
    ["⚡", "Aktivasi instan", "Bayar dengan kartu, PayPal, kripto atau transfer bank — paket dan lisensi aktif otomatis."],
  ],
  ms: [
    ["⚖️", "Legal AI untuk 200+ bidang kuasa", "Tapis mengikut negara, negeri atau wilayah; susun semula fail kes mengikut undang-undang terkini, lengkap dengan sumber."],
    ["🔑", "AI anda sendiri — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter atau model peribadi anda. Penggunaan tanpa had, data kekal milik anda."],
    ["🖥️", "Edisi hos sendiri", "Business & Enterprise menjalankan aplikasi pada pelayan anda sendiri dengan lesen bertandatangan."],
    ["⚡", "Pengaktifan segera", "Bayar dengan kad, PayPal, kripto atau pindahan bank — pelan dan lesen anda aktif secara automatik."],
  ],
  de: [
    ["⚖️", "Legal AI für 200+ Rechtsordnungen", "Nach Land, Bundesstaat oder Provinz filtern; eine Fallakte nach geltendem Recht neu aufbereiten – mit Quellen."],
    ["🔑", "Ihre eigene AI — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter oder Ihr privates Modell. Unbegrenzte Nutzung, Ihre Daten bleiben Ihre."],
    ["🖥️", "Self-Hosted-Editionen", "Business & Enterprise betreiben die Apps auf Ihren eigenen Servern mit signierter Lizenz."],
    ["⚡", "Sofortige Aktivierung", "Zahlen Sie per Karte, PayPal, Krypto oder Überweisung – Tarif und Lizenzen werden automatisch aktiviert."],
  ],
  fr: [
    ["⚖️", "IA juridique pour plus de 200 juridictions", "Filtrez par pays, État ou province ; restructurez un dossier au regard du droit en vigueur, avec les sources."],
    ["🔑", "Votre propre IA — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter ou votre modèle privé. Usage illimité, vos données restent les vôtres."],
    ["🖥️", "Éditions auto-hébergées", "Business et Enterprise exécutent les applications sur vos propres serveurs avec une licence signée."],
    ["⚡", "Activation immédiate", "Payez par carte, PayPal, crypto ou virement — votre offre et vos licences s'activent automatiquement."],
  ],
  it: [
    ["⚖️", "IA legale per oltre 200 giurisdizioni", "Filtra per paese, stato o provincia; ricostruisci un fascicolo alla luce del diritto vigente, con le fonti."],
    ["🔑", "La tua IA — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter o il tuo modello privato. Uso illimitato, i dati restano tuoi."],
    ["🖥️", "Edizioni self-hosted", "Business ed Enterprise eseguono le app sui tuoi server con una licenza firmata."],
    ["⚡", "Attivazione immediata", "Paga con carta, PayPal, crypto o bonifico: piano e licenze si attivano automaticamente."],
  ],
  zh: [
    ["⚖️", "覆盖 200+ 法域的法律 AI", "按国家、州或省筛选；依据现行法律重构案件材料，并附出处。"],
    ["🔑", "您自己的 AI — BYOK、BYOM、BYOE", "Claude、GPT、Gemini、Groq、OpenRouter 或您的私有模型。不限用量，数据始终归您所有。"],
    ["🖥️", "自托管版本", "Business 与 Enterprise 套餐可凭签名许可证在您自己的服务器上运行应用。"],
    ["⚡", "即时开通", "支持银行卡、PayPal、加密货币或银行转账付款——套餐与许可证自动生效。"],
  ],
  ja: [
    ["⚖️", "200 以上の法域に対応した法務 AI", "国・州・県で絞り込み、現行法に照らして事件記録を再構成。出典付き。"],
    ["🔑", "あなた自身の AI — BYOK・BYOM・BYOE", "Claude、GPT、Gemini、Groq、OpenRouter、またはプライベートモデル。無制限に利用でき、データはあなたのものです。"],
    ["🖥️", "セルフホスト版", "Business と Enterprise では、署名付きライセンスで自社サーバー上でアプリを実行できます。"],
    ["⚡", "即時アクティベーション", "カード・PayPal・暗号資産・銀行振込で支払うと、プランとライセンスが自動で有効になります。"],
  ],
  hi: [
    ["⚖️", "200+ क्षेत्राधिकारों के लिए लीगल AI", "देश, राज्य या प्रांत से फ़िल्टर करें; मौजूदा कानून के अनुसार केस फ़ाइल को स्रोतों सहित फिर से तैयार करें।"],
    ["🔑", "आपका अपना AI — BYOK, BYOM, BYOE", "Claude, GPT, Gemini, Groq, OpenRouter या आपका निजी मॉडल। असीमित उपयोग, आपका डेटा आपका ही रहता है।"],
    ["🖥️", "सेल्फ़-होस्टेड संस्करण", "Business और Enterprise हस्ताक्षरित लाइसेंस के साथ ऐप्स को आपके अपने सर्वर पर चलाते हैं।"],
    ["⚡", "तुरंत सक्रियण", "कार्ड, PayPal, क्रिप्टो या बैंक ट्रांसफ़र से भुगतान करें — आपका प्लान और लाइसेंस अपने-आप सक्रिय हो जाते हैं।"],
  ],
  ar: [
    ["⚖️", "ذكاء اصطناعي قانوني لأكثر من 200 ولاية قضائية", "صفِّ حسب الدولة أو الولاية أو المقاطعة، وأعد بناء ملف القضية وفق القانون النافذ مع ذكر المصادر."],
    ["🔑", "ذكاؤك الاصطناعي الخاص — BYOK وBYOM وBYOE", "Claude أو GPT أو Gemini أو Groq أو OpenRouter أو نموذجك الخاص. استخدام غير محدود، وتبقى بياناتك ملكك."],
    ["🖥️", "إصدارات الاستضافة الذاتية", "تشغّل باقتا Business وEnterprise التطبيقات على خوادمك بترخيص موقَّع."],
    ["⚡", "تفعيل فوري", "ادفع بالبطاقة أو PayPal أو العملات المشفرة أو التحويل البنكي — تُفعَّل باقتك وتراخيصك تلقائيًا."],
  ],
};
