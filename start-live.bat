@echo off
title WeGrow by LeafLock - Live Server
cd /d "%~dp0"
echo.
echo  Starting WeGrow by LeafLock...
echo  Keep this window open while your mates are playing.
echo.

start "One State Server" cmd /c "npx.cmd --yes serve -l 3456 ."
timeout /t 3 /nobreak >nul
echo  Waiting for public URL...
echo.
npx.cmd --yes cloudflared tunnel --url http://127.0.0.1:3456