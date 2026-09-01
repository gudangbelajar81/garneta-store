const fs = require("fs");
let code = fs.readFileSync("server.js", "utf8");

// 1. Inject actions
if (!code.includes("saveBulkPurchases:")) {
  code = code.replace(
    "clearAuditLogs: () => clearAuditLogs(),",
    "clearAuditLogs: () => clearAuditLogs(),\n    saveBulkPurchases: () => saveBulkPurchases(payload),\n    saveBulkKentang: () => saveBulkKentang(payload),"
  );
}

// 2. Append the functions at the end of the file
const newFunctions = `

// ==========================================
// NOTEPAD PINTAR & MENU KENTANG ENDPOINTS
// ==========================================

async function saveBulkPurchases(payload) {
  const { items, supplier, date } = payload;
  const results = [];
  
  for (const item of items) {
    // We reuse addRow logic or replicate it here
    const purchasePayload = {
      name: item.name,
      qty: item.qty,
      basePrice: item.basePrice,
      salePrice: item.salePrice,
      category: item.category || 'Umum',
      unit: item.unit || 'pcs',
      unitContent: item.unitContent || 1,
      total: Number(item.qty) * Number(item.basePrice),
      supplier: supplier || null,
      date: date || new Date()
    };
    
    // Simulate the exact logic from addRow('purchases')
    try {
      const saved = await addRow("purchases", purchasePayload);
      results.push({ success: true, name: item.name, data: saved });
    } catch(e) {
      results.push({ success: false, name: item.name, error: e.message });
    }
  }
  return { results };
}

async function saveBulkKentang(payload) {
  const { supplierName, date, grades, totalPrice } = payload;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Insert into kentang_purchases
    const [purchResult] = await connection.query(\`
      INSERT INTO kentang_purchases (supplier_name, total_price, purchased_at)
      VALUES (?, ?, ?)
    \`, [supplierName || null, Number(totalPrice) || 0, date || new Date()]);
    const purchaseId = purchResult.insertId;

    let totalKentangKgGlobal = 0;

    // 2. Process each grade
    for (const g of grades) {
      const gradeName = g.grade || 'Umum';
      const productName = \`Kentang Grade \${gradeName}\`;
      const tKarung = Number(g.totalKarung) || 0;
      const tKg = Number(g.totalKg) || 0;
      const priceKg = Number(g.pricePerKg) || 0;
      const sub = tKg * priceKg;
      totalKentangKgGlobal += tKg;

      // Insert detail
      await connection.query(\`
        INSERT INTO kentang_purchase_details (purchase_id, grade, total_karung, total_kg, price_per_kg, subtotal, weight_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      \`, [purchaseId, gradeName, tKarung, tKg, priceKg, sub, JSON.stringify(g.weights || [])]);

      // 3. Update or Create Product in Main Table
      const [existingProducts] = await connection.query(\`SELECT id FROM products WHERE name = ? LIMIT 1\`, [productName]);
      let productId = null;
      if (existingProducts.length > 0) {
        productId = existingProducts[0].id;
        await connection.query(\`
          UPDATE products 
          SET stock = stock + ?, base_price = ?
          WHERE id = ?
        \`, [tKg, priceKg, productId]);
      } else {
        const [prodResult] = await connection.query(\`
          INSERT INTO products (category, name, unit, base_price, stock)
          VALUES ('Sayuran', ?, 'kg', ?, ?)
        \`, [productName, priceKg, tKg]);
        productId = prodResult.insertId;
      }

      // Record price history
      await connection.query(\`
        INSERT INTO price_history (product_id, purchase_id, base_price, unit_content, sale_price, recorded_at)
        VALUES (?, ?, ?, 1, 0, ?)
      \`, [productId, purchaseId, priceKg, date || new Date()]);
    }

    await connection.commit();
    await recordAudit(\`Kulakan Kentang (\${grades.length} Grade, Total: \${totalKentangKgGlobal} KG)\`);
    return { success: true, purchaseId };
  } catch (err) {
    if (connection) await connection.rollback();
    throw err;
  } finally {
    if (connection) connection.release();
  }
}
`;

if (!code.includes("saveBulkKentang")) {
  code += newFunctions;
}

fs.writeFileSync("server.js", code);
console.log("server.js updated successfully.");
