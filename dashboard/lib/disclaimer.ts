/* ==============================================================================
 * AXTO — Master Disclaimer (single source of truth)
 * Strong, professional, assistive-only liability disclaimer shown across every
 * product. Clients must accept the current version BEFORE using any application.
 *
 * NOTE: This is a robust general-purpose disclaimer, not legal advice. AXTO
 * should have it reviewed by qualified counsel for each operating jurisdiction.
 * Copyright (c) 2024-2026 AXTO (axto.io). Proprietary and Confidential.
 * ============================================================================ */

// Bump this when the wording changes; clients must re-accept a new version.
export const DISCLAIMER_VERSION = "2026.06";

export type DisclaimerLang = "en" | "id";

export const DISCLAIMER: Record<DisclaimerLang, { title: string; intro: string; clauses: string[]; agree: string }> = {
  en: {
    title: "Terms of Use & Liability Disclaimer",
    intro:
      "Please read this carefully. By installing, accessing or using any AXTO application (the “Software”), you acknowledge that you have read, understood and agree to be bound by the terms below. If you do not agree, do not install or use the Software.",
    clauses: [
      "Assistive tool only. The Software is provided solely as an aid. It supports — and never replaces — the independent judgment of a qualified professional. Its outputs may be incomplete, inaccurate, or unsuitable for your specific circumstances.",
      "You are responsible for every decision. All decisions, actions, configurations and outcomes arising from your use of the Software are made by you, at your sole discretion and risk. You remain fully responsible for verifying any output before relying on it.",
      "Not professional advice. The Software does not provide legal, security, medical, financial, regulatory or other professional advice. Nothing it produces creates any professional relationship. Always seek qualified, independent professional advice before acting.",
      "Provided “as is”. The Software is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including but not limited to merchantability, fitness for a particular purpose, accuracy, availability, or non-infringement.",
      "Limitation of liability. To the maximum extent permitted by applicable law, AXTO (axto.io) and Yusron Efendi shall not be liable for any direct, indirect, incidental, special, consequential, exemplary or punitive damages, nor for any loss of profit, data, goodwill or business, arising out of or relating to your use of, or inability to use, the Software — even if advised of the possibility of such damages.",
      "No liability claims. To the fullest extent permitted by law, you agree not to bring, and you waive and release, any claim, demand, suit or cause of action against AXTO (axto.io) and Yusron Efendi arising from or relating to the Software or its outputs.",
      "Your compliance obligations. You are solely responsible for ensuring that your use of the Software complies with all applicable laws, regulations, licenses and third-party rights in your jurisdiction, including data-protection and export-control rules.",
      "Indemnification. You agree to indemnify and hold harmless AXTO (axto.io) and Yusron Efendi from any claim, loss, liability or expense arising from your use of the Software or your breach of these terms.",
    ],
    agree:
      "I have read and understood this disclaimer. I accept full responsibility for my use of the Software and agree that AXTO (axto.io) and Yusron Efendi bear no liability for my decisions or outcomes.",
  },
  id: {
    title: "Ketentuan Penggunaan & Penafian Tanggung Jawab",
    intro:
      "Mohon baca dengan saksama. Dengan memasang, mengakses, atau menggunakan aplikasi AXTO mana pun (“Perangkat Lunak”), Anda menyatakan telah membaca, memahami, dan menyetujui ketentuan di bawah ini. Jika tidak setuju, jangan memasang atau menggunakan Perangkat Lunak.",
    clauses: [
      "Alat bantu semata. Perangkat Lunak disediakan semata sebagai alat bantu. Ia mendukung — dan tidak pernah menggantikan — penilaian independen seorang profesional yang berkualifikasi. Keluarannya dapat tidak lengkap, tidak akurat, atau tidak sesuai untuk keadaan spesifik Anda.",
      "Anda bertanggung jawab atas setiap keputusan. Seluruh keputusan, tindakan, konfigurasi, dan hasil yang timbul dari penggunaan Perangkat Lunak sepenuhnya menjadi kewenangan dan risiko Anda. Anda wajib memverifikasi setiap keluaran sebelum mengandalkannya.",
      "Bukan nasihat profesional. Perangkat Lunak tidak memberikan nasihat hukum, keamanan, medis, finansial, regulasi, atau profesional lainnya. Tidak ada keluaran yang menciptakan hubungan profesional. Selalu mintalah nasihat profesional independen yang berkualifikasi sebelum bertindak.",
      "Disediakan “sebagaimana adanya”. Perangkat Lunak disediakan “sebagaimana adanya” dan “sebagaimana tersedia”, tanpa jaminan apa pun, baik tersurat maupun tersirat, termasuk namun tidak terbatas pada kelayakan jual, kesesuaian untuk tujuan tertentu, keakuratan, ketersediaan, atau non-pelanggaran.",
      "Pembatasan tanggung jawab. Sejauh diizinkan oleh hukum yang berlaku, AXTO (axto.io) dan Yusron Efendi tidak bertanggung jawab atas segala kerugian langsung, tidak langsung, insidental, khusus, konsekuensial, maupun hukuman, termasuk kehilangan keuntungan, data, reputasi, atau bisnis, yang timbul dari atau terkait penggunaan — atau ketidakmampuan menggunakan — Perangkat Lunak.",
      "Tidak ada tuntutan. Sejauh diizinkan hukum, Anda setuju untuk tidak mengajukan, serta melepaskan dan membebaskan, segala klaim, tuntutan, gugatan, atau dasar tuntutan terhadap AXTO (axto.io) dan Yusron Efendi yang timbul dari atau terkait Perangkat Lunak atau keluarannya.",
      "Kewajiban kepatuhan Anda. Anda sepenuhnya bertanggung jawab memastikan penggunaan Perangkat Lunak mematuhi seluruh hukum, peraturan, lisensi, dan hak pihak ketiga yang berlaku di yurisdiksi Anda, termasuk perlindungan data dan pengendalian ekspor.",
      "Ganti rugi. Anda setuju untuk mengganti rugi dan membebaskan AXTO (axto.io) dan Yusron Efendi dari klaim, kerugian, tanggung jawab, atau biaya yang timbul dari penggunaan Perangkat Lunak atau pelanggaran Anda atas ketentuan ini.",
    ],
    agree:
      "Saya telah membaca dan memahami penafian ini. Saya menerima tanggung jawab penuh atas penggunaan Perangkat Lunak dan setuju bahwa AXTO (axto.io) dan Yusron Efendi tidak menanggung tanggung jawab apa pun atas keputusan atau hasil saya.",
  },
};

// Compact one-paragraph version for embedding in guides / app footers / invoices.
export function disclaimerShort(lang: DisclaimerLang = "en"): string {
  return lang === "id"
    ? "Penafian: Perangkat Lunak ini hanya alat bantu; semua keputusan dan tanggung jawab ada pada pengguna. Disediakan “sebagaimana adanya” tanpa jaminan. Sejauh diizinkan hukum, AXTO (axto.io) dan Yusron Efendi tidak bertanggung jawab atas kerugian apa pun yang timbul dari penggunaannya."
    : "Disclaimer: This Software is an assistive tool only; all decisions and responsibility rest with the user. It is provided “as is” without warranty. To the maximum extent permitted by law, AXTO (axto.io) and Yusron Efendi accept no liability for any loss arising from its use.";
}

export function renderDisclaimerText(lang: DisclaimerLang = "en"): string {
  const d = DISCLAIMER[lang];
  const lines = [d.title, "", d.intro, ""];
  d.clauses.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
  lines.push("", d.agree, "", `Version: ${DISCLAIMER_VERSION}`);
  return lines.join("\n");
}
