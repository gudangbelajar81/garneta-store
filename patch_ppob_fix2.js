const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Add error handling to renderPpobGrid
if (!mainJs.includes('catch(err) { showToast("Error render PPOB: "')) {
  mainJs = mainJs.replace(
    'window.renderPpobGrid = function() {',
    'window.renderPpobGrid = function() {\n    try {'
  );
  
  // Find the end of renderPpobGrid
  const searchStr = `    grid.innerHTML = filtered.map(p => {`;
  const splitIdx = mainJs.indexOf(searchStr);
  if (splitIdx > -1) {
    let endIdx = mainJs.indexOf('};', splitIdx);
    // Be careful, there might be inner functions or map callbacks.
    // The map callback ends with `}).join('');` then `};` for the function.
    endIdx = mainJs.indexOf("}).join('');\n  };", splitIdx);
    if (endIdx > -1) {
      mainJs = mainJs.substring(0, endIdx) + 
               "}).join('');\n    } catch(err) {\n      showToast(\"Error render PPOB: \" + err.message, \"error\");\n      console.error(err);\n    }\n  };" + 
               mainJs.substring(endIdx + "}).join('');\n  };".length);
    } else {
      console.log('Could not find end of renderPpobGrid');
    }
  }
}

// 2. Change switchPpobTab
mainJs = mainJs.replace(
  /document\.querySelectorAll\('\.ppob-cat'\)\.forEach\(el => el\.classList\.remove\('ppob-cat-active'\)\);\s*if \(event && event\.currentTarget\) event\.currentTarget\.classList\.add\('ppob-cat-active'\);/g,
  `document.querySelectorAll('.ppob-cat').forEach(el => {
      if (el.getAttribute('data-tab') === tab) el.classList.add('ppob-cat-active');
      else el.classList.remove('ppob-cat-active');
    });`
);

// 3. Change switchPpobMainType
mainJs = mainJs.replace(
  /document\.querySelectorAll\('\.ppob-type-btn'\)\.forEach\(el => el\.classList\.remove\('ppob-type-active'\)\);\s*if \(event && event\.currentTarget\) event\.currentTarget\.classList\.add\('ppob-type-active'\);/g,
  `document.querySelectorAll('.ppob-type-btn').forEach(el => {
      const isPra = el.innerText.toLowerCase().includes('prabayar') && !el.innerText.toLowerCase().includes('pascabayar');
      const isPasca = el.innerText.toLowerCase().includes('pascabayar');
      if (type === 'prabayar' && isPra) el.classList.add('ppob-type-active');
      else if (type === 'pascabayar' && isPasca) el.classList.add('ppob-type-active');
      else el.classList.remove('ppob-type-active');
    });`
);

fs.writeFileSync('assets/js/main.js', mainJs);

// Patch app-updates.css
let css = fs.readFileSync('assets/css/app-updates.css', 'utf8');
if (!css.includes('touch-action: manipulation;')) {
  css = css.replace(
    /-webkit-tap-highlight-color: transparent;/g,
    'touch-action: manipulation;\n  -webkit-tap-highlight-color: transparent;'
  );
  fs.writeFileSync('assets/css/app-updates.css', css);
}

// Update version in index.html to force cache bust
let html = fs.readFileSync('index.html', 'utf8');
const newVersion = Date.now().toString();
html = html.replace(/main\.js\?v=\d+/g, `main.js?v=${newVersion}`);
html = html.replace(/app-updates\.css\?v=\d+/g, `app-updates.css?v=${newVersion}`);
fs.writeFileSync('index.html', html);

console.log("Patched successfully.");
