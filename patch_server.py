import re

with open('server.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'const KASIR_COLLECTIONS = new Set(["products", "suppliers", "purchases", "sales", "priceHistory", "ngitungSales", "orders", "cuan_reports", "ppob_products"]);',
    'const KASIR_COLLECTIONS = new Set(["products", "suppliers", "purchases", "sales", "priceHistory", "ngitungSales", "orders", "cuan_reports", "ppob_products", "kentang_purchases", "kentang_purchase_details"]);'
)

content = content.replace(
    'if (["bootstrap", "sync", "dashboard"].includes(action)) return next();',
    'if (["bootstrap", "sync", "dashboard", "analyzeInvoiceImage", "saveBulkPurchases", "saveBulkKentang"].includes(action)) return next();'
)

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
