const fs = require('fs');
const txt = fs.readFileSync('assets/js/main.js', 'utf8');
const idx = txt.indexOf('state.route === "settings"');
console.log(txt.substring(Math.max(0, idx - 100), idx + 2000));
