const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

mainJs = mainJs.replace('el("super-login").onclick = () => {', 'if (el("super-login")) el("super-login").onclick = () => {');

fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched main.js for super-login safely");
