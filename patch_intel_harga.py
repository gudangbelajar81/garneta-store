import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

intel_harga_logic = """
      // [NEW] AI Intel Harga (Price Tracker)
      if (state.route === 'dashboard') {
         let lastReadStr = localStorage.getItem('intel_harga_last_read');
         if (!lastReadStr) {
            let maxTime = (state.data.priceHistory || []).reduce((max, h) => Math.max(max, new Date(h.createdAt || 0).getTime()), Date.now());
            localStorage.setItem('intel_harga_last_read', maxTime);
            lastReadStr = maxTime;
         }
         let lastReadTime = Number(lastReadStr);
         
         let unreadHistories = (state.data.priceHistory || []).filter(h => new Date(h.createdAt || 0).getTime() > lastReadTime);
         
         if (unreadHistories.length > 0) {
            let changedProducts = [...new Set(unreadHistories.map(h => h.productId))];
            let priceChanges = [];
            
            changedProducts.forEach(pid => {
               let prodHistories = (state.data.priceHistory || []).filter(h => h.productId === pid);
               prodHistories.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
               
               let unreadForProd = prodHistories.filter(h => new Date(h.createdAt || 0).getTime() > lastReadTime);
               let readForProd = prodHistories.filter(h => new Date(h.createdAt || 0).getTime() <= lastReadTime);
               
               if (unreadForProd.length > 0 && readForProd.length > 0) {
                  let newPrice = Number(unreadForProd[0].basePrice || 0);
                  let oldPrice = Number(readForProd[0].basePrice || 0);
                  if (newPrice !== oldPrice && oldPrice > 0) {
                     priceChanges.push({
                        name: unreadForProd[0].product || "Barang",
                        old: oldPrice,
                        new: newPrice,
                        diff: newPrice - oldPrice
                     });
                  }
               }
            });
            
            let existingIntelBanner = document.getElementById('intel-harga-banner');
            let brandLogo = document.getElementById('brand-logo');
            let brandTitle = document.querySelector('.brand-title');
            
            if (priceChanges.length > 0) {
               if (brandLogo) brandLogo.style.opacity = '0';
               if (brandLogo) brandLogo.style.pointerEvents = 'none';
               if (brandTitle) brandTitle.style.opacity = '0';
               
               let bannerHTML = priceChanges.map(c => {
                  let isUp = c.diff > 0;
                  let color = isUp ? "#ef4444" : "#10b981";
                  let icon = isUp ? "📈 NAIK" : "📉 TURUN";
                  let diffStr = Math.abs(c.diff).toLocaleString('id-ID');
                  return `<div style="background:rgba(255,255,255,0.05); padding:10px 14px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid ${color};">
                     <div style="font-size:0.95rem;"><strong>${c.name}</strong></div>
                     <div style="color:${color}; font-weight:bold; font-size:0.95rem;">${icon} Rp ${diffStr}</div>
                  </div>`;
               }).join('');
               
               if (!existingIntelBanner) {
                  existingIntelBanner = document.createElement('div');
                  existingIntelBanner.id = 'intel-harga-banner';
                  existingIntelBanner.style = "background:linear-gradient(135deg, #0f172a, #1e293b); color:white; padding:18px; border-radius:12px; border:1px solid #38bdf8; box-shadow:0 10px 30px rgba(0,0,0,0.6); margin-bottom:20px; animation: slideDown 0.3s ease; position:relative;";
                  
                  existingIntelBanner.innerHTML = `
                     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                           <div style="font-size:24px; filter:drop-shadow(0 0 8px #38bdf8);">🤖</div>
                           <h3 style="margin:0; font-size:16px; font-weight:800; letter-spacing:0.5px; color:#38bdf8; text-shadow:0 0 10px rgba(56,189,248,0.5);">INTEL HARGA PASAR</h3>
                        </div>
                        <button id="close-intel-btn" class="btn" style="background:rgba(255,255,255,0.1); color:white; border:none; border-radius:8px; padding:6px 14px; cursor:pointer; font-size:0.85rem; font-weight:bold; transition:all 0.2s;"><i class="fas fa-times"></i> Tutup</button>
                     </div>
                     <div style="display:flex; flex-direction:column; gap:10px; max-height:300px; overflow-y:auto; padding-right:4px;">${bannerHTML}</div>
                  `;
                  
                  let appendInterval = setInterval(() => {
                     let dashboardContainer = document.getElementById('neural-dashboard-container');
                     if (dashboardContainer && dashboardContainer.parentElement) {
                        dashboardContainer.parentElement.insertBefore(existingIntelBanner, dashboardContainer);
                        clearInterval(appendInterval);
                        
                        document.getElementById('close-intel-btn').onclick = () => {
                           localStorage.setItem('intel_harga_last_read', Date.now());
                           if (brandLogo) brandLogo.style.opacity = '1';
                           if (brandLogo) brandLogo.style.pointerEvents = 'auto';
                           if (brandTitle) brandTitle.style.opacity = '1';
                           existingIntelBanner.remove();
                        };
                     }
                  }, 50);
                  setTimeout(() => clearInterval(appendInterval), 2000);
               } else {
                  let container = existingIntelBanner.querySelector('div:nth-child(2)');
                  if(container) container.innerHTML = bannerHTML;
               }
            } else {
               if (brandLogo) brandLogo.style.opacity = '1';
               if (brandLogo) brandLogo.style.pointerEvents = 'auto';
               if (brandTitle) brandTitle.style.opacity = '1';
               if (existingIntelBanner) existingIntelBanner.remove();
            }
         } else {
            let existingIntelBanner = document.getElementById('intel-harga-banner');
            if (existingIntelBanner) existingIntelBanner.remove();
            let brandLogo = document.getElementById('brand-logo');
            let brandTitle = document.querySelector('.brand-title');
            if (brandLogo) brandLogo.style.opacity = '1';
            if (brandLogo) brandLogo.style.pointerEvents = 'auto';
            if (brandTitle) brandTitle.style.opacity = '1';
         }
      } else {
         let existingIntelBanner = document.getElementById('intel-harga-banner');
         if (existingIntelBanner) existingIntelBanner.remove();
         let brandLogo = document.getElementById('brand-logo');
         let brandTitle = document.querySelector('.brand-title');
         if (brandLogo) brandLogo.style.opacity = '1';
         if (brandLogo) brandLogo.style.pointerEvents = 'auto';
         if (brandTitle) brandTitle.style.opacity = '1';
      }
"""

new_content = content.replace('// [NEW] Global Orderan Reminder', intel_harga_logic + '\n      // [NEW] Global Orderan Reminder')

if len(new_content) > len(content) + 10:
    with open('assets/js/main.js', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Patch applied successfully.")
else:
    print("Failed to find insertion point.")
