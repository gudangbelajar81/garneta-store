const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

const ppobLogic = `
  // --- PPOB SHOPEE LOGIC ---
  let ppobProducts = [];
  let ppobActiveTab = 'Pulsa';
  let ppobBrand = '';
  let ppobSelectedSku = '';
  let ppobIsProcessing = false;
  let ppobView = 'main';

  // === Recent Numbers (Phonebook) ===
  function getPpobRecent() {
    try { return JSON.parse(localStorage.getItem('ppob_contacts') || '[]'); } catch(e) { return []; }
  }
  function savePpobRecent(no, name) {
    let r = getPpobRecent();
    r = r.filter(x => x.no !== no);
    r.unshift({ no: no, name: name || '' });
    if (r.length > 10) r = r.slice(0, 10);
    localStorage.setItem('ppob_contacts', JSON.stringify(r));
  }

  // === Load Products ===
  async function loadPpobProducts() {
    const grid = document.getElementById('ppob-grid');
    if (grid) {
      grid.innerHTML = Array(6).fill(0).map(() => \`
        <div style="border:1px solid #eee; border-radius:16px; padding:20px; background:#f9f9f9; animation:ppobPulse 1.5s ease-in-out infinite;">
          <div style="height:10px; background:#e5e5e5; border-radius:4px; margin-bottom:10px; width:50%;"></div>
          <div style="height:18px; background:#e0e0e0; border-radius:4px; margin-bottom:8px;"></div>
          <div style="height:14px; background:#e8e8e8; border-radius:4px; width:60%; margin:0 auto;"></div>
        </div>
      \`).join('');
    }
    try {
      const data = await gas('list', { collection: 'ppob_products' });
      if (data) ppobProducts = data;
    } catch(e) {
      showToast("Gagal memuat katalog PPOB", "error");
    }
    renderPpobGrid();
    renderBrandFilters();
  }

  // === Tab Switch ===
  window.switchPpobTab = function(tab, event) {
    ppobActiveTab = tab;
    ppobBrand = tab === 'PLN' ? 'PLN' : '';
    ppobSelectedSku = '';
    document.querySelectorAll('.ppob-tab').forEach(el => {
      el.style.borderBottom = 'none'; el.style.color = '#666'; el.style.fontWeight = 'normal';
    });
    if (event && event.currentTarget) {
      event.currentTarget.style.borderBottom = '3px solid #E3222B';
      event.currentTarget.style.color = '#E3222B';
      event.currentTarget.style.fontWeight = 'bold';
    }
    const inp = document.getElementById('ppob-customer-no');
    if (inp) inp.value = '';
    const bi = document.getElementById('ppob-brand-info');
    if (bi) bi.innerHTML = '';
    updatePpobFooter();
    renderBrandFilters();
    renderRecentNumbers('');
    renderPpobGrid();
  };

  // === Brand Filter ===
  window.renderBrandFilters = function() {
    const c = document.getElementById('ppob-brand-filters');
    if (!c) return;
    if (!['Pulsa','Data'].includes(ppobActiveTab)) { c.innerHTML = ''; return; }
    const catMap = { 'Pulsa': ['Pulsa','Masa Aktif','Aktivasi Perdana','Aktivasi Voucher'], 'Data': ['Data','Paket SMS & Telpon'] };
    const cats = catMap[ppobActiveTab] || [];
    const brands = [...new Set(ppobProducts.filter(p => cats.some(cat => p.category.toLowerCase() === cat.toLowerCase())).map(p => p.brand))].sort();
    c.innerHTML = brands.map(b => {
      const active = ppobBrand === b;
      return \`<button onclick="setPpobBrand('\${b}')" style="padding:6px 14px; border-radius:20px; font-size:13px; cursor:pointer; margin:0 6px 8px 0; border:1px solid \${active?'#E3222B':'#ddd'}; background:\${active?'#FDE9EA':'#fff'}; color:\${active?'#E3222B':'#555'}; font-weight:\${active?'bold':'normal'}; transition:all 0.15s;">\${b}</button>\`;
    }).join('');
  };

  window.setPpobBrand = function(b) {
    ppobBrand = ppobBrand === b ? '' : b;
    ppobSelectedSku = '';
    updatePpobFooter();
    renderBrandFilters();
    renderPpobGrid();
  };

  // === Detect Brand from Number ===
  window.detectPpobBrand = function() {
    if (ppobActiveTab === 'PLN') return;
    const inp = document.getElementById('ppob-customer-no');
    if (!inp) return;
    inp.value = inp.value.replace(/[^0-9]/g, '');
    const no = inp.value;
    const errEl = document.getElementById('ppob-input-error');
    if (errEl) errEl.textContent = no.length > 0 && no.length < 4 ? 'Nomor terlalu pendek' : '';
    renderRecentNumbers(no);
    if (no.length < 4) {
      ppobBrand = '';
      const bi = document.getElementById('ppob-brand-info');
      if (bi) bi.innerHTML = '';
      if (no.length === 0) { ppobSelectedSku = ''; updatePpobFooter(); renderPpobGrid(); }
      return;
    }
    const prefix = no.substring(0, 4);
    let detected = '';
    if (['0812','0813','0821','0822','0823','0852','0853','0851'].includes(prefix)) detected = 'TELKOMSEL';
    else if (['0814','0815','0816','0855','0856','0857','0858'].includes(prefix)) detected = 'INDOSAT';
    else if (['0817','0818','0819','0859','0877','0878'].includes(prefix)) detected = 'XL';
    else if (['0831','0832','0833','0838'].includes(prefix)) detected = 'AXIS';
    else if (['0881','0882','0883','0884','0885','0886','0887','0888','0889'].includes(prefix)) detected = 'SMARTFREN';
    else if (['0895','0896','0897','0898','0899'].includes(prefix)) detected = 'TRI';
    if (detected !== ppobBrand) {
      ppobBrand = detected;
      ppobSelectedSku = '';
      updatePpobFooter();
      const icons = { TELKOMSEL:'🔴', INDOSAT:'🟡', XL:'🔵', AXIS:'🟣', SMARTFREN:'🟢', TRI:'⚫' };
      const bi = document.getElementById('ppob-brand-info');
      if (bi) bi.innerHTML = detected ? \`<span style="background:#FDE9EA; color:#E3222B; padding:3px 12px; border-radius:20px; font-size:13px;">\${icons[detected]||'📱'} \${detected} Terdeteksi</span>\` : '';
      renderBrandFilters();
      renderPpobGrid();
    }
  };

  // === Recent Numbers (Phonebook UI) ===
  window.renderRecentNumbers = function(currentVal) {
    const c = document.getElementById('ppob-recent-numbers');
    if (!c) return;
    const recent = getPpobRecent();
    if (recent.length === 0 || currentVal.length > 0) { c.innerHTML = ''; return; }
    c.innerHTML = \`
      <div style="font-size:12px; color:#aaa; margin-bottom:8px; display:flex; justify-content:space-between;">
        <span>📌 Pelanggan Tersimpan</span>
        <span onclick="alert('Fitur Buku Telepon Lengkap segera hadir!')" style="color:#E3222B;cursor:pointer;font-weight:600;">Lihat Semua</span>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        \${recent.map(x => \`<button onclick="fillPpobNumber('\${x.no}')" style="padding:6px 14px; border:1px solid #eee; border-radius:20px; background:#fafafa; font-size:13px; cursor:pointer; color:#444; transition:all 0.15s; text-align:left;" onmouseover="this.style.borderColor='#E3222B';this.style.color='#E3222B';" onmouseout="this.style.borderColor='#eee';this.style.color='#444';">
          <div style="font-weight:\${x.name ? 'bold' : 'normal'}">\${x.name || x.no}</div>
          \${x.name ? \`<div style="font-size:10px; color:#888;">\${x.no}</div>\` : ''}
        </button>\`).join('')}
      </div>
    \`;
  };

  window.fillPpobNumber = function(no) {
    const inp = document.getElementById('ppob-customer-no');
    if (inp) { inp.value = no; detectPpobBrand(); }
  };

  // === Render Grid ===
  window.renderPpobGrid = function() {
    const grid = document.getElementById('ppob-grid');
    if (!grid) return;
    if (ppobProducts.length === 0) {
      grid.innerHTML = \`<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#bbb;"><div style="font-size:52px; margin-bottom:12px;">📱</div><div style="font-size:15px;">Ketik nomor tujuan untuk melihat produk</div><div style="font-size:12px; margin-top:6px;">atau klik "Update Katalog" jika baru pertama kali</div></div>\`;
      return;
    }
    const catMap = {
      'Pulsa': ['Pulsa','Masa Aktif','Aktivasi Perdana','Aktivasi Voucher'],
      'Data': ['Data','Paket SMS & Telpon'],
      'PLN': ['PLN','Gas'],
      'Game': ['Games','Voucher','TV'],
      'E-Money': ['E-Money'],
    };
    const cats = catMap[ppobActiveTab] || ['Pulsa'];
    const filtered = ppobProducts.filter(p => {
      if (ppobBrand && p.brand.toUpperCase() !== ppobBrand.toUpperCase()) return false;
      return cats.some(cat => p.category.toLowerCase() === cat.toLowerCase());
    }).sort((a,b) => Number(a.sale_price) - Number(b.sale_price));

    if (filtered.length === 0) {
      if (!ppobBrand && ppobActiveTab !== 'PLN') {
        grid.innerHTML = \`<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#bbb;"><div style="font-size:52px; margin-bottom:12px;">📱</div><div style="font-size:15px;">Ketik nomor tujuan atau pilih provider di atas</div></div>\`;
      } else {
        grid.innerHTML = \`<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#bbb;"><div style="font-size:52px; margin-bottom:12px;">🔍</div><div style="font-size:15px;">Tidak ada produk untuk provider ini</div></div>\`;
      }
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const gangguan = p.buyer_product_status === 'gangguan';
      const selected = p.buyer_sku_code === ppobSelectedSku;
      return \`
        <div class="ppob-card" id="card-\${p.buyer_sku_code}"
          onclick="\${gangguan ? '' : \`selectPpobProduct('\${p.buyer_sku_code}')\`}"
          title="\${gangguan ? 'Produk sedang gangguan, tidak bisa dipesan' : ''}"
          style="border:\${selected ? '2px solid #E3222B' : '1px solid #eee'}; border-radius:16px; padding:18px 14px; text-align:center; position:relative; transition:all 0.15s; background:\${gangguan ? '#fafafa' : selected ? '#fff8f7' : '#fff'}; cursor:\${gangguan ? 'not-allowed' : 'pointer'}; opacity:\${gangguan ? '0.55' : '1'}; box-shadow:\${selected ? '0 0 0 3px rgba(245,61,45,0.1)' : '0 1px 4px rgba(0,0,0,0.04)'};pointer-events:\${gangguan ? 'none' : 'auto'};">
          <div style="font-size:11px; color:#bbb; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">\${p.brand}</div>
          <div style="font-size:15px; font-weight:bold; margin-bottom:10px; color:\${gangguan ? '#bbb' : '#222'}; line-height:1.4;">\${p.product_name}</div>
          <div style="color:\${gangguan ? '#ccc' : '#E3222B'}; font-weight:bold; font-size:18px;">\${rupiah(Math.round(Number(p.sale_price)))}</div>
          \${gangguan ? '<div style="position:absolute;top:6px;right:6px;background:#ff9800;color:#fff;padding:2px 7px;font-size:10px;border-radius:20px;font-weight:bold;">GANGGUAN</div>' : ''}
          \${selected ? '<div style="position:absolute;top:6px;left:6px;font-size:14px;">✅</div>' : ''}
        </div>
      \`;
    }).join('');
  };

  // === Select Product ===
  window.selectPpobProduct = function(sku) {
    const p = ppobProducts.find(x => x.buyer_sku_code === sku);
    if (!p || p.buyer_product_status === 'gangguan') return;
    ppobSelectedSku = ppobSelectedSku === sku ? '' : sku;
    updatePpobFooter();
    renderPpobGrid();
  };

  // === Footer ===
  window.updatePpobFooter = function() {
    const footer = document.getElementById('ppob-footer');
    if (!footer) return;
    if (!ppobSelectedSku) { footer.style.display = 'none'; return; }
    const p = ppobProducts.find(x => x.buyer_sku_code === ppobSelectedSku);
    if (p) {
      footer.style.display = 'flex';
      document.getElementById('ppob-total-text').innerHTML = 'Total: <b style="color:#E3222B; font-size:20px;">' + rupiah(Math.round(Number(p.sale_price))) + '</b>';
    }
  };

  // === Custom Confirm Modal (Transparansi Biaya) ===
  window.showPpobConfirm = function(product, custNo, onConfirm) {
    const old = document.getElementById('ppob-confirm-modal');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'ppob-confirm-modal';
    
    // Hitung estimasi biaya admin
    const total = Math.round(Number(product.sale_price));
    const adminFee = product.category === 'PLN' ? 2000 : 0;
    const basePrice = total - adminFee;

    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    el.innerHTML = \`
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);animation:ppobModalIn 0.2s ease;">
        <div style="text-align:center;margin-bottom:20px;"><div style="font-size:44px;margin-bottom:6px;">🧾</div><h3 style="margin:0;font-size:18px;color:#222;">Konfirmasi Pembayaran</h3></div>
        
        <div style="background:#fafafa;border-radius:16px;padding:16px;margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:#888;">Produk</span><span style="font-weight:600;text-align:right;max-width:180px;">\${product.product_name}</span></div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:#888;">Nomor Tujuan</span><span style="font-weight:600;">\${custNo}</span></div>
          
          <div style="border-top:1px dashed #ddd; margin:10px 0; padding-top:10px;"></div>
          
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#888;">Harga Dasar</span><span>\${rupiah(basePrice)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#888;">Biaya Transaksi</span><span>\${adminFee === 0 ? 'Gratis' : rupiah(adminFee)}</span></div>
          
          <div style="display:flex;justify-content:space-between;padding-top:12px;margin-top:8px;border-top:1px solid #eee;font-size:14px;"><span style="color:#444;font-weight:600;">Total Bayar</span><span style="font-weight:bold;font-size:20px;color:#E3222B;">\${rupiah(total)}</span></div>
        </div>
        
        <p style="color:#aaa;font-size:12px;text-align:center;margin-bottom:16px;">Pastikan uang sudah diterima dari pelanggan sebelum melanjutkan.</p>
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('ppob-confirm-modal').remove();ppobIsProcessing=false;" style="flex:1;padding:13px;border:1px solid #ddd;border-radius:16px;background:#fff;color:#555;font-size:15px;cursor:pointer;font-weight:600;">Batal</button>
          <button onclick="document.getElementById('ppob-confirm-modal').remove();window._ppobCb();" style="flex:2;padding:13px;border:none;border-radius:16px;background:#E3222B;color:#fff;font-size:15px;cursor:pointer;font-weight:bold;">✅ Proses Sekarang</button>
        </div>
      </div>
    \`;
    document.body.appendChild(el);
    window._ppobCb = onConfirm;
  };

  // === Checkout ===
  window.processPpobCheckout = async function() {
    if (ppobIsProcessing) { showToast("Transaksi sedang diproses...", "error"); return; }
    if (!ppobSelectedSku) return;
    const p = ppobProducts.find(x => x.buyer_sku_code === ppobSelectedSku);
    if (!p) return;
    const custNo = (document.getElementById('ppob-customer-no').value || '').trim();
    if (!custNo) { showToast("Mohon isi nomor tujuan!", "error"); return; }
    if (!/^[0-9]+$/.test(custNo)) { showToast("Nomor tujuan hanya boleh angka!", "error"); return; }
    ppobIsProcessing = true;

    showPpobConfirm(p, custNo, async function() {
      const btn = document.getElementById('btn-ppob-checkout');
      if (btn) { btn.innerHTML = "⏳ Memproses..."; btn.disabled = true; }
      try {
        const res = await gas('ppob_topup', { buyer_sku_code: p.buyer_sku_code, customer_no: custNo });
        savePpobRecent(custNo);
        showToast("✅ Transaksi Berhasil!", "success");

        const total = Math.round(Number(p.sale_price));
        const sn = res.data?.sn || '-';
        const status = res.data?.status || 'Sukses';
        const isPln = p.category === 'PLN';

        // Success modal (with WA Share and Save Contact)
        const sm = document.createElement('div');
        sm.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
        
        const receiptText = encodeURIComponent(\`*STRUK PEMBAYARAN PPOB*\\n\\nProduk: \${p.product_name}\\nNomor: \${custNo}\\nStatus: \${status}\\n\${sn !== '-' ? 'SN/Token: ' + sn + '\\n' : ''}\\n*Total: \${rupiah(total)}*\\n\\nTerima kasih telah berbelanja di Garneta Store!\`);
        const waLink = \`https://wa.me/?text=\${receiptText}\`;

        sm.innerHTML = \`
          <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);animation:ppobModalIn 0.2s ease;">
            <div style="text-align:center;margin-bottom:18px;"><div style="font-size:52px;">✅</div><h3 style="margin:6px 0;color:#22c55e;font-size:18px;">Transaksi Berhasil!</h3></div>
            
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:14px;margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#666;">Produk</span><span style="font-weight:600;">\${p.product_name}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#666;">Nomor</span><span style="font-weight:600;">\${custNo}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#666;">Status</span><span style="font-weight:600;color:#16a34a;">\${status}</span></div>
              \${isPln && sn !== '-' ? \`<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #bbf7d0;"><div style="color:#666;font-size:11px;margin-bottom:6px;">Token PLN:</div><div style="display:flex;align-items:center;gap:8px;"><div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:18px;font-weight:bold;letter-spacing:3px;flex:1;text-align:center;">\${sn}</div><button onclick="navigator.clipboard.writeText('\${sn}').then(()=>showToast('Token disalin!','success'))" style="padding:10px 14px;background:#E3222B;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">📋 Salin</button></div></div>\` : ''}
            </div>

            <div style="background:#fafafa; border-radius:10px; padding:12px; margin-bottom:16px; display:flex; gap:8px; align-items:center;">
              <div style="font-size:24px;">📖</div>
              <div style="flex:1;">
                <div style="font-size:12px;color:#666;margin-bottom:4px;">Simpan nomor ini ke buku pelanggan?</div>
                <div style="display:flex; gap:6px;">
                  <input type="text" id="ppob-save-name" placeholder="Nama Pelanggan..." style="flex:1; padding:8px 12px; border:1px solid #ddd; border-radius:6px; font-size:13px; outline:none;" autocomplete="off">
                  <button onclick="const nm=document.getElementById('ppob-save-name').value; if(nm){ savePpobRecent('\${custNo}', nm); showToast('Kontak disimpan!','success'); this.disabled=true; this.innerText='Tersimpan'; }" style="padding:8px 12px; background:#444; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">Simpan</button>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:10px;">
              <button onclick="this.closest('div[style*=fixed]').remove();" style="flex:1;padding:12px;border:1px solid #ddd;border-radius:16px;background:#fff;color:#555;font-size:14px;cursor:pointer;font-weight:600;">Tutup</button>
              <button onclick="window.open('\${waLink}', '_blank');" style="flex:1;padding:12px;background:#25D366;color:#fff;border:none;border-radius:16px;font-size:14px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">💬 Kirim WA</button>
              <button onclick="printPpobReceipt('\${p.product_name.replace(/'/g,'\\\\u0027')}','\${custNo}','\${sn}','\${status}',\${total});this.closest('div[style*=fixed]').remove();" style="flex:1;padding:12px;background:#333;color:#fff;border:none;border-radius:16px;font-size:14px;cursor:pointer;font-weight:600;" title="Print ke PDF / Printer Biasa">🖨️ PDF</button>
              <button onclick="printPpobReceiptBluetooth('\${p.product_name.replace(/'/g,'\\\\u0027')}','\${custNo}','\${sn}','\${status}',\${total});" style="flex:1;padding:12px;background:#0ea5e9;color:#fff;border:none;border-radius:16px;font-size:14px;cursor:pointer;font-weight:600;" title="Print ke Printer Bluetooth Thermal">🖨️ Thermal</button>
            </div>
          </div>
        \`;
        document.body.appendChild(sm);

        // Reset
        document.getElementById('ppob-customer-no').value = '';
        ppobSelectedSku = '';
        ppobBrand = ppobActiveTab === 'PLN' ? 'PLN' : '';
        renderRecentNumbers('');
        updatePpobFooter();
        renderBrandFilters();
        renderPpobGrid();
      } catch(err) {
        showToast("❌ " + (err.message || 'Transaksi gagal'), "error");
      } finally {
        ppobIsProcessing = false;
        if (btn) { btn.innerHTML = "💳 Bayar Sekarang"; btn.disabled = false; }
      }
    });
  };

  // === Print Receipt ===
  window.printPpobReceipt = function(productName, custNo, sn, status, total) {
    const dateStr = new Date().toLocaleString('id-ID');
    const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
    const html = \`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Struk PPOB</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;width:280px;padding:16px;font-size:12px;color:#000;}.center{text-align:center;}.divider{border:none;border-top:1px dashed #000;margin:8px 0;}.row{display:flex;justify-content:space-between;margin:3px 0;}.big{font-size:17px;font-weight:bold;}.sn{font-size:15px;font-weight:bold;letter-spacing:3px;word-break:break-all;text-align:center;}</style></head><body>
      <div class="center big">GARNETA STORE</div><div class="center" style="margin-bottom:4px;">Struk Pembayaran PPOB</div>
      <div class="divider"></div>
      <div>\${dateStr}</div>
      <div class="divider"></div>
      <div class="row"><span>Produk</span><span style="max-width:160px;text-align:right;">\${productName}</span></div>
      <div class="row"><span>Nomor</span><span>\${custNo}</span></div>
      <div class="row"><span>Status</span><span>\${status}</span></div>
      \${sn && sn !== '-' ? \`<div class="divider"></div><div class="center" style="font-size:10px;margin-bottom:4px;">Token / SN</div><div class="sn">\${sn}</div>\` : ''}
      <div class="divider"></div>
      <div class="row big"><span>TOTAL</span><span>\${fmt(total)}</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top:8px;font-size:11px;">Terima Kasih!</div>
      <script>setTimeout(()=>{window.print();setTimeout(()=>{window.close();},1500);},400);<\/script>
    </body></html>\`;
    const w = window.open('', '_blank', 'width=320,height=600');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // === Bluetooth Thermal Print ===
  window.printPpobReceiptBluetooth = async function(productName, custNo, sn, status, total) {
    if (!navigator.bluetooth) {
      showToast("Web Bluetooth tidak didukung di browser ini. Gunakan Chrome di Android/PC.", "error");
      return;
    }
    const KNOWN_PRINTER_UUIDS = [
      { svc: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' },
      { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', char: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
      { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
      { svc: '0000fee7-0000-1000-8000-00805f9b34fb', char: '0000fec8-0000-1000-8000-00805f9b34fb' },
      { svc: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' },
      { svc: '0000ffe0-0000-1000-8000-00805f9b34fb', char: '0000ffe1-0000-1000-8000-00805f9b34fb' },
      { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', char: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
      { svc: '0000af30-0000-1000-8000-00805f9b34fb', char: '0000af31-0000-1000-8000-00805f9b34fb' },
      { svc: '0000ae30-0000-1000-8000-00805f9b34fb', char: '0000ae31-0000-1000-8000-00805f9b34fb' },
      { svc: '0000fff0-0000-1000-8000-00805f9b34fb', char: '0000fff2-0000-1000-8000-00805f9b34fb' }
    ];
    let device;
    try {
      showToast("Meminta akses printer Bluetooth...", "info");
      device = window.globalBluetoothDevice || await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
      });
      window.globalBluetoothDevice = device;
      
      const server = await device.gatt.connect();
      let service, characteristic;
      for (const pair of KNOWN_PRINTER_UUIDS) {
        try {
          service = await server.getPrimaryService(pair.svc);
          characteristic = await service.getCharacteristic(pair.char);
          if (characteristic) break;
        } catch (e) {}
      }
      if (!characteristic) throw new Error("Service Print tidak ditemukan.");
      
      let encoder = new TextEncoder();
      let receiptLines = [];
      const paperSize = parseInt(localStorage.getItem('printerPaperSize') || '32');
      const padLR = (l, r) => {
        if (l.length + r.length >= paperSize) return l.substring(0, paperSize - r.length - 1) + " " + r;
        return l + " ".repeat(paperSize - l.length - r.length) + r;
      };
      const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
      
      receiptLines.push([0x1b, 0x61, 0x01]); // Align Center
      receiptLines.push([0x1d, 0x21, 0x11]); // Double Size
      receiptLines.push(...encoder.encode("GARNETA STORE\\n"));
      receiptLines.push([0x1d, 0x21, 0x00]); // Normal Size
      receiptLines.push(...encoder.encode("Struk Pembayaran PPOB\\n"));
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\\n"));
      receiptLines.push(...encoder.encode(new Date().toLocaleString('id-ID') + "\\n"));
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\\n"));
      
      receiptLines.push([0x1b, 0x61, 0x00]); // Align Left
      receiptLines.push(...encoder.encode(productName.substring(0, paperSize) + "\\n"));
      receiptLines.push(...encoder.encode(padLR("Nomor", custNo) + "\\n"));
      receiptLines.push(...encoder.encode(padLR("Status", status) + "\\n"));
      
      if (sn && sn !== '-') {
        receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\\n"));
        receiptLines.push([0x1b, 0x61, 0x01]); // Center
        receiptLines.push(...encoder.encode("Token / SN\\n"));
        receiptLines.push([0x1d, 0x21, 0x11]); // Double Size
        receiptLines.push(...encoder.encode(sn + "\\n"));
        receiptLines.push([0x1d, 0x21, 0x00]); // Normal Size
        receiptLines.push([0x1b, 0x61, 0x00]); // Left
      }
      
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\\n"));
      receiptLines.push(...encoder.encode(padLR("TOTAL", fmt(total)) + "\\n"));
      receiptLines.push([0x1b, 0x61, 0x01]); // Align Center
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\\n"));
      receiptLines.push(...encoder.encode("Terima Kasih!\\n\\n\\n\\n")); // Feed paper
      
      const dataFlat = receiptLines.flat(Infinity);
      const chunkSize = 512;
      for (let i = 0; i < dataFlat.length; i += chunkSize) {
        await characteristic.writeValue(new Uint8Array(dataFlat.slice(i, i + chunkSize)));
      }
      
      device.gatt.disconnect();
      showToast("✅ Berhasil mencetak struk PPOB!", "success");
    } catch (err) {
      showToast("❌ Gagal print Bluetooth: " + err.message, "error");
    }
  };

  // === Sync ===
  window.syncPpobProducts = async function() {
    const btn = document.querySelector('button[onclick^="syncPpobProducts"]');
    if (!btn) return;
    const old = btn.innerHTML;
    btn.innerHTML = "⏳ Sinkronisasi..."; btn.disabled = true;
    try {
      const res = await gas('ppob_sync', { cmd: 'all' });
      showToast("✅ " + res.message, "success");
      await loadPpobProducts();
    } catch(err) {
      showToast("❌ " + err.message, "error");
    } finally {
      btn.innerHTML = old; btn.disabled = false;
    }
  };

  // === History ===
  window.showPpobHistory = async function() {
    if (ppobView !== 'history') {
      ppobView = 'history';
      render();
      return;
    }
    setTimeout(async () => {
      const area = document.getElementById('ppob-history-area');
      if (!area) return;
      area.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">⏳ Memuat riwayat...</div>';
      try {
        const rows = await gas('ppob_history', {});
        if (!rows || rows.length === 0) {
          area.innerHTML = '<div style="padding:60px;text-align:center;color:#bbb;"><div style="font-size:48px;margin-bottom:12px;">📋</div><div>Belum ada riwayat transaksi</div></div>';
          return;
        }
        area.innerHTML = \`<div style="overflow-x:auto;padding:16px;"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:600px;">
          <thead><tr style="background:#fafafa;border-bottom:2px solid #eee;">
            <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;">Waktu</th>
            <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;">Produk</th>
            <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;">Nomor</th>
            <th style="padding:10px 12px;text-align:right;color:#888;font-weight:600;">Total</th>
            <th style="padding:10px 12px;text-align:center;color:#888;font-weight:600;">Status</th>
            <th style="padding:10px 12px;text-align:center;color:#888;font-weight:600;">SN/Token</th>
          </tr></thead>
          <tbody>
          \${rows.map(r => {
            const statusColor = r.status === 'Sukses' ? '#16a34a' : r.status === 'Pending' ? '#ca8a04' : '#dc2626';
            const statusBg = r.status === 'Sukses' ? '#dcfce7' : r.status === 'Pending' ? '#fef9c3' : '#fee2e2';
            return \`<tr style="border-bottom:1px solid #f5f5f5;">
              <td style="padding:10px 12px;color:#888;font-size:11px;">\${r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : '-'}</td>
              <td style="padding:10px 12px;font-weight:500;">\${r.product_name||'-'}</td>
              <td style="padding:10px 12px;">\${r.customer_no||'-'}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:600;color:#E3222B;">\${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.round(Number(r.selling_price||0)))}</td>
              <td style="padding:10px 12px;text-align:center;"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:\${statusBg};color:\${statusColor};">\${r.status||'-'}</span></td>
              <td style="padding:10px 12px;text-align:center;font-family:monospace;font-size:11px;">\${r.sn ? \`<span style="max-width:120px;display:inline-block;word-break:break-all;">\${r.sn}</span> <button onclick="navigator.clipboard.writeText('\${r.sn}').then(()=>showToast('Disalin!','success'))" style="padding:2px 6px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:10px;">📋</button>\` : '-'}</td>
            </tr>\`;
          }).join('')}
          </tbody>
        </table></div>\`;
      } catch(err) {
        area.innerHTML = \`<div style="padding:40px;text-align:center;color:#E3222B;">Gagal: \${err.message}</div>\`;
      }
    }, 100);
  };

  window.showPpobMain = function() {
    ppobView = 'main';
    render();
  };

  // === Main Render ===
  function ppob() {
    // Schedule init after render
    setTimeout(() => {
      if (ppobView === 'history') { showPpobHistory(); return; }
      if (ppobProducts.length === 0) {
        loadPpobProducts();
      } else {
        renderPpobGrid();
        renderBrandFilters();
        renderRecentNumbers('');
      }
      if (ppobActiveTab === 'PLN') { ppobBrand = 'PLN'; renderPpobGrid(); }
      // Restore active tab style
      const tabs = document.querySelectorAll('.ppob-tab');
      const order = ['Pulsa','Data','PLN','Game','E-Money'];
      const ai = order.indexOf(ppobActiveTab);
      tabs.forEach((t, i) => {
        if (i === ai) { t.style.borderBottom='3px solid #E3222B'; t.style.color='#E3222B'; t.style.fontWeight='bold'; }
        else { t.style.borderBottom='none'; t.style.color='#666'; t.style.fontWeight='normal'; }
      });
    }, 80);

    const isHistory = ppobView === 'history';

    return \`
      <style>
        @keyframes ppobPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes ppobModalIn { from{opacity:0;transform:scale(0.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .ppob-card:hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(245,61,45,0.1) !important; }
      </style>

      <header class="header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <h1 style="margin:0;">📱 PPOB</h1>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button onclick="\${isHistory ? 'showPpobMain()' : 'showPpobHistory()'}" style="padding:8px 16px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#555;cursor:pointer;font-size:13px;font-weight:600;">
            \${isHistory ? '← Kembali Transaksi' : '📋 Riwayat'}
          </button>
          \${!isHistory ? '<button onclick="syncPpobProducts()" style="padding:8px 16px;border-radius:8px;border:1px solid #E3222B;background:#fff;color:#E3222B;cursor:pointer;font-size:13px;font-weight:600;">🔄 Update Katalog</button>' : ''}
        </div>
      </header>

      <section class="content" style="max-width:980px;margin:0 auto;padding-top:14px;">
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.08);overflow:hidden;">

          \${isHistory ? \`
            <div style="padding:16px 24px;border-bottom:1px solid #eee;font-weight:600;color:#333;font-size:15px;">📋 Riwayat Transaksi PPOB</div>
            <div id="ppob-history-area" style="min-height:400px;"><div style="padding:60px;text-align:center;color:#aaa;">⏳ Memuat riwayat...</div></div>
          \` : \`
            <div style="display:flex;border-bottom:1px solid #eee;overflow-x:auto;scrollbar-width:none;">
              <div class="ppob-tab" onclick="switchPpobTab('Pulsa',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;font-weight:bold;color:#E3222B;border-bottom:3px solid #E3222B;white-space:nowrap;">📱 Pulsa</div>
              <div class="ppob-tab" onclick="switchPpobTab('Data',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">📶 Data</div>
              <div class="ppob-tab" onclick="switchPpobTab('PLN',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">💡 PLN</div>
              <div class="ppob-tab" onclick="switchPpobTab('Game',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">🎮 Game</div>
              <div class="ppob-tab" onclick="switchPpobTab('E-Money',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">💸 E-Wallet</div>
            </div>

            <div style="padding:22px 28px;min-height:420px;">
              <div style="margin-bottom:14px;">
                <label style="display:block;margin-bottom:7px;font-weight:600;color:#444;font-size:13px;">📋 No. Meter / ID Pelanggan / No. HP</label>
                <div style="position:relative;">
                  <input type="text" id="ppob-customer-no" autocomplete="off" inputmode="numeric"
                    oninput="detectPpobBrand()" placeholder="Ketik nomor tujuan..." maxlength="30"
                    style="width:100%;font-size:20px;padding:14px 45px 14px 15px;border:2px solid #e5e5e5;border-radius:16px;outline:none;transition:border-color 0.2s;box-sizing:border-box;"
                    onfocus="this.style.borderColor='#E3222B'" onblur="this.style.borderColor='#e5e5e5'">
                  <div style="position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:22px; cursor:pointer; color:#E3222B; transition:transform 0.2s;" title="Buku Telepon" onclick="alert('Fitur Buku Telepon Lengkap segera hadir!')" onmouseover="this.style.transform='translateY(-50%) scale(1.1)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'">📖</div>
                </div>
                <div id="ppob-input-error" style="color:#E3222B;font-size:12px;margin-top:4px;min-height:14px;"></div>
                <div id="ppob-brand-info" style="margin-top:6px;"></div>
              </div>

              <div id="ppob-recent-numbers" style="margin-bottom:12px;"></div>
              <div id="ppob-brand-filters" style="margin-bottom:14px;display:flex;flex-wrap:wrap;"></div>

              <div id="ppob-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:11px;">
                \${Array(6).fill(0).map(() => \`<div style="border:1px solid #eee;border-radius:16px;padding:20px;background:#f9f9f9;animation:ppobPulse 1.5s ease-in-out infinite;"><div style="height:10px;background:#e5e5e5;border-radius:4px;margin-bottom:10px;width:50%;"></div><div style="height:18px;background:#e0e0e0;border-radius:4px;margin-bottom:8px;"></div><div style="height:14px;background:#e8e8e8;border-radius:4px;width:60%;margin:0 auto;"></div></div>\`).join('')}
              </div>
            </div>

            <div id="ppob-footer" style="display:none;padding:14px 28px;background:#fff;border-top:1px solid #eee;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
              <div id="ppob-total-text" style="font-size:15px;color:#555;">Total: <b style="color:#E3222B;font-size:20px;">Rp0</b></div>
              <button id="btn-ppob-checkout" onclick="processPpobCheckout()"
                style="background:linear-gradient(135deg,#E3222B,#ED4B53);color:#fff;border:none;padding:13px 32px;font-size:15px;border-radius:16px;cursor:pointer;font-weight:bold;box-shadow:0 4px 12px rgba(245,61,45,0.3);transition:all 0.2s;"
                onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                💳 Bayar Sekarang
              </button>
            </div>
          \`}

        </div>
      </section>
    \`;
  }
  // --- END PPOB SHOPEE LOGIC ---
`;

const startMarker = "// --- PPOB SHOPEE LOGIC ---";
const endMarker = "// --- END PPOB SHOPEE LOGIC ---";

if (mainJs.includes(startMarker) && mainJs.includes(endMarker)) {
  const before = mainJs.substring(0, mainJs.indexOf(startMarker));
  const after = mainJs.substring(mainJs.indexOf(endMarker) + endMarker.length);
  mainJs = before + ppobLogic + after;
  require('fs').writeFileSync('assets/js/main.js', mainJs);
  console.log("✅ PPOB Premium Upgrade injected successfully!");
} else {
  console.log("❌ Markers not found.");
}
