const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Tambah adminMenus
code = code.replace(
  /const adminMenus = \[([\s\S]*?)\];/,
  (match) => {
    if (match.includes('"ppob"')) return match;
    return match.replace('["kasbon"', '["ppob", "📱 PPOB"],\n      ["kasbon"');
  }
);

// 2. Tambah superAdminMenus
code = code.replace(
  /const superAdminMenus = \[([\s\S]*?)\];/,
  (match) => {
    if (match.includes('"ppob"')) return match;
    return match.replace('["kasbon"', '["ppob", "📱 PPOB"],\n      ["kasbon"');
  }
);

// 3. Tambah di views
code = code.replace(
  /const views = \{([^}]+)\};/,
  (match, p1) => {
    if (p1.includes('ppob')) return match;
    return `const views = {${p1}, ppob};`;
  }
);

fs.writeFileSync('assets/js/main.js', code, 'utf8');
console.log("Patched main.js");
