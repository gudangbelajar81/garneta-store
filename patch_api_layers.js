const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

let oldRender = `              <span>
                <strong>${key.providerLabel}</strong> LAYER ${key.layer} - ${key.masked}<br>
                <small>Model otomatis: ${key.model}${key.message ? \` - \${key.message}\` : ""}</small>
              </span>`;
              
let newRender = `              <span>
                <strong>${key.providerLabel}</strong> LAYER ${key.layer} - ${key.name ? key.name : 'Tanpa Nama'}<br>
                <small>Key: ${key.masked}</small><br>
                <small>Model otomatis: ${key.model}${key.message ? \` - \${key.message}\` : ""}</small>
              </span>`;

if (mainJs.includes(oldRender)) {
    mainJs = mainJs.replace(oldRender, newRender);
    fs.writeFileSync('assets/js/main.js', mainJs);
    console.log("Patched renderApiKeyLayers successfully");
} else {
    console.log("Could not find old string to replace. Let me check what it looks like.");
    let idx = mainJs.indexOf("renderApiKeyLayers(keys)");
    console.log(mainJs.substring(idx, idx + 500));
}
