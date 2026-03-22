#!/usr/bin/env node
// ============================================================
// AXTO Playbooks — One-Click Deployer
// Double-click → SQL migrations masuk D1 → PDF masuk R2
// → Langsung muncul di admin, landing page, client dashboard
// ============================================================

const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
const https = require("https");
const fs   = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ── Colors ───────────────────────────────────────────────────
const C = {
  reset:   "\x1b[0m",  bright:  "\x1b[1m",
  green:   "\x1b[32m", yellow:  "\x1b[33m",
  red:     "\x1b[31m", cyan:    "\x1b[36m",
  blue:    "\x1b[34m", gray:    "\x1b[90m",
  white:   "\x1b[37m", bgBlue:  "\x1b[44m",
  bgGreen: "\x1b[42m", magenta: "\x1b[35m",
};

const log   = (m) => console.log(m);
const ok    = (m) => console.log(`${C.green}  ✅ ${m}${C.reset}`);
const skip  = (m) => console.log(`${C.yellow}  ⏭  ${m}${C.reset}`);
const fail  = (m) => console.log(`${C.red}  ❌ ${m}${C.reset}`);
const info  = (m) => console.log(`${C.cyan}  ℹ  ${m}${C.reset}`);
const warn  = (m) => console.log(`${C.yellow}  ⚠  ${m}${C.reset}`);
const dim   = (m) => console.log(`${C.gray}     ${m}${C.reset}`);
const step  = (m) => console.log(`\n${C.bright}${C.blue}${m}${C.reset}`);
const hr    = ()  => console.log(`${C.gray}${"─".repeat(62)}${C.reset}`);

function bar(cur, tot, w = 28) {
  const f = Math.round((cur / tot) * w);
  return `[${"█".repeat(f)}${"░".repeat(w - f)}] ${Math.round((cur/tot)*100)}%`;
}
function fmtSize(b) {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)}KB`;
  return `${(b/1048576).toFixed(2)}MB`;
}

// ── Validate .env ─────────────────────────────────────────────
function validateEnv() {
  const need = [
    "CF_API_TOKEN",
    "CF_ACCOUNT_ID",
    "D1_DATABASE_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ];
  const missing = need.filter(k => !process.env[k]);
  if (missing.length) {
    log(`\n${C.red}${C.bright}ERROR: Isi dulu file .env — variabel berikut kosong:${C.reset}`);
    missing.forEach(k => log(`${C.red}  • ${k}${C.reset}`));
    log(`\n${C.yellow}Lihat .env.example untuk petunjuk pengisian.${C.reset}\n`);
    process.exit(1);
  }
}

// ── Cloudflare D1 REST API ────────────────────────────────────
function d1Request(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql: sql.trim() });
    const options = {
      hostname: "api.cloudflare.com",
      path: `/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/d1/database/${process.env.D1_DATABASE_ID}/query`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type":  "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", d => data += d);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (!json.success) {
            const msg = json.errors?.map(e => e.message).join(", ") || "D1 API error";
            reject(new Error(msg));
          } else {
            resolve(json.result);
          }
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Parse SQL file → array of statements ─────────────────────
function parseSqlStatements(content) {
  // Remove comments
  let clean = content
    .replace(/--[^\n]*/g, "")          // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, ""); // multi-line comments

  // Split by ; tapi hanya yang di luar string quotes
  const stmts = [];
  let current = "";
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (!inString && (ch === "'" || ch === '"')) {
      inString = true; stringChar = ch;
      current += ch;
    } else if (inString && ch === stringChar && clean[i-1] !== "\\") {
      inString = false;
      current += ch;
    } else if (!inString && ch === ";") {
      const stmt = current.trim();
      if (stmt.length > 3) stmts.push(stmt);
      current = "";
    } else {
      current += ch;
    }
  }
  const last = current.trim();
  if (last.length > 3) stmts.push(last);

  return stmts.filter(s => s.length > 0);
}

// ── Ensure migrations tracking table exists ───────────────────
async function ensureMigrationsTable() {
  await d1Request(`
    CREATE TABLE IF NOT EXISTS _axto_migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// ── Get list of already-applied migrations ────────────────────
async function getAppliedMigrations() {
  try {
    const result = await d1Request("SELECT filename FROM _axto_migrations ORDER BY id");
    const rows = result?.[0]?.results || [];
    return new Set(rows.map(r => r.filename));
  } catch {
    return new Set();
  }
}

// ── Mark migration as done ────────────────────────────────────
async function markMigrationDone(filename) {
  await d1Request(
    `INSERT OR IGNORE INTO _axto_migrations (filename) VALUES ('${filename.replace(/'/g, "''")}')`
  );
}

// ── Run a single migration file ───────────────────────────────
async function runMigration(filepath, filename) {
  const content = fs.readFileSync(filepath, "utf-8");
  const stmts   = parseSqlStatements(content);
  let success   = 0;
  let errors    = [];

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    process.stdout.write(`\r${C.cyan}     Statement ${i+1}/${stmts.length}...${C.reset}   `);
    try {
      await d1Request(stmt);
      success++;
    } catch (err) {
      // Ignore "table already exists" and "duplicate entry" — idempotent
      const msg = err.message || "";
      if (
        msg.includes("already exists") ||
        msg.includes("UNIQUE constraint") ||
        msg.includes("duplicate")
      ) {
        success++; // acceptable
      } else {
        errors.push({ stmt: stmt.substring(0, 60) + "...", error: msg });
      }
    }
  }
  process.stdout.write("\r" + " ".repeat(50) + "\r");

  return { success, errors, total: stmts.length };
}

// ── R2 Client ─────────────────────────────────────────────────
function createR2() {
  return new S3Client({
    region:   "auto",
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

async function existsInR2(r2, bucket, key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

async function uploadPDF(r2, bucket, localPath, r2Key) {
  const stream   = fs.createReadStream(localPath);
  const fileSize = fs.statSync(localPath).size;
  const upload   = new Upload({
    client: r2,
    params: {
      Bucket:       bucket,
      Key:          r2Key,
      Body:         stream,
      ContentType:  "application/pdf",
      CacheControl: "public, max-age=31536000",
    },
  });
  let last = 0;
  upload.on("httpUploadProgress", (p) => {
    if (p.loaded && p.total) {
      const pct = Math.round((p.loaded / p.total) * 100);
      if (pct !== last && pct % 5 === 0) {
        process.stdout.write(`\r${C.cyan}     ${bar(p.loaded, p.total)} ${fmtSize(fileSize)}${C.reset}`);
        last = pct;
      }
    }
  });
  await upload.done();
  process.stdout.write("\r" + " ".repeat(60) + "\r");
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  console.clear();

  // Header
  log(`\n${C.bgBlue}${C.white}${C.bright}                                                  ${C.reset}`);
  log(`${C.bgBlue}${C.white}${C.bright}   AXTO Playbooks — One-Click Deploy to Cloudflare  ${C.reset}`);
  log(`${C.bgBlue}${C.white}${C.bright}                                                  ${C.reset}`);
  log(`${C.gray}   SQL Migrations → D1  |  PDF Files → R2${C.reset}\n`);

  validateEnv();

  const bucket     = process.env.R2_BUCKET_NAME;
  const r2Prefix   = process.env.R2_PREFIX || "playbooks/";
  const migrDir    = path.join(__dirname, "../cf-migrations");
  const pdfDir     = path.join(__dirname, "../playbooks-pdf");
  const forceSQL   = process.env.FORCE_MIGRATIONS === "true";
  const forcePDF   = process.env.FORCE_REUPLOAD   === "true";

  info(`Account  : ${C.bright}${process.env.CF_ACCOUNT_ID}${C.reset}${C.cyan}`);
  info(`Database : ${C.bright}${process.env.D1_DATABASE_ID}${C.reset}${C.cyan}`);
  info(`Bucket   : ${C.bright}${bucket}${C.reset}${C.cyan}`);
  hr();

  // ══════════════════════════════════════════════════════════
  // PHASE 1 — SQL MIGRATIONS → D1
  // ══════════════════════════════════════════════════════════
  step("PHASE 1 — SQL Migrations → Cloudflare D1");

  const migStats = { run: 0, skipped: 0, failed: 0 };

  if (!fs.existsSync(migrDir)) {
    warn("Folder cf-migrations/ tidak ditemukan — skip phase 1");
  } else {
    // Get all .sql files sorted by name
    const sqlFiles = fs.readdirSync(migrDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    if (sqlFiles.length === 0) {
      info("Tidak ada file .sql ditemukan");
    } else {
      // Ensure tracking table
      try {
        await ensureMigrationsTable();
      } catch (err) {
        fail(`Tidak bisa connect ke D1: ${err.message}`);
        log(`\n${C.yellow}Cek CF_API_TOKEN dan D1_DATABASE_ID di .env${C.reset}\n`);
        process.exit(1);
      }

      const applied = forceSQL ? new Set() : await getAppliedMigrations();
      info(`Migration files ditemukan : ${C.bright}${sqlFiles.length}${C.reset}${C.cyan}`);
      info(`Sudah diapply sebelumnya  : ${C.bright}${applied.size}${C.reset}${C.cyan}`);
      hr();

      for (const filename of sqlFiles) {
        const filepath = path.join(migrDir, filename);
        process.stdout.write(`\n${C.bright}  📄 ${filename}${C.reset}`);

        if (!forceSQL && applied.has(filename)) {
          process.stdout.write(`\n`);
          skip(`Sudah diapply — skip`);
          migStats.skipped++;
          continue;
        }

        process.stdout.write(`\n`);
        const { success, errors, total } = await runMigration(filepath, filename);

        if (errors.length === 0) {
          ok(`${success}/${total} statements berhasil`);
          await markMigrationDone(filename);
          migStats.run++;
        } else {
          warn(`${success}/${total} berhasil, ${errors.length} error (non-fatal)`);
          errors.forEach(e => dim(`⚠ ${e.error}`));
          await markMigrationDone(filename);
          migStats.run++;
        }
      }
    }
  }

  hr();
  log(`${C.green}  ✅ Migrations dijalankan : ${C.bright}${migStats.run}${C.reset}`);
  log(`${C.yellow}  ⏭  Di-skip              : ${C.bright}${migStats.skipped}${C.reset}`);

  // ══════════════════════════════════════════════════════════
  // PHASE 2 — PDF FILES → R2
  // ══════════════════════════════════════════════════════════
  step("PHASE 2 — PDF Files → Cloudflare R2");

  const pdfStats = { uploaded: 0, skipped: 0, failed: 0, failedFiles: [] };

  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
    warn("Folder playbooks-pdf/ dibuat. Taruh PDF lalu jalankan ulang.");
  } else {
    const pdfs = fs.readdirSync(pdfDir)
      .filter(f => f.toLowerCase().endsWith(".pdf"))
      .sort();

    if (pdfs.length === 0) {
      warn("Tidak ada file PDF ditemukan di playbooks-pdf/");
      info("Taruh file .pdf di folder tersebut lalu jalankan ulang.");
    } else {
      const r2 = createR2();
      info(`PDF ditemukan : ${C.bright}${pdfs.length} file${C.reset}${C.cyan}`);
      hr();

      for (let i = 0; i < pdfs.length; i++) {
        const filename = pdfs[i];
        const local    = path.join(pdfDir, filename);
        const r2Key    = `${r2Prefix}${filename}`;
        const size     = fmtSize(fs.statSync(local).size);

        process.stdout.write(`\n${C.bright}  [${i+1}/${pdfs.length}]${C.reset} ${filename} ${C.gray}(${size})${C.reset}\n`);

        try {
          if (!forcePDF) {
            const exists = await existsInR2(r2, bucket, r2Key);
            if (exists) {
              skip(`Sudah ada di R2 — skip`);
              pdfStats.skipped++;
              continue;
            }
          }
          await uploadPDF(r2, bucket, local, r2Key);
          ok(`Upload sukses → ${C.gray}${r2Key}${C.reset}`);
          pdfStats.uploaded++;
        } catch (err) {
          fail(`Gagal: ${err.message}`);
          pdfStats.failed++;
          pdfStats.failedFiles.push(filename);
        }
      }
    }
  }

  hr();
  log(`${C.green}  ✅ PDF terupload  : ${C.bright}${pdfStats.uploaded} file${C.reset}`);
  log(`${C.yellow}  ⏭  Di-skip       : ${C.bright}${pdfStats.skipped} file${C.reset}`);
  log(`${C.red}  ❌ Gagal         : ${C.bright}${pdfStats.failed} file${C.reset}`);

  if (pdfStats.failedFiles.length) {
    log(`\n${C.red}  File yang gagal:${C.reset}`);
    pdfStats.failedFiles.forEach(f => dim(`→ ${f}`));
  }

  // ══════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ══════════════════════════════════════════════════════════
  const totalOps = migStats.run + pdfStats.uploaded;
  const anyFail  = migStats.failed + pdfStats.failed;

  log(`\n${C.bgGreen}${C.white}${C.bright}                                                  ${C.reset}`);
  if (anyFail === 0 && totalOps > 0) {
    log(`${C.bgGreen}${C.white}${C.bright}   🚀 DEPLOY SELESAI — Semua berhasil!              ${C.reset}`);
  } else if (anyFail === 0 && totalOps === 0) {
    log(`${C.bgBlue}${C.white}${C.bright}   ✅ Semua sudah up-to-date, tidak ada yang baru   ${C.reset}`);
  } else {
    log(`${C.bgBlue}${C.white}${C.bright}   ⚠  Deploy selesai dengan beberapa error           ${C.reset}`);
  }
  log(`${C.bgGreen}${C.white}${C.bright}                                                  ${C.reset}`);

  if (totalOps > 0) {
    log(`\n${C.bright}  Yang sudah aktif sekarang:${C.reset}`);
    log(`${C.green}  • /admin/playbooks     → playbook baru muncul di tabel${C.reset}`);
    log(`${C.green}  • /playbooks           → tampil di landing page katalog${C.reset}`);
    log(`${C.green}  • /portal (client)     → bisa dilihat & dibeli client${C.reset}`);
    log(`${C.green}  • Download link        → PDF siap didownload setelah beli${C.reset}`);
  }

  log(`\n${C.gray}  Tekan ENTER untuk keluar...${C.reset}`);
  await waitForEnter();
}

function waitForEnter() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once("data", () => {
        process.stdin.setRawMode(false);
        resolve();
      });
    } else {
      // Non-interactive (piped) — just exit
      resolve();
    }
  });
}

main().catch(err => {
  console.log(`\n${C.red}${C.bright}FATAL: ${err.message}${C.reset}`);
  console.log(err.stack);
  process.exit(1);
});
