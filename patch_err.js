const fs = require('fs');
const file = 'ppob.js';
let content = fs.readFileSync(file, 'utf8');

const target = "    const rawMsg = error.response?.data?.data?.message || error.message || 'Transaksi gagal';";
const replacement = \    let rawMsg = error.response?.data?.data?.message || error.message || 'Transaksi gagal';
    if (rawMsg.toLowerCase().includes('signature')) {
       const keyPrefix = config.key ? config.key.substring(0, 5) : 'KOSONG';
       rawMsg = rawMsg + " (Sistem Garneta saat ini menggunakan kunci yang berawalan: " + keyPrefix + "...)";
    }
\;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done ppob.js patch');