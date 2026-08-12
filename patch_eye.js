const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = \
              <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px; max-width: 400px;">
                  <label>Digiflazz Username
                      <input type="text" id="digi-username" class="input" placeholder="contoh: budiX" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px;">
                  </label>
                  <label>Digiflazz API Key
                      <input type="password" id="digi-key" class="input" placeholder="Masukkan API Key" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px;">
                  </label>
              </div>
\;

const replacement = \
              <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px; max-width: 400px;">
                  <label>Digiflazz Username
                      <input type="text" id="digi-username" class="input" placeholder="contoh: budiX" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px; text-transform:none;">
                      <small style="color:var(--garneta-danger); font-size:0.75rem; margin-top:4px; display:block;">*Perhatikan huruf besar/kecil. Harus persis sama dengan di Digiflazz.</small>
                  </label>
                  <label>Digiflazz API Key
                      <div style="position:relative; width:100%; display:flex; align-items:center;">
                          <input type="password" id="digi-key" class="input" placeholder="Masukkan API Key" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px; padding-right:40px; text-transform:none;">
                          <button type="button" onclick="const k = document.getElementById('digi-key'); k.type = k.type === 'password' ? 'text' : 'password'; this.innerHTML = k.type === 'password' ? '👁️' : '🙈';" style="position:absolute; right:10px; background:transparent; border:none; color:#888; cursor:pointer; font-size:1.1rem; padding:0;">👁️</button>
                      </div>
                  </label>
              </div>
\;

content = content.replace(targetStr.trim(), replacement.trim());
fs.writeFileSync(file, content);
console.log("PATCH EYE SUCCESS");