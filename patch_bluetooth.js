const fs = require('fs');
let f = fs.readFileSync('assets/js/main.js', 'utf8');

// 1. Add bluetooth to titles
f = f.replace(/gaji: \["Gaji & Kasbon", "Manajemen data gaji karyawan dan pinjaman \(kasbon\)."(.*?)\]/, `gaji: ["Gaji & Kasbon", "Manajemen data gaji karyawan dan pinjaman (kasbon)."],
          bluetooth: ["Bluetooth Printer", "Pengaturan kertas cetak dan koneksi printer thermal Bluetooth."]`);

// 2. Add bluetooth button
f = f.replace(/\$\{settingsTabButton\("gaji", "GAJI & BON", tab\)\}/, 
`\$\{settingsTabButton("gaji", "GAJI & BON", tab)\}
            \$\{settingsTabButton("bluetooth", "BLUETOOTH", tab)\}`);

// 3. Remove existing "Koneksi Hardware Kasir" from `warna` tab (or just from wherever it is)
f = f.replace(/<div class="theme-panel" style="margin-top:20px;">\s*<div class="api-section-title">Koneksi Hardware Kasir<\/div>\s*<p class="muted">Jika ingin mengganti printer Bluetooth ke perangkat lain, silakan reset memori printer di sini\.<\/p>\s*<div class="actions">\s*<button class="btn danger" onclick="window.resetBluetoothPrinter\(\)" type="button">RESET PRINTER BLUETOOTH<\/button>\s*<\/div>\s*<\/div>/, '');

// 4. Add the bluetooth tab content
f = f.replace(/<\/section>`\s*;\s*\}\s*function userForm\(\)/, 
`          \$\{tab === "bluetooth" ? \`
          <div class="api-center-card" style="max-width: 100%;">
            <div class="api-section-title">Pengaturan Ukuran Kertas</div>
            <p class="muted">Pilih ukuran kertas yang sesuai dengan printer Bluetooth Anda.</p>
            <div class="actions" style="margin-bottom: 20px;">
              <select id="printer-paper-size" class="input" style="max-width: 200px;" onchange="localStorage.setItem('printerPaperSize', this.value); showToast('Ukuran kertas disimpan!', 'success')">
                <option value="32" \$\{localStorage.getItem('printerPaperSize') === '32' || !localStorage.getItem('printerPaperSize') ? 'selected' : ''\}>Kecil (58mm)</option>
                <option value="48" \$\{localStorage.getItem('printerPaperSize') === '48' ? 'selected' : ''\}>Besar (80mm)</option>
              </select>
            </div>
            
            <div class="api-section-title">Koneksi Hardware Kasir</div>
            <p class="muted">Jika ingin mengganti printer Bluetooth ke perangkat lain, silakan reset memori printer di sini.</p>
            <div class="actions">
              <button class="btn danger" onclick="window.resetBluetoothPrinter()" type="button">RESET PRINTER BLUETOOTH</button>
            </div>
          </div>
          \` : ''}
        </div>
        </section>\`;
      }
  
      function userForm()`);

// 5. Update padLR function
f = f.replace(/function padLR\(left, right, width = 32\) \{/g, `function padLR(left, right, width) {
            if (width === undefined) width = parseInt(localStorage.getItem('printerPaperSize') || '32');`);

// 6. Update separator in prints
f = f.replace(/\.\.\.encoder\.encode\('--------------------------------\\n'\)/g, `...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\\n")`);
f = f.replace(/\.\.\.encoder\.encode\("--------------------------------\\n"\)/g, `...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\\n")`);

fs.writeFileSync('assets/js/main.js', f);
console.log('Patch complete.');
