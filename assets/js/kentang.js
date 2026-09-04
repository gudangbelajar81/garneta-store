// ==========================================
// NOTEPAD PINTAR & MENU KENTANG MODULE
// ==========================================

// --- MEGA PROMPT AI v3.0 (KAWIN: Minimarket + Kentang, mode-aware) ---
const SMART_NOTEPAD_PROMPT_MINIMARKET = `Kamu adalah akuntan jenius. Analisa foto nota tulisan tangan BERIKUT INI sebagai nota MINIMARKET / TOKO KELONTONG.

ATURAN WAJIB:
- Tanggal dan Supplier TIDAK BOLEH kosong (null). Jika tidak tertulis di nota, tebak dari konteks atau gunakan tanggal hari ini.
- PISAHKAN tegas RIBUAN vs DESIMAL: "24.000" = 24000 (ribuan), "60,5" = 60.5 (desimal kg). Jangan pernah menafsirkan titik sebagai desimal jika konteksnya harga.
- Hitung ulang semua total dari data mentah. Jangan percaya angka total yang ditulis jika tidak cocok dengan penjumlahan.
- Waspada angka malas! Jika Qty=20, Subtotal=740.000, dan ditulis Harga "37", maka Harga sebenarnya adalah 37000. Lengkapi nolnya!
- Tanda "-" artinya nama barang sama dengan baris di atasnya.
- Abaikan centang, coretan, dan tulisan selain data nota.
- Jika harga kosong, kamu WAJIB hitung: Harga = Subtotal / Qty.
- Jika ada total/sisa tagihan sebelumnya (contoh total besar tanpa qty di atas tabel atau tulisan TF), JANGAN jadikan barang.
- Keluarkan HANYA JSON valid TANPA teks lain, TANPA markdown fence, TANPA komentar.

Output JSON "minimarket" persis format ini:
{
  "type": "minimarket",
  "supplier": "Novi (atau nama toko jika ada)",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "Sabun Lfb", "qty": 5, "unit": "pcs", "basePrice": 3000, "salePrice": 0}
  ]
}`;

const SMART_NOTEPAD_PROMPT_KENTANG = `Kamu adalah akuntan jenius. Analisa foto nota tulisan tangan BERIKUT INI sebagai nota TIMBANGAN KOMODITAS / KULAKAN KENTANG.

ATURAN WAJIB:
- Kertas biasanya berisi rentetan angka berat (contoh 60, 62, 70). Setiap angka = berat 1 karung dalam KG.
- Ada informasi jumlah karung, total berat, dan kode Grade (misal: PLs, DN, A, B).
- Tanggal dan Petani/Supplier TIDAK BOLEH kosong (null). Jika tidak tertulis, tebak dari konteks atau gunakan tanggal hari ini.
- PISAHKAN tegas RIBUAN vs DESIMAL: "24.000" = 24000 (ribuan), "60,5" = 60.5 (desimal kg).
- Hitung ulang semua total dari data mentah. Jangan percaya angka total yang ditulis jika tidak cocok dengan penjumlahan.
- Jika ada sisa/lebih karung di luar grade utama, masukkan ke grade "Sisa" atau gabung ke grade terdekat dengan catatan pada nama grade.
- Jika dalam 1 nota ada campuran beberapa grade, WAJIB pecah menjadi beberapa objek dalam array "grades".
- WAJIB hitung ulang pricePerKg = subtotal / totalKg jika tidak tertulis atau tidak masuk akal.
- Keluarkan HANYA JSON valid TANPA teks lain, TANPA markdown fence, TANPA komentar.

Format JSON "kentang" persis ini:
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

const SMART_NOTEPAD_PROMPT_AUTO = `Kamu adalah akuntan jenius. Analisa foto nota tulisan tangan ini. Tentukan sendiri jenisnya: bisa nota MINIMARKET (daftar barang kelontong/minimarket campuran) atau nota TIMBANGAN KOMODITAS / KENTANG (daftar berat karung, grade, harga per kg).

ATURAN UMUM (WAJIB):
- Tanggal dan Suplier/Petani TIDAK BOLEH kosong (null). Jika tidak tertulis di nota, tebak dari konteks (misal: nama toko/petani dari kop nota, tanggal dari coretan atau gunakan tanggal hari ini).
- PISAHKAN tegas RIBUAN vs DESIMAL: "24.000" = 24000 (ribuan), "60,5" = 60.5 (desimal kg). Jangan pernah menafsirkan titik sebagai desimal jika konteksnya harga.
- Hitung ulang semua total dari data mentah. Jangan percaya angka total yang ditulis jika tidak cocok dengan penjumlahan.
- Waspada angka malas! Jika Qty=20, Subtotal=740.000, dan ditulis Harga "37", maka Harga sebenarnya adalah 37000. Lengkapi nolnya!
- Tanda "-" artinya nama barang sama dengan baris di atasnya.
- Abaikan centang, coretan, dan tulisan selain data nota.
- Keluarkan HANYA SATU objek JSON valid TANPA teks lain, TANPA markdown fence, TANPA komentar.

Jika MINIMARKET, output persis format ini:
{
  "type": "minimarket",
  "supplier": "Nama Supplier/Toko",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "Nama Barang", "qty": 5, "unit": "pcs", "basePrice": 3000, "salePrice": 0}
  ]
}
Aturan minimarket: jika harga kosong, WAJIB hitung Harga = Subtotal / Qty. Jangan jadikan total besar/sisa tagihan sebagai barang.

Jika KOMODITAS/KENTANG, output persis format ini:
{
  "type": "kentang",
  "supplier": "Nama Petani",
  "date": "YYYY-MM-DD",
  "totalPrice": 24000000,
  "grades": [
    {"grade": "PLs", "totalKarung": 28, "totalKg": 1648, "pricePerKg": 14500, "weights": [56, 59, 56, 60]}
  ]
}
Aturan kentang: setiap angka berat = 1 karung dalam KG. Jika campuran beberapa grade, WAJIB pecah menjadi beberapa objek dalam array "grades". WAJIB hitung ulang pricePerKg = subtotal / totalKg jika tidak tertulis atau tidak masuk akal.`;

// Bangun prompt final: mode + instruksi custom user
function buildSmartPrompt(mode, userInstruction) {
  let base = SMART_NOTEPAD_PROMPT_AUTO;
  if (mode === 'minimarket') base = SMART_NOTEPAD_PROMPT_MINIMARKET;
  else if (mode === 'kentang') base = SMART_NOTEPAD_PROMPT_KENTANG;
  const custom = String(userInstruction || '').trim();
  if (custom) {
    return base + '\n\nPERINTAH TAMBAHAN DARI USER (ikuti dengan teliti):\n' + custom;
  }
  return base;
}

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
          <h2>ðŸ¥” Grosir Kentang</h2>
          <p class="muted">Menu khusus mencatat kulakan komoditas per karung (kentang, kacang, dll).</p>
        </div>
      </div>

      <div style="display:flex; gap:12px; margin-bottom:20px; border-bottom:2px solid var(--line); padding-bottom:10px;">
        <button class="btn ${activeTab === 'riwayat' ? 'primary' : 'soft'}" onclick="window.switchKentangWorkspace('riwayat')">ðŸ¥” Grosir Kentang</button>
        <button class="btn ${activeTab === 'notepad' ? 'primary' : 'soft'}" onclick="window.switchKentangWorkspace('notepad')">ðŸ“¸ Notepad Pintar AI</button>
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
          <h3 style="margin-top:0; color:var(--garneta-cyan);">ðŸ“¸ Notepad Pintar AI</h3>
          <p class="muted">Foto nota tulisan tangan (minimarket / kulakan kentang). AI membedah angka, mengkoreksi salah hitung, dan menampilkan hasil untuk diedit sebelum disimpan.</p>
          <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:20px;">
            <button class="btn primary" onclick="window.openSmartNotepad('auto','gallery')" style="font-size:1.05rem; padding:12px 20px;">ðŸ“ Gambar Internal</button>
            <button class="btn primary" onclick="window.openSmartNotepad('auto','camera')" style="font-size:1.05rem; padding:12px 20px;">ðŸ“· Foto Kamera</button>
          </div>
          <p class="muted" style="margin-top:14px; font-size:0.85rem;">âœ¨ Mode otomatis: AI menebak jenis nota. Setelah foto dipilih kamu bisa ganti mode ðŸ›’ / ðŸ¥” secara manual.</p>
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
      const isActive = (b.textContent.includes('ðŸ¥”') && tab === 'riwayat') || (b.textContent.includes('ðŸ“¸') && tab === 'notepad');
      b.className = 'btn ' + (isActive ? 'primary' : 'soft');
    });
  }
};

// Injects the floating button into Pembelian Menu


// ============================================================
// MODAL UNIVERSAL "NOTA AI" (KAWIN) â€” Satu mesin, dua mode
// modeContext: 'auto' | 'minimarket' | 'kentang'; source: 'gallery' | 'camera'
// ============================================================
window.openSmartNotepad = function(modeContext = 'auto', source = 'gallery') {
  // Reset state global
  window._snCurrentMode = (modeContext === 'minimarket' || modeContext === 'kentang') ? modeContext : 'auto';
  window._snResultData = null;
  window._snCRUD = { type: null, supplier: '', date: '', grades: [], items: [] };
  window._snResultWarnings = { list: [], summary: '', verified: false };
  window._snLastImageDataUrl = null;
  window._snLastInstruction = '';

  // [GASFIX] Auto-detect mode SIMULASI: cek ketersediaan key AI (aman utk Karyawan via aiHealth)
  window._simulasiMode = false;
  window._snAiHealth = null;
  try {
    gas('aiHealth').then(function(h) {
      window._snAiHealth = h || null;
      const noLive = !h || !h.hasLiveVision || Number(h.liveKeys) === 0;
      if (noLive) window._simulasiMode = true;
      const badge = document.getElementById('sn-ai-badge');
      if (badge) {
        if (noLive) {
          badge.style.display = 'block';
        } else {
          badge.style.display = 'none';
        }
      }
    }).catch(function() {
      // Server AI health tidak bisa dicek — biarkan false (coba mode nyata, server fallback otomatis)
      window._simulasiMode = false;
    });
  } catch(e) {
    window._simulasiMode = false;
  }

  const simulasiNotice = `
    <div id="sn-ai-badge" style="display:none; margin:0 0 12px 0; padding:10px 14px; border-radius:10px; font-size:0.88rem; background:rgba(245,166,35,0.12); border:1px solid rgba(245,166,35,0.45); color:#f5a623;">
      ⚠️ <b>Mode SIMULASI (tanpa AI)</b> — tidak ada API Key vision yang aktif. Hasil analisa berupa <b>data contoh</b>, bukan dari foto. Hubungi Super Admin untuk mengisi API Key di Pengaturan AI.
    </div>`;

  const modalHTML = `
    <div id="smart-notepad-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; flex-direction:column; padding:20px; overflow-y:auto; backdrop-filter:blur(5px);">
      <div style="background:var(--bg); border:1px solid var(--line); border-radius:16px; width:100%; max-width:820px; margin:auto; padding:24px; position:relative;">
        <button class="btn danger" onclick="document.getElementById('smart-notepad-modal').remove()" style="position:absolute; top:12px; right:12px;">âœ•</button>
        <h2 style="margin-top:0; color:var(--garneta-cyan);">ðŸ“¸ Nota AI (Notepad Pintar)</h2>
        <p class="muted">Satu mesin, dua mode: ðŸ›’ Minimarket (barang kelontong) &amp; ðŸ¥” Komoditas/Kentang (timbangan karung). AI membedah angka malas, mengkoreksi salah hitung, lalu hasilnya bisa diedit sebelum disimpan.</p>

        ${simulasiNotice}
        <div id="sn-step-1" style="text-align:center; padding: 30px; border: 2px dashed var(--line); border-radius:12px; margin-top:16px;">
          <input type="file" id="sn-file-input" accept="image/*" ${source === 'camera' ? 'capture="environment"' : ''} style="display:none;" onchange="window.handleSmartNotepadFile(event)">
          <button class="btn primary" onclick="document.getElementById('sn-file-input').click()" style="font-size:1.15rem; padding: 12px 24px;">${source === 'camera' ? 'ðŸ“· Ambil Foto' : 'ðŸ“ Pilih Gambar Nota'}</button>
        </div>

        <div id="sn-step-1b" class="hidden" style="margin-top:16px;">
          <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:flex-start;">
            <div style="flex:0 0 auto;">
              <img id="sn-preview-img" alt="Pratinjau nota" style="max-width:200px; max-height:220px; border-radius:10px; border:1px solid var(--line); object-fit:contain;">
            </div>
            <div style="flex:1; min-width:260px;">
              <div class="muted" style="font-weight:700; margin-bottom:8px;">Jenis Nota:</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;">
                <button class="btn" id="sn-mode-auto" data-mode="auto" onclick="window.snPickMode('auto')" style="border:2px solid var(--garneta-cyan);">âœ¨ Otomatis</button>
                <button class="btn soft" id="sn-mode-minimarket" data-mode="minimarket" onclick="window.snPickMode('minimarket')">ðŸ›’ Minimarket</button>
                <button class="btn soft" id="sn-mode-kentang" data-mode="kentang" onclick="window.snPickMode('kentang')">ðŸ¥” Kentang</button>
              </div>
              <label class="muted" style="font-weight:700;">Perintah AI (opsional)</label>
              <textarea id="sn-user-instruction" rows="2" placeholder="Contoh: ambil nama barang & harga saja, lalu perkirakan harga jual +20%. Atau: jumlahkan total seluruh grade." style="width:100%; margin-top:6px; box-sizing:border-box;"></textarea>
              <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
                <button class="btn primary" onclick="window.snAnalyze()" style="padding:10px 22px; font-size:1.02rem;">ðŸ” Analisa Nota Ini</button>
                <button class="btn soft" onclick="window.snResetToPick()" style="padding:10px 22px;">â†©ï¸ Ganti Foto</button>
              </div>
            </div>
          </div>
        </div>

        <div id="sn-step-2" class="hidden" style="text-align:center; padding: 40px;">
           <div class="spinner" style="width:40px; height:40px; border:4px solid var(--garneta-cyan); border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite; margin: 0 auto;"></div>
           <h3 style="margin-top:20px;">AI Sedang Membaca & Menghitung...</h3>
        </div>

        <div id="sn-step-3" class="hidden" style="margin-top:16px;">
          <div id="sn-result-container"></div>
        </div>

      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  window.snRefreshModeButtons();
};

// Update tombol pilihan mode aktif
window.snRefreshModeButtons = function() {
  const cur = window._snCurrentMode || 'auto';
  ['auto', 'minimarket', 'kentang'].forEach(m => {
    const btn = document.getElementById('sn-mode-' + m);
    if (!btn) return;
    btn.className = 'btn ' + (m === cur ? '' : 'soft');
    if (m === cur) {
      btn.style.border = '2px solid var(--garneta-cyan)';
      btn.style.background = 'rgba(34,211,238,0.15)';
    } else {
      btn.style.border = '2px solid var(--line)';
      btn.style.background = '';
    }
  });
};

// Pilih mode secara manual
window.snPickMode = function(mode) {
  if (mode !== 'minimarket' && mode !== 'kentang') mode = 'auto';
  window._snCurrentMode = mode;
  window.snRefreshModeButtons();
};

// Kembali ke langkah pilih file (dari pratinjau)
window.snResetToPick = function() {
  const f = document.getElementById('sn-file-input');
  if (f) { f.value = ''; }
  document.getElementById('sn-step-1')?.classList.remove('hidden');
  document.getElementById('sn-step-1b')?.classList.add('hidden');
  window._snLastImageDataUrl = null;
};

// Klik "Analisa" dari step 1b (foto sudah dikompres & tersimpan di _snLastImageDataUrl)
window.snAnalyze = async function() {
  const dataUrl = window._snLastImageDataUrl;
  if (!dataUrl) { alert("Foto belum siap. Silakan pilih gambar terlebih dahulu."); return; }
  const mode = window._snCurrentMode || 'auto';
  const userInstruction = document.getElementById('sn-user-instruction')?.value || '';
  window._snLastInstruction = userInstruction;
  document.getElementById('sn-step-1b')?.classList.add('hidden');
  document.getElementById('sn-step-2')?.classList.remove('hidden');
  const step3 = document.getElementById('sn-step-3');
  if (step3) { step3.classList.add('hidden'); const rc = document.getElementById('sn-result-container'); if (rc) rc.innerHTML = ''; }

  try {
    let response;
    try {
      response = await gas("analyzeInvoiceImage", {
        imageDataUrl: dataUrl,
        instruction: window._simulasiMode ? "SIMULASI" : buildSmartPrompt(mode, userInstruction)
      });
    } catch (firstErr) {
      // [GASFIX] Jika server menolak (key habis & bukan simulasi), coba sekali lagi mode SIMULASI
      // supaya Karyawan tetap dapat umpan balik alih-alih error mentah.
      if (window._simulasiMode) throw firstErr;
      const fallback = await gas("analyzeInvoiceImage", {
        imageDataUrl: dataUrl,
        instruction: "SIMULASI"
      }).catch(function() { return null; });
      if (!fallback) throw firstErr;
      window._simulasiMode = true;
      response = fallback;
    }

    // Ambil string JSON dari field hasil (gas() sudah unwrap data -> response = {hasil, provider, model})
    const hasilStr = typeof response === 'string' ? response : (response && response.hasil) || '';
    // Jika server menandai simulated (0 key), aktifkan mode simulasi untuk UI
    if (response && response.simulated === true) window._simulasiMode = true;
    const parsed = parseSmartNotepadJson(hasilStr);
    if (!parsed) throw new Error("Gagal membaca format data dari AI.");

    // ===== PASS 2: Verifikasi matematis oleh AI (hanya jika bukan SIMULASI) =====
    let warnings = [], verificationSummary = '';
    if (!window._simulasiMode) {
      try {
        const vRes = await gas("verifyInvoiceText", { text: JSON.stringify(parsed) });
        const vStr = (vRes && (typeof vRes === 'string' ? vRes : (vRes.hasil || ''))) || '';
        const verified = parseSmartNotepadJson(vStr);
        if (verified && verified.type) {
          parsed.type = verified.type || parsed.type;
          parsed.supplier = verified.supplier || parsed.supplier;
          parsed.date = verified.date || parsed.date;
          if (Array.isArray(verified.items)) parsed.items = verified.items;
          if (Array.isArray(verified.grades)) parsed.grades = verified.grades;
          if (verified.totalPrice !== undefined) parsed.totalPrice = verified.totalPrice;
          if (Array.isArray(verified.warnings)) warnings = verified.warnings;
          if (verified.verificationSummary) verificationSummary = verified.verificationSummary;
        }
      } catch(vErr) {
        // Graceful degradation: tetap pakai hasil pass 1 + peringatan verifikasi gagal
        warnings = ["Verifikasi AI gagal (" + (vErr.message || 'error') + "). Data ditampilkan apa adanya — periksa manual."];
      }
    } else {
      // SIMULASI: bangun warnings sintetis agar alur badge tetap terlihat
      if (parsed && parsed.items && parsed.items.length) {
        parsed.items.forEach(it => {
          if (it && it.unit === 'pcs' && Number(it.qty) % 1 !== 0) { it.flag = 'check'; it.alasan = 'Qty desimal untuk satuan pcs (simulasi)'; }
          else if (it) { it.flag = it.flag || 'ok'; it.alasan = it.alasan || ''; }
        });
        warnings = ['Mode SIMULASI: verifikasi AI dilewati. Periksa manual sebelum export.'];
      }
      if (parsed && parsed.grades && parsed.grades.length) {
        parsed.grades.forEach(g => { if (g) { g.flag = g.flag || 'ok'; g.alasan = g.alasan || ''; } });
        warnings = ['Mode SIMULASI: verifikasi AI dilewati. Periksa manual sebelum export.'];
      }
    }

    window._snResultWarnings = { list: warnings, summary: verificationSummary, verified: !window._simulasiMode };
    window._snResultData = parsed;

    document.getElementById('sn-step-2')?.classList.add('hidden');
    document.getElementById('sn-step-3')?.classList.remove('hidden');
    renderSmartNotepadResult(window._snResultData);

  } catch(err) {
    const hint = window._simulasiMode
      ? "\n\nMode SIMULASI aktif — ini bukan analisa asli. Jika kamu melihat pesan ini, berarti server tidak bisa dihubungi."
      : "\n\nPastikan API Key masih hidup, settingan Provider benar, dan tidak error. Jika terus gagal, hubungi Super Admin.";
    alert("GAGAL MEMPROSES FOTO: " + err.message + hint);
    document.getElementById('sn-step-2')?.classList.add('hidden');
    document.getElementById('sn-step-1b')?.classList.remove('hidden');
  }
};

window.handleSmartNotepadFile = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Kompresi gambar dulu (maks 1280px, JPEG q0.72) â€” cegah timeout 30s
  const compressFn = (window.compressImageFile || window.readAndCompressImage);
  const compressPromise = compressFn
    ? Promise.resolve(compressFn.call(window, file))
    : Promise.reject(new Error("Fungsi kompresi gambar tidak tersedia."));

  compressPromise.then(function(dataUrl) {
    document.getElementById('sn-step-1')?.classList.add('hidden');
    document.getElementById('sn-step-1b')?.classList.remove('hidden');
    window._snLastImageDataUrl = dataUrl;
    const img = document.getElementById('sn-preview-img');
    if (img) img.src = dataUrl;
    // Fokus ke mode yang sedang dipilih (default auto)
    window.snRefreshModeButtons();
  }).catch(function(err) {
    alert("Gagal menyiapkan gambar: " + err.message);
  });
};

// ============================================================
// PARSE JSON ROBUST â€” buang markdown fence, ekstrak blok JSON seimbang
// ============================================================
function extractBalancedJson(text) {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  let start = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{' || cleaned[i] === '[') { start = i; break; }
  }
  if (start === -1) return null;
  const openCh = cleaned[start];
  const closeCh = openCh === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) { esc = false; }
      else if (ch === '\\') { esc = true; }
      else if (ch === '"') { inStr = false; }
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === openCh) depth++;
    else if (ch === closeCh) { depth--; if (depth === 0) return cleaned.slice(start, i + 1); }
  }
  return null;
}

function parseSmartNotepadJson(text) {
  try {
    const block = extractBalancedJson(text);
    if (!block) return null;
    let obj = JSON.parse(block);
    // Bila array berisi objek item polos {name, qty, price} (format mock lama) -> bungkus jadi minimarket
    if (Array.isArray(obj)) {
      const first = obj[0];
      if (first && first.items && typeof first === 'object') {
        obj = obj[0]; // array berisi 1 objek lengkap
      } else if (first && typeof first === 'object' && ('name' in first || 'qty' in first)) {
        obj = {
          type: 'minimarket',
          supplier: 'Contoh Supplier',
          date: new Date().toISOString().slice(0, 10),
          items: obj.map((it) => ({
            name: it.name || '',
            qty: Number(it.qty) || 0,
            unit: it.unit || 'pcs',
            basePrice: Number(it.price ?? it.basePrice) || 0,
            salePrice: Number(it.salePrice) || 0,
            flag: it.flag || 'ok',
            alasan: it.alasan || ''
          }))
        };
      } else {
        return null;
      }
    }
    if (!obj || typeof obj !== 'object') return null;

    // Auto-detect tipe bila type kosong/salah: kentang bila ada grades, minimarket bila ada items
    let type = String(obj.type || '').trim().toLowerCase();
    const hasGrades = Array.isArray(obj.grades) && obj.grades.length > 0;
    const hasItems = Array.isArray(obj.items) && obj.items.length > 0;
    if (type !== 'minimarket' && type !== 'kentang') {
      if (hasGrades && !hasItems) type = 'kentang';
      else if (hasItems && !hasGrades) type = 'minimarket';
      else type = hasGrades ? 'kentang' : (hasItems ? 'minimarket' : 'minimarket');
      obj.type = type;
    }
    return obj;
  } catch(e) {
    return null;
  }
}

// --- CRUD STATE (Notepad Result) ---
window._snCRUD = { type: null, supplier: '', date: '', grades: [], items: [] };
window._snResultWarnings = { list: [], summary: '', verified: false };

// Panel peringatan verifikasi (dipakai renderCRUD)
function renderWarningPanel() {
  const w = window._snResultWarnings;
  if (!w || !w.list || !w.list.length) return '';
  const badgeColor = w.verified ? 'var(--warn, #f5a623)' : 'var(--danger, #ef4444)';
  return `
    <div style="border:1px solid ${badgeColor}55; background:${badgeColor}18; border-radius:10px; padding:12px 16px; margin-bottom:14px; font-size:0.92rem;">
      <div style="font-weight:700; color:${badgeColor}; margin-bottom:6px;">âš ï¸ ${w.verified ? 'AI Verifier Menemukan Catatan' : 'Verifikasi AI Gagal / Dilewati'}</div>
      <ul style="margin:0; padding-left:18px; color:var(--text);">
        ${w.list.map(x => '<li>' + esc(x) + '</li>').join('')}
      </ul>
      ${w.summary ? '<div class="muted" style="margin-top:6px;">' + esc(w.summary) + '</div>' : ''}
    </div>`;
}
function flagBadge(it) {
  if (!it) return '';
  return (it.flag === 'check' || it.alasan)
    ? `<span title="${esc(it.alasan || 'perlu dicek')}" style="display:inline-block; margin-left:6px; background:rgba(245,166,35,.18); color:#f5a623; border:1px solid rgba(245,166,35,.5); font-size:0.72rem; font-weight:700; padding:1px 7px; border-radius:20px; cursor:help;">âš ï¸</span>`
    : '';
}

function renderSmartNotepadResult(data) {
  window._snCRUD = {
    type: data.type,
    supplier: data.supplier || '',
    date: data.date || new Date().toISOString().slice(0,10),
    grades: (data.grades || []).map(g => ({
      grade: g.grade || '',
      pricePerKg: g.pricePerKg || 0,
      weights: Array.isArray(g.weights) ? g.weights.map(w => Number(w) || 0) : [],
      flag: g.flag || 'ok',
      alasan: g.alasan || ''
    })),
    items: (data.items || []).map(it => ({
      name: it.name || '',
      qty: Number(it.qty) || 0,
      unit: it.unit || 'pcs',
      basePrice: Number(it.basePrice) || 0,
      salePrice: Number(it.salePrice) || 0,
      flag: it.flag || 'ok',
      alasan: it.alasan || ''
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
        <td><input type="text" class="input crud-m-name" data-idx="${idx}" value="${esc(it.name)}" style="${it.flag === 'check' ? 'border-color:#f5a623 !important;' : ''}">${flagBadge(it)}</td>
        <td style="width:80px;"><input type="number" class="input crud-m-qty" data-idx="${idx}" value="${it.qty}" min="0" step="any"></td>
        <td style="width:90px;"><input type="text" class="input crud-m-unit" data-idx="${idx}" value="${esc(it.unit)}"></td>
        <td style="width:130px;"><input type="number" class="input crud-m-price" data-idx="${idx}" value="${it.basePrice}" min="0" step="any"></td>
        <td style="width:90px;"><input type="number" class="input crud-m-sale" data-idx="${idx}" value="${it.salePrice}" min="0" step="any"></td>
        <td style="width:60px;"><button class="btn danger btn-sm" onclick="window.crudRemoveItem(${idx})">ðŸ—‘</button></td>
      </tr>
    `).join('');

    container.innerHTML = `
      ${renderWarningPanel()}
      <h3 style="color:var(--garneta-cyan); margin-top:0;">ðŸ›’ Mode: Minimarket (Notepad Hasil â€” bisa diedit)</h3>
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
        <button class="btn soft" onclick="window.crudAddItem()">âž• Tambah Baris</button>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px; flex-wrap:wrap;">
        <button class="btn soft" onclick="window.snReanalyze()">ðŸ”„ Ulangi dengan mode lain</button>
        <button class="btn soft" onclick="document.getElementById('smart-notepad-modal').remove()">Batal</button>
        <button class="btn primary" onclick="window.exportSmartNotepadToBarang()">ðŸ’¾ Export ke Database Barang + Statistik Harga</button>
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
          <strong>Grade <input type="text" class="input crud-k-grade-name" data-g="${idx}" value="${esc(g.grade)}" style="width:70px;${g.flag === 'check' ? 'border-color:#f5a623 !important;' : ''}">${flagBadge(g)}</strong>
          <label>Harga/Kg: Rp <input type="number" class="input crud-k-price" data-g="${idx}" value="${g.pricePerKg}" style="width:110px;" min="0" step="any"></label>
          <button class="btn danger btn-sm" onclick="window.crudRemoveGrade(${idx})">ðŸ—‘ Hapus Grade</button>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          ${weightsHtml}
          <button class="btn soft btn-sm" onclick="window.crudAddWeight(${idx})">âž•</button>
        </div>
        <div class="muted" style="margin-top:12px; font-size:0.9rem;">
          Total Karung: <b>${g.weights.length}</b> | Total Berat: <b>${g.weights.reduce((a,b) => a + (Number(b)||0), 0)} KG</b> | Subtotal: <b>Rp ${((g.weights.reduce((a,b) => a + (Number(b)||0), 0)) * (Number(g.pricePerKg)||0)).toLocaleString('id-ID')}</b>
        </div>
      </div>`;
    }).join('');

    container.innerHTML = `
      ${renderWarningPanel()}
      <h3 style="color:var(--garneta-cyan); margin-top:0;">ðŸ¥” Mode: Komoditas / Kentang (Notepad Hasil â€” bisa diedit)</h3>
      <div style="display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap;">
         <label>Petani/Suplier: <input type="text" id="sn-k-supplier" class="input" value="${esc(c.supplier)}"></label>
         <label>Tanggal: <input type="date" id="sn-k-date" class="input" value="${c.date}"></label>
      </div>
      ${gradesHtml}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; flex-wrap:wrap; gap:8px;">
        <button class="btn soft" onclick="window.crudAddGrade()">âž• Tambah Grade</button>
        <h4 style="margin:0;">Total Keseluruhan Bayar: Rp <span id="sn-k-total">${Number(c.totalPrice).toLocaleString('id-ID')}</span></h4>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px; flex-wrap:wrap;">
        <button class="btn soft" onclick="window.snReanalyze()">ðŸ”„ Ulangi dengan mode lain</button>
        <button class="btn soft" onclick="document.getElementById('smart-notepad-modal').remove()">Batal</button>
        <button class="btn primary" onclick="window.exportSmartNotepadToKentang()">ðŸ’¾ Export ke Grosir Kentang</button>
      </div>
    `;
  }
}

// --- Re-analisa tanpa upload ulang (pakai foto & instruksi terakhir) ---
window.snReanalyze = function() {
  const dataUrl = window._snLastImageDataUrl;
  if (!dataUrl) {
    alert("Foto asli tidak tersedia. Silakan upload ulang.");
    return;
  }
  const step3 = document.getElementById('sn-step-3');
  if (step3) step3.classList.add('hidden');
  document.getElementById('sn-step-1b')?.classList.remove('hidden');
  // Bawa instruksi custom terakhir supaya tidak hilang
  const ta = document.getElementById('sn-user-instruction');
  if (ta) ta.value = window._snLastInstruction || '';
  window.snRefreshModeButtons();
};

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

// Show per-purchase detail (grades) â€” uses kentang_purchase_details
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
            <strong>Grade ${esc(r.grade)}</strong> â€” ${r.total_karung} karung, ${Number(r.total_kg)} kg<br>
            <span class="muted">Rp ${Number(r.price_per_kg).toLocaleString('id-ID')}/kg â†’ Subtotal Rp ${Number(r.subtotal).toLocaleString('id-ID')}</span><br>
            <span class="muted">Rincian: ${weightsText}</span>
          </div>`;
      }).join('');
    }
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px);';
    modal.innerHTML = `
      <div style="background:var(--bg);border:1px solid var(--line);border-radius:16px;max-width:600px;width:100%;padding:24px;position:relative;max-height:80vh;overflow-y:auto;">
        <button class="btn danger" onclick="this.closest('div[style]').remove()" style="position:absolute;top:12px;right:12px;">âœ•</button>
        <h3 style="margin-top:0;color:var(--garneta-cyan);">ðŸ“¦ Rincian Karung & Grade</h3>
        ${html}
      </div>`;
    document.body.appendChild(modal);
  } catch(e) {
    alert("Error: " + e.message);
  }
};

// [KLIEN PATCH] Notepad Pintar 2-Pass Verifier + Auto-Recovery
