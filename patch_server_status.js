const fs = require('fs');
const file = 'server.js';
let content = fs.readFileSync(file, 'utf8');

const target = "ppob_topup: () => ppob.topup(payload.buyer_sku_code, payload.customer_no),";
const replacement = \ppob_topup: () => ppob.topup(payload.buyer_sku_code, payload.customer_no),
      ppob_checkStatus: () => ppob.checkStatus(payload.ref_id),\;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done server.js');