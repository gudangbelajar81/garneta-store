require('dotenv').config();
const mysql = require('mysql2/promise');
async function check() {
  const db = await mysql.createConnection(process.env.DB_URL);
  const [rows] = await db.query('SELECT * FROM ppob_transactions ORDER BY id DESC LIMIT 5');
  console.log(rows);
  process.exit(0);
}
check();