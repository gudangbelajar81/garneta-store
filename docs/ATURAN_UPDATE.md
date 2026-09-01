# 📜 ATURAN UPDATE APLIKASI — GARNETA STORE (WAJIB BACA)

> **Hukum Tertinggi Pengembangan.** Semua update aplikasi WAJIB melewati **2 TAHAP**.
> Melanggar aturan ini = risiko website rusak di online = DRAMA. Jangan ulangi sejarah Agustus 2026.
> Update terakhir: 2026-09-01

---

## 🔄 ALUR UPDATE (2 TAHAP — WAJIB)

```
┌─────────────────────────────────────────────────────────────────┐
│  TAHAP 1: TAMPUNG & UJI DI LOKAL (AMAN, TIDAK MENYENTUH ONLINE) │
│                                                                 │
│  1. Edit file di  F:\BLUEPRINT APLIKASI\GARNETA STORE\garneta store\  │
│  2. Klik  UPDATE_LOKAL.bat  (jalankan server lokal + cek sehat)  │
│  3. Uji di browser:  http://localhost:3000                       │
│  4. Pastikan: tidak ada error merah, fitur jalan, data aman     │
│                                                                 │
│  ⛔ BELUM GAS? JANGAN PUSH! File cukup tersimpan di lokal.       │
└─────────────────────────────────────────────────────────────────┘
                              │ (setelah DISEPAKATI Bos)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  TAHAP 2: GAS → PUSH → AUTO-DEPLOY ONLINE (OTOMATIS)            │
│                                                                 │
│  1. Klik  GAS_ONLINE.bat                                         │
│     → otomatis: git add + commit + push ke GitHub (main)        │
│  2. GitHub Actions langsung BUILD & DEPLOY ke VPS (tanpa campur  │
│     tangan) — lihat di: https://github.com/gudangbelajar81/     │
│     garneta-store/actions                                        │
│  3. Sistem verifikasi otomatis:                                  │
│     ✅ HTTP 200 di lokal VPS                                     │
│     ✅ Domain publik toko.alvezadigital.com merespons 200        │
│     ❌ Jika GAGAL → ROLLBACK OTOMATIS ke versi sebelumnya        │
│  4. Cek hasilnya di https://toko.alvezadigital.com               │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST TAHAP 1 (SEBELUM GAS)

Wajib dicek di **http://localhost:3000** setelah menjalankan `UPDATE_LOKAL.bat`:

- [ ] Aplikasi terbuka tanpa layar putih / error
- [ ] Login berfungsi
- [ ] Fitur yang diubah berfungsi sesuai keinginan
- [ ] Tidak ada error merah di jendela server
- [ ] Data (barang, transaksi) tidak rusak

> [!CAUTION]
> Jika ada **satu saja** yang gagal di checklist → **JANGAN GAS**. Perbaiki dulu di lokal.

---

## 🚀 CARA GAS (TAHAP 2)

```powershell
# Cara 1 (PALING MUDAH): klik dua kali
GAS_ONLINE.bat

# Cara 2 (manual, sama saja):
cd "F:\BLUEPRINT APLIKASI\GARNETA STORE\garneta store"
git add -A
git commit -m "Update: <deskripsi perubahan>"
git push origin main
```

Setelah GAS:
1. **Tunggu ±1 menit** (GitHub Actions build + deploy otomatis)
2. Cek status: https://github.com/gudangbelajar81/garneta-store/actions (harus ✅ hijau)
3. Cek website: https://toko.alvezadigital.com (hard refresh: `Ctrl+Shift+R`)

---

## 🛡️ PENGAMAN OTOMATIS (ANTI-DRAMA)

| Lapisan | Apa yang terjadi |
|---------|------------------|
| **Health Check Lokal** | `UPDATE_LOKAL.bat` menjalankan `scripts/health_check.js` → deteksi error sebelum GAS |
| **Health Check Online** | Workflow deploy memeriksa HTTP 200 + konten penting setelah container naik |
| **Auto-Rollback** | Jika health check online GAGAL → workflow otomatis mengembalikan image lama yang masih sehat |
| **Dokumentasi** | `docs/DEPLOY_PIPELINE.md` menjelaskan seluruh mekanisme teknis |

---

## ⛔ LARANGAN KERAS

1. **DILARANG push langsung ke `main` tanpa uji lokal** (kecuali perbaikan darurat yang sudah jelas aman — itupun wajib cek checklist minimal)
2. **DILARANG edit file di VPS langsung** (`/data/coolify/applications/...`) — semua perubahan WAJIB lewat GitHub
3. **DILARANG hapus/ubah `docs/ATURAN_UPDATE.md`** tanpa persetujuan
4. **DILARANG ubah `.env` di VPS** — env diatur lewat dashboard Coolify
5. **DILARANG pakai jalur `D:\jadi\saas\...`** — semua kerja di `F:\BLUEPRINT APLIKASI\GARNETA STORE\garneta store\`

---

## 🆘 DARURAT (ROLLBACK MANUAL)

Jika online bermasalah dan auto-rollback tidak bekerja:

```powershell
# 1. Lihat image yang tersedia di VPS (via SSH atau minta bantuan)
docker images | grep qy8o93x

# 2. Kembalikan compose ke commit lama, lalu up
cd /data/coolify/applications/qy8o93x6nlmon1xo7lrnpf3r
cp docker-compose.yaml.bak docker-compose.yaml   # backup otomatis dari deploy sebelumnya
docker compose up -d
```

---

## 🗂️ FILE PENTING DALAM SISTEM INI

| File | Lokasi | Fungsi |
|------|--------|--------|
| `ATURAN_UPDATE.md` | `docs/` | Aturan ini (WAJIB dibaca) |
| `DEPLOY_PIPELINE.md` | `docs/` | Detail teknis pipeline |
| `UPDATE_LOKAL.bat` | root repo | Tahap 1 — uji lokal |
| `GAS_ONLINE.bat` | root repo | Tahap 2 — push & deploy online |
| `scripts/health_check.js` | `scripts/` | Mesin pemeriksa kesehatan |
| `deploy.yml` | `.github/workflows/` | Auto-deploy + auto-rollback |

---

*Sistem ini dibuat agar update SELALU mulus: uji dulu di lokal, baru online. Tidak ada lagi drama update yang tidak muncul.* ✅
