const crypto = require('crypto');
const axios = require('axios');
const mysql = require('mysql2/promise');
const { databaseConfig } = require('./config/database');
const db = mysql.createPool(databaseConfig());

// Digiflazz Base URL
const DIGI_URL = 'https://api.digiflazz.com/v1';

// Fungsi helper untuk mengambil konfigurasi
async function getDigiConfig() {
  const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('DIGIFLAZZ_USERNAME', 'DIGIFLAZZ_KEY', 'DIGIFLAZZ_ENV')");
  const config = { env: 'sandbox' };
  rows.forEach(r => {
    if (r.setting_key === 'DIGIFLAZZ_USERNAME') config.username = r.setting_value;
    if (r.setting_key === 'DIGIFLAZZ_KEY') config.key = r.setting_value;
    if (r.setting_key === 'DIGIFLAZZ_ENV') config.env = r.setting_value;
  });
  return config;
}

// MD5 Hash helper
function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

/**
 * Tarik / Sinkronisasi Daftar Harga dari Digiflazz
 */
async function syncProducts(cmd = 'prepaid') {
  const config = await getDigiConfig();
  if (!config.username || !config.key) throw new Error("Konfigurasi Digiflazz (Username/Key) belum diatur di menu Settings.");

  const sign = md5(config.username + config.key + "pricelist");
  
  const cmds = cmd === 'all' ? ['prepaid', 'postpaid'] : [cmd];
  let totalSynced = 0;

  for (const currentCmd of cmds) {
    try {
      const payloadCmd = currentCmd === 'postpaid' ? 'pasca' : currentCmd;
      const response = await axios.post(`${DIGI_URL}/price-list`, {
        cmd: payloadCmd,
        username: config.username,
        sign: sign
      });

      const products = response.data.data; // array of products

      // BULK INSERT OPTIMIZATION (Chunked)
      const chunkSize = 50; // Lebih aman untuk limit max_allowed_packet MySQL di VPS
      for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        
        const placeholders = [];
        const values = [];

        for (const p of chunk) {
          let price = Number(p.price);
          if (isNaN(price) && p.admin !== undefined) {
            price = Number(p.admin);
          }
          let markup = 2000;
          if (price >= 100000 && price < 500000) markup = 5000;
          else if (price >= 500000) markup = 10000;
          const salePrice = price + markup;

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            p.buyer_sku_code, p.product_name, p.category, p.brand, currentCmd === 'prepaid' ? 'Prabayar' : 'Pascabayar',
            p.seller_name, price, p.buyer_product_status ? 'normal' : 'gangguan', 
            p.seller_product_status ? 'normal' : 'gangguan', p.unlimited_stock ? 1 : 0, 
            p.stock || 0, p.multi ? 1 : 0, p.start_cut_off, p.end_cut_off, p.desc || '', markup, salePrice
          );
        }

        const sql = `
          INSERT INTO ppob_products (
            buyer_sku_code, product_name, category, brand, type, seller_name, price,
            buyer_product_status, seller_product_status, unlimited_stock, stock, multi,
            start_cut_off, end_cut_off, desc_text, markup_amount, sale_price
          ) VALUES ${placeholders.join(', ')}
          ON DUPLICATE KEY UPDATE
            product_name = VALUES(product_name), category = VALUES(category), brand = VALUES(brand),
            price = VALUES(price), buyer_product_status = VALUES(buyer_product_status),
            seller_product_status = VALUES(seller_product_status), stock = VALUES(stock),
            start_cut_off = VALUES(start_cut_off), end_cut_off = VALUES(end_cut_off),
            desc_text = VALUES(desc_text), markup_amount = VALUES(markup_amount), sale_price = VALUES(sale_price)
        `;
        
        await db.query(sql, values);
        totalSynced += chunk.length;
      }
    } catch (error) {
      const msg = error.response?.data?.data?.message || error.response?.data?.message || error.message;
      console.error(`Gagal sync ${currentCmd}: ${msg}`);
    }
  }

  return { ok: true, synced: totalSynced, message: `Berhasil sinkronisasi ${totalSynced} produk.` };
}

/**
 * Topup / Pembelian Prabayar
 */
async function topup(buyer_sku_code, customer_no) {
  const config = await getDigiConfig();
  if (!config.username || !config.key) throw new Error("Konfigurasi Digiflazz belum diatur.");

  // === BACKEND VALIDATION ===
  if (!customer_no || !String(customer_no).trim()) throw new Error("Nomor tujuan tidak boleh kosong.");
  const custNo = String(customer_no).trim();
  if (!/^[0-9]+$/.test(custNo)) throw new Error("Nomor tujuan hanya boleh berisi angka.");
  if (custNo.length > 30) throw new Error("Nomor tujuan terlalu panjang (max 30 karakter).");

  // Cek produk di database
  const [prodRows] = await db.query("SELECT * FROM ppob_products WHERE buyer_sku_code = ? LIMIT 1", [buyer_sku_code]);
  if (!prodRows.length) throw new Error("Produk tidak ditemukan.");
  const product = prodRows[0];

  // === CEK STATUS PRODUK ===
  if (product.buyer_product_status === 'gangguan') {
    throw new Error(`Produk "${product.product_name}" sedang gangguan. Silakan pilih produk lain.`);
  }

  const ref_id = "GS-" + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
  const sign = md5(config.username + config.key + ref_id);
  const testing = String(config.key).trim().startsWith('dev-');

  // === ERROR MESSAGE MAP (Digiflazz → Bahasa Indonesia) ===
  const errorMap = {
    'Nomor tujuan salah': 'Nomor tujuan tidak valid atau tidak terdaftar.',
    'Saldo tidak cukup': 'Saldo Digiflazz tidak mencukupi. Hubungi administrator.',
    'Produk tidak ditemukan': 'Produk tidak tersedia saat ini.',
    'Transaksi duplikat': 'Transaksi duplikat terdeteksi. Cek riwayat sebelum mencoba lagi.',
    'timeout': 'Server Digiflazz timeout. Silakan coba lagi.',
  };

  try {
    const response = await axios.post(`${DIGI_URL}/transaction`, {
      username: config.username,
      buyer_sku_code: buyer_sku_code,
      customer_no: custNo,
      ref_id: ref_id,
      sign: sign,
      testing: testing
    });

    const result = response.data.data;
    
    await db.query(`
      INSERT INTO ppob_transactions (
        ref_id, customer_no, buyer_sku_code, product_name, type, amount, selling_price, profit, status, sn, rc, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ref_id, custNo, buyer_sku_code, product.product_name, 'Prabayar', 
      Number(result.price), Number(product.sale_price), Number(product.sale_price) - Number(result.price),
      result.status, result.sn || '', result.rc || '', result.message || ''
    ]);

    return { ok: true, data: result, profit: Number(product.sale_price) - Number(result.price) };
  } catch (error) {
    let rawMsg = error.response?.data?.data?.message || error.message || 'Transaksi gagal';
    if (rawMsg.toLowerCase().includes('signature')) {
       const keyPrefix = config.key ? config.key.substring(0, 5) : 'KOSONG';
       rawMsg = rawMsg + " (Sistem Garneta saat ini menggunakan kunci yang berawalan: " + keyPrefix + "...)";
    }
    // Map ke pesan yang lebih ramah
    let friendlyMsg = rawMsg;
    for (const [key, val] of Object.entries(errorMap)) {
      if (rawMsg.toLowerCase().includes(key.toLowerCase())) {
        friendlyMsg = val;
        break;
      }
    }
    throw new Error(friendlyMsg);
  }
}

/**
 * Handle Webhook (Dipanggil dari server.js)
 */
async function handleWebhook(payload) {
  if (!payload || !payload.data) return false;
  const data = payload.data;
  const ref_id = data.ref_id;
  const status = data.status;
  const sn = data.sn || '';
  const price = Number(data.price || 0);

  // Update status di database
  const [res] = await db.query(`
    UPDATE ppob_transactions 
    SET status = ?, sn = ?, amount = ?, updated_at = CURRENT_TIMESTAMP
    WHERE ref_id = ?
  `, [status, sn, price, ref_id]);

  return res.affectedRows > 0;
}

async function checkStatus(ref_id) {
  try {
    const config = await getDigiConfig();
    const [rows] = await db.query("SELECT * FROM ppob_transactions WHERE ref_id = ?", [ref_id]);
    if (rows.length === 0) throw new Error("Transaksi tidak ditemukan.");
    const trx = rows[0];

    const sign = md5(config.username + config.key + ref_id);
    const testing = String(config.key).trim().startsWith('dev-');

    const response = await axios.post(`${DIGI_URL}/transaction`, {
      username: config.username,
      buyer_sku_code: trx.buyer_sku_code,
      customer_no: trx.customer_no,
      ref_id: ref_id,
      sign: sign,
      testing: testing
    });

    const result = response.data.data;
    
    await db.query(`
      UPDATE ppob_transactions 
      SET status = ?, sn = ?, message = ?, updated_at = CURRENT_TIMESTAMP
      WHERE ref_id = ?
    `, [result.status, result.sn || '', result.message || '', ref_id]);

    return { ok: true, data: result };
  } catch (error) {
    const rawMsg = error.response?.data?.data?.message || error.message || 'Gagal cek status';
    return { ok: false, error: rawMsg };
  }
}

/**
 * Inquiry Pascabayar (Cek Tagihan)
 */
async function inquiryPostpaid(buyer_sku_code, customer_no) {
  const config = await getDigiConfig();
  if (!config.username || !config.key) throw new Error("Konfigurasi Digiflazz belum diatur.");

  const custNo = String(customer_no).trim();
  if (!custNo) throw new Error("Nomor tujuan (ID Pelanggan) tidak boleh kosong.");

  // Cek produk di database
  const [prodRows] = await db.query("SELECT * FROM ppob_products WHERE buyer_sku_code = ? LIMIT 1", [buyer_sku_code]);
  if (!prodRows.length) throw new Error("Produk tidak ditemukan.");
  const product = prodRows[0];

  if (product.buyer_product_status === 'gangguan') {
    throw new Error(`Produk "${product.product_name}" sedang gangguan.`);
  }

  const ref_id = "GS-INQ-" + Date.now() + Math.random().toString(36).substring(2, 6).toUpperCase();
  const sign = md5(config.username + config.key + ref_id);
  const testing = String(config.key).trim().startsWith('dev-');

  try {
    const response = await axios.post(`${DIGI_URL}/transaction`, {
      commands: "inq-pasca",
      username: config.username,
      buyer_sku_code: buyer_sku_code,
      customer_no: custNo,
      ref_id: ref_id,
      sign: sign,
      testing: testing
    });

    const result = response.data.data;
    if (result.status === 'Gagal') {
      throw new Error(result.message || 'Cek tagihan gagal.');
    }

    // result.desc contains details like customer_name, lembar_tagihan, etc.
    return { ok: true, data: result, ref_id: ref_id };
  } catch (error) {
    const rawMsg = error.response?.data?.data?.message || error.response?.data?.message || error.message || 'Cek tagihan gagal';
    throw new Error(rawMsg);
  }
}

/**
 * Payment Pascabayar (Bayar Tagihan)
 */
async function payPostpaid(buyer_sku_code, customer_no, ref_id) {
  const config = await getDigiConfig();
  if (!config.username || !config.key) throw new Error("Konfigurasi Digiflazz belum diatur.");

  const custNo = String(customer_no).trim();
  
  // Cek produk
  const [prodRows] = await db.query("SELECT * FROM ppob_products WHERE buyer_sku_code = ? LIMIT 1", [buyer_sku_code]);
  if (!prodRows.length) throw new Error("Produk tidak ditemukan.");
  const product = prodRows[0];

  const sign = md5(config.username + config.key + ref_id);
  const testing = String(config.key).trim().startsWith('dev-');

  try {
    const response = await axios.post(`${DIGI_URL}/transaction`, {
      commands: "pay-pasca",
      username: config.username,
      buyer_sku_code: buyer_sku_code,
      customer_no: custNo,
      ref_id: ref_id,
      sign: sign,
      testing: testing
    });

    const result = response.data.data;
    
    // Admin fee logic for post-paid: profit is selling_price - price (price from Digiflazz)
    // Often for postpaid, we just take the Digiflazz admin fee as profit, or add our own.
    // The selling_price is provided by Digiflazz in the inquiry response.
    const price = Number(result.price || 0);
    const selling_price = Number(result.selling_price || price);
    const profit = selling_price - price;

    await db.query(`
      INSERT INTO ppob_transactions (
        ref_id, customer_no, buyer_sku_code, product_name, type, amount, selling_price, profit, status, sn, rc, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ref_id, custNo, buyer_sku_code, product.product_name, 'Pascabayar', 
      price, selling_price, profit,
      result.status, result.sn || '', result.rc || '', result.message || ''
    ]);

    return { ok: true, data: result, profit: profit };
  } catch (error) {
    const rawMsg = error.response?.data?.data?.message || error.message || 'Pembayaran gagal';
    throw new Error(rawMsg);
  }
}

module.exports = {
  syncProducts,
  topup,
  inquiryPostpaid,
  payPostpaid,
  handleWebhook,
  checkStatus
};
