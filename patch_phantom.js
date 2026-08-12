const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

let oldConnectGatt = /const connectGatt = async \(retryCount = 3\) => \{[\s\S]*?if \(!server\) throw new Error\("Gagal connect ke GATT server\."\);/g;

let newConnectGatt = `const connectGatt = async (retryCount = 3) => {
                try {
                  return await device.gatt.connect();
                } catch (err) {
                  if (retryCount <= 1) throw err;
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return connectGatt(retryCount - 1);
                }
              };

              let server;
              for (let attempt = 1; attempt <= 2; attempt++) {
                server = await connectGatt();
                if (server) break;
                if (device.gatt && device.gatt.connected) {
                  device.gatt.disconnect();
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }

              if (!server) throw new Error("Gagal connect ke GATT server.");`;

mainJs = mainJs.replace(oldConnectGatt, newConnectGatt);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log('Phantom shield injected in main.js');
