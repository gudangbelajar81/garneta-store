const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "garneta_store_db",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    console.log("Creating kentang tables...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kentang_purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_name VARCHAR(255) DEFAULT NULL,
        total_price DECIMAL(15, 2) DEFAULT 0,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kentang_purchase_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        grade VARCHAR(50) DEFAULT 'Umum',
        total_karung INT DEFAULT 0,
        total_kg DECIMAL(10, 2) DEFAULT 0,
        price_per_kg DECIMAL(15, 2) DEFAULT 0,
        subtotal DECIMAL(15, 2) DEFAULT 0,
        weight_details TEXT,
        FOREIGN KEY (purchase_id) REFERENCES kentang_purchases(id) ON DELETE CASCADE
      )
    `);

    console.log("Tables created successfully.");
  } catch(e) {
    console.error("Error:", e);
  } finally {
    process.exit();
  }
}
run();
