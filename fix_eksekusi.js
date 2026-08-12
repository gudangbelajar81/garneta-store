const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Remove hardcoded totalCuan in onclick
c = c.replace('onclick="window.eksekusiCuan(${totalCuan})"', 'onclick="window.eksekusiCuan()"');

// 2. Compute total directly inside eksekusiCuan function
c = c.replace('window.eksekusiCuan = async function(total) {', 'window.eksekusiCuan = async function() {\n        const total = (window.expresCart || []).reduce((sum, r) => sum + (r.profit || 0), 0);');

// 3. Update updateExpresRow to toggle button state dynamically
const replacementUpdateRow = `
       const totalCuan = window.expresCart.reduce((sum, r) => sum + (r.profit || 0), 0);
       const totalEl = document.getElementById('expres-total');
       if (totalEl) {
           totalEl.innerText = rupiah(totalCuan);
       }
       
       const btnEksekusi = document.getElementById('btn-eksekusi-cuan');
       if (btnEksekusi) {
           if (totalCuan > 0) {
               btnEksekusi.disabled = false;
               btnEksekusi.style.opacity = '1';
               btnEksekusi.style.cursor = 'pointer';
           } else {
               btnEksekusi.disabled = true;
               btnEksekusi.style.opacity = '0.5';
               btnEksekusi.style.cursor = 'not-allowed';
           }
       }
`;

c = c.replace(`       const totalCuan = window.expresCart.reduce((sum, r) => sum + (r.profit || 0), 0);
       const totalEl = document.getElementById('expres-total');
       if (totalEl) {
           totalEl.innerText = rupiah(totalCuan);
       }`, replacementUpdateRow);

fs.writeFileSync('assets/js/main.js', c);
