const mysql = require('mysql2/promise');
async function run() {
    const db = await mysql.createConnection('mysql://root:@localhost:3306/retail_inventory');
    await db.query("REPLACE INTO app_settings (setting_key, setting_value) VALUES ('DIGIFLAZZ_USERNAME', 'rixuvognNEpg'), ('DIGIFLAZZ_KEY', 'dev-69c02a50-9224-11f1-a6e2-9708e3f1407b'), ('DIGIFLAZZ_ENV', 'development')");
    console.log("Done");
    process.exit(0);
}
run();
