const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = \
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
\;

content = content.replace(targetStr, \
      window.initDigiflazzSettings = function() {
          setTimeout(async () => {
             try {
                 const userRes = await gas("getSetting", { key: "DIGIFLAZZ_USERNAME" });
                 if (userRes && typeof userRes === 'string') {
                     let inputUser = document.getElementById("digi-username");
                     let inputKey = document.getElementById("digi-key");
                     if (inputUser) inputUser.value = userRes;
                     if (inputKey) inputKey.value = "********";
                 }
             } catch(e) {}
          }, 100);
      };
\);

content = content.replace(
    '<div class="api-section-title">Konfigurasi Digiflazz (PPOB)</div>',
    '<div class="api-section-title">Konfigurasi Digiflazz (PPOB)</div>\\n            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" onload="window.initDigiflazzSettings()" style="display:none;">'
);

fs.writeFileSync(file, content);
console.log("PATCH TAB SUCCESS");