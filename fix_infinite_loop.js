const fs = require('fs');
let c = fs.readFileSync('assets/js/main.js', 'utf8');
// Fix infinite loop
c = c.replace('else { showToast(msg, "info"); }', 'else { alert(msg); }');

// Fix Swal fallback in eksekusiCuan
c = c.replace(`        const result = await Swal.fire({
            title: 'Yakin Eksekusi?',
            text: \`Data cuan \${isSuperAdmin() ? rupiah(total) : 'Shift Ini'} akan masuk ke Laporan A tanggal hari ini.\`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Eksekusi!',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;`, `        if (typeof Swal !== "undefined") {
            const result = await Swal.fire({
                title: 'Yakin Eksekusi?',
                text: \`Data cuan \${isSuperAdmin() ? rupiah(total) : 'Shift Ini'} akan masuk ke Laporan A tanggal hari ini.\`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, Eksekusi!',
                cancelButtonText: 'Batal'
            });
            if (!result.isConfirmed) return;
        } else {
            if (!confirm(\`Yakin ingin mengeksekusi Total Cuan \${isSuperAdmin() ? rupiah(total) : 'Shift Ini'}? Data akan masuk ke Laporan A tanggal hari ini.\`)) {
                return;
            }
        }`);

fs.writeFileSync('assets/js/main.js', c);
