with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Kategori to titles
content = content.replace(
    'audit: ["Audit", "Catatan semua aktivitas penting yang terjadi di sistem."],',
    'audit: ["Audit", "Catatan semua aktivitas penting yang terjadi di sistem."],\n          kategori: ["Master Kategori", "Kelola daftar kategori barang untuk form Input Barang & Pembelian."],'
)

# 2. Add Kategori tab button
content = content.replace(
    '${settingsTabButton("audit", "AUDIT", tab)}',
    '${settingsTabButton("kategori", "KATEGORI", tab)}\n            ${settingsTabButton("audit", "AUDIT", tab)}'
)

# 3. Add UI for Kategori
html = """          ${tab === "kategori" ? `
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
                   this.innerHTML = '💾 Simpan Kategori';
                   this.disabled = false;
                });
              ">💾 Simpan Kategori</button>
            </div>
          ` : ""}
          ${tab === "api" ? `"""

content = content.replace('${tab === "api" ? `', html)

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("main.js fully patched")
