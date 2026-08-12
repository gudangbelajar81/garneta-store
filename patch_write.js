const fs = require('fs');
let f = fs.readFileSync('assets/js/main.js', 'utf8');

// Update writing to support writeWithoutResponse
let replacement = `for (let i = 0; i < buffer.length; i += 100) {
            if (characteristic.properties && characteristic.properties.writeWithoutResponse) {
                await characteristic.writeValueWithoutResponse(buffer.slice(i, i + 100));
            } else {
                await characteristic.writeValue(buffer.slice(i, i + 100));
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          }`;

f = f.replace(/for \(let i = 0; i < buffer\.length; i \+= 100\) \{\s*await characteristic\.writeValue\(buffer\.slice\(i, i \+ 100\)\);\s*await new Promise\(resolve => setTimeout\(resolve, 50\)\);\s*\}/g, replacement);

fs.writeFileSync('assets/js/main.js', f);
console.log('writeWithoutResponse patch applied.');
