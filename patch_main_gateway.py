import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update load()
load_regex = r'async function load\(\) \{\s*state\.data = await gas\("bootstrap", \{\}, true\);\s*startSyncPolling\(\);\s*renderShell\(\);\s*render\(\);\s*if \(window\.initSmartSearch\) setTimeout\(window\.initSmartSearch, 50\);\s*\}'

new_load = '''async function load() {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        document.getElementById("gateway-screen").classList.remove("hidden");
        document.querySelector(".app").classList.add("hidden");
        return;
      }
      
      try {
        state.data = await gas("bootstrap", {}, true);
        startSyncPolling();
        
        document.getElementById("gateway-screen").classList.add("hidden");
        document.querySelector(".app").classList.remove("hidden");
        
        renderShell();
        render();
        if (window.initSmartSearch) setTimeout(window.initSmartSearch, 50);
      } catch (err) {
        if (err.message.includes("Akses ditolak") || err.message.includes("login")) {
           localStorage.removeItem("jwt_token");
           localStorage.removeItem("role");
           localStorage.removeItem("currentUser");
           document.getElementById("gateway-screen").classList.remove("hidden");
           document.querySelector(".app").classList.add("hidden");
        } else {
           window.showToast("Gagal memuat data: " + err.message, "error");
        }
      }
    }'''
code = re.sub(load_regex, new_load, code, flags=re.DOTALL)

# 2. Add event listeners for Gateway
gateway_listeners = '''
  // --- GATEWAY EVENTS ---
  document.getElementById("btn-gateway-super").addEventListener("click", () => {
     // Show existing Super Admin login modal
     document.getElementById("login-modal").classList.remove("hidden");
  });
  
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
       if (json.ok && json.data) {
         select.innerHTML = '<option value="">-- Pilih Nama Kasir --</option>' + 
           json.data.map(e => `<option value="${e.id}">${e.name}</option>`).join("");
       } else {
         select.innerHTML = '<option value="">-- Gagal memuat data --</option>';
       }
     } catch (e) {
       console.error(e);
     }
  });
  
  document.getElementById("btn-gateway-karyawan-cancel").addEventListener("click", () => {
     document.getElementById("gateway-options").classList.remove("hidden");
     document.getElementById("gateway-karyawan-panel").classList.add("hidden");
  });
  
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
          state.role = json.data.role;
          state.currentUser = { name: json.data.name };
          window.showToast("Berhasil masuk sebagai " + json.data.name, "success");
          document.getElementById("gateway-screen").classList.add("hidden");
          await load();
       } else {
          window.showToast(json.message || "Gagal masuk.", "error");
       }
     } catch (e) {
       window.showToast("Kesalahan jaringan.", "error");
     } finally {
       btn.textContent = "Masuk"; btn.disabled = false;
     }
  });
'''

# Inject right after document.addEventListener("DOMContentLoaded") setup
setup_regex = r'document\.getElementById\("btn-logout"\)\.addEventListener\("click", logout\);'
code = code.replace(setup_regex, setup_regex + '\n' + gateway_listeners)

# Also fix the super admin login to hide gateway if success
super_admin_success_regex = r'localStorage\.setItem\("jwt_token", data\.token\);\s*localStorage\.setItem\("role", data\.role\);\s*localStorage\.setItem\("currentUser", JSON\.stringify\(\{ name: data\.name \}\)\);\s*state\.role = data\.role;\s*state\.currentUser = \{ name: data\.name \};\s*renderShell\(\);\s*document\.getElementById\("login-modal"\)\.classList\.add\("hidden"\);'

new_super_admin_success = '''          localStorage.setItem("jwt_token", data.token);
          localStorage.setItem("role", data.role);
          localStorage.setItem("currentUser", JSON.stringify({ name: data.name }));
          state.role = data.role;
          state.currentUser = { name: data.name };
          renderShell();
          document.getElementById("login-modal").classList.add("hidden");
          document.getElementById("gateway-screen").classList.add("hidden");
          document.querySelector(".app").classList.remove("hidden");
          load(); // reload data immediately'''

code = code.replace('localStorage.setItem("jwt_token", data.token);\n          localStorage.setItem("role", data.role);\n          localStorage.setItem("currentUser", JSON.stringify({ name: data.name }));\n          state.role = data.role;\n          state.currentUser = { name: data.name };\n          renderShell();\n          document.getElementById("login-modal").classList.add("hidden");', new_super_admin_success)

# Fix webauthn login success to also hide gateway
webauthn_success_regex = r'localStorage\.setItem\("jwt_token", json\.data\.token\);\s*localStorage\.setItem\("role", json\.data\.role\);\s*localStorage\.setItem\("currentUser", JSON\.stringify\(\{ name: json\.data\.name \}\)\);\s*state\.role = json\.data\.role;\s*state\.currentUser = \{ name: json\.data\.name \};\s*renderShell\(\);\s*document\.getElementById\("login-modal"\)\.classList\.add\("hidden"\);'

new_webauthn_success = '''localStorage.setItem("jwt_token", json.data.token);
          localStorage.setItem("role", json.data.role);
          localStorage.setItem("currentUser", JSON.stringify({ name: json.data.name }));
          state.role = json.data.role;
          state.currentUser = { name: json.data.name };
          renderShell();
          document.getElementById("login-modal").classList.add("hidden");
          document.getElementById("gateway-screen").classList.add("hidden");
          document.querySelector(".app").classList.remove("hidden");
          load();'''

code = re.sub(webauthn_success_regex, new_webauthn_success, code)

# Fix the simple logout() function to show Gateway!
logout_regex = r'function logout\(\) \{\s*localStorage\.removeItem\("jwt_token"\);\s*localStorage\.removeItem\("role"\);\s*localStorage\.removeItem\("currentUser"\);\s*state\.role = "Admin";\s*state\.currentUser = null;\s*renderShell\(\);\s*\}'
new_logout = '''    function logout() {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("role");
      localStorage.removeItem("currentUser");
      state.role = "Admin";
      state.currentUser = null;
      renderShell();
      document.getElementById("gateway-screen").classList.remove("hidden");
      document.querySelector(".app").classList.add("hidden");
    }'''
code = re.sub(logout_regex, new_logout, code)


with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("assets/js/main.js patched for Gateway logic!")
