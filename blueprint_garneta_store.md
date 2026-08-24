# 🎨 BLUEPRINT UI/UX MASTER - GARNETA STORE v2.0
*Standard High-Performance POS & Multi-Channel Retail System (AlvezaDigital Premium DNA)*

---

## 📑 DAFTAR ISI
1. [Visi Desain & Visual DNA](#1-visi-desain--visual-dna)
2. [Peta Layout & Navigasi Utama](#2-peta-layout--navigasi-utama)
3. [Spesifikasi Modul & Halaman Utama](#3-spesifikasi-modul--halaman-utama)
4. [Standar UI Kasir & Thermal Receipt](#4-standar-ui-kasir--thermal-receipt)
5. [Shopee-Style Compact UI Guidelines](#5-shopee-style-compact-ui-guidelines)
6. [White-Label & Custom Branding](#6-white-label--custom-branding)
7. [Protokol Keamanan & Anti-WSOD](#7-protokol-keamanan--anti-wsOD)

---

## 1. 💎 VISI DESAIN & VISUAL DNA

### A. Palet Warna Dual-Mode (Dynamic Theme System)
1. **Neural Dark Mode (Tema Utama Bawaan)**:
   - **Background Utama (`--neural-bg`)**: `#0b1f24` (Deep Cyber Cyan Black)
   - **Kartu/Surface (`--neural-surface`)**: `#102a31` (Glassmorphism Surface)
   - **Aksen Utama (`--neural-cyan`)**: `#24f0c7` (Fluid Neon Cyan)
   - **Aksen Sekunder (`--neural-orange`)**: `#ff7043` (Energy Coral Orange)
   - **Teks Utama (`--neural-text`)**: `#e8fbff` (Pure Crystal White)

2. **Soft Light Mode (Mode Terang)**:
   - **Background Utama (`--page`)**: `#f8fafc` (Soft Clean Slate)
   - **Kartu/Surface (`--surface`)**: `#ffffff` (Pure White Glass)
   - **Aksen Utama (`--green`)**: `#0284c7` (Ocean Executive Blue)
   - **Aksen Sekunder (`--orange`)**: `#ea580c` (Vibrant Amber)
   - **Teks Utama (`--text`)**: `#0f172a` (High-Contrast Slate Navy)

### B. Logo & Branding Identity
- **Logo Utama (Sidebar & Header Web)**: `assets/images/garneta-logo-g.svg`
  - Vektor SVG resolusi tinggi bertema *Fluid Cyan Wave & Metallic Gold* (Air Mengalir & Energi Sukses).
- **Logo Cetak Struk (Thermal Printer)**: `assets/images/garneta-logo-receipt.svg`
  - Vektor monokrom kontras tinggi (*Black & White 1-Bit Line Art*) khusus untuk kertas thermal 58mm/80mm tanpa efek buram.
- **Tipografi Branding**: **"GARNETA STORE"** (`font-weight: 900`, `letter-spacing: 2px`, `text-transform: uppercase`).

---

## 2. 🏛️ PETA LAYOUT & NAVIGASI UTAMA

```
+-----------------------------------------------------------------------------------------+
| [🔙 Kembali] [🏠 Dashboard]          [🔍 Smart Search Ctrl+K]      [🌙/☀️] [👑 Super Admin] |  <- TOPBAR
+------------------+----------------------------------------------------------------------+
| 🏠 Dashboard      |  [🏢 Supplier]  [📝 Form]  [📋 Daftar]  [🔍 Cari]                       |  <- SUB-TOOLBAR
| 📦 Barang        +----------------------------------------------------------------------+
| 🛒 Pembelian     |                                                                      |
| ⚡ Xpres (POS)   |  KPI SUMMARY CARDS                                                   |
| 🧮 NGITUNG (Cuan)|  +------------------+ +------------------+ +------------------+     |
| 🧾 Riwayat & Bon |  | Omset Hari Ini   | | Transaksi POS    | | Profit Bersih    |     |
| 📱 PPOB (Pulsa)  |  | Rp 2.450.000     | | 42 Transaksi     | | Rp 680.000       |     |
| 💸 Kasbon & Gaji |  +------------------+ +------------------+ +------------------+     |
|                  |                                                                      |
|                  |  SHOPEE-STYLE COMPACT DATA TABLE                                     |
|                  |  +---+--------------------+------------+--------+-----------------+  |
|                  |  | # | Nama Produk        | Harga Jual | Stok   | Aksi            |  |
|                  |  +---+--------------------+------------+--------+-----------------+  |
|                  |  | 1 | Minyak Goreng 2L   | Rp 34.000  | 18 Bag | [Edit] [Hapus]  |  |
|                  |  +---+--------------------+------------+--------+-----------------+  |
+------------------+----------------------------------------------------------------------+
```

---

## 3. 📦 SPESIFIKASI MODUL & HALAMAN UTAMA

### A. Modul POS Kasir (Xpres & Penjualan)
- **Barcode Scanner Engine**: Focus listener otomatis menangkap input barcode scanner fisik tanpa mengharuskan kursor berada di input text.
- **Quick Cart Management**: Penambahan qty cepat (+/-), diskon item direct input, dan pencarian instan nama/kategori.
- **Metode Pembayaran**: Tunai (auto-hitung kembalian), QRIS (auto-generate QR), dan Bon/Hutang Pelanggan.

### B. Modul Katalog Barang (Shopee Compact Style)
- **Indikator Stok Visual**:
  - 🟢 **Hijau (Stok Aman > 5)**: Latar badge transparan hijau.
  - 🟡 **Kuning (Stok Menipis 1-5)**: Alert badge kuning menyala.
  - 🔴 **Merah (Stok Habis 0)**: Badge merah tegas "HABIS".
- **Form Input Barang (Partial Draft Allowed)**:
  - Hanya **Nama Barang** yang wajib diisi (`required`). Field harga, stok, dan kategori bersifat fleksibel.
  - Tombol Aksi Form: `[Simpan]` | `[Reset]` | `[🔙 Kembali]`.

### C. Modul PPOB (Pulsa, Token PLN, Voucher Game)
- **Direct Bluetooth Print**: Cetak struk token/pulsa langsung ke printer Bluetooth Thermal bawaan HP/Tablet via `printPpobReceiptBluetooth`.
- **Salin SN 1-Click**: Tombol salin nomor SN / Token PLN langsung ke clipboard dengan toast notifikasi disalin.

### D. Modul Kasbon & Gajian Karyawan
- **Alert Banner Gajian**: Banner peringatan otomatis muncul jika ada kasbon karyawan yang mendekati tanggal gajian.
- **Sistem Potong Gaji**: Opsi potong kasbon otomatis (*Full Deduction* / *Partial Deduction*) saat cetak slip gajian.

---

## 4. 🖨️ STANDAR UI KASIR & THERMAL RECEIPT

1. **Format Cetak Struk Bluetooth (ESC/POS)**:
   - Header Struk: **Logo Monokrom SVG/PNG** + Nama Toko + Alamat + No HP.
   - Pembatas: Garis putus-putus (`--------------------------------`).
   - Rincian Barang: Nama produk + Qty x Harga + Subtotal (Shopee-style 1-baris).
   - Footer Struk: Catatan Kaki (*Terima kasih telah berbelanja di Garneta Store*).

2. **Web Bluetooth API Zero-Driver**:
   - Terintegrasi langsung dari browser tanpa perlu aplikasi pembantu pihak ketiga (RawBT / Windows Driver).

---

## 5. 📱 SHOPEE-STYLE COMPACT UI GUIDELINES

Sesuai standar **Shopee-Style Compact UI (Protocol 19)**:
- **Tinggi Baris Tabel**: Maksimal `36px - 40px`.
- **Ukuran Thumbnail**: `36px x 36px` dengan `border-radius: 6px`.
- **Ukuran Font Body**: `0.75rem - 0.82rem` (Teks padat, jelas, tanpa buang ruang).
- **Skema 1-Baris Info**: Nama Barang + Harga Jual + Stok + Aksi disajikan dalam 1 baris horizontal tanpa baris gantung.

---

## 6. ⚙️ WHITE-LABEL & CUSTOM BRANDING

Halaman **Pengaturan Toko (Store Settings)** memungkinkan pemilik toko mengubah identitas visual secara mandiri:
- **Logo Toko**: Upload Logo Custom (di-compress otomatis ke WebP/SVG).
- **Nama Toko**: Ditampilkan di header dan struk belanja.
- **Alamat & Telepon**: Dicetak otomatis pada bagian atas struk thermal.
- **Thermal Printer Config**: Pengaturan lebar kertas (58mm / 80mm) dan koneksi Bluetooth.

---

## 7. 🛡️ PROTOKOL KEAMANAN & ANTI-WSOD

1. **Error Boundary 500 Global**: Membungkus seluruh aplikasi sehingga jika terjadi kesalahan skrip runtime, pengguna disajikan halaman perbaikan yang elegan (*bukan layar putih blank*).
2. **Offline-First PWA (Service Worker)**: Aplikasi tetap dapat dibuka dan digunakan mencatat transaksi meskipun koneksi internet terputus (SQLite / LocalStorage sync).
3. **Soft Delete 30-Day Garbage Collection**: Menghapus data secara aman tanpa risiko kehilangan transaksi permanen.

---

*Blueprint UI/UX Master Garneta Store v2.0 - AlvezaDigital x Senior Architect Ecosystem*
