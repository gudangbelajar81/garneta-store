const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  // Letakkan SQL dalam file di server untuk menghindari masalah escaping
  const script = `cat << 'SQLEOF' > /tmp/count_rows.sql
USE retail_inventory;
SELECT 'users' AS tbl, COUNT(*) AS total FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'ppob_products', COUNT(*) FROM ppob_products
UNION ALL SELECT 'ppob_transactions', COUNT(*) FROM ppob_transactions
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL SELECT 'activity_logs', COUNT(*) FROM activity_logs;
SQLEOF
docker exec -i hhij0e9i4lud5b7kgxtud4br mysql -uroot -pAd6mFnTSSqUHePXdVFlDUEjUH2c6Eo3cDUUxslERWYaLFvlszLqWoSk56DpJo2WR < /tmp/count_rows.sql`;
  conn.exec(script, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => conn.end())
          .on('data', data => process.stdout.write(data))
          .stderr.on('data', data => process.stderr.write(data));
  });
}).connect({
  host: '77.42.77.29',
  port: 22,
  username: 'root',
  password: 'AlvezaDigital2026!'
});
