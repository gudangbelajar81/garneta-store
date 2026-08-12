const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

const target = "            !nameStr.includes('api') && !idStr.includes('api')) {";
const replacement = "            !nameStr.includes('api') && !idStr.includes('api') && !nameStr.includes('username') && !idStr.includes('username')) {";

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done');