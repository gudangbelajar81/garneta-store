import re

with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update addRow and updateRow to accept req
code = code.replace('add: () => addRow(payload.collection, payload.item),', 'add: () => addRow(payload.collection, payload.item, req),')
code = code.replace('update: () => updateRow(payload.collection, payload.id, payload.item),', 'update: () => updateRow(payload.collection, payload.id, payload.item, req),')

code = code.replace('async function addRow(collection, item = {}) {', 'async function addRow(collection, item = {}, req = null) {')
code = code.replace('async function updateRow(collection, id, item = {}) {', 'async function updateRow(collection, id, item = {}, req = null) {')

# 2. Inject Kasir Name into ngitungSales
old_ngitung_insert = '''  if (collection === "ngitungSales") {
    const [result] = await db.query(
      `INSERT INTO ngitung_sales (date, customer_name, total_amount, paid_amount, status, items, installments) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.date || new Date(), item.customerName || null, item.totalAmount || 0, item.paidAmount || 0, item.status || 'Lunas', JSON.stringify(item.items || []), JSON.stringify(item.installments || [])]
    );
    return findRow("ngitungSales", result.insertId);
  }'''

new_ngitung_insert = '''  if (collection === "ngitungSales") {
    let finalCustomerName = item.customerName || 'Pelanggan Umum';
    if (req && req.user && req.user.role === 'Karyawan') {
      finalCustomerName = `[Kasir: ${req.user.name}] ` + finalCustomerName;
    }
    const [result] = await db.query(
      `INSERT INTO ngitung_sales (date, customer_name, total_amount, paid_amount, status, items, installments) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.date || new Date(), finalCustomerName, item.totalAmount || 0, item.paidAmount || 0, item.status || 'Lunas', JSON.stringify(item.items || []), JSON.stringify(item.installments || [])]
    );
    return findRow("ngitungSales", result.insertId);
  }'''
code = code.replace(old_ngitung_insert, new_ngitung_insert)

# 3. Inject Kasir Name into sales notes
old_sales_insert = '''    const [result] = await db.query(`
      INSERT INTO sales (user_id, product_id, sold_at, unit_sold, unit_content, cost_price, sale_price, notes)
      VALUES (:userId, :productId, :date, :unitSold, :unitContent, :costPrice, :salePrice, :notes)
    `, payload);'''

new_sales_insert = '''    if (req && req.user && req.user.role === 'Karyawan') {
      payload.notes = `[Kasir: ${req.user.name}] ` + (payload.notes || "");
    }
    const [result] = await db.query(`
      INSERT INTO sales (user_id, product_id, sold_at, unit_sold, unit_content, cost_price, sale_price, notes)
      VALUES (:userId, :productId, :date, :unitSold, :unitContent, :costPrice, :salePrice, :notes)
    `, payload);'''
code = code.replace(old_sales_insert, new_sales_insert)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("server.js transactions patched!")
