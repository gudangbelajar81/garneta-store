@echo off
chcp 65001 >nul
title ===== TAHAP 2: GAS ONLINE - GARNETA STORE =====
color 0E
cd /d "%~dp0"

echo ============================================================
echo   TAHAP 2: GAS ONLINE (PUSH + AUTO-DEPLOY)
echo ============================================================
echo.
echo   Folder kerja: %CD%
echo.
echo   PERINGATAN:
echo   - Pastikan sudah uji lokal (UPDATE_LOKAL.bat) dan SEPAKAT!
echo   - Setelah ini, GitHub Actions akan build dan deploy otomatis
echo     ke toko.alvezadigital.com
echo.
echo   Masukkan deskripsi update (misal: "Tambah menu Kentang"):
set /p COMMIT_MSG="Deskripsi: "

if "%COMMIT_MSG%"=="" set COMMIT_MSG=Update aplikasi Garneta Store

echo.
echo [1/4] Menyimpan semua perubahan ke Git...
git add -A
if %errorlevel% neq 0 (
    echo [GAGAL] git add. Cek apakah folder ini repo Git.
    pause
    exit /b 1
)

echo [2/4] Commit perubahan...
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Tidak ada perubahan baru untuk di-commit (semua sudah online).
    echo        Jika memang ingin deploy ulang, gunakan: git commit --allow-empty
    echo.
    pause
    exit /b 0
)

echo [3/4] Push ke GitHub (main)...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [GAGAL] Push gagal. Periksa:
    echo   1. Koneksi internet
    echo   2. Login GitHub: jalankan  gh auth setup-git  lalu coba lagi
    echo.
    pause
    exit /b 1
)

echo [4/4] Push sukses! Menunggu konfirmasi auto-deploy...
echo.
echo ============================================================
echo   DEPLOY SEDANG BERJALAN OTOMATIS DI GITHUB ACTIONS
echo ============================================================
echo   Cek status di browser:
echo     https://github.com/gudangbelajar81/garneta-store/actions
echo.
echo   Target: hijau (success) dalam ±1 menit.
echo.
echo   Setelah hijau, buka:
echo     https://toko.alvezadigital.com
echo   Hard refresh: Ctrl + Shift + R
echo ============================================================
echo.
pause
