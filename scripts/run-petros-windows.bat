@echo off
title Petros Autonomous Engineering & Operations AI - Windows
echo =========================================================================
echo  PETROS AUTONOMOUS ENGINEERING & OPERATIONS AI - WINDOWS EDITION
echo  Petros City Web App & Unified Ecosystem
echo =========================================================================
echo.

cd /d "%~dp0\.."

echo Checking environment...
node -v >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js.
    pause
    exit /b 1
)

set NODE_ENV=production
set BIND_HOST=127.0.0.1
set PORT=3000

echo Starting Petros Production Server on http://127.0.0.1:3000...
start "" http://127.0.0.1:3000
node dist/server.cjs

pause
