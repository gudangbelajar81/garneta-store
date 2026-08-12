const fs = require('fs');
let f = fs.readFileSync('assets/js/main.js', 'utf8');

// Update ngitungPrintBluetooth chunk logic
f = f.replace(/for \(let i = 0; i < buffer\.length; i \+= 512\) \{\s*await characteristic\.writeValue\(buffer\.slice\(i, i \+ 512\)\);\s*\}/, 
`for (let i = 0; i < buffer.length; i += 100) {
            await characteristic.writeValue(buffer.slice(i, i + 100));
            await new Promise(resolve => setTimeout(resolve, 50));
          }`);

// Update ngitungPrintBluetoothCheckout chunk logic
f = f.replace(/for \(let i = 0; i < buffer\.length; i \+= 256\) \{\s*await characteristic\.writeValue\(buffer\.slice\(i, i \+ 256\)\);\s*await new Promise\(resolve => setTimeout\(resolve, 50\)\);\s*\}/,
`for (let i = 0; i < buffer.length; i += 100) {
                await characteristic.writeValue(buffer.slice(i, i + 100));
                await new Promise(resolve => setTimeout(resolve, 50));
              }`);

fs.writeFileSync('assets/js/main.js', f);
console.log('Bluetooth chunk size patched.');
