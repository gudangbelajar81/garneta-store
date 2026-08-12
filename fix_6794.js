const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('showToast("Sukses! Perangkat ini sekarang bisa digunakan untuk Login Cepat (Sidik Jari/Face ID, "success");.");')) {
    lines[i] = lines[i].replace('showToast("Sukses! Perangkat ini sekarang bisa digunakan untuk Login Cepat (Sidik Jari/Face ID, "success");.");', 'showToast("Sukses! Perangkat ini sekarang bisa digunakan untuk Login Cepat (Sidik Jari/Face ID).", "success");');
  }
}
fs.writeFileSync('assets/js/main.js', lines.join('\n'));
