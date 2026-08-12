const mysql = require('mysql2/promise');
const { databaseConfig } = require('./config/database');
(async () => {
  const db = mysql.createPool(databaseConfig());
  const [rows] = await db.query("SELECT DISTINCT category, type FROM ppob_products;");
  console.log(rows);
  db.end();
})();