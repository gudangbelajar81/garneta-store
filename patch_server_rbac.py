import re

with open('server.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update PUBLIC_ACTIONS
old_public_actions = r'const PUBLIC_ACTIONS = new Set\(\["login", "verifySuperAdmin", "bootstrap", "dashboard", "requestMagicLink", \n"verifyMagicLink", "generateAuthOptions", "verifyAuth", "setupSuperAdmin", "requestResetOTP", "verifyReset"\]\);'
new_public_actions = 'const PUBLIC_ACTIONS = new Set(["login", "loginKaryawan", "getEmployeesList", "verifySuperAdmin", "requestMagicLink", \n"verifyMagicLink", "generateAuthOptions", "verifyAuth", "setupSuperAdmin", "requestResetOTP", "verifyReset"]);'
code = re.sub(old_public_actions, new_public_actions, code)

# 2. Update verifyToken function completely
verify_token_regex = r'function verifyToken\(req, res, next\) \{.*?\n\}\n'
new_verify_token = '''function verifyToken(req, res, next) {
  const action = req.body?.action;

  // [SECURITY] Terapkan login rate limiter khusus
  if (action === "login" || action === "loginKaryawan") {
    return loginLimiter(req, res, () => {
      return next();
    });
  }

  if (PUBLIC_ACTIONS.has(action)) return next();

  // [SECURITY] getSetting: izinkan HANYA untuk public setting keys
  if (action === "getSetting") {
    const key = req.body?.payload?.key;
    if (PUBLIC_SETTING_KEYS.has(key)) return next();
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, message: "Akses ditolak. Silakan login terlebih dahulu." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    
    if (req.user.role === "Super Admin") {
      return next();
    }
    
    if (req.user.role === "Karyawan") {
      if (["add", "update", "remove", "list"].includes(action)) {
        const collection = req.body?.payload?.collection;
        if (KASIR_COLLECTIONS.has(collection)) {
          if (action === "list") req.isPublicKasir = true;
          return next();
        }
        return res.status(401).json({ ok: false, message: `Akses ditolak. Karyawan tidak diizinkan mengubah data ${collection}.` });
      }
      
      // Allow general dashboard access
      if (["bootstrap", "sync", "dashboard"].includes(action)) return next();
      
      return res.status(401).json({ ok: false, message: "Akses ditolak. Fitur ini khusus Super Admin." });
    }

    return res.status(401).json({ ok: false, message: "Peran tidak dikenali." });
  } catch (err) {
    return res.status(401).json({ ok: false, message: "Akses ditolak. Session tidak valid atau sudah kedaluwarsa." });
  }
}
'''

code = re.sub(verify_token_regex, new_verify_token, code, flags=re.DOTALL)

# 3. Inject loginKaryawan and getEmployeesList handlers in handleAction
core_actions_regex = r'const coreActions = \{'
new_core_actions = '''const coreActions = {
    loginKaryawan: () => loginKaryawan(payload.employeeId, payload.pin),
    getEmployeesList: () => getEmployeesList(),'''
code = re.sub(core_actions_regex, new_core_actions, code)

# 4. Inject the implementation functions
impl = '''
async function getEmployeesList() {
  const [rows] = await db.query("SELECT id, name FROM employees WHERE status = 'Aktif' ORDER BY name ASC");
  return rows;
}

async function loginKaryawan(employeeId, pin) {
  if (!employeeId || !pin) throw new Error("ID Karyawan dan PIN wajib diisi.");
  
  // Ambil PIN karyawan dari pengaturan (default: 1180)
  const [settings] = await db.query("SELECT setting_value FROM app_settings WHERE setting_key = 'EMPLOYEE_PIN' LIMIT 1");
  const validPin = settings.length ? settings[0].setting_value : "1180";
  
  if (String(pin) !== String(validPin)) {
    throw new Error("PIN Karyawan salah.");
  }
  
  const [rows] = await db.query("SELECT id, name FROM employees WHERE id = ? AND status = 'Aktif' LIMIT 1", [employeeId]);
  if (rows.length === 0) throw new Error("Karyawan tidak ditemukan atau tidak aktif.");
  
  const emp = rows[0];
  const token = jwt.sign({ id: emp.id, name: emp.name, role: "Karyawan", isEmployee: true }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  
  return { token, name: emp.name, role: "Karyawan", isSuperAdmin: false };
}
'''
code = code + '\n' + impl

with open('server.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("server.js updated successfully!")
