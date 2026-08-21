const fs = require('fs');
let txt = fs.readFileSync('assets/js/main.js', 'utf8');

const targetStr = `    grid.innerHTML = filtered.map(p => {
      const gangguan = p.buyer_product_status === 'gangguan';
      const selected = p.buyer_sku_code === ppobSelectedSku;
  // === Footer ===`;

const replacement = `    grid.innerHTML = filtered.map(p => {
      const gangguan = p.buyer_product_status === 'gangguan';
      const selected = p.buyer_sku_code === ppobSelectedSku;
      return \`
        <div class="ppob-card \${selected ? 'selected' : ''} \${gangguan ? 'gangguan' : ''}" id="card-\${p.buyer_sku_code}"
          onclick="\${gangguan ? '' : \`selectPpobProduct('\${p.buyer_sku_code}')\`}"
          title="\${gangguan ? 'Produk sedang gangguan' : ''}"
          style="border:\${selected ? '2px solid #E3222B' : '1px solid #eee'}; border-radius:16px; padding:18px 14px; text-align:center; position:relative; transition:all 0.15s; background:\${gangguan ? '#fafafa' : selected ? '#fff8f7' : '#fff'}; cursor:\${gangguan ? 'not-allowed' : 'pointer'}; opacity:\${gangguan ? '0.55' : '1'}; box-shadow:\${selected ? '0 0 0 3px rgba(245,61,45,0.1)' : '0 1px 4px rgba(0,0,0,0.04)'};pointer-events:\${gangguan ? 'none' : 'auto'};">
          <div style="font-size:11px; color:#bbb; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">\${p.brand}</div>
          <div style="font-size:15px; font-weight:bold; margin-bottom:10px; color:\${gangguan ? '#bbb' : '#222'}; line-height:1.4;">\${p.product_name}</div>
          <div style="color:\${gangguan ? '#ccc' : '#E3222B'}; font-weight:bold; font-size:18px;">\${rupiah(Math.round(Number(p.sale_price)))}</div>
          \${gangguan ? '<div style="position:absolute;top:6px;right:6px;background:#ff9800;color:#fff;padding:2px 7px;font-size:10px;border-radius:20px;font-weight:bold;">GANGGUAN</div>' : ''}
          \${selected ? '<div style="position:absolute;top:6px;left:6px;font-size:14px;">✅</div>' : ''}
        </div>
      \`;
    }).join('');
  };

  // === Select Product ===
  window.selectPpobProduct = function(sku) {
    const p = ppobProducts.find(x => x.buyer_sku_code === sku);
    if (!p || p.buyer_product_status === 'gangguan') return;
    ppobSelectedSku = ppobSelectedSku === sku ? '' : sku;
    updatePpobFooter();
    renderPpobGrid();
  };

  // === Footer ===`;

if (txt.includes(targetStr)) {
  txt = txt.replace(targetStr, replacement);
  fs.writeFileSync('assets/js/main.js', txt);
  console.log('Restored selectPpobProduct successfully!');
} else {
  console.log('Target string not found!');
}
