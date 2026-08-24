USE railway;
SELECT 'users' AS tbl, COUNT(*) AS total FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'purchases', COUNT(*) FROM purchases
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'payrolls', COUNT(*) FROM payrolls
UNION ALL SELECT 'activity_logs', COUNT(*) FROM activity_logs
UNION ALL SELECT 'app_settings', COUNT(*) FROM app_settings;
