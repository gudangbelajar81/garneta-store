const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');
code = code.replace(/<input type="date" id="expres-date" value="[^"]*"/, '<input type="date" id="expres-date" value="${today()}"');
fs.writeFileSync('assets/js/main.js', code);
