const fs = require("fs");
let code = fs.readFileSync("index.html", "utf8");

if (!code.includes("kentang.js")) {
  code = code.replace(
    '<script src="/assets/js/main.js"></script>',
    '<script src="/assets/js/kentang.js"></script>\n  <script src="/assets/js/main.js"></script>'
  );
  fs.writeFileSync("index.html", code);
  console.log("Patched index.html with kentang.js");
} else {
  console.log("kentang.js already present in index.html");
}
