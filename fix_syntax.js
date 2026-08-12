const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');
c = c.replace('.catch(e => showToast(, ));', '.catch(e => showToast(e.message || "Error", "error"));');
fs.writeFileSync('assets/js/main.js', c);
