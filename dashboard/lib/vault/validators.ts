/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * ==============================================================================
 * PRIVACY VAULT — checksum and structure validators for identifiers, so the
 * detector reports real numbers and not random digit runs. Pure functions.
 * ============================================================================ */

const digits = (s: string) => s.replace(/\D/g, "");

/** Luhn (cards, Canadian SIN, IMEI). */
export function luhn(num: string): boolean {
  const d = digits(num);
  if (d.length < 8 || d.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  return sum % 10 === 0;
}

/** Payment card: Luhn + a real issuer prefix (2–6) + a plausible length. */
export function card(v: string): boolean {
  const d = digits(v);
  return d.length >= 13 && d.length <= 19 && /^[2-6]/.test(d) && luhn(d);
}

/** IBAN: ISO 13616 mod-97 = 1. */
export function iban(v: string): boolean {
  const s = v.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const r = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of r) {
    const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const c of n) rem = (rem * 10 + (c.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

/** Verhoeff checksum (India Aadhaar). */
const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
export function verhoeff(num: string): boolean {
  const d = digits(num);
  let c = 0;
  for (let i = 0; i < d.length; i++) c = VD[c][VP[i % 8][d.charCodeAt(d.length - 1 - i) - 48]];
  return c === 0;
}
export const aadhaar = (v: string) => { const d = digits(v); return d.length === 12 && /^[2-9]/.test(d) && verhoeff(d); };

/** Indonesia NIK: province code 11–94, district, a valid birth date (day +40 for women). */
export function nik(v: string): boolean {
  const d = digits(v);
  if (d.length !== 16) return false;
  const prov = +d.slice(0, 2);
  if (prov < 11 || prov > 94) return false;
  let day = +d.slice(6, 8);
  const month = +d.slice(8, 10);
  if (day > 40) day -= 40;
  return day >= 1 && day <= 31 && month >= 1 && month <= 12 && d.slice(12) !== "0000";
}

/** US SSN: not 000/666/9xx area, not 00 group, not 0000 serial. */
export function ssn(v: string): boolean {
  const d = digits(v);
  if (d.length !== 9) return false;
  const a = d.slice(0, 3), g = d.slice(3, 5), s = d.slice(5);
  return a !== "000" && a !== "666" && a[0] !== "9" && g !== "00" && s !== "0000";
}

/** UK National Insurance number. */
export function nino(v: string): boolean {
  const s = v.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(s)) return false;
  return !["BG", "GB", "NK", "KN", "TN", "NT", "ZZ"].includes(s.slice(0, 2));
}

/** UK NHS number (mod 11). */
export function nhs(v: string): boolean {
  const d = digits(v);
  if (d.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (d.charCodeAt(i) - 48) * (10 - i);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  return check !== 10 && check === d.charCodeAt(9) - 48;
}

/** Singapore NRIC / FIN. */
export function nric(v: string): boolean {
  const s = v.toUpperCase();
  if (!/^[STFGM]\d{7}[A-Z]$/.test(s)) return false;
  const w = [2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += (s.charCodeAt(i + 1) - 48) * w[i];
  const p = s[0];
  if (p === "T" || p === "G") sum += 4;
  if (p === "M") sum += 3;
  const r = sum % 11;
  if (p === "S" || p === "T") return "JZIHGFEDCBA"[r] === s[8];
  if (p === "F" || p === "G") return "XWUTRQPNMLK"[r] === s[8];
  return "KLJNPQRTUWX"[10 - r] === s[8];
}

/** China resident identity number (ISO 7064 MOD 11-2) with a birth date. */
export function cnId(v: string): boolean {
  const s = v.toUpperCase();
  if (!/^\d{17}[\dX]$/.test(s)) return false;
  const y = +s.slice(6, 10), m = +s.slice(10, 12), d = +s.slice(12, 14);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (s.charCodeAt(i) - 48) * w[i];
  return "10X98765432"[sum % 11] === s[17];
}

/** Brazil CPF. */
export function cpf(v: string): boolean {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += (d.charCodeAt(i) - 48) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  return dv(9) === d.charCodeAt(9) - 48 && dv(10) === d.charCodeAt(10) - 48;
}

/** Brazil CNPJ. */
export function cnpj(v: string): boolean {
  const d = digits(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => { const w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; let s = 0; for (let i = 0; i < n; i++) s += (d.charCodeAt(i) - 48) * w[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === d.charCodeAt(12) - 48 && calc(13) === d.charCodeAt(13) - 48;
}

/** Spain DNI / NIE control letter. */
export function dniNie(v: string): boolean {
  const s = v.toUpperCase().replace(/[\s-]/g, "");
  const m = s.match(/^([XYZ]?)(\d{7,8})([A-Z])$/);
  if (!m) return false;
  const n = +(m[1] ? String("XYZ".indexOf(m[1])) + m[2] : m[2]);
  return "TRWAGMYFPDXBNJZSQVHLCKE"[n % 23] === m[3];
}

/** France NIR (social security): key = 97 − (number mod 97). Corsica 2A/2B handled. */
export function nir(v: string): boolean {
  const s = v.replace(/\s+/g, "").toUpperCase();
  if (!/^[12]\d{2}(0[1-9]|1[0-2]|[2-9]\d)(\d{2}|2A|2B)\d{6}\d{2}$/.test(s)) return false;
  const body = s.slice(0, 13).replace("2A", "19").replace("2B", "18");
  const key = +s.slice(13);
  return 97 - Number(BigInt(body) % BigInt(97)) === key;
}

/** Thailand national ID (13 digits, mod 11). */
export function thId(v: string): boolean {
  const d = digits(v);
  if (d.length !== 13) return false;
  let s = 0;
  for (let i = 0; i < 12; i++) s += (d.charCodeAt(i) - 48) * (13 - i);
  return (11 - (s % 11)) % 10 === d.charCodeAt(12) - 48;
}

/** Australia TFN (weighted mod 11). */
export function tfn(v: string): boolean {
  const d = digits(v);
  if (d.length !== 9) return false;
  const w = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  let s = 0;
  for (let i = 0; i < 9; i++) s += (d.charCodeAt(i) - 48) * w[i];
  return s % 11 === 0;
}

/** US ABA routing number. */
export function aba(v: string): boolean {
  const d = digits(v);
  if (d.length !== 9) return false;
  const n = (i: number) => d.charCodeAt(i) - 48;
  return (3 * (n(0) + n(3) + n(6)) + 7 * (n(1) + n(4) + n(7)) + (n(2) + n(5) + n(8))) % 10 === 0;
}

/** Japan My Number (12 digits, check digit). */
export function myNumber(v: string): boolean {
  const d = digits(v);
  if (d.length !== 12) return false;
  let s = 0;
  for (let n = 1; n <= 11; n++) { const p = d.charCodeAt(11 - n) - 48; const q = n <= 6 ? n + 1 : n - 5; s += p * q; }
  const r = s % 11;
  return (r <= 1 ? 0 : 11 - r) === d.charCodeAt(11) - 48;
}

/** A real calendar date (YYMMDD or YYYYMMDD parts). */
export function validDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const days = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= days[m - 1];
}

/** Malaysia MyKad: YYMMDD-PB-###G with a real date. */
export function mykad(v: string): boolean {
  const d = digits(v);
  if (d.length !== 12) return false;
  return validDate(2000 + +d.slice(0, 2), +d.slice(2, 4), +d.slice(4, 6));
}

/** Korea resident registration number: YYMMDD-[1-4]xxxxxx with a real date. */
export function krRrn(v: string): boolean {
  const d = digits(v);
  if (d.length !== 13 || !/^[1-8]$/.test(d[6])) return false;
  return validDate(2000 + +d.slice(0, 2), +d.slice(2, 4), +d.slice(4, 6));
}

/** Base58 alphabet only (no 0, O, I, l). */
export const base58 = (v: string) => /^[1-9A-HJ-NP-Za-km-z]+$/.test(v);
