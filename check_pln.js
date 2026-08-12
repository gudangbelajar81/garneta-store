const mysql = require('mysql2/promise');
const { databaseConfig } = require('./config/database');
(async () => {
  const db = mysql.createPool(databaseConfig());
  const [rows] = await db.query("SELECT buyer_sku_code, product_name, category, brand, sale_price FROM ppob_products WHERE category = 'PLN' ORDER BY sale_price ASC;");
  console.log('PLN:', rows);
  const [rows2] = await db.query("SELECT COUNT(*) as count FROM ppob_products");
  console.log('Total:', rows2);
  db.end();
})();