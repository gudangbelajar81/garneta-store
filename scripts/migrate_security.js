/**
 * ══════════════════════════════════════════════════════════════
 * 🔐 SECURITY MIGRATION SCRIPT — AlvezaDigital
 * ══════════════════════════════════════════════════════════════
 * Menambahkan struktur tabel Sidik Jari (WebAuthn) dan 
 * kolom Recovery/OTP untuk tabel users.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mysql = require("mysql2/promise");
const { databaseConfig } = require("../config/database");

async function migrateSecurity() {
  console.log("Menghubungkan ke database...");
  const { multipleStatements, ...config } = databaseConfig();
  const db = await mysql.createConnection(config);

  try {
    // 1. Buat Tabel Passkeys (Sidik Jari / Face ID)
    console.log("1. Membuat tabel 'passkeys' untuk Sidik Jari / Face ID...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS passkeys (
        id VARCHAR(255) PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        public_key TEXT NOT NULL,
        webauthn_user_id VARCHAR(255) NOT NULL,
        counter INT NOT NULL DEFAULT 0,
        device_type VARCHAR(255),
        backed_up BOOLEAN NOT NULL DEFAULT false,
        transports VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 2. Tambah Kolom Keamanan di Tabel Users
    console.log("2. Memperbarui tabel 'users' untuk Kunci Master & OTP...");
    const [columns] = await db.query(`SHOW COLUMNS FROM users`);
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('recovery_key_hash')) {
      await db.query(`ALTER TABLE users ADD COLUMN recovery_key_hash VARCHAR(255) NULL`);
      console.log("   - Kolom recovery_key_hash ditambahkan.");
    }
    if (!columnNames.includes('otp_code')) {
      await db.query(`ALTER TABLE users ADD COLUMN otp_code VARCHAR(10) NULL`);
      console.log("   - Kolom otp_code ditambahkan.");
    }
    if (!columnNames.includes('otp_expires_at')) {
      await db.query(`ALTER TABLE users ADD COLUMN otp_expires_at DATETIME NULL`);
      console.log("   - Kolom otp_expires_at ditambahkan.");
    }

    // 3. Tambah kolom 'device_name' opsional di passkeys jika belum ada (untuk mengenali nama HP/PC)
    const [passkeyCols] = await db.query(`SHOW COLUMNS FROM passkeys`);
    const pkColumnNames = passkeyCols.map(c => c.Field);
    if (!pkColumnNames.includes('device_name')) {
      await db.query(`ALTER TABLE passkeys ADD COLUMN device_name VARCHAR(100) NULL`);
      console.log("   - Kolom device_name ditambahkan pada passkeys.");
    }

    console.log("\n✅ MIGRASI KEAMANAN BERHASIL DISelesaikan!");
  } catch (error) {
    console.error("❌ MIGRASI GAGAL:", error);
  } finally {
    await db.end();
  }
}

migrateSecurity();
