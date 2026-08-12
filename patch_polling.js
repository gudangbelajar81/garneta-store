const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

let pollingScript = `
// === AUTO-UPDATE NOTIFIER ===
(function() {
  let initialVersion = null;
  let updateNotified = false;

  async function checkVersion() {
    if (updateNotified) return;
    try {
      const res = await fetch('/api/system/version');
      if (!res.ok) return;
      const data = await res.json();
      
      if (!initialVersion) {
        initialVersion = data.version;
      } else if (initialVersion !== data.version) {
        updateNotified = true;
        
        // Buat banner update di UI
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.bottom = '20px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.backgroundColor = '#ff4757';
        banner.style.color = '#fff';
        banner.style.padding = '12px 24px';
        banner.style.borderRadius = '30px';
        banner.style.boxShadow = '0 10px 25px rgba(255, 71, 87, 0.4)';
        banner.style.zIndex = '9999';
        banner.style.cursor = 'pointer';
        banner.style.fontWeight = 'bold';
        banner.style.fontSize = '14px';
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.gap = '10px';
        banner.innerHTML = '<span>ðŸš€ Update sistem terbaru telah tersedia!</span> <span style="text-decoration: underline;">Klik untuk Memuat Ulang</span>';
        
        banner.onclick = () => {
          window.location.reload(true);
        };
        
        document.body.appendChild(banner);
        
        if(typeof window.playChaChing === 'function') window.playChaChing();
      }
    } catch(e) {}
  }
  
  // Cek setiap 5 menit (300.000 ms)
  setInterval(checkVersion, 300000);
  
  // Cek pertama kali setelah 5 detik
  setTimeout(checkVersion, 5000);
})();
`;

mainJs += pollingScript;
fs.writeFileSync('assets/js/main.js', mainJs);
console.log('Update polling injected in main.js');
