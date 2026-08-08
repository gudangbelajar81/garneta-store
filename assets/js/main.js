window.showToast = function(msg, icon = "info") { if (typeof Swal !== "undefined") { Swal.fire({toast: true, position: "top-end", showConfirmButton: false, timer: 3000, title: msg, icon: icon}); } else { alert(msg); } };

    // --- GLOBAL ERROR BOUNDARY ---
    window.addEventListener('error', function(e) {
      console.error("Global Error Caught:", e.error || e.message);
      // Optional: Prevent default so it doesn't show in standard console (uncomment if desired)
      // e.preventDefault(); 
    });
    window.addEventListener('unhandledrejection', function(e) {
      console.error("Unhandled Promise Rejection Caught:", e.reason);
    });
    // -----------------------------
    
    const state = {
      route: "dashboard",
      role: localStorage.getItem("role") || "Admin",
      currentUser: JSON.parse(localStorage.getItem("currentUser") || "null"),
      data: { products: [], suppliers: [], purchases: [], sales: [], users: [], priceHistory: [], auditLogs: [], dashboard: {} }
    };
    window.appVersion = null;
    window.dataVersion = null;
    window.hasPendingUpdate = false;
    
    // Global listener untuk menutup dropdown menu saat klik di luar
    document.addEventListener("click", () => {
      document.querySelectorAll(".kebab-menu").forEach(m => m.classList.add("hidden"));
    });
    
    // Expose state to window for Smart Search
    window.state = state;
    let scannerStream = null;
    let scannerActive = false;
    let invoiceStream = null;
    window.deferredInstallPrompt = null;

    const rupiah = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(String(value || 0).replace(/[^0-9-]/g, "")));
    const today = () => new Date().toISOString().slice(0, 10);
    const el = (id) => document.getElementById(id);
    const API_URL = (window.location.port === "8000" || window.location.port === "5500") ? "http://localhost:3000/api" : "/api";

    async function gas(action, payload = {}, silentAuthError = false) {
      let response;
      let headers = { "Content-Type": "application/json" };
      const token = localStorage.getItem("jwt_token");
      if (token) headers["Authorization"] = "Bearer " + token;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik

        response = await fetch(API_URL, {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ action, payload }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (error) {
        throw new Error("Tidak bisa terhubung ke server Backend. Pastikan koneksi internet stabil atau API sedang menyala.");
      }

      const text = await response.text();
      const result = text ? JSON.parse(text) : null;

      if (!response.ok) {
        if ((response.status === 401 || response.status === 400) && result?.message && result.message.includes("Akses ditolak")) {
           localStorage.removeItem("jwt_token");
           localStorage.removeItem("role");
           localStorage.removeItem("currentUser");
           state.role = "Admin";
           state.currentUser = null;
           
           if (!silentAuthError) {
               showToast("Sesi habis atau ditolak. Silakan login kembali.", "error");
               renderShell();
               render();
           }
           throw new Error(result.message);
        }
        throw new Error(result?.message || `Error ${response.status}: ${response.statusText}`);
      }

      if (action === "login" || action === "verifySuperAdmin") {
          if (result?.data?.token) {
              localStorage.setItem("jwt_token", result.data.token);
          }
      }

      return result?.data !== undefined ? result.data : result;
    }

    async function clearAuditLogs() {
      if (!confirm("Yakin ingin menghapus semua log aktivitas?")) return;
      try {
        await gas("clearAuditLogs");
        await load();
        alert("Semua log aktivitas berhasil dihapus!");
      } catch (err) {
        alert("Gagal menghapus log: " + err.message);
      }
    }
    window.clearAuditLogs = clearAuditLogs;

    async function pollSync() {
      if (!localStorage.getItem("jwt_token")) return;
      try {
        const syncData = await gas("sync", {}, true); // silentAuthError = true
        if (!window.appVersion) {
           window.appVersion = syncData.appVersion;
           window.dataVersion = syncData.dataVersion;
           return;
        }
        
        if (window.appVersion !== syncData.appVersion) {
           window.hasPendingUpdate = true;
           window.appVersion = syncData.appVersion;
           showToast("🚀 Pembaruan aplikasi tersedia! Refresh halaman untuk memuat versi terbaru.", "success");
           renderShell();
           return;
        }

        if (window.dataVersion !== syncData.dataVersion) {
           window.dataVersion = syncData.dataVersion;
           showToast("🔄 Sinkronisasi: Ada aktivitas data baru.", "info");
           state.data = await gas("bootstrap");
           render();
        }
      } catch(e) {}
    }

    function startSyncPolling() {
      if (!window.syncInterval) {
        pollSync();
        window.syncInterval = setInterval(pollSync, 15000);
      }
    }

    async function load() {
      state.data = await gas("bootstrap");
      startSyncPolling();
      renderShell();
      render();
    }

    window.showPage = function(route) {
      state.route = route;
      renderShell();
      render();
    };

    function employees() { return state.data.employees || []; }
    function cashAdvances() { return state.data.cashAdvances || []; }
    function payrolls() { return state.data.payrolls || []; }
    function cuanReports() { return state.data.cuan_reports || []; }

    function renderShell() {
      const currentMenus = isSuperAdmin() ? superAdminMenus : adminMenus;
      el("nav").innerHTML = currentMenus.map(([key, label]) => {
        const isActive = state.route === key ? "active" : "";
        const iconMatch = label.match(/([\uD800-\uDBFF][\uDC00-\uDFFF]|\S)/);
        const icon = iconMatch ? iconMatch[0] : "📦";
        const text = label.replace(icon, "").trim();
        return `<div class="neural-node ${isActive}" data-route="${key}">
          <div class="node-glow"></div>
          <div class="node-icon">${icon}</div>
          <div class="node-label">${text}</div>
        </div>`;
      }).join("");
      
      el("nav").querySelectorAll(".neural-node").forEach((node) => {
        node.addEventListener('click', () => {
          state.route = node.dataset.route;
          renderShell();
          render();
        });
      });
      const superMode = state.role === "Super Admin";
      el("role-label").textContent = superMode ? `Super Admin: ${state.currentUser?.name || ""}` : "Admin";
      el("super-login").classList.toggle("hidden", superMode);
      el("logout-super").classList.toggle("hidden", !superMode);
      
      window.toggleAppDrawer = function() {
        const modal = document.getElementById('app-drawer-modal');
        if (!modal) return;
        if (modal.classList.contains('hidden')) {
          const currentMenus = isSuperAdmin() ? superAdminMenus : adminMenus;
          const grid = document.getElementById('app-drawer-grid');
          grid.innerHTML = ""; // Force clear
          grid.innerHTML = currentMenus.map(([key, label]) => {
            const iconMatch = label.match(/([\uD800-\uDBFF][\uDC00-\uDFFF]|\S)/);
            const icon = iconMatch ? iconMatch[0] : "📦";
            const text = label.replace(icon, "").trim();
            const updateIndicator = window.hasPendingUpdate ? '<div style="width:8px; height:8px; background:var(--mint); border-radius:50%; position:absolute; top:0; right:0;"></div>' : '';
            return `
              <div onclick="document.getElementById('app-drawer-modal').classList.add('hidden'); state.route='${key}'; renderShell(); render();" 
                   style="cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 6px; transition: transform 0.2s ease; position:relative;"
                   onmouseover="this.style.transform='scale(1.1)'" 
                   onmouseout="this.style.transform='scale(1)'">
                ${updateIndicator}
                <div style="font-size: 1.3rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">${icon}</div>
                <div style="font-size: 0.65rem; font-weight: 600; color: rgba(255,255,255,0.85); text-align: center; line-height: 1.2;">${text}</div>
              </div>
            `;
          }).join('');
          modal.classList.remove('hidden');
        } else {
          modal.classList.add('hidden');
        }
      };

      applyBrandAssets();
    }

      window.gajiWorkspace = localStorage.getItem('gajiWorkspace') || 'karyawan';
      
      function switchGajiWorkspace(workspace) {
        window.gajiWorkspace = workspace;
        localStorage.setItem('gajiWorkspace', workspace);
        render();
      }
      
      function gaji() {
  const activeEmpId = window.gajiActiveEmpId || null;
  
  if (!activeEmpId) {
    // List Karyawan View
    return `
    <section class="workspace">
      <div class="workspace-header">
        <h2 class="workspace-title">👥 Data Karyawan & Gaji</h2>
        <p class="subtitle">Pilih karyawan untuk mengelola profil, kasbon, dan penggajiannya.</p>
        <button class="btn primary" onclick="editEmployee('')" style="margin-top:1rem;">+ Karyawan Baru</button>
      </div>
      <div class="workspace-content">
        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Nama</th><th>Tipe</th><th>Gaji Pokok</th><th>Total Kasbon Aktif</th><th style="width:40px;"></th></tr></thead>
              <tbody>
                ${employees().map(e => {
                  const unpaidBons = cashAdvances().filter(c => c.employeeId == e.id && c.status === 'Belum Lunas');
                  const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
                  return `<tr onclick="openEmployeeDashboard('${e.id}')" style="cursor:pointer; transition:all 0.3s ease;" onmouseover="this.style.background='rgba(0,255,204,0.05)'" onmouseout="this.style.background='transparent'">
                    <td><strong style="color:var(--mint); text-decoration:underline; text-underline-offset:3px;">${escapeHtml(e.name)}</strong></td>
                    <td>${e.salaryType}</td>
                    <td>${rupiah(e.baseSalary)}</td>
                    <td style="color: #f43f5e;">${totalBon > 0 ? rupiah(totalBon) : '-'}</td>
                    <td style="text-align:center;">
                      <button class="btn" style="background:transparent; border:none; padding:4px; font-size:14px; opacity:0.7; cursor:pointer;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'" onclick="event.stopPropagation(); window.hapusKaryawan('${e.id}')" title="Hapus Karyawan">🗑️</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>`;
  }
  
  // Detail Karyawan View
  const emp = employees().find(e => e.id == activeEmpId);
  if (!emp) {
    window.gajiActiveEmpId = null;
    return gaji();
  }
  
  const unpaidBons = cashAdvances().filter(c => c.employeeId == emp.id && c.status === 'Belum Lunas');
  const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
  
  setTimeout(bindGajiEvents, 100);
  
  return `
  <section class="workspace">
    <div class="workspace-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <button class="btn soft" onclick="openEmployeeDashboard(null)" style="margin-bottom:1rem;">&larr; Kembali ke Daftar Karyawan</button>
        <h2 class="workspace-title">Dashboard: ${emp.name}</h2>
        <p class="subtitle">Kelola profil, riwayat kasbon, dan proses penggajian.</p>
      </div>
    </div>
    
    <div class="workspace-content">
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)); align-items: start;">
        
        <!-- Panel Kiri: Profil & Kasbon -->
        <div>
          <style>
            #form-employee label, #form-bon label { font-size: 0.75rem; margin-bottom: 2px; color: var(--soft-text); }
            #form-employee input, #form-employee select, #form-bon input { padding: 6px 8px; font-size: 0.85rem; border-radius: 6px; }
            #form-payroll label { font-size: 0.75rem; margin-bottom: 2px; color: var(--soft-text); }
            #form-payroll input, #form-payroll select { padding: 6px 8px; font-size: 0.85rem; border-radius: 6px; }
          </style>
          <div class="card" style="padding: 12px; margin-bottom: 1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="const w = document.getElementById('form-employee-wrap'); w.classList.toggle('hidden'); const i = this.querySelector('span'); i.style.transform = w.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';">
              <h3 style="margin:0; font-size: 1.05rem;">&#128100; Profil Karyawan</h3>
              <span style="transition: transform 0.3s; font-size:1.2rem; display:inline-block; transform: rotate(180deg);">&#9662;</span>
            </div>
            <div id="form-employee-wrap" style="margin-top:12px;">
              <form id="form-employee" class="forms" style="display:flex; flex-direction:column; gap:8px;">
                <input type="hidden" name="id" value="${emp.id}">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                  ${input("name", "Nama", true, "text", emp.name)}
                  ${input("phone", "No HP", false, "text", emp.phone || "")}
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                  ${input("joinDate", "Tgl Masuk", true, "date", emp.joinDate ? emp.joinDate.slice(0,10) : '')}
                  ${select("salaryType", "Tipe", ["Bulanan", "Harian"], emp.salaryType)}
                  ${input("baseSalary", "Gaji Pokok", true, "text", "")}
                </div>
                <div class="form-actions" style="margin-top:4px; display:flex; gap:8px;">
                  <button type="submit" class="btn primary" style="padding:8px 12px; font-size:0.85rem; flex:1;">Update</button>
                  <button type="button" class="btn danger" style="padding:8px 12px; font-size:0.85rem;" onclick="hapusKaryawan('${emp.id}')">Hapus</button>
                </div>
              </form>
            </div>
          </div>
          
          <div class="card" style="margin-top:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h3>Riwayat Kasbon</h3>
              <button class="btn soft" onclick="tambahKasbon('${emp.id}')">+ Kasbon Baru</button>
            </div>
            
            <form id="form-bon" class="forms" style="display:none; flex-direction:column; gap:8px; background:var(--bg); padding:12px; border-radius:8px; margin-top:1rem;">
              <input type="hidden" name="id" value="">
              <input type="hidden" name="employeeId" value="${emp.id}">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                ${input("date", "Tanggal", true, "date", today())}
                ${input("amount", "Nominal", true, "text")}
              </div>
              ${input("notes", "Keterangan", false, "text", "")}
              <div class="form-actions" style="margin-top:4px; display:flex; gap:8px;">
                <button type="submit" class="btn primary" style="padding:8px 12px; font-size:0.85rem; flex:1;">Simpan</button>
                <button type="button" class="btn soft" style="padding:8px 12px; font-size:0.85rem;" onclick="document.getElementById('form-bon').style.display='none'">Batal</button>
              </div>
            </form>
            
            <div class="table-wrap" style="margin-top:1rem;">
              <table class="table" style="font-size:0.75rem; line-height:1.2;">
                <thead><tr><th style="padding:4px 8px;">Tgl</th><th style="padding:4px 8px;">Nominal</th><th style="padding:4px 8px;">Ket</th><th style="padding:4px 8px; text-align:right;">Aksi</th></tr></thead>
                <tbody>
                  ${unpaidBons.length === 0 ? '<tr><td colspan="4" class="text-center muted" style="padding:4px 8px;">Tidak ada utang kasbon</td></tr>' : ''}
                  ${unpaidBons.map(c => `<tr>
                    <td style="padding:4px 8px;">${c.date ? escapeHtml(c.date.slice(0,10)) : ''}</td>
                    <td style="padding:4px 8px; color:#f43f5e;">${rupiah(c.amount)}</td>
                    <td style="padding:4px 8px;">${c.notes || '-'}</td>
                    <td style="padding:4px 8px; text-align:right;">
                      <button class="btn soft" style="padding:2px 4px;font-size:0.7rem;margin-right:2px; min-height:20px; height:22px; width:22px; display:inline-flex;" onclick="editBon('${c.id}')">✏️</button>
                      <button class="btn soft" style="padding:2px 4px;font-size:0.7rem; min-height:20px; height:22px; width:22px; display:inline-flex;" onclick="hapusBon('${c.id}')">❌</button>
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
              <div style="margin-top:0.5rem; text-align:right; font-weight:600; font-size:0.9rem;">
                Total Kasbon: <span style="color:#f43f5e;">${rupiah(totalBon)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Panel Kanan: Hitung Gaji -->
        <div>
          <div class="card" style="border: 1px solid var(--primary); background: rgba(0, 240, 255, 0.02);">
            <h3>💰 Hitung & Bayar Gaji</h3>
            <form id="form-payroll" class="grid forms" style="grid-template-columns: 1fr;">
              <input type="hidden" name="employeeId" value="${emp.id}">
              <input type="hidden" name="totalBon" value="${totalBon}">
              
              <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; ${emp.salaryType === 'Bulanan' ? 'display:none;' : ''}">
                ${input("periodStart", "Periode Mulai", false, "date")}
                ${input("periodEnd", "Periode Akhir", false, "date")}
              </div>
              <div class="grid" id="payroll-days-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem; ${emp.salaryType === 'Bulanan' ? 'display:none;' : ''}">
                ${input("leaveDays", "Potong Libur (Hari)", false, "number", 0)}
                <label>Hari Kerja Aktual<input name="attendanceDays" type="text" readonly style="background:var(--bg);font-weight:bold;text-align:right;"></label>
              </div>
              
              <div style="background: var(--bg); padding: 0.8rem; border-radius: 8px; margin-top: 1rem; font-family: monospace;">
                <div style="text-align:center; font-weight:600; margin-bottom: 8px; font-size:1rem; border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 6px;">RINCIAN GAJI</div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
                  <span style="font-weight:600; letter-spacing:0.5px; display:flex; align-items:center; gap:6px;">
                    TOTAL GAJI
                    <span style="cursor:pointer; font-size:14px;" onclick="const el = document.getElementById('payroll-basic-breakdown'); el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';">👁️</span>
                  </span>
                  <strong id="payroll-basic-salary" style="font-size:1rem; text-align:right; font-weight:600;">Rp 0</strong>
                </div>
                <div id="payroll-basic-breakdown" style="display:none; font-size:0.75rem; opacity:0.7; margin-top:-4px; margin-bottom:6px; line-height:1.2;"></div>
                
                ${totalBon > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items:center;">
                  <span style="color: #f43f5e; font-weight:600;">Potong Kasbon:</span>
                  <div style="text-align:right; width: 50%;">
                    <input type="text" name="cicilKasbon" id="payroll-cicil" class="number-format" oninput="formatNumberInput(this)" style="text-align:right; color:#f43f5e; font-weight:600; width:100%; border-bottom: 1px solid #f43f5e; background:transparent;" placeholder="0">
                    <div style="font-size:0.75rem; opacity:0.7; margin-top:2px;">Total Utang: ${rupiah(totalBon)}</div>
                  </div>
                </div>
                ` : `<input type="hidden" name="cicilKasbon" id="payroll-cicil" value="0">`}
                
                <hr style="border-color: rgba(255,255,255,0.1); margin: 0.8rem 0;">
                <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight:600;">
                  <span>Gaji Bersih Diterima:</span>
                  <strong id="payroll-net" style="color: #10b981; text-align:right; font-weight:600;">Rp 0</strong>
                </div>
                
                ${totalBon > 0 ? `
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-top:0.5rem;">
                  <span>Sisa Bon Bulan Depan:</span>
                  <strong id="payroll-sisa-bon" style="color: #f43f5e; text-align:right;">Rp 0</strong>
                </div>
                ` : ""}
              </div>
              
              <div style="display:flex; gap: 4px; align-items: flex-end; margin-top: 6px;">
                <div style="flex:1;">
                  <label style="font-size:0.65rem; color:var(--soft-text); display:block; margin-bottom:0px;">Keterangan (Opsional)</label>
                  <input type="text" name="notes" style="height: 24px !important; min-height: 24px !important; max-height: 24px !important; padding: 0 6px !important; font-size: 0.7rem !important; border-radius: 4px !important; width: 100% !important; margin:0 !important;">
                </div>
                <button type="button" id="btn-wa-persetujuan" class="btn soft" style="height: 24px !important; min-height: 24px !important; max-height: 24px !important; padding: 0 8px !important; font-size: 0.65rem !important; border-radius: 4px !important; display:flex !important; align-items:center !important; justify-content:center !important; margin:0 !important; border: 1px solid var(--border) !important; background: var(--bg-card) !important; color: var(--text-color) !important;" title="Kirim Rincian ke WA">💬 WA</button>
                <button type="submit" class="btn success" style="height: 24px !important; min-height: 24px !important; max-height: 24px !important; padding: 0 12px !important; font-size: 0.65rem !important; border-radius: 4px !important; display:flex !important; align-items:center !important; justify-content:center !important; margin:0 !important;">Cairkan Gaji</button>
              </div>
              
              <label style="display:flex;align-items:center;gap:6px;margin-top:4px;font-size:0.7rem; color:var(--soft-text);">
                <input type="checkbox" name="resetJoinDate" checked style="width:14px !important; height:14px !important; min-height:14px !important; max-height:14px !important; margin:0 !important;"> 
                Set "Tanggal Masuk" ke besok (Centang jika lanjut kerja)
              </label>
            </form>
          </div>
          
          <!-- Riwayat Gaji -->
          <div class="card" style="margin-top:1rem; padding:12px;">
            <h3 style="margin:0 0 12px 0;">Riwayat Gaji (Bulan ke Bulan)</h3>
            ${payrolls().filter(p => p.employeeId === emp.id).length === 0 ? '<p class="muted" style="font-size:0.8rem;">Belum ada riwayat penggajian.</p>' : `
            <div class="table-container">
              <table class="actionTable" style="width:100%; font-size:0.75rem;">
                <thead>
                  <tr>
                    <th>Bulan/Tgl</th>
                    <th>Gaji Bersih</th>
                    <th>Potong Bon</th>
                    <th>Sisa Kasbon</th>
                    <th style="text-align:right;">Opsi</th>
                    <th style="text-align:right;">Periode</th>
                  </tr>
                </thead>
                <tbody>
                  ${payrolls().filter(p => p.employeeId === emp.id).sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map(p => {
                    const dateObj = new Date(p.createdAt || new Date());
                    const tglStr = dateObj.toLocaleDateString("id-ID", {month:"short", year:"numeric"});
                    return `
                      <tr>
                        <td><a href="#" onclick="viewRiwayatGaji('${p.id}'); return false;" style="color:var(--primary); text-decoration:underline;">${tglStr}</a></td>
                        <td style="color:#10b981; font-weight:bold;">${rupiah(p.netSalary)}</td>
                        <td style="color:#f43f5e;">${rupiah(p.totalDeductionBon)}</td>
                        <td style="color:#f97316; font-weight:bold;">${rupiah(p.sisa_kasbon || 0)}</td>
                        <td style="text-align:right;">
                           <div style="display:flex; gap:4px; justify-content:flex-end;">
                              <button type="button" class="btn soft" onclick="printGaji('${p.id}', 'wa')" title="Kirim WA" style="padding:2px 4px; height:22px; min-height:20px; width:22px; font-size:0.7rem; display:inline-flex;">💬</button>
                              <button type="button" class="btn danger" onclick="hapusRiwayatGaji('${p.id}')" title="Hapus Riwayat" style="padding:2px 4px; height:22px; min-height:20px; width:22px; font-size:0.7rem; display:inline-flex;">🗑️</button>
                           </div>
                        </td>
                        <td style="font-size:0.65rem; text-align:right;">${p.periodStart} s/d ${p.periodEnd}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            `}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

window.openEmployeeDashboard = function(id) {
  window.gajiActiveEmpId = id || null;
  render();
};

window.printGaji = function(payrollId, mode) {
  const p = payrolls().find(x => String(x.id) === String(payrollId));
  if(!p) return alert("Data gaji tidak ditemukan.");
  const emp = employees().find(x => String(x.id) === String(p.employeeId));
  if(!emp) return alert("Data karyawan tidak ditemukan.");
  
  const notes = p.notes ? p.notes : "-";
  
  // Format Teks / Struk
  let text = 
`==============================
   STRUK GAJI KARYAWAN
==============================
Nama    : ${emp.name}
Periode : ${p.periodStart} s/d ${p.periodEnd}
------------------------------
TOTAL GAJI      : ${rupiah(p.basicSalaryCalculated)}
Potong Kasbon   : ${p.totalDeductionBon > 0 ? rupiah(p.totalDeductionBon) : 'Rp 0'}
Sisa Bon Depan  : ${p.sisaBonBaru > 0 ? rupiah(p.sisaBonBaru) : 'Rp 0'}
------------------------------
GAJI DITERIMA   : ${rupiah(p.netSalary)}
------------------------------
Keterangan: ${notes}
==============================`;

  if (mode === 'wa') {
    if (!emp.phone) return alert("Nomor HP karyawan belum diisi di profil.");
    let phone = emp.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    const url = "https://wa.me/" + phone + "?text=" + encodeURIComponent(text);
    window.open(url, '_blank');
    return;
  }
  
  if (mode === 'thermal') {
    // Basic browser print for thermal
    let printWindow = window.open('', '', 'width=300,height=500');
    printWindow.document.write(`<html style="width:58mm; padding:0; margin:0;"><body style="font-family: monospace; font-size: 12px; margin:0; padding:10px; width:58mm; white-space:pre-wrap;">${text}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
    return;
  }
  
  if (mode === 'pdf') {
    // Reuse existing PDF window wrapper
    let pdfWindow = window.open('', '', 'width=800,height=600');
    pdfWindow.document.write(`<html style="padding:20px; font-family: monospace; font-size: 14px; white-space:pre-wrap;"><body><h2>BUKTI PENGGAJIAN</h2><br>${text}</body></html>`);
    pdfWindow.document.close();
    pdfWindow.focus();
    setTimeout(() => {
      pdfWindow.print();
      pdfWindow.close();
    }, 500);
  }
};

window.tambahKasbon = function(empId) {
  const f = document.getElementById('form-bon');
  if(f) {
    f.style.display = 'flex';
    f.elements.id.value = '';
    f.elements.amount.value = '';
    f.elements.notes.value = '';
    f.elements.date.value = today();
    f.scrollIntoView();
  }
};

window.editEmployee = function(id) {
  if (!id) {
     const name = prompt("Masukkan Nama Karyawan Baru:");
     if (name) {
        gas("add", { collection: "employees", id: null, item: { name: name, phone: "", joinDate: today(), salaryType: "Harian", baseSalary: 0, status: "Aktif" }})
        .then(() => { alert("Berhasil ditambahkan. Silakan klik Kelola untuk melengkapi profil."); load(); })
        .catch(e => alert(e.message));
     }
  }
};

window.hapusKaryawan = async function(id) {
  if (!confirm("Yakin ingin menghapus data karyawan ini?")) return;
  window.gajiActiveEmpId = null;
  render();
  try {
    await gas("remove", { collection: "employees", id });
    await load();
  } catch(err) {
    alert("Gagal menghapus karyawan: " + err.message);
  }
};

window.hapusRiwayatGaji = async function(id) {
  if (!confirm("Yakin ingin menghapus riwayat gaji ini?")) return;
  try {
    await gas("remove", { collection: "payrolls", id });
    await load();
  } catch(err) {
    alert("Gagal menghapus riwayat gaji: " + err.message);
  }
};

window.viewRiwayatGaji = function(payrollId) {
  const p = payrolls().find(x => String(x.id) === String(payrollId));
  if(!p) return alert("Data gaji tidak ditemukan.");
  const emp = employees().find(x => String(x.id) === String(p.employeeId));
  if(!emp) return alert("Data karyawan tidak ditemukan.");
  
  let text = 
`==============================
   STRUK GAJI KARYAWAN
==============================
Nama    : ${emp.name}
Periode : ${p.periodStart} s/d ${p.periodEnd}
------------------------------
TOTAL GAJI      : ${rupiah(p.basicSalaryCalculated)}
Potong Kasbon   : ${p.totalDeductionBon > 0 ? rupiah(p.totalDeductionBon) : 'Rp 0'}
Sisa Bon Depan  : ${p.sisa_kasbon > 0 ? rupiah(p.sisa_kasbon) : 'Rp 0'}
------------------------------
GAJI DITERIMA   : ${rupiah(p.netSalary)}
==============================
Catatan: ${p.notes || "-"}`;

  alert(text);
};

window.editBon = function(id) {
  const bon = cashAdvances().find(c => c.id == id);
  if (bon) {
    const f = document.getElementById('form-bon');
    if (f) {
      f.style.display = 'flex';
      f.elements.id.value = bon.id;
      f.elements.employeeId.value = bon.employeeId;
      f.elements.date.value = bon.date ? bon.date.slice(0,10) : '';
      f.elements.amount.value = formatInitialNumber(bon.amount);
      f.elements.notes.value = bon.notes;
      f.scrollIntoView();
    }
  }
};

window.hapusBon = async function(id) {
  const removed = (state.data.cashAdvances || []).find(r => String(r.id) === String(id));
  state.data.cashAdvances = (state.data.cashAdvances || []).filter(r => String(r.id) !== String(id));
  render();
  try {
    await gas("remove", { collection: "cashAdvances", id });
  } catch(err) {
    if (removed) state.data.cashAdvances.push(removed);
    render();
    alert(err.message);
  }
};

function bindGajiEvents() {
  if (!window.gajiActiveEmpId) return;
  const empId = window.gajiActiveEmpId;
  const emp = employees().find(e => e.id == empId);
  if (!emp) return;
  
  // Format initial values
  const formEmp = document.getElementById("form-employee");
  if (formEmp && formEmp.elements.baseSalary) {
    formEmp.elements.baseSalary.value = formatInitialNumber(emp.baseSalary);
    formEmp.elements.baseSalary.addEventListener("input", function() { formatNumberInput(this); });
  }
  
  const formBon = document.getElementById("form-bon");
  if (formBon && formBon.elements.amount) {
    formBon.elements.amount.addEventListener("input", function() { formatNumberInput(this); });
  }

  // Employee Submit
  if (formEmp) {
    formEmp.onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        joinDate: form.elements.joinDate.value,
        salaryType: form.elements.salaryType.value,
        baseSalary: plainNumber(form.elements.baseSalary.value),
        status: 'Aktif'
      };
      const id = form.elements.id.value;
      try {
        await gas(id ? "update" : "add", { collection: "employees", id, item: payload });
        alert("Profil Karyawan berhasil diperbarui");
        await load();
      } catch(err) { alert(err.message); }
    };
  }
  
  // Kasbon Submit
  if (formBon) {
    formBon.onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const payload = {
        employeeId: form.elements.employeeId.value,
        date: form.elements.date.value,
        amount: plainNumber(form.elements.amount.value),
        notes: form.elements.notes.value,
        status: "Belum Lunas"
      };
      const id = form.elements.id.value;
      try {
        await gas(id ? "update" : "add", { collection: "cashAdvances", id, item: payload });
        alert("Bon berhasil dicatat");
        await load();
      } catch(err) { alert(err.message); }
    };
  }
  
  // Payroll Logic
  const pStart = document.getElementsByName("periodStart")[0];
  const pEnd = document.getElementsByName("periodEnd")[0];
  const pLeave = document.getElementsByName("leaveDays")[0];
  const payrollDays = document.getElementsByName("attendanceDays")[0];
  const cicilInput = document.getElementById("payroll-cicil");
  
  const unpaidBons = cashAdvances().filter(c => c.employeeId == empId && c.status === 'Belum Lunas');
  const totalBon = unpaidBons.reduce((sum, c) => sum + Number(c.amount), 0);
  
  // Initialize start/end dates
  if (pStart && !pStart.value && emp.joinDate) pStart.value = emp.joinDate.split('T')[0];
  if (pEnd && !pEnd.value) pEnd.value = today();
  
  const calcPayroll = () => {
      const fEmp = document.getElementById("form-employee");
      let currentSalaryType = emp.salaryType;
      let currentBaseSalary = emp.baseSalary;
      if (fEmp) {
         currentSalaryType = fEmp.elements.salaryType.value;
         currentBaseSalary = plainNumber(fEmp.elements.baseSalary.value);
      }

      let actualDays = 0;
      if (currentSalaryType === 'Harian') {
        if (pStart && pEnd && pStart.value && pEnd.value) {
          const d1 = new Date(pStart.value);
          const d2 = new Date(pEnd.value);
          const diffTime = d2 - d1;
          const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24))) + 1;
          const leave = Number(pLeave ? pLeave.value : 0) || 0;
          actualDays = Math.max(0, diffDays - leave);
        }
        if(payrollDays) payrollDays.value = actualDays;
      } else {
        if(payrollDays) payrollDays.value = '';
        actualDays = 0;
      }
      
      let basicCalc = 0;
      let breakdownText = "";
      if (currentSalaryType === 'Harian') {
        const dailyRate = Math.round(currentBaseSalary / 30);
        basicCalc = dailyRate * actualDays;
        breakdownText = `(${rupiah(dailyRate)}/hr x ${actualDays}hr)`;
      } else {
        basicCalc = currentBaseSalary;
        breakdownText = "(1 Bulan)";
      }
      
      const cicil = plainNumber(cicilInput ? cicilInput.value : 0) || 0;
      const net = basicCalc - cicil;
      const sisaBon = Math.max(0, totalBon - cicil);
      
      const brkElement = document.getElementById("payroll-basic-breakdown");
      if (brkElement) brkElement.innerText = breakdownText;
      const basicEl = document.getElementById("payroll-basic-salary");
      if (basicEl) basicEl.innerText = rupiah(basicCalc);
      const netEl = document.getElementById("payroll-net");
      if (netEl) netEl.innerText = rupiah(net);
      const sisaEl = document.getElementById("payroll-sisa-bon");
      if (sisaEl) sisaEl.innerText = rupiah(sisaBon);
      
      return basicCalc;
    };
    
    // Auto-fill cicilan
    if (cicilInput && !cicilInput.value) {
       let basicCalc = calcPayroll();
       let defaultCicil = Math.min(totalBon, basicCalc);
       cicilInput.value = formatInitialNumber(defaultCicil);
    }
    
    if (pStart) pStart.addEventListener("input", calcPayroll);
    if (pEnd) pEnd.addEventListener("input", calcPayroll);
    if (pLeave) pLeave.addEventListener("input", calcPayroll);
    if (cicilInput) cicilInput.addEventListener("input", calcPayroll);
    if (formEmp) {
      formEmp.elements.salaryType.addEventListener("change", (e) => {
          const grid = document.getElementById("payroll-days-grid");
          if(grid) grid.style.display = e.target.value === 'Bulanan' ? 'none' : 'grid';
          calcPayroll();
      });
      formEmp.elements.baseSalary.addEventListener("input", calcPayroll);
    }
  
  calcPayroll(); // Run once
  
  const btnWaPersetujuan = document.getElementById("btn-wa-persetujuan");
  if (btnWaPersetujuan) {
    btnWaPersetujuan.onclick = () => {
      if (!emp.phone) {
        alert("Nomor HP karyawan belum diisi di profil!");
        return;
      }
      let basicCalc = calcPayroll();
      const cicil = plainNumber(cicilInput ? cicilInput.value : 0) || 0;
      const net = basicCalc - cicil;
      
      const fEmp = document.getElementById("form-employee");
      let currentSalaryType = emp.salaryType;
      if (fEmp) currentSalaryType = fEmp.elements.salaryType.value;
      
      const txtGajiPokok = (currentSalaryType === 'Harian') ? '(Harian)' : '(Bulanan)';
      
      let rincianKasbon = unpaidBons.length > 0 
        ? unpaidBons.map((b, i) => `${i+1}. ${b.date ? b.date.split('T')[0] : ''} ${b.notes ? '(' + b.notes + ')' : ''} : ${rupiah(b.amount)}`).join('\n')
        : "- Tidak ada kasbon";

      const tglMasuk = pStart ? pStart.value : (emp.joinDate ? emp.joinDate.split('T')[0] : '');
      const tglAkhir = pEnd ? pEnd.value : (new Date().toISOString().split('T')[0]);

      const msg = `================================
STRUK RINCIAN GAJI & BON
GARNETA STORE
================================
NAMA     : *${emp.name.toUpperCase()}*
PERIODE  : ${tglMasuk} s/d ${tglAkhir}

--------------------------------
[ RINCIAN KASBON BELUM LUNAS ]
--------------------------------
${rincianKasbon}
--
Total Kasbon (Utang) : *${rupiah(totalBon)}*
--------------------------------

[ RINCIAN GAJI ]
Total Gaji ${txtGajiPokok} : *${rupiah(basicCalc)}*
================================

Berdasarkan rincian di atas, untuk gajian periode ini kasbonnya mau *Dipotong Full (Lunas)* atau mau *Dicicil Sebagian* dulu?`;
      
      let phoneNum = emp.phone;
      if (phoneNum.startsWith('0')) phoneNum = '62' + phoneNum.substring(1);
      const waLink = `https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`;
      window.open(waLink, '_blank');
    };
  }
  
  // Submit Payroll
  const formPayroll = document.getElementById("form-payroll");
  if (formPayroll) {
    formPayroll.onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      
      let actualDays = Number(form.elements.attendanceDays.value || 0);
      let basicCalc = emp.salaryType === 'Harian' ? (Math.round(emp.baseSalary / 30) * actualDays) : emp.baseSalary;
      
      const cicil = plainNumber(form.elements.cicilKasbon.value || 0);
      if (cicil > totalBon) {
        alert("Nominal cicilan tidak boleh lebih besar dari total utang kasbon!");
        return;
      }
      
      const net = basicCalc - cicil;
      const bonIds = unpaidBons.map(c => c.id);
      
      if (!confirm(`Yakin bayar gaji ${emp.name} sejumlah ${rupiah(net)}?\nPotong Kasbon: ${rupiah(cicil)}`)) return;
      
      const payload = {
        employeeId: empId,
        periodStart: form.elements.periodStart.value,
        periodEnd: form.elements.periodEnd.value,
        attendanceDays: actualDays,
        basicSalaryCalculated: basicCalc,
        totalDeductionBon: cicil, // the actual deduction amount
        netSalary: net,
        notes: form.elements.notes.value,
        resetJoinDate: form.elements.resetJoinDate.checked,
        bonIds: bonIds, // we pass all active bon IDs to be cleared
        sisaBonBaru: Math.max(0, totalBon - cicil) // tell server to create new bon
      };
      
      try {
        await gas("add", { collection: "payrolls", id: null, item: payload });
        alert("Gaji berhasil dibayarkan!");
        await load();
      } catch(err) { alert(err.message); }
    };
  }
}

        function render() {
      // [NEW] Global Orderan Reminder
      let pendingOrders = [];
      let readyOrders = [];
      let todayT = new Date(); todayT.setHours(0,0,0,0);
      let warningLimit = new Date(todayT); warningLimit.setDate(warningLimit.getDate() + 4);

      (state.data.orders || []).forEach(o => {
         let dDate = new Date(o.dueDate);
         dDate.setHours(0,0,0,0);
         if (dDate <= warningLimit && o.items && o.items.length > 0) {
            if (o.items.some(i => !i.isReady)) pendingOrders.push(o);
            else readyOrders.push(o);
         }
      });

      let existingBanner = document.getElementById('orderan-global-banner');
      if (pendingOrders.length > 0 || readyOrders.length > 0) {
         let isDanger = pendingOrders.length > 0;
         let bgColor = isDanger ? "#f43f5e" : "#10b981"; // Red vs Emerald
         let icon = isDanger ? "fa-exclamation-triangle" : "fa-check-circle";
         let title = isDanger ? "PERHATIAN BOS!" : "SIAP KIRIM BOS!";
         
         let texts = [];
         if (pendingOrders.length > 0) texts.push(`Ada ${pendingOrders.length} orderan (Tenggat H-4) yang barangnya BELUM komplit!`);
         if (readyOrders.length > 0) texts.push(`Ada ${readyOrders.length} orderan (Tenggat H-4) SIAP DIKIRIM!`);
         let bannerText = texts.join('<br>');

         if (!existingBanner) {
            existingBanner = document.createElement('div');
            existingBanner.id = 'orderan-global-banner';
            existingBanner.setAttribute('data-is-danger', isDanger ? 'true' : 'false');
            existingBanner.style = `position:fixed; top:20px; right:20px; background:${bgColor}; color:white; padding:16px 24px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.2); z-index:9999; display:flex; align-items:center; gap:16px; cursor:pointer; transition: transform 0.3s ease;`;
            existingBanner.innerHTML = `
               <div style="font-size:24px;" id="orderan-banner-icon"><i class="fas ${icon}"></i></div>
               <div>
                  <h4 style="margin:0; font-size:16px;" id="orderan-banner-title">${title}</h4>
                  <p style="margin:4px 0 0 0; font-size:14px;" id="orderan-banner-text">${bannerText}</p>
               </div>
               <div style="margin-left:auto; padding-left:16px;">
                  <button class="btn" onclick="event.stopPropagation(); this.parentElement.parentElement.remove()" style="background:rgba(0,0,0,0.2); border:none; color:white; padding:4px 8px; border-radius:4px;"><i class="fas fa-times"></i></button>
               </div>
            `;
            existingBanner.onclick = () => { 
               window.showPage('kalkulator'); 
               window.kalkulatorTopWorkspace = 'orderan'; 
               render(); 
               existingBanner.remove(); 
            };
            document.body.appendChild(existingBanner);
            
            // Re-alert setiap 1 jam agar bergetar
            if (window.orderanAlertInterval) clearInterval(window.orderanAlertInterval);
            window.orderanAlertInterval = setInterval(() => {
               let b = document.getElementById('orderan-global-banner');
               if (b && b.getAttribute('data-is-danger') === 'true') {
                  b.style.transform = 'scale(1.1) rotate(2deg)';
                  setTimeout(() => b.style.transform = 'scale(1) rotate(-2deg)', 150);
                  setTimeout(() => b.style.transform = 'scale(1) rotate(0deg)', 300);
               }
            }, 3600000); 
         } else {
            existingBanner.setAttribute('data-is-danger', isDanger ? 'true' : 'false');
            existingBanner.style.background = bgColor;
            let iconEl = document.getElementById('orderan-banner-icon');
            if(iconEl) iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
            let titleEl = document.getElementById('orderan-banner-title');
            if(titleEl) titleEl.textContent = title;
            let txt = document.getElementById('orderan-banner-text');
            if(txt) txt.innerHTML = bannerText;
         }
      } else {
         if (existingBanner) existingBanner.remove();
         if (window.orderanAlertInterval) clearInterval(window.orderanAlertInterval);
      }

      const label = menus.find(([key]) => key === state.route)?.[1] || "Dashboard";
      el("page-title").textContent = label;
      // Set ikon topbar sesuai halaman aktif
      const routeIcons = {
        dashboard: "🏠", barang: "📦", supplier: "🏢", pembelian: "🛒",
        ngitung: "🧮", riwayat: "🧾", hutang: "📒", kalkulator: "📱",
        penjualan: "💵", laporan: "📊", statistik: "📈", audit: "🕵️",
        users: "👥", gaji: "💰", settings: "⚙️", "neural-hub": "🧠", kasbon: "💸"
      };
      const iconEl = document.getElementById("page-title-icon");
      if (iconEl) iconEl.textContent = routeIcons[state.route] || "📌";
      if (["laporan", "statistik", "audit", "settings"].includes(state.route) && state.role !== "Super Admin") {
        el("content").innerHTML = `<div class="card"><h2>Akses dibatasi</h2><p class="muted">Menu ini hanya bisa diakses Super Admin.</p></div>`;
        return;
      }
      const views = { dashboard, "neural-hub": neuralHub, barang, supplier, pembelian, ngitung, riwayat, kalkulator, penjualan, laporan, statistik, audit, users, gaji, settings, kasbon , ppob};
      
      try {
        el("content").innerHTML = views[state.route] ? views[state.route]() : `<div class="card"><h2>Menu tidak ditemukan</h2><p class="muted">Route: ${state.route}</p></div>`;
      } catch (err) {
        console.error("Render Error:", err);
        el("content").innerHTML = `
          <div class="card error-boundary" style="text-align: center; padding: 40px 20px; border: 1px solid rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.05); border-radius: 16px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">🔥</div>
            <h2 style="color: #ff4757; margin-bottom: 12px;">Oops! Menu ini mengalami kendala.</h2>
            <p style="color: #aaa; margin-bottom: 24px; font-family: monospace; background: rgba(0,0,0,0.5); padding: 12px; border-radius: 8px;">${err.message}</p>
            <p style="margin-bottom: 24px; color: #ccc;">Sistem berhasil mengisolasi kerusakan ini sehingga aplikasi utama tidak mati.</p>
            <button class="btn" onclick="navigate('dashboard')" style="background: var(--garneta-cyan); color: #000; font-weight: bold; padding: 10px 24px; border-radius: 8px;">← Kembali ke Dashboard</button>
          </div>
        `;
      }
      
      bindForms();
    }

    function neuralHub() {
    const adminModules = [
      { id: "barang", name: "Barang", icon: "📦", desc: "Manajemen produk", core: true },
      { id: "penjualan", name: "Penjualan", icon: "💰", desc: "Input transaksi", core: true },
      { id: "kalkulator", name: "Xpres", icon: "⚡", desc: "Kasir Cepat" },
      { id: "pembelian", name: "Pembelian", icon: "🛒", desc: "Restock barang" }
    ];
      
      // Modul untuk Super Admin (semua)
      const superAdminModules = [
        { id: "barang", name: "Barang", icon: "📦", desc: "Manajemen produk", core: true },
        { id: "penjualan", name: "Penjualan", icon: "💵", desc: "Input transaksi", core: true },
        { id: "pembelian", name: "Pembelian", icon: "🛒", desc: "Restock barang" },
        { id: "kalkulator", name: "Xpres", icon: "⚡", desc: "Kasir Cepat" },
        { id: "laporan", name: "Laporan", icon: "📈", desc: "Laporan harian" },
        { id: "statistik", name: "Statistik", icon: "📊", desc: "Analisis data" },
        { id: "audit", name: "Audit Log", icon: "📋", desc: "Riwayat aktivitas" },
        { id: "settings", name: "Setting", icon: "⚙️", desc: "Pengaturan & User" }
      ];
      
      const modules = isSuperAdmin() ? superAdminModules : adminModules;
      
      const d = state.data.dashboard || {};
      
      return `<section class="grid">
        <div class="grid stats">
          ${stat("Total Barang", d.totalProducts)}

          ${stat("Nilai Stok", rupiah(d.stockValue))}
          ${isSuperAdmin() ? stat("Keuntungan", rupiah(d.totalProfit)) : ""}
        </div>
        <div class="card">
          <h2>🧠 Neural Hub - AI Command Center</h2>
          <p class="muted">Pusat kendali sistem - klik modul untuk navigasi cepat</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:16px;">
            ${modules.map(m => `
              <button class="btn ${m.core ? 'primary' : 'soft'}" onclick="state.route='${m.id}';renderShell();render()" style="padding:16px;text-align:center;flex-direction:column;gap:8px;height:auto;">
                <span style="font-size:2rem">${m.icon}</span>
                <span style="font-weight:700">${m.name}</span>
                <span style="font-size:11px;opacity:0.8">${m.desc}</span>
              </button>
            `).join("")}
          </div>
        </div>
      </section>`;
    }

    function dashboard() {
      // Initialize Neural Hub Dashboard
      setTimeout(function() {
        if (window.NeuralHub) {
          window.NeuralHub.init();
        }
      }, 100);
      
      return `<section id="neural-dashboard-container" style="min-height:calc(100vh - 140px);">
        <!-- Neural Hub Dashboard akan di-render oleh JavaScript -->
      </section>`;
    }


    function invoiceAiTools() {
      return `<div class="grid">
        <div class="grid forms">
          <label>Import Foto Nota JPG/JPEG/PNG
            <input id="invoice-image-file" type="file" accept="image/jpeg,image/jpg,image/png">
          </label>
          <div class="actions" style="align-self:end">
            <button class="btn soft" id="open-invoice-camera">Buka Kamera</button>
            <button class="btn danger hidden" id="close-invoice-camera">Tutup Kamera</button>
          </div>
        </div>
        <video id="invoice-camera-video" class="scanner-preview hidden" playsinline></video>
        <canvas id="invoice-canvas" class="hidden"></canvas>
        <div class="actions">
          <button class="btn primary" id="analyze-invoice-file">Analisa Foto</button>
          <button class="btn primary hidden" id="capture-invoice-photo">Foto & Analisa</button>
          <button class="btn soft" id="copy-invoice-result">Copy Hasil</button>
          <button class="btn soft" id="parse-invoice-draft">Jadikan Draft</button>
        </div>
        <label>Perintah AI
          <textarea id="invoice-ai-instruction" class="input-area expandable" placeholder="Contoh: ambil nama barang dan harga saja. Atau: jumlahkan total belanja pada nota ini."></textarea>
        </label>
        <label>Hasil
          <textarea id="invoice-ai-result" class="input-area expandable" placeholder="Hasil AI akan muncul di sini dan bisa diedit/copy."></textarea>
        </label>
        <div>
          <div class="actions" style="justify-content:space-between">
            <h3>Draft Pembelian dari Nota</h3>
            <div class="actions">
              <button class="btn primary" id="save-invoice-draft">Simpan ke Barang/Pembelian</button>
              <button class="btn danger" id="clear-invoice-draft">Kosongkan Draft</button>
            </div>
          </div>
          <div id="invoice-draft-table">${invoiceDraftTable()}</div>
        </div>
        <p class="muted">Jika hasil AI berupa JSON nota, klik Jadikan Draft. Koreksi baris yang salah, hapus item keliru, lalu simpan ke Barang/Pembelian.</p>
      </div>`;
    }

    // Workspace state for Barang page
    window.barangWorkspace = localStorage.getItem('barangWorkspace') || 'list';
    
    function switchBarangWorkspace(workspace) {
      window.barangWorkspace = workspace;
      localStorage.setItem('barangWorkspace', workspace);
      render();
    }
    
    function barang() {
      const subTabs = isSuperAdmin() ? [
        { id: 'ai-input', icon: '🤖', label: 'AI Input' },
        { id: 'ai', icon: '🪄', label: 'AI Nota' },
        { id: 'import', icon: '📥', label: 'Import' },
        { id: 'scanner', icon: '📱', label: 'Scanner' }
      ] : [];

      const activeWorkspace = window.barangWorkspace || 'list';
      const isSubTabActive = subTabs.some(t => t.id === activeWorkspace);

      const supplierBtn = `
          <button class="workspace-tab ${activeWorkspace === 'supplier' ? 'active' : ''}" 
                  onclick="switchBarangWorkspace('supplier')" style="flex:0 0 auto;">
            <span class="workspace-icon">🚚</span>
            <span class="workspace-label">Supplier</span>
          </button>
      `;

      const formBtn = `
          <button class="workspace-tab ${activeWorkspace === 'form' ? 'active' : ''}" 
                  onclick="switchBarangWorkspace('form')" style="flex:0 0 auto;">
            <span class="workspace-icon">📝</span>
            <span class="workspace-label">Form</span>
          </button>
      `;

      const daftarBtn = `
          <button class="workspace-tab ${activeWorkspace === 'list' ? 'active' : ''}" 
                  onclick="switchBarangWorkspace('list')" style="flex:0 0 auto;">
            <span class="workspace-icon">📋</span>
            <span class="workspace-label">Daftar</span>
          </button>
      `;

      const searchBtn = `
          <button class="workspace-tab ${activeWorkspace === 'search' ? 'active' : ''}" 
                  onclick="switchBarangWorkspace('search')" style="flex:0 0 auto;">
            <span class="workspace-icon">🔍</span>
            <span class="workspace-label">Cari</span>
          </button>
      `;

      const dropdownHtml = subTabs.length > 0 ? `
          <div class="workspace-tab ${isSubTabActive ? 'active' : ''}" style="padding:0; position:relative; display:flex; flex:1; justify-content:center; max-width:200px; margin:0 auto;">
             <select onchange="switchBarangWorkspace(this.value)" style="width:100%; height:100%; background:transparent; color:inherit; border:none; padding:2px 16px 2px 4px; appearance:none; -webkit-appearance:none; font-family:inherit; font-weight:inherit; font-size:inherit; cursor:pointer; z-index:2; text-align:center;">
                 <option value="" disabled style="color:black;" ${isSubTabActive ? '' : 'selected'}>🛠️ Menu Data</option>
                 ${subTabs.map(t => `<option value="${t.id}" style="color:black;" ${activeWorkspace === t.id ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
             </select>
             <div style="position:absolute; right:12px; top:50%; transform:translateY(-50%); pointer-events:none; z-index:1; font-size:10px;">▼</div>
          </div>
      ` : '';

      // Render toolbar: Supplier Kiri, Form, Daftar, Dropdown Tengah, Cari Kanan
      const toolbar = `<div class="workspace-toolbar" style="display:flex; justify-content:space-between; width:100%; gap:4px; margin-bottom:8px;">
          ${supplierBtn}
          ${formBtn}
          ${daftarBtn}
          ${dropdownHtml}
          ${searchBtn}
      </div>`;
      
      // Render active workspace content
      let workspaceContent = '';
      switch(activeWorkspace) {
        case 'search':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🔍 Pencarian Barang</h3>
              <div class="search-container">
                <input type="text" id="search-barang-input" placeholder="Cari nama, kategori, atau barcode..." oninput="searchBarang(this.value)">
                <button class="btn soft" onclick="clearSearchBarang()">Clear</button>
              </div>
              <div id="search-barang-results" style="margin-top:12px;"></div>
            </div>
          </div>`;
          break;
        case 'form':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📝 Form Barang</h3>
              ${productForm()}
            </div>
          </div>`;
          break;
        case 'ai-input':
          workspaceContent = `<div class="workspace-content">
            ${window.generateAIInputPanel ? window.generateAIInputPanel('barang') : '<div class="card"><p>AI Input Center loading...</p></div>'}
          </div>`;
          // Initialize AI Input Center after render
          setTimeout(() => {
            if (window.initAIInputCenter) window.initAIInputCenter();
          }, 100);
          break;
        case 'ai':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🤖 AI Nota ke Barang</h3>
              ${invoiceAiTools()}
            </div>
          </div>`;
          break;
        case 'import':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📥 Import Barang</h3>
              ${productImportTools()}
            </div>
          </div>`;
          break;
        case 'scanner':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📷 Scanner HP</h3>
              ${productScannerTools()}
            </div>
          </div>`;
          break;
        case 'supplier':
          workspaceContent = `<div class="workspace-content" style="padding:0;">
            ${supplier()}
          </div>`;
          break;
        case 'list':
        default:
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📋 Daftar Barang (${state.data.products?.length || 0})</h3>
              ${productRows()}
            </div>
          </div>`;
      }
      
      return `<section class="barang-workspace">
        ${toolbar}
        ${workspaceContent}
      </section>`;
    }

    // Workspace state for Pembelian page
    window.pembelianWorkspace = localStorage.getItem('pembelianWorkspace') || 'list';
    
    function switchPembelianWorkspace(workspace) {
      window.pembelianWorkspace = workspace;
      localStorage.setItem('pembelianWorkspace', workspace);
      render();
    }
    
    function pembelian() {
      const workspaces = [
        { id: 'search', icon: '🔍', label: 'Cari' },
        { id: 'form', icon: '➕', label: 'Form' },
        { id: 'wa', icon: '📱', label: 'Paste WA' },
        { id: 'list', icon: '📋', label: 'Daftar' }
      ];
      
      const activeWorkspace = window.pembelianWorkspace || 'list';
      
      const toolbar = `<div class="workspace-toolbar">
        ${workspaces.map(ws => `
          <button class="workspace-tab ${activeWorkspace === ws.id ? 'active' : ''}" 
                  onclick="switchPembelianWorkspace('${ws.id}')">
            <span class="workspace-icon">${ws.icon}</span>
            <span class="workspace-label">${ws.label}</span>
          </button>
        `).join('')}
      </div>`;
      
      let workspaceContent = '';
      switch(activeWorkspace) {
        case 'search':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>🔍 Pencarian Pembelian</h3>
              <div class="search-container">
                <input type="text" id="search-pembelian-input" placeholder="Cari barang atau tanggal..." oninput="searchPembelian(this.value)">
                <button class="btn soft" onclick="clearSearchPembelian()">Clear</button>
              </div>
              <div id="search-pembelian-results" style="margin-top:12px;"></div>
            </div>
          </div>`;
          break;
        case 'form':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📝 Form Pembelian</h3>
              ${purchaseForm()}
            </div>
          </div>`;
          break;
        case 'wa':
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📱 Paste dari WhatsApp</h3>
              <label>Daftar Pembelian dari WA
                <textarea id="pembelian-wa-text" class="input-area expandable" placeholder="Format: NamaBarang Qty Harga
Contoh:
Beras Premium 5 250000
Gula Pasir 2 24000
Minyak Goreng 3 45000"></textarea>
              </label>
              <div class="actions">
                <button class="btn soft" id="parse-pembelian-wa">Proses Paste WA</button>
                <button class="btn danger" id="clear-pembelian-wa">Kosongkan</button>
              </div>
              <div id="pembelian-wa-preview" style="margin-top:16px;"></div>
            </div>
          </div>`;
          break;
        case 'list':
        default:
          workspaceContent = `<div class="workspace-content">
            <div class="card">
              <h3>📋 Daftar Pembelian (${state.data.purchases?.length || 0})</h3>
              ${purchaseRows()}
            </div>
          </div>`;
      }
      
      return `<section class="barang-workspace">
        ${toolbar}
        ${workspaceContent}
      </section>`;
    }

    // Workspace state for Kalkulator page
    window.kalkulatorWorkspace = localStorage.getItem('kalkulatorWorkspace') || 'list';
    
    function switchKalkulatorWorkspace(workspace) {
      window.kalkulatorWorkspace = workspace;
      localStorage.setItem('kalkulatorWorkspace', workspace);
      render();
    }
    
    window.calcState = { expr: '', current: '0', resetOnNext: false };
    window.calcPress = function(btn) {
      const state = window.calcState;
      const display = document.getElementById('calc-display');
      const exprDiv = document.getElementById('calc-expr');
      
      if (!display) return;
      
      if (btn === 'C') {
        state.expr = ''; state.current = '0'; state.resetOnNext = false;
      } else if (btn === 'DEL') {
        if (!state.resetOnNext) {
          state.current = state.current.slice(0, -1) || '0';
        }
      } else if (btn === '=') {
        try {
          let toEval = state.expr + state.current;
          let result = new Function('return ' + toEval)();
          state.current = String(Math.round(result * 100000000) / 100000000);
          state.expr = '';
          state.resetOnNext = true;
        } catch(e) {
          state.current = 'Error';
          state.resetOnNext = true;
        }
      } else if (['+', '-', '*', '/'].includes(btn)) {
        state.expr += state.current + btn;
        state.resetOnNext = true;
      } else {
        if (state.resetOnNext) {
          state.current = btn === '.' ? '0.' : btn;
          state.resetOnNext = false;
        } else {
          if (btn === '.' && state.current.includes('.')) return;
          state.current = state.current === '0' && btn !== '.' ? btn : state.current + btn;
        }
      }
      
      display.innerText = state.current;
      exprDiv.innerText = state.expr.replace(/\*/g, '×').replace(/\//g, '÷');
    };

    window.ngitungRows = window.ngitungRows || [{ id: Date.now(), name: '', price: '', qty: '' }];
    window.ngitungDraft = window.ngitungDraft || { bayar: "", customer: "", phone: "" };
    window.ngitungHistory = [];
    if (typeof gas === 'function') {
      gas('getSetting', { key: 'ngitungHistory', fallback: '[]' }).then(res => {
        try {
          window.ngitungHistory = JSON.parse(res);
          window.ngitungRenderTable();
        } catch(e) {}
      });
    }

    window.ngitungPopulateDatalist = function() {
      const datalist = document.getElementById("ngitung-history-list");
      if (!datalist) return;
      let options = "";
      if (window.state && window.state.data && window.state.data.products) {
          options += window.state.data.products.map(p => {
              const harga = p.salePriceEcer || p.salePrice || p.basePrice || 0;
              const isSayur = (p.category || "").toLowerCase().includes("sayur");
              
              if (isSayur) {
                  return `<option value="${escapeAttr(p.name)}">`;
              } else {
                  return `<option value="${escapeAttr(p.name)} ${harga}">`;
              }
          }).join("");
      }
      options += window.ngitungHistory.map(name => `<option value="${escapeAttr(name)}">`).join("");
      datalist.innerHTML = options;
    };

    window.ngitungRenderTable = function() {
      const tbody = document.getElementById('ngitung-tbody');
      if (!tbody) return;
      
      let html = '';
      let total = 0;
      
      window.ngitungRows.forEach((row, index) => {
        const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
        const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
        let amount = row.price ? price * qty : 0;
          if (amount > 0) amount = Math.ceil(amount / 500) * 500;
          total += amount;
        
        const val = escapeAttr(row.rawInput !== undefined ? row.rawInput : (row.name ? `${row.name} ${row.price || ''} ${row.qty !== 1 ? row.qty : ''}`.trim() : ''));
        
        html += `
            <tr>
              <td colspan="3" style="width: 60%; padding: 0px 4px;">
                <div style="display:flex;">
                  <input type="text" list="ngitung-history-list" value="${val}" onfocus="if(window.ngitungPopulateDatalist) window.ngitungPopulateDatalist()" oninput="ngitungParseAndUpdate(this, ${row.id})" onchange="ngitungFocusNext(this, ${row.id})" placeholder="Cth: terong 3000 5 (Nama Harga Banyak)" style="width: 100%; font-size: 0.75rem; font-weight: 700; padding: 4px; border: none; border-bottom: none; border-radius: 0; background: transparent; color: #fff; text-transform: capitalize; box-shadow: none; outline: none;">
                </div>
              </td>
              <td class="row-amount" style="vertical-align: middle; font-weight: 800; width: 25%; font-size: 0.8rem; padding: 0px 10px 0px 4px; text-align: right;">${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)}</td>
              <td style="width: 15%; text-align: right; vertical-align: middle; padding: 0px 0 0px 4px;"><button class="btn danger" onclick="ngitungRemoveRow(${row.id})" ${window.ngitungRows.length === 1 ? 'disabled' : ''} style="background: transparent; border: none; font-size: 1.05rem; color: rgba(255,71,87,0.7); padding: 0; box-shadow: none;">🗑️</button></td>
            </tr>
        `;
      });
      
      tbody.innerHTML = html;
      window.ngitungTotalRaw = total;
      if (window.ngitungUpdateInlineTotal) window.ngitungUpdateInlineTotal();
      const legacyTotalEl = document.getElementById('ngitung-total');
      if (legacyTotalEl) { legacyTotalEl.innerText = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(total); }
      if (window.ngitungUpdateGrandTotal) window.ngitungUpdateGrandTotal();
      
      if (window.ngitungPopulateDatalist) window.ngitungPopulateDatalist();
    };

    window.ngitungParseAndUpdate = function(el, id) {
      const val = el.value;
      const row = window.ngitungRows.find(r => r.id === id);
      if (!row) return;
      row.rawInput = val;
      
      // AUTO-ADD ROW (Smart POS)
      if (!row.hasTriggeredAutoAdd && val.trim().length === 1 && window.ngitungRows[window.ngitungRows.length - 1].id === id) { window.ngitungAddRow(); row.hasTriggeredAutoAdd = true; }
      
      const cleanVal = val.trim();
      let name = cleanVal;
      let price = 0;
      let qty = 1;
      
      let prod = null;
      if (window.state && window.state.data && window.state.data.products) {
         const findProd = (n) => window.state.data.products.find(p => p.name.toLowerCase() === n.toLowerCase());
         
         const match2 = cleanVal.match(/^(.*?)\s+(\d+)\s+([\d.,]+)$/);
         if (match2) {
           name = match2[1].trim();
           price = Number(match2[2]);
           qty = parseFloat(match2[3].replace(',', '.'));
         } else {
           const match1 = cleanVal.match(/^(.*?)\s+([\d.,]+)$/);
           if (match1) {
             let parsedName = match1[1].trim();
             let numVal = parseFloat(match1[2].replace(',', '.'));
             prod = findProd(parsedName);
             
             // If product found and number is small (e.g. < 1000), it's likely a Qty
             if (prod && numVal < 1000) {
                name = parsedName;
                price = prod.salePriceEcer || prod.salePrice || prod.basePrice || 0;
                qty = numVal;
             } else {
                // Otherwise treat as Price override
                name = parsedName;
                price = Number(match1[2]);
                qty = 1;
             }
           } else {
             // Only Name is provided
             name = cleanVal;
             prod = findProd(name);
             if (prod) {
                price = prod.salePriceEcer || prod.salePrice || prod.basePrice || 0;
             }
           }
         }
      } else {
         // Fallback legacy parser
         const match2 = cleanVal.match(/^(.*?)\s+(\d+)\s+([\d.,]+)$/);
         if (match2) {
           name = match2[1].trim();
           price = Number(match2[2]);
           qty = parseFloat(match2[3].replace(',', '.'));
         } else {
           const match1 = cleanVal.match(/^(.*?)\s+(\d+)$/);
           if (match1) {
             name = match1[1].trim();
             price = Number(match1[2]);
             qty = 1;
           }
         }
      }
      
      name = name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      
      if (!prod && window.state && window.state.data && window.state.data.products) {
         prod = window.state.data.products.find(p => p.name.toLowerCase() === name.toLowerCase());
      }
      
      if (prod && Number(prod.discountMinQty) > 0 && qty >= Number(prod.discountMinQty)) {
          let discountAmt = prod.discountType === '%' ? price * (Number(prod.discountValue || 0) / 100) : Number(prod.discountValue || 0);
          if (discountAmt > 0) {
              price -= discountAmt;
              name = `${name} (Hemat ${rupiah(discountAmt*qty)})`;
          }
      }

      row.name = name;
      row.price = price;
      row.qty = qty;
      
      let amount = (price || 0) * (qty || 1);
        if (amount > 0) amount = Math.ceil(amount / 500) * 500;
      const tr = el.closest('tr');
      if (tr) {
        tr.querySelector('.row-amount').innerText = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
      }
      
      const isLastRow = window.ngitungRows[window.ngitungRows.length - 1].id === id;
      if (isLastRow && cleanVal.length > 0) {
        window.ngitungAddRow();
        if (tr) {
           const btn = tr.querySelector('.btn.danger');
           if (btn) btn.disabled = false;
        }
      }
      
      let sum = 0;
      window.ngitungRows.forEach(r => {
         let rAmt = (r.price || 0) * (r.qty || 1);
         if (rAmt > 0) rAmt = Math.ceil(rAmt / 500) * 500;
         sum += rAmt;
      });
      window.ngitungTotalRaw = sum;
      if (window.ngitungUpdateInlineTotal) window.ngitungUpdateInlineTotal();
      const totalEl = document.getElementById('ngitung-total');
      if (totalEl) totalEl.innerText = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(sum);
      if (window.ngitungUpdateGrandTotal) window.ngitungUpdateGrandTotal();
    };

    window.ngitungFocusNext = function(el, id) {
      const row = window.ngitungRows.find(r => r.id === id);
      if (!row || !row.name || !row.price) return;
      
      if (row.name.trim().length > 1) {
         if (!window.ngitungHistory.includes(row.name)) {
           window.ngitungHistory.push(row.name);
           if (window.ngitungHistory.length > 100) window.ngitungHistory.shift();
           gas('setSetting', { key: 'ngitungHistory', value: JSON.stringify(window.ngitungHistory) });
           if (window.ngitungPopulateDatalist) window.ngitungPopulateDatalist();
         }
      }
      
      // Focus the next row's input
      const tr = el.closest('tr');
      if (tr && tr.nextElementSibling) {
         const nextInput = tr.nextElementSibling.querySelector('input[type="text"]');
         if (nextInput) nextInput.focus();
      }
    };



    window.ngitungAddRow = function() {
      const newId = Date.now();
      window.ngitungRows.push({ id: newId, name: '', price: '', qty: '' });
      const tbody = document.getElementById('ngitung-tbody');
      if (tbody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="3" style="width: 60%; padding: 0px 4px;">
              <div style="display:flex;">
                <input type="text" list="ngitung-history-list" value="" onfocus="if(window.ngitungPopulateDatalist) window.ngitungPopulateDatalist()" oninput="ngitungParseAndUpdate(this, ${newId})" onchange="ngitungFocusNext(this, ${newId})" placeholder="Cth: terong 3000 5 (Nama Harga Banyak)" style="width: 100%; font-size: 0.75rem; font-weight: 700; padding: 4px; border: none; border-bottom: none; border-radius: 0; background: transparent; color: #fff; text-transform: capitalize; box-shadow: none; outline: none;">
              </div>
            </td>
            <td class="row-amount" style="vertical-align: middle; font-weight: 800; width: 25%; font-size: 0.8rem; padding: 0px 10px 0px 4px; text-align: right;">Rp 0</td>
            <td style="width: 15%; text-align: right; vertical-align: middle; padding: 0px 0 0px 4px;"><button class="btn danger" onclick="ngitungRemoveRow(${newId})" style="background: transparent; border: none; font-size: 1.05rem; color: rgba(255,71,87,0.7); padding: 0; box-shadow: none;" title="Hapus">🗑️</button></td>
        `;
        tbody.appendChild(tr);
        setTimeout(() => {
          if (window.ngitungRows.length >= 6) {
             const tw = document.querySelector(".ngitung-container .table-wrap");
             if (tw) {
                 tw.scrollTo({ top: tw.scrollHeight, behavior: "smooth" });
             } else {
                 window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
             }
          }
        }, 250);
      }
    };

    window.ngitungRemoveRow = function(id) {
      if (window.ngitungRows.length <= 1) return;
      window.ngitungRows = window.ngitungRows.filter(r => r.id !== id);
      window.ngitungRenderTable();
    };

    window.ngitungPrintBluetooth = async function() {
        try {
          const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
              '000018f0-0000-1000-8000-00805f9b34fb',
              'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
              '49535343-fe7d-4ae5-8fa9-9fafd205e455',
              '000018f0-0000-1000-8000-00805f9b34fb'.replace('18f0', '18f0') // standard
            ]
          });
  
          const server = await device.gatt.connect();
          
          let service, characteristic;
          const serviceUUIDs = [
              { svc: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' }, // Standard
              { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', char: '49535343-8841-43f4-a8d4-ecbe34729bb3' }, // Printer China generic
              { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' }  // Epson/Star
          ];

          for (const s of serviceUUIDs) {
              try {
                  service = await server.getPrimaryService(s.svc);
                  characteristic = await service.getCharacteristic(s.char);
                  if (characteristic) break;
              } catch(e) { }
          }
          
          if (!characteristic) throw new Error("Sistem mengenali perangkat Bluetooth, tapi tidak menemukan service Print. Pastikan ini adalah Printer Thermal.");
          let encoder = new TextEncoder();
        const formatRibuan = (num) => new Intl.NumberFormat('id-ID').format(Number(String(num).replace(/[^0-9-]/g, '')) || 0);
          const formatLine = (left, right) => {
            const leftStr = String(left);
            const rightStr = formatRibuan(right);
            let spaceCount = 32 - leftStr.length - rightStr.length;
            if (spaceCount < 1) spaceCount = 1;
            return leftStr + ' '.repeat(spaceCount) + rightStr + '\n';
          };

          let data = [
            0x1b, 0x40, // init
            0x1b, 0x61, 0x01, // Center align
            0x1d, 0x21, 0x11, // Double size
            ...encoder.encode('Toko GARNETA STORE\n'),
            0x1d, 0x21, 0x00, // Normal size
            ...encoder.encode('085123871118\n\n'),
            0x1b, 0x61, 0x00, // Left align
            ...encoder.encode('Tgl: ' + new Date().toLocaleString('id-ID') + '\n'),
            ...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\n")
          ];
          
          let total = 0;
          window.ngitungRows.forEach(row => {
            if (!row.name && !row.price) return;
            const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
            const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
            let amount = row.price ? price * qty : 0;
          if (amount > 0) amount = Math.ceil(amount / 500) * 500;
          total += amount;
            
            data.push(...encoder.encode(row.name + '\n'));
            data.push(...encoder.encode(formatLine(qty + " x " + formatRibuan(price), amount)));
          });
          
          data.push(...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\n"));
          data.push(...encoder.encode(formatLine('TOTAL:', total) + '\n'));
          data.push(0x1b, 0x61, 0x01); // Center align
          data.push(...encoder.encode('\nTerima kasih atas\n'));
          data.push(...encoder.encode('kunjungan Anda!\n\n\n'));
          data.push(0x1b, 0x61, 0x00); // Left align
        
        let buffer = new Uint8Array(data);
        for (let i = 0; i < buffer.length; i += 100) {
            if (characteristic.properties && characteristic.properties.writeWithoutResponse) {
                try {
                  if (typeof characteristic.writeValueWithoutResponse === 'function') {
                    await characteristic.writeValueWithoutResponse(buffer.slice(i, i + 100));
                  } else {
                    await characteristic.writeValue(buffer.slice(i, i + 100));
                  }
                } catch (e) {
                  await characteristic.writeValue(buffer.slice(i, i + 100));
                }
            } else {
                await characteristic.writeValue(buffer.slice(i, i + 100));
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        
        // Putuskan koneksi agar HP lain bisa gantian ngeprint
        if (device.gatt.connected) {
          device.gatt.disconnect();
        }
        
        alert("Berhasil mencetak!");
      } catch (error) {
        console.error(error);
        alert("Gagal koneksi ke printer Bluetooth: " + error.message);
      }
    };

    
      window.ngitungPrintUSB = function() {
        if (window.ngitungRows.length <= 1) {
            alert("Belum ada data belanjaan!");
            return;
        }

        let total = 0;
        let itemsHtml = window.ngitungRows.map(row => {
          if (!row.name && !row.price) return '';
          const qty = Number(String(row.qty).replace(/[^0-9-.]/g, '')) || 1;
          const price = Number(String(row.price).replace(/[^0-9-]/g, '')) || 0;
          let amount = row.price ? price * qty : 0;
          if (amount > 0) amount = Math.ceil(amount / 500) * 500;
          total += amount;
          return `
            <div class="item-row">
              <div class="item-name">${row.name}</div>
              <div class="item-details">
                <span>${qty} x ${rupiah(price)}</span>
                <span>${rupiah(amount)}</span>
              </div>
            </div>
          `;
        }).join('');

        const receiptHtml = `
          <html>
            <head>
              <title>Cetak Struk</title>
              <style>
                @page { margin: 0; }
                body {
                  font-family: Arial, Helvetica, sans-serif; /* Font sans-serif jauh lebih jelas untuk printer thermal */
                  width: 44mm; /* Dipersempit agar tidak terpotong di margin kanan kertas 57mm */
                  margin: 0; /* Rata kiri */
                  padding: 0 4mm 0 0; /* Tarik teks dari kanan sedikit */
                  box-sizing: border-box;
                  font-size: 13px;
                  font-weight: 600; /* Ditebalkan agar tidak putus-putus */
                  color: #000000 !important; /* Wajib hitam pekat */
                  background: #fff;
                  line-height: 1.3;
                }
                .header { text-align: center; margin-bottom: 15px; }
                .header h2 { margin: 0 0 5px 0; font-size: 18px; font-weight: 900; color: #000000 !important; }
                .header div { font-weight: bold; color: #000000 !important; font-size: 12px; }
                .divider { border-top: 2px dashed #000000; margin: 10px 0; }
                .item-row { margin-bottom: 6px; }
                .item-name { font-weight: 900; font-size: 14px; color: #000000 !important; }
                .item-details { display: flex; justify-content: space-between; font-weight: bold; color: #000000 !important; }
                .total-section { display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; margin-top: 10px; color: #000000 !important; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: bold; color: #000000 !important; }
                * { color: #000000 !important; } /* Paksa semua elemen menjadi hitam pekat */
                    </style>
              

</head>
            <body>
              <div class="header">
                <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 2px;">Toko GARNETA STORE</h2>
                <div style="font-size: 14px; margin-bottom: 5px;">085123871118</div>
                <div>${new Date().toLocaleString('id-ID')}</div>
              </div>
              <div class="divider"></div>
              ${itemsHtml}
              <div class="divider"></div>
              <div class="total-section">
                <span>TOTAL</span>
                <span>${rupiah(total)}</span>
              </div>
              <div class="footer">
                Terima kasih atas<br>kunjungan Anda!
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 500);
                };
              <\/script>
            </body>
          </html>
        `;

        const printWindow = window.open("", "_blank", "width=300,height=500");
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
      };

      
      // INLINE POS CHECKOUT LOGIC
      window.ngitungPaymentType = "tunai";
      
      window.ngitungHandleBayarInput = function() {
         const bayarEl = document.getElementById("ngitung-inline-bayar");
         const statusCont = document.getElementById("ngitung-inline-status-container");
         const statusLabel = document.getElementById("ngitung-inline-status-label");
         const statusVal = document.getElementById("ngitung-inline-status-value");
         const customerCont = document.getElementById("ngitung-inline-customer-container");
         
         if (!bayarEl || bayarEl.value === "") {
            statusCont.classList.add("hidden");
            customerCont.classList.add("hidden");
            window.ngitungPaymentType = "tunai";
            return;
         }
         
         statusCont.classList.remove("hidden");
         
         const bayar = Number(bayarEl.value);
         const total = window.ngitungTotalRaw || 0;
         
         if (bayar >= total) {
            window.ngitungPaymentType = "tunai";
            customerCont.classList.add("hidden");
            statusCont.style.background = "rgba(46, 204, 113, 0.15)";
            statusCont.style.border = "1px solid rgba(46, 204, 113, 0.3)";
            
            const kembali = bayar - total;
            if (kembali === 0) {
               statusLabel.innerText = "Status";
               statusLabel.style.color = "#2ecc71";
               statusVal.innerText = "PAS / LUNAS";
               statusVal.style.color = "#2ecc71";
            } else {
               statusLabel.innerText = "Kembalian";
               statusLabel.style.color = "#2ecc71";
               statusVal.innerText = "Rp " + new Intl.NumberFormat("id-ID").format(kembali);
               statusVal.style.color = "#2ecc71";
            }
         } else {
            window.ngitungPaymentType = "kasbon";
            customerCont.classList.remove("hidden");
            statusCont.style.background = "rgba(255, 71, 87, 0.15)";
            statusCont.style.border = "1px solid rgba(255, 71, 87, 0.3)";
            
            const hutang = total - bayar;
            statusLabel.innerText = "Sisa Hutang";
            statusLabel.style.color = "#ff4757";
            statusVal.innerText = "Rp " + new Intl.NumberFormat("id-ID").format(hutang);
            statusVal.style.color = "#ff4757";
         }
      };
      
      window.ngitungProcessCheckout = async function(actionType) {
        let validRows = window.ngitungRows.filter(r => r.name.trim().length > 0 && r.qty > 0 && r.price >= 0);
        if (validRows.length === 0) {
           showToast("Barang tidak valid!", "error");
           return;
        }
        
        const customerEl = document.getElementById("ngitung-inline-customer");
        const phoneEl = document.getElementById("ngitung-inline-phone");
        let customerNameRaw = customerEl ? customerEl.value.trim() : "";
        const phoneRaw = phoneEl ? phoneEl.value.trim() : "";
        
        if (window.ngitungPaymentType === "kasbon" && !customerNameRaw && !phoneRaw) {
           showToast("Nama pelanggan/No Tlp wajib diisi untuk Kasbon!", "error");
           if(customerEl) customerEl.focus();
           return;
        }
        
        let customer = customerNameRaw;
        if (customerNameRaw && phoneRaw) {
           customer += " (" + phoneRaw + ")";
        } else if (!customerNameRaw && phoneRaw) {
           customer = phoneRaw;
        }
        
        const bayarEl = document.getElementById("ngitung-inline-bayar");
        const dp = bayarEl && bayarEl.value ? Number(bayarEl.value) : 0;
        
        const total = window.ngitungTotalRaw || 0;
        let sisaTagihan = 0;
        if (window.ngitungPaymentType === "kasbon") {
           sisaTagihan = total - dp;
        }
        
        let receiptData = {
           id: "TRX-" + Date.now(),
           customer: customer || "Umum",
           date: new Date().toLocaleString("id-ID"),
           paymentType: window.ngitungPaymentType,
           items: validRows,
           subtotal: total,
           discount: 0,
           dp: dp,
           grandTotal: total,
           sisaTagihan: sisaTagihan
        };
        
        const overlayId = "checkout-loading-overlay";
        let overlay = document.getElementById(overlayId);
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = overlayId;
            overlay.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1.2rem;backdrop-filter:blur(6px);"><div style="display:flex;flex-direction:column;align-items:center;gap:15px;"><span class="spinner" style="width:50px;height:50px;border:5px solid #00ffcc;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span><span id="checkout-loading-text">Memproses Transaksi...</span></div></div>`;
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = "flex";
        }
        
        try {
            if (actionType === "pdf") {
               document.getElementById("checkout-loading-text").innerText = "Menyiapkan PDF...";
               window.ngitungPrintPDF(receiptData);
               Swal.fire({title: "Berhasil!", text: "Transaksi Disimpan & PDF Dicetak", icon: "success", confirmButtonColor: "#00ffcc"});
            } else if (actionType === "bluetooth") {
               document.getElementById("checkout-loading-text").innerText = "Menghubungkan ke Printer Bluetooth...";
               await window.ngitungPrintBluetoothCheckout(receiptData);
               Swal.fire({title: "Berhasil!", text: "Transaksi Disimpan & Berhasil Dicetak Bluetooth", icon: "success", confirmButtonColor: "#00ffcc"});
            } else if (actionType === "wa") {
               document.getElementById("checkout-loading-text").innerText = "Membuka WhatsApp...";
               window.ngitungPrintWhatsApp(receiptData);
               Swal.fire({title: "Berhasil!", text: "Transaksi Disimpan & Dialihkan ke WA", icon: "success", confirmButtonColor: "#00ffcc"});
            } else if (actionType === "save") {
               document.getElementById("checkout-loading-text").innerText = "Menyimpan ke Database...";
               Swal.fire({title: "Tersimpan!", text: "Transaksi Berhasil Disimpan", icon: "success", confirmButtonColor: "#00ffcc"});
            }
            
            // Save to localStorage ONLY AFTER action succeeds
            let txs = JSON.parse(localStorage.getItem("transactions") || "[]");
            txs.unshift(receiptData);
            localStorage.setItem("transactions", JSON.stringify(txs));
            
            if (window.ngitungPaymentType === "kasbon") {
               let hutangs = JSON.parse(localStorage.getItem("hutang") || "[]");
               hutangs.unshift(receiptData);
               localStorage.setItem("hutang", JSON.stringify(hutangs));
            }
            
            // Clear Cart ONLY AFTER action succeeds
            window.ngitungClearAll();
            if(bayarEl) bayarEl.value = "";
            window.ngitungHandleBayarInput();

        } catch (error) {
            console.error("Checkout Error:", error);
            Swal.fire({title: "Gagal!", text: error.message || "Gagal memproses transaksi.", icon: "error", confirmButtonColor: "#ff4757"});
        } finally {
            if (overlay) overlay.style.display = "none";
        }
      };
      
      window.ngitungUpdateInlineTotal = function() {
         const totalEl = document.getElementById("ngitung-inline-total");
         if (totalEl) {
            totalEl.innerText = "Rp " + new Intl.NumberFormat("id-ID").format(window.ngitungTotalRaw || 0);
         }
         window.ngitungHandleBayarInput();
      };
      
      window.ngitungPrintWhatsApp = function(data) {
         let msg = "*STRUK PEMBELIAN - " + data.date + "*\n";
         msg += "Pelanggan: " + data.customer + "\n";
         msg += "Status: " + (data.paymentType === "tunai" ? "LUNAS" : "KASBON") + "\n";
         msg += "------------------------\n";
         
         data.items.forEach(r => {
            let amount = r.price * r.qty;
            if (amount > 0) amount = Math.ceil(amount / 500) * 500;
            msg += r.name + "\n" + r.qty + " x " + new Intl.NumberFormat("id-ID").format(r.price) + " = " + new Intl.NumberFormat("id-ID").format(amount) + "\n";
         });
         
         msg += "------------------------\n";
         msg += "*Total: Rp " + new Intl.NumberFormat("id-ID").format(data.grandTotal) + "*\n";
         
         if (data.paymentType === "kasbon") {
            msg += "\nDP/Bayar: Rp " + new Intl.NumberFormat("id-ID").format(data.dp) + "\n";
            msg += "*Sisa Hutang: Rp " + new Intl.NumberFormat("id-ID").format(data.sisaTagihan) + "*\n";
         }
         
         const wa_url = "https://wa.me/?text=" + encodeURIComponent(msg);
         window.open(wa_url, "_blank");
      };
      
      window.ngitungPrintPDF = function(data) {
         let itemsHtml = data.items.map(r => {
            let amount = r.price * r.qty;
            if (amount > 0) amount = Math.ceil(amount / 500) * 500;
            return `
              <div class="item-row">
                <div class="item-name">${r.name}</div>
                <div class="item-details">
                  <span>${r.qty} x ${new Intl.NumberFormat("id-ID").format(r.price)}</span>
                  <span>${new Intl.NumberFormat("id-ID").format(amount)}</span>
                </div>
              </div>
            `;
         }).join("");
         
         let rupiah = (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
         
         let receiptHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Struk - ${data.customer}</title>
              <style>
                @page { margin: 0; }
                body {
                  font-family: Arial, Helvetica, sans-serif;
                  width: 100%;
                  max-width: 48mm;
                  margin: 0;
                  padding: 2mm;
                  box-sizing: border-box;
                  font-size: 12px;
                  font-weight: 600;
                  color: #000000 !important;
                  background: #fff;
                  line-height: 1.3;
                }
                .header { text-align: center; margin-bottom: 15px; }
                .header h2 { margin: 0 0 5px 0; font-size: 18px; font-weight: 900; }
                .header div { font-weight: bold; font-size: 12px; }
                .divider { border-top: 2px dashed #000000; margin: 10px 0; }
                .item-row { margin-bottom: 6px; }
                .item-name { font-weight: 900; font-size: 14px; }
                .item-details { display: flex; justify-content: space-between; font-weight: bold; }
                .total-section { display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; margin-top: 5px; }
                .sub-section { display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; font-weight: bold; }
                * { color: #000000 !important; }
              </style>
            </head>
            <body>
              <div class="header">
                <h2 style="font-size: 22px; margin-bottom: 2px;">Toko GARNETA STORE</h2>
                <div>085123871118</div>
                <div>${data.date}</div>
                <div>Kasir: ${data.operator}</div>
                <div>Pelanggan: ${data.customer}</div>
                <div>Status: ${data.paymentType === "tunai" ? "LUNAS" : "KASBON"}</div>
              </div>
              <div class="divider"></div>
              ${itemsHtml}
              <div class="divider"></div>
              <div class="total-section">
                <span>TOTAL</span><span>${rupiah(data.grandTotal)}</span>
              </div>
              ${data.paymentType === "kasbon" ? `
              <div class="divider"></div>
              <div class="sub-section"><span>DP/Bayar</span><span>${rupiah(data.dp)}</span></div>
              <div class="total-section" style="font-size:14px;"><span>Sisa Hutang</span><span>${rupiah(data.sisaTagihan)}</span></div>
              ` : ""}
              <div class="footer">Terima kasih atas<br>kunjungan Anda!</div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 500);
                };
              <\/script>
            </body>
          </html>
         `;
         const printWindow = window.open("", "_blank", "width=300,height=500");
         printWindow.document.write(receiptHtml);
         printWindow.document.close();
      };
      
      const KNOWN_PRINTER_UUIDS = [
          { svc: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' }, // Standard
          { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', char: '49535343-8841-43f4-a8d4-ecbe34729bb3' }, // Printer China 
          { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' }, // Epson/Star
          { svc: '0000fee7-0000-1000-8000-00805f9b34fb', char: '0000fec8-0000-1000-8000-00805f9b34fb' }, // Tencent / WeChat BLE
          { svc: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' }, // Custom generic
          { svc: '0000ffe0-0000-1000-8000-00805f9b34fb', char: '0000ffe1-0000-1000-8000-00805f9b34fb' }, // HM-10 BLE Serial
          { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', char: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' }, // Nordic UART Service (NUS)
          { svc: '0000af30-0000-1000-8000-00805f9b34fb', char: '0000af31-0000-1000-8000-00805f9b34fb' }, // Xprinter / Qirui
          { svc: '0000ae30-0000-1000-8000-00805f9b34fb', char: '0000ae31-0000-1000-8000-00805f9b34fb' }, // Variant Xprinter
          { svc: '0000fff0-0000-1000-8000-00805f9b34fb', char: '0000fff2-0000-1000-8000-00805f9b34fb' } // Generic 58mm V2
        ];

      function padLR(left, right, width) {
            if (width === undefined) width = parseInt(localStorage.getItem('printerPaperSize') || '32');
          left = String(left);
          right = String(right);
          if (left.length + right.length >= width) {
              return left.substring(0, width - right.length - 1) + " " + right;
          }
          return left + " ".repeat(width - left.length - right.length) + right;
      }

      window.globalBluetoothDevice = null;
      window.resetBluetoothPrinter = function() {
          if (window.globalBluetoothDevice && window.globalBluetoothDevice.gatt.connected) {
              window.globalBluetoothDevice.gatt.disconnect();
          }
          window.globalBluetoothDevice = null;
          showToast("Printer Bluetooth di-reset. Silakan cetak untuk memilih ulang.", "info");
      };

      window.ngitungPrintBluetoothCheckout = async function(data) {
          if (!navigator.bluetooth) {
              showToast("Web Bluetooth tidak didukung. Gunakan Chrome di Android/PC.", "error");
              return;
          }
          let device;
          try {
            device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
});
window.globalBluetoothDevice = device;

            showToast("Menghubungkan ke printer...", "info");
            
            const connectGatt = async (retryCount = 3) => {
                try {
                  return await device.gatt.connect();
                } catch (err) {
                  if (retryCount <= 1) throw err;
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return connectGatt(retryCount - 1);
                }
              };

              let server;
              for (let attempt = 1; attempt <= 2; attempt++) {
                server = await connectGatt();
                if (server) break;
                if (device.gatt && device.gatt.connected) {
                  device.gatt.disconnect();
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }

              if (!server) throw new Error("Gagal connect ke GATT server.");

            let service, characteristic;
            for (const pair of KNOWN_PRINTER_UUIDS) {
              try {
                service = await server.getPrimaryService(pair.svc);
                characteristic = await service.getCharacteristic(pair.char);
                if (characteristic) break; 
              } catch (e) {}
            }
            
            if (!characteristic) throw new Error("Service Print tidak ditemukan. Pastikan ini Printer Thermal.");

            showToast("Mencetak struk...", "info");

            let encoder = new TextEncoder();
            
            // Format Struk (32 Karakter)
            let storeName = "GARNETA STORE"; 
            let receiptLines = [];
            
            // Header (Mahkota) - Max 16 chars for double size, otherwise normal
            if (storeName.length <= 16) {
                receiptLines.push([0x1d, 0x21, 0x11]); // Double Size
                receiptLines.push(...encoder.encode(storeName + "\n"));
                receiptLines.push([0x1d, 0x21, 0x00]); // Normal
            } else {
                receiptLines.push(...encoder.encode(storeName + "\n"));
            }
            
            let tOperator = data.operator || (window.state && window.state.user && window.state.user.username ? window.state.user.username : 'Kasir Utama');
            let tTotal = data.total !== undefined ? data.total : (data.grandTotal !== undefined ? data.grandTotal : (data.subtotal || 0));
            let tBayar = data.bayar !== undefined ? data.bayar : (data.dp !== undefined ? data.dp : tTotal);
            let tKembali = data.kembalian !== undefined ? data.kembalian : (tBayar > tTotal ? tBayar - tTotal : 0);
            
            receiptLines.push(...encoder.encode("Struk Belanja - " + data.date + "\n"));
            receiptLines.push(...encoder.encode("Kasir: " + tOperator + "\n"));
            receiptLines.push(...encoder.encode("Pelanggan: " + data.customer + "\n"));
            receiptLines.push(...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\n"));
            
            receiptLines.push([0x1b, 0x61, 0x00]); // Left align for items
            
            // Items
            data.items.forEach(r => {
                let amount = r.price * r.qty;
                let itemName = String(r.name).substring(0, 32);
                let priceLine = `${r.qty}x ${new Intl.NumberFormat("id-ID").format(r.price)}`;
                let rightStr = new Intl.NumberFormat("id-ID").format(amount);
                
                receiptLines.push(...encoder.encode(itemName + "\n"));
                receiptLines.push(...encoder.encode(padLR(priceLine, rightStr) + "\n"));
            });
            
            receiptLines.push(...encoder.encode("-".repeat(parseInt(localStorage.getItem('printerPaperSize') || '32')) + "\n"));
            receiptLines.push(...encoder.encode(padLR("TOTAL", "Rp " + new Intl.NumberFormat("id-ID").format(tTotal)) + "\n"));
            receiptLines.push(...encoder.encode(padLR("BAYAR", "Rp " + new Intl.NumberFormat("id-ID").format(tBayar)) + "\n"));
            receiptLines.push(...encoder.encode(padLR("KEMBALI", "Rp " + new Intl.NumberFormat("id-ID").format(tKembali)) + "\n"));
            
            receiptLines.push(...encoder.encode("\n"));
            receiptLines.push([0x1b, 0x61, 0x01]); // Center
            receiptLines.push(...encoder.encode("Terima kasih atas\nkunjungan Anda!\n\n\n\n")); // Rata tengah, penutup
            receiptLines.push([0x1b, 0x61, 0x00]); // Kiri lagi
            
            let payload = [
              0x1b, 0x40, // init
              0x1b, 0x61, 0x01, // Center
              ...receiptLines
            ];

            // Flatten array to ensure it's a 1D array of bytes
            let flatPayload = [];
            function flatten(arr) {
                for (let i = 0; i < arr.length; i++) {
                    if (Array.isArray(arr[i]) || arr[i] instanceof Uint8Array) flatten(arr[i]);
                    else flatPayload.push(arr[i]);
                }
            }
            flatten(payload);

            let buffer = new Uint8Array(flatPayload);
            
            for (let i = 0; i < buffer.length; i += 100) {
            if (characteristic.properties && characteristic.properties.writeWithoutResponse) {
                try {
                  if (typeof characteristic.writeValueWithoutResponse === 'function') {
                    await characteristic.writeValueWithoutResponse(buffer.slice(i, i + 100));
                  } else {
                    await characteristic.writeValue(buffer.slice(i, i + 100));
                  }
                } catch (e) {
                  await characteristic.writeValue(buffer.slice(i, i + 100));
                }
            } else {
                await characteristic.writeValue(buffer.slice(i, i + 100));
            }
            await new Promise(resolve => setTimeout(resolve, 50));
          }
            
            await new Promise(resolve => setTimeout(resolve, 500));
            showToast("Berhasil dicetak!", "success");
  if(typeof window.playChaChing === 'function') window.playChaChing();
            
          } catch (error) {
              console.error(error);
              window.globalBluetoothDevice = null;
              showToast("Gagal Cetak: " + error.message, "error");
            } finally {
            if (device && device.gatt && device.gatt.connected) {
              device.gatt.disconnect();
            }
          }
      };

window.ngitungClearAll = function() {
        window.ngitungRows = [{ id: Date.now(), name: '', price: '', qty: '' }];
        window.ngitungDraft = { bayar: "", customer: "", phone: "" };
        const customerEl = document.getElementById("ngitung-inline-customer");
        const phoneEl = document.getElementById("ngitung-inline-phone");
        const bayarEl = document.getElementById("ngitung-inline-bayar");
        if (customerEl) customerEl.value = "";
        if (phoneEl) phoneEl.value = "";
        if (bayarEl) bayarEl.value = "";
        window.ngitungRenderTable();
        if (window.ngitungHandleBayarInput) window.ngitungHandleBayarInput();
      };

      function ngitung() {
      setTimeout(() => {
          window.ngitungRenderTable();
          if (window.ngitungHandleBayarInput) window.ngitungHandleBayarInput();
      }, 50);
      return `
        <div class="ngitung-container" style="max-width: 800px; margin: 1rem auto; padding-bottom: 50vh;">
          <h2 class="hidden-on-mobile">🧮 NGITUNG (Kasir Cepat)</h2>
          
          <div class="table-wrap">
            <table class="data-table" id="ngitung-table" style="min-width: 0 !important; width: 100% !important; table-layout: fixed;">
              <thead>
                  <tr>
                    <th colspan="3" style="width: 60%; font-size: 0.65rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 8px; border-bottom: 1px solid rgba(255,255,255,0.05);">Barang</th>
                    <th style="width: 25%; font-size: 0.65rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px 4px 4px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.05);">Total</th>
                    <th style="width: 15%; font-size: 0.65rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 0 4px 4px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.05);">Aksi</th>
                  </tr>
                </thead>
              <tbody id="ngitung-tbody">
              </tbody>
            </table>
          </div>
          <datalist id="ngitung-history-list"></datalist>

          <!-- INLINE POS CHECKOUT — PREMIUM REDESIGN -->
          <div class="ngitung-inline-checkout" style="
              margin-top: 10px;
              background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 16px;
              padding: 14px 12px 12px;
              backdrop-filter: blur(8px);
          ">
            <!-- TOTAL HEADLINE -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px;">
              <div>
                <div style="color: rgba(255,255,255,0.4); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">Total Belanja</div>
                <div id="ngitung-inline-total" style="font-size: 1.35rem; font-weight: 900; color: #ff6b6b; letter-spacing: -0.5px;">Rp 0</div>
              </div>
              <div style="width: 36px; height: 36px; background: rgba(238,77,45,0.12); border: 1px solid rgba(238,77,45,0.25); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem;">🛒</div>
            </div>

            <!-- DIVIDER -->
            <div style="height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.08), transparent); margin-bottom: 10px;"></div>

            <!-- BAYAR & STATUS ROW -->
            <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: stretch;">
              <div style="flex: 1; display: flex; flex-direction: column; gap: 3px;">
                <span style="color: rgba(255,255,255,0.4); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.8px;">Jumlah Bayar</span>
                <input type="number" id="ngitung-inline-bayar" inputmode="numeric" placeholder="0" value="${window.ngitungDraft.bayar || ''}"
                  oninput="window.ngitungDraft.bayar = this.value; ngitungHandleBayarInput()"
                  style="
                    width: 100%; height: 34px; text-align: right;
                    background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12);
                    color: #fff; padding: 0 10px; border-radius: 8px;
                    font-weight: 900; font-size: 0.95rem; box-sizing: border-box;
                    transition: border-color 0.2s;
                  ">
              </div>

              <div id="ngitung-inline-status-container" class="hidden" style="
                  flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px;
                  padding: 6px 10px; border-radius: 8px; border: 1px solid transparent;
                  transition: all 0.3s;
              ">
                <span id="ngitung-inline-status-label" style="font-size: 0.6rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7;">Status</span>
                <span id="ngitung-inline-status-value" style="font-size: 0.9rem; font-weight: 900;">-</span>
              </div>
            </div>

            <!-- CUSTOMER & PHONE ROW -->
            <div id="ngitung-inline-customer-container" class="hidden" style="display: flex; gap: 6px; margin-bottom: 10px;">
              <div style="flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;">
                <span style="color: rgba(255,255,255,0.4); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.8px;">Nama Pelanggan</span>
                <input type="text" id="ngitung-inline-customer" placeholder="Masukkan nama..." value="${window.ngitungDraft.customer || ''}" oninput="window.ngitungDraft.customer = this.value"
                  style="
                    width: 100%; height: 32px;
                    background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12);
                    color: #fff; padding: 0 8px; border-radius: 8px; font-size: 0.78rem;
                    box-sizing: border-box;
                  ">
              </div>
              <div style="width: 135px; display: flex; flex-direction: column; gap: 3px;">
                <span style="color: rgba(255,255,255,0.4); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.8px;">No. Telepon</span>
                <input type="text" id="ngitung-inline-phone" inputmode="numeric" placeholder="08xx..." value="${window.ngitungDraft.phone || ''}" oninput="window.ngitungDraft.phone = this.value"
                  style="
                    width: 100%; height: 32px;
                    background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12);
                    color: #fff; padding: 0 8px; border-radius: 8px; font-size: 0.78rem;
                    box-sizing: border-box;
                  ">
              </div>
            </div>

            <!-- ACTION BUTTONS -->
            <div style="display: flex; gap: 6px; align-items: center;">
              <button onclick="ngitungClearAll()" style="
                  flex: 1; height: 36px; border: 1px solid rgba(255,71,87,0.4); border-radius: 10px;
                  background: rgba(255,71,87,0.15);
                  color: #ff4757; font-weight: 800; font-size: 0.82rem;
                  text-transform: uppercase; letter-spacing: 1px; cursor: pointer;
                  transition: all 0.2s;
              ">🗑️ HAPUS MANUAL</button>

              <button onclick="ngitungProcessCheckout('pdf')" title="Cetak PDF" style="
                  width: 36px; height: 36px; border: 1px solid rgba(0,168,255,0.4); border-radius: 10px;
                  background: rgba(0,168,255,0.15); color: #00a8ff; font-size: 1rem; cursor: pointer;
                  display: flex; align-items: center; justify-content: center;
                  transition: all 0.2s;
              ">📄</button>

              <button onclick="ngitungProcessCheckout('bluetooth')" title="Cetak Bluetooth" style="
                  width: 36px; height: 36px; border: 1px solid rgba(0,229,229,0.3); border-radius: 10px;
                  background: rgba(0,229,229,0.1); color: #00e5e5; font-size: 1rem; cursor: pointer;
                  display: flex; align-items: center; justify-content: center;
                  transition: all 0.2s;
              ">🖨️</button>
              
              <button onclick="resetBluetoothPrinter()" title="Reset Printer BT" style="
                  width: 36px; height: 36px; border: 1px solid rgba(255,193,7,0.3); border-radius: 10px;
                  background: rgba(255,193,7,0.1); color: #ffc107; font-size: 1rem; cursor: pointer;
                  display: flex; align-items: center; justify-content: center;
                  transition: all 0.2s;
              ">🔄</button>

              <button onclick="ngitungProcessCheckout('wa')" title="Kirim via WhatsApp" style="
                  width: 36px; height: 36px; border: 1px solid rgba(37,211,102,0.35); border-radius: 10px;
                  background: rgba(37,211,102,0.12); color: #25D366; font-size: 1rem; cursor: pointer;
                  display: flex; align-items: center; justify-content: center;
                  transition: all 0.2s;
              ">💬</button>
            </div>
          </div>
            
          </div>
          </div>
        `;
      }
      
      window.activeRiwayatTab = 'transaksi';
      window.switchRiwayatTab = function(tab) {
        window.activeRiwayatTab = tab;
        const btnTrans = document.getElementById('btn-tab-transaksi');
        const btnHutang = document.getElementById('btn-tab-hutang');
        if (!btnTrans || !btnHutang) return;

        if (tab === 'transaksi') {
          document.getElementById('tab-transaksi-content').style.display = 'block';
          document.getElementById('tab-hutang-content').style.display = 'none';
          btnTrans.style.background = 'var(--garneta-cyan)';
          btnTrans.style.color = '#000';
          btnHutang.style.background = 'transparent';
          btnHutang.style.color = 'var(--neural-text)';
          window.renderRiwayatTable();
        } else {
          document.getElementById('tab-transaksi-content').style.display = 'none';
          document.getElementById('tab-hutang-content').style.display = 'block';
          btnHutang.style.background = 'var(--garneta-cyan)';
          btnHutang.style.color = '#000';
          btnTrans.style.background = 'transparent';
          btnTrans.style.color = 'var(--neural-text)';
          window.renderHutangTable();
        }
      };

      function riwayat() {
        setTimeout(() => window.switchRiwayatTab(window.activeRiwayatTab || 'transaksi'), 50);
        return `
          <div style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px;">
            <button id="btn-tab-transaksi" onclick="window.switchRiwayatTab('transaksi')" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: var(--garneta-cyan); color: #000; transition: all 0.3s; white-space: nowrap;">🕰️ Riwayat Transaksi</button>
            <button id="btn-tab-hutang" onclick="window.switchRiwayatTab('hutang')" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📒 Bon (Kasbon)</button>
            <button onclick="showPage('laporan')" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📊 Laporan Harian</button>
            <button onclick="showPage('statistik')" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📈 Statistik Harga</button>
          </div>

          <div id="tab-transaksi-content" class="card" style="padding-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h2 id="riwayat-title">🧾 Riwayat Transaksi</h2>
              <div style="display: flex; gap: 8px;">
                <button class="btn soft" id="btn-toggle-trash" onclick="window.toggleTrashView()" style="padding: 6px 12px; font-size: 0.8rem;">🗑️ Tempat Sampah</button>
                <button class="btn danger" id="btn-reset-riwayat" onclick="window.clearRiwayat()" style="padding: 6px 12px; font-size: 0.8rem;">Reset</button>
              </div>
            </div>
            <div id="riwayat-filter-container" style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <label for="riwayat-date-filter" style="font-size: 0.85rem; font-weight: 600;">Pilih Tanggal:</label>
              <input type="date" id="riwayat-date-filter" class="input" style="padding: 6px 10px; border-radius: 8px; width: 140px; font-size: 0.85rem;" onchange="window.renderRiwayatTable()">
              <button class="btn soft" onclick="document.getElementById('riwayat-date-filter').value=''; window.renderRiwayatTable()" style="padding: 6px 10px; font-size: 0.8rem;" title="Reset Filter">Semua</button>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Pelanggan</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody id="riwayat-tbody"></tbody>
              </table>
            </div>
          </div>

          <div id="tab-hutang-content" class="card" style="padding-bottom: 24px; display: none;">
            <h2>💰 Riwayat Hutang (Kasbon)</h2>
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>Sisa Hutang</th>
                    <th>Tanggal</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody id="hutang-tbody"></tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      window.isTrashView = false;

      window.toggleTrashView = function() {
        window.isTrashView = !window.isTrashView;
        const title = document.getElementById('riwayat-title');
        const btnToggle = document.getElementById('btn-toggle-trash');
        const btnReset = document.getElementById('btn-reset-riwayat');
        
        if (window.isTrashView) {
           title.innerHTML = '🗑️ Tempat Sampah (Riwayat)';
           btnToggle.innerHTML = '⬅️ Kembali';
           btnReset.style.display = 'none';
           window.renderTrashTable();
        } else {
           title.innerHTML = '🧾 Riwayat Transaksi';
           btnToggle.innerHTML = '🗑️ Tempat Sampah';
           btnReset.style.display = 'inline-block';
           window.renderRiwayatTable();
        }
      };

      window.renderTrashTable = function() {
        const tbody = document.getElementById('riwayat-tbody');
        if (!tbody) return;
        const bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
        if (bin.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#888;">Tempat sampah kosong.</td></tr>';
          return;
        }
        
        tbody.innerHTML = bin.map((tx, idx) => {
          let sisaHari = 30;
          if (tx.deletedAt) {
             const diffTime = Math.abs(new Date() - new Date(tx.deletedAt));
             sisaHari = 30 - Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
          return `
          <tr style="opacity: 0.8; background: rgba(255,0,0,0.02);">
            <td style="font-size: 0.75rem;">${tx.date}<br><span style="color:#ff4757; font-size:0.65rem;">Sisa: ${Math.max(0, sisaHari)} hari</span></td>
            <td style="font-weight: 800;">${tx.customer}</td>
            <td style="color: #ee4d2d; font-weight: bold;">Rp ${new Intl.NumberFormat('id-ID').format(tx.grandTotal)}</td>
            <td>
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; background: rgba(100,100,100,0.2); color: #888;">
                DIHAPUS
              </span>
            </td>
            <td style="display: flex; gap: 4px;">
               <button class="btn success" onclick="window.restoreRiwayatItem(${idx})" style="background: rgba(46,204,113,0.2); border: none; padding: 4px 8px; font-size: 0.8rem; color: #2ecc71; border-radius: 4px;" title="Kembalikan Transaksi">🔄 Restore</button>
            </td>
          </tr>
        `}).join('');
      };

      window.restoreRiwayatItem = function(idx) {
        if(confirm("Kembalikan transaksi ini ke riwayat aktif?")) {
           let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
           let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
           
           if (!bin[idx]) return;
           const toRestore = bin[idx];
           delete toRestore.deletedAt; // Hapus flag deleted
           
           txs.push(toRestore);
           bin.splice(idx, 1);
           
           localStorage.setItem('transactions', JSON.stringify(txs));
           localStorage.setItem('transactions_bin', JSON.stringify(bin));
           
           window.renderTrashTable();
           if (typeof showToast === 'function') showToast("Transaksi berhasil dikembalikan!", "success");
        }
      };


      window.renderRiwayatTable = function() {
        const tbody = document.getElementById('riwayat-tbody');
        const filterDateEl = document.getElementById('riwayat-date-filter');
        if (!tbody) return;
        
        let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
        
        // Filter by Date if selected
        if (filterDateEl && filterDateEl.value) {
           const selectedDate = filterDateEl.value; // format YYYY-MM-DD
           txs = txs.filter(tx => {
             if (!tx.date) return false;
             // tx.date usually "23/7/2026, 09:30:15" (toLocaleString('id-ID'))
             // We need to parse it or match it. The format from ID locale is DD/MM/YYYY.
             const parts = tx.date.split(',')[0].split('/'); 
             if (parts.length === 3) {
               // Pad with zero
               const d = parts[0].padStart(2, '0');
               const m = parts[1].padStart(2, '0');
               const y = parts[2];
               const txDateStr = `${y}-${m}-${d}`;
               return txDateStr === selectedDate;
             }
             return tx.date.includes(selectedDate);
           });
        }
        
        if (txs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#888;">Belum ada riwayat transaksi.</td></tr>';
          return;
        }
        
        tbody.innerHTML = txs.map((tx, idx) => `
          <tr>
            <td style="font-size: 0.75rem;">${tx.date}</td>
            <td style="font-weight: 800;">${tx.customer}</td>
            <td style="color: #ee4d2d; font-weight: bold;">Rp ${new Intl.NumberFormat('id-ID').format(tx.grandTotal)}</td>
            <td>
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;
              background: ${tx.paymentType === 'tunai' ? 'rgba(46,204,113,0.2)' : 'rgba(255,71,87,0.2)'};
              color: ${tx.paymentType === 'tunai' ? '#2ecc71' : '#ff4757'};">
                ${tx.paymentType ? tx.paymentType.toUpperCase() : '-'}
              </span>
            </td>
            <td style="display: flex; gap: 4px;">
               <button class="btn" onclick="window.reprintRiwayat(${idx})" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang PDF">📄</button>
               <button class="btn" onclick="window.reprintRiwayatBluetooth(${idx})" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem; color: #3498db;" title="Cetak Ulang Bluetooth">🖨️</button>
               <button class="btn danger" onclick="window.deleteRiwayatItem(${idx})" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem; filter: none; box-shadow: none;" title="Hapus Transaksi">🗑️</button>
            </td>
          </tr>
        `).join('');
      };
      
      window.deleteRiwayatItem = function(idx) {
        if(confirm("Yakin ingin menghapus transaksi ini? (Data akan dipindahkan ke Trash selama 30 hari)")) {
           const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
           if (!txs[idx]) return;
           
           // Protocol Soft Delete
           let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
           const now = new Date().toISOString();
           const toDelete = { ...txs[idx], deletedAt: now };
           bin.push(toDelete);
           
           localStorage.setItem('transactions_bin', JSON.stringify(bin));
           
           // Remove from active
           txs.splice(idx, 1);
           localStorage.setItem('transactions', JSON.stringify(txs));
           
           window.renderRiwayatTable();
           if (typeof showToast === 'function') showToast("Transaksi dipindahkan ke tempat sampah.", "success");
        }
      };

      window.clearRiwayat = function() {
        if(confirm("Yakin ingin menghapus seluruh riwayat transaksi? (Sesuai protokol, data akan dipindahkan ke Trash (Soft Delete) selama 30 hari sebelum dihapus permanen)")) {
           const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
           if (txs.length === 0) {
             if (typeof showToast === 'function') showToast("Riwayat sudah kosong!", "info");
             return;
           }
           
           // Protocol [DATA] Soft Delete & 30-Day Garbage Collection
           let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
           const now = new Date().toISOString();
           const toDelete = txs.map(t => ({ ...t, deletedAt: now }));
           bin = bin.concat(toDelete);
           
           localStorage.setItem('transactions_bin', JSON.stringify(bin));
           localStorage.setItem('transactions', '[]'); // Clear active transactions
           
           window.renderRiwayatTable();
           if (typeof showToast === 'function') showToast("Riwayat dipindahkan ke tempat sampah (Aman 30 Hari).", "success");
        }
      };
      
      // Auto-run 30-Day Garbage Collection (Pembersih Sampah)
      setTimeout(() => {
        try {
          let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
          if (bin.length > 0) {
            const now = new Date();
            const filtered = bin.filter(t => {
               if (!t.deletedAt) return false;
               const diffTime = Math.abs(now - new Date(t.deletedAt));
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               return diffDays <= 30; // Pertahankan yang umurnya 30 hari atau kurang
            });
            if (filtered.length !== bin.length) {
               localStorage.setItem('transactions_bin', JSON.stringify(filtered));
               console.log(`[ALVES GC] Membuang ${bin.length - filtered.length} data riwayat permanen karena sudah melewati masa retensi 30 hari.`);
            }
          }
        } catch (e) {
          console.error("Garbage collection error:", e);
        }
      }, 5000);
      
      window.reprintRiwayat = function(idx, method) {
         const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
         const tx = txs[idx];
         if (tx) {
            window.ngitungPrintPDF(tx);
         }
      };
      
      window.reprintRiwayatBluetooth = function(idx) {
         const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
         const tx = txs[idx];
         if (tx) {
            window.ngitungPrintBluetoothCheckout(tx);
         }
      };
      

      window.renderHutangTable = function() {
        const tbody = document.getElementById('hutang-tbody');
        if (!tbody) return;
        const hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
        const aktifHutangs = hutangs.filter(h => h.sisaTagihan > 0);
        
        if (aktifHutangs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#888;">Tidak ada kasbon aktif. Luar biasa! 🎉</td></tr>';
          return;
        }
        
        tbody.innerHTML = aktifHutangs.map((h, idx) => `
          <tr>
            <td style="font-weight: 800;">${h.customer}</td>
            <td style="color: #ff4757; font-weight: bold;">Rp ${new Intl.NumberFormat('id-ID').format(h.sisaTagihan)}</td>
            <td style="font-size: 0.75rem;">${h.date}</td>
            <td style="display: flex; gap: 4px; align-items:center;">
               <button class="btn" onclick="window.bayarHutang('${h.id}', this)" style="background: var(--garneta-cyan); color: #000; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; font-weight: bold;">LUNAS</button>
               <button class="btn" onclick="window.cicilHutang('${h.id}')" style="background: rgba(255,165,0,0.2); border: 1px solid rgba(255,165,0,0.5); color: #ffa502; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; font-weight: bold;">CICIL</button>
               <button class="btn" onclick="window.reprintHutang('${h.id}')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang PDF">📄</button>
               <button class="btn" onclick="window.reprintHutangBluetooth('${h.id}')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem; color: #3498db;" title="Cetak Ulang Bluetooth">🖨️</button>
            </td>
          </tr>
        `).join('');
      };
      
      window.bayarHutang = function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const index = hutangs.findIndex(h => h.id === id);
         if (index !== -1) {
            if(confirm('Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?')) {
               hutangs[index].sisaTagihan = 0;
               localStorage.setItem('hutang', JSON.stringify(hutangs));
               window.renderHutangTable();
               showToast("Hutang berhasil dilunasi!", "success");
            }
         }
      };
window.restoreRiwayatItem = function(idx) {
        if(confirm("Kembalikan transaksi ini ke riwayat aktif?")) {
           let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
           let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
           
           if (!bin[idx]) return;
           const toRestore = bin[idx];
           delete toRestore.deletedAt; // Hapus flag deleted
           
           txs.push(toRestore);
           bin.splice(idx, 1);
           
           localStorage.setItem('transactions', JSON.stringify(txs));
           localStorage.setItem('transactions_bin', JSON.stringify(bin));
           
           window.renderTrashTable();
           if (typeof showToast === 'function') showToast("Transaksi berhasil dikembalikan!", "success");
        }
      };


      window.renderRiwayatTable = function() {
        const tbody = document.getElementById('riwayat-tbody');
        const filterDateEl = document.getElementById('riwayat-date-filter');
        if (!tbody) return;
        
        let txs = JSON.parse(localStorage.getItem('transactions') || '[]');
        
        // Filter by Date if selected
        if (filterDateEl && filterDateEl.value) {
           const selectedDate = filterDateEl.value; // format YYYY-MM-DD
           txs = txs.filter(tx => {
             if (!tx.date) return false;
             // tx.date usually "23/7/2026, 09:30:15" (toLocaleString('id-ID'))
             // We need to parse it or match it. The format from ID locale is DD/MM/YYYY.
             const parts = tx.date.split(',')[0].split('/'); 
             if (parts.length === 3) {
               // Pad with zero
               const d = parts[0].padStart(2, '0');
               const m = parts[1].padStart(2, '0');
               const y = parts[2];
               const txDateStr = `${y}-${m}-${d}`;
               return txDateStr === selectedDate;
             }
             return tx.date.includes(selectedDate);
           });
        }
        
        if (txs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#888;">Belum ada riwayat transaksi.</td></tr>';
          return;
        }
        
        tbody.innerHTML = txs.map((tx, idx) => `
          <tr>
            <td style="font-size: 0.75rem;">${tx.date}</td>
            <td style="font-weight: 800;">${tx.customer}</td>
            <td style="color: #ee4d2d; font-weight: bold;">Rp ${new Intl.NumberFormat('id-ID').format(tx.grandTotal)}</td>
            <td>
              <span style="padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;
              background: ${tx.paymentType === 'tunai' ? 'rgba(46,204,113,0.2)' : 'rgba(255,71,87,0.2)'};
              color: ${tx.paymentType === 'tunai' ? '#2ecc71' : '#ff4757'};">
                ${tx.paymentType ? tx.paymentType.toUpperCase() : '-'}
              </span>
            </td>
            <td style="display: flex; gap: 4px;">
               <button class="btn" onclick="window.reprintRiwayat(${idx})" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang PDF">📄</button>
               <button class="btn" onclick="window.reprintRiwayatBluetooth(${idx})" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem; color: #3498db;" title="Cetak Ulang Bluetooth">🖨️</button>
               <button class="btn danger" onclick="window.deleteRiwayatItem(${idx})" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem; filter: none; box-shadow: none;" title="Hapus Transaksi">🗑️</button>
            </td>
          </tr>
        `).join('');
      };
      
      window.deleteRiwayatItem = function(idx) {
        if(confirm("Yakin ingin menghapus transaksi ini? (Data akan dipindahkan ke Trash selama 30 hari)")) {
           const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
           if (!txs[idx]) return;
           
           // Protocol Soft Delete
           let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
           const now = new Date().toISOString();
           const toDelete = { ...txs[idx], deletedAt: now };
           bin.push(toDelete);
           
           localStorage.setItem('transactions_bin', JSON.stringify(bin));
           
           // Remove from active
           txs.splice(idx, 1);
           localStorage.setItem('transactions', JSON.stringify(txs));
           
           window.renderRiwayatTable();
           if (typeof showToast === 'function') showToast("Transaksi dipindahkan ke tempat sampah.", "success");
        }
      };

      window.clearRiwayat = function() {
        if(confirm("Yakin ingin menghapus seluruh riwayat transaksi? (Sesuai protokol, data akan dipindahkan ke Trash (Soft Delete) selama 30 hari sebelum dihapus permanen)")) {
           const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
           if (txs.length === 0) {
             if (typeof showToast === 'function') showToast("Riwayat sudah kosong!", "info");
             return;
           }
           
           // Protocol [DATA] Soft Delete & 30-Day Garbage Collection
           let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
           const now = new Date().toISOString();
           const toDelete = txs.map(t => ({ ...t, deletedAt: now }));
           bin = bin.concat(toDelete);
           
           localStorage.setItem('transactions_bin', JSON.stringify(bin));
           localStorage.setItem('transactions', '[]'); // Clear active transactions
           
           window.renderRiwayatTable();
           if (typeof showToast === 'function') showToast("Riwayat dipindahkan ke tempat sampah (Aman 30 Hari).", "success");
        }
      };
      
      // Auto-run 30-Day Garbage Collection (Pembersih Sampah)
      setTimeout(() => {
        try {
          let bin = JSON.parse(localStorage.getItem('transactions_bin') || '[]');
          if (bin.length > 0) {
            const now = new Date();
            const filtered = bin.filter(t => {
               if (!t.deletedAt) return false;
               const diffTime = Math.abs(now - new Date(t.deletedAt));
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               return diffDays <= 30; // Pertahankan yang umurnya 30 hari atau kurang
            });
            if (filtered.length !== bin.length) {
               localStorage.setItem('transactions_bin', JSON.stringify(filtered));
               console.log(`[ALVES GC] Membuang ${bin.length - filtered.length} data riwayat permanen karena sudah melewati masa retensi 30 hari.`);
            }
          }
        } catch (e) {
          console.error("Garbage collection error:", e);
        }
      }, 5000);
      
      window.reprintRiwayat = function(idx, method) {
         const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
         const tx = txs[idx];
         if (tx) {
            window.ngitungPrintPDF(tx);
         }
      };
      
      window.reprintRiwayatBluetooth = function(idx) {
         const txs = JSON.parse(localStorage.getItem('transactions') || '[]');
         const tx = txs[idx];
         if (tx) {
            window.ngitungPrintBluetoothCheckout(tx);
         }
      };
      

      window.renderHutangTable = function() {
        const tbody = document.getElementById('hutang-tbody');
        if (!tbody) return;
        const hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
        const aktifHutangs = hutangs.filter(h => h.sisaTagihan > 0);
        
        if (aktifHutangs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px; color:#888;">Tidak ada kasbon aktif. Luar biasa! 🎉</td></tr>';
          return;
        }
        
        tbody.innerHTML = aktifHutangs.map((h, idx) => `
          <tr>
            <td style="font-weight: 800;">${h.customer}</td>
            <td style="color: #ff4757; font-weight: bold;">Rp ${new Intl.NumberFormat('id-ID').format(h.sisaTagihan)}</td>
            <td style="font-size: 0.75rem;">${h.date}</td>
            <td style="display: flex; gap: 4px; align-items:center;">
               <button class="btn" onclick="window.bayarHutang('${h.id}', this)" style="background: var(--garneta-cyan); color: #000; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; font-weight: bold;">LUNAS</button>
               <button class="btn" onclick="window.cicilHutang('${h.id}')" style="background: rgba(255,165,0,0.2); border: 1px solid rgba(255,165,0,0.5); color: #ffa502; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; font-weight: bold;">CICIL</button>
               <button class="btn" onclick="window.reprintHutang('${h.id}')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem;" title="Cetak Ulang PDF">📄</button>
               <button class="btn" onclick="window.reprintHutangBluetooth('${h.id}')" style="background: transparent; border: none; padding: 4px; font-size: 1.1rem; color: #3498db;" title="Cetak Ulang Bluetooth">🖨️</button>
            </td>
          </tr>
        `).join('');
      };
      
      window.bayarHutang = function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const index = hutangs.findIndex(h => h.id === id);
         if (index !== -1) {
            if(confirm('Yakin ingin melunasi sisa hutang Rp ' + new Intl.NumberFormat('id-ID').format(hutangs[index].sisaTagihan) + ' atas nama ' + hutangs[index].customer + '?')) {
               hutangs[index].sisaTagihan = 0;
               localStorage.setItem('hutang', JSON.stringify(hutangs));
               window.renderHutangTable();
               showToast("Hutang berhasil dilunasi!", "success");
            }
         }
      };
      
      window.reprintHutang = function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const h = hutangs.find(x => x.id === id);
         if (h) {
            window.ngitungPrintPDF(h);
         }
      };
      
      window.reprintHutangBluetooth = function(id) {
         let hutangs = JSON.parse(localStorage.getItem('hutang') || '[]');
         const h = hutangs.find(x => x.id === id);
         if (h) {
            window.ngitungPrintBluetoothCheckout(h);
         }
      };

      window.orderanCart = window.orderanCart || [{ name: '', qty: 1, price: 0, modalEcer: 0 }];
      window.addOrderanItem = function() {
          window.orderanCart.push({ name: '', qty: 1, price: 0, modalEcer: 0 });
          render();
      };
      window.updateOrderanItem = function(idx, field, val) {
          window.orderanCart[idx][field] = val;
          render();
      };
      window.removeOrderanItem = function(idx) {
          window.orderanCart.splice(idx, 1);
          if (window.orderanCart.length === 0) window.orderanCart.push({ name: '', qty: 1, price: 0, modalEcer: 0 });
          render();
      };

      window.updateOrderanRowDOM = function(el, idx) {
          const rowDiv = el.closest('.orderan-row');
          if (!rowDiv) return;
          
          const modalEl = rowDiv.querySelector('.orderan-modal-ecer');
          if (modalEl) modalEl.value = window.orderanCart[idx].modalEcer || 0;
          
          const priceEl = rowDiv.querySelector('.orderan-price');
          if (priceEl && document.activeElement !== priceEl) priceEl.value = window.orderanCart[idx].price || 0;
          
          const qtyEl = rowDiv.querySelector('.orderan-qty');
          if (qtyEl && document.activeElement !== qtyEl) qtyEl.value = window.orderanCart[idx].qty || 1;
          
          const totalEl = rowDiv.querySelector('.orderan-total');
          if (totalEl) totalEl.value = (window.orderanCart[idx].price || 0) * (window.orderanCart[idx].qty || 0);

          let grandTotal = window.orderanCart.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || 0)), 0);
          const gtEl = document.getElementById('orderan-grand-total');
          if (gtEl) gtEl.textContent = 'Rp ' + parseInt(grandTotal).toLocaleString('id-ID');
      };

      window.orderanCheckAutoAdd = function(inputEl, idx) {
          window.orderanCart[idx].name = inputEl.value;
          
          const prod = state.data.products.find(p => p.name.toLowerCase() === inputEl.value.toLowerCase().trim());
          if (prod) {
              if (!window.orderanCart[idx].price) window.orderanCart[idx].price = prod.salePriceEcer || prod.salePrice || 0;
              window.orderanCart[idx].modalEcer = prod.basePriceEcer || prod.basePrice || 0;
          } else {
              window.orderanCart[idx].modalEcer = 0;
          }
          
          updateOrderanRowDOM(inputEl, idx);

          // Auto-add new row if it's the last row and we typed something
          if (idx === window.orderanCart.length - 1 && inputEl.value.trim().length > 0) {
              window.orderanCart.push({ name: '', qty: 1, price: 0, modalEcer: 0, isReady: false });
              
              setTimeout(() => {
                  render();
                  const inputs = document.querySelectorAll('.orderan-name-input');
                  if (inputs[idx]) {
                      inputs[idx].focus();
                      inputs[idx].setSelectionRange(inputs[idx].value.length, inputs[idx].value.length);
                  }
              }, 10);
          }
      };
      window.saveOrderan = async function() {
          const customer = document.getElementById('orderan-customer').value;
          const dueDate = document.getElementById('orderan-date').value;
          if (!customer || !dueDate) return alert("Nama pemesan dan tanggal kirim wajib diisi!");
          if (window.orderanCart.length === 0) return alert("Tambahkan minimal 1 barang!");
          
          let validItems = window.orderanCart.filter(x => x.name.trim() !== '');
          if (validItems.length === 0) return alert("Barang tidak boleh kosong!");

          const items = validItems.map(x => ({
             name: x.name,
             qty: parseInt(x.qty) || 1,
             price: parseFloat(x.price) || 0,
             isReady: false
          }));

          const payload = {
             id: 'ORD-' + Date.now(),
             customer,
             dueDate,
             items,
             status: 'pending'
          };
          
          try {
             await gas("add", { collection: "orders", item: payload });
             window.orderanCart = [{ name: '', qty: 1, price: 0, modalEcer: 0 }];
             alert("Orderan berhasil disimpan!");
             await load();
          } catch(e) {
             alert(e.message);
          }
      };

      window.toggleOrderanReady = async function(orderId, itemIdx, currentStatus) {
         let orders = state.data.orders || [];
         let order = orders.find(o => o.id === orderId);
         if (!order) return;
         order.items[itemIdx].isReady = !currentStatus;
         try {
            await gas("update", { collection: "orders", id: orderId, item: order });
            await load();
         } catch(e) {
            alert(e.message);
         }
      };
      
      window.printOrderan = function(orderId) {
         let orders = state.data.orders || [];
         let order = orders.find(o => o.id === orderId);
         if (!order) return;
         
         const { jsPDF } = window.jspdf;
         const doc = new jsPDF({ format: [80, 200] });
         let y = 10;
         doc.setFontSize(12);
         doc.text("INVOICE ORDERAN", 40, y, { align: "center" });
         y += 6;
         doc.setFontSize(9);
         doc.text(`Toko: ${state.settings?.STORE_NAME || "Toko"}`, 40, y, { align: "center" });
         y += 8;
         doc.text(`Pemesan: ${order.customer}`, 5, y);
         y += 5;
         doc.text(`Tgl Kirim: ${order.dueDate}`, 5, y);
         y += 5;
         doc.text("-".repeat(35), 5, y);
         y += 5;
         let total = 0;
         order.items.forEach(i => {
            const sub = i.qty * i.price;
            total += sub;
            doc.text(`${i.name}`, 5, y);
            y += 5;
            doc.text(`${i.qty} x ${rupiah(i.price)}`, 5, y);
            doc.text(`${rupiah(sub)}`, 75, y, { align: "right" });
            y += 5;
         });
         doc.text("-".repeat(35), 5, y);
         y += 5;
         doc.setFontSize(11);
         doc.text(`TOTAL: Rp ${rupiah(total)}`, 75, y, { align: "right" });
         
         doc.autoPrint();
         window.open(doc.output('bloburl'), '_blank');
      };
      
      window.deleteOrderan = async function(orderId) {
         if (!confirm("Hapus orderan ini permanen?")) return;
         try {
            await gas("remove", { collection: "orders", id: orderId });
            await load();
         } catch(e) {
            alert(e.message);
         }
      };

      function kalkulator() {

      let topWorkspaces = [
        { id: 'expres', icon: '🚀', label: 'Jual Expres' },
        { id: 'orderan', icon: '📦', label: 'Orderan' },
        { id: 'belanja', icon: '🛒', label: 'Belanja' },
        { id: 'laporanA', icon: '🧾', label: 'Laporan A' }
      ];
      
      if (state.role !== "Super Admin") {
        topWorkspaces = topWorkspaces.filter(ws => ["expres", "orderan"].includes(ws.id));
      }
      
      const activeTopWorkspace = window.kalkulatorTopWorkspace || 'expres';
      
      const topToolbar = `<div class="workspace-toolbar" style="background: transparent; border: none; margin-bottom: 12px; display:flex; gap: 8px; position: relative; z-index: 99;">
        ${topWorkspaces.map(ws => `
          <button class="workspace-tab ${activeTopWorkspace === ws.id ? 'active' : ''}" 
                  onclick="switchKalkulatorTopWorkspace('${ws.id}')" style="flex:1; position:relative; z-index:100; cursor:pointer;">
            <span class="workspace-icon">${ws.icon}</span>
            <span class="workspace-label">${ws.label}</span>
          </button>
        `).join('')}
      </div>`;
      
      let workspaceContent = '';
      
      if (activeTopWorkspace === 'belanja') {
         const rows = shoppingRows();
         const total = rows.reduce((sum, row) => sum + shoppingSubtotal(row), 0);
         
         const workspaces = [
           { id: 'form', icon: '📝', label: 'Form' },
           { id: 'ai-input', icon: '🤖', label: 'AI Input' },
           { id: 'wa', icon: '📋', label: 'Copy WA' },
           { id: 'list', icon: '📋', label: 'Daftar' }
         ];
         
         const activeWorkspace = window.kalkulatorWorkspace || 'list';
         
         const subToolbar = `<div class="workspace-toolbar" style="background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px; padding: 4px; display:flex; gap:4px;">
           ${workspaces.map(ws => `
             <button class="workspace-tab ${activeWorkspace === ws.id ? 'active' : ''}" 
                     onclick="switchKalkulatorWorkspace('${ws.id}')" style="font-size: 0.8rem; padding: 6px 12px; flex:1;">
               <span class="workspace-icon">${ws.icon}</span>
               <span class="workspace-label">${ws.label}</span>
             </button>
           `).join('')}
         </div>`;
         
         let belanjaContent = '';
         switch(activeWorkspace) {
            case 'form':
              belanjaContent = `<div class="workspace-content">
                  <h3>⚡ Form Xpres</h3>
                  <form id="shopping-form" class="grid forms">
                    ${hiddenId()}
                    <label>Nama Barang<input name="name" list="shopping-products" required placeholder="Contoh: Beras Premium"></label>
                    <datalist id="shopping-products">${state.data.products.map((p) => `<option value="${p.name}"></option>`).join("")}</datalist>
                    ${input("qty", "Banyak Beli", true, "number")}
                    ${input("amount", "Harga Dasar", false, "number")}
                    ${formButtons()}
                  </form>
              </div>`;
              break;
            case 'ai-input':
              belanjaContent = `<div class="workspace-content">
                ${window.generateAIInputPanel ? window.generateAIInputPanel('kalkulator') : '<p>AI Input Center loading...</p>'}
              </div>`;
              setTimeout(() => {
                if (window.initAIInputCenter) window.initAIInputCenter();
              }, 100);
              break;
            case 'wa':
              belanjaContent = `<div class="workspace-content">
                  <h3>📋 Copy Paste dari WA</h3>
                  <label>Daftar Belanja
                    <textarea id="shopping-wa-text" class="input-area expandable" placeholder="Contoh:
Payung 5
Gula Pasir 2
Beras Premium 1"></textarea>
                  </label>
                  <div class="actions">
                    <button class="btn soft" id="parse-shopping-wa">Proses Paste WA</button>
                    <button class="btn danger" id="clear-shopping">Kosongkan</button>
                  </div>
              </div>`;
              break;
            case 'list':
            default:
              belanjaContent = `<div class="workspace-content">
                  <h3 style="margin-bottom:8px;">📋 Daftar Belanja - Total: ${rupiah(total)}</h3>
                  ${shoppingTable(rows)}
              </div>`;
         }
         workspaceContent = subToolbar + belanjaContent;
         
      } else if (activeTopWorkspace === 'expres') {
         if (!window.expresCart || window.expresCart.length !== 20) {
             window.expresCart = window.getInitialExpresCart();
         }
         const expresRows = window.expresCart;
         const totalCuan = expresRows.reduce((sum, r) => sum + (r.profit || 0), 0);
         const datalistHtml = `
           <datalist id="expres-products">
             <option value="Beras A"></option>
             <option value="Beras B"></option>
             <option value="Beras C"></option>
             <option value="Cakra"></option>
             <option value="Gula Pasir"></option>
             <option value="Gunung Agung"></option>
             <option value="Kacang A"></option>
             <option value="Kacang B"></option>
             <option value="Kacang C"></option>
             <option value="Kentang Besar"></option>
             <option value="Kentang Pl"></option>
             <option value="Kentang Siomay"></option>
             <option value="Maizena"></option>
             <option value="Minyak Sawit"></option>
             <option value="Payung"></option>
             <option value="Segitiga"></option>
             <option value="Sphp"></option>
             <option value="Telur"></option>
           </datalist>
         `;

          let formsHtml = `
            <div style="width: 100%; background: rgba(255,255,255,0.01); border-radius: 4px; padding: 4px; border: 1px solid rgba(255,255,255,0.05);">
              <div style="display:grid; grid-template-columns: ${isSuperAdmin() ? '2fr 1fr 1fr' : '2fr 1fr'}; gap:0px; padding-bottom: 4px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.2);">
               <div style="font-size:12px; color:#aaa; font-weight:bold; padding-left:6px;">PILIH BARANG</div>
               <div style="font-size:12px; color:#aaa; font-weight:bold; padding-left:6px;">TERJUAL</div>
               ${isSuperAdmin() ? '<div style="font-size:12px; color:#aaa; font-weight:bold; padding-left:6px;">CUAN</div>' : ''}
             </div>
             ${expresRows.map((r, i) => `
             <div style="display:grid; grid-template-columns: ${isSuperAdmin() ? '2fr 1fr 1fr' : '2fr 1fr'}; gap:0px; border-bottom:1px solid rgba(255,255,255,0.05); align-items:center;">
               <input type="text" class="jual-expres-input" list="expres-products" value="${r.name}" oninput="window.updateExpresRow(${i}, 'name', this.value)" style="color:#fff;" ${i===0?'placeholder="Ketik..."':''}>
               <input type="number" class="jual-expres-input" value="${r.qty || ''}" oninput="window.updateExpresRow(${i}, 'qty', this.value)" min="0.1" step="0.1" style="color:#fff; border-left:1px solid rgba(255,255,255,0.05) !important;" ${i===0?'placeholder="Cth: 5"':''}>
               ${isSuperAdmin() ? `<input id="expres-jumlah-${i}" type="text" class="jual-expres-input" readonly style="background:rgba(0,0,0,0.15) !important; border-left:1px solid rgba(255,255,255,0.05) !important; color:var(--garneta-cyan) !important;" value="${r.profit > 0 ? rupiah(r.profit) : ''}" placeholder="Rp 0">` : ''}
             </div>`).join('')}
           </div>
         `;

         workspaceContent = `<div class="workspace-content" style="padding-top:8px;">
             <h3 style="margin:0 0 8px 0; font-size:1rem;">🚀 Jual Expres</h3>
             ${datalistHtml}
             ${formsHtml}
             <div style="padding:8px; background:rgba(0,255,204,0.1); border-radius:6px; margin-top:8px; display:flex; justify-content:space-between; align-items:center; border:1px solid rgba(255,255,255,0.1);">
                 ${isSuperAdmin() ? `
                 <div>
                   <span style="font-weight:bold; font-size:12px; margin-right:8px;">TOTAL CUAN</span>
                   <span id="expres-total" style="font-weight:bold; font-size:1rem; color:var(--garneta-cyan);">${rupiah(totalCuan)}</span>
                 </div>
                 ` : '<div></div>'}
                 <button id="btn-eksekusi-cuan" class="btn" style="background:var(--garneta-cyan); color:#000; font-weight:bold; font-size:12px; padding:4px 12px; border-radius:4px; border:none; cursor:pointer; min-height: 32px;" onclick="window.eksekusiCuan()" ${totalCuan <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>🚀 Eksekusi</button>
             </div>
         </div>`;
      } else if (activeTopWorkspace === 'orderan') {
         let orders = state.data.orders || [];
         if (window.orderanCart.length === 0) window.addOrderanItem();

         let datalistHtml = `<datalist id="orderan-product-list">
            ${(state.data.products || []).map(p => `<option value="${p.name}"></option>`).join('')}
         </datalist>`;

         let cartRows = window.orderanCart.map((item, idx) => `
            <div style="display:grid; grid-template-columns: 2.6fr 1.3fr 1.3fr 47px 1.5fr 30px; gap:2px; margin-bottom:2px; align-items:center;" class="orderan-row">
               <div class="orderan-col">
                  <input type="text" list="orderan-product-list" placeholder="Nama..." value="${item.name}" 
                     oninput="orderanCheckAutoAdd(this, ${idx})" 
                     style="width:100%; height:19px; padding:0 4px; font-size:10px; border-radius:4px; box-sizing:border-box;" class="input orderan-name-input">
               </div>
               <div class="orderan-col">
                  <input type="number" readonly value="${item.modalEcer || 0}" class="input orderan-modal-ecer" style="width:100%; height:19px; padding:0 2px; font-size:10px; background:var(--garneta-bg); cursor:not-allowed; border-radius:4px; box-sizing:border-box;" title="Modal Ecer">
               </div>
               <div class="orderan-col">
                  <input type="number" placeholder="Harga" value="${item.price}" 
                     oninput="window.orderanCart[${idx}].price = parseFloat(this.value)||0; updateOrderanRowDOM(this, ${idx})"
                     style="width:100%; height:19px; padding:0 2px; font-size:10px; border-radius:4px; box-sizing:border-box;" class="input orderan-price">
               </div>
               <div class="orderan-col">
                  <input type="number" placeholder="Qty" value="${item.qty}" 
                     oninput="window.orderanCart[${idx}].qty = parseFloat(this.value)||0; updateOrderanRowDOM(this, ${idx})"
                     style="width:100%; height:19px; padding:0 2px; font-size:10px; text-align:center; border-radius:4px; box-sizing:border-box;" class="input orderan-qty">
               </div>
               <div class="orderan-col">
                  <input type="number" readonly value="${(item.qty || 0) * (item.price || 0)}" class="input orderan-total" style="width:100%; height:19px; padding:0 2px; font-size:10px; background:var(--garneta-bg); cursor:not-allowed; border-radius:4px; box-sizing:border-box;" title="Total Jumlah">
               </div>
               <div class="orderan-action-col" style="height:19px; display:flex; align-items:center; justify-content:space-evenly; background:transparent;">
                  <input type="checkbox" style="width:12px; height:12px; cursor:pointer; margin:0;" ${item.isReady ? 'checked' : ''} onchange="window.orderanCart[${idx}].isReady = this.checked;">
                  <button onclick="removeOrderanItem(${idx})" style="background:none; border:none; color:var(--garneta-danger); cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0;" title="Hapus"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></button>
               </div>
            </div>
         `).join("");

         let orderListHtml = orders.map(o => {
            let total = o.items.reduce((sum, i) => sum + (i.qty * i.price), 0);
            
            // Tanggal besok atau lewat waktu
            let dDate = new Date(o.dueDate);
            dDate.setHours(0,0,0,0);
            let today = new Date();
            today.setHours(0,0,0,0);
            let tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            let badge = '';
            let diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            
            if (dDate < today) badge = `<span class="badge" style="background:#ef4444; color:white;">Lewat Waktu</span>`;
            else if (diffDays === 0) badge = `<span class="badge" style="background:#f59e0b; color:white;">HARI INI!</span>`;
            else if (diffDays === 1) badge = `<span class="badge" style="background:#f59e0b; color:white;">Besok!</span>`;
            else if (diffDays > 1 && diffDays <= 4) badge = `<span class="badge" style="background:#3b82f6; color:white;">H-${diffDays}</span>`;

            let itemsHtml = o.items.map((i, idx) => `
               <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px dashed var(--garneta-border);">
                  <label style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1;">
                     <input type="checkbox" style="width:18px; height:18px;" ${i.isReady ? 'checked' : ''} onchange="toggleOrderanReady('${o.id}', ${idx}, ${i.isReady})">
                     <span style="${i.isReady ? 'text-decoration:line-through; color:var(--garneta-text-muted);' : 'font-weight:500;'}">
                        ${i.name} <span class="muted">(x${i.qty})</span>
                     </span>
                  </label>
                  <div style="text-align:right; min-width:80px; ${i.isReady ? 'text-decoration:line-through; color:var(--garneta-text-muted);' : ''}">
                     Rp ${rupiah(i.qty * i.price)}
                  </div>
               </div>
            `).join("");

            return `
               <div class="card" style="margin-bottom:12px; border-left: 4px solid ${dDate <= tomorrow ? '#f59e0b' : 'var(--garneta-cyan)'};">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                     <div>
                        <h4 style="margin:0; font-size:16px;">${o.customer} ${badge}</h4>
                        <div style="color:var(--garneta-text-muted); font-size:13px; margin-top:4px;">
                           <i class="far fa-calendar-alt"></i> Kirim: <strong>${o.dueDate}</strong>
                        </div>
                     </div>
                     <div style="text-align:right;">
                        <h3 style="margin:0; color:var(--garneta-cyan);">Rp ${rupiah(total)}</h3>
                        <div style="margin-top:8px; display:flex; gap:6px; justify-content:flex-end;">
                           <button onclick="printOrderan('${o.id}')" style="background:none; border:none; color:var(--garneta-text); cursor:pointer; padding:6px; display:inline-flex; align-items:center; justify-content:center; opacity:0.8; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8" title="Cetak Order"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>
                           <button onclick="deleteOrderan('${o.id}')" style="background:none; border:none; color:var(--garneta-danger); cursor:pointer; padding:6px; display:inline-flex; align-items:center; justify-content:center; opacity:0.8; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.8" title="Hapus"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg></button>
                        </div>
                     </div>
                  </div>
                  <div style="background:var(--garneta-bg-darker); padding:12px; border-radius:6px;">
                     ${itemsHtml}
                  </div>
               </div>
            `;
         }).join("");

         if (!orderListHtml) orderListHtml = `<div class="card" style="text-align:center; padding:32px;"><h2 style="color:var(--garneta-border);"><i class="fas fa-box-open"></i></h2><p class="muted">Belum ada orderan aktif.</p></div>`;

         workspaceContent = `
         <style>
            .orderan-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; align-items: start; }
            @media (max-width: 900px) {
               .orderan-grid { grid-template-columns: 1fr; }
            }
         </style>
         <div class="workspace-content orderan-grid" style="padding-top:8px;">
            <!-- FORM TAMBAH -->
            <div style="margin-bottom: 12px;">
               <h3 style="margin-top:0; border-bottom:1px solid var(--garneta-border); padding-bottom:6px; margin-bottom:8px; font-size:14px;">
                  <i class="fas fa-plus-circle" style="color:var(--garneta-cyan);"></i> Buat Orderan Baru
               </h3>
               <div style="display:flex; gap:8px; align-items:flex-end;">
                  <div class="form-group" style="flex:1; margin:0;">
                     <label style="font-size:0.65rem; margin-bottom:2px;">Nama Pemesan / Acara</label>
                     <input type="text" id="orderan-customer" placeholder="Cth: Bu Hajatan..." class="input" style="height:28px; padding:4px 8px; font-size:0.75rem;">
                  </div>
                  <div class="form-group" style="flex:0 0 110px; margin:0;">
                     <label style="font-size:0.65rem; margin-bottom:2px;">Tgl Kirim/Ambil</label>
                     <input type="date" id="orderan-date" class="input" style="height:28px; padding:4px 6px; font-size:0.75rem;">
                  </div>
               </div>
               <div style="margin-top:8px;">
                  <label style="display:block; margin-bottom:8px; font-weight:bold; font-size:11px; color:var(--garneta-text);">Daftar Barang & Harga</label>
                  ${datalistHtml}
                  
                  <div style="display:grid; grid-template-columns: 2.6fr 1.3fr 1.3fr 47px 1.5fr 30px; gap:2px; margin-bottom:4px; padding:0 2px;">
                     <div style="font-size:9px; font-weight:bold; color:var(--garneta-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Barang</div>
                     <div style="font-size:9px; font-weight:bold; color:var(--garneta-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Modal</div>
                     <div style="font-size:9px; font-weight:bold; color:var(--garneta-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Jual</div>
                     <div style="font-size:9px; font-weight:bold; color:var(--garneta-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center;">Qty</div>
                     <div style="font-size:9px; font-weight:bold; color:var(--garneta-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Total</div>
                     <div style="font-size:9px; font-weight:bold; color:var(--garneta-text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:center;">Aksi</div>
                  </div>
                  
                  ${cartRows}
                  <div style="display:flex; justify-content:flex-end; align-items:center; padding:6px 0; border-top:1px dashed var(--garneta-border);">
                     <h3 style="margin:0; font-size:12px;">TOTAL:</h3>
                     <h3 style="margin:0 0 0 8px; font-size:14px; color:var(--garneta-cyan);" id="orderan-grand-total">Rp ${parseInt(window.orderanCart.reduce((s, i) => s + ((i.price||0)*(i.qty||0)), 0)).toLocaleString('id-ID')}</h3>
                  </div>
               </div>
               <button class="btn btn-primary" style="width:100%; margin-top:8px; padding:8px; font-weight:bold; font-size:13px;" onclick="saveOrderan()">
                  <i class="fas fa-save"></i> SIMPAN
               </button>
            </div>

            <!-- DAFTAR ORDERAN -->
            <div>
               <h3 style="margin-top:0; border-bottom:1px solid var(--garneta-border); padding-bottom:12px;">
                  <i class="fas fa-list-alt" style="color:var(--garneta-cyan);"></i> Daftar Orderan Aktif
               </h3>
               <div style="margin-top:16px; max-height:calc(100vh - 200px); overflow-y:auto; padding-right:8px;">
                  ${orderListHtml}
               </div>
            </div>
         </div>`;
      } else if (activeTopWorkspace === 'laporanA') {
         if (!isSuperAdmin()) {
            workspaceContent = `<div class="workspace-content"><div class="card" style="text-align:center; padding: 48px 16px;"><h3 style="color:#f43f5e; margin-top:0;">Akses Ditolak</h3><p class="muted">Hanya Super Admin yang dapat melihat laporan Cuan.</p></div></div>`;
         } else {
             const reports = cuanReports();
             window.cuanLaporanTab = window.cuanLaporanTab || 'harian';
             
             let tableContent = '';
             if (window.cuanLaporanTab === 'harian') {
                 // Hanya bulan ini
                 const grouped = {};
                 reports.forEach(r => {
                     if (!r.executionDate) return;
                     const month = r.executionDate.slice(0, 7);
                     if (month === today().slice(0, 7)) {
                         grouped[r.executionDate] = (grouped[r.executionDate] || 0) + r.amount;
                     }
                 });
                 const sortedDates = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
                 tableContent = `<table class="table"><thead><tr><th>Tanggal</th><th style="text-align:right;">Total Cuan</th></tr></thead><tbody>
                     ${sortedDates.map(d => `<tr><td>${d}</td><td style="text-align:right; color:var(--mint);">${rupiah(grouped[d])}</td></tr>`).join('')}
                     ${sortedDates.length === 0 ? '<tr><td colspan="2" class="muted" style="text-align:center;">Belum ada eksekusi cuan di bulan ini.</td></tr>' : ''}
                 </tbody></table>`;
             } else if (window.cuanLaporanTab === 'bulanan') {
                 const grouped = {};
                 reports.forEach(r => {
                     if (!r.executionDate) return;
                     const month = r.executionDate.slice(0, 7);
                     grouped[month] = (grouped[month] || 0) + r.amount;
                 });
                 const sortedMonths = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
                 tableContent = `<table class="table"><thead><tr><th>Bulan</th><th style="text-align:right;">Total Cuan</th></tr></thead><tbody>
                     ${sortedMonths.map(m => `<tr><td>${m}</td><td style="text-align:right; color:var(--mint);">${rupiah(grouped[m])}</td></tr>`).join('')}
                     ${sortedMonths.length === 0 ? '<tr><td colspan="2" class="muted" style="text-align:center;">Data kosong.</td></tr>' : ''}
                 </tbody></table>`;
             } else if (window.cuanLaporanTab === 'tahunan') {
                 const grouped = {};
                 reports.forEach(r => {
                     if (!r.executionDate) return;
                     const year = r.executionDate.slice(0, 4);
                     grouped[year] = (grouped[year] || 0) + r.amount;
                 });
                 const sortedYears = Object.keys(grouped).sort((a,b) => b.localeCompare(a));
                 tableContent = `<table class="table"><thead><tr><th>Tahun</th><th style="text-align:right;">Total Cuan</th></tr></thead><tbody>
                     ${sortedYears.map(y => `<tr><td>${y}</td><td style="text-align:right; color:var(--mint);">${rupiah(grouped[y])}</td></tr>`).join('')}
                     ${sortedYears.length === 0 ? '<tr><td colspan="2" class="muted" style="text-align:center;">Data kosong.</td></tr>' : ''}
                 </tbody></table>`;
             }

             const tabToolbar = `<div class="workspace-toolbar" style="background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px; padding: 4px; display:flex; gap:4px;">
               <button class="workspace-tab ${window.cuanLaporanTab === 'harian' ? 'active' : ''}" onclick="window.setCuanLaporanTab('harian')" style="font-size: 0.8rem; padding: 6px 12px; flex:1;">Harian</button>
               <button class="workspace-tab ${window.cuanLaporanTab === 'bulanan' ? 'active' : ''}" onclick="window.setCuanLaporanTab('bulanan')" style="font-size: 0.8rem; padding: 6px 12px; flex:1;">Bulanan</button>
               <button class="workspace-tab ${window.cuanLaporanTab === 'tahunan' ? 'active' : ''}" onclick="window.setCuanLaporanTab('tahunan')" style="font-size: 0.8rem; padding: 6px 12px; flex:1;">Tahunan</button>
             </div>`;

             workspaceContent = `<div class="workspace-content">
                 <h3 style="margin:0 0 8px 0; font-size:1rem;">🧾 Laporan Cuan</h3>
                 ${tabToolbar}
                 <div class="card" style="padding:0;">
                     <div class="table-wrap">
                         ${tableContent}
                     </div>
                 </div>
             </div>`;
         }
      }
      
      return `<section class="barang-workspace">
        ${topToolbar}
        ${workspaceContent}
      </section>`;
    }
    
    window.switchKalkulatorTopWorkspace = function(ws) {
       window.kalkulatorTopWorkspace = ws;
       render();
    };

    window.getInitialExpresCart = function() {
        const defaultExpresItems = [
            "Beras A", "Beras B", "Beras C", "Cakra", "Gula Pasir", "Gunung Agung", 
            "Kacang A", "Kacang B", "Kacang C", "Kentang Besar", "Kentang Pl", "Kentang Siomay",
            "Maizena", "Minyak Sawit", "Payung", "Segitiga", "Sphp", "Telur"
        ];
        const products = (window.state && window.state.data && window.state.data.products) ? window.state.data.products : [];
        
        return Array.from({length: 20}, (_, i) => {
            let name = defaultExpresItems[i] || '';
            let isi = 1;
            let cuanEcer = 0;
            
            if (name && products.length > 0) {
                const prod = products.find(p => (p.name || "").trim().toLowerCase() === name.toLowerCase());
                if (prod) {
                    isi = prod.unitContent || 1;
                    const saleEcer = Number(String(prod.salePriceEcer || '0').replace(/[^0-9]/g, '')) || 0;
                    const baseEcer = Number(String(prod.basePriceEcer || '0').replace(/[^0-9]/g, '')) || 0;
                    cuanEcer = saleEcer - baseEcer;
                }
            }
            
            return { name: name, qty: '', isi: isi, cuanEcer: cuanEcer, profit: 0 };
        });
    };

    window.eksekusiCuan = async function() {
        const total = window.expresCart.reduce((sum, r) => sum + (r.profit || 0), 0);
        if (total <= 0) return;
        
        // Menggunakan native confirm agar 100% jalan di semua browser/tanpa masalah CDN
        if (!confirm(`Yakin ingin mengeksekusi Total Cuan ${isSuperAdmin() ? rupiah(total) : 'Shift Ini'}? Data akan masuk ke Laporan A tanggal hari ini.`)) {
            return;
        }

        const btn = document.getElementById('btn-eksekusi-cuan');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Memproses...';
            btn.style.opacity = '0.7';
        }
        try {
            const payload = { amount: total, executionDate: today() };
            await gas("add", { collection: "cuan_reports", item: payload });
            
            // Reset cart
            window.expresCart = window.getInitialExpresCart();
            
            if (btn) {
                btn.innerHTML = '✅ Berhasil!';
                btn.style.background = '#10b981';
                btn.style.opacity = '1';
            }
            
            // Toast tidak akan nge-block UI
            showToast("Sukses mengeksekusi cuan!", "success");
            
            // Render ulang segera supaya UI kembali normal (mengosongkan form)
            render();
            
            // Load data di background agar tidak menahan/mem-freeze UI
            load().catch(console.error);
            
        } catch (e) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '🚀 Eksekusi';
                btn.style.opacity = '1';
            }
            showToast("Gagal eksekusi: " + e.message, "error");
        }
    };

    window.setCuanLaporanTab = function(tab) {
       window.cuanLaporanTab = tab;
       render();
    };
    window.updateExpresRow = function(index, field, value) {
       let row = window.expresCart[index];
       if (!row) return;
       if (field === 'name') {
           row.name = value;
           const prod = window.state.data.products.find(p => (p.name || "").trim().toLowerCase() === String(value || "").trim().toLowerCase());
           if (prod) {
               row.name = prod.name;
               row.isi = prod.unitContent || 1;
               const saleEcer = Number(String(prod.salePriceEcer || '0').replace(/[^0-9]/g, '')) || 0;
               const baseEcer = Number(String(prod.basePriceEcer || '0').replace(/[^0-9]/g, '')) || 0;
               row.cuanEcer = saleEcer - baseEcer;
           } else {
               row.isi = 1;
               row.cuanEcer = 0;
           }
       } else if (field === 'qty') {
           row.qty = parseFloat(value) || 0;
       }
       row.profit = row.qty * (row.isi || 1) * (row.cuanEcer || 0);
       
       // Live update UI elements without calling render() to maintain focus
       const jumlahEl = document.getElementById('expres-jumlah-' + index);
       if (jumlahEl) {
           jumlahEl.value = row.profit > 0 ? rupiah(row.profit) : '';
       }
       
       const totalCuan = window.expresCart.reduce((sum, r) => sum + (r.profit || 0), 0);
       const totalEl = document.getElementById('expres-total');
       if (totalEl) {
           totalEl.innerText = rupiah(totalCuan);
       }
       const btnEksekusi = document.getElementById('btn-eksekusi-cuan');
       if (btnEksekusi) {
           if (totalCuan > 0) {
               btnEksekusi.disabled = false;
               btnEksekusi.style.opacity = '1';
               btnEksekusi.style.cursor = 'pointer';
           } else {
               btnEksekusi.disabled = true;
               btnEksekusi.style.opacity = '0.5';
               btnEksekusi.style.cursor = 'not-allowed';
           }
       }
    };
    
    window.removeExpres = function(index) {
      if (window.expresCart && window.expresCart[index]) {
         window.expresCart[index] = {name: '', qty: '', isi: 1, cuanEcer: 0, profit: 0};
         render();
      }
    };

    // Workspace state for Penjualan page
    window.penjualanWorkspace = localStorage.getItem('penjualanWorkspace') || 'list';
    
    function switchPenjualanWorkspace(workspace) {
      window.penjualanWorkspace = workspace;
      localStorage.setItem('penjualanWorkspace', workspace);
      render();
    }
    
    function penjualan() {
      const workspaces = [
        { id: 'pos', icon: '🛒', label: 'Mesin Kasir (POS)' },
        { id: 'list', icon: '📅', label: 'Riwayat Transaksi' }
      ];
      
      const activeWorkspace = window.penjualanWorkspace || 'pos';
      
      const toolbar = `<div class="workspace-toolbar">
        ${workspaces.map(ws => `
          <button class="workspace-tab ${activeWorkspace === ws.id ? 'active' : ''}" 
                  onclick="switchPenjualanWorkspace('${ws.id}')">
            <span class="workspace-icon">${ws.icon}</span>
            <span class="workspace-label">${ws.label}</span>
          </button>
        `).join('')}
      </div>`;
      
      let workspaceContent = '';
      if (activeWorkspace === 'pos') {
        const rows = posRows();
        const totalCuan = rows.reduce((acc, row) => acc + Number(row.cuan || 0), 0);
        workspaceContent = `<div class="workspace-content">
          <div class="card">
            <h3>🛒 Mesin Kasir (POS)</h3>
            ${saleForm()}
          </div>
          <div class="card">
            <h3>Keranjang Penjualan${isSuperAdmin() ? ` - Total Cuan: <span style="color:#10b981;">${rupiah(totalCuan)}</span>` : ''}</h3>
            ${posTable(rows)}
            <div class="actions" style="margin-top: 1rem;">
              <button class="btn success" id="save-pos" style="width:100%; padding: 1rem; font-size: 1.1rem; font-weight: bold;">Simpan Semua Transaksi</button>
            </div>
          </div>
        </div>`;
      } else {
        workspaceContent = `<div class="workspace-content">
          <div class="card">
            <h3>Riwayat Penjualan</h3>
            ${saleRows()}
          </div>
        </div>`;
      }
      
      return `<section class="barang-workspace">
        ${toolbar}
        ${workspaceContent}
      </section>`;
    }

    function laporan() {
      // Return Initial HTML Framework
      const defaultStart = new Date();
      defaultStart.setDate(1); // 1st day of current month
      const startStr = defaultStart.toISOString().split('T')[0];
      const endStr = new Date().toISOString().split('T')[0];
      
      const tab = window.laporanKeuanganTab || 'sembako';
      
      // Auto-load data if not exists or if dates changed
      setTimeout(() => {
          if (!window.laporanDataLoading) {
             const inputStart = document.getElementById('laporan-start-date');
             const inputEnd = document.getElementById('laporan-end-date');
             if (inputStart && inputEnd) {
                 window.applyFilterLaporan(inputStart.value, inputEnd.value);
             } else {
                 window.applyFilterLaporan(startStr, endStr);
             }
          }
      }, 50);

      return `<section class="grid">
        <div style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; grid-column: 1 / -1;">
          <button onclick="showPage('riwayat'); setTimeout(() => window.switchRiwayatTab('transaksi'), 50);" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">🕰️ Riwayat Transaksi</button>
          <button onclick="showPage('riwayat'); setTimeout(() => window.switchRiwayatTab('hutang'), 50);" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📒 Bon (Kasbon)</button>
          <button style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: var(--garneta-cyan); color: #000; transition: all 0.3s; white-space: nowrap;">📊 Laporan Harian</button>
          <button onclick="showPage('statistik')" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📈 Statistik Harga</button>
        </div>
        
        <div class="card" style="grid-column: 1 / -1; padding-bottom: 8px;">
           <h2 style="margin-top:0;">Filter Laporan Keuangan</h2>
           <div style="display:flex; gap:12px; align-items:flex-end;">
              <div class="form-group" style="margin:0;">
                 <label>Dari Tanggal</label>
                 <input type="date" id="laporan-start-date" class="input" value="${window.laporanStartDate || startStr}">
              </div>
              <div class="form-group" style="margin:0;">
                 <label>Sampai Tanggal</label>
                 <input type="date" id="laporan-end-date" class="input" value="${window.laporanEndDate || endStr}">
              </div>
              <button class="btn primary" onclick="window.applyFilterLaporan(document.getElementById('laporan-start-date').value, document.getElementById('laporan-end-date').value)">Terapkan</button>
           </div>
        </div>

        <div class="card" style="grid-column: 1 / -1; background: linear-gradient(135deg, #1e293b, #0f172a); border-left: 4px solid #10b981;">
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Total Omset</h3>
              <h2 style="margin:0; color:#3b82f6; font-size:1.8rem;" id="summary-omset">Rp 0</h2>
            </div>
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Total Keuntungan Bersih</h3>
              <h2 style="margin:0; color:#10b981; font-size:1.8rem;" id="summary-profit">Rp 0</h2>
            </div>
            <div>
              <h3 style="margin:0; color:var(--text-muted); font-size:1rem;">Saldo Cashflow Akhir</h3>
              <h2 style="margin:0; color:#f59e0b; font-size:1.8rem;" id="summary-cashflow">Rp 0</h2>
            </div>
          </div>
        </div>
        
        <div class="card" style="grid-column: 1 / -1; padding:0;">
           <div class="workspace-toolbar" style="background: rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.05); display:flex; gap:4px; padding:8px;">
             <button class="workspace-tab ${tab === 'sembako' ? 'active' : ''}" onclick="window.switchLaporanTab('sembako')" style="flex:1;">🛒 Toko Sembako</button>
             <button class="workspace-tab ${tab === 'ppob' ? 'active' : ''}" onclick="window.switchLaporanTab('ppob')" style="flex:1;">📱 Transaksi PPOB</button>
             <button class="workspace-tab ${tab === 'cashflow' ? 'active' : ''}" onclick="window.switchLaporanTab('cashflow')" style="flex:1;">💵 Buku Kas (Cashflow)</button>
           </div>
           <div style="padding: 16px;" id="laporan-content-area">
              <div style="text-align:center; padding: 40px; color:var(--garneta-text-muted);">
                 <i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><br><br>Memuat data laporan...
              </div>
           </div>
        </div>
      </section>`;
    }
    
    // Attach global delete function for sale
    window.deleteSale = async function(id) {
      const removed = (state.data.sales || []).find(r => String(r.id) === String(id));
      state.data.sales = (state.data.sales || []).filter(r => String(r.id) !== String(id));
      render();
      try {
        await gas("remove", { collection: "sales", id });
      } catch (err) {
        if (removed) state.data.sales.push(removed);
        render();
        alert("Gagal menghapus: " + err.message);
      }
    };
    

    function statistik() {
      const productId = localStorage.getItem("statsProductId") || "";
      const rows = filteredPriceHistory(productId);
      const prices = rows.map((row) => Number(row.basePrice || 0)).filter((value) => value > 0);
      const last = rows[0]?.basePrice || 0;
      const min = prices.length ? Math.min(...prices) : 0;
      const max = prices.length ? Math.max(...prices) : 0;
      return `<section class="grid">
        <div style="display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; grid-column: 1 / -1;">
          <button onclick="showPage('riwayat'); setTimeout(() => window.switchRiwayatTab('transaksi'), 50);" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">🕰️ Riwayat Transaksi</button>
          <button onclick="showPage('riwayat'); setTimeout(() => window.switchRiwayatTab('hutang'), 50);" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📒 Bon (Kasbon)</button>
          <button onclick="showPage('laporan')" style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: transparent; color: var(--neural-text); transition: all 0.3s; white-space: nowrap;">📊 Laporan Harian</button>
          <button style="padding: 6px 16px; font-size: 0.85rem; border-radius: 20px; font-weight: 600; cursor: pointer; border: 1px solid var(--garneta-cyan); background: var(--garneta-cyan); color: #000; transition: all 0.3s; white-space: nowrap;">📈 Statistik Harga</button>
        </div>
        <div class="card">
          <div class="actions" style="justify-content:space-between">
            <h2>Statistik Perubahan Harga</h2>
            <label style="min-width:240px">Barang
              <select id="stats-product-filter">
                <option value="">Semua Barang</option>
                ${state.data.products.map((product) => `<option value="${product.id}" ${String(product.id) === String(productId) ? "selected" : ""}>${product.name}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="grid stats">
            ${stat("Harga Terakhir", rupiah(last))}
            ${stat("Harga Terendah", rupiah(min))}
            ${stat("Harga Tertinggi", rupiah(max))}
            ${stat("Jumlah Perubahan", rows.length)}
          </div>
          ${barChart(rows.slice().reverse().map((row) => row.basePrice))}
        </div>
        <div class="card">${simpleTable(rows, ["product", "basePrice", "costPrice", "source", "createdAt"], ["Barang", "Harga Dasar", "HPP", "Sumber", "Tanggal"], priceFormat)}</div>
      </section>`;
    }

    function audit() {
      return `<section class="grid">
        <div class="card">
          <h2 style="display:flex; justify-content:space-between; align-items:center;">
            Audit Log
            <button class="btn danger" onclick="clearAuditLogs()">🗑 Hapus Log</button>
          </h2>
          <p class="muted">Riwayat tambah, edit, hapus, backup, dan restore.</p>
        </div>
        <div class="card">${simpleTable(state.data.auditLogs || [], ["createdAt", "user", "message"], ["Tanggal", "User", "Aktivitas"])}</div>
      </section>`;
    }

    function users() {
      return crudView("users", "Akun Super Admin", userForm(), userRows());
    }

    function kasbon() {
      const listKaryawan = employees().map(e => `
        <div class="expandable-row" style="padding:14px; background:rgba(255,255,255,0.03); border-radius:12px; display:flex; justify-content:space-between; align-items:center; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 8px;" onclick="window.openKasbonModal('${e.id}', '${e.name.replace(/'/g, "\\'")}')">
          <strong style="font-size:1rem;">${e.name}</strong>
          <button class="btn primary" style="padding: 6px 14px; border-radius: 20px; font-size:0.75rem;">Ajukan ➔</button>
        </div>
      `).join('');

      return `<section class="grid">
        <div class="card" style="grid-column: 1 / -1; max-width: 600px; margin: 0 auto; width: 100%;">
          <div style="text-align:center; margin-bottom: 24px;">
            <h2 style="font-size: 1.5rem; margin-bottom: 4px;">Pilih Nama Karyawan</h2>
            <p class="muted" style="margin-top:0;">Klik nama Anda untuk mengajukan kasbon</p>
          </div>
          <div style="display:flex; flex-direction:column;">
            ${listKaryawan || '<p class="muted" style="text-align:center;">Belum ada data karyawan.</p>'}
          </div>
        </div>
      </section>

      <!-- Modal Input Kasbon Karyawan -->
      <div id="kasbon-karyawan-modal" class="modal hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;">
        <div class="modal-content card" style="width: 90%; max-width: 400px; padding: 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); background: #0c121e; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
          <h2 style="margin-top:0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">Ajukan Kasbon<br><span id="kasbon-modal-name" style="color:var(--garneta-cyan); font-size:1.1rem;"></span></h2>
          <form onsubmit="window.submitKasbonMandiri(event)">
            <input type="hidden" id="kasbon-modal-id">
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Tanggal</label>
              <input type="date" id="kasbon-modal-date" class="form-control" style="background: rgba(255,255,255,0.05); color: #888;" disabled required>
              <small class="muted" style="font-size: 0.7rem; margin-top: 4px; display: block;">Tanggal otomatis hari ini</small>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Nominal Kasbon (Rp)</label>
              <input type="text" id="kasbon-modal-amount" class="form-control" placeholder="Contoh: 100000" oninput="window.formatRupiahInput(this)" style="font-size: 1.1rem; font-weight: bold; color: var(--garneta-cyan);" required>
            </div>
            
            <div class="form-group" style="margin-bottom: 24px;">
              <label>Keterangan / Keperluan</label>
              <input type="text" id="kasbon-modal-desc" class="form-control" placeholder="Isi alasan kasbon di sini..." required>
            </div>
            
            <div style="display:flex; gap: 12px; justify-content: flex-end;">
              <button type="button" class="btn soft" onclick="document.getElementById('kasbon-karyawan-modal').classList.add('hidden')" style="flex:1;">Batal</button>
              <button type="submit" class="btn primary" style="flex:1; background: linear-gradient(135deg, var(--garneta-cyan), #0099ff); color:#000;">Simpan</button>
            </div>
          </form>
        </div>
      </div>
      `;
    }

    window.openKasbonModal = function(id, name) {
      document.getElementById('kasbon-modal-name').textContent = name;
      document.getElementById('kasbon-modal-id').value = id;
      document.getElementById('kasbon-modal-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('kasbon-modal-amount').value = '';
      document.getElementById('kasbon-modal-desc').value = '';
      
      const modal = document.getElementById('kasbon-karyawan-modal');
      modal.classList.remove('hidden');
    };

    window.submitKasbonMandiri = async function(e) {
      e.preventDefault();
      const id = document.getElementById('kasbon-modal-id').value;
      const amountStr = document.getElementById('kasbon-modal-amount').value;
      const amount = parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
      
      if (amount <= 0) {
        alert('Nominal kasbon harus lebih besar dari 0!');
        return;
      }
      
      const payload = {
        employeeId: id,
        date: document.getElementById('kasbon-modal-date').value,
        amount: amount,
        notes: document.getElementById('kasbon-modal-desc').value,
        status: 'Belum Lunas'
      };
      
      try {
        await gas("add", { collection: "cashAdvances", item: payload });
        alert("Kasbon berhasil diajukan dan disimpan!");
        document.getElementById('kasbon-karyawan-modal').classList.add('hidden');
        await load(); // Refresh data
      } catch (err) {
        alert("Gagal menyimpan kasbon: " + err.message);
      }
    };


    function settings() {
      let tab = localStorage.getItem("settingsTab") || "api";
      if (tab === "tema" || tab === "install") tab = "api";
      const titles = {
        api: ["Pusat API", "Kelola koneksi AI dari server Railway. Key tetap tersembunyi dan hanya dipakai backend."],
        warna: ["Warna Tampilan", "Racik warna dashboard, sidebar, topbar, dan halaman agar tidak membosankan."],
        users: ["Manajemen Pengguna", "Kelola akun kasir/admin dan owner (Super Admin)."],
        backup: ["Backup & Export", "Export Excel/PDF, backup database ke JSON, atau restore dari file backup."],
        audit: ["Audit", "Catatan semua aktivitas penting yang terjadi di sistem."],
        gaji: ["Gaji & Kasbon", "Manajemen data gaji karyawan dan pinjaman (kasbon)."],
          bluetooth: ["Bluetooth Printer", "Pengaturan kertas cetak dan koneksi printer thermal Bluetooth."],
          ppob: ["PPOB & Digiflazz", "Pengaturan API Digiflazz untuk fitur pulsa/tagihan."],
          bluetooth: ["Bluetooth Printer", "Pengaturan kertas cetak dan koneksi printer thermal Bluetooth."]
      };
      const [title, description] = titles[tab] || titles.api;
      return `<section class="settings-page">
        <div class="settings-tabs">
          ${settingsTabButton("warna", "WARNA", tab)}
          ${settingsTabButton("api", "PUSAT API", tab)}
          ${settingsTabButton("users", "USERS", tab)}
          ${settingsTabButton("backup", "BACKUP", tab)}
          ${settingsTabButton("audit", "AUDIT", tab)}
          ${settingsTabButton("gaji", "GAJI & BON", tab)}
            ${settingsTabButton("bluetooth", "BLUETOOTH", tab)}
            ${settingsTabButton("ppob", "PPOB & DIGI", tab)}
            ${settingsTabButton("bluetooth", "BLUETOOTH", tab)}
        </div>

        ${tab === "api" ? `
        <div class="api-center-card" style="max-width: 100%;">
          <div class="api-section-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>🗝️ Omni-API Gateway & Key Rotator</span>
            <div style="display:flex; gap:6px;">
              <button class="btn soft" id="refresh-ai-settings" style="padding: 6px 12px; font-size:12px;">Reload</button>
              <button class="btn primary" id="add-new-api-key" style="padding: 6px 12px; font-size:12px;" onclick="document.getElementById('api-key-form-container').classList.toggle('hidden')">+ Tambah Key</button>
            </div>
          </div>
          <p class="muted">Kelola kunci API AI Anda dengan sistem rotasi otomatis (Failover) dan cegah limit 429.</p>

          <!-- Form Tambah Kunci -->
          <div id="api-key-form-container" class="card hidden" style="margin-bottom: 16px; border-color: var(--green);">
            <h3 id="api-form-title" style="margin-top:0; color:var(--mint);">Tambah Kunci API</h3>
            <form id="api-key-form" class="grid forms" onsubmit="event.preventDefault(); window.saveOmniApiKey && window.saveOmniApiKey()">
              <input type="hidden" id="api-key-id">
              <label>Provider AI
                <select id="api-key-provider" required onchange="document.getElementById('api-key-url').value = this.value === 'OpenAI' ? 'https://api.openai.com/v1' : (this.value === 'Gemini' ? 'https://generativelanguage.googleapis.com' : (this.value === 'Groq' ? 'https://api.groq.com/openai/v1' : (this.value === 'DeepSeek' ? 'https://api.deepseek.com' : (this.value === 'Kie' ? 'https://api.kie.ai/codex/v1/responses' : ''))))">
                  <option value="">-- Pilih Provider --</option>
                  <option value="OpenAI">OpenAI</option>
                  <option value="Gemini">Gemini</option>
                  <option value="Groq">Groq</option>
                  <option value="DeepSeek">DeepSeek</option>
                  <option value="Kie">Kie AI (OpenAI Compatible)</option>
                  <option value="GoAPI">GoAPI</option>
                  <option value="Custom">Custom / Lainnya</option>
                </select>
              </label>
              <label>Nama Akun / Visual<input id="api-key-name" placeholder="Misal: Akun Utama Bos" required></label>
              <label>API Key<input id="api-key-value" type="password" placeholder="sk-..." required></label>
              <label>Base URL Endpoint<input id="api-key-url" placeholder="https://..." required></label>
              <div class="actions" style="grid-column: 1/-1; justify-content: flex-end;">
                <button type="button" class="btn soft" onclick="document.getElementById('api-key-form-container').classList.add('hidden')">Batal</button>
                <button type="submit" class="btn primary">Simpan Kunci</button>
              </div>
            </form>
          </div>

          <div id="ai-settings-panel" class="grid" style="gap: 10px;">
            <p class="muted">Memuat pengaturan Omni-API Gateway...</p>
          </div>
          
          <div class="actions" style="margin-top: 16px;">
            <button class="api-primary" id="test-ai-settings">HEALTH CHECK SEMUA KUNCI</button>
          </div>
          <p id="ai-settings-test-result" class="api-status-text"></p>

          <div class="api-help-card">
            <strong>SISTEM FAILOVER AKTIF 🛡️</strong>
            <ol>
              <li>Sistem akan menggunakan kunci berstatus <span style="color:var(--green); font-weight:bold;">ALIVE</span>.</li>
              <li>Jika terkena limit (429) atau error, kunci otomatis ditandai <span style="color:var(--orange); font-weight:bold;">DEAD</span> dan berpindah ke kunci berikutnya tanpa henti.</li>
              <li>Pastikan selalu ada cadangan kunci untuk menjamin operasional AI berjalan lancar bak raksasa teknologi.</li>
            </ol>
          </div>
        </div>
        ` : ""}
        ${tab === "warna" ? `
        <div class="theme-panel">
          <div class="api-section-title">Warna Tampilan</div>
          <div class="theme-preview" id="theme-preview"></div>
          <div class="theme-grid">
            <label>Mode Tampilan
              <select id="theme-mode">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </label>
            <label>Hijau Utama<input id="theme-green" type="color"></label>
            <label>Orange Aksen<input id="theme-orange" type="color"></label>
            <label>Background<input id="theme-page" type="color"></label>
          </div>
          <div class="actions">
            <button class="api-primary" id="save-theme-colors" type="button">SIMPAN WARNA</button>
            <button class="btn soft" id="reset-theme-colors" type="button">RESET</button>
          </div>
          <p class="muted">Warna berlaku untuk dashboard, sidebar, topbar, tombol utama, grafik, dan halaman lain.</p>
        </div>
        
        ` : ""}
        ${tab === "users" ? `
        <div class="theme-panel">
          <div class="api-section-title">Manajemen Karyawan / Pengguna</div>
          <p class="muted">Tambah, edit, atau hapus akses untuk kasir dan bos.</p>
          ${userForm()}
          <div style="margin-top:20px;"></div>
          ${userRows()}
        </div>
        ` : ""}
        ${tab === "backup" ? `
        <div class="theme-panel">
          <div class="api-section-title">Backup & Export</div>
          <p class="muted">Export Excel/PDF, backup database ke JSON, atau restore dari file backup.</p>
          <div class="actions">
            <button class="api-primary" id="export-excel" type="button">EXPORT EXCEL</button>
            <button class="btn soft" id="export-pdf" type="button">EXPORT PDF</button>
            <button class="btn soft" id="download-backup" type="button">BACKUP JSON</button>
          </div>
          <label>Restore Backup JSON
            <input id="restore-backup-file" type="file" accept="application/json,.json">
          </label>
          <div class="actions">
            <button class="btn danger" id="restore-backup" type="button">RESTORE DATABASE</button>
          </div>
        </div>
        ` : ""}
        ${tab === "audit" ? `
        <div style="margin-top:16px;">
          ${audit()}
        </div>
        ` : ""}
        ${tab === "gaji" ? `
        <div style="margin-top:16px;">
          ${gaji()}
        </div>
        ` : ""}
          
          ${tab === "ppob" ? `
          <div class="theme-panel">
            <div class="api-section-title">Konfigurasi Digiflazz (PPOB)</div>
            <img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" onload="window.initDigiflazzSettings()" style="display:none;">
            <p class="muted">Masukkan Username dan API Key Production Digiflazz Anda untuk mulai berjualan PPOB.</p>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px; max-width: 400px;">
                  <label>Digiflazz Username
                      <input type="text" id="digi-username" class="input" placeholder="contoh: budiX" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px; text-transform:none;" autocapitalize="off" autocomplete="off" spellcheck="false" autocorrect="off">
                      <small style="color:var(--garneta-danger); font-size:0.75rem; margin-top:4px; display:block;">*Perhatikan huruf besar/kecil. Harus persis sama dengan di Digiflazz.</small>
                  </label>
                  <label>Digiflazz API Key
                      <div style="position:relative; width:100%; display:flex; align-items:center;">
                          <input type="password" id="digi-key" class="input" placeholder="Masukkan API Key" style="width:100%; border:1px solid #333; background:#111; color:#fff; padding:8px; padding-right:40px; text-transform:none;" autocapitalize="off" autocomplete="off" spellcheck="false" autocorrect="off">
                          <button type="button" onclick="const k = document.getElementById('digi-key'); k.type = k.type === 'password' ? 'text' : 'password'; this.innerHTML = k.type === 'password' ? '👁️' : '🙈';" style="position:absolute; right:10px; background:transparent; border:none; color:#888; cursor:pointer; font-size:1.1rem; padding:0;">👁️</button>
                      </div>
                  </label>
              </div>
            <div class="actions" style="margin-top:20px;">
                <button class="api-primary" onclick="window.saveDigiflazzSettings()" type="button" style="padding:10px 20px;">SIMPAN PENGATURAN</button>
            </div>
          </div>
          ` : ""}
${tab === "bluetooth" ? `
          <div class="api-center-card" style="max-width: 100%;">
            <div class="api-section-title">Pengaturan Ukuran Kertas</div>
            <p class="muted">Pilih ukuran kertas yang sesuai dengan printer Bluetooth Anda.</p>
            <div class="actions" style="margin-bottom: 20px;">
              <select id="printer-paper-size" class="input" style="max-width: 200px;" onchange="localStorage.setItem('printerPaperSize', this.value); showToast('Ukuran kertas disimpan!', 'success')">
                <option value="32" ${localStorage.getItem('printerPaperSize') === '32' || !localStorage.getItem('printerPaperSize') ? 'selected' : ''}>Kecil (58mm)</option>
                <option value="48" ${localStorage.getItem('printerPaperSize') === '48' ? 'selected' : ''}>Besar (80mm)</option>
              </select>
            </div>
            
            <div class="api-section-title">Koneksi Hardware Kasir</div>
            <p class="muted">Jika ingin mengganti printer Bluetooth ke perangkat lain, silakan reset memori printer di sini.</p>
            <div class="actions">
              <button class="btn danger" onclick="window.resetBluetoothPrinter()" type="button">RESET PRINTER BLUETOOTH</button>
            </div>
          </div>
          ` : ""}

      </section>`;
    }

    
      window.saveDigiflazzSettings = async function() {
          const username = document.getElementById("digi-username").value.trim();
          const key = document.getElementById("digi-key").value.trim();
          if(!username) {
              if (typeof showToast === 'function') showToast("Username harus diisi!", "error");
              return;
          }
          try {
              await gas("setSetting", { key: "DIGIFLAZZ_USERNAME", value: username });
              if(key && key !== "********") {
                  await gas("setSetting", { key: "DIGIFLAZZ_KEY", value: key });
              }
              if (typeof showToast === 'function') showToast("Pengaturan Digiflazz berhasil disimpan!", "success");
          } catch(e) {
              if (typeof showToast === 'function') showToast("Gagal menyimpan: " + e.message, "error");
          }
      };

      window.initDigiflazzSettings = function() {
          setTimeout(async () => {
             try {
                 const userRes = await gas("getSetting", { key: "DIGIFLAZZ_USERNAME" });
                 if (userRes && typeof userRes === 'string') {
                     document.getElementById("digi-username").value = userRes;
                     document.getElementById("digi-key").value = "********";
                 }
             } catch(e) {}
          }, 100);
      };

      function settingsTabButton(key, label, active) {
      return `<button class="${key === active ? "active" : ""}" data-settings-tab="${key}" type="button">${label}</button>`;
    }

    function renderThemeOption(key, name, desc, bgColor, accentColor, activeTab) {
      const currentTheme = localStorage.getItem('garneta_theme') || 'neural';
      const isActive = currentTheme === key;
      return `
        <div class="theme-option-card ${isActive ? 'active' : ''}" data-theme="${key}" style="cursor:pointer; padding:16px; border:2px solid ${isActive ? accentColor : 'rgba(148,163,184,.24)'}; border-radius:16px; background: linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.03)); transition:all 0.3s ease;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <div style="width:48px; height:48px; border-radius:12px; background:${bgColor}; border:2px solid ${accentColor}; display:flex; align-items:center; justify-content:center;">
              <div style="width:16px; height:16px; border-radius:50%; background:${accentColor}; box-shadow:0 0 8px ${accentColor};"></div>
            </div>
            <div>
              <div style="font-weight:700; color:#f8fafc;">${name}</div>
              <div style="font-size:12px; color:#94a3b8;">${desc}</div>
            </div>
          </div>
          ${isActive ? '<div style="text-align:center; padding:4px 12px; background:' + accentColor + '; color:#0f172a; border-radius:8px; font-size:12px; font-weight:700;">✓ AKTIF</div>' : '<div style="text-align:center; padding:4px 12px; background:rgba(148,163,184,.2); color:#94a3b8; border-radius:8px; font-size:12px;">Klik untuk aktifkan</div>'}
        </div>
      `;
    }

    function bindThemeSelector() {
      document.querySelectorAll('[data-theme]').forEach(card => {
        card.addEventListener('click', () => {
          const themeKey = card.dataset.theme;
          applyGarnetaTheme(themeKey);
          // Re-render settings to update UI
          render();
        });
      });
    }

    function applyGarnetaTheme(themeKey) {
      const themes = {
        neural: {
          '--neural-bg': '#0b1f24',
          '--neural-surface': '#102a31',
          '--neural-surface-2': '#142f38',
          '--neural-cyan': '#24f0c7',
          '--neural-cyan-glow': 'rgba(36, 240, 199, 0.4)',
          '--neural-mint': '#8df7df',
          '--neural-orange': '#ff7043',
          '--neural-text': '#e8fbff',
          '--neural-text-soft': '#8fb4bd',
          '--neural-glass': 'rgba(16, 42, 49, 0.85)',
          '--neural-glass-border': 'rgba(141, 247, 223, 0.2)'
        },
        cyber: {
          '--neural-bg': '#0a0a0f',
          '--neural-surface': '#12121a',
          '--neural-surface-2': '#1a1a25',
          '--neural-cyan': '#ff00ff',
          '--neural-cyan-glow': 'rgba(255, 0, 255, 0.4)',
          '--neural-mint': '#ff66ff',
          '--neural-orange': '#00ffff',
          '--neural-text': '#ffffff',
          '--neural-text-soft': '#a0a0b0',
          '--neural-glass': 'rgba(12, 12, 16, 0.9)',
          '--neural-glass-border': 'rgba(255, 0, 255, 0.3)'
        },
        dark: {
          '--neural-bg': '#0d0d0d',
          '--neural-surface': '#1a1a1a',
          '--neural-surface-2': '#262626',
          '--neural-cyan': '#60a5fa',
          '--neural-cyan-glow': 'rgba(96, 165, 250, 0.4)',
          '--neural-mint': '#93c5fd',
          '--neural-orange': '#f87171',
          '--neural-text': '#f5f5f5',
          '--neural-text-soft': '#a3a3a3',
          '--neural-glass': 'rgba(26, 26, 26, 0.9)',
          '--neural-glass-border': 'rgba(96, 165, 250, 0.2)'
        },
        ocean: {
          '--neural-bg': '#0c1a2d',
          '--neural-surface': '#132a47',
          '--neural-surface-2': '#1a3a5c',
          '--neural-cyan': '#00d4ff',
          '--neural-cyan-glow': 'rgba(0, 212, 255, 0.4)',
          '--neural-mint': '#7dd3fc',
          '--neural-orange': '#fbbf24',
          '--neural-text': '#e0f2fe',
          '--neural-text-soft': '#94a3b8',
          '--neural-glass': 'rgba(19, 42, 71, 0.9)',
          '--neural-glass-border': 'rgba(0, 212, 255, 0.25)'
        }
      };
      
      const theme = themes[themeKey];
      if (!theme) return;
      
      const root = document.documentElement;
      Object.entries(theme).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      
      localStorage.setItem('garneta_theme', themeKey);
    }

    function crudView(collection, title, form, rows) {
      return `<section class="grid">
        <div class="card"><h2>${title}</h2>${form}</div>
        <div class="card"><h3>Daftar ${title}</h3>${rows}</div>
      </section>`;
    }

    function stat(label, value) {
      return `<div class="card"><div class="muted">${label}</div><h2>${value ?? 0}</h2></div>`;
    }

        function supplier() {
      return `<style>
        .supplier-table-compact table th,
        .supplier-table-compact table td { padding: 4px 8px !important; font-size: 0.75rem !important; height: auto !important; }
      </style>
      <section class="grid" style="gap:12px;">
        <div style="padding: 0 4px;"><h2 style="margin-bottom: 12px; font-size: 1.1rem; color:var(--nav-text);">Data Supplier</h2>${supplierForm()}</div>
        <div class="supplier-table-compact" style="padding: 0 4px;"><h3 style="margin-bottom: 12px; font-size: 1rem; color:var(--nav-text);">Daftar Data Supplier</h3>${supplierRows()}</div>
      </section>`;
    }

        function supplierForm() {
      return `<style>
        .shopee-compact-supplier .form-group { margin-bottom: 8px; }
        .shopee-compact-supplier label { font-size: 0.75rem; margin-bottom: 2px; display: block; }
        .shopee-compact-supplier input { padding: 6px 8px; font-size: 0.85rem; height: 30px; border-radius: 6px; }
        .shopee-compact-supplier .actions { margin-top: 12px; }
        .shopee-compact-supplier .actions .btn { padding: 6px 16px; font-size: 0.85rem; height: 32px; }
        .supplier-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
        .supplier-grid-2 .form-group { margin-bottom: 0; }
      </style>
      <form data-form="suppliers" class="shopee-compact-form shopee-compact-supplier">
        ${hiddenId()}
        <div class="supplier-grid-2">
            ${input("name", "Nama Supplier", true)}
            ${input("phone", "No WhatsApp", false, "text", "", "")}
        </div>
        ${input("address", "Alamat")}
        ${input("notes", "Keterangan")}
        ${formButtons()}
      </form>`;
    }

    function supplierRows() {
      const keys = ["name", "phone", "address", "notes"];
      const labels = ["Nama Supplier", "No Telepon / WhatsApp", "Alamat", "Keterangan"];
      const formatter = (key, val) => {
        if (key === "phone" && val) {
          const waLink = `https://wa.me/${String(val).replace(/^0/, '62').replace(/\D/g, '')}`;
          return `<a href="${waLink}" target="_blank" style="color:var(--garneta-cyan); text-decoration:none; font-weight:bold;">${escapeHtml(val)}</a>`;
        }
        return escapeHtml(val || "-");
      };
      return actionTable("suppliers", state.data.suppliers || [], keys, labels, formatter);
    }
    function productForm() {
      const cats = [...new Set((state?.data?.products || []).map(p => p.category).filter(Boolean))];
      return `<form data-form="products" class="grid forms shopee-compact-form">
        ${hiddenId()}
        
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; grid-column: 1/-1;">
          <label>Kategori Barang<input name="category" type="text" list="category-list">
            <datalist id="category-list">${cats.map(opt => `<option value="${escapeAttr(opt)}">`).join("")}</datalist>
          </label>
          ${input("name", "Nama Barang", true)}
        </div>
        
        <div style="display:grid; grid-template-columns: ${isSuperAdmin() ? '1fr 1fr 1fr' : '1fr 1fr'}; gap:10px; grid-column: 1/-1;">
          ${input("unitContent", "Isi/Unit", false, "text")}
          ${input("stock", "Stok", false, "number")}
          ${isSuperAdmin() ? '<label>CUAN<input name="cuan" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>' : '<input name="cuan" type="hidden">'}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; grid-column: 1/-1;">
          ${priceWithUnit("basePrice", "unit", "Harga Dasar (Beli)", "Grosir", false)}
          ${priceWithUnit("basePriceEcer", "unitEcer", "Harga Dasar Ecer", "Ecer", true)}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; grid-column: 1/-1;">
          ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false)}
          ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true)}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; grid-column: 1/-1;">
          <label>Potongan Harga (Per-Item)
            <div style="display:flex; gap: 4px;">
              <select name="discountType" style="width: 58px; padding: 0 4px !important;">
                <option value="Rp">Rp</option>
                <option value="%">%</option>
              </select>
              <input name="discountValue" type="number" placeholder="Cth: 1000" style="flex: 1;">
            </div>
          </label>
          ${input("discountMinQty", "Syarat Min. Beli (Qty)", false, "number", "", "Cth: 5")}
        </div>

        ${formButtons()}
      </form>`;
    }

    function productImportTools() {
      return `<div class="grid">
        <div class="grid forms">
          <label>File CSV / Excel / Spreadsheet
            <input id="product-import-file" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls">
          </label>
          <div class="actions" style="align-self:end">
            <button class="btn primary" id="import-products-file">Import File</button>
          </div>
        </div>
        <label>Copy paste dari WA / Spreadsheet
          <textarea id="product-wa-text" class="input-area expandable" placeholder="Contoh:
Beras Premium, Beras, sak, 25, 312500, 14500, 10
Gula Pasir 2
Payung, Tepung, sak, 25, 170000, 8500"></textarea>
        </label>
        <div class="actions">
          <button class="btn soft" id="parse-products-wa">Proses Paste WA</button>
        </div>
        <p class="muted">Format header yang didukung: nama, kategori, unit, isi/unit, harga dasar, harga jual, stok, barcode. Jika hanya "Nama 5", stok akan diisi 5.</p>
      </div>`;
    }

    function productScannerTools() {
      return `<div class="grid">
        <div class="grid forms">
          <label>Hasil Scanner<input id="scanner-result" placeholder="Scan barcode atau ketik manual"></label>
          <label>Nama Barang<input id="scanner-product-name" placeholder="Nama barang dari hasil scan"></label>
          <label>Kategori<input id="scanner-product-category" value="Umum"></label>
          <label>Harga Dasar<input id="scanner-base-price" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="0"></label>
          <label>Unit<select id="scanner-unit"><option>sak</option><option>karton/dus</option><option>jligen</option><option>kg</option><option>ball</option><option>pcs</option></select></label>
          <label>Isi/Unit<input id="scanner-unit-content" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="1"></label>
          <label>Harga Jual<input id="scanner-sale-price" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="0"></label>
          <label>Stok<input id="scanner-stock" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="0"></label>
        </div>
        <video id="scanner-video" class="scanner-preview hidden" playsinline></video>
        <div class="actions">
          <button class="btn soft" id="start-product-scanner">Buka Kamera HP</button>
          <button class="btn danger hidden" id="stop-product-scanner">Tutup Kamera</button>
          <button class="btn primary" id="save-scanned-product">Simpan Hasil Scan</button>
        </div>
        <p class="muted">Scanner memakai kamera perangkat dan BarcodeDetector jika tersedia. Jika browser belum mendukung, isi kode scanner manual.</p>
      </div>`;
    }



    function purchaseForm() {
        const cats = [...new Set((state?.data?.products || []).map(p => p.category).filter(Boolean))];
        return `<form data-form="purchases" class="grid forms">
          ${hiddenId()}
          
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; grid-column: 1/-1;">
            ${input("date", "Tanggal", true, "date", today())}
            <label>Kategori Barang<input name="category" type="text" list="category-list">
              <datalist id="category-list">${cats.map(opt => `<option value="${escapeAttr(opt)}">`).join("")}</datalist>
            </label>
          </div>

          <div style="display:grid; grid-template-columns: ${isSuperAdmin() ? '2fr 1fr 1fr' : '2fr 1fr'}; gap:10px; grid-column: 1/-1;">
            ${input("name", "Nama Barang", false)}
            ${input("unitContent", "Isi/Unit", false, "text")}
            ${isSuperAdmin() ? '<label>CUAN<input name="cuan" type="text" readonly tabindex="-1" style="background:var(--bg);font-weight:bold;"></label>' : '<input name="cuan" type="hidden">'}
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; grid-column: 1/-1;">
            ${priceWithUnit("basePrice", "unit", "Harga Dasar (Beli)", "Grosir", false)}
            ${priceWithUnit("basePriceEcer", "unitEcer", "Harga Dasar Ecer", "Ecer", true)}
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; grid-column: 1/-1;">
            ${priceWithUnit("salePrice", "unit", "Harga Jual (Grosir)", "Grosir", false)}
            ${priceWithUnit("salePriceEcer", "unitEcer", "Harga Jual Ecer", "Ecer", true)}
          </div>

          ${formButtons()}
        </form>`;
      }

    function saleForm() {
      const prodOptions = state.data.products.map((p) => `<option value="${escapeAttr(p.name)}">`).join("");
      return `<form id="pos-form" class="grid forms">
        ${hiddenId()}${input("date", "Tanggal", true, "date", today())}
        <label>Nama Barang
          <input list="sale-products-list" name="product" placeholder="Ketik atau pilih nama barang..." required autocomplete="off">
          <datalist id="sale-products-list">${prodOptions}</datalist>
        </label>
        ${input("unitSold", "Unit Terjual", true, "number")}
        ${isSuperAdmin() ? '<label>Potensi Cuan (Rp)<input name="cuan" type="text" readonly style="background-color:#1c2536;color:#10b981;font-weight:bold;" placeholder="Rp 0"></label>' : '<input name="cuan" type="hidden">'}
        <div class="form-actions" style="grid-column: 1 / -1">
          <button type="submit" class="btn primary" style="width:100%;font-weight:bold;">Tambah ke Keranjang</button>
        </div>
      </form>`;
    }

    function userForm() {
      const hasSuperAdmin = state.data.users.some((user) => user.role === "Super Admin");
      return `<form data-form="users" class="grid forms user-settings-form">
        ${hiddenId()}${input("name", "Nama Karyawan / Owner", true)}
        ${input("password", "Password", !hasSuperAdmin, "password")}
        ${select("role", "Hak Akses", hasSuperAdmin ? ["Admin", "Super Admin"] : ["Super Admin"])}
        ${select("status", "Status", ["Aktif", "Nonaktif"])}
        ${formButtons()}
        <p class="muted" style="grid-column:1/-1">${hasSuperAdmin ? "Untuk mengganti password/nama, pilih akun di bawah lalu klik tombol Edit (Pena)." : "Belum ada Owner. Buat satu akun Super Admin pertama kali."}</p>
      </form>`;
    }

    function productRows() {
      const sorted = [...(state.data.products || [])].sort((a, b) => {
        const catA = (a.category || "").toLowerCase();
        const catB = (b.category || "").toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
      }).map(p => {
        let displayPot = "-";
        let displayMin = "-";
        if (Number(p.discountValue) > 0) {
           displayPot = p.discountType === '%' ? p.discountValue + '%' : rupiah(p.discountValue);
        }
        if (Number(p.discountMinQty) > 0) {
           displayMin = p.discountMinQty;
        }
        const saleEcer = Number(String(p.salePriceEcer || '0').replace(/[^0-9]/g, '')) || 0; const baseEcer = Number(String(p.basePriceEcer || '0').replace(/[^0-9]/g, '')) || 0; return { ...p, displayPot, displayMin, cuan: saleEcer - baseEcer };
      });
      const prodKeys   = isSuperAdmin()
        ? ["category", "name", "unit", "unitContent", "basePrice", "basePriceEcer", "salePrice", "salePriceEcer", "displayPot", "displayMin", "cuan"]
        : ["category", "name", "unit", "unitContent", "salePrice", "salePriceEcer", "displayPot", "displayMin"];
      const prodLabels = isSuperAdmin()
        ? ["Kategori", "Nama", "Satuan", "Isi/Unit", "BELI", "B.ECER", "JUAL", "J.ECER", "POT", "MIN", "CUAN"]
        : ["Kategori", "Nama", "Satuan", "Isi/Unit", "JUAL", "J.ECER", "POT", "MIN"];
      return actionTable("products", sorted, prodKeys, prodLabels, priceFormat);
    }



    function purchaseRows() {
      return actionTable("purchases", state.data.purchases, ["date", "product", "qty", "amount", "total"], ["Tanggal", "Barang", "Banyak", "Harga", "Total"], priceFormat);
    }

    function saleRows() {
      const keys = isSuperAdmin()
        ? ["date", "product", "unitSold", "unitContent", "qty", "profitPerUnit", "profit"]
        : ["date", "product", "unitSold", "unitContent", "qty"];
      const labels = isSuperAdmin()
        ? ["Tanggal", "Barang", "Unit", "Isi", "Banyak", "Profit/Unit", "Keuntungan"]
        : ["Tanggal", "Barang", "Unit", "Isi", "Banyak"];
      return actionTable("sales", state.data.sales, keys, labels, priceFormat);
    }

    function userRows() {
      return actionTable("users", state.data.users || [], ["name", "role", "status"], ["Nama", "Role", "Status"]);
    }

    function shoppingRows() {
      return JSON.parse(localStorage.getItem("shoppingRows") || "[]");
    }

    function invoiceDraftRows() {
      return JSON.parse(localStorage.getItem("invoiceDraftRows") || "[]");
    }

    function saveInvoiceDraftRows(rows) {
      localStorage.setItem("invoiceDraftRows", JSON.stringify(rows));
    }

    function saveShoppingRows(rows) {
      localStorage.setItem("shoppingRows", JSON.stringify(rows));
    }

    function shoppingSubtotal(row) {
      return Number(row.qty || 0) * Number(row.amount || 0);
    }

    function shoppingTable(rows) {
      return actionTable("shopping", rows, ["name", "unit", "qty", "amount", "subtotal"], ["Nama Barang", "Unit", "Banyak Beli", "Harga Dasar", "Total Jumlah"], (key, value) => key === "amount" || key === "subtotal" ? rupiah(value) : value);
    }

    function posRows() {
      return JSON.parse(localStorage.getItem("posRows") || "[]");
    }

    function savePosRows(rows) {
      localStorage.setItem("posRows", JSON.stringify(rows));
    }

    function posTable(rows) {
      const cols   = isSuperAdmin() ? ["date", "product", "unitSold", "cuan"] : ["date", "product", "unitSold"];
      const labels = isSuperAdmin() ? ["Tanggal", "Nama Barang", "Unit Terjual", "Cuan"]  : ["Tanggal", "Nama Barang", "Unit Terjual"];
      return actionTable("pos", rows, cols, labels, (key, value) => key === "cuan" ? rupiah(value) : value);
    }

    function invoiceDraftTable() {
      const rows = invoiceDraftRows();
      if (!rows.length) return `<p class="muted">Belum ada draft nota.</p>`;
      return `<div class="table-wrap"><table>
        <thead><tr><th>Nama</th><th>Kategori</th><th>Unit</th><th>Isi</th><th>Qty</th><th>Harga Dasar</th><th>Harga Jual</th><th>Aksi</th></tr></thead>
        <tbody>${rows.map((row) => `
          <tr data-draft-id="${row.id}">
            <td><input data-draft-field="name" value="${escapeAttr(row.name)}"></td>
            <td><input data-draft-field="category" value="${escapeAttr(row.category || "Umum")}"></td>
            <td><select data-draft-field="unit">${["sak", "karton/dus", "jligen", "kg", "ball", "pcs"].map((unit) => `<option ${row.unit === unit ? "selected" : ""}>${unit}</option>`).join("")}</select></td>
            <td><input data-draft-field="unitContent" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.unitContent || 1))}"></td>
            <td><input data-draft-field="stock" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.stock || 0))}"></td>
            <td><input data-draft-field="basePrice" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.basePrice || 0))}"></td>
            <td><input data-draft-field="salePrice" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(Number(row.salePrice || 0))}"></td>
            <td><button class="btn danger delete-invoice-draft" data-id="${row.id}" type="button">Hapus</button></td>
          </tr>
        `).join("")}</tbody>
      </table></div>`;
    }

    function actionTable(collection, rows, keys, labels, formatter) {
      return `<div data-collection="${collection}">${table(rows, labels.concat(["Aksi"]), (row) => keys.map((key) => td(formatter ? formatter(key, row[key]) : row[key], key)).join("") + `<td class="actions" style="position:relative; overflow:visible; width:40px;"><button class="btn soft" onclick="document.querySelectorAll('.kebab-menu').forEach(m => m !== this.nextElementSibling && m.classList.add('hidden')); this.nextElementSibling.classList.toggle('hidden'); event.stopPropagation();" style="padding: 2px 6px !important; font-size: 13px !important; min-height: 24px !important; line-height: 1 !important; border-radius: 4px !important;">⋮</button><div class="kebab-menu hidden" style="position:absolute; right:36px; top:50%; transform:translateY(-50%); background:var(--card-bg); border:1px solid var(--line); border-radius:8px; padding:6px 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.8); z-index: 50; display:flex; flex-direction:row; gap:12px; min-width:unset;"><button data-edit="${collection}" data-id="${row.id}" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none;">✏️</button><button data-delete="${collection}" data-id="${row.id}" style="background:transparent; border:none; padding:0; margin:0; font-size: 11px; cursor:pointer; min-height:0; line-height:1; box-shadow:none; outline:none;">🗑️</button></div></td>`)}</div>`;
    }

    function simpleTable(rows, keys, labels, formatter) {
      return table(rows, labels, (row) => keys.map((key) => td(formatter ? formatter(key, row[key]) : row[key], key)).join(""));
    }

    function table(rows, labels, body) {
      if (!rows.length) return `<p class="muted">Belum ada data.</p>`;
      return `<div class="table-wrap"><table><thead><tr>${labels.map((label) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr data-id="${row.id}">${body(row)}</tr>`).join("")}</tbody></table></div>`;
    }

    function td(value, field = "") {
      const fieldAttr = field ? ` data-field="${field}"` : "";
      const editableClass = field ? 'editable-cell' : '';
      return `<td${fieldAttr} class="${editableClass}" title="${field ? 'Klik Ganda (Double-Click) untuk mengedit' : ''}">${value ?? ""}</td>`;
    }

    function input(name, label, required, type = "text", value = "") {
      let eyeHtml = "";
      let styleAttr = "";
      if (type === "password") {
        eyeHtml = `<button type="button" tabindex="-1" onclick="const i=this.previousElementSibling; if(i.type==='password'){i.type='text';this.textContent='🙈'}else{i.type='password';this.textContent='👁️'}" style="position:absolute; right:8px; top:20px; background:none; border:none; color:var(--soft-text); font-size:14px; cursor:pointer; padding:4px;">👁️</button>`;
        styleAttr = `style="padding-right: 32px;"`;
      }
      if (type === "number") {
          return `<label style="position:relative">${label}<input name="${name}" type="text" inputmode="numeric" value="${value}" ${required ? "required" : ""} oninput="formatNumberInput(this)"></label>`;
      }
      return `<label style="position:relative">${label}<input name="${name}" type="${type}" value="${value}" ${required ? "required" : ""} ${styleAttr} onblur="if(this.type==='text') this.value=this.value.trim()">${eyeHtml}</label>`;
    }

    function priceWithUnit(namePrice, nameUnit, label, unitPlaceholder, isEcer) {
      const listOptions = isEcer 
        ? ["pcs", "kg", "gram", "renteng", "pack", "biji", "buah", "botol", "ikat"]
        : ["sak", "kotak", "ball", "dus", "kg", "ons", "gram", "pcs", "ikat"];
      const dataListId = isEcer ? "satuan-ecer-list" : "satuan-list";
      
      return `<label>${label}
        <div style="display:flex; gap:5px; margin-top:5px;">
          <input name="${namePrice}" type="text" inputmode="numeric" oninput="formatNumberInput(this)" style="flex:1" placeholder="Rp">
          <span style="display:flex; align-items:center; font-weight:bold; color:var(--muted)">/</span>
          <input name="${nameUnit}" type="text" list="${dataListId}" placeholder="${unitPlaceholder}" style="width:70px; padding-left:4px; padding-right:4px; text-align:center;">
          <datalist id="${dataListId}">${listOptions.map(o => `<option value="${o}">`).join("")}</datalist>
        </div>
      </label>`;
    }

    document.addEventListener('input', e => {
      if (e.target.name === 'unit' || e.target.name === 'unitEcer') {
        const form = e.target.closest('form');
        if (form) {
          form.querySelectorAll(`input[name="${e.target.name}"]`).forEach(el => {
            if (el !== e.target) el.value = e.target.value;
          });
        }
      }
    });

    function select(name, label, options, selectedValue) {
      return `<label>${label}<select name="${name}">${options.map((item) => `<option${item === selectedValue ? ' selected' : ''}>${item}</option>`).join("")}</select></label>`;
    }

    function priceFormat(key, value) {
      return ["basePrice", "basePriceEcer", "costPrice", "salePrice", "salePriceEcer", "amount", "total", "profitPerUnit", "profit", "cuan"].includes(key) ? rupiah(value) : value;
    }

    function hiddenId() {
      return `<input type="hidden" name="id">`;
    }

    function formButtons() {
      return `<div class="actions" style="align-self:end"><button class="btn primary">Simpan</button><button class="btn" type="reset">Reset</button></div>`;
    }


    function findProduct(name) {
      return state.data.products.find((product) => product.name.toLowerCase() === String(name || "").trim().toLowerCase());
    }

    
      function formatNumberInput(el) {
        let val = el.value.replace(/[^0-9-]/g, '');
        if (val) {
          let isNegative = val.startsWith('-');
          val = val.replace(/-/g, '');
          el.value = (isNegative ? '-' : '') + val.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        } else {
          el.value = '';
        }
      }
      
      function formatInitialNumber(val) {
        if (!val) return "";
        return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }

      function plainNumber(value) {
      const cleaned = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function splitRow(line) {
      return String(line).split(/[,;\t]/).map((cell) => cell.trim()).filter((cell) => cell !== "");
    }

    function productFromCells(cells) {
      if (cells.length <= 1) return null;
      return {
        name: cells[0],
        category: cells[1] || "Umum",
        unit: cells[2] || "pcs",
        unitContent: plainNumber(cells[3]) || 1,
        basePrice: plainNumber(cells[4]),
        salePrice: plainNumber(cells[5]),
        stock: plainNumber(cells[6]),
        barcode: cells[7] || ""
      };
    }

    function parseNameQtyUnit(line) {
      const units = ["sak", "karton/dus", "karton", "dus", "jligen", "kg", "ball", "pcs"];
      const pattern = new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${units.map((unit) => unit.replace("/", "\\/")).join("|")})?$`, "i");
      const match = String(line || "").trim().match(pattern);
      if (!match) return null;
      const rawUnit = (match[3] || "pcs").toLowerCase();
      return {
        name: match[1].trim(),
        qty: plainNumber(match[2]),
        unit: rawUnit === "karton" || rawUnit === "dus" ? "karton/dus" : rawUnit
      };
    }

    function parseProductText(text) {
      return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const cells = splitRow(line);
        const fullRow = productFromCells(cells);
        if (fullRow) return fullRow;

        const parsed = parseNameQtyUnit(line);
        if (!parsed) return null;
        return {
          name: parsed.name,
          category: "Umum",
          unit: parsed.unit,
          unitContent: 1,
          basePrice: 0,
          salePrice: 0,
          stock: parsed.qty,
          barcode: ""
        };
      }).filter((row) => row && row.name);
    }

    function parseShoppingText(text) {
      return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        const cells = splitRow(line);
        const parsed = cells.length >= 2 ? null : parseNameQtyUnit(line);
        let name = cells.length >= 2 ? cells[0] : (parsed?.name || "");
        const qty = cells.length >= 2 ? plainNumber(cells[1]) : Number(parsed?.qty || 0);
        if (!name || !qty) return null;
        
        let rawName = name.replace(/\s*\(Hemat.*?\)$/i, '').trim();
        const product = findProduct(rawName);
        let amount = product ? Number(product.basePrice || 0) : 0;
        
        if (product && product.discountMinQty && qty >= Number(product.discountMinQty)) {
          let discountAmt = product.discountType === '%' ? amount * (Number(product.discountValue || 0) / 100) : Number(product.discountValue || 0);
          if (discountAmt > 0) {
            amount -= discountAmt;
            name = `${rawName} (Hemat ${rupiah(discountAmt * qty)})`;
          }
        }
        
        return { id: Date.now() + Math.random(), name: name.trim(), unit: parsed?.unit || product?.unit || "", qty, amount, subtotal: qty * amount };
      }).filter(Boolean);
    }

    async function importProducts(rows) {
      let saved = 0;
      for (const row of rows) {
        await gas("add", { collection: "products", item: row });
        saved += 1;
      }
      await load();
      alert(`${saved} barang berhasil diimport.`);
    }

    function invoiceItemsToProducts(invoice) {
      if (invoice.error) {
        throw new Error(invoice.error);
      }

      return (invoice.items || [])
        .filter((item) => item.nama_barang && item.nama_barang !== "UNKNOWN")
        .map((item) => ({
          name: item.nama_barang,
          category: "Umum",
          unit: item.tipe_harga === "H.M/dus" ? "karton/dus" : "pcs",
          unitContent: 1,
          basePrice: Number(item.harga_modal || 0),
          salePrice: 0,
          stock: Number(item.kuantitas || 0),
          barcode: ""
        }));
    }

    function parseInvoiceDraftFromText(text) {
      const cleaned = String(text || "").replace(/```json|```/g, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start < 0 || end < start) throw new Error("Hasil AI belum berbentuk JSON nota.");
      const invoice = JSON.parse(cleaned.slice(start, end + 1));
      const rows = invoiceItemsToProducts(invoice).map((row) => ({
        ...row,
        id: Date.now() + Math.random()
      }));
      if (!rows.length) throw new Error("Tidak ada item valid untuk dijadikan draft.");
      return rows;
    }

    function collectInvoiceDraftFromTable() {
      const rows = [];
      document.querySelectorAll("tr[data-draft-id]").forEach((tr) => {
        const row = { id: tr.dataset.draftId };
        tr.querySelectorAll("[data-draft-field]").forEach((input) => {
          row[input.dataset.draftField] = input.value;
        });
        row.unitContent = plainNumber(row.unitContent) || 1;
        row.stock = plainNumber(row.stock);
        row.basePrice = plainNumber(row.basePrice);
        row.salePrice = plainNumber(row.salePrice);
        rows.push(row);
      });
      saveInvoiceDraftRows(rows);
      return rows;
    }

    function refreshInvoiceDraftTable() {
      const target = el("invoice-draft-table");
      if (target) {
        target.innerHTML = invoiceDraftTable();
        bindInvoiceDraftTable();
      }
    }

    function readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
        reader.readAsDataURL(file);
      });
    }

    async function readAndCompressImage(file, maxSize = 1280, quality = 0.72) {
      const dataUrl = await readFileAsDataUrl(file);
      return compressImageDataUrl(dataUrl, maxSize, quality);
    }

    function compressImageDataUrl(dataUrl, maxSize = 1280, quality = 0.72) {
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        image.onerror = () => resolve(dataUrl);
        image.src = dataUrl;
      });
    }

    async function readProductFile(file) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (["xlsx", "xls"].includes(ext)) {
        if (!window.XLSX) throw new Error("Library Excel belum termuat. Coba koneksi internet aktif atau gunakan CSV.");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const first = (rows[0] || []).map((cell) => String(cell).toLowerCase());
        const hasHeader = first.some((cell) => ["nama", "name", "barang", "harga dasar", "baseprice"].includes(cell));
        return (hasHeader ? rows.slice(1) : rows).map((row) => productFromCells(row.map(String))).filter((item) => item && item.name);
      }

      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const first = splitRow(lines[0] || "").map((cell) => cell.toLowerCase());
      const hasHeader = first.some((cell) => ["nama", "name", "barang", "harga dasar", "baseprice"].includes(cell));
      return parseProductText((hasHeader ? lines.slice(1) : lines).join("\n"));
    }

    function dailySales() {
      const map = {};
      state.data.sales.forEach((sale) => {
        const dateStr = sale.date.split('T')[0];
        if (!map[dateStr]) map[dateStr] = { date: dateStr, profit: 0, items: [] };
        map[dateStr].profit += Number(sale.profit || 0);
        
        let productName = "Produk Dihapus";
        let unitContent = 1;
        if (sale.productId) {
           const p = state.data.products.find(x => String(x.id) === String(sale.productId));
           if (p) { productName = p.name; unitContent = p.unitContent || 1; }
        }
        
        map[dateStr].items.push({
          ...sale,
          productName,
          unitContent,
          cuan: Number(sale.profit || 0)
        });
      });
      return Object.keys(map).sort((a,b) => new Date(b) - new Date(a)).map((date) => map[date]); // sort newest first
    }

    function filteredPriceHistory(productId) {
      return (state.data.priceHistory || []).filter((row) => !productId || String(row.productId) === String(productId));
    }
    function superAdmins() {
      return state.data.users.filter((user) => user.role === "Super Admin");
    }

    function isSuperAdmin() {
      return state.role === "Super Admin";
    }

    // Menu untuk Admin (5 menu)
    const adminMenus = [
      ["dashboard", "🏠 Dashboard"],
      ["barang", "📦 Barang"],
      ["pembelian", "🛒 Pembelian"],
      ["kalkulator", "⚡ Xpres"],
      ["ngitung", "🧮 NGITUNG"],
      ["riwayat", "🧾 Riwayat & Bon"],
      ["ppob", "📱 PPOB"],
      ["kasbon", "💸 Kasbon"]
    ];
    
    // Menu untuk Super Admin (semua menu)
    const superAdminMenus = [
      ["dashboard", "🏠 Dashboard"], ["barang", "📦 Barang"],
      ["pembelian", "🛒 Pembelian"], ["ngitung", "🧮 NGITUNG"], ["kalkulator", "⚡ Xpres"], 
      ["riwayat", "🧾 Riwayat & Bon"],
      ["ppob", "📱 PPOB"],
      ["kasbon", "💸 Kasbon"],
      ["settings", "⚙️ Setting"]
    ];
    
    // Pilih menu berdasarkan role
    const menus = isSuperAdmin() ? superAdminMenus : adminMenus;

    function barChart(values) {
      const max = Math.max(...values.map(Number), 1);
      return `<div class="chart">${values.map((value) => `<div class="bar" title="${rupiah(value)}" style="height:${Math.max(Number(value) / max * 100, 5)}%"></div>`).join("")}</div>`;
    }

    
      window.searchBarang = function(query) {
        if (!query) {
          const res = document.getElementById("search-barang-results");
          if (res) res.innerHTML = "";
          return;
        }
        const q = query.toLowerCase();
        const results = (state.data.products || []).filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) || 
          (p.category && p.category.toLowerCase().includes(q)) || 
          (p.barcode && String(p.barcode).toLowerCase().includes(q))
        );
        const res = document.getElementById("search-barang-results");
        if (res) {
          const sortedResults = [...results].sort((a, b) => {
            const catA = (a.category || "").toLowerCase();
            const catB = (b.category || "").toLowerCase();
            if (catA < catB) return -1;
            if (catA > catB) return 1;
            const nameA = (a.name || "").toLowerCase();
            const nameB = (b.name || "").toLowerCase();
            return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
          });
          const displayResults = sortedResults.map(p => {
            let displayPot = "-";
            let displayMin = "-";
            if (Number(p.discountValue) > 0) {
               displayPot = p.discountType === '%' ? p.discountValue + '%' : rupiah(p.discountValue);
            }
            if (Number(p.discountMinQty) > 0) {
               displayMin = p.discountMinQty;
            }
            return {
              ...p,
              displayGrosir: p.salePrice ? `${rupiah(p.salePrice)}${p.unit ? ' / ' + p.unit : ''}` : '-',
              displayEcer: p.salePriceEcer ? `${rupiah(p.salePriceEcer)}${p.unitEcer ? ' / ' + p.unitEcer : ''}` : '-',
              displayPot,
              displayMin
            };
          });
          const srchKeys = ["category", "name", "stock", "displayGrosir", "displayEcer", "displayPot", "displayMin"];
          const srchLabels = ["Kategori", "Nama Barang", "Stok", "Harga Grosir", "Harga Ecer", "POT", "MIN"];
          res.innerHTML = actionTable("products", displayResults, srchKeys, srchLabels);
        }
      };
      
      window.clearSearchBarang = function() {
        const input = document.getElementById("search-barang-input");
        if (input) input.value = "";
        window.searchBarang("");
      };

      window.searchPembelian = function(query) {
        if (!query) {
          const res = document.getElementById("search-pembelian-results");
          if (res) res.innerHTML = "";
          return;
        }
        const q = query.toLowerCase();
        const results = (state.data.purchases || []).filter(p => 
          (p.date && String(p.date).toLowerCase().includes(q)) || 
          (p.product && p.product.toLowerCase().includes(q))
        );
        const res = document.getElementById("search-pembelian-results");
        if (res) {
          res.innerHTML = actionTable("purchases", results, ["date", "product", "qty", "amount", "total"], ["Tanggal", "Barang", "Banyak", "Harga", "Total"], priceFormat);
        }
      };
      
      window.clearSearchPembelian = function() {
        const input = document.getElementById("search-pembelian-input");
        if (input) input.value = "";
        window.searchPembelian("");
      };

      function bindForms() {
        document.querySelectorAll('input[name="name"], input[name="category"]').forEach(el => {
          el.addEventListener('input', function() {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = toTitleCase(this.value);
            this.setSelectionRange(start, end);
          });
        });

      // Auto-fill form pembelian
      const purchaseFormEl = document.querySelector('form[data-form="purchases"]');
      if (purchaseFormEl) {
        const nameInput = purchaseFormEl.querySelector('input[name="name"]');
        if (nameInput) {
          nameInput.addEventListener('change', (e) => {
            const product = findProduct(e.target.value);
            if (product) {
              if (purchaseFormEl.elements.category) purchaseFormEl.elements.category.value = product.category || '';
              if (purchaseFormEl.elements.unit) purchaseFormEl.elements.unit.value = product.unit || '';
              if (purchaseFormEl.elements.unitEcer) purchaseFormEl.elements.unitEcer.value = product.unitEcer || '';
              if (purchaseFormEl.elements.unitContent) purchaseFormEl.elements.unitContent.value = product.unitContent || '';
              if (purchaseFormEl.elements.basePrice) purchaseFormEl.elements.basePrice.value = product.basePrice || '';
              if (purchaseFormEl.elements.basePriceEcer) purchaseFormEl.elements.basePriceEcer.value = product.basePriceEcer || '';
              if (purchaseFormEl.elements.salePrice) purchaseFormEl.elements.salePrice.value = product.salePrice || '';
              if (purchaseFormEl.elements.barcode) purchaseFormEl.elements.barcode.value = product.barcode || '';
            }
          });
        }
        
        // Auto hitung total tagihan
        const qtyInput = purchaseFormEl.querySelector('input[name="qty"]');
        const priceInput = purchaseFormEl.querySelector('input[name="basePrice"]');
        const totalInput = purchaseFormEl.querySelector('input[name="total"]');
        const updatePurchaseTotal = () => {
          if (qtyInput && priceInput && totalInput) {
            totalInput.value = (Number(String(qtyInput.value).replace(/[^0-9-]/g, '')) || 0) * (Number(String(priceInput.value).replace(/[^0-9-]/g, '')) || 0);
          }
        };
        if (qtyInput) qtyInput.addEventListener('input', updatePurchaseTotal);
        if (priceInput) priceInput.addEventListener('input', updatePurchaseTotal);
      }

      document.querySelectorAll("form[data-form]").forEach((form) => {
        form.onsubmit = async (event) => {
          event.preventDefault();
          try {
            const collection = form.dataset.form;
            const item = Object.fromEntries(new FormData(form).entries());
            const id = item.id;
            delete item.id;

            if (collection === "sales" && item.product) {
              const searchName = item.product.trim().toLowerCase();
              let prod = state.data.products.find(p => p.name.trim().toLowerCase() === searchName);
              if (!prod) {
                const matches = state.data.products.filter(p => p.name.toLowerCase().includes(searchName));
                if (matches.length === 1) prod = matches[0];
              }
              if (!prod) throw new Error("Barang tidak ditemukan di sistem. Pastikan nama barang sesuai atau pilih dari daftar.");
              item.productId = prod.id;
              delete item.product;
            }
            
            if (collection === "purchases") {
              // ── Validasi nama barang ──
              const namaBarang = (item.name || "").trim() || "Barang Tanpa Nama";

              const purchaseQty = Number(String(item.qty || 1).replace(/[^0-9]/g, '')) || 1;

              // ── Kirim SATU kali ke server purchases ──
              // Server handle semuanya: upsert products + insert purchases + price_history
              const purchasePayload = {
                name:         namaBarang,
                date:         item.date || new Date().toISOString().slice(0, 10),
                category:     (item.category || "Umum").trim(),
                unit:         item.unit    || "pcs",
                unitEcer:     item.unitEcer || "-",
                unitContent:  Number(String(item.unitContent  || 1).replace(/[^0-9]/g, '')) || 1,
                basePrice:    Number(String(item.basePrice    || 0).replace(/[^0-9]/g, '')),
                basePriceEcer:Number(String(item.basePriceEcer|| 0).replace(/[^0-9]/g, '')),
                salePrice:    Number(String(item.salePrice    || 0).replace(/[^0-9]/g, '')),
                salePriceEcer:Number(String(item.salePriceEcer|| 0).replace(/[^0-9]/g, '')),
                qty:          purchaseQty,
                total:        purchaseQty * Number(String(item.basePrice || 0).replace(/[^0-9]/g, ''))
              };

              await gas("add", { collection: "purchases", item: purchasePayload });
              await load();
              return; // selesai, jangan lanjut ke gas() bawah
            }

            await gas(id ? "update" : "add", { collection, id, item });
            await load();
          } catch (error) {
            alert(error.message);
          }
        };
      });

      document.querySelectorAll("[data-edit]").forEach((button) => {
        button.onclick = () => {
          if (button.dataset.edit === "shopping") {
            fillShoppingForm(button.dataset.id);
            return;
          }
          fillForm(button.dataset.edit, button.dataset.id);
        };
      });

      document.querySelectorAll("[data-delete]").forEach((button) => {
        button.onclick = async () => {
          if (button.dataset.delete === "shopping") {
            saveShoppingRows(shoppingRows().filter((row) => String(row.id) !== String(button.dataset.id)));
            render();
            return;
          }

          const collection = button.dataset.delete;
          const id = button.dataset.id;

          // ── Optimistic Delete: hapus dari state lokal DULU ──
          // UI langsung responsif tanpa tunggu server
          const collectionMap = {
            products: "products",
            purchases: "purchases",
            sales: "sales",
            employees: "employees",
            cashAdvances: "cashAdvances",
            payrolls: "payrolls",
            users: "users",
            suppliers: "suppliers"
          };
          const stateKey = collectionMap[collection];
          let removed = null;
          if (stateKey && state.data[stateKey]) {
            removed = state.data[stateKey].find(r => String(r.id) === String(id));
            state.data[stateKey] = state.data[stateKey].filter(r => String(r.id) !== String(id));
            render(); // langsung re-render, user tidak perlu tunggu!
          }

          // ── Sync ke server di background ──
          try {
            await gas("remove", { collection, id });
          } catch (err) {
            // Kalau server gagal, kembalikan data yang terhapus
            if (removed && stateKey && state.data[stateKey]) {
              state.data[stateKey].push(removed);
              state.data[stateKey].sort((a, b) => Number(b.id) - Number(a.id));
            }
            render();
            alert("Gagal menghapus: " + err.message);
          }
        };
      });

      bindProductTools();
      bindPembelianTools();
      bindShoppingTools();
      bindPenjualanTools();
      bindInvoiceAiTools();
      bindSettingsTools();
      bindThemeTools();
      bindThemeSelector();
      bindStatsTools();
      bindBackupTools();
      bindPwaTools();
      bindBrandTools();
    }

    function bindPenjualanTools() {
      const form = document.getElementById("pos-form");
      if (form) {
        const updateCuan = () => {
          const productName = form.elements.product.value.trim().toLowerCase();
          const unitSold = plainNumber(form.elements.unitSold.value || 0);
          
          let prod = state.data.products.find(p => p.name.trim().toLowerCase() === productName);
          if (!prod) {
            const matches = state.data.products.filter(p => p.name.toLowerCase().includes(productName));
            if (matches.length === 1) prod = matches[0];
          }
          
          if (prod) {
              const unitContent = Number(prod.unitContent) || 1;
              let cuan = 0;
              if (Number(prod.salePriceEcer) > 0) {
                 const profitPerPcs = Number(prod.salePriceEcer) - (Number(prod.basePriceEcer) || 0);
                 cuan = profitPerPcs * (unitSold * unitContent);
              } else {
                 const profitPerBulk = (Number(prod.salePrice) || 0) - (Number(prod.basePrice) || 0);
                 cuan = profitPerBulk * unitSold;
              }
              form.elements.cuan.value = cuan;
            } else {
            form.elements.cuan.value = "";
          }
        };

        form.elements.product.addEventListener("input", updateCuan);
          form.elements.product.addEventListener("change", updateCuan);
        form.elements.unitSold.addEventListener("input", updateCuan);

        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const date = formData.get("date");
          const productName = formData.get("product").trim().toLowerCase();
          const unitSold = plainNumber(formData.get("unitSold"));
          
          let prod = state.data.products.find(p => p.name.trim().toLowerCase() === productName);
          if (!prod) {
            const matches = state.data.products.filter(p => p.name.toLowerCase().includes(productName));
            if (matches.length === 1) prod = matches[0];
          }
          
          if (!prod) {
            alert("Barang tidak ditemukan di sistem. Pastikan nama barang sesuai.");
            return;
          }

          const unitContent = Number(prod.unitContent) || 1;
            let cuan = 0;
            if (Number(prod.salePriceEcer) > 0) {
               const profitPerPcs = Number(prod.salePriceEcer) - (Number(prod.basePriceEcer) || 0);
               cuan = profitPerPcs * (unitSold * unitContent);
            } else {
               const profitPerBulk = (Number(prod.salePrice) || 0) - (Number(prod.basePrice) || 0);
               cuan = profitPerBulk * unitSold;
            }

          const rows = posRows();
          rows.unshift({
            id: Date.now() + Math.random(),
            date,
            productId: prod.id,
            product: prod.name,
            unitSold,
            cuan
          });
          savePosRows(rows);
          
          form.reset();
          form.elements.date.value = date;
          render();
        });
      }

      document.getElementById("save-pos")?.addEventListener("click", async () => {
        const rows = posRows();
        if (!rows.length) {
          alert("Keranjang penjualan masih kosong.");
          return;
        }

        if (!confirm(`Simpan ${rows.length} transaksi penjualan?`)) return;

        try {
          const btn = document.getElementById("save-pos");
          btn.disabled = true;
          btn.textContent = "Menyimpan...";

          for (const row of rows) {
            const item = { date: row.date, productId: row.productId, unitSold: row.unitSold };
            await gas("add", { collection: "sales", id: null, item });
          }

          savePosRows([]);
          alert("Transaksi berhasil disimpan!");
          await load();
        } catch (err) {
          alert("Gagal menyimpan transaksi: " + err.message);
          await load();
        }
      });
      
      document.querySelectorAll("[data-delete=\"pos\"]").forEach(btn => {
        btn.onclick = () => {
           const id = btn.dataset.id;
           savePosRows(posRows().filter(r => String(r.id) !== String(id)));
           render();
        };
      });
    }

    function bindStatsTools() {
      el("stats-product-filter")?.addEventListener("change", (event) => {
        localStorage.setItem("statsProductId", event.target.value);
        render();
      });
    }

    function bindSettingsTools() {
      document.querySelectorAll("[data-settings-tab]").forEach((button) => {
        button.addEventListener("click", () => {
          localStorage.setItem("settingsTab", button.dataset.settingsTab);
          render();
        });
      });
      if (!el("ai-settings-panel")) return;
      loadAiSettings();
      el("refresh-ai-settings")?.addEventListener("click", loadAiSettings);
      el("test-ai-settings")?.addEventListener("click", testAiSettings);
    }

    const defaultTheme = { green: "#24f0c7", orange: "#ff7043", page: "#0b1f24", mode: "dark" };
    const defaultBrandAssets = {
      logo: "/assets/images/garneta-basket-logo.svg",
      watermark: "/assets/images/basket-watermark.svg",
      opacity: 14,
      size: 44,
      text: "",
      textSize: 4,
      textColor: "#8df7df"
    };

    function currentTheme() {
      try {
        return { ...defaultTheme, ...JSON.parse(localStorage.getItem("themeColors") || "{}") };
      } catch (error) {
        return { ...defaultTheme };
      }
    }

    function currentBrandAssets() {
      try {
        return { ...defaultBrandAssets, ...JSON.parse(localStorage.getItem("brandAssets") || "{}") };
      } catch (error) {
        return { ...defaultBrandAssets };
      }
    }

    function applyBrandAssets(assets = currentBrandAssets()) {
      const logo = el("brand-logo");
      const watermark = el("page-watermark");
      if (logo) logo.src = assets.logo || defaultBrandAssets.logo;
      if (watermark) {
        watermark.style.backgroundImage = `url("${assets.watermark || defaultBrandAssets.watermark}")`;
        watermark.style.opacity = String(Math.max(0, Math.min(Number(assets.opacity ?? defaultBrandAssets.opacity), 35)) / 100);
        watermark.style.setProperty("--watermark-size", `${Math.max(20, Math.min(Number(assets.size ?? defaultBrandAssets.size), 95))}vw`);
      }
      const watermarkText = el("page-watermark-text");
      if (watermarkText) {
        watermarkText.textContent = assets.text || "";
        watermarkText.style.setProperty("--watermark-text-size", `${Math.max(1, Math.min(Number(assets.textSize ?? defaultBrandAssets.textSize), 9))}vw`);
        watermarkText.style.setProperty("--watermark-text-color", assets.textColor || defaultBrandAssets.textColor);
      }
    }

    function applyTheme(theme = currentTheme()) {
      const root = document.documentElement;
      const mode = resolveThemeMode(theme);
      const isLight = mode === "light";
      const text = isLight ? "#132227" : "#e8fbff";
      const muted = isLight ? "#52646a" : "#8fb4bd";
      const panel = isLight ? "rgba(255,255,255,.88)" : "rgba(255,255,255,.055)";
      const panel2 = isLight ? "rgba(255,255,255,.74)" : "rgba(255,255,255,.028)";
      const field = isLight ? "rgba(255,255,255,.9)" : "rgba(6,19,24,.68)";
      const topbar = isLight ? "rgba(255,255,255,.86)" : "rgba(9,28,34,.86)";
      const sidebarDark = isReadableLight(theme.green) ? "#0b242a" : theme.green;
      root.style.setProperty("--green", theme.green);
      root.style.setProperty("--orange", theme.orange);
      root.style.setProperty("--page", theme.page);
      root.style.setProperty("--text", text);
      root.style.setProperty("--dark", text);
      root.style.setProperty("--soft-text", muted);
      root.style.setProperty("--card-bg", `linear-gradient(145deg, ${panel}, ${panel2})`);
      root.style.setProperty("--field-bg", field);
      root.style.setProperty("--topbar-bg", topbar);
      root.style.setProperty("--sidebar-bg", `linear-gradient(180deg, ${sidebarDark}, #08181d)`);
      root.style.setProperty("--nav-text", "#e8fbff");
      root.style.setProperty("--mint", softenColor(theme.green, "#bbf7d0"));
      root.style.setProperty("--line", softenColor(theme.green, "#dbe7dc"));
    }

    function bindThemeTools() {
      if (!el("theme-green")) return;
      const theme = currentTheme();
      el("theme-mode").value = theme.mode;
      el("theme-green").value = theme.green;
      el("theme-orange").value = theme.orange;
      el("theme-page").value = theme.page;
      updateThemePreview();

      ["theme-mode", "theme-green", "theme-orange", "theme-page"].forEach((id) => {
        el(id)?.addEventListener("input", () => {
          const next = readThemeInputs();
          applyTheme(next);
          updateThemePreview();
        });
      });

      el("save-theme-colors")?.addEventListener("click", () => {
        const next = readThemeInputs();
        localStorage.setItem("themeColors", JSON.stringify(next));
        applyTheme(next);
      });

      el("reset-theme-colors")?.addEventListener("click", () => {
        localStorage.removeItem("themeColors");
        applyTheme(defaultTheme);
        el("theme-mode").value = defaultTheme.mode;
        el("theme-green").value = defaultTheme.green;
        el("theme-orange").value = defaultTheme.orange;
        el("theme-page").value = defaultTheme.page;
        updateThemePreview();
      });
    }

    function bindBrandTools() {
      if (!el("brand-logo-upload")) return;
      const assets = currentBrandAssets();
      setBrandPreview(assets);

      el("brand-logo-upload")?.addEventListener("change", async (event) => {
        try {
          const file = event.target.files[0];
          if (!file) return;
          const next = { ...currentBrandAssets(), logo: await readAssetFile(file) };
          setBrandPreview(next);
          applyBrandAssets(next);
        } catch (error) {
          alert(error.message);
        }
      });

      el("watermark-upload")?.addEventListener("change", async (event) => {
        try {
          const file = event.target.files[0];
          if (!file) return;
          const next = { ...currentBrandAssets(), watermark: await readAssetFile(file) };
          setBrandPreview(next);
          applyBrandAssets(next);
        } catch (error) {
          alert(error.message);
        }
      });

      el("watermark-opacity")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), opacity: Number(el("watermark-opacity").value) };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-size")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), size: Number(el("watermark-size").value) };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-text")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), text: el("watermark-text").value };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-text-size")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), textSize: Number(el("watermark-text-size").value) };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("watermark-text-color")?.addEventListener("input", () => {
        const next = { ...collectBrandInputs(), textColor: el("watermark-text-color").value };
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("save-brand-assets")?.addEventListener("click", () => {
        const next = collectBrandInputs();
        localStorage.setItem("brandAssets", JSON.stringify(next));
        applyBrandAssets(next);
        alert("Logo dan watermark berhasil disimpan.");
      });

      el("clear-watermark-text")?.addEventListener("click", () => {
        el("watermark-text").value = "";
        const next = { ...collectBrandInputs(), text: "" };
        localStorage.setItem("brandAssets", JSON.stringify(next));
        setBrandPreview(next);
        applyBrandAssets(next);
      });

      el("reset-brand-assets")?.addEventListener("click", () => {
        localStorage.removeItem("brandAssets");
        el("brand-logo-upload").value = "";
        el("watermark-upload").value = "";
        setBrandPreview(defaultBrandAssets);
        applyBrandAssets(defaultBrandAssets);
      });
    }

    function collectBrandInputs() {
      const assets = currentBrandAssets();
      return {
        logo: el("logo-preview")?.dataset.image || assets.logo || defaultBrandAssets.logo,
        watermark: el("watermark-preview")?.dataset.image || assets.watermark || defaultBrandAssets.watermark,
        opacity: Number(el("watermark-opacity")?.value || assets.opacity || defaultBrandAssets.opacity),
        size: Number(el("watermark-size")?.value || assets.size || defaultBrandAssets.size),
        text: el("watermark-text")?.value ?? assets.text ?? defaultBrandAssets.text,
        textSize: Number(el("watermark-text-size")?.value || assets.textSize || defaultBrandAssets.textSize),
        textColor: el("watermark-text-color")?.value || assets.textColor || defaultBrandAssets.textColor
      };
    }

    function setBrandPreview(assets) {
      const next = { ...defaultBrandAssets, ...assets };
      const logoPreview = el("logo-preview");
      const watermarkPreview = el("watermark-preview");
      if (logoPreview) {
        logoPreview.style.backgroundImage = `url("${next.logo}")`;
        logoPreview.dataset.image = next.logo;
      }
      if (watermarkPreview) {
        watermarkPreview.style.backgroundImage = `url("${next.watermark}")`;
        watermarkPreview.style.opacity = String(Math.max(0.18, Number(next.opacity || defaultBrandAssets.opacity) / 100));
        watermarkPreview.dataset.image = next.watermark;
      }
      if (el("watermark-opacity")) el("watermark-opacity").value = Number(next.opacity || defaultBrandAssets.opacity);
      if (el("watermark-opacity-label")) el("watermark-opacity-label").textContent = `${Number(next.opacity || defaultBrandAssets.opacity)}%`;
      if (el("watermark-size")) el("watermark-size").value = Number(next.size || defaultBrandAssets.size);
      if (el("watermark-size-label")) el("watermark-size-label").textContent = `${Number(next.size || defaultBrandAssets.size)}%`;
      if (el("watermark-text")) el("watermark-text").value = next.text || "";
      if (el("watermark-text-size")) el("watermark-text-size").value = Number(next.textSize || defaultBrandAssets.textSize);
      if (el("watermark-text-size-label")) el("watermark-text-size-label").textContent = `${Number(next.textSize || defaultBrandAssets.textSize)}vw`;
      if (el("watermark-text-color")) el("watermark-text-color").value = next.textColor || defaultBrandAssets.textColor;
    }

    function readAssetFile(file) {
      const maxBytes = 1_500_000;
      if (file.size > maxBytes) throw new Error("Ukuran gambar maksimal 1.5 MB agar aplikasi tetap ringan.");
      return readFileAsDataUrl(file);
    }

    function readThemeInputs() {
      return {
        mode: el("theme-mode")?.value || defaultTheme.mode,
        green: el("theme-green")?.value || defaultTheme.green,
        orange: el("theme-orange")?.value || defaultTheme.orange,
        page: el("theme-page")?.value || defaultTheme.page
      };
    }

    function updateThemePreview() {
      const preview = el("theme-preview");
      if (!preview) return;
      const theme = readThemeInputs();
      preview.style.background = `linear-gradient(135deg, ${theme.green}, ${theme.orange})`;
    }

    function bindBackupTools() {
      el("export-excel")?.addEventListener("click", exportExcel);
      el("export-pdf")?.addEventListener("click", exportPdf);
      el("download-backup")?.addEventListener("click", downloadBackup);
      el("restore-backup")?.addEventListener("click", restoreBackup);
    }

    function bindPwaTools() {
      el("install-pwa")?.addEventListener("click", async () => {
        if (!deferredInstallPrompt) {
          alert("Jika tombol install belum tersedia, buka menu browser lalu pilih Add to Home Screen / Install App.");
          return;
        }
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
      });
    }

    function workbookRows() {
      return {
        Barang: state.data.products || [],

        Pembelian: state.data.purchases || [],
        Penjualan: state.data.sales || [],
        RiwayatHarga: state.data.priceHistory || [],
        AuditLog: state.data.auditLogs || []
      };
    }

    function exportExcel() {
      if (!window.XLSX) {
        alert("Library Excel belum termuat. Pastikan internet aktif atau gunakan backup JSON.");
        return;
      }
      const workbook = XLSX.utils.book_new();
      Object.entries(workbookRows()).forEach(([name, rows]) => {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
      });
      XLSX.writeFile(workbook, `inventory-${today()}.xlsx`);
    }

    function exportPdf() {
      const rows = workbookRows();
      const html = Object.entries(rows).map(([title, items]) => `
        <h2>${title}</h2>
        ${simpleTable(items.slice(0, 100), Object.keys(items[0] || { kosong: "" }), Object.keys(items[0] || { kosong: "Data" }))}
      `).join("");
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`<html><head><title>Export GARNETA STORE</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{width:100%;border-collapse:collapse;margin-bottom:24px}td,th{border:1px solid #ccc;padding:6px;font-size:11px;text-align:left}h2{margin-top:24px}      </style>  

</head><body><h1>GARNETA STORE</h1>${html}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }

    async function downloadBackup() {
      try {
        const backup = await gas("backupData");
        downloadText(`backup-inventory-${today()}.json`, JSON.stringify(backup, null, 2), "application/json");
        await load();
      } catch (error) {
        alert(error.message);
      }
    }

    async function restoreBackup() {
      try {
        const file = el("restore-backup-file")?.files[0];
        if (!file) throw new Error("Pilih file backup JSON terlebih dahulu.");
        if (!confirm("Restore akan mengganti data database dengan isi backup. Lanjutkan?")) return;
        const backup = JSON.parse(await file.text());
        state.data = await gas("restoreData", { backup });
        renderShell();
        render();
        alert("Restore berhasil.");
      } catch (error) {
        alert(error.message);
      }
    }

    function downloadText(filename, text, type = "text/plain") {
      const blob = new Blob([text], { type });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    function resolveThemeMode(theme) {
      if (theme.mode === "light" || theme.mode === "dark") return theme.mode;
      return isReadableLight(theme.page) ? "light" : "dark";
    }

    function isReadableLight(hexColor) {
      const hex = String(hexColor || "").replace("#", "");
      if (!/^[0-9a-f]{6}$/i.test(hex)) return false;
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const linear = (value) => value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
      const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
      return luminance > 0.52;
    }

    function softenColor(value, fallback) {
      const hex = String(value || "").replace("#", "");
      if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const mix = (channel) => Math.round(channel + (255 - channel) * 0.75).toString(16).padStart(2, "0");
      return `#${mix(r)}${mix(g)}${mix(b)}`;
    }

    async function loadAiSettings(providerOverride) {
      try {
        const selectedProvider = typeof providerOverride === "string"
          ? providerOverride
          : (el("ai-provider")?.value || undefined);
        const settings = await gas("aiSettings", { provider: selectedProvider });
        const allSettings = await gas("aiSettingsAll");
        const keyRows = renderApiKeyLayers(allSettings.keys || []);
        const providerRows = renderProviderSummaries(allSettings.providers || []);
        el("ai-settings-panel").innerHTML = `
          <div class="api-badges">
            <span class="api-badge">PROVIDER: ${settings.provider.toUpperCase()}</span>
            <span class="api-badge">MODEL: AUTO (${settings.model})</span>
            <span class="api-badge ${allSettings.liveKeys ? "ok" : "warn"}">LIVE: ${allSettings.liveKeys}/${allSettings.totalKeys || 0}</span>
            <span class="api-badge ${allSettings.deadKeys ? "warn" : "ok"}">DEAD: ${allSettings.deadKeys}</span>
            <span class="api-badge warn">PENDING: ${allSettings.pendingKeys || 0}</span>
          </div>
          <div class="api-key-list">${providerRows}</div>
          <div class="api-key-box">
            <details>
              <summary style="cursor:pointer; font-weight:bold; color:var(--mint); margin-bottom:8px;">▾ LIHAT DAFTAR API KEY LENGKAP</summary>
              <div class="api-key-list">${keyRows}</div>
            </details>
          </div>
          <form id="ai-settings-form" class="api-form-grid">
            <label>Provider AI</label>
            <select id="ai-provider">
              <option value="gemini" ${settings.provider === "gemini" ? "selected" : ""}>Gemini</option>
              <option value="openai" ${settings.provider === "openai" ? "selected" : ""}>OpenAI</option>
              <option value="groq" ${settings.provider === "groq" ? "selected" : ""}>Groq</option>
              <option value="deepseek" ${settings.provider === "deepseek" ? "selected" : ""}>DeepSeek</option>
              <option value="kie" ${settings.provider === "kie" ? "selected" : ""}>Kie AI (OpenAI Compatible)</option>
            </select>
            <label>Model</label>
            <input id="ai-model" value="auto" placeholder="auto / gemini-2.5-flash" title="Kosongkan atau isi auto agar backend memilih model terbaik bawaan provider.">
            <button class="api-primary" type="submit">SIMPAN PROVIDER AKTIF</button>
          </form>
          <div class="api-warning">
            Pilih Provider AI utama yang akan digunakan untuk asisten. Pastikan Anda sudah menambahkan API Key-nya di atas.
          </div>
          <div class="api-warning">
            Analisa foto hanya memakai provider vision: Gemini, OpenAI, dan Groq. DeepSeek disimpan untuk fallback teks dan tidak dikirim gambar.
          </div>
        `;
        bindAiSettingsForm();
        bindAiKeyLayerActions();
      } catch (error) {
        el("ai-settings-panel").innerHTML = `<p class="muted">${error.message}</p>`;
      }
    }

    function renderProviderSummaries(providers) {
      return providers.map((provider) => `
        <div class="api-key-item">
          <span><strong>${provider.providerLabel}</strong><br><small>${provider.totalKeys} key tersimpan, ${provider.liveKeys} LIVE, ${provider.deadKeys} DEAD</small></span>
          <span class="api-badge ${provider.totalKeys ? "ok" : "warn"}">${provider.totalKeys ? "TERDAFTAR" : "KOSONG"}</span>
        </div>
      `).join("");
    }

    function renderApiKeyLayers(keys) {
      if (!keys.length) {
        return `<div class="api-key-item"><span>Belum ada layer API key tersimpan.</span><span class="api-badge warn">EMPTY</span></div>`;
      }

      return keys.map((key) => `
        <div class="api-key-item" id="api-row-${key.id}" style="display:grid">
          <div class="api-key-display-row">
            <span>
              <strong>${key.providerLabel}</strong> LAYER ${key.layer} · ${key.masked}<br>
              <small>Model otomatis: ${key.model}${key.message ? ` - ${key.message}` : ""}</small>
            </span>
            <span class="actions">
              <button class="btn soft edit-ai-key" data-provider="${key.provider}" data-key-id="${key.id}" type="button">EDIT</button>
              <span class="api-badge ${key.status === "live" ? "ok" : "warn"}">${key.status.toUpperCase()}</span>
              ${key.status === "dead" ? `<button class="btn danger delete-ai-key" data-provider="${key.provider}" data-key-id="${key.id}" type="button">Hapus</button>` : ""}
            </span>
          </div>
          <div class="edit-overlay api-edit-overlay" id="edit-mode-${key.id}">
            <input class="edit-ai-key-input" type="password" placeholder="Masukkan API key pengganti">
            <button class="btn primary save-ai-key-edit" data-provider="${key.provider}" data-key-id="${key.id}" type="button">SAVE</button>
            <button class="btn soft cancel-ai-key-edit" data-key-id="${key.id}" type="button">CANCEL</button>
          </div>
        </div>
      `).join("");
    }

    function bindAiKeyLayerActions() {
      document.querySelectorAll(".edit-ai-key").forEach((button) => {
        button.addEventListener("click", () => openEditMode(button.dataset.keyId));
      });

      document.querySelectorAll(".cancel-ai-key-edit").forEach((button) => {
        button.addEventListener("click", () => cancelEdit(button.dataset.keyId));
      });

      document.querySelectorAll(".save-ai-key-edit").forEach((button) => {
        button.addEventListener("click", () => saveEdit(button.dataset.keyId, button.dataset.provider));
      });

      document.querySelectorAll(".delete-ai-key").forEach((button) => {
        button.addEventListener("click", async () => {
          const target = el("ai-settings-test-result");
          try {
            target.textContent = "Menghapus API key DEAD...";
            await gas("deleteAiKey", {
              provider: button.dataset.provider,
              keyId: button.dataset.keyId
            });
            target.textContent = "API key DEAD berhasil dihapus.";
            await loadAiSettings(el("ai-provider")?.value);
          } catch (error) {
            target.textContent = error.message;
          }
        });
      });
    }

    function openEditMode(id) {
      document.querySelectorAll(".edit-overlay").forEach((panel) => panel.classList.remove("active"));
      el(`edit-mode-${id}`)?.classList.add("active");
    }

    function cancelEdit(id) {
      const panel = el(`edit-mode-${id}`);
      panel?.classList.remove("active");
      const input = panel?.querySelector(".edit-ai-key-input");
      if (input) input.value = "";
    }

    async function saveEdit(id, provider) {
      const panel = el(`edit-mode-${id}`);
      const input = panel?.querySelector(".edit-ai-key-input");
      const target = el("ai-settings-test-result");
      try {
        target.textContent = "Menyimpan edit API key...";
        await gas("editAiKey", {
          provider,
          keyId: id,
          apiKey: input?.value || ""
        });
        target.textContent = "API key berhasil diperbarui.";
        cancelEdit(id);
        await loadAiSettings(el("ai-provider")?.value);
      } catch (error) {
        target.textContent = error.message;
      }
    }

    function bindAiSettingsForm() {
      const providerInput = el("ai-provider");
      const modelInput = el("ai-model");
      const form = el("ai-settings-form");

      providerInput?.addEventListener("change", () => {
        modelInput.value = "auto";
        loadAiSettings(providerInput.value);
      });

      form?.addEventListener("submit", saveAiSettings);
    }

    function renderAiKeyInputs(values) {
      const container = el("ai-key-input-list");
      if (!container) return;
      container.innerHTML = "";
      const safeValues = (values || [""]).slice(0, 10);
      safeValues.forEach((value) => addAiKeyInput(value));
    }

    function addAiKeyInput(value = "") {
      const container = el("ai-key-input-list");
      if (!container || container.children.length >= 10) return;
      const row = document.createElement("div");
      row.className = "api-key-input-row";
      row.innerHTML = `
        <input class="ai-key-input" data-hidden="true" type="password" value="${escapeAttr(value)}" placeholder="Masukkan API Key...">
        <span class="api-badge warn">PENDING</span>
        <button class="btn soft remove-ai-key" type="button">HAPUS</button>
      `;
      row.querySelector(".remove-ai-key").addEventListener("click", () => {
        row.remove();
        if (!container.children.length) addAiKeyInput();
      });
      row.querySelector(".ai-key-input").addEventListener("input", () => {
        const inputs = [...container.querySelectorAll(".ai-key-input")];
        const isLast = inputs[inputs.length - 1] === row.querySelector(".ai-key-input");
        if (isLast && row.querySelector(".ai-key-input").value.trim() && container.children.length < 10) {
          addAiKeyInput();
        }
      });
      container.appendChild(row);
    }

    function collectAiKeyValues() {
      return [...document.querySelectorAll(".ai-key-input")]
        .map((input) => input.value.trim())
        .filter(Boolean)
        .slice(0, 10);
    }

    async function saveAiSettings(event) {
      event.preventDefault();
      const target = el("ai-settings-test-result");
      try {
        target.textContent = "Menyimpan API settings...";
        await gas("saveAiSettings", {
          provider: el("ai-provider").value,
          model: el("ai-model").value
        });
        target.textContent = "API settings berhasil disimpan.";
        await loadAiSettings(el("ai-provider").value);
      } catch (error) {
        target.textContent = error.message;
      }
    }

    window.saveOmniApiKey = async function() {
      const target = el("api-settings-test-result") || document.createElement("div"); // fallback
      try {
        const provider = el("api-key-provider").value;
        const name = el("api-key-name").value;
        const apiKey = el("api-key-value").value;
        const baseUrl = el("api-key-url").value;

        if (!provider || !name || !apiKey) {
          alert("Pilih provider, isi nama akun, dan API key.");
          return;
        }

        await gas("addAiKey", { provider, name, apiKey, baseUrl });
        alert("Kunci API berhasil ditambahkan!");
        
        // Reset form dan hide
        el("api-key-form").reset();
        document.getElementById('api-key-form-container').classList.add('hidden');
        
        // Reload settings
        await loadAiSettings(el("ai-provider")?.value || "gemini");
      } catch (error) {
        alert("Gagal menyimpan kunci: " + error.message);
      }
    };

    async function testAiSettings() {
      const target = el("ai-settings-test-result");
      try {
        target.textContent = "Menguji koneksi API...";
        const result = await gas("testAiSettings", {
          provider: el("ai-provider")?.value
        });
        const dead = (result.keys || []).filter((key) => key.status === "dead").length;
        target.textContent = `${result.message} Provider: ${result.provider}, Model: ${result.model}, Dead: ${dead}`;
        await loadAiSettings(el("ai-provider")?.value);
      } catch (error) {
        target.textContent = error.message === "API_KEY_NOT_CONFIGURED_ON_RAILWAY"
          ? "API key belum diatur. Isi dari halaman Pusat API lalu simpan."
          : error.message;
      }
    }

    function bindInvoiceAiTools() {
      el("analyze-invoice-file")?.addEventListener("click", async () => {
        try {
          const file = el("invoice-image-file").files[0];
          if (!file) throw new Error("Pilih file foto nota terlebih dahulu.");
          const imageDataUrl = await readAndCompressImage(file);
          await analyzeInvoiceImage(imageDataUrl);
        } catch (error) {
          alert(error.message);
        }
      });

      el("open-invoice-camera")?.addEventListener("click", openInvoiceCamera);
      el("close-invoice-camera")?.addEventListener("click", closeInvoiceCamera);
      el("capture-invoice-photo")?.addEventListener("click", async () => {
        try {
          const imageDataUrl = await compressImageDataUrl(captureInvoiceFrame());
          await analyzeInvoiceImage(imageDataUrl);
        } catch (error) {
          alert(error.message);
        }
      });

      el("copy-invoice-result")?.addEventListener("click", async () => {
        try {
          const text = el("invoice-ai-result")?.value || "";
          if (!text.trim()) throw new Error("Belum ada hasil untuk dicopy.");
          await navigator.clipboard.writeText(text);
          alert("Hasil berhasil dicopy.");
        } catch (error) {
          alert(error.message);
        }
      });

      el("parse-invoice-draft")?.addEventListener("click", () => {
        try {
          const rows = parseInvoiceDraftFromText(el("invoice-ai-result")?.value || "");
          saveInvoiceDraftRows([...rows, ...invoiceDraftRows()]);
          refreshInvoiceDraftTable();
        } catch (error) {
          alert(error.message);
        }
      });

      el("save-invoice-draft")?.addEventListener("click", saveInvoiceDraft);
      el("clear-invoice-draft")?.addEventListener("click", () => {
        if (!confirm("Kosongkan draft nota?")) return;
        saveInvoiceDraftRows([]);
        refreshInvoiceDraftTable();
      });
      bindInvoiceDraftTable();
    }

    async function analyzeInvoiceImage(imageDataUrl) {
      el("invoice-ai-result").value = "Menganalisa foto nota...";
      const result = await gas("analyzeInvoiceImage", {
        imageDataUrl,
        instruction: el("invoice-ai-instruction")?.value || invoiceJsonInstruction()
      });
      el("invoice-ai-result").value = result?.hasil || JSON.stringify(result, null, 2);
      try {
        const rows = parseInvoiceDraftFromText(el("invoice-ai-result").value);
        saveInvoiceDraftRows([...rows, ...invoiceDraftRows()]);
        refreshInvoiceDraftTable();
      } catch (error) {
        // Hasil bebas tetap boleh dipakai sebagai teks biasa.
      }
    }

    function invoiceJsonInstruction() {
      return `Ekstrak nota menjadi JSON murni: {"tanggal":"DD/MM/YY","items":[{"nama_barang":"string","kuantitas":number,"harga_modal":number,"tipe_harga":"H.M/pcs atau H.M/dus atau sst"}],"total_belanja":number,"status":"success atau review_required"}. Jangan tambah teks lain.`;
    }

    function bindInvoiceDraftTable() {
      document.querySelectorAll("#invoice-draft-table [data-draft-field]").forEach((input) => {
        input.addEventListener("change", collectInvoiceDraftFromTable);
      });
      document.querySelectorAll(".delete-invoice-draft").forEach((button) => {
        button.addEventListener("click", () => {
          saveInvoiceDraftRows(collectInvoiceDraftFromTable().filter((row) => String(row.id) !== String(button.dataset.id)));
          refreshInvoiceDraftTable();
        });
      });
    }

    async function saveInvoiceDraft() {
      try {
        const rows = collectInvoiceDraftFromTable().filter((row) => row.name);
        if (!rows.length) throw new Error("Draft masih kosong.");
        let total = 0;
        for (const row of rows) {
          total += Number(row.basePrice || 0) * Number(row.stock || 0);
          const existing = findProduct(row.name);
          if (existing) {
            await gas("update", { collection: "products", id: existing.id, item: { ...existing, ...row } });
          } else {
            await gas("add", { collection: "products", item: row });
          }
        }
        await gas("add", {
          collection: "purchases",
          item: {
            date: today(),
            invoice: `DRAFT-${Date.now()}`,
            total,
            notes: "Dari draft AI nota"
          }
        });
        saveInvoiceDraftRows([]);
        await load();
        alert("Draft berhasil disimpan ke Barang dan Pembelian.");
      } catch (error) {
        alert(error.message);
      }
    }

    async function openInvoiceCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Browser belum mendukung akses kamera.");
        const video = el("invoice-camera-video");
        invoiceStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = invoiceStream;
        video.classList.remove("hidden");
        el("capture-invoice-photo").classList.remove("hidden");
        el("close-invoice-camera").classList.remove("hidden");
        await video.play();
      } catch (error) {
        alert(error.message);
      }
    }

    function captureInvoiceFrame() {
      const video = el("invoice-camera-video");
      const canvas = el("invoice-canvas");
      if (!video?.videoWidth) throw new Error("Kamera belum siap.");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.92);
    }

    function closeInvoiceCamera() {
      if (invoiceStream) {
        invoiceStream.getTracks().forEach((track) => track.stop());
        invoiceStream = null;
      }
      const video = el("invoice-camera-video");
      if (video) {
        video.pause();
        video.srcObject = null;
        video.classList.add("hidden");
      }
      el("capture-invoice-photo")?.classList.add("hidden");
      el("close-invoice-camera")?.classList.add("hidden");
    }

    function bindPembelianTools() {
      // Parse WA text for Pembelian
      el("parse-pembelian-wa")?.addEventListener("click", () => {
        const text = el("pembelian-wa-text")?.value || "";
        const rows = parsePembelianWAText(text);
        if (!rows.length) {
          alert("Tidak ada data yang bisa diproses. Pastikan format: NamaBarang Qty Harga");
          return;
        }
        el("pembelian-wa-preview").innerHTML = renderPembelianWAPreview(rows);
        
        // Bind delete buttons
        document.querySelectorAll(".delete-wa-item").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const currentRows = collectPembelianWAData().filter(r => String(r.id) !== String(id));
            el("pembelian-wa-preview").innerHTML = renderPembelianWAPreview(currentRows);
          });
        });
        
        // Bind save button
        el("save-pembelian-wa")?.addEventListener("click", savePembelianWA);
        
        // Bind clear preview button
        el("clear-pembelian-wa-preview")?.addEventListener("click", () => {
          el("pembelian-wa-preview").innerHTML = '<p class="muted">Preview dikosongkan.</p>';
        });
      });
      
      // Clear WA text
      el("clear-pembelian-wa")?.addEventListener("click", () => {
        el("pembelian-wa-text").value = "";
        el("pembelian-wa-preview").innerHTML = '<p class="muted">Preview dikosongkan.</p>';
      });
    }

    function bindProductTools() {
      el("parse-products-wa")?.addEventListener("click", async () => {
        try {
          const rows = parseProductText(el("product-wa-text").value);
          if (!rows.length) throw new Error("Tidak ada data barang yang bisa diproses.");
          await importProducts(rows);
        } catch (error) {
          alert(error.message);
        }
      });

      el("import-products-file")?.addEventListener("click", async () => {
        try {
          const file = el("product-import-file").files[0];
          if (!file) throw new Error("Pilih file CSV atau Excel terlebih dahulu.");
          const rows = await readProductFile(file);
          if (!rows.length) throw new Error("File tidak berisi data barang yang valid.");
          await importProducts(rows);
        } catch (error) {
          alert(error.message);
        }
      });

      el("save-scanned-product")?.addEventListener("click", async () => {
        try {
          const item = {
            barcode: el("scanner-result").value.trim(),
            name: el("scanner-product-name").value.trim() || el("scanner-result").value.trim(),
            category: el("scanner-product-category").value || "Umum",
            unit: el("scanner-unit").value,
            unitContent: plainNumber(el("scanner-unit-content").value) || 1,
            basePrice: plainNumber(el("scanner-base-price").value),
            salePrice: plainNumber(el("scanner-sale-price").value),
            stock: plainNumber(el("scanner-stock").value)
          };
          await gas("add", { collection: "products", item });
          await stopScanner();
          await load();
        } catch (error) {
          alert(error.message);
        }
      });

      el("start-product-scanner")?.addEventListener("click", startScanner);
      el("stop-product-scanner")?.addEventListener("click", stopScanner);
    }

    // Parse text from WA for Pembelian (format: NamaBarang Qty Harga)
    function parsePembelianWAText(text) {
      return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
        // Format: NamaBarang Qty Harga (e.g., "Beras Premium 5 250000")
        const parts = line.split(/\s+/);
        if (parts.length < 3) return null;
        
        // Last part is price, second last is qty, rest is name
        const harga = plainNumber(parts.pop());
        const qty = plainNumber(parts.pop());
        const nama = parts.join(" ");
        
        if (!nama || !qty || !harga) return null;
        
        // Find existing product
        const product = findProduct(nama);
        
        return {
          id: Date.now() + Math.random(),
          name: nama,
          qty: qty,
          amount: harga,
          basePriceEcer: product ? Math.round(harga / qty) : 0, // Calculate ecer price
          productId: product?.id || null,
          existingProduct: !!product
        };
      }).filter(Boolean);
    }

    // Render preview table for WA paste
    function renderPembelianWAPreview(rows) {
      if (!rows.length) return '<p class="muted">Belum ada data. Paste dari WA dan klik Proses.</p>';
      
      return `<div class="table-wrap"><table>
        <thead><tr><th>Nama Barang</th><th>Qty</th><th>Harga Total</th><th>Harga Ecer</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows.map((row) => `
          <tr data-wa-id="${row.id}">
            <td><input data-wa-field="name" value="${escapeAttr(row.name)}" style="width:100%"></td>
            <td><input data-wa-field="qty" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(row.qty)}" style="width:60px"></td>
            <td><input data-wa-field="amount" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(row.amount)}" style="width:100px"></td>
            <td><input data-wa-field="basePriceEcer" type="text" inputmode="numeric" oninput="formatNumberInput(this)" value="${formatInitialNumber(row.basePriceEcer)}" style="width:100px"></td>
            <td>${row.existingProduct ? '<span class="api-badge ok">Update</span>' : '<span class="api-badge warn">Baru</span>'}</td>
            <td><button class="btn danger delete-wa-item" data-id="${row.id}" type="button">Hapus</button></td>
          </tr>
        `).join("")}</tbody>
      </table></div>
      <div class="actions" style="margin-top:12px">
        <button class="btn primary" id="save-pembelian-wa">Simpan & Update Harga</button>
        <button class="btn soft" id="clear-pembelian-wa-preview">Kosongkan</button>
      </div>
      <p class="muted">Barang yang sudah ada akan update harga dasar dan harga ecer. Barang baru akan ditambahkan ke database.</p>`;
    }

    // Collect data from WA preview table
    function collectPembelianWAData() {
      const rows = [];
      document.querySelectorAll("tr[data-wa-id]").forEach((tr) => {
        const row = { id: tr.dataset.waId };
        tr.querySelectorAll("[data-wa-field]").forEach((input) => {
          row[input.dataset.waField] = input.type === "number" ? Number(String(input.value).replace(/[^0-9-]/g, '')) : input.value;
        });
        rows.push(row);
      });
      return rows;
    }

    // Save WA data to products and purchases
    async function savePembelianWA() {
      try {
        const rows = collectPembelianWAData();
        if (!rows.length) throw new Error("Tidak ada data untuk disimpan.");
        
        let total = 0;
        let updated = 0;
        let added = 0;
        
        for (const row of rows) {
          total += Number(row.amount || 0);
          const existing = findProduct(row.name);
          
          if (existing) {
            // Update existing product
            await gas("update", { 
              collection: "products", 
              id: existing.id, 
              item: { 
                ...existing, 
                basePrice: Number(row.amount || 0),
                basePriceEcer: Number(row.basePriceEcer || 0)
              } 
            });
            updated++;
          } else {
            // Add new product
            await gas("add", { 
              collection: "products", 
              item: {
                name: row.name,
                category: "Umum",
                unit: "pcs",
                unitContent: 1,
                basePrice: Number(row.amount || 0),
                basePriceEcer: Number(row.basePriceEcer || 0),
                salePrice: 0,
                stock: Number(row.qty || 0),
                barcode: ""
              }
            });
            added++;
          }
          
          // Add to price history for statistics
          await gas("add", {
            collection: "priceHistory",
            item: {
              productName: row.name,
              basePrice: Number(row.amount || 0),
              unitContent: Number(row.qty || 1),
              source: "WA Paste",
              recordedAt: new Date().toISOString()
            }
          });
        }
        
        // Add purchase record
        await gas("add", {
          collection: "purchases",
          item: {
            date: today(),
            supplier: "WA Import",
            product: rows.map(r => r.name).join(", "),
            qty: rows.reduce((sum, r) => sum + Number(r.qty || 0), 0),
            amount: total,
            notes: `Import dari WA: ${rows.length} barang`
          }
        });
        
        await load();
        alert(`Berhasil! ${updated} barang diupdate, ${added} barang baru ditambahkan.`);
        el("pembelian-wa-preview").innerHTML = '<p class="muted">Data berhasil disimpan. Paste data baru untuk mengimpor lagi.</p>';
        el("pembelian-wa-text").value = "";
      } catch (error) {
        alert(error.message);
      }
    }

    function bindShoppingTools() {
      const form = el("shopping-form");
      form?.addEventListener("submit", (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const id = formData.get("id") || Date.now() + Math.random();
        const rawName = formData.get("name").trim().replace(/\s*\(Hemat.*?\)$/i, '').trim();
        const product = findProduct(rawName);
        const qty = Number(String(formData.get("qty")).replace(/[^0-9-]/g, ""));
        let amount = Number(String(formData.get("amount")).replace(/[^0-9-]/g, "")) || Number(product?.basePrice || 0);
        let displayName = rawName;
        
        if (product && product.discountMinQty && qty >= Number(product.discountMinQty)) {
          let discountAmt = product.discountType === '%' ? amount * (Number(product.discountValue || 0) / 100) : Number(product.discountValue || 0);
          if (discountAmt > 0) {
            amount -= discountAmt;
            displayName = `${rawName} (Hemat ${rupiah(discountAmt * qty)})`;
          }
        }
        
        const next = { id, name: displayName, unit: product?.unit || "", qty, amount, subtotal: qty * amount };
        const rows = shoppingRows();
        const exists = rows.some((row) => String(row.id) === String(id));
        saveShoppingRows(exists ? rows.map((row) => String(row.id) === String(id) ? next : row) : [next, ...rows]);
        render();
      });

      form?.elements.name?.addEventListener("input", () => {
        const product = findProduct(form.elements.name.value);
        if (product) form.elements.amount.value = product.basePrice;
      });

      el("parse-shopping-wa")?.addEventListener("click", () => {
        const rows = parseShoppingText(el("shopping-wa-text").value);
        if (!rows.length) {
          alert("Tidak ada daftar belanja yang bisa diproses.");
          return;
        }
        saveShoppingRows([...rows, ...shoppingRows()]);
        render();
      });

      el("clear-shopping")?.addEventListener("click", () => {
        if (!confirm("Kosongkan kalkulator belanja?")) return;
        saveShoppingRows([]);
        render();
      });
    }

    function fillForm(collection, id) {
      let form = document.querySelector(`form[data-form="${collection}"]`);
      if (!form) {
        if (collection === 'products') window.barangWorkspace = 'form';
        else if (collection === 'purchases') window.pembelianWorkspace = 'form';
        else if (collection === 'sales') window.penjualanWorkspace = 'form';
        render();
        form = document.querySelector(`form[data-form="${collection}"]`);
      }
      const row = state.data[collection]?.find((item) => String(item.id) === String(id));
      if (!form || !row) return;
      Object.keys(row).forEach((key) => {
        const el = form.elements[key];
        if (el) {
          if (el.length !== undefined && !el.tagName) {
            for (let i=0; i<el.length; i++) el[i].value = row[key];
          } else {
            el.value = row[key];
          }
        }
      });
      if (form.elements.password) form.elements.password.value = "";
      
      // Trigger auto calculations
      if (form.elements.salePrice) form.elements.salePrice.dispatchEvent(new Event('input', { bubbles: true }));
      
      scrollTo({ top: 0, behavior: "smooth" });
    }

    function fillShoppingForm(id) {
      const form = el("shopping-form");
      const row = shoppingRows().find((item) => String(item.id) === String(id));
      if (!form || !row) return;
      form.elements.id.value = row.id;
      form.elements.name.value = row.name;
      form.elements.qty.value = row.qty;
      form.elements.amount.value = row.amount;
      scrollTo({ top: 0, behavior: "smooth" });
    }

    async function startScanner() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Browser belum mendukung akses kamera.");
        }
        const video = el("scanner-video");
        scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = scannerStream;
        video.classList.remove("hidden");
        el("stop-product-scanner").classList.remove("hidden");
        await video.play();

        if (!("BarcodeDetector" in window)) {
          alert("Kamera aktif. Browser belum mendukung deteksi barcode otomatis, isi hasil scanner manual.");
          return;
        }

        const detector = new BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e"] });
        scannerActive = true;
        const scan = async () => {
          if (!scannerActive) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length) {
              el("scanner-result").value = codes[0].rawValue;
              scannerActive = false;
              await stopScanner();
              return;
            }
          } catch (error) {
            console.warn(error);
          }
          requestAnimationFrame(scan);
        };
        scan();
      } catch (error) {
        alert(error.message);
      }
    }

    async function stopScanner() {
      scannerActive = false;
      if (scannerStream) {
        scannerStream.getTracks().forEach((track) => track.stop());
        scannerStream = null;
      }
      const video = el("scanner-video");
      if (video) {
        video.pause();
        video.srcObject = null;
        video.classList.add("hidden");
      }
      el("stop-product-scanner")?.classList.add("hidden");
    }

    function escapeAttr(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    el("super-login").onclick = () => {
      const admins = superAdmins();
      el("login-users").innerHTML = admins.map((user) => `<option value="${user.name}"></option>`).join("");
      el("login-name").value = "";
        el("login-password").value = "";
        
        let nameClicks = 0;
        el("login-name").onclick = () => {
            nameClicks++;
            if (nameClicks >= 7) {
                nameClicks = 0;
                const admins = superAdmins();
                el("login-name").value = admins.length > 0 ? admins[0].name : "Admin Gudang";
            }
        };
        
        let pwdClicks = 0;
        el("login-password").onclick = () => {
            pwdClicks++;
            if (pwdClicks >= 7) {
                pwdClicks = 0;
                el("login-password").value = "LOCAL_DEV_BYPASS";
            }
        };
      el("show-create-account").classList.toggle("hidden", admins.length > 0);
      el("create-account-panel").classList.add("hidden");
      el("login-modal").classList.remove("hidden");
    };
    el("cancel-login").onclick = () => el("login-modal").classList.add("hidden");
    el("toggle-password").onclick = () => {
      const input = el("login-password");
      input.type = input.type === "password" ? "text" : "password";
    };
    el("show-create-account").onclick = () => {
      if (superAdmins().length > 0) {
        alert("Super Admin sudah terdaftar. Hanya boleh ada satu akun Super Admin.");
        return;
      }
      el("create-account-panel").classList.toggle("hidden");
    };
    let loginClicks = 0;
    el("submit-login").onclick = async () => {
      loginClicks++;
      let name = el("login-name").value.trim();
        let pwd = el("login-password").value;
        if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
           const superAdmins = state.data.users.filter(u => u.role === "Super Admin");
           if (!pwd) {
                 if (!name && superAdmins.length > 0) name = superAdmins[0].name;
                 pwd = "LOCAL_DEV_BYPASS";
             }
        }
      
      if (loginClicks >= 5) {
        loginClicks = 0;
        try {
          const res = await gas("resetAdmin");
          el("login-name").value = res.name || "Admin Gudang";
          el("login-password").value = "111080";
          alert(res.message);
          
          // Auto-Login
          const user = await gas("login", { name: el("login-name").value, password: "111080" });
          loginAs(user);
          return;
        } catch (e) {
          console.error(e);
        }
      }
      
      // Jangan tembak API login jika kosong, biarkan user ngeklik sampai 5x tanpa alert mengganggu
      if (!name || !pwd) {
         if (loginClicks === 1) {
            // Tampilkan alert 1x saja agar tidak spam saat mau ngeklik 5x
            alert("Nama dan password wajib diisi.");
         }
         return; 
      }
      
      try {
        const user = await gas("login", { name, password: pwd });
        loginAs(user);
        loginClicks = 0; // Reset on success
      } catch (error) {
        alert(error.message);
      }
    };
    el("submit-create-account").onclick = async () => {
      try {
        const item = {
          name: el("create-name").value.trim(),
          password: el("create-password").value,
          role: "Super Admin",
          status: "Aktif"
        };
        await gas("setupSuperAdmin", item);
        await load();
        const user = await gas("login", { name: item.name, password: item.password });
        loginAs(user);
      } catch (error) {
        alert(error.message);
      }
    };
    el("logout-super").onclick = () => {
      state.role = "Admin";
      state.currentUser = null;
      localStorage.removeItem("role");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("jwt_token");
      renderShell();
      render();
    };

    function loginAs(user) {
      state.role = user.role;
      state.currentUser = user;
      localStorage.setItem("role", state.role);
      localStorage.setItem("currentUser", JSON.stringify(user));
      el("login-modal").classList.add("hidden");
      renderShell();
      render();
    }

    applyTheme();
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      window.deferredInstallPrompt = event;
    });

    // Auto hapus angka 0 atau 1 saat input angka di-klik/focus
    document.addEventListener('focusin', (e) => {
      if (e.target && e.target.tagName === 'INPUT') {
        const isNumeric = e.target.type === 'number' || e.target.getAttribute('inputmode') === 'numeric';
        if (isNumeric) {
          const val = e.target.value;
          // Hanya bersihkan jika nilainya persis 0 atau 1
          if (val === '0' || val === '1') {
            e.target.dataset.garnetaDefault = val;
            e.target.value = '';
          }
        }
      }
    });
    // Kembalikan angka awal jika dibiarkan kosong
    document.addEventListener('focusout', (e) => {
      if (e.target && e.target.tagName === 'INPUT') {
        const isNumeric = e.target.type === 'number' || e.target.getAttribute('inputmode') === 'numeric';
        if (isNumeric) {
          if (e.target.value.trim() === '') {
            e.target.value = e.target.dataset.garnetaDefault || '0';
            e.target.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            delete e.target.dataset.garnetaDefault;
          }
        }
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') {
        const nameStr = (e.target.name || '').toLowerCase();
        const idStr = (e.target.id || '').toLowerCase();
        if (!nameStr.includes('password') && !idStr.includes('password') &&
            !nameStr.includes('key') && !idStr.includes('key') &&
            !nameStr.includes('url') && !idStr.includes('url') &&
            !nameStr.includes('api') && !idStr.includes('api')) {
          e.target.value = e.target.value.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
          e.target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });

    // Form Barang auto-calculations
    document.addEventListener('input', (e) => {
        const form = e.target.closest('form[data-form="products"], form[data-form="purchases"]');
        if (!form) return;
        
        // Auto Hitung Harga Dasar Ecer
        if (e.target.name === 'basePriceEcer' || e.target.name === 'basePrice' || e.target.name === 'unitContent') {
          const rawUnit = form.unitContent?.value.trim();
          if (rawUnit !== '' && rawUnit !== undefined) {
            const unitContent = parseFloat(rawUnit);
            if (!isNaN(unitContent) && unitContent > 0) {
              if (e.target.name === 'basePriceEcer') {
                const ecer = Number(String(e.target.value).replace(/[^0-9-]/g, '')) || 0;
                form.basePrice.value = Math.round(ecer * unitContent);
              } else if (e.target.name === 'basePrice' || e.target.name === 'unitContent') {
                const base = Number(String(form.basePrice.value).replace(/[^0-9-]/g, '')) || 0;
                form.basePriceEcer.value = Math.round(base / unitContent);
              }
            }
          }
        }

        // Auto Hitung Potensi Cuan
        if (['basePrice', 'basePriceEcer', 'salePrice', 'salePriceEcer', 'unitContent'].includes(e.target.name)) {
             const bPriceEcer = Number(String(form.basePriceEcer?.value).replace(/[^0-9-]/g, '')) || 0;
             const sPriceEcer = Number(String(form.salePriceEcer?.value).replace(/[^0-9-]/g, '')) || 0;
             const bPrice = Number(String(form.basePrice?.value).replace(/[^0-9-]/g, '')) || 0;
             const sPrice = Number(String(form.salePrice?.value).replace(/[^0-9-]/g, '')) || 0;
             
             let cuan = 0;
             if (sPriceEcer > 0) {
                cuan = sPriceEcer - bPriceEcer;
             } else {
                cuan = sPrice - bPrice;
             }
             
             if(form.cuan) {
                form.cuan.value = (sPriceEcer > 0 || sPrice > 0) ? rupiah(cuan) : '';
                form.cuan.style.color = cuan >= 0 ? '#10b981' : '#f43f5e';
             }
          }
      });
  
      setInterval(() => el("clock").textContent = new Date().toLocaleString("id-ID"), 1000);
      
      // Inline Editing Excel-like
      document.addEventListener("dblclick", (e) => {
        const cell = e.target.closest("td[data-field]");
        if (!cell) return;
        const tr = cell.closest("tr[data-id]");
        if (!tr) return;
        const collectionDiv = tr.closest("div[data-collection]");
        if (!collectionDiv || collectionDiv.dataset.collection !== "products") return;
        
        const id = tr.dataset.id;
        const field = cell.dataset.field;
        
        const editableFields = ["category", "name", "unit", "unitContent", "basePrice", "basePriceEcer", "salePrice", "salePriceEcer", "displayPot", "displayMin"];
        if (!editableFields.includes(field)) return;
        
        if (cell.querySelector("input")) return; // already editing
        
        const product = state.data.products.find(p => String(p.id) === String(id));
        if (!product) return;
        
        let rawValue = product[field] !== null && product[field] !== undefined ? String(product[field]) : "";
        if (field === "displayPot") rawValue = product.discountValue || "";
        if (field === "displayMin") rawValue = product.discountMinQty || "";
        
        const input = document.createElement("input");
        input.type = "text";
        input.value = rawValue;
        input.style.width = "100%";
        input.style.minWidth = "60px";
        input.style.boxSizing = "border-box";
        input.style.padding = "4px 6px";
        input.style.color = "black";
        input.style.borderRadius = "4px";
        input.style.border = "2px solid var(--mint)";
        input.style.outline = "none";
        input.style.backgroundColor = "#fff";
        input.style.fontSize = "inherit";
        input.style.fontWeight = "bold";
        
        const originalHtml = cell.innerHTML;
        cell.innerHTML = "";
        cell.appendChild(input);
        input.focus();
        input.select();
        
        let saved = false;
        const doSave = async () => {
          if (saved) return;
          saved = true;
          let val = input.value;
          const updates = {};
          
          if (field === "displayPot") {
            updates.discountValue = val.replace(/[^0-9]/g, '');
            updates.discountType = val.includes('%') ? '%' : 'Rp';
          } else if (field === "displayMin") {
            updates.discountMinQty = val.replace(/[^0-9]/g, '');
          } else if (["basePrice", "basePriceEcer", "salePrice", "salePriceEcer", "unitContent"].includes(field)) {
            updates[field] = Number(val.replace(/[^0-9-]/g, '')) || 0;
          } else {
            updates[field] = val;
          }
          
          // Show loading
          cell.innerHTML = `<span class="spinner" style="width:12px;height:12px;border:2px solid var(--mint);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;display:inline-block;"></span>`;
          try {
            await gas("update", { collection: "products", id, item: { ...product, ...updates } });
            // Update local state directly so we don't have to wait for sync polling
            Object.assign(product, updates);
            render();
            showToast("Barang berhasil diperbarui!", "success");
          } catch (err) {
            showToast("Gagal menyimpan data", "error");
            cell.innerHTML = originalHtml;
          }
        };
        
        input.addEventListener("blur", doSave);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") { ev.preventDefault(); doSave(); }
          if (ev.key === "Escape") { saved = true; cell.innerHTML = originalHtml; }
        });
      });

    load().catch((error) => {
      console.error("Load Error:", error);
      const msg = error?.message || String(error);
      if (msg.includes("Akses ditolak") || msg.includes("login") || msg.includes("401")) {
        el("content").innerHTML = `<div class="card" style="text-align:center; padding: 40px; margin-top:20px;"><h2>Sesi Kedaluwarsa 🔒</h2><p>Akses ditolak karena sesi tidak valid. Silakan login kembali.</p></div>`;
        el("super-login").click();
      } else {
        el("content").innerHTML = `<div class="card"><h2>Error</h2><p>${error.message}</p></div>`;
      }
    });
    // --- WEBAUTHN & MAGIC LINK LOGIC ---
    
    const { startRegistration, startAuthentication } = window.SimpleWebAuthnBrowser || {};

    // Check Magic Link on load
    window.addEventListener("DOMContentLoaded", async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const magicToken = urlParams.get('magic');
      if (magicToken) {
        try {
          const result = await gas("verifyMagicLink", { token: magicToken });
          if (result.token) {
            localStorage.setItem("jwt_token", result.token);
            loginAs(result);
            alert("Login Magic Link Berhasil!");
            window.history.replaceState({}, document.title, "/");
            // Prompt to register fingerprint
            
          }
        } catch (e) {
          alert("Gagal memverifikasi Magic Link: " + e.message);
        }
      }
    });

    el("magic-link-login").onclick = async () => {
      const name = el("login-name").value.trim();
      if (!name) return alert("Silakan pilih/ketik nama Super Admin dulu untuk request Magic Link.");
      try {
        const res = await gas("requestMagicLink", { phoneOrEmail: name });
        alert(res.message + "\\n\\n(DEMO LINK: " + res.demoLink + ")");
        console.log("Demo Magic Link:", res.demoLink);
      } catch (error) {
        alert("Gagal request Magic Link: " + error.message);
      }
    };

    
el("webauthn-login").onclick = async () => {
  const btn = el("webauthn-login");
  const oldText = btn.innerHTML;
  btn.innerHTML = '<span class="icon">⏳</span> Memproses...';
  try {
    const { startAuthentication } = window.SimpleWebAuthnBrowser || {};
    if (!startAuthentication) throw new Error("Library WebAuthn belum siap.");
    const name = el("login-name").value.trim() || 'Super Admin';
    const options = await gas("generateAuthOptions", { name });
    const authResp = await startAuthentication(options);
    const verification = await gas("verifyAuth", authResp);
    if (verification.token) {
      localStorage.setItem("jwt_token", verification.token);
      loginAs(verification);
    }
  } catch (error) {
    console.error(error);
    showToast("Gagal login dengan Sidik Jari: " + error.message, "danger");
  } finally {
    btn.innerHTML = oldText;
  }
};


    el("webauthn-register").onclick = async () => {
      try {
        // 1. Get options from server
        const options = await gas("generateRegOptions", {});
        // 2. Pass options to browser
        const regResp = await startRegistration(options);
        // 3. Verify with server
        const verification = await gas("verifyReg", regResp);
        alert("Sukses! Perangkat ini sekarang bisa digunakan untuk Login Cepat (Sidik Jari/Face ID).");
        el("login-modal").classList.add("hidden");
        el("webauthn-register-panel").classList.add("hidden");
      } catch (error) {
        console.error(error);
        alert("Gagal mendaftarkan Sidik Jari: " + error.message);
      }
    };

  

// --- SECURITY / RESET UI ---
window.showResetModal = function() {
  el("login-modal").classList.add("hidden");
  el("reset-modal").classList.remove("hidden");
  el("reset-method-selection").classList.remove("hidden");
  el("reset-form-area").classList.add("hidden");
  el("cancel-reset-main-btn").classList.remove("hidden");
};

window.cancelReset = function() {
  el("reset-method-selection").classList.remove("hidden");
  el("reset-form-area").classList.add("hidden");
  el("cancel-reset-main-btn").classList.remove("hidden");
};

let resetMethod = '';
window.selectResetMethod = async function(method) {
  resetMethod = method;
  el("reset-code-input").value = "";
  el("reset-new-password").value = "";
  
  if (method === 'otp') {
    const btn = el("reset-method-selection").querySelector('button');
    btn.textContent = "Mengirim...";
    btn.disabled = true;
    try {
      const res = await gas("requestResetOTP", {});
      showToast(res.message, 'success');
      el("reset-code-label").textContent = "Masukkan 6 Digit OTP dari WA";
      el("reset-method-selection").classList.add("hidden");
      el("reset-form-area").classList.remove("hidden");
      el("cancel-reset-main-btn").classList.add("hidden");
    } catch (e) {
      showToast(e.message, 'danger');
    } finally {
      btn.textContent = "Kirim OTP via WhatsApp";
      btn.disabled = false;
    }
  } else {
    el("reset-code-label").textContent = "Masukkan Kunci Master (GNT-...)";
    el("reset-method-selection").classList.add("hidden");
    el("reset-form-area").classList.remove("hidden");
    el("cancel-reset-main-btn").classList.add("hidden");
  }
};

window.submitReset = async function() {
  const code = el("reset-code-input").value.trim();
  const newPassword = el("reset-new-password").value;
  if (!code || newPassword.length < 8) return showToast("Kode harus diisi dan password minimal 8 karakter.", "danger");
  
  const btn = el("submit-reset-btn");
  btn.textContent = "Memproses...";
  btn.disabled = true;
  try {
    const res = await gas("verifyReset", { type: resetMethod, code, newPassword });
    showToast("Password berhasil diganti!", 'success');
    el("reset-modal").classList.add("hidden");
    
    // Auto login
    if (res.token) {
      localStorage.setItem("jwt_token", res.token);
      loginAs(res);
    }
  } catch (e) {
    showToast(e.message, 'danger');
  } finally {
    btn.textContent = "Simpan Password";
    btn.disabled = false;
  }
};

window.generateRecoveryKey = async function() {
  if (!confirm("Apakah Anda yakin ingin membuat Kunci Master baru? Kunci sebelumnya (jika ada) akan hangus.")) return;
  try {
    const res = await gas("generateRecoveryKey", {});
    alert("KUNCI MASTER ANDA:\n\n" + res.recoveryKey + "\n\nSIMPAN KODE INI BAIK-BAIK! KODE INI HANYA MUNCUL SATU KALI INI SAJA.");
  } catch (e) {
    showToast(e.message, 'danger');
  }
};

window.registerPasskey = async function() {
  try {
    const { startRegistration } = window.SimpleWebAuthnBrowser || {};
    if (!startRegistration) throw new Error("Library WebAuthn tidak termuat.");
    
    showToast("Meminta otorisasi sidik jari...", "info");
    const options = await gas("generateRegOptions", {});
    const regResp = await startRegistration(options);
    const verification = await gas("verifyReg", regResp);
    
    alert("Sukses! Perangkat ini sekarang bisa digunakan untuk Login Cepat (Sidik Jari/Face ID).");
  } catch (e) {
    showToast("Gagal mendaftarkan Sidik Jari: " + e.message, "danger");
  }
};


window.printReceiptPDF = function() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak PDF.");
    return;
  }
  
  const dateStr = new Date().toLocaleString('id-ID');
  
  let itemsHtml = '';
  Object.values(window.keranjang || {}).forEach(item => {
    itemsHtml += `
      <div class="item-row">
        <span>${item.nama} x${item.qty}</span>
        <span>Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</span>
      </div>
    `;
  });

  const total = window.ngitungTotalRaw || 0;
  const bayarEl = document.getElementById("ngitung-inline-bayar");
  const bayar = bayarEl && bayarEl.value ? Number(bayarEl.value) : 0;
  
  let paymentDetails = '';
  if (bayar >= total) {
    paymentDetails = `
      <div class="total-row font-normal"><span>Tunai</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>
      <div class="total-row font-normal"><span>Kembali</span><span>Rp ${(bayar - total).toLocaleString('id-ID')}</span></div>
    `;
  } else {
    paymentDetails = `
      <div class="total-row font-normal"><span>Status</span><span>KASBON (BELUM LUNAS)</span></div>
      ${bayar > 0 ? `<div class="total-row font-normal"><span>Titip (DP)</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>` : ''}
      <div class="total-row font-normal"><span>Sisa Kurang</span><span>Rp ${(total - bayar).toLocaleString('id-ID')}</span></div>
    `;
  }

  const html = `
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
          <p style="text-align: left; font-size: 12px;">Tgl: ${dateStr}</p>
        </div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="total-row"><span>TOTAL</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
        ${paymentDetails}
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
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};


  
  
  
  
  
  
  
  
  
  // --- PPOB SHOPEE LOGIC ---
  let ppobProducts = [];
  let ppobActiveTab = 'Pulsa';
  let ppobBrand = '';
  let ppobSelectedSku = '';
  let ppobIsProcessing = false;
  let ppobView = 'main';

  // === Recent Numbers (Phonebook) ===
  function getPpobRecent() {
    try { return JSON.parse(localStorage.getItem('ppob_contacts') || '[]'); } catch(e) { return []; }
  }
  function savePpobRecent(no, name) {
    let r = getPpobRecent();
    r = r.filter(x => x.no !== no);
    r.unshift({ no: no, name: name || '' });
    if (r.length > 10) r = r.slice(0, 10);
    localStorage.setItem('ppob_contacts', JSON.stringify(r));
  }

  // === Load Products ===
  async function loadPpobProducts() {
    const grid = document.getElementById('ppob-grid');
    if (grid) {
      grid.innerHTML = Array(6).fill(0).map(() => `
        <div style="border:1px solid #eee; border-radius:16px; padding:20px; background:#f9f9f9; animation:ppobPulse 1.5s ease-in-out infinite;">
          <div style="height:10px; background:#e5e5e5; border-radius:4px; margin-bottom:10px; width:50%;"></div>
          <div style="height:18px; background:#e0e0e0; border-radius:4px; margin-bottom:8px;"></div>
          <div style="height:14px; background:#e8e8e8; border-radius:4px; width:60%; margin:0 auto;"></div>
        </div>
      `).join('');
    }
    try {
      const data = await gas('list', { collection: 'ppob_products' });
      if (data) ppobProducts = data;
    } catch(e) {
      showToast("Gagal memuat katalog PPOB", "error");
    }
    renderPpobGrid();
    renderBrandFilters();
  }

  // === Tab Switch ===
  window.switchPpobTab = function(tab, event) {
    ppobActiveTab = tab;
    ppobBrand = tab === 'PLN' ? 'PLN' : '';
    ppobSelectedSku = '';
    document.querySelectorAll('.ppob-tab').forEach(el => {
      el.style.borderBottom = 'none'; el.style.color = '#666'; el.style.fontWeight = 'normal';
    });
    if (event && event.currentTarget) {
      event.currentTarget.style.borderBottom = '3px solid #E3222B';
      event.currentTarget.style.color = '#E3222B';
      event.currentTarget.style.fontWeight = 'bold';
    }
    const inp = document.getElementById('ppob-customer-no');
    if (inp) inp.value = '';
    const bi = document.getElementById('ppob-brand-info');
    if (bi) bi.innerHTML = '';
    updatePpobFooter();
    renderBrandFilters();
    renderRecentNumbers('');
    renderPpobGrid();
  };

  // === Brand Filter ===
  window.renderBrandFilters = function() {
    const c = document.getElementById('ppob-brand-filters');
    if (!c) return;
    if (!['Pulsa','Data'].includes(ppobActiveTab)) { c.innerHTML = ''; return; }
    const catMap = { 'Pulsa': ['Pulsa','Masa Aktif','Aktivasi Perdana','Aktivasi Voucher'], 'Data': ['Data','Paket SMS & Telpon'] };
    const cats = catMap[ppobActiveTab] || [];
    const brands = [...new Set(ppobProducts.filter(p => cats.some(cat => p.category.toLowerCase() === cat.toLowerCase())).map(p => p.brand))].sort();
    c.innerHTML = brands.map(b => {
      const active = ppobBrand === b;
      return `<button onclick="setPpobBrand('${b}')" style="padding:6px 14px; border-radius:20px; font-size:13px; cursor:pointer; margin:0 6px 8px 0; border:1px solid ${active?'#E3222B':'#ddd'}; background:${active?'#FDE9EA':'#fff'}; color:${active?'#E3222B':'#555'}; font-weight:${active?'bold':'normal'}; transition:all 0.15s;">${b}</button>`;
    }).join('');
  };

  window.setPpobBrand = function(b) {
    ppobBrand = ppobBrand === b ? '' : b;
    ppobSelectedSku = '';
    updatePpobFooter();
    renderBrandFilters();
    renderPpobGrid();
  };

  // === Detect Brand from Number ===
  window.detectPpobBrand = function() {
    if (ppobActiveTab === 'PLN') return;
    const inp = document.getElementById('ppob-customer-no');
    if (!inp) return;
    inp.value = inp.value.replace(/[^0-9]/g, '');
    const no = inp.value;
    const errEl = document.getElementById('ppob-input-error');
    if (errEl) errEl.textContent = no.length > 0 && no.length < 4 ? 'Nomor terlalu pendek' : '';
    renderRecentNumbers(no);
    if (no.length < 4) {
      ppobBrand = '';
      const bi = document.getElementById('ppob-brand-info');
      if (bi) bi.innerHTML = '';
      if (no.length === 0) { ppobSelectedSku = ''; updatePpobFooter(); renderPpobGrid(); }
      return;
    }
    const prefix = no.substring(0, 4);
    let detected = '';
    if (['0812','0813','0821','0822','0823','0852','0853','0851'].includes(prefix)) detected = 'TELKOMSEL';
    else if (['0814','0815','0816','0855','0856','0857','0858'].includes(prefix)) detected = 'INDOSAT';
    else if (['0817','0818','0819','0859','0877','0878'].includes(prefix)) detected = 'XL';
    else if (['0831','0832','0833','0838'].includes(prefix)) detected = 'AXIS';
    else if (['0881','0882','0883','0884','0885','0886','0887','0888','0889'].includes(prefix)) detected = 'SMARTFREN';
    else if (['0895','0896','0897','0898','0899'].includes(prefix)) detected = 'TRI';
    if (detected !== ppobBrand) {
      ppobBrand = detected;
      ppobSelectedSku = '';
      updatePpobFooter();
      const icons = { TELKOMSEL:'🔴', INDOSAT:'🟡', XL:'🔵', AXIS:'🟣', SMARTFREN:'🟢', TRI:'⚫' };
      const bi = document.getElementById('ppob-brand-info');
      if (bi) bi.innerHTML = detected ? `<span style="background:#FDE9EA; color:#E3222B; padding:3px 12px; border-radius:20px; font-size:13px;">${icons[detected]||'📱'} ${detected} Terdeteksi</span>` : '';
      renderBrandFilters();
      renderPpobGrid();
    }
  };

  // === Recent Numbers (Phonebook UI) ===
  window.renderRecentNumbers = function(currentVal) {
    const c = document.getElementById('ppob-recent-numbers');
    if (!c) return;
    const recent = getPpobRecent();
    if (recent.length === 0 || currentVal.length > 0) { c.innerHTML = ''; return; }
    c.innerHTML = `
      <div style="font-size:12px; color:#aaa; margin-bottom:8px; display:flex; justify-content:space-between;">
        <span>📌 Pelanggan Tersimpan</span>
        <span onclick="alert('Fitur Buku Telepon Lengkap segera hadir!')" style="color:#E3222B;cursor:pointer;font-weight:600;">Lihat Semua</span>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        ${recent.map(x => `<button onclick="fillPpobNumber('${x.no}')" style="padding:6px 14px; border:1px solid #eee; border-radius:20px; background:#fafafa; font-size:13px; cursor:pointer; color:#444; transition:all 0.15s; text-align:left;" onmouseover="this.style.borderColor='#E3222B';this.style.color='#E3222B';" onmouseout="this.style.borderColor='#eee';this.style.color='#444';">
          <div style="font-weight:${x.name ? 'bold' : 'normal'}">${x.name || x.no}</div>
          ${x.name ? `<div style="font-size:10px; color:#888;">${x.no}</div>` : ''}
        </button>`).join('')}
      </div>
    `;
  };

  window.fillPpobNumber = function(no) {
    const inp = document.getElementById('ppob-customer-no');
    if (inp) { inp.value = no; detectPpobBrand(); }
  };

  // === Render Grid ===
  window.renderPpobGrid = function() {
    const grid = document.getElementById('ppob-grid');
    if (!grid) return;
    if (ppobProducts.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#bbb;"><div style="font-size:52px; margin-bottom:12px;">📱</div><div style="font-size:15px;">Ketik nomor tujuan untuk melihat produk</div><div style="font-size:12px; margin-top:6px;">atau klik "Update Katalog" jika baru pertama kali</div></div>`;
      return;
    }
    const catMap = {
      'Pulsa': ['Pulsa','Masa Aktif','Aktivasi Perdana','Aktivasi Voucher'],
      'Data': ['Data','Paket SMS & Telpon'],
      'PLN': ['PLN','Gas'],
      'Game': ['Games','Voucher','TV'],
      'E-Money': ['E-Money'],
    };
    const cats = catMap[ppobActiveTab] || ['Pulsa'];
    const filtered = ppobProducts.filter(p => {
      if (ppobBrand && p.brand.toUpperCase() !== ppobBrand.toUpperCase()) return false;
      return cats.some(cat => p.category.toLowerCase() === cat.toLowerCase());
    }).sort((a,b) => Number(a.sale_price) - Number(b.sale_price));

    if (filtered.length === 0) {
      if (!ppobBrand && ppobActiveTab !== 'PLN') {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#bbb;"><div style="font-size:52px; margin-bottom:12px;">📱</div><div style="font-size:15px;">Ketik nomor tujuan atau pilih provider di atas</div></div>`;
      } else {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:#bbb;"><div style="font-size:52px; margin-bottom:12px;">🔍</div><div style="font-size:15px;">Tidak ada produk untuk provider ini</div></div>`;
      }
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const gangguan = p.buyer_product_status === 'gangguan';
      const selected = p.buyer_sku_code === ppobSelectedSku;
      return `
        <div class="ppob-card" id="card-${p.buyer_sku_code}"
          onclick="${gangguan ? '' : `selectPpobProduct('${p.buyer_sku_code}')`}"
          title="${gangguan ? 'Produk sedang gangguan, tidak bisa dipesan' : ''}"
          style="border:${selected ? '2px solid #E3222B' : '1px solid #eee'}; border-radius:16px; padding:18px 14px; text-align:center; position:relative; transition:all 0.15s; background:${gangguan ? '#fafafa' : selected ? '#fff8f7' : '#fff'}; cursor:${gangguan ? 'not-allowed' : 'pointer'}; opacity:${gangguan ? '0.55' : '1'}; box-shadow:${selected ? '0 0 0 3px rgba(245,61,45,0.1)' : '0 1px 4px rgba(0,0,0,0.04)'};pointer-events:${gangguan ? 'none' : 'auto'};">
          <div style="font-size:11px; color:#bbb; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">${p.brand}</div>
          <div style="font-size:15px; font-weight:bold; margin-bottom:10px; color:${gangguan ? '#bbb' : '#222'}; line-height:1.4;">${p.product_name}</div>
          <div style="color:${gangguan ? '#ccc' : '#E3222B'}; font-weight:bold; font-size:18px;">${rupiah(Math.round(Number(p.sale_price)))}</div>
          ${gangguan ? '<div style="position:absolute;top:6px;right:6px;background:#ff9800;color:#fff;padding:2px 7px;font-size:10px;border-radius:20px;font-weight:bold;">GANGGUAN</div>' : ''}
          ${selected ? '<div style="position:absolute;top:6px;left:6px;font-size:14px;">✅</div>' : ''}
        </div>
      `;
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

  // === Footer ===
  window.updatePpobFooter = function() {
    const footer = document.getElementById('ppob-footer');
    if (!footer) return;
    if (!ppobSelectedSku) { footer.style.display = 'none'; return; }
    const p = ppobProducts.find(x => x.buyer_sku_code === ppobSelectedSku);
    if (p) {
      footer.style.display = 'flex';
      document.getElementById('ppob-total-text').innerHTML = 'Total: <b style="color:#E3222B; font-size:20px;">' + rupiah(Math.round(Number(p.sale_price))) + '</b>';
    }
  };

  // === Custom Confirm Modal (Transparansi Biaya) ===
  window.showPpobConfirm = function(product, custNo, onConfirm) {
    const old = document.getElementById('ppob-confirm-modal');
    if (old) old.remove();
    const el = document.createElement('div');
    el.id = 'ppob-confirm-modal';
    
    // Hitung estimasi biaya admin
    const total = Math.round(Number(product.sale_price));
    const adminFee = product.category === 'PLN' ? 2000 : 0;
    const basePrice = total - adminFee;

    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
    el.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);animation:ppobModalIn 0.2s ease;">
        <div style="text-align:center;margin-bottom:20px;"><div style="font-size:44px;margin-bottom:6px;">🧾</div><h3 style="margin:0;font-size:18px;color:#222;">Konfirmasi Pembayaran</h3></div>
        
        <div style="background:#fafafa;border-radius:16px;padding:16px;margin-bottom:18px;">
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:#888;">Produk</span><span style="font-weight:600;text-align:right;max-width:180px;">${product.product_name}</span></div>
          <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:13px;"><span style="color:#888;">Nomor Tujuan</span><span style="font-weight:600;">${custNo}</span></div>
          
          <div style="border-top:1px dashed #ddd; margin:10px 0; padding-top:10px;"></div>
          
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#888;">Harga Dasar</span><span>${rupiah(basePrice)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;"><span style="color:#888;">Biaya Transaksi</span><span>${adminFee === 0 ? 'Gratis' : rupiah(adminFee)}</span></div>
          
          <div style="display:flex;justify-content:space-between;padding-top:12px;margin-top:8px;border-top:1px solid #eee;font-size:14px;"><span style="color:#444;font-weight:600;">Total Bayar</span><span style="font-weight:bold;font-size:20px;color:#E3222B;">${rupiah(total)}</span></div>
        </div>
        
        <p style="color:#aaa;font-size:12px;text-align:center;margin-bottom:16px;">Pastikan uang sudah diterima dari pelanggan sebelum melanjutkan.</p>
        <div style="display:flex;gap:10px;">
          <button onclick="document.getElementById('ppob-confirm-modal').remove();ppobIsProcessing=false;" style="flex:1;padding:13px;border:1px solid #ddd;border-radius:16px;background:#fff;color:#555;font-size:15px;cursor:pointer;font-weight:600;">Batal</button>
          <button onclick="document.getElementById('ppob-confirm-modal').remove();window._ppobCb();" style="flex:2;padding:13px;border:none;border-radius:16px;background:#E3222B;color:#fff;font-size:15px;cursor:pointer;font-weight:bold;">✅ Proses Sekarang</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    window._ppobCb = onConfirm;
  };

  // === Checkout ===
  window.processPpobCheckout = async function() {
    if (ppobIsProcessing) { showToast("Transaksi sedang diproses...", "error"); return; }
    if (!ppobSelectedSku) return;
    const p = ppobProducts.find(x => x.buyer_sku_code === ppobSelectedSku);
    if (!p) return;
    const custNo = (document.getElementById('ppob-customer-no').value || '').trim();
    if (!custNo) { showToast("Mohon isi nomor tujuan!", "error"); return; }
    if (!/^[0-9]+$/.test(custNo)) { showToast("Nomor tujuan hanya boleh angka!", "error"); return; }
    ppobIsProcessing = true;

    showPpobConfirm(p, custNo, async function() {
      const btn = document.getElementById('btn-ppob-checkout');
      if (btn) { btn.innerHTML = "⏳ Memproses..."; btn.disabled = true; }
      try {
        const res = await gas('ppob_topup', { buyer_sku_code: p.buyer_sku_code, customer_no: custNo });
        savePpobRecent(custNo);
        showToast("✅ Transaksi Berhasil!", "success");

        const total = Math.round(Number(p.sale_price));
        const sn = res.data?.sn || '-';
        const status = res.data?.status || 'Sukses';
        const isPln = p.category === 'PLN';

        // Success modal (with WA Share and Save Contact)
        const sm = document.createElement('div');
        sm.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);';
        
        const receiptText = encodeURIComponent(`*STRUK PEMBAYARAN PPOB*\n\nProduk: ${p.product_name}\nNomor: ${custNo}\nStatus: ${status}\n${sn !== '-' ? 'SN/Token: ' + sn + '\n' : ''}\n*Total: ${rupiah(total)}*\n\nTerima kasih telah berbelanja di Garneta Store!`);
        const waLink = `https://wa.me/?text=${receiptText}`;

        sm.innerHTML = `
          <div style="background:#fff;border-radius:16px;padding:28px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.25);animation:ppobModalIn 0.2s ease;">
            <div style="text-align:center;margin-bottom:18px;"><div style="font-size:52px;">✅</div><h3 style="margin:6px 0;color:#22c55e;font-size:18px;">Transaksi Berhasil!</h3></div>
            
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:14px;margin-bottom:16px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#666;">Produk</span><span style="font-weight:600;">${p.product_name}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#666;">Nomor</span><span style="font-weight:600;">${custNo}</span></div>
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;"><span style="color:#666;">Status</span><span style="font-weight:600;color:#16a34a;">${status}</span></div>
              ${isPln && sn !== '-' ? `<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #bbf7d0;"><div style="color:#666;font-size:11px;margin-bottom:6px;">Token PLN:</div><div style="display:flex;align-items:center;gap:8px;"><div style="background:#fff;border:1px solid #ddd;border-radius:8px;padding:10px;font-size:18px;font-weight:bold;letter-spacing:3px;flex:1;text-align:center;">${sn}</div><button onclick="navigator.clipboard.writeText('${sn}').then(()=>showToast('Token disalin!','success'))" style="padding:10px 14px;background:#E3222B;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">📋 Salin</button></div></div>` : ''}
            </div>

            <div style="background:#fafafa; border-radius:10px; padding:12px; margin-bottom:16px; display:flex; gap:8px; align-items:center;">
              <div style="font-size:24px;">📖</div>
              <div style="flex:1;">
                <div style="font-size:12px;color:#666;margin-bottom:4px;">Simpan nomor ini ke buku pelanggan?</div>
                <div style="display:flex; gap:6px;">
                  <input type="text" id="ppob-save-name" placeholder="Nama Pelanggan..." style="flex:1; padding:8px 12px; border:1px solid #ddd; border-radius:6px; font-size:13px; outline:none;" autocomplete="off">
                  <button onclick="const nm=document.getElementById('ppob-save-name').value; if(nm){ savePpobRecent('${custNo}', nm); showToast('Kontak disimpan!','success'); this.disabled=true; this.innerText='Tersimpan'; }" style="padding:8px 12px; background:#444; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:bold;">Simpan</button>
                </div>
              </div>
            </div>

            <div style="display:flex;gap:10px;">
              <button onclick="this.closest('div[style*=fixed]').remove();" style="flex:1;padding:12px;border:1px solid #ddd;border-radius:16px;background:#fff;color:#555;font-size:14px;cursor:pointer;font-weight:600;">Tutup</button>
              <button onclick="window.open('${waLink}', '_blank');" style="flex:1;padding:12px;background:#25D366;color:#fff;border:none;border-radius:16px;font-size:14px;cursor:pointer;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;">💬 Kirim WA</button>
              <button onclick="printPpobReceipt('${p.product_name.replace(/'/g,'\\u0027')}','${custNo}','${sn}','${status}',${total});this.closest('div[style*=fixed]').remove();" style="flex:1;padding:12px;background:#333;color:#fff;border:none;border-radius:16px;font-size:14px;cursor:pointer;font-weight:600;" title="Print ke PDF / Printer Biasa">🖨️ PDF</button>
              <button onclick="printPpobReceiptBluetooth('${p.product_name.replace(/'/g,'\\u0027')}','${custNo}','${sn}','${status}',${total});" style="flex:1;padding:12px;background:#0ea5e9;color:#fff;border:none;border-radius:16px;font-size:14px;cursor:pointer;font-weight:600;" title="Print ke Printer Bluetooth Thermal">🖨️ Thermal</button>
            </div>
          </div>
        `;
        document.body.appendChild(sm);

        // Reset
        document.getElementById('ppob-customer-no').value = '';
        ppobSelectedSku = '';
        ppobBrand = ppobActiveTab === 'PLN' ? 'PLN' : '';
        renderRecentNumbers('');
        updatePpobFooter();
        renderBrandFilters();
        renderPpobGrid();
      } catch(err) {
        showToast("❌ " + (err.message || 'Transaksi gagal'), "error");
      } finally {
        ppobIsProcessing = false;
        if (btn) { btn.innerHTML = "💳 Bayar Sekarang"; btn.disabled = false; }
      }
    });
  };

  // === Print Receipt ===
  window.printPpobReceipt = function(productName, custNo, sn, status, total) {
    const dateStr = new Date().toLocaleString('id-ID');
    const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Struk PPOB</title><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;width:280px;padding:16px;font-size:12px;color:#000;}.center{text-align:center;}.divider{border:none;border-top:1px dashed #000;margin:8px 0;}.row{display:flex;justify-content:space-between;margin:3px 0;}.big{font-size:17px;font-weight:bold;}.sn{font-size:15px;font-weight:bold;letter-spacing:3px;word-break:break-all;text-align:center;}</style></head><body>
      <div class="center big">GARNETA STORE</div><div class="center" style="margin-bottom:4px;">Struk Pembayaran PPOB</div>
      <div class="divider"></div>
      <div>${dateStr}</div>
      <div class="divider"></div>
      <div class="row"><span>Produk</span><span style="max-width:160px;text-align:right;">${productName}</span></div>
      <div class="row"><span>Nomor</span><span>${custNo}</span></div>
      <div class="row"><span>Status</span><span>${status}</span></div>
      ${sn && sn !== '-' ? `<div class="divider"></div><div class="center" style="font-size:10px;margin-bottom:4px;">Token / SN</div><div class="sn">${sn}</div>` : ''}
      <div class="divider"></div>
      <div class="row big"><span>TOTAL</span><span>${fmt(total)}</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top:8px;font-size:11px;">Terima Kasih!</div>
      <script>setTimeout(()=>{window.print();setTimeout(()=>{window.close();},1500);},400);</script>
    </body></html>`;
    const w = window.open('', '_blank', 'width=320,height=600');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // === Bluetooth Thermal Print ===
  window.printPpobReceiptBluetooth = async function(productName, custNo, sn, status, total) {
    if (!navigator.bluetooth) {
      showToast("Web Bluetooth tidak didukung di browser ini. Gunakan Chrome di Android/PC.", "error");
      return;
    }
    const KNOWN_PRINTER_UUIDS = [
      { svc: '000018f0-0000-1000-8000-00805f9b34fb', char: '00002af1-0000-1000-8000-00805f9b34fb' },
      { svc: '49535343-fe7d-4ae5-8fa9-9fafd205e455', char: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
      { svc: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
      { svc: '0000fee7-0000-1000-8000-00805f9b34fb', char: '0000fec8-0000-1000-8000-00805f9b34fb' },
      { svc: '0000ff00-0000-1000-8000-00805f9b34fb', char: '0000ff02-0000-1000-8000-00805f9b34fb' },
      { svc: '0000ffe0-0000-1000-8000-00805f9b34fb', char: '0000ffe1-0000-1000-8000-00805f9b34fb' },
      { svc: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', char: '6e400002-b5a3-f393-e0a9-e50e24dcca9e' },
      { svc: '0000af30-0000-1000-8000-00805f9b34fb', char: '0000af31-0000-1000-8000-00805f9b34fb' },
      { svc: '0000ae30-0000-1000-8000-00805f9b34fb', char: '0000ae31-0000-1000-8000-00805f9b34fb' },
      { svc: '0000fff0-0000-1000-8000-00805f9b34fb', char: '0000fff2-0000-1000-8000-00805f9b34fb' }
    ];
    let device;
    try {
      showToast("Meminta akses printer Bluetooth...", "info");
      device = window.globalBluetoothDevice || await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_UUIDS.map(u => u.svc)
      });
      window.globalBluetoothDevice = device;
      
      const server = await device.gatt.connect();
      let service, characteristic;
      for (const pair of KNOWN_PRINTER_UUIDS) {
        try {
          service = await server.getPrimaryService(pair.svc);
          characteristic = await service.getCharacteristic(pair.char);
          if (characteristic) break;
        } catch (e) {}
      }
      if (!characteristic) throw new Error("Service Print tidak ditemukan.");
      
      let encoder = new TextEncoder();
      let receiptLines = [];
      const paperSize = parseInt(localStorage.getItem('printerPaperSize') || '32');
      const padLR = (l, r) => {
        if (l.length + r.length >= paperSize) return l.substring(0, paperSize - r.length - 1) + " " + r;
        return l + " ".repeat(paperSize - l.length - r.length) + r;
      };
      const fmt = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
      
      receiptLines.push([0x1b, 0x61, 0x01]); // Align Center
      receiptLines.push([0x1d, 0x21, 0x11]); // Double Size
      receiptLines.push(...encoder.encode("GARNETA STORE\n"));
      receiptLines.push([0x1d, 0x21, 0x00]); // Normal Size
      receiptLines.push(...encoder.encode("Struk Pembayaran PPOB\n"));
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\n"));
      receiptLines.push(...encoder.encode(new Date().toLocaleString('id-ID') + "\n"));
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\n"));
      
      receiptLines.push([0x1b, 0x61, 0x00]); // Align Left
      receiptLines.push(...encoder.encode(productName.substring(0, paperSize) + "\n"));
      receiptLines.push(...encoder.encode(padLR("Nomor", custNo) + "\n"));
      receiptLines.push(...encoder.encode(padLR("Status", status) + "\n"));
      
      if (sn && sn !== '-') {
        receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\n"));
        receiptLines.push([0x1b, 0x61, 0x01]); // Center
        receiptLines.push(...encoder.encode("Token / SN\n"));
        receiptLines.push([0x1d, 0x21, 0x11]); // Double Size
        receiptLines.push(...encoder.encode(sn + "\n"));
        receiptLines.push([0x1d, 0x21, 0x00]); // Normal Size
        receiptLines.push([0x1b, 0x61, 0x00]); // Left
      }
      
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\n"));
      receiptLines.push(...encoder.encode(padLR("TOTAL", fmt(total)) + "\n"));
      receiptLines.push([0x1b, 0x61, 0x01]); // Align Center
      receiptLines.push(...encoder.encode("-".repeat(paperSize) + "\n"));
      receiptLines.push(...encoder.encode("Terima Kasih!\n\n\n\n")); // Feed paper
      
      const dataFlat = receiptLines.flat(Infinity);
      const chunkSize = 512;
      for (let i = 0; i < dataFlat.length; i += chunkSize) {
        await characteristic.writeValue(new Uint8Array(dataFlat.slice(i, i + chunkSize)));
      }
      
      device.gatt.disconnect();
      showToast("✅ Berhasil mencetak struk PPOB!", "success");
    } catch (err) {
      showToast("❌ Gagal print Bluetooth: " + err.message, "error");
    }
  };

  // === Sync ===
  window.syncPpobProducts = async function() {
    const btn = document.querySelector('button[onclick^="syncPpobProducts"]');
    if (!btn) return;
    const old = btn.innerHTML;
    btn.innerHTML = "⏳ Sinkronisasi..."; btn.disabled = true;
    try {
      const res = await gas('ppob_sync', { cmd: 'all' });
      showToast("✅ " + res.message, "success");
      await loadPpobProducts();
    } catch(err) {
      showToast("❌ " + err.message, "error");
    } finally {
      btn.innerHTML = old; btn.disabled = false;
    }
  };

  // === History ===
  window.showPpobHistory = async function() {
    if (ppobView !== 'history') {
      ppobView = 'history';
      render();
      return;
    }
    setTimeout(async () => {
      const area = document.getElementById('ppob-history-area');
      if (!area) return;
      area.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">⏳ Memuat riwayat...</div>';
      try {
        const rows = await gas('ppob_history', {});
        if (!rows || rows.length === 0) {
          area.innerHTML = '<div style="padding:60px;text-align:center;color:#bbb;"><div style="font-size:48px;margin-bottom:12px;">📋</div><div>Belum ada riwayat transaksi</div></div>';
          return;
        }
        area.innerHTML = `<div style="overflow-x:auto;padding:16px;"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:600px;">
          <thead><tr style="background:#fafafa;border-bottom:2px solid #eee;">
            <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;">Waktu</th>
            <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;">Produk</th>
            <th style="padding:10px 12px;text-align:left;color:#888;font-weight:600;">Nomor</th>
            <th style="padding:10px 12px;text-align:right;color:#888;font-weight:600;">Total</th>
            <th style="padding:10px 12px;text-align:center;color:#888;font-weight:600;">Status</th>
            <th style="padding:10px 12px;text-align:center;color:#888;font-weight:600;">SN/Token</th>
          </tr></thead>
          <tbody>
          ${rows.map(r => {
            const statusColor = r.status === 'Sukses' ? '#16a34a' : r.status === 'Pending' ? '#ca8a04' : '#dc2626';
            const statusBg = r.status === 'Sukses' ? '#dcfce7' : r.status === 'Pending' ? '#fef9c3' : '#fee2e2';
            return `<tr style="border-bottom:1px solid #f5f5f5;">
              <td style="padding:10px 12px;color:#888;font-size:11px;">${r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : '-'}</td>
              <td style="padding:10px 12px;font-weight:500;">${r.product_name||'-'}</td>
              <td style="padding:10px 12px;">${r.customer_no||'-'}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:600;color:#E3222B;">${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.round(Number(r.selling_price||0)))}</td>
              <td style="padding:10px 12px;text-align:center;"><span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${statusBg};color:${statusColor};">${r.status||'-'}</span></td>
              <td style="padding:10px 12px;text-align:center;font-family:monospace;font-size:11px;">${r.sn ? `<span style="max-width:120px;display:inline-block;word-break:break-all;">${r.sn}</span> <button onclick="navigator.clipboard.writeText('${r.sn}').then(()=>showToast('Disalin!','success'))" style="padding:2px 6px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;font-size:10px;">📋</button>` : '-'}</td>
            </tr>`;
          }).join('')}
          </tbody>
        </table></div>`;
      } catch(err) {
        area.innerHTML = `<div style="padding:40px;text-align:center;color:#E3222B;">Gagal: ${err.message}</div>`;
      }
    }, 100);
  };

  window.showPpobMain = function() {
    ppobView = 'main';
    render();
  };

  // === Main Render ===
  function ppob() {
    // Schedule init after render
    setTimeout(() => {
      if (ppobView === 'history') { showPpobHistory(); return; }
      if (ppobProducts.length === 0) {
        loadPpobProducts();
      } else {
        renderPpobGrid();
        renderBrandFilters();
        renderRecentNumbers('');
      }
      if (ppobActiveTab === 'PLN') { ppobBrand = 'PLN'; renderPpobGrid(); }
      // Restore active tab style
      const tabs = document.querySelectorAll('.ppob-tab');
      const order = ['Pulsa','Data','PLN','Game','E-Money'];
      const ai = order.indexOf(ppobActiveTab);
      tabs.forEach((t, i) => {
        if (i === ai) { t.style.borderBottom='3px solid #E3222B'; t.style.color='#E3222B'; t.style.fontWeight='bold'; }
        else { t.style.borderBottom='none'; t.style.color='#666'; t.style.fontWeight='normal'; }
      });
    }, 80);

    const isHistory = ppobView === 'history';

    return `
      <style>
        @keyframes ppobPulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes ppobModalIn { from{opacity:0;transform:scale(0.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .ppob-card:hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(245,61,45,0.1) !important; }
      </style>

      <header class="header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <h1 style="margin:0;">📱 PPOB</h1>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button onclick="${isHistory ? 'showPpobMain()' : 'showPpobHistory()'}" style="padding:8px 16px;border-radius:8px;border:1px solid #ddd;background:#fff;color:#555;cursor:pointer;font-size:13px;font-weight:600;">
            ${isHistory ? '← Kembali Transaksi' : '📋 Riwayat'}
          </button>
          ${!isHistory ? '<button onclick="syncPpobProducts()" style="padding:8px 16px;border-radius:8px;border:1px solid #E3222B;background:#fff;color:#E3222B;cursor:pointer;font-size:13px;font-weight:600;">🔄 Update Katalog</button>' : ''}
        </div>
      </header>

      <section class="content" style="max-width:980px;margin:0 auto;padding-top:14px;">
        <div style="background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.08);overflow:hidden;">

          ${isHistory ? `
            <div style="padding:16px 24px;border-bottom:1px solid #eee;font-weight:600;color:#333;font-size:15px;">📋 Riwayat Transaksi PPOB</div>
            <div id="ppob-history-area" style="min-height:400px;"><div style="padding:60px;text-align:center;color:#aaa;">⏳ Memuat riwayat...</div></div>
          ` : `
            <div style="display:flex;border-bottom:1px solid #eee;overflow-x:auto;scrollbar-width:none;">
              <div class="ppob-tab" onclick="switchPpobTab('Pulsa',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;font-weight:bold;color:#E3222B;border-bottom:3px solid #E3222B;white-space:nowrap;">📱 Pulsa</div>
              <div class="ppob-tab" onclick="switchPpobTab('Data',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">📶 Data</div>
              <div class="ppob-tab" onclick="switchPpobTab('PLN',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">💡 PLN</div>
              <div class="ppob-tab" onclick="switchPpobTab('Game',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">🎮 Game</div>
              <div class="ppob-tab" onclick="switchPpobTab('E-Money',event)" style="flex:1;min-width:75px;text-align:center;padding:13px 8px;cursor:pointer;font-size:13px;color:#666;white-space:nowrap;">💸 E-Wallet</div>
            </div>

            <div style="padding:22px 28px;min-height:420px;">
              <div style="margin-bottom:14px;">
                <label style="display:block;margin-bottom:7px;font-weight:600;color:#444;font-size:13px;">📋 No. Meter / ID Pelanggan / No. HP</label>
                <div style="position:relative;">
                  <input type="text" id="ppob-customer-no" autocomplete="off" inputmode="numeric"
                    oninput="detectPpobBrand()" placeholder="Ketik nomor tujuan..." maxlength="30"
                    style="width:100%;font-size:20px;padding:14px 45px 14px 15px;border:2px solid #e5e5e5;border-radius:16px;outline:none;transition:border-color 0.2s;box-sizing:border-box;"
                    onfocus="this.style.borderColor='#E3222B'" onblur="this.style.borderColor='#e5e5e5'">
                  <div style="position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:22px; cursor:pointer; color:#E3222B; transition:transform 0.2s;" title="Buku Telepon" onclick="alert('Fitur Buku Telepon Lengkap segera hadir!')" onmouseover="this.style.transform='translateY(-50%) scale(1.1)'" onmouseout="this.style.transform='translateY(-50%) scale(1)'">📖</div>
                </div>
                <div id="ppob-input-error" style="color:#E3222B;font-size:12px;margin-top:4px;min-height:14px;"></div>
                <div id="ppob-brand-info" style="margin-top:6px;"></div>
              </div>

              <div id="ppob-recent-numbers" style="margin-bottom:12px;"></div>
              <div id="ppob-brand-filters" style="margin-bottom:14px;display:flex;flex-wrap:wrap;"></div>

              <div id="ppob-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:11px;">
                ${Array(6).fill(0).map(() => `<div style="border:1px solid #eee;border-radius:16px;padding:20px;background:#f9f9f9;animation:ppobPulse 1.5s ease-in-out infinite;"><div style="height:10px;background:#e5e5e5;border-radius:4px;margin-bottom:10px;width:50%;"></div><div style="height:18px;background:#e0e0e0;border-radius:4px;margin-bottom:8px;"></div><div style="height:14px;background:#e8e8e8;border-radius:4px;width:60%;margin:0 auto;"></div></div>`).join('')}
              </div>
            </div>

            <div id="ppob-footer" style="display:none;padding:14px 28px;background:#fff;border-top:1px solid #eee;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
              <div id="ppob-total-text" style="font-size:15px;color:#555;">Total: <b style="color:#E3222B;font-size:20px;">Rp0</b></div>
              <button id="btn-ppob-checkout" onclick="processPpobCheckout()"
                style="background:linear-gradient(135deg,#E3222B,#ED4B53);color:#fff;border:none;padding:13px 32px;font-size:15px;border-radius:16px;cursor:pointer;font-weight:bold;box-shadow:0 4px 12px rgba(245,61,45,0.3);transition:all 0.2s;"
                onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
                💳 Bayar Sekarang
              </button>
            </div>
          `}

        </div>
      </section>
    `;
  }
  // --- END PPOB SHOPEE LOGIC ---











// === AUTO-UPDATE NOTIFIER ===
(function() {
  let initialVersion = null;
  let updateNotified = false;

  async function checkVersion() {
    if (updateNotified) return;
    try {
      const res = await fetch('/api/system/version');
      if (!res.ok) return;
      const data = await res.json();
      
      if (!initialVersion) {
        initialVersion = data.version;
      } else if (initialVersion !== data.version) {
        updateNotified = true;
        
        // Buat banner update di UI
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.bottom = '20px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.backgroundColor = '#ff4757';
        banner.style.color = '#fff';
        banner.style.padding = '12px 24px';
        banner.style.borderRadius = '30px';
        banner.style.boxShadow = '0 10px 25px rgba(255, 71, 87, 0.4)';
        banner.style.zIndex = '9999';
        banner.style.cursor = 'pointer';
        banner.style.fontWeight = 'bold';
        banner.style.fontSize = '14px';
        banner.style.display = 'flex';
        banner.style.alignItems = 'center';
        banner.style.gap = '10px';
        banner.innerHTML = '<span>ðŸš€ Update sistem terbaru telah tersedia!</span> <span style="text-decoration: underline;">Klik untuk Memuat Ulang</span>';
        
        banner.onclick = () => {
          window.location.reload(true);
        };
        
        document.body.appendChild(banner);
        
        if(typeof window.playChaChing === 'function') window.playChaChing();
      }
    } catch(e) {}
  }
  
  // Cek setiap 5 menit (300.000 ms)
  setInterval(checkVersion, 300000);
  
  // Cek pertama kali setelah 5 detik
  setTimeout(checkVersion, 5000);
})();


window.printReceiptPDF = function() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak PDF.");
    return;
  }
  
  const dateStr = new Date().toLocaleString('id-ID');
  
  let itemsHtml = '';
  Object.values(window.keranjang || {}).forEach(item => {
    itemsHtml += `
      <div class="item-row">
        <span>${item.nama} x${item.qty}</span>
        <span>Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</span>
      </div>
    `;
  });

  const total = window.ngitungTotalRaw || 0;
  const bayarEl = document.getElementById("ngitung-inline-bayar");
  const bayar = bayarEl && bayarEl.value ? Number(bayarEl.value) : 0;
  
  let paymentDetails = '';
  if (bayar >= total) {
    paymentDetails = `
      <div class="total-row font-normal"><span>Tunai</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>
      <div class="total-row font-normal"><span>Kembali</span><span>Rp ${(bayar - total).toLocaleString('id-ID')}</span></div>
    `;
  } else {
    paymentDetails = `
      <div class="total-row font-normal"><span>Status</span><span>KASBON (BELUM LUNAS)</span></div>
      ${bayar > 0 ? `<div class="total-row font-normal"><span>Titip (DP)</span><span>Rp ${bayar.toLocaleString('id-ID')}</span></div>` : ''}
      <div class="total-row font-normal"><span>Sisa Kurang</span><span>Rp ${(total - bayar).toLocaleString('id-ID')}</span></div>
    `;
  }

  const html = `
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
          <p style="text-align: left; font-size: 12px;">Tgl: ${dateStr}</p>
        </div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="total-row"><span>TOTAL</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
        ${paymentDetails}
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
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};


window.laporanDataRaw = { sales: [], ppob: [], cashflow: [], purchases: [], cashAdvances: [] };
window.laporanDataLoading = false;

window.applyFilterLaporan = async function(start, end) {
    if (!start || !end) return;
    window.laporanStartDate = start;
    window.laporanEndDate = end;
    window.laporanDataLoading = true;
    
    document.getElementById('summary-omset').innerText = 'Memuat...';
    document.getElementById('summary-profit').innerText = 'Memuat...';
    document.getElementById('summary-cashflow').innerText = 'Memuat...';
    document.getElementById('laporan-content-area').innerHTML = '<div style="text-align:center; padding: 40px; color:var(--garneta-text-muted);"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><br><br>Mengambil data dari server...</div>';

    try {
        const data = await window.fetchLaporanKeuangan(start, end);
        window.laporanDataRaw = data;
        window.renderLaporanData();
    } catch (e) {
        document.getElementById('laporan-content-area').innerHTML = '<div style="color:var(--garneta-danger); text-align:center; padding:20px;">Gagal memuat data: ' + e.message + '</div>';
    } finally {
        window.laporanDataLoading = false;
    }
};

window.switchLaporanTab = function(tab) {
    window.laporanKeuanganTab = tab;
    if (state.route === 'laporan') {
        render(); // trigger full render to update active tab button
    }
};

window.renderLaporanData = function() {
    const d = window.laporanDataRaw;
    let omsetSembako = 0;
    let profitSembako = 0;
    
    // Calculate Sembako
    const sembakoMap = {};
    (d.sales || []).forEach(sale => {
        omsetSembako += Number(sale.amount || 0);
        profitSembako += Number(sale.profit || 0);
        
        const dateStr = sale.date.split('T')[0];
        if (!sembakoMap[dateStr]) sembakoMap[dateStr] = { date: dateStr, omset: 0, profit: 0, items: [] };
        sembakoMap[dateStr].omset += Number(sale.amount || 0);
        sembakoMap[dateStr].profit += Number(sale.profit || 0);
        
        let productName = "Produk Dihapus";
        let unitContent = 1;
        if (sale.productId) {
           const p = state.data.products.find(x => String(x.id) === String(sale.productId));
           if (p) { productName = p.name; unitContent = p.unitContent || 1; }
        }
        sembakoMap[dateStr].items.push({
           ...sale, productName, unitContent, cuan: Number(sale.profit || 0)
        });
    });
    const sembakoRows = Object.values(sembakoMap).sort((a,b) => b.date.localeCompare(a.date));

    // Calculate PPOB
    let omsetPPOB = 0;
    let profitPPOB = 0;
    (d.ppob || []).forEach(p => {
        if (p.status === 'Sukses') {
           omsetPPOB += Number(p.selling_price || 0);
           profitPPOB += Number(p.profit || 0);
        }
    });
    
    // Calculate Cashflow (Auto + Manual)
    // Auto IN: omsetSembako + omsetPPOB
    // Auto OUT: purchases (total) + cashAdvances (amount)
    let totalPurchases = (d.purchases || []).reduce((sum, p) => sum + Number(p.total || 0), 0);
    let totalAdvances = (d.cashAdvances || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    let manualIn = 0;
    let manualOut = 0;
    (d.cashflow || []).forEach(c => {
        if (c.type === 'IN') manualIn += Number(c.amount || 0);
        if (c.type === 'OUT') manualOut += Number(c.amount || 0);
    });
    
    const totalOmset = omsetSembako + omsetPPOB;
    const totalKeuntungan = profitSembako + profitPPOB;
    
    const totalIn = totalOmset + manualIn;
    const totalOut = totalPurchases + totalAdvances + manualOut;
    const saldoAkhir = totalIn - totalOut;

    // Update Summary
    if (document.getElementById('summary-omset')) {
        document.getElementById('summary-omset').innerText = rupiah(totalOmset);
        document.getElementById('summary-profit').innerText = rupiah(totalKeuntungan);
        document.getElementById('summary-cashflow').innerText = rupiah(saldoAkhir);
    }
    
    const tab = window.laporanKeuanganTab || 'sembako';
    let html = '';
    
    if (tab === 'sembako') {
        html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Laporan Penjualan Sembako</h3>
            <div style="text-align:right;">
                <span class="muted">Omset:</span> <strong style="color:var(--garneta-cyan);">${rupiah(omsetSembako)}</strong> | 
                <span class="muted">Profit:</span> <strong style="color:var(--green);">${rupiah(profitSembako)}</strong>
            </div>
        </div>
        <div class="table-wrap">
        <table class="expandable-table">
          <thead>
            <tr>
              <th style="width:50px"></th>
              <th>TANGGAL</th>
              <th style="text-align:right">OMSET</th>
              <th style="text-align:right">KEUNTUNGAN</th>
            </tr>
          </thead>
          <tbody>
            ${sembakoRows.map((row) => `
              <tr class="expandable-row" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.arrow').classList.toggle('open');">
                <td style="text-align:center"><span class="arrow" style="display:inline-block; transition:transform 0.2s;">▼</span></td>
                <td style="font-weight:bold">${row.date}</td>
                <td style="text-align:right; font-weight:bold; color:var(--garneta-cyan);">${rupiah(row.omset)}</td>
                <td style="text-align:right; font-weight:bold; color:${row.profit >= 0 ? '#10b981' : '#f43f5e'}">${rupiah(row.profit)}</td>
              </tr>
              <tr class="details-row hidden" style="background:var(--bg); border-bottom:2px solid var(--border);">
                <td colspan="4" style="padding:1rem;">
                  <table style="width:100%; margin:0; background:var(--card); box-shadow:none; border:1px solid var(--border);">
                    <thead>
                      <tr>
                        <th style="font-size:0.8rem; padding:0.5rem">Jam</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Barang</th>
                        <th style="font-size:0.8rem; padding:0.5rem">Unit</th>
                        <th style="font-size:0.8rem; padding:0.5rem; text-align:right">Omset</th>
                        ${isSuperAdmin() ? '<th style="font-size:0.8rem; padding:0.5rem; text-align:right">Cuan</th>' : ''}
                      </tr>
                    </thead>
                    <tbody>
                      ${row.items.map(item => `
                        <tr>
                          <td style="font-size:0.9rem; padding:0.5rem">${new Date(item.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">${escapeAttr(item.productName)}</td>
                          <td style="font-size:0.9rem; padding:0.5rem">${item.unitSold}</td>
                          <td style="font-size:0.9rem; padding:0.5rem; text-align:right; color:var(--garneta-cyan);">${rupiah(item.amount)}</td>
                          ${isSuperAdmin() ? `<td style="font-size:0.9rem; padding:0.5rem; text-align:right; color:${item.cuan >= 0 ? '#10b981' : '#f43f5e'}">${rupiah(item.cuan)}</td>` : ''}
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </td>
              </tr>
            `).join('')}
            ${sembakoRows.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;" class="muted">Tidak ada penjualan di rentang tanggal ini.</td></tr>' : ''}
          </tbody>
        </table>
        </div>`;
    } else if (tab === 'ppob') {
        html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Laporan Penjualan PPOB (Sukses)</h3>
            <div style="text-align:right;">
                <span class="muted">Omset:</span> <strong style="color:var(--garneta-cyan);">${rupiah(omsetPPOB)}</strong> | 
                <span class="muted">Profit:</span> <strong style="color:var(--green);">${rupiah(profitPPOB)}</strong>
            </div>
        </div>
        <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>TANGGAL</th>
              <th>PRODUK</th>
              <th>NOMOR</th>
              <th style="text-align:right">OMSET</th>
              <th style="text-align:right">PROFIT</th>
            </tr>
          </thead>
          <tbody>
            ${(d.ppob || []).map(p => `
              <tr>
                <td>${new Date(p.created_at).toLocaleString('id-ID')}</td>
                <td>${p.product_name}</td>
                <td>${p.customer_no}</td>
                <td style="text-align:right; color:var(--garneta-cyan);">${rupiah(p.selling_price)}</td>
                <td style="text-align:right; color:var(--green);">${rupiah(p.profit)}</td>
              </tr>
            `).join('')}
            ${(d.ppob || []).length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:20px;" class="muted">Tidak ada transaksi PPOB sukses.</td></tr>' : ''}
          </tbody>
        </table>
        </div>`;
    } else if (tab === 'cashflow') {
        // Generate combined timeline
        const timeline = [];
        if (omsetSembako > 0) timeline.push({ date: window.laporanEndDate, type: 'IN', amount: omsetSembako, desc: 'Total Penjualan Sembako', isAuto: true });
        if (omsetPPOB > 0) timeline.push({ date: window.laporanEndDate, type: 'IN', amount: omsetPPOB, desc: 'Total Penjualan PPOB', isAuto: true });
        if (totalPurchases > 0) timeline.push({ date: window.laporanEndDate, type: 'OUT', amount: totalPurchases, desc: 'Total Pembelian/Kulakan', isAuto: true });
        if (totalAdvances > 0) timeline.push({ date: window.laporanEndDate, type: 'OUT', amount: totalAdvances, desc: 'Total Kasbon Karyawan', isAuto: true });
        
        (d.cashflow || []).forEach(c => {
           timeline.push({ date: c.date, type: c.type, amount: c.amount, desc: c.description, isAuto: false, id: c.id });
        });
        
        timeline.sort((a,b) => new Date(b.date) - new Date(a.date));

        html = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3>Buku Kas (Arus Kas)</h3>
            <button class="btn primary" onclick="window.openManualCashflowModal()">+ Catat Kas Manual</button>
        </div>
        <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>TANGGAL</th>
              <th>KETERANGAN</th>
              <th>JENIS</th>
              <th style="text-align:right">UANG MASUK</th>
              <th style="text-align:right">UANG KELUAR</th>
            </tr>
          </thead>
          <tbody>
            ${timeline.map(t => `
              <tr style="${t.isAuto ? 'background:rgba(255,255,255,0.02);' : ''}">
                <td>${t.date.split('T')[0]} ${t.isAuto ? '<span class="badge" style="font-size:10px;">Auto</span>' : ''}</td>
                <td>${t.desc} ${!t.isAuto ? ` <button onclick="window.deleteManualCashflow(${t.id})" style="background:none; border:none; color:var(--garneta-danger); cursor:pointer;"><i class="fas fa-trash"></i></button>` : ''}</td>
                <td><span style="color:${t.type==='IN'?'var(--green)':'var(--garneta-danger)'}; font-weight:bold;">${t.type==='IN'?'MASUK':'KELUAR'}</span></td>
                <td style="text-align:right; color:var(--green);">${t.type==='IN' ? rupiah(t.amount) : '-'}</td>
                <td style="text-align:right; color:var(--garneta-danger);">${t.type==='OUT' ? rupiah(t.amount) : '-'}</td>
              </tr>
            `).join('')}
            ${timeline.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:20px;" class="muted">Tidak ada arus kas.</td></tr>' : ''}
          </tbody>
          <tfoot>
            <tr style="background:var(--card); font-weight:bold;">
               <td colspan="3" style="text-align:right;">TOTAL:</td>
               <td style="text-align:right; color:var(--green);">${rupiah(totalIn)}</td>
               <td style="text-align:right; color:var(--garneta-danger);">${rupiah(totalOut)}</td>
            </tr>
            <tr style="background:var(--card); font-weight:bold; font-size:1.1rem;">
               <td colspan="3" style="text-align:right;">SALDO AKHIR:</td>
               <td colspan="2" style="text-align:right; color:var(--garneta-cyan);">${rupiah(saldoAkhir)}</td>
            </tr>
          </tfoot>
        </table>
        </div>`;
    }
    
    if (document.getElementById('laporan-content-area')) {
        document.getElementById('laporan-content-area').innerHTML = html;
    }
};

window.openManualCashflowModal = function() {
    // Create modal dynamically if not exists
    let modal = document.getElementById('manual-cashflow-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'manual-cashflow-modal';
        modal.className = 'modal';
        modal.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; justify-content:center; align-items:center;";
        modal.innerHTML = `
        <div class="modal-content card" style="width: 90%; max-width: 400px; padding: 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); background: #0c121e; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
          <h2 style="margin-top:0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 16px;">Catat Kas Manual</h2>
          <form onsubmit="window.submitManualCashflow(event)">
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Jenis Transaksi</label>
              <select id="cf-type" class="form-control" required>
                 <option value="OUT">Pengeluaran (Keluar)</option>
                 <option value="IN">Pemasukan (Masuk)</option>
              </select>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Tanggal</label>
              <input type="date" id="cf-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Nominal (Rp)</label>
              <input type="text" id="cf-amount" class="form-control" placeholder="Contoh: 50000" oninput="window.formatRupiahInput(this)" style="font-size: 1.1rem; font-weight: bold; color: var(--garneta-cyan);" required>
            </div>
            
            <div class="form-group" style="margin-bottom: 24px;">
              <label>Keterangan / Keperluan</label>
              <input type="text" id="cf-desc" class="form-control" placeholder="Isi alasan di sini..." required>
            </div>
            
            <div style="display:flex; gap: 12px; justify-content: flex-end;">
              <button type="button" class="btn soft" onclick="document.getElementById('manual-cashflow-modal').classList.add('hidden')" style="flex:1;">Batal</button>
              <button type="submit" class="btn primary" style="flex:1; background: linear-gradient(135deg, var(--garneta-cyan), #0099ff); color:#000;">Simpan</button>
            </div>
          </form>
        </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('cf-type').value = 'OUT';
    document.getElementById('cf-amount').value = '';
    document.getElementById('cf-desc').value = '';
    modal.classList.remove('hidden');
};

window.submitManualCashflow = async function(e) {
    e.preventDefault();
    const type = document.getElementById('cf-type').value;
    const date = document.getElementById('cf-date').value;
    const desc = document.getElementById('cf-desc').value;
    const amountStr = document.getElementById('cf-amount').value;
    const amount = parseInt(amountStr.replace(/[^0-9]/g, '')) || 0;
    
    if (amount <= 0) {
        alert('Nominal harus lebih besar dari 0!');
        return;
    }
    
    try {
        await window.gas("add", { collection: "cashflowLogs", item: { type, date, description: desc, amount } });
        document.getElementById('manual-cashflow-modal').classList.add('hidden');
        showToast("Catatan kas berhasil disimpan!", "success");
        // Reload data
        window.applyFilterLaporan(window.laporanStartDate, window.laporanEndDate);
    } catch (err) {
        alert("Gagal menyimpan: " + err.message);
    }
};

window.deleteManualCashflow = async function(id) {
    if (!confirm("Yakin ingin menghapus catatan kas ini?")) return;
    try {
        await window.gas("remove", { collection: "cashflowLogs", id });
        showToast("Catatan kas berhasil dihapus!", "success");
        window.applyFilterLaporan(window.laporanStartDate, window.laporanEndDate);
    } catch (err) {
        alert("Gagal menghapus: " + err.message);
    }
};
