const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

// Replace duplicate button
content = content.replace(
    '            \\n            \\n            \',
    '            \\n            \'
);

fs.writeFileSync(file, content);
console.log('Done removing duplicate tab');