const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');

c = c.replace(/window\.restoreRiwayatItem\s*=\s*function\(idx\)\s*\{\s*if\s*\(confirm\("Kembalikan transaksi ini ke riwayat aktif\?"\)\)\s*\{/g,
  `window.restoreRiwayatItem = async function(idx) {
        const result = await Swal.fire({ title: "Konfirmasi", text: "Kembalikan transaksi ini ke riwayat aktif?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Kembalikan!", cancelButtonText: "Batal" });
        if (result.isConfirmed) {`);

c = c.replace(/window\.deleteRiwayatItem\s*=\s*function\(idx\)\s*\{\s*if\s*\(confirm\("Yakin ingin menghapus transaksi ini\? \(Data akan dipindahkan ke Trash selama 30 hari\)"\)\)\s*\{/g,
  `window.deleteRiwayatItem = async function(idx) {
        const result = await Swal.fire({ title: "Konfirmasi", text: "Yakin ingin menghapus transaksi ini? (Data akan dipindahkan ke Trash selama 30 hari)", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus!", cancelButtonText: "Batal" });
        if (result.isConfirmed) {`);

c = c.replace(/window\.clearRiwayat\s*=\s*function\(\)\s*\{\s*if\s*\(confirm\("Yakin ingin menghapus seluruh riwayat transaksi\? \(Sesuai protokol, data akan dipindahkan ke Trash \(Soft Delete\) selama 30 hari sebelum dihapus permanen\)"\)\)\s*\{/g,
  `window.clearRiwayat = async function() {
        const result = await Swal.fire({ title: "Konfirmasi", text: "Yakin ingin menghapus seluruh riwayat transaksi? (Sesuai protokol, data akan dipindahkan ke Trash (Soft Delete) selama 30 hari sebelum dihapus permanen)", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Bersihkan!", cancelButtonText: "Batal" });
        if (result.isConfirmed) {`);

c = c.replace(/window\.bayarHutang\s*=\s*function\(id\)\s*\{\s*const index = hutangs\.findIndex\(h => h\.id == id\);\s*if\s*\(index !== -1\)\s*\{\s*if\s*\(confirm\('Yakin ingin melunasi sisa hutang Rp ' \+ new Intl\.NumberFormat\('id-ID'\)\.format\(hutangs\[index\]\.sisaTagihan\) \+ ' atas nama ' \+ hutangs\[index\]\.customer \+ '\?'\)\)\s*\{/g,
  `window.bayarHutang = async function(id) {
        const index = hutangs.findIndex(h => h.id == id);
        if(index !== -1) {
            const result = await Swal.fire({ title: "Konfirmasi", text: 'Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?', icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Lunasi!", cancelButtonText: "Batal" });
            if (result.isConfirmed) {`);

c = c.replace(/el\("clear-invoice-draft"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*if \(!confirm\("Kosongkan draft nota\?"\)\) return;/g,
  `el("clear-invoice-draft")?.addEventListener("click", async () => {
    const result = await Swal.fire({ title: "Konfirmasi", text: "Kosongkan draft nota?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Kosongkan!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`);

c = c.replace(/el\("clear-shopping"\)\?\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*if \(!confirm\("Kosongkan kalkulator belanja\?"\)\) return;/g,
  `el("clear-shopping")?.addEventListener("click", async () => {
    const result = await Swal.fire({ title: "Konfirmasi", text: "Kosongkan kalkulator belanja?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Kosongkan!", cancelButtonText: "Batal" }); if (!result.isConfirmed) return;`);

fs.writeFileSync('assets/js/main.js', c);
console.log('Regex replacements applied.');
