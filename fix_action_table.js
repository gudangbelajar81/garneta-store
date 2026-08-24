const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

const oldActionTable = `        return prefix + keys.map((key) => td(formatter ? formatter(key, row[key]) : row[key], key)).join("") + \`<td class="actions" style="position:relative; overflow:visible; width:40px;"><button class="btn soft" onclick="document.querySelectorAll('.kebab-menu').forEach(m => m !== this.nextElementSibling && m.classList.add('hidden')); this.nextElementSibling.classList.toggle('hidden'); event.stopPropagation();" style="padding: 2px 6px !important; font-size: 13px !important; min-height: 24px !important; line-height: 1 !important; border-radius: 4px !important;">⋮</button><div class="kebab-menu hidden" style="position:absolute; right:36px; top:50%; transform:translateY(-50%); background:var(--card-bg); border:1px solid var(--line); border-radius:8px; padding:6px 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.8); z-index: 50; display:flex; flex-direction:row; gap:12px; min-width:unset;"><button data-duplicate="\${collection}" data-id="\${row.id}" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none; display: \${collection === 'products' ? 'inline-block' : 'none'};" title="Duplikat">📄</button><button data-edit="\${collection}" data-id="\${row.id}" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none;">✏️</button><button data-delete="\${collection}" data-id="\${row.id}" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none;">🗑️</button></div></td>\`;`;

const newActionTable = `        return prefix + keys.map((key) => td(formatter ? formatter(key, row[key]) : row[key], key)).join("") + \`<td class="actions" style="position:relative; overflow:visible; width:40px;"><button class="btn soft kebab-toggle" onclick="document.querySelectorAll('.kebab-menu').forEach(m => m !== this.nextElementSibling && m.classList.add('hidden')); this.nextElementSibling.classList.toggle('hidden'); event.stopPropagation();" style="padding: 2px 6px !important; font-size: 13px !important; min-height: 24px !important; line-height: 1 !important; border-radius: 4px !important;">⋮</button><div class="kebab-menu hidden" style="position:absolute; right:36px; top:50%; transform:translateY(-50%); background:var(--card-bg); border:1px solid var(--line); border-radius:8px; padding:6px 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.8); z-index: 50; display:flex; flex-direction:row; gap:12px; min-width:unset;"><button onclick="event.stopPropagation(); window.handleMenuAction('duplicate', '\${collection}', '\${row.id}')" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none; display: \${collection === 'products' ? 'inline-block' : 'none'};" title="Duplikat">📄</button><button onclick="event.stopPropagation(); window.handleMenuAction('edit', '\${collection}', '\${row.id}')" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none;">✏️</button><button onclick="event.stopPropagation(); window.handleMenuAction('delete', '\${collection}', '\${row.id}')" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none;">🗑️</button></div></td>\`;`;

const injectActionFunc = `
    // Global action handler untuk kebab menu
    window.handleMenuAction = async function(action, collection, id) {
      // Sembunyikan menu
      document.querySelectorAll('.kebab-menu').forEach(m => m.classList.add('hidden'));
      
      if (action === 'edit') {
        if (collection === "shopping") {
          if(typeof fillShoppingForm === 'function') fillShoppingForm(id);
          return;
        }
        if(typeof fillForm === 'function') fillForm(collection, id);
      } else if (action === 'duplicate') {
        if(typeof fillForm === 'function') fillForm(collection, id);
        setTimeout(() => {
            const form = document.querySelector(\`form[data-form="\${collection}"]\`);
            if (form && form.elements.id) form.elements.id.value = "";
            if (window.showToast) window.showToast("Data diduplikat. Silakan ubah lalu Simpan.", "info");
        }, 50);
      } else if (action === 'delete') {
        if (collection === "shopping") {
          if(typeof saveShoppingRows === 'function' && typeof shoppingRows === 'function') {
             saveShoppingRows(shoppingRows().filter((row) => String(row.id) !== String(id)));
             render();
          }
          return;
        }

        // Optimistic Delete
        const collectionMap = {
          products: "products", purchases: "purchases", sales: "sales",
          employees: "employees", cashAdvances: "cashAdvances", payrolls: "payrolls",
          users: "users", suppliers: "suppliers"
        };
        const stateKey = collectionMap[collection];
        let removed = null;
        if (stateKey && window.state && window.state.data[stateKey]) {
          removed = window.state.data[stateKey].find(r => String(r.id) === String(id));
          window.state.data[stateKey] = window.state.data[stateKey].filter(r => String(r.id) !== String(id));
          if(typeof render === 'function') render();
        }

        try {
          if(typeof gas === 'function') await gas("remove", { collection, id });
        } catch (err) {
          if (removed && stateKey && window.state.data[stateKey]) {
            window.state.data[stateKey].push(removed);
            window.state.data[stateKey].sort((a, b) => Number(b.id) - Number(a.id));
          }
          if(typeof render === 'function') render();
          alert("Gagal menghapus: " + err.message);
        }
      }
    };
`;

if (code.includes('function actionTable')) {
    code = code.replace(oldActionTable, newActionTable);
    if (!code.includes('window.handleMenuAction')) {
       // Insert it just before actionTable
       code = code.replace('function actionTable', injectActionFunc + '\n    function actionTable');
    }
    fs.writeFileSync('assets/js/main.js', code);
    console.log("Success: Replaced actionTable logic to use window.handleMenuAction");
} else {
    console.log("Error: actionTable not found");
}
