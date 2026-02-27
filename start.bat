@echo off
title BotBourse - Dev Server
echo ============================================
echo         BotBourse - Starting Dev Server
echo ============================================
echo.

cd /d "%~dp0"

echo [*] Cleaning up any previous session...
taskkill /F /IM node.exe >nul 2>&1
if exist ".next\dev\lock" rmdir /s /q ".next\dev\lock" >nul 2>&1

timeout /t 2 /nobreak >nul

if not exist "node_modules\" (
    echo [*] Installing Node dependencies...
    call npm install
    echo.
)

echo [*] Starting Next.js dev server...
echo [*] Press Ctrl+C to stop the server
echo.

start http://localhost:3000

call npm run dev

pause
