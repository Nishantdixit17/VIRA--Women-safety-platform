@echo off
title VIRA - Predictive Women's Safety Intelligence Platform
cd /d "%~dp0"
echo ===================================================
echo Starting VIRA Safety Intelligence Platform...
echo Your browser will open http://localhost:3000 shortly
echo ===================================================
start "" http://localhost:3000
npm run dev
pause
