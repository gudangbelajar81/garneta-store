const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Fix the length check in Jual Expres
mainJs = mainJs.replace('if (!window.expresCart || window.expresCart.length !== 20) {', 'if (!window.expresCart || window.expresCart.length < 20) {');

// 2. Fix the checkbox check to use productId as primary match
let oldCheck = `const isChecked = (window.expresCart = window.expresCart || window.getInitialExpresCart(false))?.some(r => (r.name || "").trim().toLowerCase() === (row.name || "").trim().toLowerCase()) ? "checked" : "";`;
let newCheck = `const isChecked = (window.expresCart = window.expresCart || window.getInitialExpresCart(false))?.some(r => r.productId ? String(r.productId) === String(row.id) : (r.name || "").trim().toLowerCase() === (row.name || "").trim().toLowerCase()) ? "checked" : "";`;
mainJs = mainJs.replace(oldCheck, newCheck);

// 3. Fix toggleExpresItem to use productId
let oldToggleFind = `const exists = window.expresCart.some(r => (r.name || "").trim().toLowerCase() === productName.toLowerCase());`;
let newToggleFind = `const exists = window.expresCart.some(r => r.productId ? String(r.productId) === String(product.id) : (r.name || "").trim().toLowerCase() === productName.toLowerCase());`;
mainJs = mainJs.replace(oldToggleFind, newToggleFind);

let oldToggleRemove = `const idx = window.expresCart.findIndex(r => (r.name || "").trim().toLowerCase() === productName.toLowerCase());`;
let newToggleRemove = `const idx = window.expresCart.findIndex(r => r.productId ? String(r.productId) === String(product.id) : (r.name || "").trim().toLowerCase() === productName.toLowerCase());`;
mainJs = mainJs.replace(oldToggleRemove, newToggleRemove);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched expresCart logic");
