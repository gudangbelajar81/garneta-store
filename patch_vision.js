const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /if \(provider === "openai" \|\| provider === "kie"\) return executeOpenAiVision/g,
    `if (provider === "openai" || provider === "kie" || provider === "goapi" || provider === "custom") return executeOpenAiVision`
);

fs.writeFileSync('server.js', serverJs);
console.log("Patched server.js executeVisionRequest successfully.");
