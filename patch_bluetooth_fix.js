const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// Patch 1: The connectGatt block for Phantom Shield was broken, it threw out of the loop.
let oldGattLoop = /let server;\s*for \(let attempt = 1; attempt <= 2; attempt\+\+\) \{\s*server = await connectGatt\(\);\s*if \(server\) break;\s*if \(device\.gatt && device\.gatt\.connected\) \{\s*device\.gatt\.disconnect\(\);\s*await new Promise\(resolve => setTimeout\(resolve, 1000\)\);\s*\}\s*\}/g;

let newGattLoop = `let server;
              for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                  server = await connectGatt();
                  if (server) break;
                } catch(e) {
                  if (device.gatt && device.gatt.connected) {
                    device.gatt.disconnect();
                  }
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }`;

mainJs = mainJs.replace(oldGattLoop, newGattLoop);

// Patch 2: Reset window.globalBluetoothDevice on error so user can pair again
let oldCatch = /catch \(error\) \{\s*console\.error\(error\);\s*showToast\("Gagal Cetak: " \+ error\.message, "error"\);\s*\}/g;

let newCatch = `catch (error) {
              console.error(error);
              window.globalBluetoothDevice = null;
              showToast("Gagal Cetak: " + error.message, "error");
            }`;

mainJs = mainJs.replace(oldCatch, newCatch);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log('Bluetooth connection reset logic patched');
