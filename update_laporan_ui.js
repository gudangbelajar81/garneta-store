const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

const regex = /function laporan\(\)\s*\{[\s\S]*?return\s+`<section class="grid">[\s\S]*?<\/section>`;\s*\}/;

const newLaporanFunc = `function laporan() {
      // Return Initial HTML Framework
      const defaultStart = new Date();
      defaultStart.setDate(1); // 1st day of current month
      const startStr = defaultStart.toISOString().split('T')[0];
      const endStr = new Date().toISOString().split('T')[0];
      
      const tab = window.laporanKeuanganTab || 'sembako';
      
      // Auto-load data if not exists or if dates changed
      setTimeout(() => {
          if (!window.laporanDataLoading) {
             const inputStart = document.getElementById('laporan-start-date');
             const inputEnd = document.getElementById('laporan-end-date');
             if (inputStart && inputEnd) {
                 window.applyFilterLaporan(inputStart.value, inputEnd.value);
             } else {
                 window.applyFilterLaporan(startStr, endStr);
             }
          }
      }, 50);

      return \`<section class="grid">
        <div style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; grid-column: 1 / -1;">
          <button onclick="showPage('riwayat'); setTimeout(() => window.switchRiwayatTab('transaksi'), 50);" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">🕰️ Riwayat Transaksi</button>
          <button onclick="showPage('riwayat'); setTimeout(() => window.switchRiwayatTab('hutang'), 50);" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📒 Bon (Kasbon)</button>
          <button style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: var(--garneta-cyan); color: #000; transition: all 0.3s; white-space: nowrap;">📊 Laporan Harian</button>
          <button onclick="showPage('statistik')" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📈 Statistik Harga</button>
        </div>
        
        <div class="card" style="grid-column: 1 / -1; padding-bottom: 8px;">
           <h2 style="margin-top:0;">Filter Laporan Keuangan</h2>
           <div style="display:flex; gap:12px; align-items:flex-end;">
              <div class="form-group" style="margin:0;">
                 <label>Dari Tanggal</label>
                 <input type="date" id="laporan-start-date" class="input" value="\${window.laporanStartDate || startStr}">
              </div>
              <div class="form-group" style="margin:0;">
                 <label>Sampai Tanggal</label>
                 <input type="date" id="laporan-end-date" class="input" value="\${window.laporanEndDate || endStr}">
              </div>
              <button class="btn primary" onclick="window.applyFilterLaporan(document.getElementById('laporan-start-date').value, document.getElementById('laporan-end-date').value)">Terapkan</button>
           </div>
        </div>

        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, #1e293b, #0f172a); border-left: 4px solid #10b981;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Total Omset</h3>
              <h2 style="margin:0; color:#3b82f6; font-size:1.8rem;" id="summary-omset">Rp 0</h2>
            </div>
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Total Keuntungan Bersih</h3>
              <h2 style="margin:0; color:#10b981; font-size:1.8rem;" id="summary-profit">Rp 0</h2>
            </div>
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Saldo Cashflow Akhir</h3>
              <h2 style="margin:0; color:#f59e0b; font-size:1.8rem;" id="summary-cashflow">Rp 0</h2>
            </div>
          </div>
        </div>
        
        <div class="card" style="grid-column: 1 / -1; padding:0;">
           <div class="workspace-toolbar" style="background: rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:4px; padding:8px;">
             <button class="workspace-tab \${tab === 'sembako' ? 'active' : ''}" onclick="window.switchLaporanTab('sembako')" style="flex:1;">🛒 Toko Sembako</button>
             <button class="workspace-tab \${tab === 'ppob' ? 'active' : ''}" onclick="window.switchLaporanTab('ppob')" style="flex:1;">📱 Transaksi PPOB</button>
             <button class="workspace-tab \${tab === 'cashflow' ? 'active' : ''}" onclick="window.switchLaporanTab('cashflow')" style="flex:1;">💵 Buku Kas (Cashflow)</button>
           </div>
           <div style="padding: 16px;" id="laporan-content-area">
              <div style="text-align:center; padding: 40px; color:var(--garneta-text-muted);">
                 <i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><br><br>Memuat data laporan...
              </div>
           </div>
        </div>
      </section>\`;
    }`;

const globalFunctions = `
window.laporanDataRaw = { sales: [], ppob: [], cashflow: [], purchases: [], cashAdvances: [] };
window.laporanDataLoading = false;

window.applyFilterLaporan = async function(start, end) {
    if (!start || !end) return;
    window.laporanStartDate = start;
    window.laporanEndDate = end;
    window.laporanDataLoading = true;
    
    document.getElementById('summary-omset').innerText = 'Memuat...';
    document.getElementById('summary-profit').innerText = 'Memuat...';
    document.getElementById('summary-cashflow').innerText = 'Memuat...';
    document.getElementById('laporan-content-area').innerHTML = '<div style="text-align:center; padding: 40px; color:var(--garneta-text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><br><br>Mengambil data dari server...</div>';

    try {
        const data = await window.fetchLaporanKeuangan(start, end);
        window.laporanDataRaw = data;
        window.renderLaporanData();
    } catch (e) {
        document.getElementById('laporan-content-area').innerHTML = '<div style="color:var(--garneta-danger); text-align:center; padding:20px;">Gagal memuat data: ' + e.message + '</div>';
    } finally {
        window.laporanDataLoading = false;
    }
};

window.switchLaporanTab = function(tab) {
    window.laporanKeuanganTab = tab;
    if (state.route === 'laporan') {
        render(); // trigger full render to update active tab button
    }
};

window.renderLaporanData = function() {
    const d = window.laporanDataRaw;
    let omsetSembako = 0;
    let profitSembako = 0;
    
    // Calculate Sembako
    const sembakoMap = {};
    (d.sales || []).forEach(sale => {
        omsetSembako += Number(sale.amount || 0);
        profitSembako += Number(sale.profit || 0);
        
        const dateStr = sale.date.split('T')[0];
        if (!sembakoMap[dateStr]) sembakoMap[dateStr] = { date: dateStr, omset: 0, profit: 0, items: [] };
        sembakoMap[dateStr].omset += Number(sale.amount || 0);
        sembakoMap[dateStr].profit += Number(sale.profit || 0);
        
        let productName = "Produk Dihapus";
        let unitContent = 1;
        if (sale.productId) {
           const p = state.data.products.find(x => String(x.id) === String(sale.productId));
           if (p) { productName = p.name; unitContent = p.unitContent || 1; }
        }
        sembakoMap[dateStr].items.push({
           ...sale, productName, unitContent, cuan: Number(sale.profit || 0)
        });
    });
    const sembakoRows = Object.values(sembakoMap).sort((a,b) => b.date.localeCompare(a.date));

    // Calculate PPOB
    let omsetPPOB = 0;
    let profitPPOB = 0;
    (d.ppob || []).forEach(p => {
        if (p.status === 'Sukses') {
           omsetPPOB += Number(p.selling_price || 0);
           profitPPOB += Number(p.profit || 0);
        }
    });
    
    // Calculate Cashflow (Auto + Manual)
    // Auto IN: omsetSembako + omsetPPOB
    // Auto OUT: purchases (total) + cashAdvances (amount)
    let totalPurchases = (d.purchases || []).reduce((sum, p) => sum + Number(p.total || 0), 0);
    let totalAdvances = (d.cashAdvances || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    let manualIn = 0;
    let manualOut = 0;
    (d.cashflow || []).forEach(c => {
        if (c.type === 'IN') manualIn += Number(c.amount || 0);
        if (c.type === 'OUT') manualOut += Number(c.amount || 0);
    });
    
    const totalOmset = omsetSembako + omsetPPOB;
    const totalKeuntungan = profitSembako + profitPPOB;
    
    const totalIn = totalOmset + manualIn;
    const totalOut = totalPurchases + totalAdvances + manualOut;
    const saldoAkhir = totalIn - totalOut;

    // Update Summary
    if (document.getElementById('summary-omset')) {
        document.getElementById('summary-omset').innerText = rupiah(totalOmset);
        document.getElementById('summary-profit').innerText = rupiah(totalKeuntungan);
        document.getElementById('summary-cashflow').innerText = rupiah(saldoAkhir);
    }
    
    const tab = window.laporanKeuanganTab || 'sembako';
    let html = '';
    
    if (tab === 'sembako') {
        html = \`
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Laporan Penjualan Sembako</h3>
            <div style="text-align:right;">
                <span class="muted">Omset:</span> <strong style="color:var(--garneta-cyan);">\${rupiah(omsetSembako)}</strong> | 
                <span class="muted">Profit:</span> <strong style="color:var(--green);">\${rupiah(profitSembako)}</strong>
            </div>
        </div>
        <div class="table-wrap">
        <table class="expandable-table">
          <thead>
            <tr>
              <th style="width:50px"></th>
              <th>TANGGAL</th>
              <th style="text-align:right">OMSET</th>
              <th style="text-align:right">KEUNTUNGAN</th>
            </tr>
          </thead>
          <tbody>
            \${sembakoRows.map((row) => \`
              <tr class="expandable-row" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.arrow').classList.toggle('open');">
                <td style="text-align:center"><span class="arrow" style="display:inline-block; transition:transform 0.2s;">▼</span></td>
                <td style="font-weight:bold">\${row.date}</td>
                <td style="text-align:right; font-weight:bold; color:var(--garneta-cyan);">\${rupiah(row.omset)}</td>
                <td style="text-align:right; font-weight:bold; color:\${row.profit >= 0 ? '#10b981' : '#f43f5e'}">\${rupiah(row.profit)}</td>
              </tr>
              <tr class="details-row hidden" style="background:var(--bg); border-bottom:2px solid var(--border);">
                <td colspan="4" style="padding:1rem;">
                  <table style="width:100%; margin:0; background:var(--card); box-shadow:none; border:1px solid var(--border);">
                    <thead>
                      <tr>
                        <th style="font-size:0.8rem; padding:0.5rem">Jam</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Barang</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Unit</th>
                        <th style="font-size:0.8rem; padding:0.5rem; text-align:right">Omset</th>
                        \${isSuperAdmin() ? '<th style="font-size:0.8rem; padding:0.5rem; text-align:right">Cuan</th>' : ''}
                      </tr>
                    </thead>
                    <tbody>
                      \${row.items.map(item => \`
                        <tr>
                          <td style="font-size:0.9rem; padding:0.5rem">\${new Date(item.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">\${escapeAttr(item.productName)}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">\${item.unitSold}</td>
                          <td style="font-size:0.9rem; padding:0.5rem; text-align:right; color:var(--garneta-cyan);">\${rupiah(item.amount)}</td>
                          \${isSuperAdmin() ? \`<td style="font-size:0.9rem; padding:0.5rem; text-align:right; color:\${item.cuan >= 0 ? '#10b981' : '#f43f5e'}">\${rupiah(item.cuan)}</td>\` : ''}
                        </tr>
                      \`).join('')}
                    </tbody>
                  </table>
                </td>
              </tr>
            \`).join('')}
            \${sembakoRows.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;" class="muted">Tidak ada penjualan di rentang tanggal ini.</td></tr>' : ''}
          </tbody>
        </table>
        </div>\`;
    } else if (tab === 'ppob') {
        html = \`
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Laporan Penjualan PPOB (Sukses)</h3>
            <div style="text-align:right;">
                <span class="muted">Omset:</span> <strong style="color:var(--garneta-cyan);">\${rupiah(omsetPPOB)}</strong> | 
                <span class="muted">Profit:</span> <strong style="color:var(--green);">\${rupiah(profitPPOB)}</strong>
            </div>
        </div>
        <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>TANGGAL</th>
              <th>PRODUK</th>
              <th>NOMOR</th>
              <th style="text-align:right">OMSET</th>
              <th style="text-align:right">PROFIT</th>
            </tr>
          </thead>
          <tbody>
            \${(d.ppob || []).map(p => \`
              <tr>
                <td>\${new Date(p.created_at).toLocaleString('id-ID')}</td>
                <td>\${p.product_name}</td>
                <td>\${p.customer_no}</td>
                <td style="text-align:right; color:var(--garneta-cyan);">\${rupiah(p.selling_price)}</td>
                <td style="text-align:right; color:var(--green);">\${rupiah(p.profit)}</td>
              </tr>
            \`).join('')}
            \${(d.ppob || []).length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:20px;" class="muted">Tidak ada transaksi PPOB sukses.</td></tr>' : ''}
          </tbody>
        </table>
        </div>\`;
    } else if (tab === 'cashflow') {
        // Generate combined timeline
        const timeline = [];
        if (omsetSembako > 0) timeline.push({ date: window.laporanEndDate, type: 'IN', amount: omsetSembako, desc: 'Total Penjualan Sembako', isAuto: true });
        if (omsetPPOB > 0) timeline.push({ date: window.laporanEndDate, type: 'IN', amount: omsetPPOB, desc: 'Total Penjualan PPOB', isAuto: true });
        if (totalPurchases > 0) timeline.push({ date: window.laporanEndDate, type: 'OUT', amount: totalPurchases, desc: 'Total Pembelian/Kulakan', isAuto: true });
        if (totalAdvances > 0) timeline.push({ date: window.laporanEndDate, type: 'OUT', amount: totalAdvances, desc: 'Total Kasbon Karyawan', isAuto: true });
        
        (d.cashflow || []).forEach(c => {
           timeline.push({ date: c.date, type: c.type, amount: c.amount, desc: c.description, isAuto: false, id: c.id });
        });
        
        timeline.sort((a,b) => new Date(b.date) - new Date(a.date));

        html = \`
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Buku Kas (Arus Kas)</h3>
            <button class="btn primary" onclick="window.openManualCashflowModal()">+ Catat Kas Manual</button>
        </div>
        <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>TANGGAL</th>
              <th>KETERANGAN</th>
              <th>JENIS</th>
              <th style="text-align:right">UANG MASUK</th>
              <th style="text-align:right">UANG KELUAR</th>
            </tr>
          </thead>
          <tbody>
            \${timeline.map(t => \`
              <tr style="\${t.isAuto ? 'background:rgba(255,255,255,0.02);' : ''}">
                <td>\${t.date.split('T')[0]} \${t.isAuto ? '<span class="badge" style="font-size:10px;">Auto</span>' : ''}</td>
                <td>\${t.desc} \${!t.isAuto ? \` <button onclick="window.deleteManualCashflow(\${t.id})" style="background:none; border:none; color:var(--garneta-danger); cursor:pointer;"><i class="fas fa-trash"></i></button>\` : ''}</td>
                <td><span style="color:\${t.type==='IN'?'var(--green)':'var(--garneta-danger)'}; font-weight:bold;">\${t.type==='IN'?'MASUK':'KELUAR'}</span></td>
                <td style="text-align:right; color:var(--green);">\${t.type==='IN' ? rupiah(t.amount) : '-'}</td>
                <td style="text-align:right; color:var(--garneta-danger);">\${t.type==='OUT' ? rupiah(t.amount) : '-'}</td>
              </tr>
            \`).join('')}
            \${timeline.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:20px;" class="muted">Tidak ada arus kas.</td></tr>' : ''}
          </tbody>
          <tfoot>
            <tr style="background:var(--card); font-weight:bold;">
               <td colspan="3" style="text-align:right;">TOTAL:</td>
               <td style="text-align:right; color:var(--green);">\${rupiah(totalIn)}</td>
               <td style="text-align:right; color:var(--garneta-danger);">\${rupiah(totalOut)}</td>
            </tr>
            <tr style="background:var(--card); font-weight:bold; font-size:1.1rem;">
               <td colspan="3" style="text-align:right;">SALDO AKHIR:</td>
               <td colspan="2" style="text-align:right; color:var(--garneta-cyan);">\${rupiah(saldoAkhir)}</td>
            </tr>
          </tfoot>
        </table>
        </div>\`;
    }
    
    if (document.getElementById('laporan-content-area')) {
        document.getElementById('laporan-content-area').innerHTML = html;
    }
};

window.openManualCashflowModal = function() {
    // Create modal dynamically if not exists
    let modal = document.getElementById('manual-cashflow-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manual-cashflow-modal';
        modal.className = 'modal';
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;";
        modal.innerHTML = \`
        <div class="modal-content card" style="width: 90%; max-width: 400px; padding: 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); background: #0c121e; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
          <h2 style="margin-top:0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">Catat Kas Manual</h2>
          <form onsubmit="window.submitManualCashflow(event)">
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Jenis Transaksi</label>
              <select id="cf-type" class="form-control" required>
                 <option value="OUT">Pengeluaran (Keluar)</option>
                 <option value="IN">Pemasukan (Masuk)</option>
              </select>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Tanggal</label>
              <input type="date" id="cf-date" class="form-control" value="\${new Date().toISOString().split('T')[0]}" required>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Nominal (Rp)</label>
              <input type="text" id="cf-amount" class="form-control" placeholder="Contoh: 50000" oninput="window.formatRupiahInput(this)" style="font-size: 1.1rem; font-weight: bold; color: var(--garneta-cyan);" required>
            </div>
            
            <div class="form-group" style="margin-bottom: 24px;">
              <label>Keterangan / Keperluan</label>
              <input type="text" id="cf-desc" class="form-control" placeholder="Isi alasan di sini..." required>
            </div>
            
            <div style="display:flex; gap: 12px; justify-content: flex-end;">
              <button type="button" class="btn soft" onclick="document.getElementById('manual-cashflow-modal').classList.add('hidden')" style="flex:1;">Batal</button>
              <button type="submit" class="btn primary" style="flex:1; background: linear-gradient(135deg, var(--garneta-cyan), #0099ff); color:#000;">Simpan</button>
            </div>
          </form>
        </div>\`;
        document.body.appendChild(modal);
    }
    document.getElementById('cf-type').value = 'OUT';
    document.getElementById('cf-amount').value = '';
    document.getElementById('cf-desc').value = '';
    modal.classList.remove('hidden');
};

window.submitManualCashflow = async function(e) {
    e.preventDefault();
    const type = document.getElementById('cf-type').value;
    const date = document.getElementById('cf-date').value;
    const desc = document.getElementById('cf-desc').value;
    const amountStr = document.getElementById('cf-amount').value;
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
    
    if (amount <= 0) {
        alert('Nominal harus lebih besar dari 0!');
        return;
    }
    
    try {
        await window.gas("add", { collection: "cashflowLogs", item: { type, date, description: desc, amount } });
        document.getElementById('manual-cashflow-modal').classList.add('hidden');
        showToast("Catatan kas berhasil disimpan!", "success");
        // Reload data
        window.applyFilterLaporan(window.laporanStartDate, window.laporanEndDate);
    } catch (err) {
        alert("Gagal menyimpan: " + err.message);
    }
};

window.deleteManualCashflow = async function(id) {
    if (!confirm("Yakin ingin menghapus catatan kas ini?")) return;
    try {
        await window.gas("remove", { collection: "cashflowLogs", id });
        showToast("Catatan kas berhasil dihapus!", "success");
        window.applyFilterLaporan(window.laporanStartDate, window.laporanEndDate);
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
};
`;

if (regex.test(mainJs)) {
    mainJs = mainJs.replace(regex, newLaporanFunc);
    mainJs += '\n' + globalFunctions;
    fs.writeFileSync('assets/js/main.js', mainJs);
    console.log("Updated main.js with new Laporan logic");
} else {
    console.log("Regex not found in main.js");
}
