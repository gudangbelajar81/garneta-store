const fs = require('fs');
let code = fs.readFileSync('assets/js/neural-hub-dashboard.js', 'utf8');

const targetStr = `<button id="show-pwa-modal-btn" class="anim-button"`;
const replaceStr = `<button id="hard-refresh-btn" class="anim-button" style="padding: 10px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.4); color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: 0.3s;" onclick="window.location.reload(true)">
              <span style="font-size: 16px;">🔄</span> Muat Ulang
            </button>
            <button id="show-pwa-modal-btn" class="anim-button"`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('assets/js/neural-hub-dashboard.js', code);
    console.log("Success: added refresh btn");
} else {
    console.log("Error: not found");
}
