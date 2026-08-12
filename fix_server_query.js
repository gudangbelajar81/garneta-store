const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

c = c.replace(/const sql = \`SELECT id, name, unit, unit_ecer, sale_price, sale_price_ecer, stock FROM products ORDER BY name ASC\`;/g,
  \`const sql = \\\`SELECT id, name, category, unit, unit_ecer, sale_price, sale_price_ecer, stock FROM products ORDER BY name ASC\\\`;\`);

// Also fix the load action mapping
c = c.replace(/products: \(r\) => \(\{/g, \`products: (r) => ({\`); // Let's check how mapProduct is defined.

fs.writeFileSync('server.js', c);
console.log('Done');
