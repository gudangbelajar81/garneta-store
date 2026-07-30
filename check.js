const fs = require('fs');
const acorn = require('acorn');
const code = fs.readFileSync('assets/js/main.js', 'utf8');
const ast = acorn.parse(code, { ecmaVersion: 2022, locations: true });

function walk(node, ancestors) {
  if (!node) return;
  if (node.type === 'CallExpression' && node.callee && node.callee.name === 'load' && node.loc.start.line > 6380) {
     console.log('load() at line ' + node.loc.start.line + ' is inside:');
     for (let a of ancestors) {
        if (a.type.includes('Function')) {
           console.log(a.type + ' at line ' + a.loc.start.line + ' (id: ' + (a.id ? a.id.name : 'anonymous') + ')');
        }
     }
  }

  for (let key in node) {
    if (key === 'loc') continue;
    let child = node[key];
    if (Array.isArray(child)) {
      for (let c of child) walk(c, ancestors.concat([node]));
    } else if (child && typeof child === 'object' && child.type) {
      walk(child, ancestors.concat([node]));
    }
  }
}

walk(ast, []);
