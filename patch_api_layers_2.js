const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

let regex = /<span>\s*<strong>\$\{key\.providerLabel\}<\/strong> LAYER \$\{key\.layer\} - \$\{key\.masked\}<br>\s*<small>Model otomatis:/g;

mainJs = mainJs.replace(regex, `<span>
                <strong>\${key.providerLabel}</strong> LAYER \${key.layer} - \${key.name ? key.name : 'Tanpa Nama'}<br>
                <small>Key: \${key.masked}</small><br>
                <small>Model otomatis:`);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched renderApiKeyLayers successfully");
