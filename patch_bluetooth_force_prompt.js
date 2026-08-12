const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// Patch 1: Remove globalBluetoothDevice check in ngitungPrintBluetoothCheckout
let oldCheck1 = /if \(!window\.globalBluetoothDevice\) \{\s*window\.globalBluetoothDevice = await navigator\.bluetooth\.requestDevice\(\{\s*acceptAllDevices: true,\s*optionalServices: KNOWN_PRINTER_UUIDS\.map\(u => u\.svc\)\s*\}\);\s*\}\s*device = window\.globalBluetoothDevice;/g;

let newCheck1 = `
              // Force requestDevice every time to prevent Phantom Connections (Micro POS behavior)
              device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
              });
              window.globalBluetoothDevice = device;
`;

mainJs = mainJs.replace(oldCheck1, newCheck1);

// Patch 2: Remove globalBluetoothDevice check in ngitungPrintBluetooth (if any)
let oldCheck2 = /if \(!window\.globalBluetoothDevice\) \{\s*window\.globalBluetoothDevice = await navigator\.bluetooth\.requestDevice\(\{\s*filters: \[\{services: \['000018f0-0000-1000-8000-00805f9b34fb'\]\}\],\s*optionalServices: \['000018f0-0000-1000-8000-00805f9b34fb'\]\s*\}\);\s*\}\s*const device = window\.globalBluetoothDevice;/g;

let newCheck2 = `
              const device = await navigator.bluetooth.requestDevice({
                  acceptAllDevices: true,
                  optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
              });
`;

mainJs = mainJs.replace(oldCheck2, newCheck2);

// Patch 3: In connectGatt, wrap with Promise.race timeout (5 seconds max) to prevent indefinite hang
let oldGattLoop = /const connectGatt = async \(retryCount = 3\) => \{\s*try \{\s*return await device\.gatt\.connect\(\);\s*\} catch \(err\) \{\s*if \(retryCount <= 1\) throw err;\s*await new Promise\(resolve => setTimeout\(resolve, 500\)\);\s*return connectGatt\(retryCount - 1\);\s*\}\s*\};/g;

let newGattLoop = `const connectGatt = async (retryCount = 3) => {
                  try {
                    return await Promise.race([
                        device.gatt.connect(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout connect GATT")), 5000))
                    ]);
                  } catch (err) {
                    if (retryCount <= 1) throw err;
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return connectGatt(retryCount - 1);
                  }
                };`;

mainJs = mainJs.replace(oldGattLoop, newGattLoop);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log('Forced requestDevice and timeout patched');
