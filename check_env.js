const mysql = require('mysql2/promise');
const { databaseConfig } = require('./config/database');
(async () => {
  const db = mysql.createPool(databaseConfig());
  const [rows] = await db.query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('DIGIFLAZZ_USERNAME', 'DIGIFLAZZ_KEY', 'DIGIFLAZZ_ENV')");
  console.log(rows);
  db.end();
})();