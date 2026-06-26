@REM ==============================================================================
@REM Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
@REM Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
@REM Author & Architect: Yusron Efendi <hallo@axto.io>
@REM Proprietary and Confidential. Unauthorized copying is strictly prohibited.
@REM ==============================================================================
@echo off
setlocal
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   AXTO Deployer — Build .exe untuk Windows   ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ── Check Node.js ────────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo.
    echo Silakan download dan install dari:
    echo   https://nodejs.org  ^(pilih versi LTS^)
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Node.js: %%i

:: ── Install dependencies ─────────────────────────────────────
echo.
echo [1/3] Install dependencies...
cd /d "%~dp0"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install gagal. Pastikan ada koneksi internet.
    pause
    exit /b 1
)

:: ── Install pkg globally ─────────────────────────────────────
echo.
echo [2/3] Install build tool (pkg)...
call npm install -g pkg
if %errorlevel% neq 0 (
    echo [ERROR] Gagal install pkg.
    pause
    exit /b 1
)

:: ── Build .exe ───────────────────────────────────────────────
echo.
echo [3/3] Build .exe (proses ini 1-3 menit, mohon tunggu)...
if not exist dist mkdir dist
call pkg . --target node18-win-x64 --output dist\axto-deploy-windows.exe --compress GZip

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build gagal!
    pause
    exit /b 1
)

:: ── Success ──────────────────────────────────────────────────
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   ✅  BUILD SUKSES!                           ║
echo  ╠══════════════════════════════════════════════╣
echo  ║                                              ║
echo  ║  File: axto-uploader\dist\                   ║
echo  ║        axto-deploy-windows.exe               ║
echo  ║                                              ║
echo  ╠══════════════════════════════════════════════╣
echo  ║  LANGKAH SELANJUTNYA:                        ║
echo  ║                                              ║
echo  ║  1. Buka folder guardian-ai\                 ║
echo  ║  2. Rename .env.example → .env               ║
echo  ║  3. Isi .env dengan credentials Cloudflare   ║
echo  ║  4. Taruh PDF di folder playbooks-pdf\       ║
echo  ║  5. Double-click axto-deploy-windows.exe     ║
echo  ║                                              ║
echo  ╚══════════════════════════════════════════════╝
echo.
pause
