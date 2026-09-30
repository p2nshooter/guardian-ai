/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT v4 — a pure, client-side PII & secrets engine (no DOM, no network).
 * The original text never leaves the browser.
 *
 *   detect     55+ types in 7 categories (contact, financial, government IDs for
 *              20 countries, secrets & credentials, network, personal, custom),
 *              each with a CONFIDENCE score: checksum/structure validation plus a
 *              context boost from nearby keywords ("NIK", "SSN", "passport"…);
 *              weak patterns only count with context. Custom regex rules, a deny
 *              list (always redact) and an allow list (never redact).
 *   redact     token [EMAIL_1] · full ••• · partial ••••1234 · hash [EMAIL:3f9a1c2b]
 *              · synthetic (realistic fake values) — token, hash and synthetic are
 *              reversible with the map, which never leaves the device unencrypted
 *   restore    put the originals back into an AI reply that kept the placeholders
 * ============================================================================ */
import * as V from "./validators";

export { luhn } from "./validators";
export type MaskStyle = "token" | "full" | "partial" | "hash" | "synthetic";
export type Category = "contact" | "financial" | "government" | "secret" | "network" | "personal" | "custom";
export const CATEGORIES: Category[] = ["contact", "financial", "government", "secret", "network", "personal", "custom"];

export interface PiiType {
  id: string; label: string; category: Category; country?: string;
  priority: number;                 // overlap resolution: higher wins
  base: number;                     // confidence when the pattern (and validator) match
  re: RegExp;                       // global; group 1 (if present) is the value
  validate?: (v: string) => boolean;
  grade?: (v: string) => number;    // a score from the value itself (e.g. checksum valid → high), overrides base
  context?: RegExp;                 // keywords near the match → +0.25
  needsContext?: boolean;           // without context the score is capped at 0.3
}
export interface Finding { type: string; label: string; category: Category; value: string; start: number; end: number; score: number }
export interface RedactResult { redacted: string; findings: Finding[]; map: Record<string, string> }
export interface CustomRule { id: string; label: string; pattern: string; flags?: string }
export interface DetectOptions { minScore?: number; rules?: CustomRule[]; deny?: string[]; allow?: string[]; exclude?: Set<string> }

const W = String.raw`(?<![\p{L}\p{N}_])`, E = String.raw`(?![\p{L}\p{N}_])`;
// Context keywords match as WHOLE words on Latin letters ("conto" must not fire
// inside Indonesian "contoh", "sin" not inside "since", "nik" not inside "teknik").
const ctx = (words: string) => new RegExp(`(?<![A-Za-z\u00C0-\u024F])(?:${words})(?![A-Za-z\u00C0-\u024F])`, "iu");

export const PII_TYPES: PiiType[] = [
  // ── Secrets & credentials ──
  { id: "PRIVATE_KEY", label: "Private key block", category: "secret", priority: 99, base: 0.99, re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/g },
  { id: "JWT", label: "JWT / bearer token", category: "secret", priority: 96, base: 0.95, re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
  { id: "AWS_KEY", label: "AWS access key", category: "secret", priority: 95, base: 0.95, re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|ANPA|ANVA|AIPA)[A-Z0-9]{16}\b/g },
  { id: "AWS_SECRET", label: "AWS secret key", category: "secret", priority: 94, base: 0.6, re: /(?<![A-Za-z0-9/+])([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/g, context: ctx("aws_?secret|secret_?access_?key|aws.{0,20}secret"), needsContext: true },
  { id: "GITHUB_TOKEN", label: "GitHub token", category: "secret", priority: 97, base: 0.98, re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,})\b/g },
  { id: "GITLAB_TOKEN", label: "GitLab token", category: "secret", priority: 97, base: 0.98, re: /\bglpat-[A-Za-z0-9_-]{20,}\b/g },
  { id: "SLACK_TOKEN", label: "Slack token / webhook", category: "secret", priority: 96, base: 0.96, re: /\b(?:xox[abposr]-[A-Za-z0-9-]{10,}|https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+)/g },
  { id: "STRIPE_KEY", label: "Stripe key", category: "secret", priority: 97, base: 0.98, re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { id: "GOOGLE_KEY", label: "Google API key / secret", category: "secret", priority: 96, base: 0.95, re: /\b(?:AIza[0-9A-Za-z_-]{35}|GOCSPX-[A-Za-z0-9_-]{20,})\b/g },
  { id: "AI_KEY", label: "AI provider key", category: "secret", priority: 97, base: 0.97, re: /\b(?:sk-ant-[A-Za-z0-9_-]{20,}|sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{40,}|gsk_[A-Za-z0-9]{30,}|xai-[A-Za-z0-9]{30,}|pplx-[A-Za-z0-9]{30,})\b/g },
  { id: "SENDGRID_KEY", label: "SendGrid / Mailgun / npm token", category: "secret", priority: 96, base: 0.97, re: /\b(?:SG\.[\w-]{16,}\.[\w-]{16,}|key-[0-9a-f]{32}|npm_[A-Za-z0-9]{36})\b/g },
  { id: "TWILIO_KEY", label: "Twilio key / SID", category: "secret", priority: 90, base: 0.75, re: /\b(?:SK|AC)[0-9a-f]{32}\b/g, context: ctx("twilio|sid|auth") },
  { id: "CONN_STRING", label: "Database / queue URL", category: "secret", priority: 93, base: 0.9, re: /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?|mssql|sqlserver):\/\/[^\s"'<>]+/gi },
  { id: "URL_CREDENTIALS", label: "Password in a URL", category: "secret", priority: 94, base: 0.95, re: /\bhttps?:\/\/[^\s:/@]+:([^\s@/]{3,})@[^\s"'<>]+/gi },
  { id: "PASSWORD", label: "Password / secret value", category: "secret", priority: 92, base: 0.9, re: /(?:password|passwd|pwd|passphrase|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|kata ?sandi|sandi|passwort|mot de passe)\s*["']?\s*[:=]\s*["']?([^\s"',;]{4,})/giu },
  { id: "API_KEY", label: "Other API key / secret", category: "secret", priority: 80, base: 0.7, re: /\b(?:sk|pk|rk|api|key|secret|token)[-_][A-Za-z0-9_-]{20,}\b/gi },

  // ── Contact ──
  { id: "EMAIL", label: "Email", category: "contact", priority: 90, base: 0.95, re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { id: "PHONE", label: "Phone number", category: "contact", priority: 68, base: 0.6,
    grade: (v) => (/^\s*\+\d/.test(v) ? 0.85 : /^0(?:8\d|[1-9]\d?)[ .-]?\d/.test(v.trim()) && v.replace(/\D/g, "").length >= 10 ? 0.75 : 0.6),
    re: /(?<![\w.+])(?:\+\d{1,3}[ .-]?)?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}[ .-]?\d{3,4}[ .-]?\d{3,5}(?!\w|\.\d)/g,
    validate: (v) => { const d = v.replace(/\D/g, ""); return d.length >= 9 && d.length <= 15 && !/^(\d)\1+$/.test(d); },
    context: ctx("phone|phones|telephone|tel|telp|tlp|telepon|cell|hotline|\\bhp\\b|\\bwa\\b|whatsapp|mobile|handphone|ponsel|call|fax|kontak|contact|contacts|no\\.? ?(?:hp|telp|tlp|wa)") },
  { id: "URL", label: "URL", category: "contact", priority: 60, base: 0.5, re: /\bhttps?:\/\/[^\s"'<>)\]]+/gi },

  // ── Financial ──
  { id: "CARD", label: "Payment card", category: "financial", priority: 88, base: 0.95, re: /\b(?:\d[ -]?){12,18}\d\b/g, validate: V.card },
  { id: "IBAN", label: "IBAN", category: "financial", priority: 87, base: 0.95, re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/g, validate: V.iban },
  { id: "SWIFT", label: "SWIFT / BIC", category: "financial", priority: 60, base: 0.5, re: /\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g, context: ctx("swift|bic"), needsContext: true },
  { id: "BANK_ACCOUNT", label: "Bank account number", category: "financial", priority: 62, base: 0.5, re: /(?<!\d)\d{6,18}(?!\d)/g, context: ctx("account|accounts|acct|rekening|no\\.? ?rek|konto|compte|conto|a\\/c|bank|banking"), needsContext: true },
  { id: "ROUTING", label: "US routing number", category: "financial", country: "US", priority: 63, base: 0.55, re: /(?<!\d)\d{9}(?!\d)/g, validate: V.aba, context: ctx("routing|aba|rtn"), needsContext: true },
  { id: "CVV", label: "Card security code", category: "financial", priority: 61, base: 0.5, re: /(?<!\d)\d{3,4}(?!\d)/g, context: ctx("cvv|cvc|cvv2|security code|kode keamanan"), needsContext: true },
  { id: "BTC", label: "Bitcoin address", category: "financial", priority: 85, base: 0.85, re: /\b(?:bc1[ac-hj-np-z02-9]{25,60}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g, validate: (v) => v.startsWith("bc1") || V.base58(v) },
  { id: "ETH", label: "Ethereum / EVM address", category: "financial", priority: 85, base: 0.9, re: /\b0x[a-fA-F0-9]{40}\b/g },
  { id: "XPUB", label: "Crypto extended key", category: "financial", priority: 86, base: 0.95, re: /\b[xyzt]pub[1-9A-HJ-NP-Za-km-z]{100,112}\b/g },

  // ── Government IDs ──
  { id: "NIK", label: "Indonesia NIK / KK", category: "government", country: "ID", priority: 84, base: 0.9, re: /(?<!\d)\d{16}(?!\d)/g, grade: (v) => (V.nik(v) ? 0.9 : 0.35), context: ctx("nik|ktp|nomor induk|kependudukan|kartu keluarga|no\\.? ?kk") },
  { id: "NPWP", label: "Indonesia NPWP", category: "government", country: "ID", priority: 84, base: 0.92, re: /\b\d{2}\.\d{3}\.\d{3}\.\d-\d{3}\.\d{3}\b/g },
  { id: "SSN", label: "US SSN", category: "government", country: "US", priority: 83, base: 0.85, re: /\b\d{3}-\d{2}-\d{4}\b/g, validate: V.ssn, context: ctx("ssn|social security") },
  { id: "ITIN", label: "US ITIN", category: "government", country: "US", priority: 84, base: 0.85, re: /\b9\d{2}-(?:5\d|6[0-5]|7\d|8[0-8]|9[0-24-9])-\d{4}\b/g },
  { id: "EIN", label: "US EIN", category: "government", country: "US", priority: 70, base: 0.5, re: /\b\d{2}-\d{7}\b/g, context: ctx("ein|employer identification|tax id|fein"), needsContext: true },
  { id: "NINO", label: "UK National Insurance", category: "government", country: "GB", priority: 83, base: 0.85, re: /\b[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/g, validate: V.nino },
  { id: "NHS", label: "UK NHS number", category: "government", country: "GB", priority: 72, base: 0.55, re: /\b\d{3}[ -]?\d{3}[ -]?\d{4}\b/g, validate: V.nhs, context: ctx("nhs"), needsContext: true },
  { id: "AADHAAR", label: "India Aadhaar", category: "government", country: "IN", priority: 83, base: 0.85, re: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, validate: V.aadhaar, context: ctx("aadhaar|aadhar|uidai") },
  { id: "PAN", label: "India PAN", category: "government", country: "IN", priority: 82, base: 0.85, re: /\b[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]\b/g },
  { id: "NRIC", label: "Singapore NRIC / FIN", category: "government", country: "SG", priority: 84, base: 0.92, re: /\b[STFGM]\d{7}[A-Z]\b/g, validate: V.nric },
  { id: "MYKAD", label: "Malaysia MyKad", category: "government", country: "MY", priority: 83, base: 0.85, re: /\b\d{6}-\d{2}-\d{4}\b/g, validate: V.mykad },
  { id: "CN_ID", label: "China resident ID", category: "government", country: "CN", priority: 85, base: 0.92, re: /\b\d{17}[\dXx]\b/g, validate: V.cnId },
  { id: "KR_RRN", label: "Korea RRN", category: "government", country: "KR", priority: 84, base: 0.88, re: /\b\d{6}-\d{7}\b/g, validate: V.krRrn },
  { id: "JP_MYNUMBER", label: "Japan My Number", category: "government", country: "JP", priority: 70, base: 0.55, re: /(?<!\d)\d{4}[ -]?\d{4}[ -]?\d{4}(?!\d)/g, validate: V.myNumber, context: ctx("my ?number|マイナンバー|個人番号"), needsContext: true },
  { id: "TH_ID", label: "Thailand ID", category: "government", country: "TH", priority: 80, base: 0.8, re: /\b\d[ -]?\d{4}[ -]?\d{5}[ -]?\d{2}[ -]?\d\b/g, validate: V.thId, context: ctx("thai|thailand|บัตรประชาชน|national id") },
  { id: "VN_ID", label: "Vietnam CCCD", category: "government", country: "VN", priority: 70, base: 0.5, re: /(?<!\d)0\d{11}(?!\d)/g, context: ctx("cccd|cmnd|căn cước|can cuoc"), needsContext: true },
  { id: "CPF", label: "Brazil CPF", category: "government", country: "BR", priority: 84, base: 0.92, re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, validate: V.cpf },
  { id: "CNPJ", label: "Brazil CNPJ", category: "government", country: "BR", priority: 84, base: 0.92, re: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, validate: V.cnpj },
  { id: "CURP", label: "Mexico CURP", category: "government", country: "MX", priority: 84, base: 0.9, re: /\b[A-Z][AEIOUX][A-Z]{2}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[HM](?:AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d\b/g },
  { id: "ES_DNI", label: "Spain DNI / NIE", category: "government", country: "ES", priority: 83, base: 0.88, re: /\b[XYZ]?\d{7,8}-?[A-Z]\b/g, validate: V.dniNie },
  { id: "IT_CF", label: "Italy codice fiscale", category: "government", country: "IT", priority: 83, base: 0.88, re: /\b[A-Z]{6}\d{2}[A-EHLMPRST]\d{2}[A-Z]\d{3}[A-Z]\b/g },
  { id: "FR_NIR", label: "France NIR", category: "government", country: "FR", priority: 83, base: 0.88, re: /\b[12]\s?\d{2}\s?\d{2}\s?(?:\d{2}|2A|2B)\s?\d{3}\s?\d{3}\s?\d{2}\b/g, validate: V.nir },
  { id: "DE_TAXID", label: "Germany tax ID", category: "government", country: "DE", priority: 70, base: 0.5, re: /(?<!\d)\d{2}\s?\d{3}\s?\d{3}\s?\d{3}(?!\d)/g, context: ctx("steuer-?id|steueridentifikationsnummer|idnr|tax id"), needsContext: true },
  { id: "CA_SIN", label: "Canada SIN", category: "government", country: "CA", priority: 72, base: 0.55, re: /\b\d{3}[ -]\d{3}[ -]\d{3}\b/g, validate: V.luhn, context: ctx("sin|social insurance") },
  { id: "AU_TFN", label: "Australia TFN", category: "government", country: "AU", priority: 70, base: 0.5, re: /\b\d{3}\s?\d{3}\s?\d{3}\b/g, validate: V.tfn, context: ctx("tfn|tax file"), needsContext: true },
  { id: "PASSPORT", label: "Passport number", category: "government", priority: 71, base: 0.5, re: /\b[A-Z]{1,2}\d{6,9}\b/g, context: ctx("passport|passports|paspor|pasport|reisepass|passeport|pasaporte|passaporto|護照|护照|パスポート"), needsContext: true },
  { id: "DRIVER_LICENSE", label: "Driver licence", category: "government", priority: 69, base: 0.5, re: /\b[A-Z0-9]{5,16}\b/g, context: ctx("driver'?s? licen[cs]e|driving licen[cs]e|sim [abc]|no\\.? ?sim|führerschein|permis de conduire|licencia"), needsContext: true, validate: (v) => /\d/.test(v) && v.replace(/\D/g, "").length >= 4 },

  // ── Network ──
  { id: "IPV4", label: "IPv4 address", category: "network", priority: 74, base: 0.8, re: /(?<![\w.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\w.])/g, validate: (v) => v !== "0.0.0.0" && !v.startsWith("255.") },
  { id: "IPV6", label: "IPv6 address", category: "network", priority: 76, base: 0.8, re: /(?<![\w:])(?:(?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}|(?:[a-f0-9]{1,4}:){1,7}:(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,6})?|::(?:[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){0,6}))(?![\w:])/gi, validate: (v) => ((v.match(/:/g) || []).length >= 4 || v.includes("::")) && !/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(v) },
  { id: "MAC", label: "MAC address", category: "network", priority: 73, base: 0.85, re: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g },
  { id: "IMEI", label: "IMEI", category: "network", priority: 70, base: 0.5, re: /(?<!\d)\d{15}(?!\d)/g, validate: V.luhn, context: ctx("imei"), needsContext: true },

  // ── Personal ──
  { id: "NAME", label: "Person name", category: "personal", priority: 66, base: 0.8,
    re: new RegExp(String.raw`(?:\b(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Sir|Madam|Bapak|Bpk|Ibu|Pak|Bu|Sdr|Sdri|Tuan|Nyonya|Nona|Herr|Frau|Monsieur|Madame|Mme|Mlle|Signor|Signora|Sig|Encik|Puan|Haji|Hajjah|Hj|Drs|Ir|Dear|Yth)\.?\s+|(?:[Ff]rom|[Tt]o|[Cc]c|[Dd]ari|[Kk]epada|[Aa]ttn|[Nn]ame|[Nn]ama|[Nn]ama lengkap|[Ff]ull name|[Nn]om|[Nn]ome|[Vv]orname|[Nn]achname|[Pp]atient|[Pp]asien|[Cc]ustomer|[Pp]elanggan|[Cc]lient|[Kk]lien|[Ee]mployee|[Kk]aryawan|[Pp]enerima|[Rr]ecipient|[Ss]igned|[Tt]td)\s*[:：]\s*)([A-Z][\p{Ll}'’-]+(?:[ \t]+(?:[A-Z][\p{Ll}'’-]+|[A-Z]\.)){0,4})`, "gu") },
  { id: "ADDRESS", label: "Street address", category: "personal", priority: 65, base: 0.75,
    re: new RegExp(String.raw`(?:\b(?:Jl|Jln|Jalan|Gg|Gang|Komplek|Kompleks|Perum|Perumahan|Blok)\.?\s+[^\n,;]{3,60}(?:,\s*(?:No|Nomor)\.?\s*\d+[A-Za-z]?)?|\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Terrace|Highway|Hwy)\b\.?|\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|weg|allee|platz|gasse|ring)\s+\d+[a-z]?|\b\d{1,4},?\s+(?:rue|avenue|boulevard|chemin|place|impasse)\s+[^\n,;]{2,40}|\b(?:via|viale|piazza|corso)\s+[A-Z][^\n,;]{2,40},?\s*\d+)`, "gu") },
  { id: "POSTCODE", label: "Postal code", category: "personal", priority: 58, base: 0.5, re: /\b(?:\d{5}(?:-\d{4})?|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}|\d{3}-\d{4}|[A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/g, context: ctx("zip|zipcode|zip code|postcode|post code|postal|kode pos|kodepos|plz|cap|código postal|〒"), needsContext: true },
  { id: "DOB", label: "Date of birth", category: "personal", priority: 64, base: 0.5,
    re: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)[a-z]*\.?\s+\d{4})\b/gi,
    context: ctx("born|birth|birthdate|birthday|date of birth|dob|d\\.o\\.b|lahir|tgl\\.? lahir|tanggal lahir|ttl|geb\\.|geboren|né le|née le|nato il|nata il|fecha de nacimiento|生年月日|出生"), needsContext: true },
  { id: "MEDICAL_ID", label: "Medical record number", category: "personal", priority: 67, base: 0.5, re: /\b[A-Z0-9-]{5,15}\b/g, context: ctx("mrn|medical record|no\\.? ?rm|rekam medis|patient id|nomor pasien|bpjs"), needsContext: true, validate: (v) => /\d{4,}/.test(v) },
  { id: "PLATE_ID", label: "Vehicle plate (ID)", category: "personal", country: "ID", priority: 57, base: 0.5, re: /\b[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}\b/g, context: ctx("plat|nopol|nomor polisi|license plate|kendaraan|kennzeichen"), needsContext: true },
];

const byId = new Map(PII_TYPES.map((t) => [t.id, t]));
export const typeOf = (id: string) => byId.get(id);
const prio = (id: string) => byId.get(id)?.priority ?? 50;
const clip = (v: string, max = 400) => (v.length > max ? v.slice(0, max) : v);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Compile a member's custom rule safely (bad patterns are skipped, never thrown). */
export function compileRule(r: CustomRule): RegExp | null {
  try {
    if (!r.pattern || r.pattern.length > 500) return null;
    const flags = Array.from(new Set(["g", "u", ...(r.flags || "").split("").filter((f) => "imsu".includes(f))])).join("");
    const re = new RegExp(r.pattern, flags);
    return "".match(re)?.[0] === "" ? null : re;   // a pattern that matches "" would loop
  } catch { return null; }
}

/** Detect everything; overlaps resolved by priority, then length, then score. */
export function detect(text: string, enabled?: Set<string>, o: DetectOptions = {}): Finding[] {
  const minScore = o.minScore ?? 0.5;
  const allow = new Set((o.allow || []).map((a) => a.trim().toLowerCase()).filter(Boolean));
  const raw: Finding[] = [];
  const push = (t: Pick<PiiType, "id" | "label" | "category">, value: string, start: number, score: number) => {
    if (!value || allow.has(value.trim().toLowerCase())) return;
    raw.push({ type: t.id, label: t.label, category: t.category, value, start, end: start + value.length, score: Math.round(score * 100) / 100 });
  };
  for (const t of PII_TYPES) {
    if (enabled && !enabled.has(t.id)) continue;
    if (t.needsContext && t.context && !t.context.test(text)) continue;   // weak pattern, no keyword anywhere: skip the scan
    t.re.lastIndex = 0;
    for (const m of text.matchAll(t.re)) {
      const whole = m[0];
      const value = m[1] ?? whole;
      const start = (m.index ?? 0) + (m[1] !== undefined ? whole.indexOf(m[1]) : 0);
      if (t.validate && !t.validate(value)) continue;
      let score = t.grade ? t.grade(value) : t.base;
      if (t.context) {
        const around = text.slice(Math.max(0, start - 60), Math.min(text.length, start + value.length + 25));
        if (t.context.test(around)) score = Math.min(0.99, Math.max(score, 0.5) + 0.25);
        else if (t.needsContext) score = Math.min(score, 0.3);
      }
      if (score < minScore) continue;
      push(t, value, start, score);
    }
  }
  // Custom regex rules and the deny list (always redacted, confidence 1).
  for (const r of o.rules || []) {
    const re = compileRule(r);
    if (!re) continue;
    for (const m of text.matchAll(re)) { const v = m[1] ?? m[0]; if (v) push({ id: `CUSTOM_${r.id}`, label: r.label || "Custom", category: "custom" }, v, (m.index ?? 0) + (m[1] !== undefined ? m[0].indexOf(m[1]) : 0), 1); }
  }
  for (const word of o.deny || []) {
    const w = word.trim();
    if (w.length < 2) continue;
    const re = new RegExp(`${W}${escapeRe(w)}${E}`, "giu");
    for (const m of text.matchAll(re)) push({ id: "DENY", label: "Always redact", category: "custom" }, m[0], m.index ?? 0, 1);
  }
  raw.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Finding[] = [];
  const better = (f: Finding, p: Finding) => {
    const pf = f.category === "custom" ? 999 : prio(f.type), pp = p.category === "custom" ? 999 : prio(p.type);
    if (pf < 999 && pp < 999 && Math.abs(f.score - p.score) >= 0.1) return f.score > p.score;
    return pf !== pp ? pf > pp : f.end - f.start !== p.end - p.start ? f.end - f.start > p.end - p.start : f.score > p.score;
  };
  for (const f of raw) {
    const prev = out[out.length - 1];
    if (!prev || f.start >= prev.end) { out.push(f); continue; }
    if (better(f, prev)) {
      out.pop();
      while (out.length && out[out.length - 1].end > f.start && better(f, out[out.length - 1])) out.pop();
      if (!out.length || out[out.length - 1].end <= f.start) out.push(f);
    }
  }
  const all = propagate(text, out, out);
  return o.exclude?.size ? all.filter((f) => !o.exclude!.has(findingKey(f))) : all;
}

/** Consistent redaction: every other exact occurrence of a value that was
 *  already found (here or earlier in the same batch / conversation) is
 *  redacted too — "Budi Santoso" after "From:" also hides a later bare
 *  "Budi Santoso". Short or ambiguous values (CVV, < 4 chars) are not spread. */
function propagate(text: string, found: Finding[], known: Pick<Finding, "type" | "label" | "category" | "value" | "score">[]): Finding[] {
  const vals = new Map<string, (typeof known)[number]>();
  for (const k of known) if (k.value.length >= 4 && k.type !== "CVV" && !vals.has(k.value)) vals.set(k.value, k);
  if (!vals.size) return found;
  const extra: Finding[] = [];
  const re = new RegExp(`${W}(?:${Array.from(vals.keys()).sort((a, b) => b.length - a.length).map(escapeRe).join("|")})${E}`, "gu");
  let i = 0;
  for (const m of text.matchAll(re)) {
    const v = m[0], k = vals.get(v)!, start = m.index ?? 0, end = start + v.length;
    while (i < found.length && found[i].end <= start) i++;
    if (i < found.length && found[i].start < end) continue;              // already a finding here
    extra.push({ type: k.type, label: k.label, category: k.category, value: v, start, end, score: k.score });
  }
  return extra.length ? [...found, ...extra].sort((a, b) => a.start - b.start) : found;
}
export const findingKey = (f: Pick<Finding, "type" | "value">) => `${f.type}:${f.value}`;

// ── Replacement values ───────────────────────────────────────────────────────
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}
const FAKE_NAMES = ["Alex Morgan", "Sam Taylor", "Jordan Lee", "Rina Wijaya", "Budi Santoso", "Maria Rossi", "Lukas Weber", "Chloé Martin", "Kenji Sato", "Aisha Rahman", "Daniel Silva", "Mei Chen"];
function synthetic(f: Finding, n: number): string {
  const p = String(n).padStart(2, "0");
  switch (f.type) {
    case "EMAIL": return `person${n}@example.com`;
    case "PHONE": return f.value.trim().startsWith("+62") || /^08/.test(f.value.trim()) ? `+62 812-0000-00${p}` : `+1 555-01${p}`;
    case "NAME": return FAKE_NAMES[(n - 1) % FAKE_NAMES.length] + (n > FAKE_NAMES.length ? ` ${Math.ceil(n / FAKE_NAMES.length)}` : "");
    case "CARD": return `4111 1111 1111 ${String(1100 + n).slice(-4)}`;
    case "IBAN": return `GB82 WEST 1234 5698 7654 ${p}`;
    case "IPV4": return `192.0.2.${Math.min(254, n)}`;
    case "IPV6": return `2001:db8::${n.toString(16)}`;
    case "URL": return `https://example.com/redacted-${n}`;
    case "ADDRESS": return `${n} Example Street`;
    case "NIK": return `3171000000000${String(n).padStart(3, "0")}`;
    case "SSN": return `000-00-${String(n).padStart(4, "0")}`;
    case "DOB": return "1990-01-01";
    case "MAC": return `00:00:5E:00:53:${p}`;
    default: return `[${f.type}_${n}]`;
  }
}
function replacement(f: Finding, style: MaskStyle, n: number): string {
  switch (style) {
    case "full": return "•".repeat(Math.min(Math.max(f.value.length, 4), 12));
    case "partial": {
      const v = f.value;
      if (f.type === "EMAIL") { const [u, d] = v.split("@"); return `${u[0]}${"•".repeat(Math.max(u.length - 1, 1))}@${d}`; }
      if (f.type === "NAME") return v.split(/\s+/).map((w) => `${w[0]}${"•".repeat(Math.max(w.length - 1, 1))}`).join(" ");
      return `${"•".repeat(4)}${v.replace(/\s/g, "").slice(-4)}`;
    }
    case "hash": return `[${f.type}:${fnv(f.value)}]`;
    case "synthetic": return synthetic(f, n);
    default: return `[${f.type}_${n}]`;
  }
}
export const reversible = (s: MaskStyle) => s === "token" || s === "hash" || s === "synthetic";

/** A redactor keeps ONE placeholder per value across many texts (all pages of a
 *  PDF, all paragraphs of a DOCX, all files of a batch), so the map stays valid. */
export function createRedactor(style: MaskStyle = "token", enabled?: Set<string>, o: DetectOptions = {}) {
  const counter: Record<string, number> = {};
  const map: Record<string, string> = {};
  const seen: Record<string, string> = {};
  const all: Finding[] = [];
  function placeholder(f: Finding): string {
    const key = findingKey(f);
    let rep = seen[key];
    if (!rep) {
      const n = (counter[f.type] = (counter[f.type] || 0) + 1);
      rep = replacement(f, style, n);
      if (reversible(style)) { while (map[rep] !== undefined && map[rep] !== f.value) rep = `${rep}·`; map[rep] = clip(f.value); }
      seen[key] = rep;
    }
    return rep;
  }
  /** Replace exactly these findings (already detected and reviewed by the member). */
  function apply(text: string, findings: Finding[]): { redacted: string; findings: Finding[] } {
    const list = [...findings].sort((a, b) => a.start - b.start);
    const used: Finding[] = [];
    let out = "", cursor = 0;
    for (const f of list) {
      if (f.start < cursor) continue;                        // overlapping pick: keep the first
      out += text.slice(cursor, f.start) + placeholder(f); cursor = f.end; used.push(f);
    }
    all.push(...used);
    return { redacted: out + text.slice(cursor), findings: used };
  }
  return {
    map, findings: all,
    redact: (text: string) => apply(text, propagate(text, detect(text, enabled, o), all)),
    apply,
    placeholder,
  };
}

/** For the review screen: what will be redacted (score ≥ minScore) and lower-
 *  confidence "suggestions" (≥ 0.25) that do not overlap it — the member can
 *  add a suggestion or exclude a finding with one click. */
export function review(text: string, enabled?: Set<string>, o: DetectOptions = {}): { findings: Finding[]; suggestions: Finding[] } {
  const { exclude: _x, ...base } = o;
  const findings = detect(text, enabled, base);
  const min = o.minScore ?? 0.5;
  if (min <= 0.25) return { findings, suggestions: [] };
  let i = 0;
  const suggestions = detect(text, enabled, { ...base, minScore: 0.25, rules: [], deny: [] }).filter((f) => {
    if (f.score >= min) return false;
    while (i < findings.length && findings[i].end <= f.start) i++;
    for (let j = i; j < findings.length && findings[j].start < f.end; j++) if (findings[j].end > f.start) return false;
    return true;
  });
  return { findings, suggestions };
}

/** Compliance profiles: which types each regulation cares about. */
export interface Preset { id: string; label: string; types: string[] }
const allOf = (...cats: Category[]) => PII_TYPES.filter((t) => cats.includes(t.category)).map((t) => t.id);
export const PRESETS: Preset[] = [
  { id: "all", label: "Everything", types: PII_TYPES.map((t) => t.id) },
  { id: "gdpr", label: "GDPR (EU / UK)", types: [...allOf("contact", "personal", "network"), "IBAN", "SWIFT", "BANK_ACCOUNT", "CARD", "NINO", "NHS", "ES_DNI", "IT_CF", "FR_NIR", "DE_TAXID", "PASSPORT", "DRIVER_LICENSE"] },
  { id: "pdp", label: "UU PDP (Indonesia)", types: [...allOf("contact", "personal"), "NIK", "NPWP", "PASSPORT", "DRIVER_LICENSE", "BANK_ACCOUNT", "CARD", "IPV4", "IPV6", "PLATE_ID"] },
  { id: "hipaa", label: "HIPAA (US health)", types: [...allOf("contact", "personal", "network"), "SSN", "DRIVER_LICENSE", "PASSPORT", "BANK_ACCOUNT", "CARD", "ROUTING"] },
  { id: "pci", label: "PCI DSS (cards)", types: ["CARD", "CVV", "BANK_ACCOUNT", "IBAN", "ROUTING", "NAME", "EMAIL", "PHONE"] },
  { id: "secrets", label: "Secrets only (developers)", types: [...allOf("secret"), "IPV4", "IPV6", "MAC", "EMAIL", "CONN_STRING"] },
];

/** Redact text. The map (placeholder → original) restores token, hash and synthetic styles. */
export function redact(text: string, style: MaskStyle = "token", enabled?: Set<string>, o: DetectOptions = {}): RedactResult {
  const r = createRedactor(style, enabled, o);
  const { redacted, findings } = r.redact(text);
  return { redacted, findings, map: r.map };
}

/** Put the originals back (longest placeholders first so [EMAIL_1] never clobbers [EMAIL_10]). */
export function restore(text: string, map: Record<string, string>): string {
  let out = text;
  for (const token of Object.keys(map).sort((a, b) => b.length - a.length)) out = out.split(token).join(map[token]);
  return out;
}

export function summarize(findings: Finding[]): { type: string; label: string; category: Category; count: number }[] {
  const by: Record<string, { label: string; category: Category; count: number }> = {};
  for (const f of findings) { by[f.type] = by[f.type] || { label: f.label, category: f.category, count: 0 }; by[f.type].count++; }
  return Object.entries(by).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.count - a.count);
}

/** An audit report: what was found where — counts only, never the values. */
export function auditReport(items: { source: string; findings: Finding[] }[], meta: { style: MaskStyle; minScore: number }) {
  const rows = items.map((i) => ({ source: i.source, total: i.findings.length, byType: Object.fromEntries(summarize(i.findings).map((s) => [s.type, s.count])) }));
  return { generatedAt: new Date().toISOString(), tool: "AXTO Privacy Vault", style: meta.style, minScore: meta.minScore, total: rows.reduce((n, r) => n + r.total, 0), items: rows };
}
