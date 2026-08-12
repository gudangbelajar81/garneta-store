const fs = require('fs');
const file = 'index.html';
let content = fs.readFileSync(file, 'utf8');

const target = '<input id="login-name" list="login-users" autocomplete="username" placeholder="Masukkan nama Super Admin">';
const replacement = '<input id="login-name" list="login-users" autocomplete="off" autocapitalize="off" spellcheck="false" autocorrect="off" style="text-transform: none;" placeholder="Masukkan nama Super Admin">';

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Done index.html');