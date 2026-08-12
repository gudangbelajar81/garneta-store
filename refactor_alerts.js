const fs = require('fs');
const path = require('path');

const mainJsPath = path.join(__dirname, 'assets', 'js', 'main.js');
let content = fs.readFileSync(mainJsPath, 'utf-8');

// 1. Ganti alert yang mengandung kata "Gagal" atau "belum" atau error menjadi showToast(..., "error")
content = content.replace(/alert\(([^)]*?(?:Gagal|belum|error|Error|Kosong|kosong)[^)]*?)\);?/g, 'showToast($1, "error");');

// 2. Ganti alert yang mengandung kata "Berhasil" atau "Sukses" menjadi showToast(..., "success")
content = content.replace(/alert\(([^)]*?(?:Berhasil|Sukses|sukses|berhasil)[^)]*?)\);?/g, 'showToast($1, "success");');

// 3. Ganti sisanya dengan showToast(..., "info")
// Hati-hati dengan alert() native defintion (jangan replace alert def)
content = content.replace(/(?<!\bfunction\s)alert\(([^)]+)\);?/g, 'showToast($1, "info");');

// Fix specific known alerts that might have newlines or complex logic
// e.g. alert("KUNCI MASTER ANDA:\n\n" + ...)
content = content.replace(/alert\("KUNCI MASTER ANDA([^)]+)\)/g, 'Swal.fire({title: "KUNCI MASTER", text: "KUNCI MASTER ANDA" + $1, icon: "warning"})');

fs.writeFileSync(mainJsPath, content, 'utf-8');
console.log("Refactoring alerts completed.");
