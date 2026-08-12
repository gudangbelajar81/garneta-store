const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add to titles
content = content.replace(
    'bluetooth: ["Bluetooth Printer", "Pengaturan kertas cetak dan koneksi printer thermal Bluetooth."]',
    'bluetooth: ["Bluetooth Printer", "Pengaturan kertas cetak dan koneksi printer thermal Bluetooth."],\n          ppob: ["PPOB & Digiflazz", "Pengaturan API Digiflazz untuk fitur pulsa/tagihan."]'
);

// Remove the duplicate bluetooth title just in case
content = content.replace(
    /bluetooth: \["Bluetooth Printer", "Pengaturan kertas cetak dan koneksi printer thermal Bluetooth."\]\n        };\n/g,
    '};\n'
);

// 2. Add Tab Button
content = content.replace(
    '${settingsTabButton("bluetooth", "BLUETOOTH", tab)}',
    '${settingsTabButton("bluetooth", "BLUETOOTH", tab)}\n            ${settingsTabButton("ppob", "PPOB & DIGI", tab)}'
);

// 3. Add Tab Content
const ppobTabContent = `
          \${tab === "ppob" ? \`
          <div class="theme-panel">
            <div class="api-section-title">Konfigurasi Digiflazz (PPOB)</div>
            <p class="muted">Masukkan Username dan API Key Production Digiflazz Anda untuk mulai berjualan PPOB.</p>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px; max-width: 400px;">
                <label>Digiflazz Username
                    <input type="text" id="digi-username" class="input" placeholder="contoh: budiX" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px;">
                </label>
                <label>Digiflazz API Key
                    <input type="password" id="digi-key" class="input" placeholder="Masukkan API Key" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px;">
                </label>
            </div>
            <div class="actions" style="margin-top:20px;">
                <button class="api-primary" onclick="window.saveDigiflazzSettings()" type="button" style="padding:10px 20px;">SIMPAN PENGATURAN</button>
            </div>
          </div>
          \` : ""}
`;

content = content.replace(
    '${tab === "bluetooth" ? `',
    ppobTabContent + '${tab === "bluetooth" ? `'
);

// 4. Add JS Functions
const jsFunctions = `
      window.saveDigiflazzSettings = async function() {
          const username = document.getElementById("digi-username").value.trim();
          const key = document.getElementById("digi-key").value.trim();
          if(!username) {
              if (typeof showToast === 'function') showToast("Username harus diisi!", "error");
              return;
          }
          try {
              await gas("setSetting", { key: "DIGIFLAZZ_USERNAME", value: username });
              if(key && key !== "********") {
                  await gas("setSetting", { key: "DIGIFLAZZ_KEY", value: key });
              }
              if (typeof showToast === 'function') showToast("Pengaturan Digiflazz berhasil disimpan!", "success");
          } catch(e) {
              if (typeof showToast === 'function') showToast("Gagal menyimpan: " + e.message, "error");
          }
      };

      if (tab === "ppob") {
          setTimeout(async () => {
             try {
                 const userRes = await gas("getSetting", { key: "DIGIFLAZZ_USERNAME" });
                 if (userRes && typeof userRes === 'string') {
                     document.getElementById("digi-username").value = userRes;
                     document.getElementById("digi-key").value = "********";
                 }
             } catch(e) {}
          }, 100);
      }
`;

content = content.replace(
    'function settingsTabButton(key, label, active) {',
    jsFunctions + '\n      function settingsTabButton(key, label, active) {'
);

fs.writeFileSync(file, content);
console.log("PATCH PPOB TAB SUCCESS");
