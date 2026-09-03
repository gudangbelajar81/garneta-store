const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

let startIndex = mainJs.indexOf('<div class="api-key-display-row">');
let spanStart = mainJs.indexOf('<span>', startIndex);
let spanEnd = mainJs.indexOf('</span>', spanStart) + 7;
let oldSpan = mainJs.substring(spanStart, spanEnd);

let newSpan = "<span>\n" +
              "  <strong>${key.providerLabel}</strong> LAYER ${key.layer} - ${key.name ? key.name : 'Tanpa Nama'}<br>\n" +
              "  <small>Key: ${key.masked}</small><br>\n" +
              "  <small>Model otomatis: ${key.model}${key.message ? ` - ${key.message}` : ''}</small>\n" +
              "</span>";

mainJs = mainJs.replace(oldSpan, newSpan);
fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched renderApiKeyLayers successfully");
