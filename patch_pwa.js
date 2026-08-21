const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

// We already removed install tab from settings in the previous run.
// Let's patch dashboard()
const oldDashboard = `function dashboard() {
      // Initialize Neural Hub Dashboard
      setTimeout(function() {
        if (window.NeuralHub) {
          window.NeuralHub.init();
        }
      }, 100);
      
      return \`<section id="neural-dashboard-container" style="min-height:calc(100vh - 140px);">
        <!-- Neural Hub Dashboard akan di-render oleh JavaScript -->
      </section>\`;
    }`;

const newDashboardHTML = `
    function dashboard() {
      // Initialize Neural Hub Dashboard
      setTimeout(function() {
        if (window.NeuralHub) {
          window.NeuralHub.init();
        }
        
        // PWA Install Logic (Delay sedikit agar tidak mengganggu render awal)
        setTimeout(() => {
          if (window.deferredInstallPrompt && !localStorage.getItem('pwa_install_dismissed')) {
            const pwaBanner = document.getElementById('pwa-modern-banner');
            if (pwaBanner) {
              pwaBanner.style.display = 'flex';
            }
          }
        }, 500);
      }, 100);
      
      return \`
      <div id="pwa-modern-banner" style="display:none; background: linear-gradient(135deg, rgba(0,255,204,0.15), rgba(0,102,255,0.15)); border: 1px solid rgba(0,255,204,0.4); border-radius: 16px; padding: 16px; margin-bottom: 24px; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 8px 32px rgba(0,255,204,0.1); backdrop-filter: blur(12px); position: relative; overflow: hidden; animation: slideDownPWA 0.6s cubic-bezier(0.16, 1, 0.3, 1);">
        <style>
          @keyframes slideDownPWA {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        </style>
        <div style="position:absolute; top:-20px; right:-20px; width:100px; height:100px; background: radial-gradient(circle, rgba(0,255,204,0.2) 0%, transparent 70%); border-radius:50%;"></div>
        
        <div style="display: flex; align-items: center; gap: 16px; z-index:1;">
          <div style="width: 52px; height: 52px; background: rgba(0,255,204,0.2); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; border: 1px solid rgba(0,255,204,0.5); box-shadow: 0 0 20px rgba(0,255,204,0.3);">
            🚀
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0 0 4px 0; color: #fff; font-size: 15px; font-weight: 800; letter-spacing: 0.3px;">Install Aplikasi PWA</h3>
            <p style="margin: 0; color: var(--neural-text-soft); font-size: 12px; line-height: 1.4;">Jadikan aplikasi native di layar HP Anda. Lebih cepat & full screen.</p>
          </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 8px; z-index:1; min-width: 110px;">
          <button id="install-pwa" style="background: linear-gradient(90deg, #00ffcc, #00b3ff); border: none; padding: 10px 16px; border-radius: 8px; color: #0b1f24; font-weight: 900; font-size: 13px; cursor: pointer; box-shadow: 0 4px 15px rgba(0,255,204,0.4); transition: all 0.3s ease; text-transform: uppercase; letter-spacing: 0.5px;">
            📥 Install
          </button>
          <button onclick="document.getElementById('pwa-modern-banner').style.display='none'; localStorage.setItem('pwa_install_dismissed', '1');" style="background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px; cursor: pointer; transition: all 0.2s ease;">
            Nanti Saja
          </button>
        </div>
      </div>
      
      <section id="neural-dashboard-container" style="min-height:calc(100vh - 140px);">
        <!-- Neural Hub Dashboard akan di-render oleh JavaScript -->
      </section>\`;
    }`;

code = code.replace(oldDashboard, newDashboardHTML.trim());

fs.writeFileSync('assets/js/main.js', code);
console.log("Patched PWA install banner correctly");
