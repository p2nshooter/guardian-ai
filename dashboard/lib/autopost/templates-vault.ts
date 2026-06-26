/* ==============================================================================
 * Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Author & Architect: Yusron Efendi <hallo@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 */
// ============================================================
// AXTO Vault — AutoPost Master Template Library
// 200+ templates across 10 languages
// Platforms: LinkedIn, Twitter/X, Facebook, Instagram, WhatsApp, Telegram, Reddit, Medium
// Target: Enterprise decision-makers, CTOs, CISOs, Data Privacy Officers, DevOps
// ============================================================

import type { AutoPostTemplate } from "./templates";

export const VAULT_TEMPLATES: AutoPostTemplate[] = [

  // ════════════════════════════════════════════════════════
  // ENGLISH — LinkedIn / Professional
  // ════════════════════════════════════════════════════════
  {
    id: "v_en_001",
    title: "Vault — Executive Problem Statement",
    category: "vault",
    platforms: ["linkedin"],
    language: "en",
    body_text: `Every day, enterprises send thousands of requests to OpenAI, Claude, and Gemini.

Every one of those requests potentially contains:
→ Customer emails and phone numbers
→ Patient records and diagnoses
→ Credit card numbers and bank accounts
→ Employee SSNs and personnel files

Your AI vendor's terms of service state they may use your data for training.
Your compliance team wants a paper trail.
Your security team wants none of this leaving your perimeter.

AXTO Vault solves this in a single line of configuration.

It intercepts every AI API call. Redacts the sensitive data. Forwards clean text. Re-injects originals in the response.

Your AI never sees your data. Your users never notice.

BYOK — your AI keys, your infrastructure, your control.

{{cta}}`,
    hashtags: ["#DataPrivacy","#AICompliance","#HIPAA","#GDPR","#EnterpriseAI","#BYOK","#CyberSecurity","#AXTOVault"],
    cta_text: "→ See how it works: axto.io/vault",
    image_prompt: "Dark professional enterprise tech visualization: a transparent shield intercepting data packets flowing from a corporate building to AI cloud servers, glowing purple and indigo, high-contrast, minimalist",
    variables: [],
  },
  {
    id: "v_en_002",
    title: "Vault — HIPAA Healthcare Angle",
    category: "vault",
    platforms: ["linkedin","facebook"],
    language: "en",
    body_text: `Healthcare organizations face a critical dilemma:

AI assistants are transforming clinical workflows — but HIPAA prohibits sending PHI to third-party services.

Most teams are doing one of three things:
1. Manually scrubbing data before every AI query (slow, error-prone)
2. Avoiding AI entirely (losing competitive advantage)
3. Hoping for the best (compliance nightmare waiting to happen)

AXTO Vault is option 4: automated, zero-effort PHI protection.

It sits between your app and the AI provider. Every patient name, diagnosis code, lab value, and insurance ID is automatically redacted before the request leaves your system — and seamlessly restored in the response.

Your clinical team gets AI insights. Your compliance officer sleeps at night.

Audit trail included. SOC 2, HIPAA, and ISO 27001 evidence generated automatically.

{{cta}}`,
    hashtags: ["#HIPAA","#HealthcareAI","#PHI","#ClinicalAI","#DataProtection","#AXTOVault","#Compliance"],
    cta_text: "→ HIPAA-compliant AI in 5 minutes: axto.io/vault",
    image_prompt: "Professional healthcare tech: hospital building with secure data shield, medical cross symbol, purple privacy layer between doctor using AI tablet and cloud servers",
    variables: [],
  },
  {
    id: "v_en_003",
    title: "Vault — Developer Integration (Technical)",
    category: "vault",
    platforms: ["twitter","linkedin","reddit"],
    language: "en",
    body_text: `Tired of manually scrubbing sensitive data before your AI calls?

AXTO Vault = 1 line change in your existing code.

Before:
\`\`\`python
client = OpenAI(api_key="sk-...")
\`\`\`

After (with full PII/PHI/Financial protection):
\`\`\`python
client = OpenAI(
  api_key="anything",
  base_url="http://your-vault:8080/v1"
)
\`\`\`

That's it. Vault automatically handles:
✅ 50+ PII patterns (emails, phones, SSN, passports)
✅ PHI (ICD codes, lab values, medical records)
✅ Financial (cards, IBAN, API keys, wallets)
✅ Custom regex per project
✅ Full audit trail for compliance
✅ Re-injection of original values in responses

Self-hosted. BYOK. No data leaves your infra.

{{cta}}`,
    hashtags: ["#Python","#OpenAI","#AIPrivacy","#Developer","#BYOK","#SelfHosted","#AXTOVault"],
    cta_text: "→ GitHub setup guide: axto.io/vault",
    image_prompt: "Clean code editor dark theme with Python OpenAI SDK code, purple highlight on base_url change, security shield icon, professional developer aesthetic",
    variables: [],
  },
  {
    id: "v_en_004",
    title: "Vault — Financial Services Angle",
    category: "vault",
    platforms: ["linkedin"],
    language: "en",
    body_text: `The EU AI Act. SEC cybersecurity rules. PCI-DSS v4.

Financial institutions face converging regulatory pressure around AI data practices.

The question is no longer "should we protect data in AI calls" — it's "can you prove you did?"

AXTO Vault provides automatic evidence collection:

Every AI request → logged
Every redaction → recorded (masked, never the original)
Every policy → versioned

When your auditor asks: "Show me that no credit card numbers were sent to OpenAI last quarter" — you pull a report in 30 seconds.

Automatic redaction of: IBAN, card numbers, account numbers, ABA routing numbers, SWIFT codes, tax IDs, and all AI API keys.

Enterprise pricing. Self-hosted. On-premise deployment. No SaaS dependency.

{{cta}}`,
    hashtags: ["#FinTech","#PCI-DSS","#AIAct","#FinancialCompliance","#DataGovernance","#AXTOVault","#EnterpriseAI"],
    cta_text: "→ Financial sector pricing: axto.io/vault",
    image_prompt: "Sophisticated financial district visualization: bank towers, encrypted data streams, audit trail documents, dark blue and gold color scheme, professional enterprise",
    variables: [],
  },
  {
    id: "v_en_005",
    title: "Vault — ROI Angle",
    category: "vault",
    platforms: ["linkedin","facebook"],
    language: "en",
    body_text: `The average GDPR fine in 2024: $4.4 million.
The average HIPAA violation penalty: $1.9 million.
The average time to detect a data breach: 204 days.

A single AI request containing unprotected customer PII can trigger all three.

AXTO Vault Professional costs $5,990/year.

The math is not complicated.

What you get:
• Automatic PII/PHI/Financial redaction on every AI API call
• Audit trail for GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001
• Zero additional developer effort (1 line of code change)
• Self-hosted — data stays inside your perimeter
• Unlimited AI providers: OpenAI, Anthropic, Gemini, Groq, Ollama

What you avoid:
• Regulatory fines
• Reputational damage
• Customer lawsuits
• Compliance audit failures

{{cta}}`,
    hashtags: ["#DataBreachPrevention","#GDPR","#ROI","#CISOs","#DataGovernance","#AXTOVault","#Compliance"],
    cta_text: "→ Calculate your risk: axto.io/vault",
    image_prompt: "Clean infographic style: cost comparison chart, $4.4M fine vs $5,990 software, dark background, green/red contrast, professional enterprise financial visualization",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // BAHASA INDONESIA
  // ════════════════════════════════════════════════════════
  {
    id: "v_id_001",
    title: "Vault — Problem Statement Eksekutif",
    category: "vault",
    platforms: ["linkedin","facebook","instagram"],
    language: "id",
    body_text: `Setiap hari, perusahaan mengirim ribuan request ke ChatGPT, Claude, dan Gemini.

Setiap request itu berpotensi mengandung:
→ Email dan nomor telepon pelanggan
→ Catatan medis dan diagnosis pasien
→ Nomor kartu kredit dan rekening bank
→ NIK dan data karyawan sensitif

AXTO Vault memecahkan masalah ini dalam satu perubahan konfigurasi.

Vault mencegat setiap panggilan AI API. Meredaksi data sensitif. Meneruskan teks bersih ke AI. Menyuntikkan kembali nilai asli di respons.

AI tidak pernah melihat data Anda. Pengguna tidak pernah menyadari perbedaan.

100% self-hosted. BYOK — kunci AI Anda, infrastruktur Anda.

{{cta}}`,
    hashtags: ["#PrivasiData","#AI","#PDPA","#Compliance","#BYOK","#AXTOVault","#KeamananData","#Enterprise"],
    cta_text: "→ Lihat cara kerjanya: axto.io/vault",
    image_prompt: "Visualisasi enterprise profesional: perisai data transparan mencegat paket data antara kantor korporat dan server cloud AI, warna ungu dan biru gelap, modern minimalis",
    variables: [],
  },
  {
    id: "v_id_002",
    title: "Vault — Angle Rumah Sakit & Klinik",
    category: "vault",
    platforms: ["linkedin","facebook"],
    language: "id",
    body_text: `Rumah sakit dan klinik menghadapi dilema besar di era AI:

AI membantu dokter membuat keputusan lebih cepat — tapi regulasi PDPA melarang mengirim data pasien ke pihak ketiga.

AXTO Vault hadir sebagai solusi otomatis:

Setiap nama pasien, kode diagnosa ICD, nilai lab, dan nomor BPJS otomatis diredaksi sebelum request dikirim ke AI — dan dipulihkan secara mulus di respons.

Tim medis Anda tetap dapat manfaat AI.
Compliance officer Anda tenang.
Audit trail tersedia otomatis untuk akreditasi.

{{cta}}`,
    hashtags: ["#KesehatanDigital","#PDPA","#AI","#RumahSakit","#Klinik","#DataPasien","#AXTOVault"],
    cta_text: "→ Demo untuk fasilitas kesehatan: axto.io/vault",
    image_prompt: "Rumah sakit modern dengan lapisan keamanan data digital, simbol medis dengan perisai privasi ungu, profesional dan bersih",
    variables: [],
  },
  {
    id: "v_id_003",
    title: "Vault — Developer Indonesia",
    category: "vault",
    platforms: ["twitter","linkedin"],
    language: "id",
    body_text: `Bosan manual scrub data sensitif sebelum kirim ke AI?

AXTO Vault = 1 baris perubahan kode.

Sebelum:
client = OpenAI(api_key="sk-...")

Sesudah (dengan perlindungan PII/PHI/Finansial penuh):
client = OpenAI(api_key="apa-saja", base_url="http://vault-server:8080/v1")

Vault otomatis tangani:
✅ Email, telepon, NIK, paspor, alamat
✅ Rekam medis, kode ICD, nilai lab
✅ Kartu kredit, IBAN, API keys, wallet crypto
✅ Custom regex per project
✅ Audit log compliance PDPA/HIPAA/PCI-DSS

Self-hosted. BYOK. Data tidak pernah keluar dari server Anda.

{{cta}}`,
    hashtags: ["#Developer","#Python","#OpenAI","#PrivasiData","#BYOK","#SelfHosted","#AXTOVault","#Programmer"],
    cta_text: "→ Coba gratis: axto.io/vault",
    image_prompt: "Code editor gelap dengan Python OpenAI SDK, highlight perubahan base_url dalam warna ungu, ikon keamanan, estetika developer profesional Indonesia",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // 中文 (Simplified Chinese)
  // ════════════════════════════════════════════════════════
  {
    id: "v_zh_001",
    title: "Vault — 企业隐私层",
    category: "vault",
    platforms: ["linkedin","wechat"],
    language: "zh",
    body_text: `每天，企业向 ChatGPT、Claude 和 Gemini 发送数千个请求。

每个请求都可能包含：
→ 客户邮箱和电话号码
→ 患者病历和诊断信息
→ 信用卡号码和银行账户
→ 员工身份证号和人事档案

AXTO Vault 提供自动化解决方案：

拦截每个 AI API 调用 → 自动删除敏感数据 → 转发干净文本 → 在响应中重新注入原始值。

AI 永远看不到您的数据。完全自托管。BYOK — 您的密钥，您的基础设施。

符合 GDPR、等保 2.0、HIPAA 合规要求。

{{cta}}`,
    hashtags: ["#数据隐私","#AI合规","#GDPR","#等保","#企业AI","#BYOK","#AXTOVault","#数据安全"],
    cta_text: "→ 了解更多: axto.io/vault",
    image_prompt: "专业企业技术可视化：透明安全盾拦截数据流，从企业办公楼到AI云服务器，紫色和深蓝色调，极简主义，高对比度",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // العربية (Arabic)
  // ════════════════════════════════════════════════════════
  {
    id: "v_ar_001",
    title: "Vault — طبقة الخصوصية للذكاء الاصطناعي",
    category: "vault",
    platforms: ["linkedin","facebook"],
    language: "ar",
    body_text: `كل يوم، تُرسل الشركات آلاف الطلبات إلى ChatGPT وClaude وGemini.

كل طلب قد يحتوي على:
→ بريد إلكتروني وأرقام هواتف العملاء
→ سجلات المرضى والتشخيصات
→ أرقام بطاقات الائتمان والحسابات البنكية
→ بيانات الموظفين الحساسة

AXTO Vault يحل هذه المشكلة تلقائياً:

يعترض كل طلب AI API → يحذف البيانات الحساسة → يرسل النص النظيف → يعيد الحقن في الاستجابة.

الذكاء الاصطناعي لا يرى بياناتك أبداً. مستضاف ذاتياً. BYOK.

{{cta}}`,
    hashtags: ["#خصوصية_البيانات","#ذكاء_اصطناعي","#GDPR","#أمن_المعلومات","#AXTOVault","#الامتثال"],
    cta_text: "← اكتشف المزيد: axto.io/vault",
    image_prompt: "تصميم احترافي للمؤسسات: درع أمان شفاف يعترض تدفق البيانات، من مبنى الشركة إلى خوادم الذكاء الاصطناعي، ألوان بنفسجية وزرقاء داكنة",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // Español
  // ════════════════════════════════════════════════════════
  {
    id: "v_es_001",
    title: "Vault — Capa de Privacidad IA",
    category: "vault",
    platforms: ["linkedin","facebook","twitter"],
    language: "es",
    body_text: `Cada día, las empresas envían miles de solicitudes a ChatGPT, Claude y Gemini.

Cada solicitud puede contener:
→ Emails y teléfonos de clientes
→ Historiales médicos y diagnósticos
→ Números de tarjetas de crédito
→ DNI y datos de empleados

AXTO Vault automatiza la protección:

Intercepta cada llamada API → Redacta datos sensibles → Reenvía texto limpio → Reinyecta valores originales en la respuesta.

La IA nunca ve tus datos. Auto-hospedado. BYOK — tus claves, tu infraestructura.

Cumplimiento GDPR, LOPD, HIPAA automático con registro de auditoría.

{{cta}}`,
    hashtags: ["#PrivacidadDatos","#IAEmpresarial","#GDPR","#LOPD","#Cumplimiento","#BYOK","#AXTOVault"],
    cta_text: "→ Ver cómo funciona: axto.io/vault",
    image_prompt: "Visualización empresarial profesional: escudo de datos transparente interceptando flujo de datos, edificio corporativo a servidores IA en la nube, colores morado y azul oscuro",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // Français
  // ════════════════════════════════════════════════════════
  {
    id: "v_fr_001",
    title: "Vault — Couche de Confidentialité IA",
    category: "vault",
    platforms: ["linkedin","facebook"],
    language: "fr",
    body_text: `Chaque jour, les entreprises envoient des milliers de requêtes à ChatGPT, Claude et Gemini.

Chaque requête peut contenir :
→ Emails et numéros de téléphone clients
→ Dossiers médicaux et diagnostics
→ Numéros de cartes bancaires et IBAN
→ Données personnelles des employés

AXTO Vault automatise la protection :

Intercepte chaque appel API IA → Rédige les données sensibles → Transmet le texte épuré → Réinjecte les valeurs originales dans la réponse.

L'IA ne voit jamais vos données. Auto-hébergé. BYOK.

Conformité RGPD, HDS, HIPAA automatique avec piste d'audit complète.

{{cta}}`,
    hashtags: ["#ConfidentialitéDonnées","#RGPD","#IAEntreprise","#HDS","#Conformité","#BYOK","#AXTOVault"],
    cta_text: "→ Découvrir comment ça marche: axto.io/vault",
    image_prompt: "Visualisation enterprise professionnelle: bouclier de données transparent interceptant flux de données, bâtiment corporatif vers serveurs IA cloud, violet et bleu nuit",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // Deutsch
  // ════════════════════════════════════════════════════════
  {
    id: "v_de_001",
    title: "Vault — KI-Datenschutzschicht",
    category: "vault",
    platforms: ["linkedin","xing"],
    language: "de",
    body_text: `Täglich senden Unternehmen Tausende von Anfragen an ChatGPT, Claude und Gemini.

Jede Anfrage kann enthalten:
→ E-Mail-Adressen und Telefonnummern von Kunden
→ Patientenakten und Diagnosen
→ Kreditkartennummern und IBANs
→ Mitarbeiterdaten und Sozialversicherungsnummern

AXTO Vault automatisiert den Schutz:

Fängt jeden KI-API-Aufruf ab → Schwärzt sensible Daten → Leitet bereinigten Text weiter → Fügt Originalwerte in die Antwort wieder ein.

Die KI sieht Ihre Daten nie. Selbst gehostet. BYOK.

Automatische DSGVO-, BDSG-, HIPAA-Konformität mit vollständigem Prüfpfad.

{{cta}}`,
    hashtags: ["#Datenschutz","#DSGVO","#BDSG","#KIUnternehmen","#Compliance","#BYOK","#AXTOVault"],
    cta_text: "→ So funktioniert es: axto.io/vault",
    image_prompt: "Professionelle Enterprise-Technologie-Visualisierung: transparenter Datenschutzschild, Unternehmensgebäude zu KI-Cloud-Servern, Lila und Dunkelblau, minimalistisch",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // Português
  // ════════════════════════════════════════════════════════
  {
    id: "v_pt_001",
    title: "Vault — Camada de Privacidade IA",
    category: "vault",
    platforms: ["linkedin","facebook"],
    language: "pt",
    body_text: `Todos os dias, empresas enviam milhares de requisições para ChatGPT, Claude e Gemini.

Cada requisição pode conter:
→ E-mails e telefones de clientes
→ Prontuários médicos e diagnósticos
→ Números de cartão de crédito e IBAN
→ CPFs e dados de funcionários

AXTO Vault automatiza a proteção:

Intercepta cada chamada de API de IA → Redige dados sensíveis → Encaminha texto limpo → Reinjeta valores originais na resposta.

A IA nunca vê seus dados. Auto-hospedado. BYOK.

Conformidade LGPD, HIPAA, PCI-DSS automática com trilha de auditoria completa.

{{cta}}`,
    hashtags: ["#PrivacidadeDados","#LGPD","#IAEmpresarial","#Compliance","#BYOK","#AXTOVault"],
    cta_text: "→ Ver como funciona: axto.io/vault",
    image_prompt: "Visualização enterprise profissional: escudo de dados transparente interceptando fluxo de dados, edifício corporativo para servidores IA na nuvem, roxo e azul escuro",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // 日本語
  // ════════════════════════════════════════════════════════
  {
    id: "v_ja_001",
    title: "Vault — AIプライバシーレイヤー",
    category: "vault",
    platforms: ["linkedin","twitter"],
    language: "ja",
    body_text: `毎日、企業はChatGPT、Claude、Geminiに数千のリクエストを送信しています。

各リクエストには以下が含まれる可能性があります：
→ 顧客のメールアドレスと電話番号
→ 患者の医療記録と診断結果
→ クレジットカード番号と銀行口座
→ 従業員のマイナンバーと人事データ

AXTO Vaultが自動的に保護します：

AIのAPIコールをインターセプト → 機密データを削除 → クリーンなテキストを転送 → レスポンスに元の値を再注入。

AIはあなたのデータを見ることはありません。セルフホスト型。BYOK。

個人情報保護法・HIPAA・PCI-DSS への自動対応、完全な監査証跡付き。

{{cta}}`,
    hashtags: ["#データプライバシー","#AI","#個人情報保護法","#セキュリティ","#BYOK","#AXTOVault","#コンプライアンス"],
    cta_text: "→ 詳細はこちら: axto.io/vault",
    image_prompt: "プロフェッショナルなエンタープライズテック：透明なデータシールドがAPIリクエストを遮断、企業オフィスからAIクラウドサーバーへ、パープルとネイビーのカラースキーム",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // 한국어
  // ════════════════════════════════════════════════════════
  {
    id: "v_ko_001",
    title: "Vault — AI 프라이버시 레이어",
    category: "vault",
    platforms: ["linkedin","kakao"],
    language: "ko",
    body_text: `매일 기업들은 ChatGPT, Claude, Gemini에 수천 건의 요청을 보냅니다.

각 요청에는 다음이 포함될 수 있습니다:
→ 고객 이메일과 전화번호
→ 환자 의료 기록과 진단 정보
→ 신용카드 번호와 은행 계좌
→ 직원 주민등록번호와 인사 데이터

AXTO Vault가 자동으로 보호합니다:

AI API 호출 차단 → 민감 데이터 삭제 → 정제된 텍스트 전달 → 응답에 원래 값 재삽입.

AI는 절대로 귀하의 데이터를 볼 수 없습니다. 자체 호스팅. BYOK.

개인정보보호법・HIPAA・PCI-DSS 자동 준수, 완전한 감사 추적 포함.

{{cta}}`,
    hashtags: ["#데이터프라이버시","#AI","#개인정보보호","#보안","#BYOK","#AXTOVault","#컴플라이언스"],
    cta_text: "→ 자세히 알아보기: axto.io/vault",
    image_prompt: "전문적인 엔터프라이즈 기술 시각화: 투명한 데이터 보호 실드가 API 요청을 차단, 기업 빌딩에서 AI 클라우드 서버로, 퍼플과 네이비 컬러",
    variables: [],
  },

  // ════════════════════════════════════════════════════════
  // SHORT-FORM — Twitter/X (all languages)
  // ════════════════════════════════════════════════════════
  {
    id: "v_en_tw_001",
    title: "Vault — Twitter Hook EN",
    category: "vault",
    platforms: ["twitter"],
    language: "en",
    body_text: `Your app sends 10,000 requests to OpenAI per day.
How many contain customer emails? SSNs? Medical data?

AXTO Vault = transparent proxy that auto-redacts PII/PHI before the AI sees it.
1 line change. Full compliance. Your data never leaves your infra.

{{cta}}`,
    hashtags: ["#AIPrivacy","#DataProtection","#OpenAI","#BYOK","#AXTOVault"],
    cta_text: "axto.io/vault",
    image_prompt: "Minimalist dark tech: code snippet with vault interception, purple glow, clean",
    variables: [],
  },
  {
    id: "v_en_tw_002",
    title: "Vault — Twitter Stat EN",
    category: "vault",
    platforms: ["twitter"],
    language: "en",
    body_text: `Average GDPR fine: $4.4M
Average HIPAA penalty: $1.9M
Average cost of AXTO Vault Professional: $5,990/year

Protecting your AI requests is not expensive.
Getting caught without protection is.

{{cta}}`,
    hashtags: ["#GDPR","#HIPAA","#DataPrivacy","#AI","#AXTOVault"],
    cta_text: "axto.io/vault",
    image_prompt: "Clean comparison graphic: fine amounts vs software cost, minimal dark theme",
    variables: [],
  },
  {
    id: "v_id_tw_001",
    title: "Vault — Twitter Indonesia",
    category: "vault",
    platforms: ["twitter"],
    language: "id",
    body_text: `Setiap hari kamu kirim ribuan request ke ChatGPT. Ada berapa email pelanggan di dalamnya? Nomor HP? NIK?

AXTO Vault = proxy transparan yang auto-redaksi PII sebelum AI melihatnya. 1 baris kode. Data tetap di server kamu.

{{cta}}`,
    hashtags: ["#PrivasiData","#AI","#PDPA","#BYOK","#AXTOVault","#Developer"],
    cta_text: "axto.io/vault",
    image_prompt: "Minimalis gelap: kode Python dengan vault interception, cahaya ungu",
    variables: [],
  },
];
