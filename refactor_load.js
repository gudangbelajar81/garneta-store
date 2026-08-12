const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'assets', 'js', 'main.js');
let content = fs.readFileSync(mainJsPath, 'utf-8');

// 1. Tambahkan auto state sync ke gas()
const gasReturnTarget = 'return result?.data !== undefined ? result.data : result;';
const gasStateSync = `
      // [PERFORMANCE] Auto-Sync state tanpa perlu load() semua data
      if (action === "add" && result?.data && payload.collection) {
          if (!window.state.data[payload.collection]) window.state.data[payload.collection] = [];
          window.state.data[payload.collection].push(result.data);
      } else if (action === "update" && result?.data && payload.collection) {
          if (window.state.data[payload.collection]) {
             const idx = window.state.data[payload.collection].findIndex(x => String(x.id) === String(payload.id));
             if (idx > -1) window.state.data[payload.collection][idx] = result.data;
          }
      } else if (action === "remove" && payload.collection && payload.id) {
          if (window.state.data[payload.collection]) {
             window.state.data[payload.collection] = window.state.data[payload.collection].filter(x => String(x.id) !== String(payload.id));
          }
      }

      return result?.data !== undefined ? result.data : result;
`;
if (!content.includes('// [PERFORMANCE] Auto-Sync')) {
    content = content.replace(gasReturnTarget, gasStateSync);
}

// 2. Ganti semua 'await load();' menjadi 'render(); load().catch(console.error);'
// Kecuali yang ada di dalam function startSyncPolling atau gas itu sendiri
content = content.replace(/await\s+load\(\)\s*;/g, 'render(); load().catch(console.error);');

// Khusus function load() declaration, jangan sampai ke-replace aneh
// tapi regex di atas hanya mengubah pemanggilan (karena ada semi-colon).
fs.writeFileSync(mainJsPath, content, 'utf-8');
console.log("Refactoring load() completed.");
