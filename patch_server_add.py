import re

with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Pass req to addRow and updateRow
code = code.replace('add: () => addRow(payload.collection, payload.item),', 'add: () => addRow(payload.collection, payload.item, req),')
code = code.replace('update: () => updateRow(payload.collection, payload.id, payload.item),', 'update: () => updateRow(payload.collection, payload.id, payload.item, req),')

# Modify addRow function signature
code = code.replace('async function addRow(collection, item = {}) {', 'async function addRow(collection, item = {}, req = null) {')

# Modify updateRow function signature
code = code.replace('async function updateRow(collection, id, item = {}) {', 'async function updateRow(collection, id, item = {}, req = null) {')

# Find ngitungSales INSERT
old_ngitung_insert = '''  if (collection === "ngitungSales") {
    const [result] = await db.query(
      `INSERT INTO ngitung_sales (date, customer_name, total_amount, paid_amount, status, items, 
installments) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.date || new Date(), item.customerName || null, item.totalAmount || 0, item.paidAmount || 
0, item.status || 'Lunas', JSON.stringify(item.items || []), JSON.stringify(item.installments || [])]
    );
    return findRow("ngitungSales", result.insertId);
  }'''

new_ngitung_insert = '''  if (collection === "ngitungSales") {
    // [SECURITY] Inject Cashier Name from token if available
    let notes = item.notes || "";
    if (req && req.user && req.user.name) {
       notes = `Kasir: ${req.user.name} | ${notes}`;
    }
    
    // Check if table has notes field, or just save it. Wait, ngitung_sales doesn't have a notes field explicitly in schema? 
    // We can add it to customerName or save it. Wait, the frontend might have "notes". Let's inject into customerName for now if no notes.
    const [result] = await db.query(
      `INSERT INTO ngitung_sales (date, customer_name, total_amount, paid_amount, status, items, installments) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.date || new Date(), item.customerName || (req && req.user ? `[Kasir: ${req.user.name}]` : null), item.totalAmount || 0, item.paidAmount || 0, item.status || 'Lunas', JSON.stringify(item.items || []), JSON.stringify(item.installments || [])]
    );
    return findRow("ngitungSales", result.insertId);
  }'''

# Wait, the customerName is used for customer. Let's see if ngitung_sales has an 'employee_id' or 'cashier' field?
# Let's check `count_rows.sql` or `server.js` schema for ngitung_sales.
