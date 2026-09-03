const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

mainJs = mainJs.replace(
    /text \+= "Kasir: " \+ \(data\.operator \|\| \(state\.role === "Super Admin" \? "Umum" : \(state\.currentUser\?\.name \|\| "Kasir"\)\)\) \+ "\\n";/,
    `let rawOp = data.operator || (state.role === "Super Admin" ? "Umum" : (state.currentUser?.name || "Kasir"));
            text += "Kasir: " + rawOp.replace(/^Admin\\s+/i, '') + "\\n";`
);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log("Patched fourth Kasir successfully.");
