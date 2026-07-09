@REM ==============================================================================
@REM Copyright (c) 2024-2026 Axto AI. All rights reserved.
@REM Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
@REM Maintained by: Axto AI <hello@axto.io>
@REM Proprietary and Confidential. Unauthorized copying is strictly prohibited.
@REM ==============================================================================
@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: AXTO 5 Products — Windows Install Script
:: Run as Administrator
:: Usage: install.bat [vault|soc|compliance|edge|sentinel|all]
:: ============================================================

title AXTO Platform Installer

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║         AXTO Platform — Windows Installer            ║
echo  ║    Vault ^ SOC ^ Compliance ^ Edge ^ Sentinel          ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

:: Check Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Run as Administrator: Right-click ^> Run as Administrator
    pause
    exit /b 1
)

:: Determine product
set "PRODUCT=%~1"
if "%PRODUCT%"=="" set "PRODUCT=auto"

:: Product definitions
set "VAULT_PORT=8091"
set "SOC_PORT=8092"
set "COMPLIANCE_PORT=8093"
set "EDGE_PORT=8094"
set "SENTINEL_PORT=8095"

:: Auto-detect from current directory
if "%PRODUCT%"=="auto" (
    for %%P in (vault soc compliance edge sentinel) do (
        if exist "%%P-engine.tar.gz" set "PRODUCT=%%P"
        if exist "axto-%%P*.tar.gz" set "PRODUCT=%%P"
    )
    if "%PRODUCT%"=="auto" (
        echo [ERROR] Cannot auto-detect product.
        echo Usage: install.bat [vault^|soc^|compliance^|edge^|sentinel^|all]
        pause
        exit /b 1
    )
)

echo [i] Installing: %PRODUCT%
echo.

:: Check Docker Desktop
echo [i] Checking Docker...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Docker Desktop not found. Opening download page...
    start https://www.docker.com/products/docker-desktop
    echo.
    echo Install Docker Desktop, then re-run this script.
    pause
    exit /b 1
)
docker version >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Docker daemon not running. Start Docker Desktop first.
    pause
    exit /b 1
)
echo [OK] Docker ready

:: Process each product
call :install_product %PRODUCT%
goto :done

:install_product
set "P=%~1"
if "%P%"=="all" (
    for %%X in (vault soc compliance edge sentinel) do call :install_product %%X
    goto :eof
)

set "PORT=!%P:vault=VAULT_PORT!%"
:: Simplified port lookup
if "%P%"=="vault"      set "PORT=%VAULT_PORT%"
if "%P%"=="soc"        set "PORT=%SOC_PORT%"
if "%P%"=="compliance" set "PORT=%COMPLIANCE_PORT%"
if "%P%"=="edge"       set "PORT=%EDGE_PORT%"
if "%P%"=="sentinel"   set "PORT=%SENTINEL_PORT%"

set "INSTALL_DIR=C:\axto\%P%"
set "SVC_NAME=axto-%P%"

echo.
echo  ── Installing AXTO %P% (Port %PORT%) ──
echo.

:: Create directories
if not exist "%INSTALL_DIR%\data"   mkdir "%INSTALL_DIR%\data"
if not exist "%INSTALL_DIR%\logs"   mkdir "%INSTALL_DIR%\logs"
if not exist "%INSTALL_DIR%\config" mkdir "%INSTALL_DIR%\config"

:: Copy config
if not exist "%INSTALL_DIR%\%P%.yml" (
    if exist "%~dp0%P%.yml" (
        copy "%~dp0%P%.yml" "%INSTALL_DIR%\%P%.yml" >nul
        echo [OK] Config copied
    ) else (
        echo [!] Creating minimal config at %INSTALL_DIR%\%P%.yml
        echo %P%: > "%INSTALL_DIR%\%P%.yml"
        echo   license_key: "%P:~0,4%-XXXX-XXXX-XXXX-XXXXXXXXXXXX" >> "%INSTALL_DIR%\%P%.yml"
        echo   license_validate_url: "https://axto.io/api/license-validate" >> "%INSTALL_DIR%\%P%.yml"
    )
)

:: Load or pull Docker image
set "LOADED=0"
for %%F in ("%~dp0%P%-engine.tar.gz" "%~dp0axto-%P%*.tar.gz") do (
    if exist "%%F" (
        echo [i] Loading image from %%F...
        docker load -i "%%F"
        if !errorLevel! equ 0 (
            echo [OK] Image loaded
            set "LOADED=1"
        )
    )
)
if "%LOADED%"=="0" (
    echo [i] Pulling image from registry...
    docker pull "ghcr.io/your-org/%P%-engine:latest"
    if !errorLevel! neq 0 (
        docker pull "registry.gitlab.com/axto-platform/%P%-engine/%P%-engine:latest"
    )
)

:: Write docker-compose.yml
(
echo version: "3.9"
echo services:
echo   %P%-core:
echo     image: registry.gitlab.com/axto-platform/%P%-engine/%P%-engine:latest
echo     container_name: axto-%P%
echo     restart: unless-stopped
echo     ports:
echo       - "%PORT%:%PORT%"
echo     volumes:
echo       - ./%P%.yml:/%P%/config/%P%.yml:ro
echo       - %P%-data:/%P%/data
echo       - %P%-logs:/%P%/logs
echo     environment:
echo       - %P:vault=VAULT%_CONFIG=/%P%/config/%P%.yml
echo       - %P:vault=VAULT%_PORT=%PORT%
echo     healthcheck:
echo       test: ["CMD","curl","-sf","http://localhost:%PORT%/health"]
echo       interval: 30s
echo       timeout: 10s
echo       retries: 3
echo       start_period: 60s
echo volumes:
echo   %P%-data:
echo   %P%-logs:
) > "%INSTALL_DIR%\docker-compose.yml"

:: Start containers
pushd "%INSTALL_DIR%"
echo [i] Starting AXTO %P%...
docker compose up -d
popd

:: Wait for health
echo [i] Waiting for service to become healthy...
set /a WAIT=0
:healthcheck
timeout /t 3 /nobreak >nul
curl -sf "http://localhost:%PORT%/health" >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] AXTO %P% is healthy!
    goto :healthy
)
set /a WAIT+=1
if %WAIT% lss 20 goto :healthcheck
echo [!] Service did not respond in 60s. Check: docker logs axto-%P%

:healthy
echo.
echo  ┌─────────────────────────────────────────────────┐
echo  │  AXTO %P% — INSTALLED SUCCESSFULLY              │
echo  ├─────────────────────────────────────────────────┤
echo  │  URL:     http://localhost:%PORT%                   │
echo  │  Config:  %INSTALL_DIR%\%P%.yml  │
echo  │  Logs:    docker logs axto-%P% -f               │
echo  └─────────────────────────────────────────────────┘
echo.
echo  NEXT STEP: Edit %INSTALL_DIR%\%P%.yml
echo             Set license_key from: https://axto.io/portal
echo.

goto :eof

:done
echo.
echo  ══════════════════════════════════════════════════
echo  [OK] Installation complete!
echo  Documentation: https://axto.io/docs
echo  License portal: https://axto.io/portal
echo  ══════════════════════════════════════════════════
pause
