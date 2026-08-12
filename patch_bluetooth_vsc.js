const fs = require('fs');
let f = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Update KNOWN_PRINTER_UUIDS
let newUUIDs = `const KNOWN_PRINTER_UUIDS = [
          { svc: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' }, // Standard
          { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', char: '49535343-8841-43f4-a8d4-ecbe34729bb3' }, // Printer China 
          { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' }, // Epson/Star
          { svc: '0000fee7-0000-1000-8000-00805f9b34fb', char: '0000fec8-0000-1000-8000-00805f9b34fb' }, // Tencent / WeChat BLE
          { svc: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' }, // Custom generic
          { svc: '0000ffe0-0000-1000-8000-00805f9b34fb', char: '0000ffe1-0000-1000-8000-00805f9b34fb' }, // HM-10 BLE Serial
          { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', char: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' }, // Nordic UART Service (NUS)
          { svc: '0000af30-0000-1000-8000-00805f9b34fb', char: '0000af31-0000-1000-8000-00805f9b34fb' }, // Xprinter / Qirui
          { svc: '0000ae30-0000-1000-8000-00805f9b34fb', char: '0000ae31-0000-1000-8000-00805f9b34fb' }, // Variant Xprinter
          { svc: '0000fff0-0000-1000-8000-00805f9b34fb', char: '0000fff2-0000-1000-8000-00805f9b34fb' } // Generic 58mm V2
        ];`;
f = f.replace(/const KNOWN_PRINTER_UUIDS = \[\s*\{[\s\S]*?\];/g, newUUIDs);

// 2. Update the write logic for both functions
let oldWrite = /if \(characteristic\.properties && characteristic\.properties\.writeWithoutResponse\) \{\s*await characteristic\.writeValueWithoutResponse\(buffer\.slice\(i, i \+ 100\)\);\s*\} else \{\s*await characteristic\.writeValue\(buffer\.slice\(i, i \+ 100\)\);\s*\}/g;

let newWrite = `if (characteristic.properties && characteristic.properties.writeWithoutResponse) {
                try {
                  if (typeof characteristic.writeValueWithoutResponse === 'function') {
                    await characteristic.writeValueWithoutResponse(buffer.slice(i, i + 100));
                  } else {
                    await characteristic.writeValue(buffer.slice(i, i + 100));
                  }
                } catch (e) {
                  await characteristic.writeValue(buffer.slice(i, i + 100));
                }
            } else {
                await characteristic.writeValue(buffer.slice(i, i + 100));
            }`;
            
f = f.replace(oldWrite, newWrite);

fs.writeFileSync('assets/js/main.js', f);
console.log('Patch complete.');
