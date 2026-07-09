@REM ==============================================================================
@REM Copyright (c) 2024-2026 Axto AI. All rights reserved.
@REM Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
@REM Maintained by: Axto AI <hello@axto.io>
@REM Proprietary and Confidential. Unauthorized copying is strictly prohibited.
@REM ==============================================================================
@echo off
echo ============================================
echo  AXTO Platform Setup (Windows)
echo ============================================
net session >nul 2>&1 || (echo Run as Administrator! & pause & exit /b 1)
SET DIR=%~dp0
for %%f in ("%DIR%*.exe") do (
  sc create "axto-%%~nf" binPath= "%%f" start= auto >nul 2>&1
  sc start "axto-%%~nf" >nul 2>&1
  echo   Started: %%~nf
)
echo.
echo Dashboard: http://localhost:8080
echo Enter your license key when prompted.
pause
