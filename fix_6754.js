const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');
let lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('showToast(res.message +') && lines[i].includes('DEMO LINK')) {
    lines[i] = '        Swal.fire({title: "DEMO LINK", text: res.message + "\\n\\n(DEMO LINK: " + res.demoLink + ")", icon: "info"});';
  }
}
fs.writeFileSync('assets/js/main.js', lines.join('\n'));
