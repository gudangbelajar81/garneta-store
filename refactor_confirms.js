const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');

const replacements = [
  // 1. clearAuditLogs (110)
  {
    from: `if (!confirm("Yakin ingin menghapus semua log aktivitas?")) return;`,
    to: `const result = await Swal.fire({ title: "Konfirmasi", text: "Yakin ingin menghapus semua log aktivitas?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  },
  // 2. hapusKaryawan (584)
  {
    from: `if (!confirm("Yakin ingin menghapus data karyawan ini?")) return;`,
    to: `const result = await Swal.fire({ title: "Konfirmasi", text: "Yakin ingin menghapus data karyawan ini?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  },
  // 3. hapusRiwayatGaji (596)
  {
    from: `if (!confirm("Yakin ingin menghapus riwayat gaji ini?")) return;`,
    to: `const result = await Swal.fire({ title: "Konfirmasi", text: "Yakin ingin menghapus riwayat gaji ini?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  },
  // 4. formPayroll onsubmit (878)
  {
    from: "if (!confirm(`Yakin bayar gaji ${emp.name} sejumlah ${rupiah(net)}?\\nPotong Kasbon: ${rupiah(cicil)}`)) return;",
    to: "const result = await Swal.fire({ title: \"Konfirmasi\", text: `Yakin bayar gaji ${emp.name} sejumlah ${rupiah(net)}?\\nPotong Kasbon: ${rupiah(cicil)}`, icon: \"warning\", showCancelButton: true, confirmButtonText: \"Ya, Bayar!\", cancelButtonText: \"Batal\" }); if (!result.isConfirmed) return;"
  },
  // 5. restoreRiwayatItem (2576 & 2771)
  {
    from: `window.restoreRiwayatItem = function(idx) {
        if(confirm("Kembalikan transaksi ini ke riwayat aktif?")) {`,
    to: `window.restoreRiwayatItem = async function(idx) {
        const result = await Swal.fire({ title: "Konfirmasi", text: "Kembalikan transaksi ini ke riwayat aktif?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Kembalikan!", cancelButtonText: "Batal" });
        if (result.isConfirmed) {`
  },
  // 6. deleteRiwayatItem (2650 & 2845)
  {
    from: `window.deleteRiwayatItem = function(idx) {
        if(confirm("Yakin ingin menghapus transaksi ini? (Data akan dipindahkan ke Trash selama 30 hari)")) {`,
    to: `window.deleteRiwayatItem = async function(idx) {
        const result = await Swal.fire({ title: "Konfirmasi", text: "Yakin ingin menghapus transaksi ini? (Data akan dipindahkan ke Trash selama 30 hari)", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus!", cancelButtonText: "Batal" });
        if (result.isConfirmed) {`
  },
  // 7. clearRiwayat (2672 & 2867)
  {
    from: `window.clearRiwayat = function() {
        if(confirm("Yakin ingin menghapus seluruh riwayat transaksi? (Sesuai protokol, data akan dipindahkan ke Trash (Soft Delete) selama 30 hari sebelum dihapus permanen)")) {`,
    to: `window.clearRiwayat = async function() {
        const result = await Swal.fire({ title: "Konfirmasi", text: "Yakin ingin menghapus seluruh riwayat transaksi? (Sesuai protokol, data akan dipindahkan ke Trash (Soft Delete) selama 30 hari sebelum dihapus permanen)", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Bersihkan!", cancelButtonText: "Batal" });
        if (result.isConfirmed) {`
  },
  // 8. bayarHutang (2762 & 2957)
  {
    from: `window.bayarHutang = function(id) {
        const index = hutangs.findIndex(h => h.id == id);
        if(index !== -1) {
            if(confirm('Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?')) {`,
    to: `window.bayarHutang = async function(id) {
        const index = hutangs.findIndex(h => h.id == id);
        if(index !== -1) {
            const result = await Swal.fire({ title: "Konfirmasi", text: 'Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?', icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Lunasi!", cancelButtonText: "Batal" });
            if (result.isConfirmed) {`
  },
  // 9. deleteOrderan (3132)
  {
    from: `if (!confirm("Hapus orderan ini permanen?")) return;`,
    to: `const result = await Swal.fire({ title: "Konfirmasi", text: "Hapus orderan ini permanen?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  },
  // 10. save-pos (5211)
  {
    from: "if (!confirm(`Simpan ${rows.length} transaksi penjualan?`)) return;",
    to: "const result = await Swal.fire({ title: \"Konfirmasi\", text: `Simpan ${rows.length} transaksi penjualan?`, icon: \"warning\", showCancelButton: true, confirmButtonText: \"Ya, Simpan!\", cancelButtonText: \"Batal\" }); if (!result.isConfirmed) return;"
  },
  // 11. restoreBackup (5577)
  {
    from: `if (!confirm("Restore akan mengganti data database dengan isi backup. Lanjutkan?")) return;`,
    to: `const result = await Swal.fire({ title: "Konfirmasi PENTING", text: "Restore akan mengganti data database dengan isi backup. Lanjutkan?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Restore!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  },
  // 12. clear-invoice-draft (5931)
  {
    from: `el("clear-invoice-draft")?.addEventListener("click", () => {
    if (!confirm("Kosongkan draft nota?")) return;`,
    to: `el("clear-invoice-draft")?.addEventListener("click", async () => {
    const result = await Swal.fire({ title: "Konfirmasi", text: "Kosongkan draft nota?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Kosongkan!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  },
  // 13. clear-shopping (6313)
  {
    from: `el("clear-shopping")?.addEventListener("click", () => {
    if (!confirm("Kosongkan kalkulator belanja?")) return;`,
    to: `el("clear-shopping")?.addEventListener("click", async () => {
    const result = await Swal.fire({ title: "Konfirmasi", text: "Kosongkan kalkulator belanja?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Kosongkan!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  },
  // 14. generateRecoveryKey (6887)
  {
    from: `if (!confirm("Apakah Anda yakin ingin membuat Kunci Master baru? Kunci sebelumnya (jika ada) akan hangus.")) return;`,
    to: `const result = await Swal.fire({ title: "Konfirmasi PENTING", text: "Apakah Anda yakin ingin membuat Kunci Master baru? Kunci sebelumnya (jika ada) akan hangus.", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Buat Kunci!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`
  }
];

let modifiedCount = 0;
for (const r of replacements) {
  // Global replace since some are duplicated intentionally
  let newC = c.split(r.from).join(r.to);
  if (newC !== c) {
    modifiedCount++;
    c = newC;
  } else {
    console.warn("Failed to find exact match for:", r.from.slice(0, 50) + "...");
  }
}

fs.writeFileSync('assets/js/main.js', c);
console.log('Modified ' + modifiedCount + ' replacement blocks.');
