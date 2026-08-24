const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const targetStr = '<div style="flex: 0 0 auto; display: flex; align-items: center;">';
const replaceStr = `<div style="flex: 0 0 auto; display: flex; align-items: center; gap: 8px;">
          <button id="global-back-btn" class="btn soft" style="display: none; padding: 4px 8px; border-radius: 8px; font-size: 14px; min-height: 32px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); cursor: pointer;" title="Kembali ke Dashboard">
            🔙
          </button>`;

if (html.includes(targetStr)) {
    html = html.replace(targetStr, replaceStr);
    fs.writeFileSync('index.html', html);
    console.log("Success: added global-back-btn");
} else {
    console.log("Error: target string not found");
}
