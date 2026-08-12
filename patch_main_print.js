const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

// Fix 1 & 2: fmt in printPpobReceipt
content = content.replace(
  "const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);",
  "const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n).replace(/\\u00A0/g, ' ');"
);
content = content.replace(
  "const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);",
  "const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n).replace(/\\u00A0/g, ' ');"
); // Run twice because it appears in both printPpobReceipt and printPpobReceiptBluetooth

// Fix 3: Token double size
content = content.replace(
  "        receiptLines.push([0x1b, 0x61, 0x01]); // Center\n        receiptLines.push(...encoder.encode(\"Token / SN\\n\"));\n        receiptLines.push([0x1d, 0x21, 0x11]); // Double Size\n        receiptLines.push(...encoder.encode(sn + \"\\n\"));\n        receiptLines.push([0x1d, 0x21, 0x00]); // Normal Size",
  "        receiptLines.push([0x1b, 0x61, 0x01]); // Center\n        receiptLines.push(...encoder.encode(\"Token / SN\\n\"));\n        receiptLines.push(...encoder.encode(sn + \"\\n\")); // Removed double size to prevent wrapping"
);

// Fix 4: Print button in history
content = content.replace(
  "cursor:pointer;font-size:10px;\">📋</button> : '-'}",
  "cursor:pointer;font-size:10px;\">📋</button> : '-'} <button onclick=\"printPpobReceiptBluetooth('\', '\', '\', '\', \)\" style=\"padding:2px 6px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:10px;margin-left:4px;\" title=\"Cetak Thermal\">🖨️</button>"
);

fs.writeFileSync(file, content);
console.log('Done fixing main.js');