const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/\/assets\/images\/garneta-basket-logo\.svg/g, '/assets/images/garneta-logo-g.png');
fs.writeFileSync('index.html', html);

let manifest = fs.readFileSync('manifest.webmanifest', 'utf8');
manifest = manifest.replace(/garneta-logo-g\.svg/g, 'garneta-logo-g.png');
fs.writeFileSync('manifest.webmanifest', manifest);

let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/garneta-logo-g\.svg/g, 'garneta-logo-g.png');
fs.writeFileSync('sw.js', sw);

console.log("Success: Replaced logo paths");
