const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');

c = c.replace(/window\.bayarHutang\s*=\s*function\(id\)\s*\{\s*let hutangs = JSON\.parse\(localStorage\.getItem\('hutang'\)\s*\|\|\s*'\[\]'\);\s*const index = hutangs\.findIndex\(h => h\.id === id\);\s*if\s*\(index !== -1\)\s*\{\s*if\s*\(confirm\('Yakin ingin melunasi sisa hutang Rp ' \+ new Intl\.NumberFormat\('id-ID'\)\.format\(hutangs\[index\]\.sisaTagihan\) \+ ' atas nama ' \+ hutangs\[index\]\.customer \+ '\?'\)\)\s*\{/g,
  `window.bayarHutang = async function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const index = hutangs.findIndex(h => h.id === id);
         if (index !== -1) {
            const result = await Swal.fire({ title: "Konfirmasi", text: 'Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?', icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Lunasi!", cancelButtonText: "Batal" });
            if (result.isConfirmed) {`);

fs.writeFileSync('assets/js/main.js', c);
console.log('Fixed bayarHutang');
