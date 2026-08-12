require('dotenv').config();
const mysql = require('mysql2/promise');
const { databaseConfig } = require('./config/database');
const db = mysql.createPool(databaseConfig);
async function setConfig() {
    try {
        await db.query("REPLACE INTO app_settings (setting_key, setting_value) VALUES ('DIGIFLAZZ_USERNAME', 'rixuvognNEpg'), ('DIGIFLAZZ_KEY', 'dev-69c02a50-9224-11f1-a6e2-9708e3f1407b'), ('DIGIFLAZZ_ENV', 'development')");
        console.log('Settings updated!');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
setConfig();
