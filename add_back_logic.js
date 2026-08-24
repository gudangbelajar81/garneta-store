const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Toggle visibility
const targetStr1 = 'el("content").innerHTML = views[state.route] ? views[state.route]() : `<div class="card"><h2>Menu tidak ditemukan</h2><p class="muted">Route: ${state.route}</p></div>`;';
const replaceStr1 = targetStr1 + `
      const globalBackBtn = document.getElementById('global-back-btn');
      if (globalBackBtn) {
          if (state.route === 'dashboard') {
              globalBackBtn.style.display = 'none';
          } else {
              globalBackBtn.style.display = 'flex';
          }
      }
`;

if (code.includes(targetStr1) && !code.includes('globalBackBtn.style.display')) {
    code = code.replace(targetStr1, replaceStr1);
}

// 2. Add event listener
const targetStr2 = 'el("smart-search-input").addEventListener("blur", () => {';
const replaceStr2 = `
    const gBack = document.getElementById('global-back-btn');
    if (gBack) {
       gBack.addEventListener('click', () => window.showPage('dashboard'));
    }
` + targetStr2;

if (code.includes(targetStr2) && !code.includes("gBack.addEventListener('click'")) {
    code = code.replace(targetStr2, replaceStr2);
}

fs.writeFileSync('assets/js/main.js', code);
console.log("Success: modified main.js for back btn");
