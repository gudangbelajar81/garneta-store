const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');

const replacement = `let cat = (prod.category || '').toLowerCase();
                  if (cat.includes('sayur') || cat.includes('buah')) {
                      price = 0;
                  } else {
                      price = prod.salePriceEcer || prod.salePrice || prod.basePrice || 0;
                  }`;

c = c.replace(/price = prod\.salePriceEcer \|\| prod\.salePrice \|\| prod\.basePrice \|\| 0;/g, replacement);

fs.writeFileSync('assets/js/main.js', c);
console.log('Done replacing price logic');
