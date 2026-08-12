const fs = require('fs');
let f = fs.readFileSync('server.js', 'utf8');

f = f.replace(/if\s*\(password\s*===\s*"LOCAL_DEV_BYPASS"\)/g, 'if (password === "LOCAL_DEV_BYPASS" && req && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1"))');
f = f.replace(/else\s*if\s*\(password\s*===\s*"LOCAL_DEV_BYPASS"\)/g, 'else if (password === "LOCAL_DEV_BYPASS" && req && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1"))');
f = f.replace(/else if \(password === "LOCAL_DEV_BYPASS" && req && \(req\.ip === "127\.0\.0\.1" \|\| req\.ip === "::1" \|\| req\.ip === "::ffff:127\.0\.0\.1"\)\) \{\s*passwordMatch = true;\s*\} else if \(password === "LOCAL_DEV_BYPASS" && req && \(req\.ip === "127\.0\.0\.1" \|\| req\.ip === "::1" \|\| req\.ip === "::ffff:127\.0\.0\.1"\)\) \{/g, 'else if (password === "LOCAL_DEV_BYPASS" && req && (req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1")) {');

fs.writeFileSync('server.js', f);
console.log('Fixed IP check');
