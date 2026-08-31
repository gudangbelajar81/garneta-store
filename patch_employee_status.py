import os
import re

with open('assets/js/main.js', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add Status select in the form
old_grid = """                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                  ${input("joinDate", "Tgl Masuk", true, "date", emp.joinDate ? emp.joinDate.slice(0,10) : '')}
                  ${select("salaryType", "Tipe", ["Bulanan", "Harian"], emp.salaryType)}
                  ${input("baseSalary", "Gaji Pokok", true, "text", "")}
                </div>"""

new_grid = """                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:8px;">
                  ${input("joinDate", "Tgl Masuk", true, "date", emp.joinDate ? emp.joinDate.slice(0,10) : '')}
                  ${select("salaryType", "Tipe", ["Bulanan", "Harian"], emp.salaryType)}
                  ${input("baseSalary", "Gaji Pokok", true, "text", "")}
                  ${select("status", "Status", ["Aktif", "Nonaktif", "Cuti"], emp.status || 'Aktif')}
                </div>"""

code = code.replace(old_grid, new_grid)

# 2. Fix the submit payload
old_payload = """      const payload = {
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        joinDate: form.elements.joinDate.value,
        salaryType: form.elements.salaryType.value,
        baseSalary: plainNumber(form.elements.baseSalary.value),
        status: 'Aktif'
      };"""

new_payload = """      const payload = {
        name: form.elements.name.value,
        phone: form.elements.phone.value,
        joinDate: form.elements.joinDate.value,
        salaryType: form.elements.salaryType.value,
        baseSalary: plainNumber(form.elements.baseSalary.value),
        status: form.elements.status.value
      };"""

code = code.replace(old_payload, new_payload)

with open('assets/js/main.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patch applied to main.js")
