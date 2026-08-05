---
description: Aturan Wajib Pengembangan GARNETA STORE (Arsitektur & SOP Lokal)
---

# 🚀 Aturan Wajib Proyek: GARNETA STORE (Standar AlvezaDigital)

Setiap Agent AI yang ditugaskan untuk mengerjakan, merombak, atau memperbaiki aplikasi **GARNETA STORE** WAJIB membaca dan mematuhi aturan ini sebelum menyentuh kode.

## 1. 🏗️ Arsitektur All-in-One (Port 3000)
- **TIDAK ADA PORT 8000**: Aplikasi ini menganut arsitektur terpadu di mana backend (Node.js/Express) juga bertugas melayani aset statis Frontend (`index.html`, `/assets/css`, `/assets/js`).
- **DILARANG** menyuruh Bos menyalakan *Live Server* di port 8000. 
- Semua akses lokal WAJIB dilakukan melalui `http://localhost:3000`.
- API Call dari frontend ke backend cukup menggunakan _relative path_ `/api` karena sudah berada dalam 1 origin.

## 2. 🔐 Protokol Bypass Login (Local Development)
Untuk mempercepat proses pengembangan, terdapat fitur rahasia (Easter Egg) untuk melakukan Bypass Login Super Admin di komputer lokal (localhost):
- **Trik 7 Klik**:
  1. Klik kolom input **Nama Super Admin** sebanyak 7 kali -> akan otomatis terisi nama Super Admin yang terdaftar (misal: `Admin Gudang`).
  2. Klik kolom input **Password** sebanyak 7 kali -> akan otomatis terisi kode rahasia: `LOCAL_DEV_BYPASS`.
- Backend (`server.js`) pada fungsi `loginUser` telah diprogram khusus: jika string password bernilai persis `LOCAL_DEV_BYPASS`, maka pengecekan password hash akan di-bypass dan status login dikembalikan sukses, tanpa merusak atau mereset password asli yang ada di database.

## 3. 🖥️ SOP Menjalankan Server Lokal (Immortal Server)
- Jalankan server HANYA melalui perintah: `node server.js`
- JANGAN PERNAH menyarankan Bos menggunakan `python -m http.server` untuk proyek ini.

## 4. 🖨️ Thermal Printer & UI/UX Guidelines
- **Zero-Ugly MVP**: UI harus selalu terlihat premium (Glassmorphism, SweetAlert2 / Swal.fire).
- Peringatan: Sistem ini terhubung erat dengan Web Bluetooth API untuk cetak printer kasir termal. Jangan pernah mengubah struktur format receipt (struk) tanpa mengecek kompatibilitas Web Bluetooth di `main.js`.
- Error backend harus selalu direkam menggunakan `logger` (Pino/Winston) dan dikirim kembali ke frontend untuk dimunculkan dengan `Swal.fire` yang interaktif.

*Patuhi SOP ini agar Bos tidak lagi mengalami drama "Nama atau Password salah" atau masalah CORS antar port.*
