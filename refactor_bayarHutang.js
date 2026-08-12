const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');

const regex = /window\.bayarHutang = function\(id\)\s*\{\s*const index = hutangs\.findIndex\(h => h\.id == id\);\s*if\(index !== -1\)\s*\{\s*if\(confirm\('Yakin ingin melunasi sisa hutang Rp ' \+ new Intl\.NumberFormat\('id-ID'\)\.format\(hutangs\[index\]\.sisaTagihan\) \+ ' atas nama ' \+ hutangs\[index\]\.customer \+ '\?'\)\)\s*\{/g;

const replacement = `window.bayarHutang = async function(id) {
        const index = hutangs.findIndex(h => h.id == id);
        if(index !== -1) {
            const result = await Swal.fire({ title: "Konfirmasi", text: 'Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?', icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Lunasi!", cancelButtonText: "Batal" });
            if (result.isConfirmed) {`;

c = c.replace(regex, replacement);

fs.writeFileSync('assets/js/main.js', c);
console.log('bayarHutang replaced');
