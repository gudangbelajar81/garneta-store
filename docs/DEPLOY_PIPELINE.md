# 🚀 Pipeline Deploy Permanen — Garneta Store (toko.alvezadigital.com)

> **Dokumen ini adalah sumber kebenaran (source of truth) untuk semua proses update aplikasi.**
> Update terakhir: 2026-09-01

## 🎯 Ringkasan

| Item | Nilai |
|------|-------|
| Repo GitHub | `gudangbelajar81/garneta-store` (branch `main`) |
| Domain live | `https://toko.alvezadigital.com` |
| VPS | `77.42.77.29` (Hetzner, user `root`, port 22) |
| Coolify App UUID | `qy8o93x6nlmon1xo7lrnpf3r` |
| App dir VPS | `/data/coolify/applications/qy8o93x6nlmon1xo7lrnpf3r/` |
| Build pack | Dockerfile (Node 20, port 3000) |
| Image naming | `qy8o93x6nlmon1xo7lrnpf3r:<git-commit-hash>` |

---

## 📜 CARA UPDATE (Sekali jalan, tanpa drama)

### Langkah 1: Push ke GitHub
```powershell
cd "F:\BLUEPRINT APLIKASI\GARNETA STORE\garneta store"
git add -A
git commit -m "Deskripsi update"
git push origin main
```

### Langkah 2: TUNGGU OTOMATIS
Push ke `main` **otomatis** memicu workflow **"Deploy Garneta Store ke VPS"** di GitHub Actions. Workflow ini:
1. SSH ke VPS (via `appleboy/ssh-action` + secrets)
2. Clone source terbaru dari GitHub ke `/tmp/garneta-build`
3. `docker build` image baru dengan tag = commit hash
4. Update `docker-compose.yaml` + `.env` (`SOURCE_COMMIT`)
5. `docker compose up -d` → container baru jalan
6. Verifikasi HTTP 200 + konten "kentang" + domain publik

### Langkah 3: Verifikasi (opsional tapi disarankan)
```powershell
gh run list --repo gudangbelajar81/garneta-store --workflow "Deploy Garneta Store ke VPS" --limit 1
gh run view <RUN_ID> --repo gudangbelajar81/garneta-store --log
```

Atau cek langsung:
```powershell
curl -s https://toko.alvezadigital.com | grep -i kentang
```

---

## 🔐 GitHub Secrets (sudah diset, JANGAN diubah tanpa perlu)

| Secret | Nilai | Keterangan |
|--------|-------|------------|
| `VPS_HOST` | `77.42.77.29` | IP VPS Hetzner |
| `VPS_USER` | `root` | User SSH |
| `VPS_SSH_KEY` | isi `C:\Users\Administrator\.ssh\id_ed25519` | Private key SSH |

---

## 🧠 SEJARAH MASALAH & AKAR MASALAH (Kenapa Selalu Drama)

### Akar Masalah #1: SSH key secret TIDAK PERNAH diset (Agustus 2026)
- Workflow lama (8 Agustus) pakai `appleboy/ssh-action` tapi secret `VPS_SSH_KEY` tidak pernah dikonfigurasi di GitHub.
- Semua run gagal dengan `error: can't connect without a private SSH key or password`.
- **Setiap push update sejak Agustus GAGAL SILENT** — tidak ada yang menyadari karena workflow menampilkan status sukses tapi langkah SSH-nya mati di tengah.

### Akar Masalah #2: Workflow lama dirancang untuk setup NON-Coolify
- Script lama: `git fetch --all; git reset --hard origin/main; git pull origin main; npm install --production; pm2 restart inventory`
- Itu adalah script untuk server **pm2** (bukan Docker/Coolify).
- Setelah migrasi ke Coolify, workflow TIDAK diperbarui → `git pull` di app dir gagal (`fatal: not a git repository`).

### Akar Masalah #3: Coolify menyimpan source sebagai TAR, bukan GIT
- `/data/coolify/applications/qy8o93x.../` HANYA berisi `.env` + `docker-compose.yaml` — **tidak ada source code**.
- Coolify men-download source sebagai **tar archive** saat build, lalu **membakar kode ke dalam Docker image**.
- Jadi `git pull` di app dir = sia-sia. Kode hanya bisa berubah lewat **build ulang image**.

### Akar Masalah #4: Coolify API bermasalah (Server Error)
- Token yang dibuat manual di DB (`personal_access_tokens`) valid (respons `Unauthenticated` → `Server Error`), tapi Coolify gagal memproses deploy.
- Deployment queue terakhir = #696 (31 Agustus) — semua trigger API tidak masuk queue.
- **Solusi:** BYPASS Coolify API sepenuhnya. Build Docker manual via SSH.

---

## 🏗️ ARSITEKTUR DEPLOY (Cara Kerja Saat Ini)

```
Local (F:) → git push → GitHub (gudangbelajar81/garneta-store, main)
                              │
                              ▼ (auto-trigger)
                    GitHub Actions "Deploy Garneta Store ke VPS"
                              │
                    SSH ke VPS 77.42.77.29 (port 22)
                              │
                    ┌─────────▼──────────┐
                    │ 1. git clone source │
                    │ 2. docker build     │
                    │ 3. compose up -d    │
                    └─────────┬──────────┘
                              │
                    Container baru (port 3000)
                              │
                    Traefik (coolify-proxy) → https://toko.alvezadigital.com
```

---

## 📌 FILE PENTING DI REPO

| File | Fungsi |
|------|--------|
| `.github/workflows/deploy.yml` | **PIPELINE UTAMA** — auto-deploy saat push ke main |
| `.github/workflows/fix-token.yml` | Membuat token Coolify (cadangan, tidak dipakai pipeline utama) |
| `.github/workflows/diagnose.yml` | Diagnosa struktur VPS (manual trigger) |
| `.github/workflows/debug-deploy.yml` | Debug Server Error Coolify (manual trigger) |
| `.github/workflows/inspect-config.yml` | Inspeksi docker-compose/container (manual trigger) |
| `Dockerfile` | Node 20 → port 3000 → `npm start` |
| `package.json` | Script start: `migrate.js && migrate_security.js && server.js` |

---

## ⚠️ CATATAN PENTING

1. **JANGAN** pernah edit `docker-compose.yaml` langsung di VPS kecuali workflow — file itu di-generate ulang Coolify saat app diubah dari dashboard.
2. **JANGAN** hapus secret `VPS_SSH_KEY` di GitHub.
3. Jika ada perubahan di **env var** (DATABASE_URL, dll), itu harus diubah lewat dashboard Coolify → app → Environment Variables, **bukan** di `.env` VPS langsung (akan tertimpa).
4. Jika Coolify UI aksesibel (browser), "Redeploy" dari dashboard juga bekerja — tapi pipeline GitHub lebih andal.
5. **Rollback:** image lama tetap ada di VPS (`docker images`). Untuk rollback, ubah tag image di `docker-compose.yaml` ke commit lama, lalu `docker compose up -d`.

---

## 🆘 TROUBLESHOOTING

### Workflow gagal di langkah SSH
- Cek secret masih ada: `gh secret list --repo gudangbelajar81/garneta-store`
- Cek IP VPS tidak berubah

### Workflow gagal di `docker build`
- Baca error di log (biasanya dependency rusak atau Dockerfile error)
- Fix di lokal, push lagi

### Website tidak berubah setelah deploy sukses
- Cek `docker ps` → apakah container pakai image dengan commit hash baru?
- Cek `docker logs qy8o93x6nlmon1xo7lrnpf3r-132135139387 --tail 50` untuk error runtime
- Cek browser cache (hard refresh / incognito)

### Perlu akses ke Coolify dashboard
- Email: `gudangbelajar81@gmail.com`
- Password: **TANYA BOS** (tidak pernah disimpan di ledger)
