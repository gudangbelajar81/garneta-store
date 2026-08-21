const fs = require('fs');
let txt = fs.readFileSync('assets/js/main.js', 'utf8');

const badStart = '} catch(e) {\\n      showToast("Gagal memuat katalog PPOB", "error");';
const badEnd = 'if (filtered.length === 1 && !ppobSelectedSku) { setTimeout(() => window.selectPpobProduct(filtered[0].buyer_sku_code), 50); }';

const idx1 = txt.indexOf('} catch(e) {\r\n      showToast("Gagal memuat katalog PPOB", "error");');
const idx2 = txt.indexOf('} catch(e) {\n      showToast("Gagal memuat katalog PPOB", "error");');
const idx = idx1 > -1 ? idx1 : idx2;

if (idx > -1) {
  const targetEnd = 'if (filtered.length === 1 && !ppobSelectedSku) { setTimeout(() => window.selectPpobProduct(filtered[0].buyer_sku_code), 50); }';
  const endIdx = txt.indexOf(targetEnd, idx);
  if (endIdx > -1) {
    // Cut out everything from idx up to just before endIdx
    txt = txt.substring(0, idx) + txt.substring(endIdx);
    fs.writeFileSync('assets/js/main.js', txt);
    console.log('Fixed duplication! Sliced from ' + idx + ' to ' + endIdx);
  } else {
    console.log('endIdx not found');
  }
} else {
  console.log('idx not found');
}
