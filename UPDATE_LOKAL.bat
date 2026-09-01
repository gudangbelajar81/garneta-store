@echo off
chcp 65001 >nul
title ===== TAHAP 1: UJI LOKAL - GARNETA STORE =====
color 0A
cd /d "%~dp0"

echo ============================================================
echo   TAHAP 1: TAMPUNG DAN UJI DI LOKAL (AMAN - TIDAK ONLINE)
echo ============================================================
echo.
echo   Folder kerja: %CD%
echo.
echo   Yang akan dilakukan:
echo     1. Cek kesehatan file dan dependensi
echo     2. Nyalakan server lokal (port 3000)
echo     3. Periksa apakah aplikasi sehat
echo.
echo   SETELAH INI, silakan uji di browser:
echo      http://localhost:3000
echo.
echo   Jika sudah yakin, baru klik GAS_ONLINE.bat untuk online.
echo.
echo   ------------------------------------------------------------
echo   INGAT: Selama belum klik GAS_ONLINE, ONLINE TIDAK TERSENTUH!
echo   ------------------------------------------------------------
echo.
pause
echo.

echo [1/3] Menjalankan health check otomatis...
node scripts\health_check.js
if %errorlevel% neq 0 (
    echo.
    echo   ==============================================
    echo   [MERAH] ADA MASALAH DI LOKAL!
    echo   Periksa pesan di atas, perbaiki, coba lagi.
    echo   JANGAN klik GAS_ONLINE sebelum ini hijau!
    echo   ==============================================
    echo.
    pause
    exit /b 1
)
echo.
echo [2/3] Health check LULUS. Menjalankan server lokal...
echo.

node server.js

echo.
echo [3/3] Server lokal berhenti.
echo.
echo ============================================================
echo   CATATAN:
echo   - Jika ada error di atas, perbaiki dulu.
echo   - Jika sudah mantap, jalankan GAS_ONLINE.bat
echo ============================================================
echo.
pause
