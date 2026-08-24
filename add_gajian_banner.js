const fs = require('fs');
let code = fs.readFileSync('assets/js/main.js', 'utf8');

const targetStr = `document.body.appendChild(existingBanner);`;

const salaryNotifCode = `
            // [NEW] Global Gajian Reminder (Only for Super Admin)
            let pendingGajian = [];
            if (typeof isSuperAdmin === 'function' && isSuperAdmin()) {
               let currentMonth = todayT.getMonth();
               let currentYear = todayT.getFullYear();
               
               (state.data.employees || []).forEach(e => {
                  if (e.status !== 'Aktif' || !e.payDate) return;
                  let payD = parseInt(e.payDate);
                  if (isNaN(payD) || payD < 1 || payD > 31) return;
                  
                  // Calculate next payday
                  let nextPay = new Date(currentYear, currentMonth, payD);
                  nextPay.setHours(0,0,0,0);
                  
                  // Jika tanggal hari ini sudah MELEWATI payD, berarti gajian bulan ini sudah lewat. Gajian berikutnya bulan depan.
                  // Misalnya hari ini tanggal 26, payD tanggal 25. Maka nextPay digeser ke bulan depan.
                  if (todayT.getTime() > nextPay.getTime()) {
                     nextPay.setMonth(nextPay.getMonth() + 1);
                  }
                  
                  // Calculate difference in days
                  let diffTime = nextPay.getTime() - todayT.getTime();
                  let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                  
                  // If <= 2 days, show warning
                  if (diffDays <= 2 && diffDays >= 0) {
                     pendingGajian.push({ emp: e, days: diffDays });
                  }
               });
               
               let existingGajiBanner = document.getElementById('gajian-global-banner');
               if (pendingGajian.length > 0) {
                  let texts = pendingGajian.map(p => {
                     let hText = p.days === 0 ? "HARI INI!" : (p.days === 1 ? "BESOK!" : "H-2");
                     let bonText = "";
                     const unpaidBons = (state.data.cashAdvances || []).filter(c => c.employeeId == p.emp.id && c.status === 'Belum Lunas');
                     const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
                     if (totalBon > 0) {
                         bonText = \` <strong style="color:#fde047;">(Ada Kasbon: \${rupiah(totalBon)})</strong>\`;
                     }
                     return \`<div style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">\${p.emp.name} (\${hText})\${bonText}</div>\`;
                  });
                  let bannerText = texts.join('');
                  
                  if (!existingGajiBanner) {
                     existingGajiBanner = document.createElement('div');
                     existingGajiBanner.id = 'gajian-global-banner';
                     existingGajiBanner.style = \`position:fixed; top:20px; right:20px; background:linear-gradient(135deg, #7e22ce, #9333ea); color:white; padding:16px 24px; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.4); z-index:9998; display:flex; align-items:center; gap:16px; cursor:pointer; transition: transform 0.3s ease; border: 1px solid rgba(255,255,255,0.2); max-width: 400px;\`;
                     
                     // Supaya tidak numpuk dengan orderan banner
                     if (document.getElementById('orderan-global-banner')) {
                         existingGajiBanner.style.top = '140px';
                     }
                     
                     existingGajiBanner.innerHTML = \`
                        <div style="font-size:32px; filter:drop-shadow(0 0 10px rgba(255,255,255,0.5));">💸</div>
                        <div style="flex: 1;">
                           <h4 style="margin:0 0 6px 0; font-size:16px; font-weight:800; letter-spacing:0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">WAKTUNYA GAJIAN BOS!</h4>
                           <div style="margin:0; font-size:14px; line-height:1.4;">\${bannerText}</div>
                        </div>
                        <div style="margin-left:auto; padding-left:16px;">
                           <button class="btn" onclick="event.stopPropagation(); this.parentElement.parentElement.remove()" style="background:rgba(0,0,0,0.2); border:none; color:white; padding:6px 10px; border-radius:6px; cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                     \`;
                     existingGajiBanner.onclick = () => { 
                        window.showPage('gaji'); 
                        existingGajiBanner.remove(); 
                     };
                     document.body.appendChild(existingGajiBanner);
                     
                     // Animasi pulse halus
                     setInterval(() => {
                        let b = document.getElementById('gajian-global-banner');
                        if (b) {
                           b.style.transform = 'scale(1.02)';
                           setTimeout(() => b.style.transform = 'scale(1)', 300);
                        }
                     }, 5000);
                  } else {
                     existingGajiBanner.querySelector('div > div').innerHTML = bannerText;
                  }
               } else if (existingGajiBanner) {
                  existingGajiBanner.remove();
               }
            }
`;

if (code.includes(targetStr) && !code.includes('gajian-global-banner')) {
    code = code.replace(targetStr, targetStr + '\n' + salaryNotifCode);
    fs.writeFileSync('assets/js/main.js', code);
    console.log("Success: Added Gajian Banner");
} else {
    console.log("Error or already exists");
}
