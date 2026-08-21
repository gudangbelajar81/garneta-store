const fs = require('fs');
let txt = fs.readFileSync('assets/js/main.js', 'utf8');

txt = txt.replace('if (typeof alert !== "undefined") alert("ERROR SILUMAN TERDETEKSI:\\n" + (e.error || e.message));', 'console.log("Error siluman terdeteksi (suppressed)");');
txt = txt.replace('if (typeof alert !== "undefined") alert("JANJI GAGAL (Promise Rejection):\\n" + (e.reason && e.reason.message ? e.reason.message : e.reason));', 'console.log("Promise rejection (suppressed)");');

fs.writeFileSync('assets/js/main.js', txt);
console.log("Alerts suppressed!");
