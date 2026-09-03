// ==========================================
// NOTEPAD PINTAR & MENU KENTANG MODULE
// ==========================================

// --- MEGA PROMPT AI v2.0 ---
const SMART_NOTEPAD_PROMPT = `Kamu adalah akuntan jenius. Analisa nota tulisan tangan ini.
Ada dua kemungkinan jenis nota:
1. "minimarket": Daftar barang kelontong/minimarket campuran.
2. "kentang": Daftar berat karung komoditas (kentang, kacang, dll).

ATURAN UMUM (WAJIB):
- Tanggal dan Suplier/Petani TIDAK BOLEH kosong (null). Jika tidak tertulis di nota, tebak dari konteks (misal: nama toko/petani dari kop nota, tanggal dari coretan atau gunakan tanggal hari ini).
- PISAHKAN tegas RIBUAN vs DESIMAL: "24.000" = 24000 (ribuan), "60,5" = 60.5 (desimal kg). Jangan pernah menafsirkan titik sebagai desimal jika konteksnya harga.
- Hitung ulang semua total dari data mentah. Jangan percaya angka total yang ditulis jika tidak cocok dengan penjumlahan.
- Waspada angka malas! Jika Qty=20, Subtotal=740.000, dan ditulis Harga "37", maka Harga sebenarnya adalah 37000. Lengkapi nolnya!
- Tanda -"- artinya nama barang sama dengan baris di atasnya.
- Abaikan centang, coretan, dan tulisan selain data nota.
- Keluarkan HANYA JSON valid TANPA teks lain, TANPA markdown fence, TANPA komentar.

ATURAN WAJIB "minimarket":
- Jika harga kosong, kamu WAJIB hitung: Harga = Subtotal / Qty.
- Jika ada total/sisa tagihan sebelumnya (contoh total besar tanpa qty di atas tabel atau tulisan TF), JANGAN jadikan barang.
- Output JSON "minimarket" persis format ini:
{
  "type": "minimarket",
  "supplier": "Novi (atau nama toko jika ada)",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "Sabun Lfb", "qty": 5, "unit": "pcs", "basePrice": 3000, "salePrice": 0}
  ]
}

ATURAN WAJIB "kentang" (Timbangan Komoditas):
- Kertas biasanya berisi rentetan angka berat (contoh 60, 62, 70). Setiap angka = berat 1 karung dalam KG.
- Ada informasi jumlah karung, total berat, dan kode Grade (misal: PLs, DN, A, B).
- Jika ada sisa/lebih karung di luar grade utama, masukkan ke grade "Sisa" atau gabung ke grade terdekat dengan catatan pada nama grade.
- Jika dalam 1 nota ada campuran beberapa grade, WAJIB pecah menjadi beberapa objek dalam array "grades".
- WAJIB hitung ulang pricePerKg = subtotal / totalKg jika tidak tertulis atau tidak masuk akal.
- Format JSON "kentang" persis ini:
{
  "type": "kentang",
  "supplier": "Nama Petani",
  "date": "YYYY-MM-DD",
  "totalPrice": 24000000,
  "grades": [
    {
      "grade": "PLs",
      "totalKarung": 28,
      "totalKg": 1648,
      "pricePerKg": 14500,
      "weights": [56, 59, 56, 60]
    }
  ]
}`;

// --- UI COMPONENTS ---

function kentang() {
  setTimeout(() => {
    fetchKentangHistory();
  }, 100);

  const activeTab = window.kentangWorkspace || 'riwayat';

  return `
    <div class="card fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2>🥔 Grosir Kentang</h2>
          <p class="muted">Menu khusus mencatat kulakan komoditas per karung (kentang, kacang, dll).</p>
        </div>
      </div>

      <div style="display:flex; gap:12px; margin-bottom:20px; border-bottom:2px solid var(--line); padding-bottom:10px;">
        <button class="btn ${activeTab === 'riwayat' ? 'primary' : 'soft'}" onclick="window.switchKentangWorkspace('riwayat')">🥔 Grosir Kentang</button>
        <button class="btn ${activeTab === 'notepad' ? 'primary' : 'soft'}" onclick="window.switchKentangWorkspace('notepad')">📸 Notepad Pintar AI</button>
      </div>

      <div id="kentang-workspace-riwayat" class="${activeTab === 'riwayat' ? '' : 'hidden'}">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Tgl</th>
                <th>Suplier / Petani</th>
                <th>Detail Karung & Grade</th>
                <th>Total Modal</th>
              </tr>
            </thead>
            <tbody id="kentang-history-tbody">
              <tr><td colspan="4" class="text-center">Memuat riwayat...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div id="kentang-workspace-notepad" class="${activeTab === 'notepad' ? '' : 'hidden'}">
        <div id="notepad-pintar-entry" style="text-align:center; padding:40px; border:2px dashed var(--line); border-radius:12px;">
          <h3 style="margin-top:0; color:var(--garneta-cyan);">📸 Notepad Pintar AI</h3>
          <p class="muted">Foto nota tulisan tangan (minimarket / kulakan kentang). AI membedah angka, mengkoreksi salah hitung, dan menampilkan hasil untuk diedit sebelum disimpan.</p>
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:20px;">
            <button class="btn primary" onclick="window.openSmartNotepad('minimarket','gallery')" style="font-size:1.05rem; padding:12px 20px;">📁 Gambar Internal</button>
            <button class="btn primary" onclick="window.openSmartNotepad('minimarket','camera')" style="font-size:1.05rem; padding:12px 20px;">📷 Foto Kamera</button>
          </div>
        </div>
        <div id="notepad-pintar-result" class="hidden" style="margin-top:20px;"></div>
      </div>
    </div>
  `;
}

// Workspace tab switching (localStorage persisted)
window.switchKentangWorkspace = function(tab) {
  window.kentangWorkspace = tab;
  try { localStorage.setItem('kentangWorkspace', tab); } catch(e) {}
  const t1 = document.getElementById('kentang-workspace-riwayat');
  const t2 = document.getElementById('kentang-workspace-notepad');
  if (t1) t1.classList.toggle('hidden', tab !== 'riwayat');
  if (t2) t2.classList.toggle('hidden', tab !== 'notepad');
  const cont = document.querySelector('#app-content .card');
  if (cont) {
    cont.querySelectorAll('button').forEach(b => {
      const isActive = (b.textContent.includes('🥔') && tab === 'riwayat') || (b.textContent.includes('📸') && tab === 'notepad');
      b.className = 'btn ' + (isActive ? 'primary' : 'soft');
    });
  }
};

// Injects the floating button into Pembelian Menu


// Global modal open — modeContext: 'minimarket' | 'kentang'; source: 'gallery' | 'camera'
window.openSmartNotepad = function(modeContext = 'minimarket', source = 'gallery') {
  const modalHTML = `
    <div id="smart-notepad-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; flex-direction:column; padding:20px; overflow-y:auto; backdrop-filter:blur(5px);">
      <div style="background:var(--bg); border:1px solid var(--line); border-radius:16px; width:100%; max-width:800px; margin:auto; padding:24px; position:relative;">
        <button class="btn danger" onclick="document.getElementById('smart-notepad-modal').remove()" style="position:absolute; top:12px; right:12px;">X</button>
        <h2 style="margin-top:0; color:var(--garneta-cyan);">📸 Notepad Pintar AI</h2>
        <p class="muted">Upload foto nota tulisan tangan. AI kami akan membedah angka malas, mengkoreksi salah hitung matematis, dan memasukkannya ke Meja Operasi.</p>

        <div id="sn-step-1" style="text-align:center; padding: 40px; border: 2px dashed var(--line); border-radius:12px; margin-top:20px;">
          <input type="file" id="sn-file-input" accept="image/*" ${source === 'camera' ? 'capture="environment"' : ''} style="display:none;" onchange="window.handleSmartNotepadFile(event)">
          <button class="btn primary" onclick="document.getElementById('sn-file-input').click()" style="font-size:1.2rem; padding: 12px 24px;">${source === 'camera' ? '📷 Ambil Foto' : '📁 Pilih Gambar'}</button>
        </div>

        <div id="sn-step-2" class="hidden" style="text-align:center; padding: 40px;">
           <div class="spinner" style="width:40px; height:40px; border:4px solid var(--garneta-cyan); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; margin: 0 auto;"></div>
           <h3 style="margin-top:20px;">AI Sedang Membaca & Menghitung...</h3>
        </div>

        <div id="sn-step-3" class="hidden" style="margin-top:20px;">
          <div id="sn-result-container"></div>
        </div>

      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  window._snCurrentMode = modeContext;
  window._snResultData = null;
};

window.handleSmartNotepadFile = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(ev) {
    document.getElementById('sn-step-1').classList.add('hidden');
    document.getElementById('sn-step-2').classList.remove('hidden');

    try {
      const response = await gas("analyzeInvoiceImage", {
        imageDataUrl: ev.target.result,
        instruction: window._simulasiMode ? "SIMULASI" : SMART_NOTEPAD_PROMPT
      });

      const resData = response.data || response;
      let jsonData;
      try {
        const text = typeof resData === 'string' ? resData : JSON.stringify(resData);
        const match = text.match(/\[.*\]|\{.*\}/s);
        jsonData = JSON.parse(match[0]);
      } catch(e) {
        throw new Error("Gagal membaca format data dari AI.");
      }

      window._snResultData = Array.isArray(jsonData) ? jsonData[0] : jsonData;

      document.getElementById('sn-step-2').classList.add('hidden');
      document.getElementById('sn-step-3').classList.remove('hidden');
      renderSmartNotepadResult(window._snResultData);

    } catch(err) {
      alert("GAGAL MEMPROSES FOTO: " + err.message + "\n\nPastikan API Key masih hidup, settingan Provider benar (Jika pakai GoAPI, pilih GoAPI), dan tidak error.");
      document.getElementById('sn-step-2').classList.add('hidden');
      document.getElementById('sn-step-1').classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
};

// --- CRUD STATE (Notepad Result) ---
window._snCRUD = { type: null, supplier: '', date: '', grades: [], items: [] };

function renderSmartNotepadResult(data) {
  window._snCRUD = {
    type: data.type,
    supplier: data.supplier || '',
    date: data.date || new Date().toISOString().slice(0,10),
    grades: (data.grades || []).map(g => ({
      grade: g.grade || '',
      pricePerKg: g.pricePerKg || 0,
      weights: Array.isArray(g.weights) ? g.weights.map(w => Number(w) || 0) : []
    })),
    items: (data.items || []).map(it => ({
      name: it.name || '',
      qty: Number(it.qty) || 0,
      unit: it.unit || 'pcs',
      basePrice: Number(it.basePrice) || 0,
      salePrice: Number(it.salePrice) || 0
    })),
    totalPrice: Number(data.totalPrice) || 0
  };
  renderCRUD();
}

function renderCRUD() {
  const container = document.getElementById('sn-result-container');
  if (!container) return;
  const c = window._snCRUD;

  if (c.type === 'minimarket') {
    const trs = c.items.map((it, idx) => `
      <tr>
        <td><input type="text" class="input crud-m-name" data-idx="${idx}" value="${esc(it.name)}"></td>
        <td style="width:80px;"><input type="number" class="input crud-m-qty" data-idx="${idx}" value="${it.qty}" min="0" step="any"></td>
        <td style="width:90px;"><input type="text" class="input crud-m-unit" data-idx="${idx}" value="${esc(it.unit)}"></td>
        <td style="width:130px;"><input type="number" class="input crud-m-price" data-idx="${idx}" value="${it.basePrice}" min="0" step="any"></td>
        <td style="width:90px;"><input type="number" class="input crud-m-sale" data-idx="${idx}" value="${it.salePrice}" min="0" step="any"></td>
        <td style="width:60px;"><button class="btn danger btn-sm" onclick="window.crudRemoveItem(${idx})">🗑</button></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <h3 style="color:var(--garneta-cyan); margin-top:0;">🛒 Mode: Minimarket (Notepad Hasil — bisa diedit)</h3>
      <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
         <label>Suplier: <input type="text" id="sn-m-supplier" class="input" value="${esc(c.supplier)}"></label>
         <label>Tanggal: <input type="date" id="sn-m-date" class="input" value="${c.date}"></label>
      </div>
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Nama Barang</th><th>Qty</th><th>Satuan</th><th>Harga Modal</th><th>Harga Jual</th><th></th></tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:12px;">
        <button class="btn soft" onclick="window.crudAddItem()">➕ Tambah Baris</button>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
        <button class="btn soft" onclick="document.getElementById('smart-notepad-modal').remove()">Batal</button>
        <button class="btn primary" onclick="window.exportSmartNotepadToBarang()">💾 Export ke Database Barang + Statistik Harga</button>
      </div>
    `;
  } else if (c.type === 'kentang') {
    const gradesHtml = c.grades.map((g, idx) => {
      const weightsHtml = g.weights.map((w, wi) => `
        <input type="number" class="input crud-k-weight" data-g="${idx}" data-w="${wi}" value="${w}" style="width:60px; padding:4px; text-align:center;" min="0" step="any">
      `).join('');
      return `
      <div style="border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <strong>Grade <input type="text" class="input crud-k-grade-name" data-g="${idx}" value="${esc(g.grade)}" style="width:70px;"></strong>
          <label>Harga/Kg: Rp <input type="number" class="input crud-k-price" data-g="${idx}" value="${g.pricePerKg}" style="width:110px;" min="0" step="any"></label>
          <button class="btn danger btn-sm" onclick="window.crudRemoveGrade(${idx})">🗑 Hapus Grade</button>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          ${weightsHtml}
          <button class="btn soft btn-sm" onclick="window.crudAddWeight(${idx})">➕</button>
        </div>
        <div class="muted" style="margin-top:12px; font-size:0.9rem;">
          Total Karung: <b>${g.weights.length}</b> | Total Berat: <b>${g.weights.reduce((a,b) => a + (Number(b)||0), 0)} KG</b> | Subtotal: <b>Rp ${((g.weights.reduce((a,b) => a + (Number(b)||0), 0)) * (Number(g.pricePerKg)||0)).toLocaleString('id-ID')}</b>
        </div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <h3 style="color:var(--garneta-cyan); margin-top:0;">🥔 Mode: Komoditas / Kentang (Notepad Hasil — bisa diedit)</h3>
      <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
         <label>Petani/Suplier: <input type="text" id="sn-k-supplier" class="input" value="${esc(c.supplier)}"></label>
         <label>Tanggal: <input type="date" id="sn-k-date" class="input" value="${c.date}"></label>
      </div>
      ${gradesHtml}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; flex-wrap:wrap; gap:8px;">
        <button class="btn soft" onclick="window.crudAddGrade()">➕ Tambah Grade</button>
        <h4 style="margin:0;">Total Keseluruhan Bayar: Rp <span id="sn-k-total">${Number(c.totalPrice).toLocaleString('id-ID')}</span></h4>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
        <button class="btn soft" onclick="document.getElementById('smart-notepad-modal').remove()">Batal</button>
        <button class="btn primary" onclick="window.exportSmartNotepadToKentang()">💾 Export ke Grosir Kentang</button>
      </div>
    `;
  }
}

// --- CRUD helpers ---
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.crudAddItem = function() {
  window._snCRUD.items.push({ name: '', qty: 0, unit: 'pcs', basePrice: 0, salePrice: 0 });
  renderCRUD();
};
window.crudRemoveItem = function(idx) {
  window._snCRUD.items.splice(idx, 1);
  renderCRUD();
};
window.crudAddGrade = function() {
  window._snCRUD.grades.push({ grade: 'A', pricePerKg: 0, weights: [0] });
  renderCRUD();
};
window.crudRemoveGrade = function(idx) {
  window._snCRUD.grades.splice(idx, 1);
  renderCRUD();
};
window.crudAddWeight = function(gIdx) {
  window._snCRUD.grades[gIdx].weights.push(0);
  renderCRUD();
};

// Sync DOM inputs back into _snCRUD before export
function syncCRUD() {
  const c = window._snCRUD;
  if (c.type === 'minimarket') {
    c.supplier = document.getElementById('sn-m-supplier')?.value || '';
    c.date = document.getElementById('sn-m-date')?.value || new Date().toISOString().slice(0,10);
    c.items = Array.from(document.querySelectorAll('.crud-m-name')).map((el, i) => ({
      name: el.value,
      qty: Number(document.querySelectorAll('.crud-m-qty')[i]?.value) || 0,
      unit: document.querySelectorAll('.crud-m-unit')[i]?.value || 'pcs',
      basePrice: Number(document.querySelectorAll('.crud-m-price')[i]?.value) || 0,
      salePrice: Number(document.querySelectorAll('.crud-m-sale')[i]?.value) || 0
    }));
  } else if (c.type === 'kentang') {
    c.supplier = document.getElementById('sn-k-supplier')?.value || '';
    c.date = document.getElementById('sn-k-date')?.value || new Date().toISOString().slice(0,10);
    c.grades.forEach((g, gi) => {
      g.grade = document.querySelectorAll('.crud-k-grade-name')[gi]?.value || 'A';
      g.pricePerKg = Number(document.querySelectorAll('.crud-k-price')[gi]?.value) || 0;
      g.weights = Array.from(document.querySelectorAll('.crud-k-weight')).filter(w => Number(w.dataset.g) === gi)
        .map(w => Number(w.value) || 0);
    });
    c.totalPrice = c.grades.reduce((sum, g) => sum + (g.weights.reduce((a,b) => a + b, 0) * g.pricePerKg), 0);
  }
}

// --- EXPORT 1: ke Database Barang + Statistik Harga (minimarket) ---
window.exportSmartNotepadToBarang = async function() {
  const btn = document.querySelector('#sn-result-container .btn.primary');
  syncCRUD();
  const c = window._snCRUD;

  const items = c.items.filter(it => String(it.name).trim() !== '');
  if (items.length === 0) { alert("Tidak ada item untuk disimpan."); return; }

  const originalHTML = btn.innerHTML;
  btn.innerHTML = "Menyimpan...";
  btn.disabled = true;

  try {
    const res = await gas("saveBulkPurchases", {
      supplier: c.supplier,
      date: c.date,
      items
    });
    const failed = res?.failedCount || 0;
    window.showToast(failed > 0
      ? `Nota tersimpan! ${res.savedCount} sukses, ${failed} gagal (lihat log).`
      : "Nota Minimarket berhasil disimpan ke Database Barang + Statistik Harga!");
    document.getElementById('smart-notepad-modal')?.remove();
    if (window.state && window.state.route === 'pembelian') {
      try { window.renderPembelianHistory && window.renderPembelianHistory(); } catch(e) {}
    }
  } catch(err) {
    alert("Error menyimpan: " + err.message);
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
};

// --- EXPORT 2: ke Grosir Kentang ---
window.exportSmartNotepadToKentang = async function() {
  const btn = document.querySelector('#sn-result-container .btn.primary');
  syncCRUD();
  const c = window._snCRUD;

  const grades = c.grades.filter(g => String(g.grade).trim() !== '' && g.weights.length > 0);
  if (grades.length === 0) { alert("Tidak ada grade untuk disimpan."); return; }

  const originalHTML = btn.innerHTML;
  btn.innerHTML = "Menyimpan...";
  btn.disabled = true;

  try {
    await gas("saveBulkKentang", {
      supplierName: c.supplier,
      date: c.date,
      totalPrice: c.totalPrice,
      grades
    });
    window.showToast("Nota Kentang berhasil disuntik ke Grosir Kentang + Stok Gudang!");
    document.getElementById('smart-notepad-modal')?.remove();
    if (window.state && window.state.route === 'kentang') fetchKentangHistory();
  } catch(err) {
    alert("Error menyimpan: " + err.message);
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
};

// Keep legacy alias so old inline handlers don't break
window.saveSmartNotepad = window.exportSmartNotepadToKentang;

async function fetchKentangHistory() {
  try {
    // Use gas to automatically include JWT token
    const res = await gas("list", { collection: "kentang_purchases" });
    const data = res || [];
    const tbody = document.getElementById('kentang-history-tbody');
    if(!tbody) return;

    if(!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">Belum ada riwayat.</td></tr>';
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${new Date(r.purchased_at).toLocaleDateString('id-ID')}</td>
        <td>${r.supplier_name || '-'}</td>
        <td><button class="btn soft" onclick="window.showKentangDetail(${r.id})">Lihat Rincian</button></td>
        <td>Rp ${Number(r.total_price).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');
  } catch(e) {
    console.error(e);
  }
}

// Show per-purchase detail (grades) — uses kentang_purchase_details
window.showKentangDetail = async function(purchaseId) {
  try {
    const res = await gas("list", { collection: "kentang_purchase_details" });
    const all = Array.isArray(res) ? res : [];
    const rows = all.filter(r => Number(r.purchase_id) === Number(purchaseId));
    let html;
    if (!rows.length) {
      html = '<p class="muted">Belum ada detail grade.</p>';
    } else {
      html = rows.map(r => {
        let weights = [];
        try { weights = JSON.parse(r.weight_details || '[]'); } catch(e) {}
        const weightsText = weights.length ? weights.join(', ') + ' kg' : '-';
        return `
          <div style="border:1px solid var(--line); border-radius:8px; padding:10px; margin-bottom:8px;">
            <strong>Grade ${esc(r.grade)}</strong> — ${r.total_karung} karung, ${Number(r.total_kg)} kg<br>
            <span class="muted">Rp ${Number(r.price_per_kg).toLocaleString('id-ID')}/kg → Subtotal Rp ${Number(r.subtotal).toLocaleString('id-ID')}</span><br>
            <span class="muted">Rincian: ${weightsText}</span>
          </div>`;
      }).join('');
    }
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px);';
    modal.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:16px;max-width:600px;width:100%;padding:24px;position:relative;max-height:80vh;overflow-y:auto;">
        <button class="btn danger" onclick="this.closest('div[style]').remove()" style="position:absolute;top:12px;right:12px;">X</button>
        <h3 style="margin-top:0;color:var(--garneta-cyan);">📦 Rincian Karung & Grade</h3>
        ${html}
      </div>`;
    document.body.appendChild(modal);
  } catch(e) {
    alert("Error: " + e.message);
  }
};
