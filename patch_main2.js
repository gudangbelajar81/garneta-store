const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

const ppobLogic = `
  // --- PPOB LOGIC ---
  let ppobProducts = [];
  
  async function loadPpobProducts() {
    try {
      const data = await gas('list', { collection: 'ppob_products' });
      if(data) {
        ppobProducts = data;
      }
    } catch(e) {
      console.error("Gagal load ppob:", e);
    }
  }

  function ppob() {
    if(ppobProducts.length === 0) loadPpobProducts().then(render);
    
    // Group products by brand
    const brands = [...new Set(ppobProducts.map(p => p.brand))].sort();
    
    let stateBrand = window.ppobSelectedBrand || (brands.length ? brands[0] : '');
    
    // Filter products
    const filtered = ppobProducts.filter(p => p.brand === stateBrand);
    
    return \`
      <section class="workspace">
        <div class="workspace-header">
          <h2 class="workspace-title">📱 PPOB & Pembayaran Digital</h2>
          <p class="subtitle">Transaksi pulsa, kuota, token PLN, e-wallet, dll langsung jadi satu kasir.</p>
          <div style="margin-top:12px;">
            <button class="btn" onclick="syncPpobProducts()">🔄 Sinkronisasi Katalog (Digiflazz)</button>
          </div>
        </div>
        
        <div class="workspace-content" style="display:flex; gap:20px; flex-wrap:wrap;">
          
          <!-- Kategori & Input -->
          <div class="card" style="flex:1; min-width:300px;">
            <h3>Pilih Layanan</h3>
            <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 20px;">
              \${brands.map(b => \`<button class="btn \${stateBrand === b ? 'primary' : 'soft'}" onclick="window.ppobSelectedBrand='\${b}'; render();">\${b}</button>\`).join('')}
            </div>
            
            <h3>Masukkan Nomor Pelanggan / Tujuan</h3>
            <input type="text" id="ppob-customer-no" class="smart-input" placeholder="0812xxxxxx / ID Pelanggan" style="font-size:1.5rem; padding:12px; height:50px; text-align:center; font-weight:bold; letter-spacing:2px; margin-bottom:12px;">
          </div>
          
          <!-- Daftar Produk -->
          <div class="card" style="flex:2; min-width:300px; max-height: 60vh; overflow-y:auto;">
            <h3>Daftar Produk \${stateBrand}</h3>
            <div class="grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:12px; margin-top:12px;">
              \${filtered.map(p => \`
                <div class="card" style="padding:12px; text-align:center; cursor:pointer; border:1px solid var(--line); transition:all 0.2s ease;" onmouseover="this.style.borderColor='var(--green)'" onmouseout="this.style.borderColor='var(--line)'" onclick="confirmPpob('\${p.buyer_sku_code}', '\${p.product_name}', \${p.sale_price})">
                  <div style="font-size:14px; font-weight:bold; color:var(--text); margin-bottom:8px;">\${p.product_name}</div>
                  <div style="font-size:18px; color:var(--green); font-weight:900;">\${rupiah(p.sale_price)}</div>
                  <div style="font-size:10px; color:var(--soft-text); margin-top:6px;">\${p.desc_text || ''}</div>
                </div>
              \`).join('')}
              \${filtered.length === 0 ? '<div class="muted">Tidak ada produk. Silakan Sinkronisasi Katalog.</div>' : ''}
            </div>
          </div>
        </div>
      </section>
    \`;
  }
  
  window.syncPpobProducts = async function() {
    let btn = document.querySelector('button[onclick^="syncPpobProducts"]');
    const oldText = btn.innerHTML;
    btn.innerHTML = "Sedang Sinkronisasi...";
    btn.disabled = true;
    try {
      const res = await gas('ppob_sync', { cmd: 'prepaid' });
      showToast("Berhasil: " + res.message, "success");
      await loadPpobProducts();
      render();
    } catch(err) {
      showToast("Gagal Sinkronisasi: " + err.message, "error");
    } finally {
      btn.innerHTML = oldText;
      btn.disabled = false;
    }
  };
  
  window.confirmPpob = async function(sku, name, price) {
    const custNo = document.getElementById('ppob-customer-no').value.trim();
    if(!custNo) {
      showToast("Mohon isi nomor pelanggan terlebih dahulu!", "error");
      document.getElementById('ppob-customer-no').focus();
      return;
    }
    
    if(!confirm(\`Apakah nomor tujuan sudah benar?\\n\\nNomor: \${custNo}\\nProduk: \${name}\\nHarga: \${rupiah(price)}\\n\\nJika sudah menerima uang, klik OK untuk proses.\`)) return;
    
    try {
      const res = await gas('ppob_topup', { buyer_sku_code: sku, customer_no: custNo });
      showToast("Transaksi Berhasil Diproses!", "success");
      
      // Auto print receipt
      const total = price;
      const bayar = price;
      const dateStr = new Date().toLocaleString('id-ID');
      const html = \`
        <html><head><style>
          body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; font-size: 14px; }
          .header { text-align: center; margin-bottom: 20px; }
          .divider { border-top: 1px dashed #000; margin: 12px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; }
        </style></head><body>
          <div class="header">
            <h2 style="margin:0; font-size:20px;">GARNETA STORE</h2>
            <p style="margin:4px 0;">Struk Pembayaran PPOB</p>
          </div>
          <div class="divider"></div>
          <p>Tgl: \${dateStr}</p>
          <div class="divider"></div>
          <div class="row"><span>Produk:</span><span style="text-align:right;">\${name}</span></div>
          <div class="row"><span>Tujuan:</span><span>\${custNo}</span></div>
          <div class="row"><span>SN / Token:</span><span style="font-weight:bold;">\${res.data.sn || 'DIPROSES'}</span></div>
          <div class="row"><span>Status:</span><span>\${res.data.status}</span></div>
          <div class="divider"></div>
          <div class="row" style="font-weight:bold; font-size:16px;"><span>TOTAL</span><span>\${rupiah(total)}</span></div>
          <div class="row"><span>Tunai</span><span>\${rupiah(bayar)}</span></div>
          <div class="divider"></div>
          <div class="footer">Terima Kasih 🙏<br>Simpan struk ini sebagai bukti pembayaran.</div>
          <script>window.onload=()=>{setTimeout(()=>{window.print();},500);}</script>
        </body></html>
      \`;
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      }
      
      document.getElementById('ppob-customer-no').value = '';
    } catch(err) {
      showToast(err.message, "error");
    }
  };
  // --- END PPOB LOGIC ---

`;

code = code.replace('// === AUTO-UPDATE NOTIFIER ===', ppobLogic + '\n// === AUTO-UPDATE NOTIFIER ===');
fs.writeFileSync('assets/js/main.js', code, 'utf8');
console.log("Injected PPOB logic.");
