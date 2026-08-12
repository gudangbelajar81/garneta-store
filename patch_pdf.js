const fs = require('fs');
let mainJs = fs.readFileSync('assets/js/main.js', 'utf8');

// The PDF function
let pdfFunction = `
window.printReceiptPDF = function() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak PDF.");
    return;
  }
  
  const dateStr = new Date().toLocaleString('id-ID');
  
  let itemsHtml = '';
  Object.values(window.keranjang || {}).forEach(item => {
    itemsHtml += \`
      <div class="item-row">
        <span>\${item.nama} x\${item.qty}</span>
        <span>Rp \${(item.harga * item.qty).toLocaleString('id-ID')}</span>
      </div>
    \`;
  });

  const total = window.ngitungTotalRaw || 0;
  const bayarEl = document.getElementById("ngitung-inline-bayar");
  const bayar = bayarEl && bayarEl.value ? Number(bayarEl.value) : 0;
  
  let paymentDetails = '';
  if (bayar >= total) {
    paymentDetails = \`
      <div class="total-row font-normal"><span>Tunai</span><span>Rp \${bayar.toLocaleString('id-ID')}</span></div>
      <div class="total-row font-normal"><span>Kembali</span><span>Rp \${(bayar - total).toLocaleString('id-ID')}</span></div>
    \`;
  } else {
    paymentDetails = \`
      <div class="total-row font-normal"><span>Status</span><span>KASBON (BELUM LUNAS)</span></div>
      \${bayar > 0 ? \`<div class="total-row font-normal"><span>Titip (DP)</span><span>Rp \${bayar.toLocaleString('id-ID')}</span></div>\` : ''}
      <div class="total-row font-normal"><span>Sisa Kurang</span><span>Rp \${(total - bayar).toLocaleString('id-ID')}</span></div>
    \`;
  }

  const html = \`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk Pembayaran</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; font-size: 14px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .header p { margin: 4px 0; font-size: 14px; }
          .divider { border-top: 1px dashed #000; margin: 12px 0; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 6px; }
          .font-normal { font-weight: normal; font-size: 14px; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; }
          @media print {
            body { width: 100%; margin: 0; padding: 10px; }
            @page { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>GARNETA STORE</h2>
          <div class="divider"></div>
          <p style="text-align: left; font-size: 12px;">Tgl: \${dateStr}</p>
        </div>
        <div class="divider"></div>
        \${itemsHtml}
        <div class="divider"></div>
        <div class="total-row"><span>TOTAL</span><span>Rp \${total.toLocaleString('id-ID')}</span></div>
        \${paymentDetails}
        <div class="divider"></div>
        <div class="footer">
          <p>Terima Kasih</p>
        </div>
        <script>
          window.onload = () => { 
            setTimeout(() => { window.print(); }, 500);
          }
        </script>
      </body>
    </html>
  \`;

  printWindow.document.write(html);
  printWindow.document.close();
};
`;

mainJs += "\n" + pdfFunction;

// Now add the button into the "pembayaran sukses" modal
let oldModalBtn = /<button class="btn btn-primary" onclick="window\.printStruk\(\)">\s*<span class="icon">ðŸ–¨ï¸Ž<\/span>\s*Print Struk\s*<\/button>/g;
let newModalBtn = `<button class="btn btn-primary" onclick="window.printStruk()">
                <span class="icon">ðŸ–¨ï¸Ž</span> Print Struk
              </button>
              <button class="btn btn-secondary" onclick="window.printReceiptPDF()">
                <span class="icon">ðŸ“„</span> Cetak PDF (Darurat)
              </button>`;
mainJs = mainJs.replace(oldModalBtn, newModalBtn);

fs.writeFileSync('assets/js/main.js', mainJs);
console.log('PDF fallback injected in main.js');
