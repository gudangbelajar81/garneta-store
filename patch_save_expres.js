const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Add saveExpresCart to updateExpresRow
let updateExpresRowEnd = `         if (btnEksekusi) {
             btnEksekusi.disabled = totalCuan <= 0;
         }
      };`;
let newUpdateExpresRowEnd = `         if (btnEksekusi) {
             btnEksekusi.disabled = totalCuan <= 0;
         }
         window.saveExpresCart();
      };`;
mainJs = mainJs.replace(updateExpresRowEnd, newUpdateExpresRowEnd);

// 2. Add saveExpresCart to removeExpres
let removeExpresEnd = `      window.removeExpres = function(index) {
       if (window.expresCart && window.expresCart[index]) {
          window.expresCart[index] = {name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0};
          render();
       }
      };`;
let newRemoveExpresEnd = `      window.removeExpres = function(index) {
       if (window.expresCart && window.expresCart[index]) {
          window.expresCart[index] = {name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0};
          window.saveExpresCart();
          render();
       }
      };`;
mainJs = mainJs.replace(removeExpresEnd, newRemoveExpresEnd);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched updateExpresRow and removeExpres to call saveExpresCart");
