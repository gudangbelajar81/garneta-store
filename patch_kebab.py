import re

with open('assets/js/smart-search.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_barang = """  function renderBarangQuickCard(product) {
    const grosirStr = product.salePrice ? formatRupiah(product.salePrice) + (product.unit ? ' / ' + escapeHtml(product.unit) : '') : '';
    const ecerStr = product.salePriceEcer ? formatRupiah(product.salePriceEcer) + (product.unitEcer ? ' / ' + escapeHtml(product.unitEcer) : '') : '';
    const priceDisplay = [grosirStr, ecerStr].filter(Boolean).join(' | ') || 'Harga belum diatur';

    return '<div class="quick-action-card compact" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 10px; overflow: visible;">' +
      '<div style="flex: 1; min-width: 0;">' +
        '<div style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;">📦 ' + escapeHtml(product.name) + '</div>' +
        '<div style="font-size: 0.8rem; color: #888; margin-top: 2px;">' + priceDisplay + ' &bull; ' + escapeHtml(product.category || 'Umum') + '</div>' +
      '</div>' +
      '<div style="position: relative;">' +
        '<button style="padding: 4px 10px; font-size: 1.2rem; border-radius: 4px; background: transparent; color: #ccc; border: none; box-shadow: none; cursor: pointer;" onclick="document.querySelectorAll(\\\'.kebab-dropdown\\\').forEach(d => { if(d !== this.nextElementSibling) d.classList.add(\\\'hidden\\\') }); this.nextElementSibling.classList.toggle(\\\'hidden\\\'); event.stopPropagation();">⋮</button>' +
        '<div class="kebab-dropdown hidden" style="position: absolute; right: 0; top: 100%; background: #1a2235; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 4px; z-index: 1000; display: flex; flex-direction: column; gap: 2px; min-width: 120px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">' +
          '<button class="btn soft" style="text-align: left; padding: 8px 12px; border: none; background: transparent; color: #fff; width: 100%; justify-content: flex-start; font-size: 0.85rem;" onclick="quickActionEditBarang(\\\'' + product.id + '\\\')">✏️ Edit</button>' +
          '<button class="btn soft" style="text-align: left; padding: 8px 12px; border: none; background: transparent; color: #fff; width: 100%; justify-content: flex-start; font-size: 0.85rem;" onclick="quickActionLihatSupplier(\\\'' + product.id + '\\\')">🏢 Suplier</button>' +
          '<button class="btn danger" style="text-align: left; padding: 8px 12px; border: none; background: rgba(255,71,87,0.1); color: #ff4757; width: 100%; justify-content: flex-start; font-size: 0.85rem;" onclick="quickActionHapusBarang(\\\'' + product.id + '\\\', \\\'' + escapeHtml(product.name).replace(/'/g, "\\\\'") + '\\\')">🗑️ Hapus</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }"""

new_supplier = """  function renderSupplierQuickCard(supplier) {
    return '<div class="quick-action-card compact" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 10px; overflow: visible;">' +
      '<div style="flex: 1; min-width: 0;">' +
        '<div style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;">🏭 ' + escapeHtml(supplier.name) + '</div>' +
        '<div style="font-size: 0.8rem; color: #888; margin-top: 2px;">' + escapeHtml(supplier.phone || '-') + '</div>' +
      '</div>' +
      '<div style="position: relative;">' +
        '<button style="padding: 4px 10px; font-size: 1.2rem; border-radius: 4px; background: transparent; color: #ccc; border: none; box-shadow: none; cursor: pointer;" onclick="document.querySelectorAll(\\\'.kebab-dropdown\\\').forEach(d => { if(d !== this.nextElementSibling) d.classList.add(\\\'hidden\\\') }); this.nextElementSibling.classList.toggle(\\\'hidden\\\'); event.stopPropagation();">⋮</button>' +
        '<div class="kebab-dropdown hidden" style="position: absolute; right: 0; top: 100%; background: #1a2235; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 4px; z-index: 1000; display: flex; flex-direction: column; gap: 2px; min-width: 120px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">' +
          '<button class="btn soft" style="text-align: left; padding: 8px 12px; border: none; background: transparent; color: #fff; width: 100%; justify-content: flex-start; font-size: 0.85rem;" onclick="quickActionEditSupplier(\\\'' + supplier.id + '\\\')">✏️ Edit</button>' +
          '<button class="btn soft" style="text-align: left; padding: 8px 12px; border: none; background: transparent; color: #fff; width: 100%; justify-content: flex-start; font-size: 0.85rem;" onclick="quickActionLihatBarangSupplier(\\\'' + supplier.id + '\\\')">📦 Barang</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }"""

content = re.sub(r'(?s)  function renderBarangQuickCard.*?</div>\';\n  }', new_barang, content)
content = re.sub(r'(?s)  function renderSupplierQuickCard.*?</div>\';\n  }', new_supplier, content)

with open('assets/js/smart-search.js', 'w', encoding='utf-8') as f:
    f.write(content)
