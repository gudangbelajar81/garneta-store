import os

with open('assets/js/main.js', 'a', encoding='utf-8') as f:
    f.write('''

// --- GATEWAY EVENTS (FIXED) ---
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = (window.location.port === "8000" || window.location.port === "5500") ? "http://localhost:3000/api" : "/api";
  
  if (document.getElementById("btn-gateway-super")) {
      document.getElementById("btn-gateway-super").addEventListener("click", () => {
         document.getElementById("login-modal").classList.remove("hidden");
      });
  }
  
  if (document.getElementById("btn-gateway-karyawan")) {
      document.getElementById("btn-gateway-karyawan").addEventListener("click", async () => {
         document.getElementById("gateway-options").classList.add("hidden");
         document.getElementById("gateway-karyawan-panel").classList.remove("hidden");
         
         // Fetch employees list
         try {
           const select = document.getElementById("gateway-karyawan-select");
           select.innerHTML = '<option value="">-- Memuat Data --</option>';
           const res = await fetch(API_URL, {
             method: "POST", headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ action: "getEmployeesList", payload: {} })
           });
           const json = await res.json();
           if (json.ok && json.data && json.data.length > 0) {
             select.innerHTML = '<option value="">-- Pilih Nama Kasir --</option>' + 
               json.data.map(e => `<option value="${e.id}">${e.name}</option>`).join("");
           } else {
             select.innerHTML = '<option value="">-- Belum ada karyawan --</option>';
           }
         } catch (e) {
           console.error(e);
         }
      });
  }
  
  if (document.getElementById("btn-gateway-karyawan-cancel")) {
      document.getElementById("btn-gateway-karyawan-cancel").addEventListener("click", () => {
         document.getElementById("gateway-options").classList.remove("hidden");
         document.getElementById("gateway-karyawan-panel").classList.add("hidden");
      });
  }
  
  if (document.getElementById("btn-gateway-karyawan-showpin")) {
      document.getElementById("btn-gateway-karyawan-showpin").addEventListener("click", (e) => {
         const pinInput = document.getElementById("gateway-karyawan-pin");
         if (pinInput.type === "password") {
             pinInput.type = "text";
             e.target.textContent = "Tutup";
         } else {
             pinInput.type = "password";
             e.target.textContent = "Lihat";
         }
      });
  }
  
  if (document.getElementById("btn-gateway-karyawan-submit")) {
      document.getElementById("btn-gateway-karyawan-submit").addEventListener("click", async () => {
         const empId = document.getElementById("gateway-karyawan-select").value;
         const pin = document.getElementById("gateway-karyawan-pin").value;
         
         if (!empId) return window.showToast("Pilih nama Anda terlebih dahulu.", "error");
         if (!pin) return window.showToast("Masukkan PIN akses.", "error");
         
         const btn = document.getElementById("btn-gateway-karyawan-submit");
         btn.textContent = "Loading..."; btn.disabled = true;
         
         try {
           const res = await fetch(API_URL, {
             method: "POST", headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ action: "loginKaryawan", payload: { employeeId: empId, pin: pin } })
           });
           const json = await res.json();
           if (json.ok && json.data && json.data.token) {
              localStorage.setItem("jwt_token", json.data.token);
              localStorage.setItem("role", json.data.role);
              localStorage.setItem("currentUser", JSON.stringify({ name: json.data.name }));
              
              // We must set state as well
              if (typeof state !== 'undefined') {
                state.role = json.data.role;
                state.currentUser = { name: json.data.name };
              }
              
              window.showToast("Berhasil masuk sebagai " + json.data.name, "success");
              document.getElementById("gateway-screen").classList.add("hidden");
              document.querySelector(".app").classList.remove("hidden");
              
              // Reload app data
              if (typeof window.load === 'function') {
                 await window.load();
              } else {
                 location.reload();
              }
           } else {
              window.showToast(json.message || json.error || "Gagal masuk.", "error");
           }
         } catch (e) {
           window.showToast("Kesalahan jaringan.", "error");
         } finally {
           btn.textContent = "Masuk"; btn.disabled = false;
         }
      });
  }
  
  // Also fix logout button
  if (document.getElementById("logout-super")) {
      document.getElementById("logout-super").onclick = () => {
         localStorage.removeItem("jwt_token");
         localStorage.removeItem("role");
         localStorage.removeItem("currentUser");
         if (typeof state !== 'undefined') {
           state.role = "Admin";
           state.currentUser = null;
         }
         
         document.getElementById("gateway-screen").classList.remove("hidden");
         document.querySelector(".app").classList.add("hidden");
         
         // Clear dashboard data just in case
         if (typeof renderShell === 'function') renderShell();
      };
  }
});
''')

print("Gateway listeners appended successfully!")
