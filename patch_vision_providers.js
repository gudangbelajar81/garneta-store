const fs = require('fs');
let serverJs = fs.readFileSync('server.js', 'utf8');

serverJs = serverJs.replace(
    /const VISION_PROVIDERS = \["gemini", "openai", "kie"\];/g,
    `const VISION_PROVIDERS = ["gemini", "openai", "kie", "goapi", "custom"];`
);

fs.writeFileSync('server.js', serverJs);
console.log("Patched VISION_PROVIDERS successfully.");
