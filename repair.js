const fs = require('fs');
let txt = fs.readFileSync('assets/js/main.js', 'utf8');

const anchorBefore = "'Multifinance':        ['Multifinance'],\\n    };\\n    } catch(e) {";
let idxStart = txt.indexOf("} catch(e) {", txt.indexOf("'Multifinance':        ['Multifinance'],"));

if (idxStart > -1) {
  const targetEnd = "if (filtered.length === 1 && !ppobSelectedSku) { setTimeout(() => window.selectPpobProduct(filtered[0].buyer_sku_code), 50); }";
  const endIdx = txt.indexOf(targetEnd, idxStart);
  if (endIdx > -1) {
    
    // BUT WAIT! We need to put BACK the code that was originally there before the duplicate!
    // The original code at the end of renderPpobGrid before the bad replacement was:
    const originalCode = `    const cats = catMap[ppobActiveTab] || ['Pulsa'];
    const filtered = ppobProducts.filter(p => {
      const brand = p.brand || '';
      const category = p.category || '';
      if (ppobBrand && brand.toUpperCase() !== ppobBrand.toUpperCase()) return false;
      return cats.some(cat => category.toLowerCase() === cat.toLowerCase());
    }).sort((a,b) => Number(a.sale_price) - Number(b.sale_price));

    if (filtered.length === 1 && !ppobSelectedSku) { setTimeout(() => window.selectPpobProduct(filtered[0].buyer_sku_code), 50); }

    if (filtered.length === 0) {
      grid.innerHTML = \`
        <div style="grid-column:1/-1; text-align:center; padding:40px 16px; color:var(--soft-text, #888);">
          <div style="font-size:40px; margin-bottom:8px;">🔍</div>
          <div style="font-size:13px; font-weight:600;">Tidak ada produk untuk kategori/provider ini</div>
        </div>\`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const gangguan = p.buyer_product_status === 'gangguan';
      const selected = p.buyer_sku_code === ppobSelectedSku;
      return \`
        <div class="ppob-card" id="card-\${p.buyer_sku_code}"
          onclick="\${gangguan ? '' : \`selectPpobProduct('\${p.buyer_sku_code}')\`}"
          title="\${gangguan ? 'Produk sedang gangguan, tidak bisa dipesan' : ''}"
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

`;

    // But wait! `endIdx` is at `if (filtered.length === 1 && !ppobSelectedSku)`.
    // We must find the TRUE end of the duplicate block which is just before `// === Footer ===`.
    const footerMarker = "  // === Footer ===";
    const endOfDuplicate = txt.indexOf(footerMarker, endIdx);
    
    if (endOfDuplicate > -1) {
      txt = txt.substring(0, idxStart) + originalCode + txt.substring(endOfDuplicate);
      fs.writeFileSync('assets/js/main.js', txt);
      console.log('Successfully repaired main.js! Sliced from ' + idxStart + ' to ' + endOfDuplicate);
    } else {
      console.log('footerMarker not found');
    }
  } else {
    console.log('targetEnd not found');
  }
} else {
  console.log('idxStart not found');
}
