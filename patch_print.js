const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

const target = '              // Items\n              data.items.forEach(r => {';
const replace = 
              let tOperator = data.operator || (window.state && window.state.user && window.state.user.username ? window.state.user.username : 'Kasir Utama');
              let tTotal = data.total !== undefined ? data.total : (data.grandTotal || data.subtotal || 0);
              let tBayar = data.bayar !== undefined ? data.bayar : (data.dp !== undefined ? data.dp : tTotal);
              let tKembali = data.kembalian !== undefined ? data.kembalian : (tBayar > tTotal ? tBayar - tTotal : 0);

              receiptLines.push(...encoder.encode("Struk Belanja - " + data.date + "\\n"));
              receiptLines.push(...encoder.encode("Kasir: " + tOperator + "\\n"));
              receiptLines.push(...encoder.encode("Pelanggan: " + data.customer + "\\n"));
              receiptLines.push(...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\\n"));
              
              receiptLines.push([0x1b, 0x61, 0x00]); // Left align for items
              
              // Items
              data.items.forEach(r => {;

const targetDeleteStr =               receiptLines.push(...encoder.encode("Struk Belanja - " + data.date + "\\n"));
              receiptLines.push(...encoder.encode("Kasir: " + data.operator + "\\n"));
              receiptLines.push(...encoder.encode("Pelanggan: " + data.customer + "\\n"));
              receiptLines.push(...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\\n"));
              
              receiptLines.push([0x1b, 0x61, 0x00]); // Left align for items
              
              // Items
              data.items.forEach(r => {;

content = content.replace(targetDeleteStr, replace);

const targetReplaceTotalsStr =               receiptLines.push(...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\\n"));
              receiptLines.push(...encoder.encode(padLR("TOTAL", "Rp " + new Intl.NumberFormat("id-ID").format(data.total)) + "\\n"));
              receiptLines.push(...encoder.encode(padLR("BAYAR", "Rp " + new Intl.NumberFormat("id-ID").format(data.bayar)) + "\\n"));
              receiptLines.push(...encoder.encode(padLR("KEMBALI", "Rp " + new Intl.NumberFormat("id-ID").format(data.kembalian)) + "\\n"));;

const replaceTotalsStr =               receiptLines.push(...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\\n"));
              receiptLines.push(...encoder.encode(padLR("TOTAL", "Rp " + new Intl.NumberFormat("id-ID").format(tTotal)) + "\\n"));
              receiptLines.push(...encoder.encode(padLR("BAYAR", "Rp " + new Intl.NumberFormat("id-ID").format(tBayar)) + "\\n"));
              receiptLines.push(...encoder.encode(padLR("KEMBALI", "Rp " + new Intl.NumberFormat("id-ID").format(tKembali)) + "\\n"));;

content = content.replace(targetReplaceTotalsStr, replaceTotalsStr);

fs.writeFileSync(file, content);
console.log("PATCH PRINT SUCCESS");