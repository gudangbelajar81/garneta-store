var fs = require("fs");
var path = require("path");
var exec = require("child_process").execSync;

// ====================================================
// GARNETA DEPLOY MASTER v2.0 — SINGLE DOOR (F: ONLY)
// Server langsung jalan dari F:. Tidak perlu sync.
// Jalankan: node deploy.js  (dari folder manapun di F:)
// ====================================================

var ROOT = "F:\\BLUEPRINT APLIKASI\\GARNETA STORE\\garneta store";
var TS = Date.now();

console.log("============================================");
console.log("  GARNETA DEPLOY v2.0 - SATU PINTU");
console.log("  Folder: " + ROOT);
console.log("  TS: " + TS);
console.log("============================================");

// 1. BUMP CACHE_NAME in sw.js (WAJIB agar browser deteksi update)
console.log("\n[1/3] Bumping sw.js CACHE_NAME...");
var swPath = path.join(ROOT, "sw.js");
var sw = fs.readFileSync(swPath, "utf8");
var oldName = (sw.match(/const CACHE_NAME = '([^']+)'/) || ["","?"])[1];
sw = sw.replace(/const CACHE_NAME = '[^']+'/g, "const CACHE_NAME = 'garneta-store-v13-" + TS + "'");
fs.writeFileSync(swPath, sw, "utf8");
console.log("  " + oldName + " -> garneta-store-v13-" + TS);

// 2. BUMP ?v= in index.html + ensure kentang.js is included
console.log("\n[2/3] Bumping index.html...");
var htmlPath = path.join(ROOT, "index.html");
var html = fs.readFileSync(htmlPath, "utf8");
html = html.replace(/[?]v=\d+/g, "?v=" + TS);
if (html.indexOf("kentang.js") === -1) {
  html = html.replace(
    '<script src="/assets/js/main.js',
    '<script src="/assets/js/kentang.js?v=' + TS + '"></script>\n  <script src="/assets/js/main.js'
  );
  console.log("  INFO: kentang.js injected");
}
fs.writeFileSync(htmlPath, html, "utf8");
console.log("  OK: version bumped");

// 3. PM2 restart
console.log("\n[3/3] Restarting PM2 inventory...");
try { exec("pm2 restart inventory", {stdio:"inherit"}); }
catch(e) { console.log("  WARN: " + e.message); }

console.log("\n============================================");
console.log("  DEPLOY SELESAI!");
console.log("  Instruksi ke User:");
console.log("  Tutup tab browser / incognito, buka baru.");
console.log("============================================");
