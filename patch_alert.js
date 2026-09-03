const fs = require('fs');
let kentangJs = fs.readFileSync('assets/js/kentang.js', 'utf8');

kentangJs = kentangJs.replace(
    /alert\("Error: " \+ err\.message\);/,
    `alert("GAGAL MEMPROSES FOTO: " + err.message + "\\n\\nPastikan API Key masih hidup, settingan Provider benar (Jika pakai GoAPI, pilih GoAPI), dan tidak error.");`
);

fs.writeFileSync('assets/js/kentang.js', kentangJs);
console.log("Patched kentang.js alert successfully.");
