@echo off
title Deploy WeGrow to Netlify
cd /d "%~dp0"
echo.
echo  Deploying to Netlify (permanent hosting)...
echo  You may be asked to log in or claim the site within 60 minutes.
echo.
npx.cmd --yes netlify-cli deploy --dir=. --prod
echo.
pause