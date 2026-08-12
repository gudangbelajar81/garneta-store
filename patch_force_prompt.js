const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// Patch 1: Force requestDevice every time
let target = `
          let device;
          try {
            if (!window.globalBluetoothDevice) {
                window.globalBluetoothDevice = await navigator.bluetooth.requestDevice({
                  acceptAllDevices: true,
                  optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
                });
            }
            device = window.globalBluetoothDevice;
`;

let replacement = `
          let device;
          try {
            // Force prompt (Micro POS behavior)
            device = await navigator.bluetooth.requestDevice({
                  acceptAllDevices: true,
                  optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
            });
            window.globalBluetoothDevice = device;
`;

// Remove exact whitespace differences by using a very simple regex
mainJs = mainJs.replace(/if\s*\(!window\.globalBluetoothDevice\)\s*\{\s*window\.globalBluetoothDevice = await navigator\.bluetooth\.requestDevice\(\{\s*acceptAllDevices: true,\s*optionalServices: KNOWN_PRINTER_UUIDS\.map\(u => u\.svc\)\s*\}\);\s*\}\s*device = window\.globalBluetoothDevice;/g, 
`device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
});
window.globalBluetoothDevice = device;`);

// Patch 2: timeout
let targetGatt = `const connectGatt = async (retryCount = 3) => {
                try {
                  return await device.gatt.connect();
                } catch (err) {
                  if (retryCount <= 1) throw err;
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return connectGatt(retryCount - 1);
                }
              };`;

mainJs = mainJs.replace(/const connectGatt = async \(retryCount = 3\) => \{\s*try \{\s*return await device\.gatt\.connect\(\);\s*\} catch \(err\) \{\s*if \(retryCount <= 1\) throw err;\s*await new Promise\(resolve => setTimeout\(resolve, 500\)\);\s*return connectGatt\(retryCount - 1\);\s*\}\s*\};/g, 
`const connectGatt = async (retryCount = 3) => {
    try {
        return await Promise.race([
            device.gatt.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout connect GATT")), 4000))
        ]);
    } catch (err) {
        if (retryCount <= 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 500));
        return connectGatt(retryCount - 1);
    }
};`);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Forced prompt patched!");
