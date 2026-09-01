# PROTOKOL DEPLOYMENT & UPDATE GARNETA STORE
*(Aturan 1 Pintu - Anti Drama)*

## 1. Lokasi Utama (Pusat Pengembangan)
Semua pengembangan dan perbaikan **HANYA** boleh dilakukan di:
F:\BLUEPRINT APLIKASI\GARNETA STORE\garneta store

Folder-folder lama di Drive D:\ sudah dibackup dan dihapus agar tidak ada lagi kebingungan *"update nyasar ke mana"*.

## 2. Alur Update (SOP Anti-Error)
Setiap kali ada fitur baru atau perbaikan bug, Agen AI **WAJIB** mengikuti alur berikut:

1. **DEVELOPMENT (Lokal):** 
   Tulis kode dan simpan di folder F:\ di atas.
2. **TESTING (Wajib Playwright):** 
   Jalankan server lokal, lalu gunakan skrip Playwright (Python/Node) untuk mensimulasikan klik UI dan memastikan tidak ada pesan error di Console (seperti ReferenceError, 401 Unauthorized, dll).
3. **VALIDASI BOS ("GAS"):** 
   Laporkan hasil simulasi ke Bos. Agen DILARANG melakukan *push* ke server online sebelum Bos membalas dengan instruksi **"Gas"**, **"Lanjut"**, atau konfirmasi persetujuan lainnya.
4. **PUSH & DEPLOY (Otomatis):** 
   Setelah disetujui, Agen akan melakukan git commit dan git push ke GitHub (branch main). Server VPS / Railway akan secara otomatis menarik pembaruan tersebut (Auto-Deploy).

## 3. Penanganan Error Kritis (Hotfix)
Jika ada error fatal (seperti UI blank atau tombol tidak bisa diklik) di server produksi, jalurnya tetap sama:
**Perbaiki di lokal F:\ -> Tes -> Lapor Bos -> Push -> Online.**
Dilarang keras mengubah file langsung di server VPS menggunakan SSH, karena akan tertimpa saat GitHub Actions / Auto-Deploy berjalan.
