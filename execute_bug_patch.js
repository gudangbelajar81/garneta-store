const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Connection Pool
serverCode = serverCode.replace(
  /const db = await mysql\.createConnection\(DB_URI\);/g, 
  "const db = await mysql.createPool({ uri: DB_URI, connectionLimit: 50 });"
);

// 2. listRows Limit 500 for sales and purchases
serverCode = serverCode.replace(
  /ORDER BY p\.id DESC\s*`\);/g,
  "ORDER BY p.id DESC LIMIT 500`);"
);
serverCode = serverCode.replace(
  /ORDER BY sa\.id DESC\s*`\);/g,
  "ORDER BY sa.id DESC LIMIT 500`);"
);

// 3. Repacking Stock check
const repackingStr = `// Deduct from source product
    await db.query(\`UPDATE products SET stock = stock - ? WHERE id = ?\`, [payload.grossWeight, payload.sourceProductId]);`;
const repackingPatch = `// Cek stok sumber
    const [[srcStock]] = await db.query('SELECT stock FROM products WHERE id=?', [payload.sourceProductId]);
    if (!srcStock || Number(srcStock.stock) < Number(payload.grossWeight)) {
        throw new Error("Stok produk sumber tidak mencukupi untuk repacking.");
    }
    // Deduct from source product
    await db.query(\`UPDATE products SET stock = stock - ? WHERE id = ?\`, [payload.grossWeight, payload.sourceProductId]);`;
serverCode = serverCode.replace(repackingStr, repackingPatch);

// 4. removeRow sales stock recovery
const removeSalesStr = `if (collection === "sales") {
    await db.query(\`DELETE FROM sales WHERE id = ?\`, [id]);
    await recordAudit(\`Hapus penjualan ID \${id}\`);
    return { id };
  }`;
const removeSalesPatch = `if (collection === "sales") {
    const sale = await findRow("sales", id);
    if (sale) {
        const qty = sale.unit_sold * sale.unit_content;
        await db.query('UPDATE products SET stock = stock + ? WHERE id = ?', [qty, sale.product_id]);
    }
    await db.query(\`DELETE FROM sales WHERE id = ?\`, [id]);
    await recordAudit(\`Hapus penjualan ID \${id}\`);
    return { id };
  }`;
serverCode = serverCode.replace(removeSalesStr, removeSalesPatch);

// 5. updateRow sales stock recalculation
const updateSalesStr = `if (collection === "sales") {
      const payload = { ...(await salePayload(item)), id };
      await db.query(\`
        UPDATE sales
        SET user_id = :userId, product_id = :productId, sold_at = :date,
            unit_sold = :unitSold, unit_content = :unitContent,
            cost_price = :costPrice, sale_price = :salePrice, notes = :notes
        WHERE id = :id
      \`, payload);
      await recordAudit(\`Edit penjualan ID \${id}\`);
      return findRow("sales", id);
    }`;
const updateSalesPatch = `if (collection === "sales") {
      const oldSale = await findRow("sales", id);
      let oldQty = 0;
      if (oldSale) {
         oldQty = oldSale.unit_sold * oldSale.unit_content;
         await db.query('UPDATE products SET stock = stock + ? WHERE id = ?', [oldQty, oldSale.product_id]);
      }

      const payload = { ...(await salePayload(item)), id };
      const newQty = payload.unitSold * payload.unitContent;

      const [[stockRow]] = await db.query('SELECT stock FROM products WHERE id = ? LIMIT 1', [payload.productId]);
      if (!stockRow || Number(stockRow.stock) < newQty) {
          if (oldSale) await db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [oldQty, oldSale.product_id]);
          throw new Error(\`Stok tidak mencukupi. Tersedia: \${stockRow ? stockRow.stock : 0}, dibutuhkan: \${newQty}.\`);
      }

      await db.query(\`
        UPDATE sales
        SET user_id = :userId, product_id = :productId, sold_at = :date,
            unit_sold = :unitSold, unit_content = :unitContent,
            cost_price = :costPrice, sale_price = :salePrice, notes = :notes
        WHERE id = :id
      \`, payload);
      
      await db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [newQty, payload.productId]);
      await recordAudit(\`Edit penjualan ID \${id}\`);
      return findRow("sales", id);
    }`;
serverCode = serverCode.replace(updateSalesStr, updateSalesPatch);

// 6. Rate Limiting Login
const rateLimitCode = `const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { ok: false, message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }
});`;

// Find the main endpoint
const apiEndpointStr = `app.post("/api", verifyToken, async (req, res) => {
  try {
    const { action, payload = {} } = req.body || {};`;
    
const apiEndpointPatch = `
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  message: { ok: false, message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." }
});

app.post("/api", verifyToken, async (req, res, next) => {
  if (req.body && req.body.action === 'login') {
      return loginLimiter(req, res, next);
  }
  next();
}, async (req, res) => {
  try {
    const { action, payload = {} } = req.body || {};`;

if (!serverCode.includes('loginLimiter')) {
    serverCode = serverCode.replace(apiEndpointStr, apiEndpointPatch);
}

fs.writeFileSync('server.js', serverCode);
console.log("Patched server.js successfully.");


// MAIN.JS PATCING
let mainCode = fs.readFileSync('assets/js/main.js', 'utf8');

// 7. Fix Race Condition PPOB
const ppobStr = `window.beliPPOB = async function() {
    const sku = state.ppobSelectedSKU;
    const nomor = document.getElementById('ppob-nomor-pelanggan').value;
    const isPostpaid = state.ppobSelectedCategory && (state.ppobSelectedCategory.toLowerCase().includes('pln pasca') || state.ppobSelectedCategory.toLowerCase().includes('bpjs'));`;
const ppobPatch = `window.beliPPOB = async function() {
    const btn = document.getElementById('btn-bayar-ppob');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Memproses...'; }
    
    const sku = state.ppobSelectedSKU;
    const nomor = document.getElementById('ppob-nomor-pelanggan').value;
    const isPostpaid = state.ppobSelectedCategory && (state.ppobSelectedCategory.toLowerCase().includes('pln pasca') || state.ppobSelectedCategory.toLowerCase().includes('bpjs'));`;
const ppobResetStr = `alert("Gagal memproses PPOB: " + err.message);
    }`;
const ppobResetPatch = `alert("Gagal memproses PPOB: " + err.message);
    } finally {
        const btn = document.getElementById('btn-bayar-ppob');
        if (btn) { btn.disabled = false; btn.innerHTML = 'BAYAR SEKARANG'; }
    }`;
mainCode = mainCode.replace(ppobStr, ppobPatch).replace(ppobResetStr, ppobResetPatch);


// 8. Fix Race Condition Kasbon
const kasbonStr = `window.bayarHutang = async function(hutangId) {
    if(!confirm("Anda yakin hutang ini telah LUNAS?")) return;
    try {`;
const kasbonPatch = `window.bayarHutang = async function(hutangId, btnEl) {
    if(!confirm("Anda yakin hutang ini telah LUNAS?")) return;
    if(btnEl) { btnEl.disabled = true; btnEl.innerHTML = '...'; }
    try {`;
const kasbonResetStr = `alert("Gagal melunasi hutang: " + err.message);
    }
  };`;
const kasbonResetPatch = `alert("Gagal melunasi hutang: " + err.message);
        if(btnEl) { btnEl.disabled = false; btnEl.innerHTML = 'LUNAS'; }
    }
  };`;
mainCode = mainCode.replace(kasbonStr, kasbonPatch).replace(kasbonResetStr, kasbonResetPatch);

// Update calls to window.bayarHutang to pass the button reference
mainCode = mainCode.replace(/onclick="window\.bayarHutang\('\$\{h\.id\}'\)"/g, `onclick="window.bayarHutang('\${h.id}', this)"`);

fs.writeFileSync('assets/js/main.js', mainCode);
console.log("Patched main.js successfully.");
