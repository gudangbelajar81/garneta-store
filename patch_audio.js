const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Inject playBeep() in showToast if error
mainJs = mainJs.replace(/function showToast\(message, type\)\s*\{/g, `function showToast(message, type) {
  if ((type === 'error' || type === 'danger') && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate([100, 50, 100]); } catch(e){}
  }`);

// 2. Inject playBeep() inside keranjang actions
// Need to find tambahBarangKeKeranjang.
mainJs = mainJs.replace(/function tambahBarangKeKeranjang\([^)]+\)\s*\{/g, `$&
  if(typeof window.playBeep === 'function') window.playBeep();`);
  
mainJs = mainJs.replace(/function ubahQty\([^)]+\)\s*\{/g, `$&
  if(typeof window.playBeep === 'function') window.playBeep();`);

// 3. Inject playChaChing inside bayar() when successful
// I will just add playChaChing to the place where it says "Transaksi berhasil" or checkout modal showing
mainJs = mainJs.replace(/showToast\("Berhasil dicetak!", "success"\);/g, `$&
  if(typeof window.playChaChing === 'function') window.playChaChing();`);
  
// Or inside function simpanPenjualan / checkout
mainJs = mainJs.replace(/function simpanPenjualan\([^)]*\)\s*\{/g, `$&
  if(typeof window.playChaChing === 'function') window.playChaChing();`);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log('Audio injected in main.js');
