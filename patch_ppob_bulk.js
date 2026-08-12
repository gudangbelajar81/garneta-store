const fs = require('fs');
let code = fs.readFileSync('ppob.js', 'utf8');

const regex = /for\s*\(const\s*p\s*of\s*products\)\s*\{[\s\S]*?totalSynced\+\+;\s*\}/;

const newLoop = 
      // BULK INSERT OPTIMIZATION (Chunked)
      const chunkSize = 200;
      for (let i = 0; i < products.length; i += chunkSize) {
        const chunk = products.slice(i, i + chunkSize);
        
        const placeholders = [];
        const values = [];

        for (const p of chunk) {
          const price = Number(p.price);
          let markup = 2000;
          if (price >= 100000 && price < 500000) markup = 5000;
          else if (price >= 500000) markup = 10000;
          const salePrice = price + markup;

          placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
          values.push(
            p.buyer_sku_code, p.product_name, p.category, p.brand, currentCmd === 'prepaid' ? 'Prabayar' : 'Pascabayar',
            p.seller_name, price, p.buyer_product_status ? 'normal' : 'gangguan', 
            p.seller_product_status ? 'normal' : 'gangguan', p.unlimited_stock ? 1 : 0, 
            p.stock || 0, p.multi ? 1 : 0, p.start_cut_off, p.end_cut_off, p.desc || '', markup, salePrice
          );
        }

        const sql = \
          INSERT INTO ppob_products (
            buyer_sku_code, product_name, category, brand, type, seller_name, price,
            buyer_product_status, seller_product_status, unlimited_stock, stock, multi,
            start_cut_off, end_cut_off, desc_text, markup_amount, sale_price
          ) VALUES \
          ON DUPLICATE KEY UPDATE
            product_name = VALUES(product_name), category = VALUES(category), brand = VALUES(brand),
            price = VALUES(price), buyer_product_status = VALUES(buyer_product_status),
            seller_product_status = VALUES(seller_product_status), stock = VALUES(stock),
            start_cut_off = VALUES(start_cut_off), end_cut_off = VALUES(end_cut_off),
            desc_text = VALUES(desc_text), markup_amount = VALUES(markup_amount), sale_price = VALUES(sale_price)
        \;
        
        await db.query(sql, values);
        totalSynced += chunk.length;
      }
;

code = code.replace(regex, newLoop);
fs.writeFileSync('ppob.js', code);
console.log('Done optimizing ppob.js');