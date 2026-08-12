const fs = require('fs');
let content = fs.readFileSync('assets/js/main.js', 'utf8');
if (!content.includes('window.showToast = function')) {
    content = 'window.showToast = function(msg, icon = "info") { if (typeof Swal !== "undefined") { Swal.fire({toast: true, position: "top-end", showConfirmButton: false, timer: 3000, title: msg, icon: icon}); } else { alert(msg); } };\n' + content;
    fs.writeFileSync('assets/js/main.js', content);
    console.log('showToast injected!');
} else {
    console.log('already injected');
}
