const fs = require('fs');
const schemaPath = 'database/schema.sql';
let schema = fs.readFileSync(schemaPath, 'utf8');

const sql = `
CREATE TABLE IF NOT EXISTS cashflow_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('IN', 'OUT') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

if (!schema.includes('cashflow_logs')) {
    fs.appendFileSync(schemaPath, sql);
    console.log("Appended cashflow_logs to schema.sql");
} else {
    console.log("Already exists in schema.sql");
}
