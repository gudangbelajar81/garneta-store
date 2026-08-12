const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

// Add cashflow_logs to validate collection
code = code.replace(/!\["products", "suppliers", "purchases", "sales", "users", "priceHistory", "auditLogs"\]\.includes\(collection\) && !\["employees", "cashAdvances", "payrolls", "ngitungSales", "orders", "cuan_reports", "ppob_products"\]\.includes\(collection\)/, '!["products", "suppliers", "purchases", "sales", "users", "priceHistory", "auditLogs", "cashflowLogs"].includes(collection) && !["employees", "cashAdvances", "payrolls", "ngitungSales", "orders", "cuan_reports", "ppob_products"].includes(collection)');

// Add mapping
code = code.replace(/ppob_products: "ppob_products"/, 'ppob_products: "ppob_products",\n    cashflowLogs: "cashflow_logs"');

// Add get_laporan_keuangan to coreActions
const newAction = `
    get_laporan_keuangan: async () => {
      const { startDate, endDate } = payload;
      const [sales] = await db.query('SELECT * FROM sales WHERE DATE(date) >= ? AND DATE(date) <= ?', [startDate, endDate]);
      const [ppob] = await db.query('SELECT * FROM ppob_transactions WHERE status = ? AND DATE(created_at) >= ? AND DATE(created_at) <= ?', ['Sukses', startDate, endDate]);
      const [cashflow] = await db.query('SELECT * FROM cashflow_logs WHERE date >= ? AND date <= ? ORDER BY date DESC, created_at DESC', [startDate, endDate]);
      const [purchases] = await db.query('SELECT * FROM purchases WHERE date >= ? AND date <= ?', [startDate, endDate]);
      const [cashAdvances] = await db.query('SELECT * FROM cash_advances WHERE date >= ? AND date <= ?', [startDate, endDate]);
      return { sales, ppob, cashflow, purchases, cashAdvances };
    },
`;

if (!code.includes('get_laporan_keuangan: async () => {')) {
  code = code.replace(/ppob_history: async \(\) => {/, newAction + '\n    ppob_history: async () => {');
  fs.writeFileSync('server.js', code);
  console.log("Patched server.js");
} else {
  console.log("Already patched server.js");
}
