// ==========================================
// NOTEPAD PINTAR & MENU KENTANG MODULE
// ==========================================

// --- MEGA PROMPT AI ---
const SMART_NOTEPAD_PROMPT = `Kamu adalah akuntan jenius. Analisa nota tulisan tangan ini.
Ada dua kemungkinan jenis nota:
1. "minimarket": Daftar barang kelontong/minimarket campuran.
2. "kentang": Daftar berat karung komoditas (kentang, kacang, dll).

ATURAN WAJIB "minimarket":
- Jika harga kosong, kamu WAJIB hitung: Harga = Subtotal / Qty.
- Waspada angka malas! Jika Qty=20, Subtotal=740.000, dan ditulis Harga "37", maka Harga sebenarnya adalah 37000. Lengkapi nolnya!
- Tanda -"- artinya nama barang sama dengan baris di atasnya.
- Abaikan centang, fokus pada angka dan teks.
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
- Kertas biasanya berisi rentetan angka berat (contoh 60, 62, 70).
- Ada informasi jumlah karung, total berat, dan kode Grade (misal: PLs, DN, A, B).
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
}
Pastikan hanya mengembalikan JSON valid.`;

// --- UI COMPONENTS ---

function kentang() {
  setTimeout(() => {
    fetchKentangHistory();
  }, 100);

  return `
    <div class="card fade-in">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2>🥔 Grosir Kentang</h2>
          <p class="muted">Menu khusus mencatat kulakan komoditas per karung (kentang, kacang, dll).</p>
        </div>
        <button class="btn primary" onclick="window.openSmartNotepad('kentang')" style="font-size: 1.1rem;">📸 Notepad Pintar AI</button>
      </div>

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
  `;
}

// Injects the floating button into Pembelian Menu
function injectNotepadPintarToPembelian() {
  const container = document.querySelector("#app-content h2:contains('Pembelian')")?.parentElement;
  if (!document.getElementById("btn-notepad-pintar-pembelian")) {
      const btn = document.createElement("button");
      btn.id = "btn-notepad-pintar-pembelian";
      btn.className = "btn primary";
      btn.style.position = "fixed";
      btn.style.bottom = "20px";
      btn.style.right = "20px";
      btn.style.zIndex = "999";
      btn.style.boxShadow = "0 4px 12px rgba(0,255,200,0.5)";
      btn.innerHTML = "📸 Notepad Pintar AI";
      btn.onclick = () => window.openSmartNotepad('minimarket');
      document.body.appendChild(btn);
  }
}

// Hide the floating button when leaving Pembelian
const originalNavigate = window.navigate;
if(originalNavigate) {
  window.navigate = function(route) {
    const btn = document.getElementById("btn-notepad-pintar-pembelian");
    if (btn) {
       btn.style.display = (route === 'pembelian') ? 'block' : 'none';
    }
    originalNavigate(route);
  };
}

// Global modal open
window.openSmartNotepad = function(modeContext = 'minimarket') {
  const modalHTML = `
    <div id="smart-notepad-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; flex-direction:column; padding:20px; overflow-y:auto; backdrop-filter:blur(5px);">
      <div style="background:var(--bg); border:1px solid var(--line); border-radius:16px; width:100%; max-width:800px; margin:auto; padding:24px; position:relative;">
        <button class="btn danger" onclick="document.getElementById('smart-notepad-modal').remove()" style="position:absolute; top:12px; right:12px;">X</button>
        <h2 style="margin-top:0; color:var(--garneta-cyan);">📸 Notepad Pintar AI</h2>
        <p class="muted">Upload foto nota tulisan tangan. AI kami akan membedah angka malas, mengkoreksi salah hitung matematis, dan memasukkannya ke Meja Operasi.</p>
        
        <div id="sn-step-1" style="text-align:center; padding: 40px; border: 2px dashed var(--line); border-radius:12px; margin-top:20px;">
          <input type="file" id="sn-file-input" accept="image/*" capture="environment" style="display:none;" onchange="window.handleSmartNotepadFile(event)">
          <button class="btn primary" onclick="document.getElementById('sn-file-input').click()" style="font-size:1.2rem; padding: 12px 24px;">Ambil Foto / Upload Nota</button>
        </div>

        <div id="sn-step-2" class="hidden" style="text-align:center; padding: 40px;">
           <div class="spinner" style="width:40px; height:40px; border:4px solid var(--garneta-cyan); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; margin: 0 auto;"></div>
           <h3 style="margin-top:20px;">AI Sedang Membaca & Menghitung...</h3>
        </div>

        <div id="sn-step-3" class="hidden" style="margin-top:20px;">
          <div id="sn-result-container"></div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
            <button class="btn soft" onclick="document.getElementById('smart-notepad-modal').remove()">Batal</button>
            <button class="btn primary" id="sn-btn-save" onclick="window.saveSmartNotepad()">💾 Simpan ke Database</button>
          </div>
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
        instruction: SMART_NOTEPAD_PROMPT
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
      alert("Error: " + err.message);
      document.getElementById('sn-step-2').classList.add('hidden');
      document.getElementById('sn-step-1').classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
};

function renderSmartNotepadResult(data) {
  const container = document.getElementById('sn-result-container');
  if (data.type === 'minimarket') {
    let trs = (data.items || []).map((it, idx) => `
      <tr>
        <td><input type="text" class="input sn-m-name" data-idx="${idx}" value="${it.name}"></td>
        <td style="width:70px;"><input type="number" class="input sn-m-qty" data-idx="${idx}" value="${it.qty}"></td>
        <td style="width:120px;"><input type="number" class="input sn-m-price" data-idx="${idx}" value="${it.basePrice}"></td>
      </tr>
    `).join('');

    container.innerHTML = `
      <h3 style="color:var(--garneta-cyan); margin-top:0;">🛒 Mode: Minimarket</h3>
      <div style="display:flex; gap:12px; margin-bottom:12px;">
         <label>Suplier: <input type="text" id="sn-m-supplier" class="input" value="${data.supplier || ''}"></label>
         <label>Tanggal: <input type="date" id="sn-m-date" class="input" value="${data.date || new Date().toISOString().slice(0,10)}"></label>
      </div>
      <table class="table">
        <thead><tr><th>Nama Barang</th><th>Qty</th><th>Harga Modal</th></tr></thead>
        <tbody>${trs}</tbody>
      </table>
    `;
  } else if (data.type === 'kentang') {
    let gradesHtml = (data.grades || []).map((g, idx) => `
      <div style="border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <strong>Grade <input type="text" class="input sn-k-grade-name" data-idx="${idx}" value="${g.grade}" style="width:60px;"></strong>
          <label>Harga/Kg: Rp <input type="number" class="input sn-k-price" data-idx="${idx}" value="${g.pricePerKg}" style="width:100px;"></label>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${(g.weights || []).map(w => `<input type="number" class="input" value="${w}" style="width:60px; padding:4px; text-align:center;" disabled>`).join('')}
        </div>
        <div class="muted" style="margin-top:12px; font-size:0.9rem;">
          Total Karung: <b>${g.totalKarung}</b> | Total Berat: <b>${g.totalKg} KG</b>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <h3 style="color:var(--garneta-cyan); margin-top:0;">🥔 Mode: Komoditas / Kentang</h3>
      <div style="display:flex; gap:12px; margin-bottom:12px;">
         <label>Petani/Suplier: <input type="text" id="sn-k-supplier" class="input" value="${data.supplier || ''}"></label>
         <label>Tanggal: <input type="date" id="sn-k-date" class="input" value="${data.date || new Date().toISOString().slice(0,10)}"></label>
      </div>
      ${gradesHtml}
      <h4>Total Keseluruhan Bayar: Rp ${data.totalPrice ? data.totalPrice.toLocaleString('id-ID') : 0}</h4>
    `;
  }
}

window.saveSmartNotepad = async function() {
  const btn = document.getElementById('sn-btn-save');
  const data = window._snResultData;
  if(!data) return;

  btn.innerHTML = "Menyimpan...";
  btn.disabled = true;

  try {
    if (data.type === 'minimarket') {
      const items = [];
      const names = document.querySelectorAll('.sn-m-name');
      const qtys = document.querySelectorAll('.sn-m-qty');
      const prices = document.querySelectorAll('.sn-m-price');
      for(let i=0; i<names.length; i++) {
        items.push({
          name: names[i].value,
          qty: qtys[i].value,
          basePrice: prices[i].value
        });
      }
      await gas("saveBulkPurchases", {
        supplier: document.getElementById('sn-m-supplier').value,
        date: document.getElementById('sn-m-date').value,
        items
      });
      window.showToast("Nota Minimarket berhasil disimpan ke Pembelian!");
    } else if (data.type === 'kentang') {
      const grades = [];
      const gNames = document.querySelectorAll('.sn-k-grade-name');
      const gPrices = document.querySelectorAll('.sn-k-price');
      data.grades.forEach((g, i) => {
        grades.push({
          grade: gNames[i].value,
          pricePerKg: gPrices[i].value,
          totalKarung: g.totalKarung,
          totalKg: g.totalKg,
          weights: g.weights
        });
      });
      await gas("saveBulkKentang", {
        supplierName: document.getElementById('sn-k-supplier').value,
        date: document.getElementById('sn-k-date').value,
        totalPrice: data.totalPrice,
        grades
      });
      window.showToast("Nota Kentang berhasil disuntik ke Stok Gudang!");
      if(window.state && window.state.route === 'kentang') fetchKentangHistory();
    }
    document.getElementById('smart-notepad-modal').remove();
  } catch(err) {
    alert("Error menyimpan: " + err.message);
    btn.innerHTML = "💾 Coba Lagi";
    btn.disabled = false;
  }
};

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
    
    // We only have the main table info from this basic 'list'. For a full MVP, it's sufficient.
    tbody.innerHTML = data.map(r => `
      <tr>
        <td>${new Date(r.purchased_at).toLocaleDateString('id-ID')}</td>
        <td>${r.supplier_name || '-'}</td>
        <td><button class="btn soft" onclick="alert('Rincian Detail Karung sedang dikembangkan.')">Lihat Rincian</button></td>
        <td>Rp ${Number(r.total_price).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');
  } catch(e) {
    console.error(e);
  }
}

