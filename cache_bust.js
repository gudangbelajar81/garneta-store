const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const ts = Date.now();

html = html.replace(/src="([^"]+\.js)\?v=[^"]+"/g, `src="$1?v=${ts}"`);
html = html.replace(/href="([^"]+\.css)\?v=[^"]+"/g, `href="$1?v=${ts}"`);

fs.writeFileSync('index.html', html);
console.log('Success: Cache busted');
