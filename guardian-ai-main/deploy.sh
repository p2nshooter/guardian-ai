#!/data/data/com.termux/files/usr/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         GUARDIAN-AI — AUTO PUSH & DEPLOY (Termux)           ║
# ╚══════════════════════════════════════════════════════════════╝
set -e

PROJECT_DIR="/storage/emulated/0/Download/guardian-ai"
cd "$PROJECT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 GUARDIAN-AI AUTO PUSH & DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Git safe directory ──────────────────────────────────────
git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true

# ── 2. Commit & Push ──────────────────────────────────────────
echo ""
echo "📦 [1/4] Commit & Push ke GitHub..."
git add -A
git diff --cached --quiet && echo "  ⚠️  Tidak ada perubahan baru, skip commit." || \
  git commit -m "feat: auto-build all products, i18n 20 langs, license wizard, all bugs fixed"
git push origin main
echo "  ✅ Push sukses"

# ── 3. D1 Migrations ──────────────────────────────────────────
echo ""
echo "🗄️  [2/4] Jalankan D1 Migrations..."
cd dashboard
for f in cf-migrations/*.sql; do
  echo "  → Applying $f"
  npx wrangler d1 execute axto-db --remote --file="$f" 2>&1 | tail -3
done
echo "  ✅ Migrations selesai"

# ── 4. Deploy Cloudflare Workers/Pages ────────────────────────
echo ""
echo "☁️  [3/4] Deploy ke Cloudflare..."
npx wrangler deploy
echo "  ✅ Deploy selesai"

# ── 5. Done ───────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ SEMUA SELESAI! Guardian-AI live."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
