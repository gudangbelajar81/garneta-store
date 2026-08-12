const fs = require('fs');
const code = fs.readFileSync('server.js', 'utf8');
const hasOrders = code.indexOf('collection === "orders"');
const hasCuanReports = code.indexOf('collection === "cuan_reports"');
console.log('orders in server.js at char:', hasOrders);
console.log('cuan_reports in server.js at char:', hasCuanReports);
console.log('Total chars:', code.length);

// Show lines around the orders addRow handler
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.includes('orders') || line.includes('cuan_reports')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
