const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

mainJs = mainJs.replace(/btnEksekusi\.style\.cursor = 'not-allowed';\s*\}\s*\}/, `btnEksekusi.style.cursor = 'not-allowed';
            }
        }
        window.saveExpresCart();`);

mainJs = mainJs.replace(/window\.expresCart\[index\] = \{name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0\};\s*render\(\);\s*\}/, `window.expresCart[index] = {name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0};
           window.saveExpresCart();
           render();
        }`);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched correctly");
