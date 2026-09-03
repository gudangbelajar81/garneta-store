const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// Replace 1: ngitungPrintWhatsApp
mainJs = mainJs.replace(
    /let opName = data\.operator \|\| \(state\.role === "Super Admin" \? "Umum" : \(state\.currentUser\?\.name \|\| "Kasir"\)\);/g,
    `let opName = data.operator || (state.role === "Super Admin" ? "Umum" : (state.currentUser?.name || "Kasir"));
           opName = opName.replace(/^Admin\\s+/i, '');`
);

// Replace 2: printStruk (Bluetooth)
mainJs = mainJs.replace(
    /let tOperator = data\.operator \|\| \(state\.role === "Super Admin" \? "Umum" : \(state\.currentUser\?\.name \|\| "Kasir"\)\);/g,
    `let tOperator = data.operator || (state.role === "Super Admin" ? "Umum" : (state.currentUser?.name || "Kasir"));
            tOperator = tOperator.replace(/^Admin\\s+/i, '');`
);

// Check if any replace missed
fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched opName and tOperator successfully.");
