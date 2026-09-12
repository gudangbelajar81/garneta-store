const fs = require('fs');
let content = fs.readFileSync('assets/js/main.js', 'utf8');

const targetFunction = `window.kalkulasiNotepadPembelian = function() {`;
const index = content.indexOf(targetFunction);

if (index !== -1) {
    // Remove everything from the start of the function to the end
    content = content.substring(0, index);
    
    // Add the correct function back
    content += `window.kalkulasiNotepadPembelian = function() {
    const el = document.getElementById('pembelian-notepad-input');
    if (!el) return;
    const text = el.value.trim();
    const resultDiv = document.getElementById('pembelian-notepad-result');
    if (!text) {
        resultDiv.innerHTML = '';
        return;
    }
    
    const lines = text.split('\\n');
    let totalBelanja = 0;
    
    let html = \`<div style="overflow-x:auto;">
    <table class="table" style="width:100%; border-collapse:collapse; margin-top:10px;">
      <thead>
        <tr style="border-bottom:2px solid var(--border); text-align:left;">
          <th style="padding:10px;">Input</th>
          <th style="padding:10px;">Barang Ditemukan</th>
          <th style="padding:10px; text-align:right;">Jumlah</th>
          <th style="padding:10px; text-align:right;">Harga Dasar</th>
          <th style="padding:10px; text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>\`;
      
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        const parts = line.split(/\\s+/);
        let qtyStr = '';
        let nameStr = '';
        
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (/^\\d/.test(lastPart)) {
                qtyStr = lastPart;
                nameStr = parts.slice(0, -1).join(' ');
            } else {
                nameStr = line;
                qtyStr = '1';
            }
        } else {
            nameStr = line;
            qtyStr = '1';
        }
        
        const qtyNum = parseFloat(qtyStr.replace(/[^0-9.]/g, '')) || 1;
        
        const searchName = nameStr.toLowerCase();
        let matchedProduct = null;
        if (state.data.products) {
            matchedProduct = state.data.products.find((product) => {
                if (product.name && String(product.name).toLowerCase() === searchName) return true;
                if (product.aliases) {
                    const aliasStr = String(product.aliases).toLowerCase();
                    if (aliasStr.includes(searchName)) {
                        const aliasList = aliasStr.split(/[,/]+/).map(a => a.trim());
                        if (aliasList.includes(searchName)) return true;
                    }
                }
                return false;
            });
        }
        
        let dikenali = '<span style="color:var(--garneta-red); font-weight:bold;">Rp 0 (Tidak Ada)</span>';
        let hargaSatuan = 0;
        
        if (matchedProduct) {
            dikenali = \`<span style="color:var(--garneta-green); font-weight:bold;">? \${escapeHtml(matchedProduct.name)}</span>\`;
            hargaSatuan = matchedProduct.basePrice || 0;
        }
        
        const subtotal = qtyNum * hargaSatuan;
        totalBelanja += subtotal;
        
        html += \`<tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:10px;">\${escapeHtml(nameStr)}</td>
          <td style="padding:10px;">\${dikenali}</td>
          <td style="padding:10px; text-align:right; font-weight:bold;">\${qtyStr}</td>
          <td style="padding:10px; text-align:right;">Rp \${hargaSatuan.toLocaleString('id-ID')}</td>
          <td style="padding:10px; text-align:right; font-weight:bold;">Rp \${subtotal.toLocaleString('id-ID')}</td>
        </tr>\`;
    });
    
    html += \`</tbody>
        <tfoot>
            <tr style="background:rgba(255,255,255,0.05);">
                <th colspan="4" style="text-align:right; font-size:1.1rem; padding:15px;">GRAND TOTAL ESTIMASI:</th>
                <th style="text-align:right; font-size:1.2rem; padding:15px; color:var(--garneta-cyan);">Rp \${totalBelanja.toLocaleString('id-ID')}</th>
            </tr>
        </tfoot>
    </table></div>\`;
    
    resultDiv.innerHTML = html;
};
`;

    fs.writeFileSync('assets/js/main.js', content, 'utf8');
    console.log("Syntax fixed!");
} else {
    console.log("Function not found.");
}
