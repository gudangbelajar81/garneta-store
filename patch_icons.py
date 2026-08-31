import re

with open('assets/js/smart-search.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_barang = """  function renderBarangQuickCard(product) {
    const grosirStr = product.salePrice ? formatRupiah(product.salePrice) + (product.unit ? ' / ' + escapeHtml(product.unit) : '') : '';
    const ecerStr = product.salePriceEcer ? formatRupiah(product.salePriceEcer) + (product.unitEcer ? ' / ' + escapeHtml(product.unitEcer) : '') : '';
    const priceDisplay = [grosirStr, ecerStr].filter(Boolean).join(' | ') || 'Harga belum diatur';

    return '<div class="quick-action-card compact" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 10px;">' +
      '<div style="flex: 1; min-width: 0;">' +
        '<div style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;">📦 ' + escapeHtml(product.name) + '</div>' +
        '<div style="font-size: 0.8rem; color: #888; margin-top: 2px;">' + priceDisplay + ' &bull; ' + escapeHtml(product.category || 'Umum') + '</div>' +
      '</div>' +
      '<div style="display: flex; gap: 14px; align-items: center;">' +
        '<span style="cursor: pointer; font-size: 1.1rem; opacity: 0.8;" onclick="quickActionEditBarang(\\\'' + product.id + '\\\')" title="Edit">✏️</span>' +
        '<span style="cursor: pointer; font-size: 1.1rem; opacity: 0.8;" onclick="quickActionLihatSupplier(\\\'' + product.id + '\\\')" title="Suplier">🏢</span>' +
        '<span style="cursor: pointer; font-size: 1.1rem; opacity: 0.8;" onclick="quickActionHapusBarang(\\\'' + product.id + '\\\', \\\'' + escapeHtml(product.name).replace(/'/g, "\\\\'") + '\\\')" title="Hapus">🗑️</span>' +
      '</div>' +
    '</div>';
  }"""

new_supplier = """  function renderSupplierQuickCard(supplier) {
    return '<div class="quick-action-card compact" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 10px;">' +
      '<div style="flex: 1; min-width: 0;">' +
        '<div style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 0.95rem;">🏭 ' + escapeHtml(supplier.name) + '</div>' +
        '<div style="font-size: 0.8rem; color: #888; margin-top: 2px;">' + escapeHtml(supplier.phone || '-') + '</div>' +
      '</div>' +
      '<div style="display: flex; gap: 14px; align-items: center;">' +
        '<span style="cursor: pointer; font-size: 1.1rem; opacity: 0.8;" onclick="quickActionEditSupplier(\\\'' + supplier.id + '\\\')" title="Edit">✏️</span>' +
        '<span style="cursor: pointer; font-size: 1.1rem; opacity: 0.8;" onclick="quickActionLihatBarangSupplier(\\\'' + supplier.id + '\\\')" title="Barang">📦</span>' +
      '</div>' +
    '</div>';
  }"""

content = re.sub(r'(?s)  function renderBarangQuickCard.*?</div>\';\n  }', new_barang, content)
content = re.sub(r'(?s)  function renderSupplierQuickCard.*?</div>\';\n  }', new_supplier, content)

with open('assets/js/smart-search.js', 'w', encoding='utf-8') as f:
    f.write(content)
