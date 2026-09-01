import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add getCategoriesList and checkNewCategory globally
helpers = """
      window.getCategoriesList = function() {
          if (window.state && window.state.data && window.state.data.masterKategori) {
              return window.state.data.masterKategori.split('\\n').map(c => c.trim()).filter(Boolean);
          }
          return [...new Set(((window.state && window.state.data && window.state.data.products) || []).map(p => p.category).filter(Boolean))];
      };
      
      window.checkNewCategory = function(val) {
          if (!val || !val.trim()) return;
          val = val.trim();
          let currentCats = window.getCategoriesList();
          if (!currentCats.find(c => c.toLowerCase() === val.toLowerCase())) {
              let master = (window.state.data.masterKategori || '').trim();
              master = master ? master + '\\n' + val : val;
              window.state.data.masterKategori = master;
              if (typeof gas === 'function') {
                  gas('saveAppSetting', { key: 'MASTER_KATEGORI', value: master }).catch(()=>console.log('Sync kategori gagal'));
              }
              let dl = document.getElementById('category-list');
              if (dl) {
                  dl.innerHTML = window.getCategoriesList().map(opt => `<option value="${escapeAttr(opt)}">`).join("");
              }
          }
      };
"""
# Insert after window.saveExpresCart (which we just added)
content = content.replace("window.saveExpresCart = function() {", helpers + "\n      window.saveExpresCart = function() {")

# 2. Replace const cats = ... in barang and pembelian
old_cats = r"const cats = \[\.\.\.new Set\(\(state\?\.data\?\.products \|\| \[\]\)\.map\(p => p\.category\)\.filter\(Boolean\)\)\];"
new_cats = r"const cats = window.getCategoriesList();"
content = re.sub(old_cats, new_cats, content)

# 3. Add onchange="window.checkNewCategory(this.value)" to the inputs
old_input = r'<input name="category" type="text" list="category-list">'
new_input = r'<input name="category" type="text" list="category-list" onchange="window.checkNewCategory(this.value)">'
content = content.replace(old_input, new_input)

# 4. Modify settings page to add "kategori" tab
settings_titles_old = r"""          audit: \["Audit", "Catatan semua aktivitas penting yang terjadi di sistem\."\],"""
settings_titles_new = """          audit: ["Audit", "Catatan semua aktivitas penting yang terjadi di sistem."],
          kategori: ["Master Kategori", "Kelola daftar kategori barang untuk form Input Barang & Pembelian."],"""
content = re.sub(settings_titles_old, settings_titles_new, content)

settings_tabs_old = r"""            \$\{settingsTabButton\("audit", "AUDIT", tab\)\}"""
settings_tabs_new = """            ${settingsTabButton("kategori", "KATEGORI", tab)}
            ${settingsTabButton("audit", "AUDIT", tab)}"""
content = re.sub(settings_tabs_old, settings_tabs_new, content)

# 5. Add UI for kategori in settings
settings_body_old = r"""          \$\{tab === "api" \? `"""
settings_body_new = """          ${tab === "kategori" ? `
            <div class="card" style="margin-top:1rem; animation: slideDown 0.3s ease;">
              <h3>Manajemen Master Kategori</h3>
              <p class="muted">Ketik daftar kategori secara menurun (tekan Enter untuk memisahkan kategori). Kategori ini akan otomatis muncul sebagai dropdown pilihan saat menginput Barang atau Pembelian.</p>
              <textarea id="master-kategori-input" rows="12" style="width:100%; padding:12px; background:var(--bg); border:1px solid var(--line); color:var(--text); border-radius:8px; font-size:14px; margin-top:10px; box-sizing:border-box;">${escapeHtml(state.data.masterKategori || '')}</textarea>
              <button class="btn primary" style="margin-top:16px; padding:12px 24px; font-weight:bold; font-size:14px;" onclick="
                this.innerHTML = 'Menyimpan...';
                this.disabled = true;
                const val = document.getElementById('master-kategori-input').value;
                state.data.masterKategori = val;
                gas('saveAppSetting', { key: 'MASTER_KATEGORI', value: val }).then(() => {
                   window.showToast('Master Kategori berhasil disimpan!', 'success');
                   render();
                }).catch(e => {
                   window.showToast('Gagal menyimpan: ' + e.message, 'error');
                   this.innerHTML = 'Simpan Kategori';
                   this.disabled = false;
                });
              ">dY"' Simpan Kategori</button>
            </div>
          ` : ""}
          ${tab === "api" ? `"""
content = content.replace(settings_body_old, settings_body_new)

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("main.js patched for settings")
