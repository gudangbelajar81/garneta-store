const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>', '<script src="/assets/js/vendor/sweetalert2.all.min.js"></script>');
fs.writeFileSync('index.html', html);
