const mysql = require('mysql2/promise');

async function createTable() {
    try {
        const db = await mysql.createConnection('mysql://root:@localhost:3306/retail_inventory');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS cashflow_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('IN', 'OUT') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                description VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Table cashflow_logs created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

createTable();
