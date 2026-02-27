@echo off
title BotBourse - Data Pipeline
echo ============================================
echo       BotBourse - Data Pipeline
echo ============================================
echo.
echo This fetches real market data and computes
echo predictions. Takes ~2 minutes to complete.
echo.

cd /d "%~dp0\python"

echo [*] Checking Python dependencies...
py -m pip install -r requirements.txt -q

echo.
echo [*] Running full pipeline...
echo.

py pipeline.py

echo.
echo [*] Done! Start the dev server with start.bat
echo.
