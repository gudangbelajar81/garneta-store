const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// listRows
code = code.replace(
`  if (collection === "ngitungSales") {
    const [rows] = await db.query(\`SELECT * FROM ngitung_sales ORDER BY created_at DESC LIMIT 200\`);
    return rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]'), installments: JSON.parse(r.installments || '[]') }));
  }`,
`  if (collection === "ngitungSales") {
    const [rows] = await db.query(\`SELECT * FROM ngitung_sales ORDER BY created_at DESC LIMIT 200\`);
    return rows.map(r => ({ ...r, items: JSON.parse(r.items || '[]'), installments: JSON.parse(r.installments || '[]') }));
  }

  if (collection === "orders") {
    const [rows] = await db.query(\`SELECT id, data FROM orders ORDER BY created_at DESC LIMIT 500\`);
    return rows.map(r => ({ id: r.id, ...JSON.parse(r.data || '{}') }));
  }

  if (collection === "cuan_reports") {
    const [rows] = await db.query(\`SELECT id, execution_date, amount, created_at FROM cuan_reports ORDER BY execution_date DESC LIMIT 500\`);
    return rows.map(r => ({
      id: r.id,
      executionDate: r.execution_date ? new Date(r.execution_date).toISOString().split('T')[0] : null,
      amount: Number(r.amount || 0),
      createdAt: r.created_at
    }));
  }`
);

// addRow
code = code.replace(
`  if (collection === "ngitungSales") {
    const [result] = await db.query(
      \`INSERT INTO ngitung_sales (date, customer_name, total_amount, paid_amount, status, items, installments) VALUES (?, ?, ?, ?, ?, ?, ?)\`,
      [item.date || new Date(), item.customerName || null, item.totalAmount || 0, item.paidAmount || 0, item.status || 'Lunas', JSON.stringify(item.items || []), JSON.stringify(item.installments || [])]
    );
    return findRow("ngitungSales", result.insertId);
  }`,
`  if (collection === "ngitungSales") {
    const [result] = await db.query(
      \`INSERT INTO ngitung_sales (date, customer_name, total_amount, paid_amount, status, items, installments) VALUES (?, ?, ?, ?, ?, ?, ?)\`,
      [item.date || new Date(), item.customerName || null, item.totalAmount || 0, item.paidAmount || 0, item.status || 'Lunas', JSON.stringify(item.items || []), JSON.stringify(item.installments || [])]
    );
    return findRow("ngitungSales", result.insertId);
  }

  if (collection === "orders") {
    const dataStr = JSON.stringify(item);
    await db.query(\`INSERT INTO orders (id, data) VALUES (?, ?)\`, [item.id, dataStr]);
    return { id: item.id, ...item };
  }

  if (collection === "cuan_reports") {
    const [result] = await db.query(
      \`INSERT INTO cuan_reports (execution_date, amount) VALUES (?, ?)\`,
      [item.executionDate || new Date().toISOString().split('T')[0], item.amount || 0]
    );
    return findRow("cuan_reports", result.insertId);
  }`
);

// updateRow
code = code.replace(
`  if (collection === "ngitungSales") {
    await db.query(
      \`UPDATE ngitung_sales SET date=?, customer_name=?, total_amount=?, paid_amount=?, status=?, items=?, installments=? WHERE id=?\`,
      [item.date, item.customerName || null, item.totalAmount, item.paidAmount, item.status, JSON.stringify(item.items || []), JSON.stringify(item.installments || []), id]
    );
    return findRow("ngitungSales", id);
  }`,
`  if (collection === "ngitungSales") {
    await db.query(
      \`UPDATE ngitung_sales SET date=?, customer_name=?, total_amount=?, paid_amount=?, status=?, items=?, installments=? WHERE id=?\`,
      [item.date, item.customerName || null, item.totalAmount, item.paidAmount, item.status, JSON.stringify(item.items || []), JSON.stringify(item.installments || []), id]
    );
    return findRow("ngitungSales", id);
  }

  if (collection === "orders") {
    const dataStr = JSON.stringify(item);
    await db.query(\`UPDATE orders SET data=? WHERE id=?\`, [dataStr, id]);
    return { id, ...item };
  }`
);

// tableName
code = code.replace(
`    auditLogs: "activity_logs",
    ngitungSales: "ngitung_sales"
  };
  return tables[collection];`,
`    auditLogs: "activity_logs",
    ngitungSales: "ngitung_sales",
    orders: "orders",
    cuan_reports: "cuan_reports"
  };
  return tables[collection];`
);

fs.writeFileSync('server.js', code);
console.log("Patch successfully applied without regexes!");
