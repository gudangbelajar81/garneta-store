USE default;
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
