const fs = require('fs');
const file = 'ppob.js';
let content = fs.readFileSync(file, 'utf8');

const target = "module.exports = {";
const replacement = \sync function checkStatus(ref_id) {
  try {
    const config = await getDigiConfig();
    const [rows] = await db.query("SELECT * FROM ppob_transactions WHERE ref_id = ?", [ref_id]);
    if (rows.length === 0) throw new Error("Transaksi tidak ditemukan.");
    const trx = rows[0];

    const sign = md5(config.username + config.key + ref_id);
    const testing = String(config.key).trim().startsWith('dev-');

    const response = await axios.post(\\\\/transaction\\\, {
      username: config.username,
      buyer_sku_code: trx.buyer_sku_code,
      customer_no: trx.customer_no,
      ref_id: ref_id,
      sign: sign,
      testing: testing
    });

    const result = response.data.data;
    
    await db.query(\\\
      UPDATE ppob_transactions 
      SET status = ?, sn = ?, message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ref_id = ?
    \\\, [result.status, result.sn || '', result.message || '', ref_id]);

    return { ok: true, data: result };
  } catch (error) {
    const rawMsg = error.response?.data?.data?.message || error.message || 'Gagal cek status';
    return { ok: false, error: rawMsg };
  }
}

module.exports = {
  checkStatus,
\;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done ppob.js patch');