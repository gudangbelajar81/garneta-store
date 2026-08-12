const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<p>Terima Kasih<\/p>/g, "<p>\\</p>");

fs.writeFileSync(file, content);
console.log('Done');