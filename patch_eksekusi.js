const fs = require('fs');
const file = 'assets/js/main.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'onclick="window.eksekusiCuan(${totalCuan})" >',
  '// Will replace differently'
);
fs.writeFileSync('patch_eksekusi.js', content);