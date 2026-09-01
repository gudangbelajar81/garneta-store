const fs = require("fs");
let code = fs.readFileSync("assets/js/main.js", "utf8");

// 1. Add to Admin Menus
if (!code.includes('["kentang", "🥔 Grosir Kentang"]')) {
  code = code.replace(
    /const adminMenus = \[([\s\S]*?)\];/,
    "const adminMenus = [$1, [\"kentang\", \"🥔 Grosir Kentang\"]];"
  );
  code = code.replace(
    /const superAdminMenus = \[([\s\S]*?)\];/,
    "const superAdminMenus = [$1, [\"kentang\", \"🥔 Grosir Kentang\"]];"
  );
}

// 2. Add to views object
if (!code.includes('kentang: kentang')) {
  code = code.replace(
    /const views = \{([\s\S]*?)\};/,
    "const views = {$1, kentang: typeof kentang !== 'undefined' ? kentang : () => 'Loading...'};"
  );
}

// 3. Inject float button hook
if (!code.includes("injectNotepadPintarToPembelian()")) {
  code = code.replace(
    /el\("content"\)\.innerHTML = views\[state\.route\].*?;/,
    "$& \n        if(state.route === 'pembelian' && typeof injectNotepadPintarToPembelian === 'function') injectNotepadPintarToPembelian();"
  );
}

fs.writeFileSync("assets/js/main.js", code);
console.log("main.js patched successfully.");
