# 🏗️ Blueprint Proyek Garneta Store

Blueprint ini dibuat sebagai panduan referensi (handoff) untuk dilanjutkan pada percakapan/sesi Antigravity berikutnya.

## 1. Identitas Proyek
- **Nama Sistem:** Garneta Store (Sistem Kasir Retail & PPOB)
- **Arsitektur Utama:** Monolith (Satu kesatuan *codebase*)
- **Backend:** Node.js (Express.js)
- **Frontend:** Vanilla JavaScript, HTML, CSS (dilayani via `express.static('public')`)
- **Database:** MySQL (Koneksi menggunakan `mysql2/promise` dengan sistem *Connection Pooling*)

## 2. Fitur & Perbaikan Terakhir (Status: Terekam di GitHub `main`)
Semua pengerjaan di bawah ini **sudah tersimpan secara permanen** di *branch* master (`main`) GitHub Bapak/Ibu:
1. **Fitur PPOB Terintegrasi:** 
   - Modul `ppob.js` untuk melayani transaksi Pulsa, Paket Data, dll (via Digiflazz).
   - Skema database baru (`ppob_products`, `ppob_transactions`).
2. **6 Critical Bug Patches:** 
   - Perbaikan error *parsing* JSON pada fungsi `ngitungSales` dan `orders`.
   - Perbaikan logika *chunking buffer* 100 bytes untuk printer Bluetooth VSC TM 58V.
   - Penggantian alert bawaan browser menjadi *SweetAlert* yang interaktif pada eksekusi cuan agar tidak memblokir antarmuka UI.
3. **Optimasi Keamanan Server (Cross-Platform):**
   - Mengganti modul `bcrypt` (C++) dengan `bcryptjs` (Pure JavaScript) untuk mencegah *silent crash* akibat gagal kompilasi di sistem operasi Linux.
4. **Perbaikan CI/CD Coolify:**
   - Telah ditambahkan `Dockerfile` standar Node.js 20 dan `.dockerignore` untuk mengatasi masalah *Build Failed: Dockerfile not found* di Coolify.
   - File `.github/workflows/deploy.yml` yang rusak telah dibersihkan.

## 3. Status Berjalan (*Environment*)
- 💻 **Lokal (Windows):** **SEHAT (100% Berjalan)**. Dapat diakses lancar di `http://localhost:3000`. Fitur PPOB siap ditest.
- ☁️ **Produksi (Coolify VPS):** **Pending Deployment / Konfigurasi**. Saat ini domain publik `https://toko.alvezadigital.com` merespons *503 Service Unavailable* karena konfigurasi internal Coolify.

## 4. Langkah Selanjutnya (Next Steps untuk Percakapan Baru)
Ketika Bapak/Ibu memulai percakapan baru di Antigravity, berikan dokumen ini dan instruksikan AI untuk melanjutkan langkah berikut:

> [!IMPORTANT]
> **Fokus Utama Sesi Berikutnya: Menyembuhkan VPS Coolify**

1. **Konfigurasi Environment Variables:** AI harus memandu *user* mengisi `DB_HOST`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` di *dashboard* rahasia Coolify. (Alasan: Aplikasi Node.js tidak bisa memakai `localhost` jika database berada di kontainer Docker terpisah).
2. **Re-Deploy Coolify:** Menginstruksikan *user* menekan tombol **Deploy** di Coolify untuk menarik `Dockerfile` yang baru saja kita tanam di *master* hari ini.
3. **Validasi Produksi:** Memastikan status aplikasi di Coolify berubah menjadi Hijau (Healthy) dan melakukan tes cetak struk serta transaksi PPOB secara *live*.
