const fs = require('fs');
let txt = fs.readFileSync('assets/js/main.js', 'utf8');

const targetStr = "document.getElementById('ppob-total-text').innerHTML = 'Total: <b style=\"color:#E3222B; font-size:20px;\">' + rupiah(Math.round(Number(p.sale_price))) + '</b>';";

const replacementStr = `const isPasca = (typeof ppobMainType !== 'undefined' && ppobMainType === 'pascabayar');
      document.getElementById('ppob-total-text').innerHTML = isPasca ? '' : ('Total: <b style="color:#E3222B; font-size:20px;">' + rupiah(Math.round(Number(p.sale_price))) + '</b>');
      const btnCheck = document.getElementById('btn-ppob-checkout');
      if (btnCheck) btnCheck.innerHTML = isPasca ? '🔍 Cek Tagihan' : '💳 Bayar Sekarang';`;

if (txt.includes(targetStr)) {
  txt = txt.replace(targetStr, replacementStr);
  fs.writeFileSync('assets/js/main.js', txt);
  console.log('Patched updatePpobFooter successfully!');
} else {
  console.log('Target string not found in main.js');
}