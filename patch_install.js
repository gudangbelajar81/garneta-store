const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Remove the forced rewrite of 'install' tab
code = code.replace(
  'if (tab === "tema" || tab === "install") tab = "api";',
  'if (tab === "tema") tab = "api";'
);

// 2. Add the button in the HTML
code = code.replace(
  '${settingsTabButton("ppob", "PPOB & DIGI", tab)}',
  '${settingsTabButton("ppob", "PPOB & DIGI", tab)}\n            ${settingsTabButton("install", "INSTALL", tab)}'
);

// 3. Add the titles mapping
code = code.replace(
  'ppob: ["PPOB & Digiflazz", "Pengaturan API Digiflazz untuk fitur pulsa/tagihan."]',
  'ppob: ["PPOB & Digiflazz", "Pengaturan API Digiflazz untuk fitur pulsa/tagihan."],\n          install: ["Install PWA", "Install aplikasi web ini ke Home Screen."]'
);

// 4. Add the HTML for the install tab
const tabContent = `
          \${tab === "install" ? \`
          <div class="api-center-card" style="max-width: 100%;">
            <div class="api-section-title">📲 Install Aplikasi Android / PC</div>
            <p class="muted" style="margin-bottom:16px;">Jadikan GARNETA STORE sebagai aplikasi nyata di perangkat Anda untuk akses lebih cepat.</p>
            <div style="background: rgba(0,255,204,0.1); border: 1px solid rgba(0,255,204,0.3); border-radius: 12px; padding: 20px; text-align: center;">
              <button class="api-primary" id="install-pwa" type="button" style="padding: 16px; font-size: 16px; width: 100%; max-width: 300px; border-radius: 12px; margin-bottom: 12px; font-weight: bold;">📥 INSTALL APLIKASI SEKARANG</button>
              <p style="font-size: 12px; color: var(--neural-text-soft);">Catatan: Jika tombol tidak bereaksi, gunakan menu browser (titik tiga) lalu pilih <strong>Add to Home Screen / Install App</strong>.</p>
            </div>
          </div>
          \` : ""}
`;

code = code.replace(
  '${tab === "ppob" ? `',
  tabContent + '          ${tab === "ppob" ? `'
);

fs.writeFileSync('assets/js/main.js', code);
console.log("Patched main.js");
