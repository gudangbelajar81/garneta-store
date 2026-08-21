const fs = require('fs');
let txt = fs.readFileSync('assets/js/main.js', 'utf8');

const targetStr = `  // === Footer ===
  window.updatePpobFooter = function() {
    const footer = document.getElementById('ppob-footer');
    if (!footer) return;
    if (!ppobSelectedSku) { footer.style.display = 'none'; return; }
    const p = ppobProducts.find(x => x.buyer_sku_code === ppobSelectedSku);
    if (p) {
      footer.style.display = 'flex';
      document.getElementById('ppob-total-text').innerHTML = 'Total: <b style="color:#E3222B; font-size:20px;">' + rupiah(Math.round(Number(p.sale_price))) + '</b>';
    }
  };`;

const replacement = `  // === Footer ===
  window.updatePpobFooter = function() {
    const footer = document.getElementById('ppob-footer');
    if (!footer) return;
    if (!ppobSelectedSku) { footer.style.display = 'none'; return; }
    const p = ppobProducts.find(x => x.buyer_sku_code === ppobSelectedSku);
    if (p) {
      footer.style.display = 'flex';
      const isPasca = (typeof ppobMainType !== 'undefined' && ppobMainType === 'pascabayar');
      document.getElementById('ppob-total-text').innerHTML = isPasca ? '' : ('Total: <b style="color:#E3222B; font-size:20px;">' + rupiah(Math.round(Number(p.sale_price))) + '</b>');
      const btnCheck = document.getElementById('btn-ppob-checkout');
      if (btnCheck) btnCheck.innerHTML = isPasca ? '🔍 Cek Tagihan' : '💳 Bayar Sekarang';
    }
  };`;

if (txt.includes(targetStr)) {
  txt = txt.replace(targetStr, replacement);
  fs.writeFileSync('assets/js/main.js', txt);
  console.log('Successfully updated footer!');
} else {
  console.log('Target string not found in main.js');
}