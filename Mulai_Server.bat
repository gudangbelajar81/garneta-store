@echo off
chcp 65001 >nul
title Server Kasir Lokal - GARNETA STORE
cd /d "%~dp0"
echo ==========================================
echo MESIN SERVER KASIR SEDANG BERJALAN
echo ==========================================
echo.
echo JANGAN DITUTUP JENDELA HITAM INI!
echo Jika ditutup, aplikasi akan mati (Connection Refused).
echo Silakan minimize (kecilkan) jendela ini.
echo.
echo Lokasi: %CD%
echo.
node server.js
pause
