const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');
c = c.replace('showToast(res.message + "\\n\\n(DEMO LINK: " + res.demoLink + ", "info");");', 'Swal.fire({title: "DEMO LINK", text: res.message + "\\n\\n(DEMO LINK: " + res.demoLink + ")", icon: "info"});');
fs.writeFileSync('assets/js/main.js', c);
