const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

let startIndex = mainJs.indexOf('<div class="api-key-display-row">');
if (startIndex !== -1) {
    let spanStart = mainJs.indexOf('<span>', startIndex);
    let spanEnd = mainJs.indexOf('</span>', spanStart) + 7;
    let oldSpan = mainJs.substring(spanStart, spanEnd);
    
    let newSpan = `<span>
                <strong>${key.providerLabel}</strong> LAYER ${key.layer} - ${key.name ? key.name : 'Tanpa Nama'}<br>
                <small>Key: ${key.masked}</small><br>
                <small>Model otomatis: ${key.model}${key.message ? \` - \${key.message}\` : ""}</small>
              </span>`;
              
    // Escape backticks correctly for JS string template in output
    newSpan = newSpan.replace(/\$\{key\.providerLabel\}/g, '${key.providerLabel}');
    newSpan = newSpan.replace(/\$\{key\.layer\}/g, '${key.layer}');
    newSpan = newSpan.replace(/\$\{key\.name\}/g, '${key.name}');
    newSpan = newSpan.replace(/\$\{key\.masked\}/g, '${key.masked}');
    newSpan = newSpan.replace(/\$\{key\.model\}/g, '${key.model}');
    
    mainJs = mainJs.replace(oldSpan, newSpan);
    fs.writeFileSync('assets/js/main.js', mainJs);
    console.log("Patched renderApiKeyLayers successfully using indexOf");
}
