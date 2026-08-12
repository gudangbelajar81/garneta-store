const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

const target = "!nameStr.includes('username') && !idStr.includes('username')) {";
const replacement = "!nameStr.includes('username') && !idStr.includes('username') && !idStr.includes('login') && !idStr.includes('email')) {";

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done');